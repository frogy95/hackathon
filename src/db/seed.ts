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
        { key: "documentation", label: "AI-Native 문서화 체계", maxScore: 35 },
        { key: "implementation", label: "기술 구현력", maxScore: 25 },
        { key: "ux", label: "완성도 및 UX", maxScore: 25 },
        { key: "idea", label: "아이디어 및 활용 가치", maxScore: 15 },
      ],
      bonus: [
        { key: "deploy_exists", label: "배포 가점", maxScore: 3 },
        { key: "visual_quality", label: "시각적 완성도", maxScore: 7 },
      ],
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
      jobRole: "개발" as const,
      checkPassword: "1234",
      repoUrl: "https://github.com/kimcs/ai-hackathon-2026",
      deployUrl: "https://ai-hackathon.vercel.app",
      status: "done" as const,
      totalScore: 85,
      baseScore: 85,
      bonusScore: 0,
    },
    {
      id: "sub-002",
      sessionId,
      name: "이영희",
      email: "leeyh@example.com",
      jobRole: "PM/기획" as const,
      checkPassword: "2222",
      repoUrl: "https://github.com/leeyh/smart-scheduler",
      deployUrl: "https://smart-scheduler.netlify.app",
      status: "submitted" as const,
    },
    {
      id: "sub-003",
      sessionId,
      name: "박민준",
      email: "pmj@example.com",
      jobRole: "개발" as const,
      checkPassword: "3333",
      repoUrl: "https://github.com/pmj/code-review-bot",
      status: "submitted" as const,
    },
    {
      id: "sub-004",
      sessionId,
      name: "정수아",
      email: "jsa@example.com",
      jobRole: "디자인" as const,
      checkPassword: "4444",
      repoUrl: "https://github.com/jsa/data-visualizer",
      deployUrl: "https://data-viz.vercel.app",
      status: "submitted" as const,
    },
    {
      id: "sub-005",
      sessionId,
      name: "최동현",
      email: "cdh@example.com",
      jobRole: "QA" as const,
      checkPassword: "5555",
      repoUrl: "https://github.com/cdh/meeting-summarizer",
      status: "submitted" as const,
    },
    {
      id: "sub-006",
      sessionId,
      name: "한지수",
      email: "hjs@example.com",
      jobRole: "PM/기획" as const,
      checkPassword: "6666",
      repoUrl: "https://github.com/hjs/ai-tutor",
      deployUrl: "https://ai-tutor.pages.dev",
      status: "submitted" as const,
    },
    {
      id: "sub-007",
      sessionId,
      name: "오준혁",
      email: "ojh@example.com",
      jobRole: "개발" as const,
      checkPassword: "7777",
      repoUrl: "https://github.com/ojh/travel-planner",
      status: "error" as const,
    },
    {
      id: "sub-008",
      sessionId,
      name: "신예린",
      email: "syr@example.com",
      jobRole: "디자인" as const,
      checkPassword: "8888",
      repoUrl: "https://github.com/syr/recipe-generator",
      deployUrl: "https://recipe-gen.vercel.app",
      status: "submitted" as const,
    },
    {
      id: "sub-009",
      sessionId,
      name: "임태양",
      email: "lty@example.com",
      jobRole: "QA" as const,
      checkPassword: "9999",
      repoUrl: "https://github.com/lty/document-search",
      status: "submitted" as const,
    },
    {
      id: "sub-010",
      sessionId,
      name: "강예지",
      email: "kyj@example.com",
      jobRole: "디자인" as const,
      checkPassword: "0000",
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

  // done 상태 제출(sub-001, 직군: 개발)에 대한 점수 삽입
  // 개발 직군 기준: documentation(30) + implementation(30) + ux(15) + idea(10) + verification_plan(15) = 100
  const scoreData = [
    {
      id: "score-001-1",
      submissionId: "sub-001",
      criteriaKey: "documentation",
      score: 26,
      maxScore: 30,
      reasoning:
        "### 프로젝트 정의 (10/12)\nPRD.md와 README.md가 체계적으로 작성되어 있으며 기능 명세가 명확합니다.\n\n### AI 컨텍스트 (8/9)\nCLAUDE.md가 충실히 작성되어 AI 에이전트가 프로젝트를 이해하기 좋게 구성되어 있습니다.\n\n### 개발 진행 기록 (8/9)\n커밋 히스토리가 일관되게 관리되어 있으며 진행 과정이 추적 가능합니다.",
    },
    {
      id: "score-001-2",
      submissionId: "sub-001",
      criteriaKey: "implementation",
      score: 27,
      maxScore: 30,
      reasoning:
        "### 아키텍처 (11/12)\nNext.js App Router와 Drizzle ORM을 활용한 명확한 계층 구조로 설계되었습니다.\n\n### 코드 품질 (9/10)\nTypeScript를 적극 활용하고 에러 처리가 일관성 있게 구현되어 있습니다.\n\n### 기술 스택 (7/8)\n문제에 적합한 기술 스택을 선택했으며 의존성 관리가 합리적입니다.",
    },
    {
      id: "score-001-3",
      submissionId: "sub-001",
      criteriaKey: "ux",
      score: 13,
      maxScore: 15,
      reasoning:
        "### 완성도 (7/8)\n핵심 기능이 모두 동작하는 완성된 형태입니다.\n\n### 사용자 경험 (4/5)\n사용자 흐름이 자연스럽고 UI가 직관적으로 설계되어 있습니다.\n\n### 반응형/호환성 (2/2)\n다양한 환경에서 적절히 동작합니다.",
    },
    {
      id: "score-001-4",
      submissionId: "sub-001",
      criteriaKey: "idea",
      score: 8,
      maxScore: 10,
      reasoning:
        "### 문제 정의 (4/4)\nAI를 활용한 해커톤 평가 자동화라는 실제적이고 가치 있는 문제를 해결합니다.\n\n### 차별화 (4/6)\n기존 솔루션과의 차별점이 명확하나 더욱 강조될 여지가 있습니다.",
    },
    {
      id: "score-001-5",
      submissionId: "sub-001",
      criteriaKey: "verification_plan",
      score: 11,
      maxScore: 15,
      reasoning:
        "### 테스트 전략 (6/8)\nAPI 엔드포인트 테스트가 구현되어 있으며 검증 체계가 갖추어져 있습니다.\n\n### CI/CD 및 자동화 (5/7)\n기본적인 빌드 자동화가 구성되어 있으나 CI/CD 파이프라인의 완성도를 높일 여지가 있습니다.",
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
