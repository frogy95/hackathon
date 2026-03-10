import { NextRequest } from "next/server";
import { apiSuccess, apiError, ErrorCode } from "@/lib/api-utils";

// GitHub URL 파싱 패턴
const githubRepoPattern = /^https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+?)\/?$/;

// GET /api/validate/github-url?url=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim();

  if (!url) {
    return apiError(ErrorCode.VALIDATION_ERROR.code, "URL을 입력해주세요.", ErrorCode.VALIDATION_ERROR.status);
  }

  const match = url.match(githubRepoPattern);
  if (!match) {
    return apiSuccess({ valid: false, reason: "올바른 GitHub 저장소 URL 형식이 아닙니다." });
  }

  const [, owner, repo] = match;

  try {
    const headers: HeadersInit = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      // 캐시 방지
      cache: "no-store",
    });

    if (res.status === 200) {
      return apiSuccess({ valid: true });
    } else if (res.status === 404) {
      return apiSuccess({ valid: false, reason: "저장소를 찾을 수 없습니다. URL을 확인하거나 저장소가 public인지 확인해주세요." });
    } else {
      return apiSuccess({ valid: false, reason: `GitHub API 오류 (${res.status})` });
    }
  } catch {
    return apiSuccess({ valid: false, reason: "GitHub 연결에 실패했습니다. 잠시 후 다시 시도해주세요." });
  }
}
