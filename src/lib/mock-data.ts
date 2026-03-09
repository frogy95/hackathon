// 목업 데이터 — Phase 2에서 실제 API로 교체 예정

import type { SubmissionStatus } from "@/types";

export const mockSession = {
  id: "session-2026-spring",
  name: "2026 봄 해커톤",
  description:
    "AI-Native 서비스를 만들어보는 해커톤입니다. GitHub 저장소와 배포 URL을 제출해주세요.",
  submissionDeadline: "2026-03-20T18:00:00+09:00",
  resultsPublished: true, // 결과 공개 여부 (check 페이지 테스트용)
  criteriaConfig: {
    criteria: [
      { key: "completeness", label: "완성도", maxScore: 30 },
      { key: "creativity", label: "창의성", maxScore: 25 },
      { key: "technical", label: "기술적 구현", maxScore: 25 },
      { key: "presentation", label: "발표/문서화", maxScore: 20 },
    ],
    bonus: [{ key: "deployment", label: "배포 보너스", maxScore: 5 }],
  },
};

export const mockSubmissions = [
  {
    id: "sub-001",
    sessionId: "session-2026-spring",
    name: "김철수",
    email: "kimcs@example.com",
    repoUrl: "https://github.com/kimcs/ai-hackathon-2026",
    deployUrl: "https://ai-hackathon.vercel.app",
    submittedAt: "2026-03-15T10:30:00+09:00",
    updatedAt: "2026-03-15T14:20:00+09:00",
    status: "done" as const,
    totalScore: 88,
    baseScore: 83,
    bonusScore: 5,
  },
  {
    id: "sub-002",
    sessionId: "session-2026-spring",
    name: "이영희",
    email: "leeyh@example.com",
    repoUrl: "https://github.com/leeyh/smart-scheduler",
    deployUrl: "https://smart-scheduler.netlify.app",
    submittedAt: "2026-03-14T09:15:00+09:00",
    updatedAt: "2026-03-14T09:15:00+09:00",
    status: "submitted" as const,
    totalScore: null,
    baseScore: null,
    bonusScore: null,
  },
  {
    id: "sub-003",
    sessionId: "session-2026-spring",
    name: "박민준",
    email: "pmj@example.com",
    repoUrl: "https://github.com/pmj/code-review-bot",
    deployUrl: null,
    submittedAt: "2026-03-16T16:45:00+09:00",
    updatedAt: "2026-03-16T16:45:00+09:00",
    status: "submitted" as const,
    totalScore: null,
    baseScore: null,
    bonusScore: null,
  },
];

export const mockScores = [
  {
    id: "score-001-1",
    submissionId: "sub-001",
    criteriaKey: "completeness",
    score: 26,
    maxScore: 30,
    reasoning:
      "핵심 기능이 모두 구현되어 있으며 UI/UX 완성도가 높습니다. 에러 처리가 일부 미흡하지만 전체적으로 완성도가 우수합니다.",
  },
  {
    id: "score-001-2",
    submissionId: "sub-001",
    criteriaKey: "creativity",
    score: 22,
    maxScore: 25,
    reasoning:
      "기존 서비스와 차별화된 AI 활용 방식이 인상적입니다. 사용자 맞춤형 추천 기능이 독창적입니다.",
  },
  {
    id: "score-001-3",
    submissionId: "sub-001",
    criteriaKey: "technical",
    score: 20,
    maxScore: 25,
    reasoning:
      "Next.js와 AI API를 효과적으로 결합했습니다. 코드 구조가 깔끔하고 TypeScript를 잘 활용했습니다.",
  },
  {
    id: "score-001-4",
    submissionId: "sub-001",
    criteriaKey: "presentation",
    score: 15,
    maxScore: 20,
    reasoning:
      "README가 잘 작성되어 있으나 데모 영상이 없어 아쉽습니다. 기술 스택 설명이 충분합니다.",
  },
];

