import { db } from "./index";
import { evaluationSessions, submissions, scores } from "./schema";

async function seed() {
  console.log("시드 데이터 삽입 시작...");

  // 기존 데이터 삭제
  await db.delete(scores);
  await db.delete(submissions);
  await db.delete(evaluationSessions);

  // 세션 생성
  const sessionId = "session-2026-spring";
  await db.insert(evaluationSessions).values({
    id: sessionId,
    name: "2026 봄 해커톤",
    description:
      "AI-Native 서비스를 만들어보는 해커톤입니다. GitHub 저장소와 배포 URL을 제출해주세요.",
    submissionDeadline: "2026-03-20T18:00:00+09:00",
    criteriaConfig: JSON.stringify({
      criteria: [
        { key: "completeness", label: "완성도", maxScore: 30 },
        { key: "creativity", label: "창의성", maxScore: 25 },
        { key: "technical", label: "기술적 구현", maxScore: 25 },
        { key: "presentation", label: "발표/문서화", maxScore: 20 },
      ],
      bonus: [{ key: "deployment", label: "배포 보너스", maxScore: 5 }],
    }),
    resultsPublished: false,
  });

  // 제출 10건 생성
  const submissionData = [
    {
      id: "sub-001",
      sessionId,
      name: "김철수",
      email: "kimcs@example.com",
      repoUrl: "https://github.com/kimcs/ai-hackathon-2026",
      deployUrl: "https://ai-hackathon.vercel.app",
      status: "done" as const,
      totalScore: 88,
      baseScore: 83,
      bonusScore: 5,
    },
    {
      id: "sub-002",
      sessionId,
      name: "이영희",
      email: "leeyh@example.com",
      repoUrl: "https://github.com/leeyh/smart-scheduler",
      deployUrl: "https://smart-scheduler.netlify.app",
      status: "submitted" as const,
    },
    {
      id: "sub-003",
      sessionId,
      name: "박민준",
      email: "pmj@example.com",
      repoUrl: "https://github.com/pmj/code-review-bot",
      status: "submitted" as const,
    },
    {
      id: "sub-004",
      sessionId,
      name: "정수아",
      email: "jsa@example.com",
      repoUrl: "https://github.com/jsa/data-visualizer",
      deployUrl: "https://data-viz.vercel.app",
      status: "evaluating" as const,
    },
    {
      id: "sub-005",
      sessionId,
      name: "최동현",
      email: "cdh@example.com",
      repoUrl: "https://github.com/cdh/meeting-summarizer",
      status: "submitted" as const,
    },
    {
      id: "sub-006",
      sessionId,
      name: "한지수",
      email: "hjs@example.com",
      repoUrl: "https://github.com/hjs/ai-tutor",
      deployUrl: "https://ai-tutor.pages.dev",
      status: "submitted" as const,
    },
    {
      id: "sub-007",
      sessionId,
      name: "오준혁",
      email: "ojh@example.com",
      repoUrl: "https://github.com/ojh/travel-planner",
      status: "error" as const,
    },
    {
      id: "sub-008",
      sessionId,
      name: "신예린",
      email: "syr@example.com",
      repoUrl: "https://github.com/syr/recipe-generator",
      deployUrl: "https://recipe-gen.vercel.app",
      status: "submitted" as const,
    },
    {
      id: "sub-009",
      sessionId,
      name: "임태양",
      email: "lty@example.com",
      repoUrl: "https://github.com/lty/document-search",
      status: "submitted" as const,
    },
    {
      id: "sub-010",
      sessionId,
      name: "강예지",
      email: "kyj@example.com",
      repoUrl: "https://github.com/kyj/fitness-coach",
      deployUrl: "https://fitness-ai.netlify.app",
      status: "submitted" as const,
    },
  ];

  for (const sub of submissionData) {
    await db.insert(submissions).values({
      ...sub,
      submittedAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // done 상태 제출(sub-001)에 대한 점수 삽입
  const scoreData = [
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
      reasoning: "README가 잘 작성되어 있으나 데모 영상이 없어 아쉽습니다. 기술 스택 설명이 충분합니다.",
    },
  ];

  for (const score of scoreData) {
    await db.insert(scores).values(score);
  }

  console.log("✅ 시드 데이터 삽입 완료!");
  console.log(`  - 세션: 1개`);
  console.log(`  - 제출: ${submissionData.length}건`);
  console.log(`  - 점수: ${scoreData.length}건`);
}

seed().catch((err) => {
  console.error("시드 실패:", err);
  process.exit(1);
});
