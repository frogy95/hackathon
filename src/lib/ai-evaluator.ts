// Claude API 기반 AI 평가 모듈
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { submissions, scores } from "@/db/schema";
import type { CollectedData, EvaluationResult, CategoryResult } from "@/types/evaluation";
import type { JobRole } from "@/types";

// 서브 평가 항목 정의
interface SubItemDef {
  key: string;
  name: string;
  maxScore: number;
  description: string;
}

// 평가 기준 정의
interface CriterionDef {
  key: string;
  name: string;
  maxScore: number;
  description: string;
  subItems: SubItemDef[];
}

// 직군별 평가 기준 가중치 상수
const ROLE_CRITERIA: Record<JobRole, CriterionDef[]> = {
  "PM/기획": [
    {
      key: "documentation",
      name: "AI-Native 문서화 체계",
      maxScore: 40,
      description: "PRD, README, AI 컨텍스트 파일, 개발 진행 기록의 완성도",
      subItems: [
        { key: "project_definition", name: "프로젝트 정의", maxScore: 16, description: "PRD/README에 문제 정의, 목표, 기능 명세가 명확히 기술되어 있는가" },
        { key: "ai_context", name: "AI 컨텍스트", maxScore: 12, description: "CLAUDE.md 또는 동등한 AI 컨텍스트 파일이 존재하고 충실히 작성되었는가" },
        { key: "progress_log", name: "개발 진행 기록", maxScore: 12, description: "개발 과정이 커밋 이력 또는 문서로 추적 가능한가" },
      ],
    },
    {
      key: "implementation",
      name: "기술 구현력",
      maxScore: 10,
      description: "코드 구조, 품질, 기술 스택 적합성",
      subItems: [
        { key: "code_quality", name: "코드 품질", maxScore: 5, description: "코드 가독성, 일관성이 적절한가" },
        { key: "tech_stack", name: "기술 스택", maxScore: 5, description: "기술 스택 선택이 문제에 적합한가" },
      ],
    },
    {
      key: "ux",
      name: "완성도 및 UX",
      maxScore: 20,
      description: "핵심 기능 동작 여부, 사용자 경험",
      subItems: [
        { key: "completeness", name: "완성도", maxScore: 12, description: "핵심 기능이 동작하는 완성된 형태인가" },
        { key: "user_experience", name: "사용자 경험", maxScore: 8, description: "사용자 흐름이 자연스럽고 UI가 직관적인가" },
      ],
    },
    {
      key: "idea",
      name: "아이디어 및 활용 가치",
      maxScore: 20,
      description: "문제의 실재성, 차별성, 사업 가치",
      subItems: [
        { key: "problem_definition", name: "문제 정의", maxScore: 10, description: "해결하려는 문제가 실제적이고 가치 있는가" },
        { key: "differentiation", name: "차별화", maxScore: 10, description: "기존 솔루션과의 차별점이 명확한가" },
      ],
    },
    {
      key: "verification_plan",
      name: "검증 계획",
      maxScore: 10,
      description: "사용자 검증, 가설 검증, 지표 설계",
      subItems: [
        { key: "hypothesis", name: "가설 설정", maxScore: 5, description: "검증 가설이 명확하게 설정되어 있는가" },
        { key: "metrics", name: "성공 지표", maxScore: 5, description: "성공 지표와 측정 방법이 정의되어 있는가" },
      ],
    },
  ],
  "개발": [
    {
      key: "documentation",
      name: "AI-Native 문서화 체계",
      maxScore: 30,
      description: "PRD, README, AI 컨텍스트 파일, 개발 진행 기록의 완성도",
      subItems: [
        { key: "project_definition", name: "프로젝트 정의", maxScore: 12, description: "PRD/README에 문제 정의, 목표, 기능 명세가 명확히 기술되어 있는가" },
        { key: "ai_context", name: "AI 컨텍스트", maxScore: 9, description: "CLAUDE.md 또는 동등한 AI 컨텍스트 파일이 존재하고 충실히 작성되었는가" },
        { key: "progress_log", name: "개발 진행 기록", maxScore: 9, description: "개발 과정이 커밋 이력 또는 문서로 추적 가능한가" },
      ],
    },
    {
      key: "implementation",
      name: "기술 구현력",
      maxScore: 30,
      description: "아키텍처, 코드 품질, 기술 스택 적합성",
      subItems: [
        { key: "architecture", name: "아키텍처", maxScore: 12, description: "코드 구조가 명확하고, 관심사 분리가 잘 되어 있는가" },
        { key: "code_quality", name: "코드 품질", maxScore: 10, description: "코드 가독성, 일관성, 에러 처리가 적절한가" },
        { key: "tech_stack", name: "기술 스택", maxScore: 8, description: "기술 스택 선택이 문제에 적합하고, 의존성이 합리적인가" },
      ],
    },
    {
      key: "ux",
      name: "완성도 및 UX",
      maxScore: 15,
      description: "핵심 기능 동작 여부, 사용자 경험, 반응형",
      subItems: [
        { key: "completeness", name: "완성도", maxScore: 8, description: "핵심 기능이 동작하는 완성된 형태인가" },
        { key: "user_experience", name: "사용자 경험", maxScore: 5, description: "사용자 흐름이 자연스럽고 UI가 직관적인가" },
        { key: "responsive", name: "반응형/호환성", maxScore: 2, description: "반응형 디자인 또는 다양한 환경에서 동작하는가" },
      ],
    },
    {
      key: "idea",
      name: "아이디어 및 활용 가치",
      maxScore: 10,
      description: "문제의 실재성, 차별성",
      subItems: [
        { key: "problem_definition", name: "문제 정의", maxScore: 4, description: "해결하려는 문제가 실제적이고 가치 있는가" },
        { key: "differentiation", name: "차별화", maxScore: 6, description: "기존 솔루션과의 차별점이 명확한가" },
      ],
    },
    {
      key: "verification_plan",
      name: "검증 계획",
      maxScore: 15,
      description: "테스트 전략, 코드 품질 검증, CI/CD",
      subItems: [
        { key: "test_coverage", name: "테스트 전략", maxScore: 8, description: "단위/통합 테스트가 존재하고 커버리지가 적절한가" },
        { key: "ci_cd", name: "CI/CD 및 자동화", maxScore: 7, description: "자동화된 빌드/배포/검증 파이프라인이 구축되어 있는가" },
      ],
    },
  ],
  "디자인": [
    {
      key: "documentation",
      name: "AI-Native 문서화 체계",
      maxScore: 20,
      description: "PRD, README, AI 컨텍스트 파일, 개발 진행 기록의 완성도",
      subItems: [
        { key: "project_definition", name: "프로젝트 정의", maxScore: 8, description: "PRD/README에 문제 정의, 목표, 기능 명세가 명확히 기술되어 있는가" },
        { key: "ai_context", name: "AI 컨텍스트", maxScore: 6, description: "CLAUDE.md 또는 동등한 AI 컨텍스트 파일이 존재하고 충실히 작성되었는가" },
        { key: "progress_log", name: "개발 진행 기록", maxScore: 6, description: "개발 과정이 커밋 이력 또는 문서로 추적 가능한가" },
      ],
    },
    {
      key: "implementation",
      name: "기술 구현력",
      maxScore: 10,
      description: "코드 구조, 품질, 기술 스택 적합성",
      subItems: [
        { key: "code_quality", name: "코드 품질", maxScore: 5, description: "코드 가독성, 일관성이 적절한가" },
        { key: "tech_stack", name: "기술 스택", maxScore: 5, description: "기술 스택 선택이 문제에 적합한가" },
      ],
    },
    {
      key: "ux",
      name: "완성도 및 UX",
      maxScore: 20,
      description: "핵심 기능 동작 여부, 사용자 경험, 반응형",
      subItems: [
        { key: "completeness", name: "완성도", maxScore: 10, description: "핵심 기능이 동작하는 완성된 형태인가" },
        { key: "user_experience", name: "사용자 경험", maxScore: 7, description: "사용자 흐름이 자연스럽고 UI가 직관적인가" },
        { key: "responsive", name: "반응형/호환성", maxScore: 3, description: "반응형 디자인 또는 다양한 환경에서 동작하는가" },
      ],
    },
    {
      key: "idea",
      name: "아이디어 및 활용 가치",
      maxScore: 10,
      description: "문제의 실재성, 차별성",
      subItems: [
        { key: "problem_definition", name: "문제 정의", maxScore: 5, description: "해결하려는 문제가 실제적이고 가치 있는가" },
        { key: "differentiation", name: "차별화", maxScore: 5, description: "기존 솔루션과의 차별점이 명확한가" },
      ],
    },
    {
      key: "design_system",
      name: "디자인 시스템",
      maxScore: 30,
      description: "컴포넌트 일관성, 색상/타이포그래피 체계, 디자인 토큰",
      subItems: [
        { key: "consistency", name: "시각적 일관성", maxScore: 12, description: "UI 컴포넌트, 색상, 타이포그래피가 일관성 있게 적용되었는가" },
        { key: "design_tokens", name: "디자인 토큰", maxScore: 10, description: "색상, 간격, 타이포그래피 등이 시스템화되어 있는가" },
        { key: "accessibility", name: "접근성", maxScore: 8, description: "색상 대비, 포커스 상태, 스크린 리더 지원이 고려되었는가" },
      ],
    },
    {
      key: "verification_plan",
      name: "검증 계획",
      maxScore: 10,
      description: "사용성 테스트, 디자인 검증 방법",
      subItems: [
        { key: "usability_test", name: "사용성 테스트", maxScore: 6, description: "사용자 테스트 계획이 존재하거나 수행되었는가" },
        { key: "design_review", name: "디자인 검토", maxScore: 4, description: "디자인 검토 프로세스가 문서화되어 있는가" },
      ],
    },
  ],
  "QA": [
    {
      key: "documentation",
      name: "AI-Native 문서화 체계",
      maxScore: 30,
      description: "PRD, README, AI 컨텍스트 파일, 개발 진행 기록의 완성도",
      subItems: [
        { key: "project_definition", name: "프로젝트 정의", maxScore: 12, description: "PRD/README에 문제 정의, 목표, 기능 명세가 명확히 기술되어 있는가" },
        { key: "ai_context", name: "AI 컨텍스트", maxScore: 9, description: "CLAUDE.md 또는 동등한 AI 컨텍스트 파일이 존재하고 충실히 작성되었는가" },
        { key: "progress_log", name: "개발 진행 기록", maxScore: 9, description: "개발 과정이 커밋 이력 또는 문서로 추적 가능한가" },
      ],
    },
    {
      key: "implementation",
      name: "기술 구현력",
      maxScore: 10,
      description: "코드 구조, 품질, 기술 스택 적합성",
      subItems: [
        { key: "code_quality", name: "코드 품질", maxScore: 5, description: "코드 가독성, 일관성이 적절한가" },
        { key: "tech_stack", name: "기술 스택", maxScore: 5, description: "기술 스택 선택이 문제에 적합한가" },
      ],
    },
    {
      key: "ux",
      name: "완성도 및 UX",
      maxScore: 20,
      description: "핵심 기능 동작 여부, 사용자 경험",
      subItems: [
        { key: "completeness", name: "완성도", maxScore: 12, description: "핵심 기능이 동작하는 완성된 형태인가" },
        { key: "user_experience", name: "사용자 경험", maxScore: 8, description: "사용자 흐름이 자연스럽고 UI가 직관적인가" },
      ],
    },
    {
      key: "idea",
      name: "아이디어 및 활용 가치",
      maxScore: 10,
      description: "문제의 실재성, 차별성",
      subItems: [
        { key: "problem_definition", name: "문제 정의", maxScore: 5, description: "해결하려는 문제가 실제적이고 가치 있는가" },
        { key: "differentiation", name: "차별화", maxScore: 5, description: "기존 솔루션과의 차별점이 명확한가" },
      ],
    },
    {
      key: "verification_plan",
      name: "검증 계획",
      maxScore: 30,
      description: "테스트 전략, 품질 보증 체계, 자동화 수준",
      subItems: [
        { key: "test_strategy", name: "테스트 전략", maxScore: 12, description: "단위/통합/E2E 등 체계적인 테스트 전략이 수립되어 있는가" },
        { key: "test_coverage", name: "테스트 커버리지", maxScore: 10, description: "테스트 케이스가 핵심 기능을 충분히 커버하는가" },
        { key: "automation", name: "자동화", maxScore: 8, description: "테스트 자동화가 구현되어 있거나 계획되어 있는가" },
      ],
    },
  ],
};