// 관리자 대시보드용 세션 목록
export const mockAdminSessions = [
  {
    id: "session-2026-spring",
    name: "2026 봄 해커톤",
    description: "AI-Native 서비스를 만들어보는 해커톤입니다.",
    submissionDeadline: "2026-03-20T18:00:00+09:00",
    resultsPublished: true,
    status: "results_published" as const, // 진행중 | 마감 | 결과공개
    submissionCount: 10,
    createdAt: "2026-03-01T09:00:00+09:00",
  },
  {
    id: "session-2025-fall",
    name: "2025 가을 해커톤",
    description: "웹/앱 서비스 아이디어를 구현해보는 해커톤입니다.",
    submissionDeadline: "2025-09-15T18:00:00+09:00",
    resultsPublished: false,
    status: "closed" as const,
    submissionCount: 24,
    createdAt: "2025-09-01T09:00:00+09:00",
  },
  {
    id: "session-2026-summer",
    name: "2026 여름 해커톤",
    description: "오픈 주제 해커톤 — 어떤 서비스든 제출 가능합니다.",
    submissionDeadline: "2026-07-25T18:00:00+09:00",
    resultsPublished: false,
    status: "active" as const,
    submissionCount: 5,
    createdAt: "2026-07-10T09:00:00+09:00",
  },
];

// 세션 상세 — 제출 현황 목업 데이터 (10건)
export const mockAdminSubmissions: Array<{
  id: string;
  sessionId: string;
  name: string;
  email: string;
  repoUrl: string;
  deployUrl: string | null;
  submittedAt: string;
  status: SubmissionStatus;
  excluded: boolean;
  adminNote: string | null;
  totalScore: number | null;
  baseScore: number | null;
  bonusScore: number | null;
}> = [
  {
    id: "sub-001",
    sessionId: "session-2026-spring",
    name: "김철수",
    email: "kimcs@example.com",
    repoUrl: "https://github.com/kimcs/ai-hackathon-2026",
    deployUrl: "https://ai-hackathon.vercel.app",
    submittedAt: "2026-03-15T10:30:00+09:00",
    status: "done",
    excluded: false,
    adminNote: null,
    totalScore: 88,
    baseScore: 83,
    bonusScore: 5,
  },
  {
    id: "sub-002",
    sessionId: "session-2026-spring",
    name: "이영희",
    email: "leeyh@example.com",
    repoUrl: "https://github.com/leeyh/smart-scheduler",
    deployUrl: "https://smart-scheduler.netlify.app",
    submittedAt: "2026-03-14T09:15:00+09:00",
    status: "submitted",
    excluded: false,
    adminNote: null,
    totalScore: null,
    baseScore: null,
    bonusScore: null,
  },
  {
    id: "sub-003",
    sessionId: "session-2026-spring",
    name: "박민준",
    email: "pmj@example.com",
    repoUrl: "https://github.com/pmj/code-review-bot",
    deployUrl: null,
    submittedAt: "2026-03-16T16:45:00+09:00",
    status: "submitted",
    excluded: false,
    adminNote: "GitHub URL 확인 필요",
    totalScore: null,
    baseScore: null,
    bonusScore: null,
  },
  {
    id: "sub-004",
    sessionId: "session-2026-spring",
    name: "최수연",
    email: "choisy@example.com",
    repoUrl: "https://github.com/choisy/ai-tutor",
    deployUrl: "https://ai-tutor.vercel.app",
    submittedAt: "2026-03-13T14:20:00+09:00",
    status: "evaluating",
    excluded: false,
    adminNote: null,
    totalScore: null,
    baseScore: null,
    bonusScore: null,
  },
  {
    id: "sub-005",
    sessionId: "session-2026-spring",
    name: "정현우",
    email: "jhw@example.com",
    repoUrl: "https://github.com/jhw/recipe-ai",
    deployUrl: null,
    submittedAt: "2026-03-17T11:00:00+09:00",
    status: "evaluating",
    excluded: false,
    adminNote: null,
    totalScore: null,
    baseScore: null,
    bonusScore: null,
  },
  {
    id: "sub-006",
    sessionId: "session-2026-spring",
    name: "강지민",
    email: "kangji@example.com",
    repoUrl: "https://github.com/kangji/health-tracker",
    deployUrl: "https://health-tracker.netlify.app",
    submittedAt: "2026-03-12T08:55:00+09:00",
    status: "done",
    excluded: false,
    adminNote: null,
    totalScore: 75,
    baseScore: 70,
    bonusScore: 5,
  },
  {
    id: "sub-007",
    sessionId: "session-2026-spring",
    name: "윤서준",
    email: "yoonsj@example.com",
    repoUrl: "https://github.com/yoonsj/chat-assistant",
    deployUrl: null,
    submittedAt: "2026-03-18T17:30:00+09:00",
    status: "error",
    excluded: false,
    adminNote: "GitHub 저장소 private 상태 — 접근 불가",
    totalScore: null,
    baseScore: null,
    bonusScore: null,
  },
  {
    id: "sub-008",
    sessionId: "session-2026-spring",
    name: "임나영",
    email: "limny@example.com",
    repoUrl: "https://github.com/limny/doc-summarizer",
    deployUrl: "https://doc-summarizer.vercel.app",
    submittedAt: "2026-03-11T13:10:00+09:00",
    status: "done",
    excluded: false,
    adminNote: null,
    totalScore: 92,
    baseScore: 87,
    bonusScore: 5,
  },
  {
    id: "sub-009",
    sessionId: "session-2026-spring",
    name: "한동훈",
    email: "handhoon@example.com",
    repoUrl: "https://github.com/handhoon/stock-ai",
    deployUrl: null,
    submittedAt: "2026-03-19T09:00:00+09:00",
    status: "error",
    excluded: true,
    adminNote: "중복 제출 — 제외 처리",
    totalScore: null,
    baseScore: null,
    bonusScore: null,
  },
  {
    id: "sub-010",
    sessionId: "session-2026-spring",
    name: "오지훈",
    email: "ohji@example.com",
    repoUrl: "https://github.com/ohji/travel-planner",
    deployUrl: "https://travel-planner.vercel.app",
    submittedAt: "2026-03-10T10:00:00+09:00",
    status: "submitted",
    excluded: false,
    adminNote: null,
    totalScore: null,
    baseScore: null,
    bonusScore: null,
  },
];

