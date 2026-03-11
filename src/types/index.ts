// 공통 타입 정의

export type SubmissionStatus = "submitted" | "collecting" | "evaluating" | "done" | "error";

export type JobRole = "PM/기획" | "디자인" | "개발" | "QA";

export interface Session {
  id: string;
  name: string;
  description: string | null;
  submissionDeadline: string; // ISO 8601
  resultsPublished: boolean;
  criteriaConfig: CriteriaConfig | null;
  createdAt: string;
}

export interface CriteriaConfig {
  criteria: CriteriaItem[];
}

export interface CriteriaItem {
  key: string;
  label: string;
  maxScore: number;
}

export interface Submission {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  repoUrl: string;
  deployUrl: string | null;
  submittedAt: string;
  updatedAt: string;
  excluded: boolean;
  adminNote: string | null;
  status: SubmissionStatus;
  totalScore: number | null;
  baseScore: number | null;
  jobRole: JobRole;
  checkPassword: string;
  editCount: number;
}

export interface Score {
  id: string;
  submissionId: string;
  criteriaKey: string;
  score: number;
  maxScore: number;
  reasoning: string | null;
}

// 행운상 추첨 관련 타입
export interface LuckyDrawSettings {
  winnerCount: number;         // 당첨 인원
  targetRange: "all" | "done"; // 대상 범위: 전체 or 평가 완료만
  excludeSubmissionIds: string[]; // 제외할 제출 ID 목록
}

export interface LuckyDrawWinner {
  submissionId: string;
  name: string;
  email: string;
  jobRole: JobRole;
}

export interface LuckyDraw {
  id: string;
  sessionId: string;
  settings: LuckyDrawSettings;
  winners: LuckyDrawWinner[];
  createdAt: string;
}