// 직군별 동적 시스템 프롬프트 생성
function buildSystemPrompt(jobRole: JobRole): string {
  const criteria = ROLE_CRITERIA[jobRole];
  const totalMax = criteria.reduce((sum, c) => sum + c.maxScore, 0);

  const rubricLines = criteria.map((c, i) => {
    const subLines = c.subItems.map(
      (s) => `  - **${s.name}** (${s.maxScore}점): ${s.description}`
    ).join("\n");
    return `### ${i + 1}. ${c.name} (${c.key}) — ${c.maxScore}점\n${subLines}`;
  }).join("\n\n");

  const categoriesJson = criteria.map((c) => {
    const subItemsJson = c.subItems.map(
      (s) => `        { "key": "${s.key}", "name": "${s.name}", "score": <0-${s.maxScore}>, "max_score": ${s.maxScore}, "reasoning": "<구체적인 파일명과 내용을 인용한 근거>" }`
    ).join(",\n");
    return `    {
      "key": "${c.key}",
      "name": "${c.name}",
      "score": <number>,
      "max_score": ${c.maxScore},
      "sub_items": [
${subItemsJson}
      ]
    }`;
  }).join(",\n");

  return `당신은 해커톤 산출물 평가 전문가입니다.
제출된 GitHub 저장소를 분석하여 아래 루브릭에 따라 공정하고 객관적으로 채점합니다.
이 참가자의 직군은 **${jobRole}**입니다. 해당 직군의 역할과 관점에서 평가하십시오.

## 평가 루브릭 (총 ${totalMax}점)

${rubricLines}

## 출력 형식

반드시 아래 JSON 스키마만 출력하라. 마크다운 코드블록 없이 순수 JSON만 출력하라.

{
  "total_score": <number>,
  "base_score": <number>,
  "bonus_score": 0,
  "has_deploy_url": <boolean>,
  "categories": [
${categoriesJson}
  ],
  "bonus": null,
  "summary": "<3-5문장의 종합 평가 의견>"
}

주의사항:
- total_score = base_score = 모든 categories의 score 합산 (최대 ${totalMax})
- 각 category의 score = 해당 sub_items의 score 합산
- reasoning에는 반드시 구체적인 파일명, 코드 내용, 커밋 메시지를 인용하라
- 증거가 없으면 솔직하게 "해당 내용을 찾을 수 없음"으로 기재하라`;
}