// 결과 대시보드 순위 데이터
export const mockRankings = [
  {
    submissionId: "sub-008",
    name: "임나영",
    email: "limny@example.com",
    repoUrl: "https://github.com/limny/doc-summarizer",
    deployUrl: "https://doc-summarizer.vercel.app",
    scores: {
      completeness: 28,
      creativity: 23,
      technical: 22,
      presentation: 14,
    },
    baseScore: 87,
    bonusScore: 5,
    totalScore: 92,
    rank: 1,
  },
  {
    submissionId: "sub-001",
    name: "김철수",
    email: "kimcs@example.com",
    repoUrl: "https://github.com/kimcs/ai-hackathon-2026",
    deployUrl: "https://ai-hackathon.vercel.app",
    scores: {
      completeness: 26,
      creativity: 22,
      technical: 20,
      presentation: 15,
    },
    baseScore: 83,
    bonusScore: 5,
    totalScore: 88,
    rank: 2,
  },
  {
    submissionId: "sub-006",
    name: "강지민",
    email: "kangji@example.com",
    repoUrl: "https://github.com/kangji/health-tracker",
    deployUrl: "https://health-tracker.netlify.app",
    scores: {
      completeness: 22,
      creativity: 18,
      technical: 17,
      presentation: 13,
    },
    baseScore: 70,
    bonusScore: 5,
    totalScore: 75,
    rank: 3,
  },
];

