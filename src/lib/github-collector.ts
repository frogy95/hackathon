// GitHub 저장소 데이터 수집 모듈 (Octokit 기반)
import { Octokit } from "@octokit/rest";
import type { CollectedData, FileContent, FileTreeItem, CommitSummary } from "@/types/evaluation";

// 파일 타입별 확장자 분류
const DOC_EXTENSIONS = [".md", ".txt", ".rst"];
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".rb", ".php"];
const CONFIG_FILES = [
  "package.json",
  "requirements.txt",
  "Dockerfile",
  ".env.example",
  "docker-compose.yml",
  "docker-compose.yaml",
  "pyproject.toml",
  "cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "next.config.ts",
  "next.config.js",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
];

const MAX_LINES_PER_FILE = 500;
const MAX_FILES_PER_CATEGORY = 30;

// URL에서 owner, repo 파싱
function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!match) {
    throw new Error(`유효하지 않은 GitHub URL입니다: ${url}`);
  }
  return { owner: match[1], repo: match[2] };
}

// 파일 내용을 최대 N줄로 잘라내기
function truncateContent(content: string, maxLines: number): { content: string; truncated: boolean } {
  const lines = content.split("\n");
  if (lines.length <= maxLines) {
    return { content, truncated: false };
  }
  return {
    content: lines.slice(0, maxLines).join("\n") + `\n... (${lines.length - maxLines}줄 생략됨)`,
    truncated: true,
  };
}

// 토큰 추정 (문자 수 / 4)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Rate limit 대기 후 재시도하는 fetch 래퍼
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { status?: number; response?: { headers?: { "retry-after"?: string } }; message?: string };
      if ((err.status === 429 || err.status === 403) && attempt < maxRetries) {
        const retryAfter = parseInt(err.response?.headers?.["retry-after"] ?? "60", 10);
        console.warn(`GitHub API rate limit. ${retryAfter}초 후 재시도 (${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("재시도 횟수 초과");
}

// GitHub 저장소 데이터 수집 메인 함수
export async function collectGitHubData(repoUrl: string): Promise<CollectedData> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn("GITHUB_TOKEN이 설정되지 않아 미인증 요청합니다 (rate limit: 60 req/hr).");
  }

  const octokit = new Octokit({ auth: token });
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const repoFullName = `${owner}/${repo}`;

  // 1. 저장소 존재 및 public 여부 확인
  let repoInfo;
  try {
    repoInfo = await withRetry(() => octokit.repos.get({ owner, repo }));
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status === 404) {
      throw new Error(`GitHub 저장소를 찾을 수 없습니다: ${repoFullName}. URL을 확인해주세요.`);
    }
    throw error;
  }
  if (repoInfo.data.private) {
    throw new Error("비공개 저장소는 평가할 수 없습니다. public 저장소 URL을 입력해주세요.");
  }

  // 2. 전체 파일 트리 수집
  const treeResponse = await withRetry(() =>
    octokit.git.getTree({ owner, repo, tree_sha: repoInfo.data.default_branch, recursive: "1" })
  );

  const tree: FileTreeItem[] = treeResponse.data.tree
    .filter((item) => item.path && item.type)
    .map((item) => ({
      path: item.path!,
      type: item.type as "blob" | "tree",
      size: item.size,
    }));

  // 3. 파일 분류
  const allFiles = tree.filter((item) => item.type === "blob");

  const docFiles = allFiles
    .filter((f) => DOC_EXTENSIONS.some((ext) => f.path.toLowerCase().endsWith(ext)))
    .sort((a, b) => {
      // 최상위 디렉토리 파일 우선
      const aDepth = a.path.split("/").length;
      const bDepth = b.path.split("/").length;
      return aDepth - bDepth;
    })
    .slice(0, MAX_FILES_PER_CATEGORY);

  const configFilePaths = allFiles
    .filter((f) => {
      const basename = f.path.split("/").pop()?.toLowerCase() ?? "";
      return CONFIG_FILES.some((cf) => cf.toLowerCase() === basename);
    })
    .slice(0, 15);

  const sourceFiles = allFiles
    .filter((f) => SOURCE_EXTENSIONS.some((ext) => f.path.toLowerCase().endsWith(ext)))
    .filter((f) => !f.path.includes("node_modules") && !f.path.includes(".git"))
    .sort((a, b) => (a.size ?? 0) - (b.size ?? 0)) // 작은 파일 우선
    .slice(0, MAX_FILES_PER_CATEGORY);

  // 4. 파일 내용 수집 함수
  async function fetchFileContent(path: string): Promise<FileContent> {
    try {
      const response = await withRetry(() =>
        octokit.repos.getContent({ owner, repo, path })
      );
      const data = response.data as { content?: string; encoding?: string };
      if (!data.content || data.encoding !== "base64") {
        return { path, content: "(이진 파일 또는 내용 없음)", truncated: false };
      }
      const rawContent = Buffer.from(data.content, "base64").toString("utf-8");
      const { content, truncated } = truncateContent(rawContent, MAX_LINES_PER_FILE);
      return { path, content, truncated };
    } catch {
      return { path, content: "(파일 읽기 실패)", truncated: false };
    }
  }

  // 5. 파일 내용 병렬 수집 (3개씩 배치)
  async function fetchBatch(files: FileTreeItem[]): Promise<FileContent[]> {
    const results: FileContent[] = [];
    for (let i = 0; i < files.length; i += 3) {
      const batch = files.slice(i, i + 3);
      const batchResults = await Promise.all(batch.map((f) => fetchFileContent(f.path)));
      results.push(...batchResults);
    }
    return results;
  }

  const [documents, configContents, sourceContents] = await Promise.all([
    fetchBatch(docFiles),
    fetchBatch(configFilePaths),
    fetchBatch(sourceFiles),
  ]);

  // 6. 최근 커밋 수집
  let commitSummary: CommitSummary = { totalCount: 0, recentMessages: [] };
  try {
    const commitsResponse = await withRetry(() =>
      octokit.repos.listCommits({ owner, repo, per_page: 50 })
    );
    commitSummary = {
      totalCount: commitsResponse.data.length, // 정확한 전체 카운트는 추가 API 필요
      recentMessages: commitsResponse.data.map(
        (c) => c.commit.message.split("\n")[0] // 첫 줄만
      ),
    };
  } catch {
    console.warn("커밋 이력 수집 실패 (무시하고 계속 진행)");
  }

  // 7. 토큰 추정
  const allContent = [
    ...documents.map((f) => f.content),
    ...configContents.map((f) => f.content),
    ...sourceContents.map((f) => f.content),
  ].join("\n");
  const tokenEstimate = estimateTokens(allContent);

  return {
    repoFullName,
    tree,
    documents,
    sourceFiles: sourceContents,
    configFiles: configContents,
    commitSummary,
    collectedAt: new Date().toISOString(),
    tokenEstimate,
  };
}