// CollectedData를 구조화된 텍스트로 변환
function buildUserPrompt(data: CollectedData): string {
  const sections: string[] = [];

  sections.push(`## 저장소 정보
- 저장소: ${data.repoFullName}
- 총 커밋 수: ${data.commitSummary.totalCount}
- 배포 URL 존재 여부: 제출 데이터 확인 필요`);

  if (data.commitSummary.recentMessages.length > 0) {
    sections.push(`## 최근 커밋 메시지 (${data.commitSummary.recentMessages.length}개)
${data.commitSummary.recentMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}`);
  }

  // 파일 트리 (디렉토리 구조만, 최대 100개)
  const treeLines = data.tree
    .filter((item) => item.type === "blob")
    .slice(0, 100)
    .map((item) => {
      const depth = item.path.split("/").length - 1;
      const indent = "  ".repeat(depth);
      const basename = item.path.split("/").pop() ?? item.path;
      return `${indent}${basename}`;
    });
  sections.push(`## 파일 구조 (상위 100개)
${treeLines.join("\n")}`);

  // 문서 파일
  if (data.documents.length > 0) {
    const docSection = data.documents
      .map((f) => `### ${f.path}${f.truncated ? " (잘림)" : ""}\n${f.content}`)
      .join("\n\n");
    sections.push(`## 문서 파일\n${docSection}`);
  }

  // 설정 파일
  if (data.configFiles.length > 0) {
    const configSection = data.configFiles
      .map((f) => `### ${f.path}${f.truncated ? " (잘림)" : ""}\n${f.content}`)
      .join("\n\n");
    sections.push(`## 설정 파일\n${configSection}`);
  }

  // 소스 파일 (토큰 한도 내에서)
  if (data.sourceFiles.length > 0) {
    const sourceSection = data.sourceFiles
      .map((f) => `### ${f.path}${f.truncated ? " (잘림)" : ""}\n${f.content}`)
      .join("\n\n");
    sections.push(`## 소스 파일\n${sourceSection}`);
  }

  return sections.join("\n\n---\n\n");
}