// 개별 프로젝트 상세 리포트 목업
export const mockProjectReports: Record<
  string,
  {
    submissionId: string;
    name: string;
    email: string;
    repoUrl: string;
    deployUrl: string | null;
    scores: {
      completeness: number;
      creativity: number;
      technical: number;
      presentation: number;
    };
    reasoning: {
      completeness: string;
      creativity: string;
      technical: string;
      presentation: string;
    };
    baseScore: number;
    bonusScore: number | null;
    bonusReasoning: string | null;
    totalScore: number;
  }
> = {
  "sub-008": {
    submissionId: "sub-008",
    name: "임나영",
    email: "limny@example.com",
    repoUrl: "https://github.com/limny/doc-summarizer",
    deployUrl: "https://doc-summarizer.vercel.app",
    scores: { completeness: 28, creativity: 23, technical: 22, presentation: 14 },
    reasoning: {
      completeness: "문서 요약 핵심 기능이 완벽하게 구현되었으며 다양한 파일 형식을 지원합니다.",
      creativity: "Claude API를 활용한 구조화된 요약 방식이 독창적이며 사용자 경험이 뛰어납니다.",
      technical: "TypeScript와 Next.js를 능숙하게 사용하였고 API 에러 처리가 충실합니다.",
      presentation: "README 문서화는 훌륭하나 아키텍처 다이어그램이 부재합니다.",
    },
    baseScore: 87,
    bonusScore: 5,
    bonusReasoning:
      "배포 URL 접근 가능. 데스크톱/모바일 레이아웃이 잘 구성되어 있으며 시각적 완성도가 높습니다.",
    totalScore: 92,
  },
  "sub-001": {
    submissionId: "sub-001",
    name: "김철수",
    email: "kimcs@example.com",
    repoUrl: "https://github.com/kimcs/ai-hackathon-2026",
    deployUrl: "https://ai-hackathon.vercel.app",
    scores: { completeness: 26, creativity: 22, technical: 20, presentation: 15 },
    reasoning: {
      completeness:
        "핵심 기능이 모두 구현되어 있으며 UI/UX 완성도가 높습니다. 에러 처리가 일부 미흡합니다.",
      creativity:
        "기존 서비스와 차별화된 AI 활용 방식이 인상적입니다. 사용자 맞춤형 추천 기능이 독창적입니다.",
      technical:
        "Next.js와 AI API를 효과적으로 결합했습니다. 코드 구조가 깔끔하고 TypeScript를 잘 활용했습니다.",
      presentation: "README가 잘 작성되어 있으나 데모 영상이 없어 아쉽습니다.",
    },
    baseScore: 83,
    bonusScore: 5,
    bonusReasoning:
      "배포 URL 접근 가능. 전반적인 시각적 디자인이 깔끔하고 반응형 레이아웃이 잘 동작합니다.",
    totalScore: 88,
  },
  "sub-006": {
    submissionId: "sub-006",
    name: "강지민",
    email: "kangji@example.com",
    repoUrl: "https://github.com/kangji/health-tracker",
    deployUrl: "https://health-tracker.netlify.app",
    scores: { completeness: 22, creativity: 18, technical: 17, presentation: 13 },
    reasoning: {
      completeness: "기본 기능은 동작하나 일부 엣지 케이스에서 오류가 발생합니다.",
      creativity: "건강 추적 아이디어는 흔하지만 AI 분석 기능으로 차별화를 시도했습니다.",
      technical: "코드 구조는 평균 수준이며 타입 안전성 개선 여지가 있습니다.",
      presentation: "README 기본 작성, 기술 스택 설명은 충분합니다.",
    },
    baseScore: 70,
    bonusScore: 5,
    bonusReasoning: "배포 URL 접근 가능. 레이아웃은 단순하지만 기능상 문제없이 동작합니다.",
    totalScore: 75,
  },
};
