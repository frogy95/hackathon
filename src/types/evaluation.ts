// 평가 관련 타입 정의

// GitHub 수집 데이터
export interface FileTreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

export interface FileContent {
  path: string;
  content: string; // 최대 500줄로 잘린 내용
  truncated: boolean;
}

export interface CommitSummary {
  totalCount: number;
  recentMessages: string[]; // 최근 50개 커밋 메시지
}

export interface CollectedData {
  repoFullName: string; // "owner/repo"
  tree: FileTreeItem[];
  documents: FileContent[]; // README.md, PRD.md, CLAUDE.md 등
  sourceFiles: FileContent[]; // .ts, .tsx, .js, .py 등
  configFiles: FileContent[]; // package.json, requirements.txt 등
  commitSummary: CommitSummary;
  collectedAt: string; // ISO 8601
  tokenEstimate: number; // 총 추정 토큰 수
}

// AI 평가 결과 (PRD 섹션 8.2 JSON 출력 포맷 기준)
export interface SubItemResult {
  key: string;
  name: string;
  score: number;
  max_score: number;
  reasoning: string;
}

export interface CategoryResult {
  key: string; // "documentation" | "implementation" | "ux" | "idea"
  name: string;
  score: number;
  max_score: number;
  sub_items: SubItemResult[];
}

export interface EvaluationResult {
  total_score: number;
  base_score: number;
  bonus_score: number; // Sprint 5에서는 항상 0
  has_deploy_url: boolean;
  categories: CategoryResult[];
  bonus: null; // Sprint 5에서는 null
  summary: string;
}