// 토큰 한도 초과 시 소스 파일 제거
function trimPrompt(data: CollectedData, systemPrompt: string, maxTokens = 90000): CollectedData {
  const estimatedSystemTokens = estimateTokens(systemPrompt);
  const remaining = maxTokens - estimatedSystemTokens;

  const baseData = { ...data, sourceFiles: [] };
  const basePrompt = buildUserPrompt(baseData);
  if (estimateTokens(basePrompt) <= remaining) {
    // 소스 파일 추가 가능한지 확인
    const fullPrompt = buildUserPrompt(data);
    if (estimateTokens(fullPrompt) <= remaining) {
      return data;
    }
    // 소스 파일 일부만 포함
    let trimmedData = { ...data };
    while (
      trimmedData.sourceFiles.length > 0 &&
      estimateTokens(buildUserPrompt(trimmedData)) > remaining
    ) {
      trimmedData = {
        ...trimmedData,
        sourceFiles: trimmedData.sourceFiles.slice(0, -1),
      };
    }
    return trimmedData;
  }
  return baseData;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// trailing comma 등 비표준 JSON 문법 제거
function sanitizeJson(str: string): string {
  return str
    .replace(/,\s*]/g, "]")
    .replace(/,\s*}/g, "}");
}

// JSON 추출 (마크다운 코드블록 처리 포함)
function extractJson(text: string): EvaluationResult {
  // 순수 JSON 시도
  try {
    return JSON.parse(sanitizeJson(text)) as EvaluationResult;
  } catch {
    // 마크다운 코드블록에서 추출 시도
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(sanitizeJson(match[1])) as EvaluationResult;
    }
    // 중괄호 블록 추출 시도
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(sanitizeJson(jsonMatch[0])) as EvaluationResult;
    }
    throw new Error("AI 응답에서 JSON을 추출할 수 없습니다.");
  }
}

