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
      { key: "documentation", label: "AI-Native 문서화 체계", maxScore: 35 },
      { key: "implementation", label: "기술 구현력", maxScore: 25 },
      { key: "ux", label: "완성도 및 UX", maxScore: 25 },
      { key: "idea", label: "아이디어 및 활용 가치", maxScore: 15 },
    ],
    bonus: [
      { key: "deploy_exists", label: "배포 가점", maxScore: 3 },
      { key: "visual_quality", label: "시각적 완성도", maxScore: 7 },
    ],
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
    totalScore: 93,
    baseScore: 85,
    bonusScore: 8,
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
    criteriaKey: "documentation",
    score: 32,
    maxScore: 35,
    reasoning:
      "PRD.md와 CLAUDE.md가 체계적으로 작성되어 있으며 AI 컨텍스트 파일이 잘 정의되어 있습니다. 진행 기록이 상세하게 남아 있어 우수합니다.",
  },
  {
    id: "score-001-2",
    submissionId: "sub-001",
    criteriaKey: "implementation",
    score: 22,
    maxScore: 25,
    reasoning:
      "Next.js와 AI API를 효과적으로 결합했습니다. 코드 구조가 깔끔하고 TypeScript를 잘 활용했습니다. 아키텍처 설계가 명확합니다.",
  },
  {
    id: "score-001-3",
    submissionId: "sub-001",
    criteriaKey: "ux",
    score: 20,
    maxScore: 25,
    reasoning:
      "핵심 기능이 모두 구현되어 있으며 UI 완성도가 높습니다. 에러 처리가 일부 미흡하지만 전체적으로 동작 완성도가 우수합니다.",
  },
  {
    id: "score-001-4",
    submissionId: "sub-001",
    criteriaKey: "idea",
    score: 11,
    maxScore: 15,
    reasoning:
      "AI를 활용한 사용자 맞춤형 서비스 아이디어가 명확합니다. 문제 정의가 구체적이나 차별성 측면에서 보완 여지가 있습니다.",
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
    totalScore: 93,
    baseScore: 85,
    bonusScore: 8,
  },
  {
    id: "sub-002",
    sessionId: "session-2026-spring",
    name: "이영희",
    email: "leeyh@example.com",
    repoUrl: "https://github.com/leeyh/smart-scheduler",
    deployUrl: "https://smart-scheduler.netlify.app",
    submittedAt: "2026-03-14T09:15:00+09:00",
    status: "collecting",
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
    totalScore: 71,
    baseScore: 66,
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
    totalScore: 96,
    baseScore: 86,
    bonusScore: 10,
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
      documentation: 30,
      implementation: 23,
      ux: 22,
      idea: 11,
    },
    baseScore: 86,
    bonusScore: 10,
    totalScore: 96,
    rank: 1,
  },
  {
    submissionId: "sub-001",
    name: "김철수",
    email: "kimcs@example.com",
    repoUrl: "https://github.com/kimcs/ai-hackathon-2026",
    deployUrl: "https://ai-hackathon.vercel.app",
    scores: {
      documentation: 32,
      implementation: 22,
      ux: 20,
      idea: 11,
    },
    baseScore: 85,
    bonusScore: 8,
    totalScore: 93,
    rank: 2,
  },
  {
    submissionId: "sub-006",
    name: "강지민",
    email: "kangji@example.com",
    repoUrl: "https://github.com/kangji/health-tracker",
    deployUrl: "https://health-tracker.netlify.app",
    scores: {
      documentation: 22,
      implementation: 17,
      ux: 18,
      idea: 9,
    },
    baseScore: 66,
    bonusScore: 5,
    totalScore: 71,
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
      documentation: number;
      implementation: number;
      ux: number;
      idea: number;
    };
    reasoning: {
      documentation: string;
      implementation: string;
      ux: string;
      idea: string;
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
    scores: { documentation: 30, implementation: 23, ux: 22, idea: 11 },
    reasoning: {
      documentation:
        "PRD.md, CLAUDE.md, 스프린트 계획 문서가 체계적으로 작성되어 있습니다. AI 컨텍스트 파일이 잘 정의되어 개발 과정이 투명하게 기록되어 있습니다.",
      implementation:
        "TypeScript와 Next.js를 능숙하게 사용하였고 Claude API 연동이 안정적입니다. API 에러 처리가 충실하며 코드 품질이 우수합니다.",
      ux: "문서 요약 핵심 기능이 완벽하게 구현되었으며 다양한 파일 형식을 지원합니다. 사용자 경험이 직관적으로 설계되어 있습니다.",
      idea: "Claude API를 활용한 구조화된 요약 서비스 아이디어가 명확하며 실용적입니다. 문서 처리 자동화라는 명확한 문제를 해결합니다.",
    },
    baseScore: 86,
    bonusScore: 10,
    bonusReasoning:
      "배포 URL 정상 접근 가능 (배포 가점 3점). 데스크톱/모바일 레이아웃이 잘 구성되어 있으며 색상 팔레트가 일관되고 시각적 완성도가 높습니다 (시각적 완성도 7점).",
    totalScore: 96,
  },
  "sub-001": {
    submissionId: "sub-001",
    name: "김철수",
    email: "kimcs@example.com",
    repoUrl: "https://github.com/kimcs/ai-hackathon-2026",
    deployUrl: "https://ai-hackathon.vercel.app",
    scores: { documentation: 32, implementation: 22, ux: 20, idea: 11 },
    reasoning: {
      documentation:
        "PRD.md와 CLAUDE.md가 체계적으로 작성되어 있으며 AI 컨텍스트 파일이 잘 정의되어 있습니다. 진행 기록이 상세하게 남아 있어 우수합니다.",
      implementation:
        "Next.js와 AI API를 효과적으로 결합했습니다. 코드 구조가 깔끔하고 TypeScript를 잘 활용했습니다. 아키텍처 설계가 명확합니다.",
      ux: "핵심 기능이 모두 구현되어 있으며 UI 완성도가 높습니다. 에러 처리가 일부 미흡하지만 전체적으로 동작 완성도가 우수합니다.",
      idea: "AI를 활용한 사용자 맞춤형 서비스 아이디어가 명확합니다. 문제 정의가 구체적이나 차별성 측면에서 보완 여지가 있습니다.",
    },
    baseScore: 85,
    bonusScore: 8,
    bonusReasoning:
      "배포 URL 정상 접근 가능 (배포 가점 3점). 전반적인 시각적 디자인이 깔끔하고 반응형 레이아웃이 잘 동작합니다. 모바일 대응이 양호하나 타이포그래피 개선 여지 있음 (시각적 완성도 5점).",
    totalScore: 93,
  },
  "sub-006": {
    submissionId: "sub-006",
    name: "강지민",
    email: "kangji@example.com",
    repoUrl: "https://github.com/kangji/health-tracker",
    deployUrl: "https://health-tracker.netlify.app",
    scores: { documentation: 22, implementation: 17, ux: 18, idea: 9 },
    reasoning: {
      documentation:
        "README 기본 작성이 되어 있으나 PRD나 AI 컨텍스트 파일이 없습니다. 프로젝트 정의 문서가 부족합니다.",
      implementation: "코드 구조는 평균 수준이며 타입 안전성 개선 여지가 있습니다. 기본적인 AI API 연동은 동작합니다.",
      ux: "기본 기능은 동작하나 일부 엣지 케이스에서 오류가 발생합니다. 반응형 레이아웃은 구현되어 있습니다.",
      idea: "건강 추적 아이디어는 흔하지만 AI 분석 기능으로 차별화를 시도했습니다. 문제 정의가 다소 모호합니다.",
    },
    baseScore: 66,
    bonusScore: 5,
    bonusReasoning:
      "배포 URL 정상 접근 가능 (배포 가점 3점). 레이아웃은 단순하지만 기능상 문제없이 동작합니다. 시각적 완성도는 개선 여지가 있습니다 (시각적 완성도 2점).",
    totalScore: 71,
  },
};
