// 공통 타입 정의

export type SubmissionStatus = "submitted" | "evaluating" | "done" | "error";

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
  bonus?: CriteriaItem[];
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
  bonusScore: number | null;
}

export interface Score {
  id: string;
  submissionId: string;
  criteriaKey: string;
  score: number;
  maxScore: number;
  reasoning: string | null;
}