// 모델 ID 매핑
const MODEL_MAP: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
};

// Claude API 호출 + 응답 파싱 (직군별 기준 적용)
export async function evaluateWithAI(
  data: CollectedData,
  hasDeployUrl: boolean,
  jobRole: JobRole = "개발",
  model?: string
): Promise<EvaluationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다. 환경 변수를 확인해주세요.");
  }

  const anthropic = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(jobRole);
  const trimmedData = trimPrompt(data, systemPrompt);
  const userPrompt = buildUserPrompt(trimmedData);

  // 모델 선택: 별칭(haiku/sonnet) 또는 직접 모델 ID, 기본값 haiku
  const modelId = MODEL_MAP[model ?? "haiku"] ?? model ?? MODEL_MAP["haiku"];

  const message = await anthropic.messages.create({
    model: modelId,
    max_tokens: 4096,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `${userPrompt}\n\n---\n\n배포 URL 존재 여부: ${hasDeployUrl ? "있음" : "없음"}`,
      },
    ],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";
  const result = extractJson(responseText);

  // base_score 계산 검증 및 보정
  const calculatedBase = result.categories.reduce((sum: number, cat: CategoryResult) => sum + cat.score, 0);
  result.base_score = calculatedBase;
  result.total_score = calculatedBase; // 보너스 미포함
  result.bonus_score = 0;
  result.bonus = null;
  result.has_deploy_url = hasDeployUrl;

  return result;
}

// 평가 결과를 DB에 저장
export async function saveEvaluationResult(
  submissionId: string,
  result: EvaluationResult
): Promise<void> {
  // 기존 점수 삭제 (재평가 시)
  await db.delete(scores).where(eq(scores.submissionId, submissionId));

  // scores 테이블에 대항목별 저장
  for (const category of result.categories) {
    const scoreId = crypto.randomUUID();
    // reasoning을 마크다운 형식으로 저장 (가독성 향상)
    const reasoningMd = category.sub_items
      .map((s) => `### ${s.name} (${s.score}/${s.max_score})\n${s.reasoning}`)
      .join("\n\n");

    await db.insert(scores).values({
      id: scoreId,
      submissionId,
      criteriaKey: category.key,
      score: category.score,
      maxScore: category.max_score,
      reasoning: reasoningMd,
    });
  }

  // submissions 테이블 업데이트
  await db
    .update(submissions)
    .set({
      totalScore: result.total_score,
      baseScore: result.base_score,
      bonusScore: result.bonus_score,
      status: "done",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(submissions.id, submissionId));
}
