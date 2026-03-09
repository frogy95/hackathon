// 목업 데이터 — Phase 2에서 실제 API로 교체 예정

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
