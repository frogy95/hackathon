// Claude API 기반 AI 평가 모듈
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { submissions, scores } from "@/db/schema";
import type { CollectedData, EvaluationResult, CategoryResult } from "@/types/evaluation";
import type { JobRole } from "@/types";
import { ROLE_CRITERIA } from "@/lib/role-criteria";

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
    const exampleScore = Math.floor(c.maxScore * 0.7);
    const subItemsJson = c.subItems.map(
      (s) => `        { "key": "${s.key}", "name": "${s.name}", "score": ${Math.floor(s.maxScore * 0.7)}, "max_score": ${s.maxScore}, "reasoning": "파일명: 한 줄 근거 요약" }`
    ).join(",\n");
    return `    {
      "key": "${c.key}",
      "name": "${c.name}",
      "score": ${exampleScore},
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
  "total_score": 72,
  "base_score": 72,
  "has_deploy_url": false,
  "categories": [
${categoriesJson}
  ],
  "summary": "3-5문장의 종합 평가 의견"
}

주의사항:
- total_score = base_score = 모든 categories의 score 합산 (최대 ${totalMax})
- 각 category의 score = 해당 sub_items의 score 합산
- reasoning은 다음 형식으로 작성하라:
  - 구체적인 파일명, 코드 위치, 문서 내용을 인용하여 판단 근거를 2-3문장으로 서술하라.
  - 강점이 있다면 구체적으로 언급하고, 부족한 점이 있다면 어떤 부분이 보완되면 좋을지 한 줄로 제안하라.
  - 증거를 찾을 수 없으면 "해당 항목과 관련된 내용을 저장소에서 확인할 수 없음"으로 작성하라.
- 모든 문자열 값에서 따옴표는 \\", 개행은 \\n, 백슬래시는 \\\\로 이스케이프하라

## 채점 가이드라인

이것은 1-2일 단기 해커톤("Claude Code를 활용한 AI-Native 개발 입문") 산출물입니다.
프로덕션 수준의 완성도보다 핵심 아이디어의 구현과 AI 도구 활용 역량을 중점적으로 평가하십시오.

### 점수 구간 기준
- 0점: 해당 항목과 관련된 내용이 저장소에 전혀 존재하지 않을 때만 0점을 부여하라.
- 1-40%: 형식적 수준의 시도만 존재하거나 내용이 매우 부족함.
- 41-70%: 기본적인 구현/문서화가 되어 있으나 깊이가 부족하거나 개선 여지가 큼.
- 71-90%: 해커톤 맥락에서 합리적이고 충실한 수준. 대부분의 기대 요소를 충족함.
- 91-100%: 해커톤 수준을 상회하는 우수한 품질. 만점은 프로덕션 레벨이 아닌 해커톤 최고 수준 기준.

### 채점 원칙
- 각 서브 항목은 독립적으로 채점하라. 다른 항목의 점수에 영향받지 마라.
- 저장소에서 확인할 수 있는 증거에 기반하여 채점하라. 추측하지 마라.
- AI 컨텍스트 파일(CLAUDE.md, .cursorrules, .claude/ 디렉토리)은 AI-Native 개발의 핵심 지표로 중요하게 평가하라.`;
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

  // AI 활용 시그널 섹션
  const allPaths = data.tree.map((f) => f.path);
  const aiFiles = allPaths.filter((p) =>
    p === ".cursorrules" ||
    p === ".cursorignore" ||
    p === "CLAUDE.md" ||
    p.startsWith(".claude/")
  );
  const hasClaudeDir = allPaths.some((p) => p.startsWith(".claude/"));
  const { aiCoAuthoredCount, uniqueAuthors, totalCount } = data.commitSummary;
  sections.push(`## AI 활용 시그널
- AI Co-Authored 커밋: ${aiCoAuthoredCount ?? 0}/${totalCount}개
- 고유 커밋 작성자 수: ${uniqueAuthors ?? 1}명
- .claude/ 디렉토리 존재 여부: ${hasClaudeDir ? "있음" : "없음"}
- AI 관련 파일 목록: ${aiFiles.length > 0 ? aiFiles.join(", ") : "없음"}`);

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

// JSON 문자열 값 내부의 이스케이프되지 않은 제어 문자 복구
function repairJson(str: string): string {
  // BOM 제거
  let s = str.startsWith("\uFEFF") ? str.slice(1) : str;
  s = sanitizeJson(s);
  // JSON 문자열 리터럴 내부의 raw 제어 문자 및 이스케이프되지 않은 백슬래시 처리
  s = s.replace(/"([^"\\]|\\.)*"/g, (match) => {
    return match
      // 유효한 이스케이프 시퀀스는 건드리지 않고 나머지 처리
      // 먼저 이스케이프되지 않은 백슬래시를 이중 백슬래시로 변환
      // (유효한 이스케이프 시퀀스 \n \t \" \\ \/ \b \f \r \uXXXX 제외)
      .replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
      // raw 제어 문자 처리
      .replace(/(?<!\\)\t/g, "\\t")
      .replace(/(?<!\\)\f/g, "\\f")
      .replace(/(?<!\\)\b/g, "\\b")
      .replace(/\u0000/g, "\\u0000")
      .replace(/\r\n/g, "\\n")
      .replace(/(?<!\\)\r/g, "\\n")
      .replace(/(?<!\\)\n/g, "\\n");
  });
  return s;
}

// JSON 추출 (마크다운 코드블록 처리 포함)
function extractJson(text: string): EvaluationResult {
  // 순수 JSON 시도
  try {
    return JSON.parse(sanitizeJson(text)) as EvaluationResult;
  } catch {
    // 순수 JSON + repairJson 시도
    try {
      return JSON.parse(repairJson(text)) as EvaluationResult;
    } catch {
      // 마크다운 코드블록에서 추출 시도
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          return JSON.parse(sanitizeJson(match[1])) as EvaluationResult;
        } catch {
          return JSON.parse(repairJson(match[1])) as EvaluationResult;
        }
      }
      // 중괄호 블록 추출 시도
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(sanitizeJson(jsonMatch[0])) as EvaluationResult;
        } catch {
          return JSON.parse(repairJson(jsonMatch[0])) as EvaluationResult;
        }
      }
      // 모든 시도 실패 — 디버그 정보 포함한 에러
      console.error("[AI 평가] JSON 추출 실패. 전체 응답:\n", text);
      throw new Error(
        `AI 응답에서 JSON을 추출할 수 없습니다. 응답 앞부분: ${text.slice(0, 500)}`
      );
    }
  }
}

// 파싱 후 구조 검증
function validateEvaluationResult(result: unknown): asserts result is EvaluationResult {
  if (typeof result !== "object" || result === null) {
    throw new Error("평가 결과가 객체가 아닙니다.");
  }
  const r = result as Record<string, unknown>;
  if (!Array.isArray(r.categories)) {
    throw new Error("평가 결과에 categories 배열이 없습니다.");
  }
  for (let i = 0; i < (r.categories as unknown[]).length; i++) {
    const cat = (r.categories as unknown[])[i] as Record<string, unknown>;
    for (const field of ["key", "score", "max_score", "sub_items"] as const) {
      if (!(field in cat)) {
        throw new Error(`categories[${i}]에 '${field}' 필드가 없습니다.`);
      }
    }
    if (!Array.isArray(cat.sub_items)) {
      throw new Error(`categories[${i}].sub_items가 배열이 아닙니다.`);
    }
    for (let j = 0; j < (cat.sub_items as unknown[]).length; j++) {
      const sub = (cat.sub_items as unknown[])[j] as Record<string, unknown>;
      for (const field of ["key", "score", "max_score", "reasoning"] as const) {
        if (!(field in sub)) {
          throw new Error(`categories[${i}].sub_items[${j}]에 '${field}' 필드가 없습니다.`);
        }
      }
    }
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

  const userContent = `${userPrompt}\n\n---\n\n배포 URL 존재 여부: ${hasDeployUrl ? "있음" : "없음"}`;

  const message = await anthropic.messages.create({
    model: modelId,
    max_tokens: 8192,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  // stop_reason 체크: max_tokens이면 즉시 재시도 (파싱 시도 없이)
  const stopReason = message.stop_reason;
  if (stopReason === "max_tokens") {
    console.warn("[AI 평가] 1차 응답이 max_tokens로 잘렸습니다. 간결 모드로 재시도합니다.");
  }

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  // JSON 추출 및 구조 검증 (max_tokens 잘림 또는 파싱 실패 시 1회 재시도)
  async function doRetry(): Promise<EvaluationResult> {
    const retryMessage = await anthropic.messages.create({
      model: modelId,
      max_tokens: 8192,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${userContent}\n\n추가 지시: reasoning은 각 항목당 2문장 이내로 간결하게 작성하라.`,
        },
      ],
    });
    if (retryMessage.stop_reason === "max_tokens") {
      console.warn("[AI 평가] 재시도 응답도 max_tokens로 잘렸습니다.");
    }
    const retryText = retryMessage.content[0].type === "text" ? retryMessage.content[0].text : "";
    const retryParsed = extractJson(retryText);
    validateEvaluationResult(retryParsed);
    return retryParsed;
  }

  let result: EvaluationResult;
  if (stopReason === "max_tokens") {
    result = await doRetry();
  } else {
    try {
      const parsed = extractJson(responseText);
      validateEvaluationResult(parsed);
      result = parsed;
    } catch (firstError) {
      console.warn("[AI 평가] 1차 파싱 실패, 재시도합니다:", (firstError as Error).message);
      result = await doRetry();
    }
  }

  // base_score 계산 검증 및 보정
  const calculatedBase = result.categories.reduce((sum: number, cat: CategoryResult) => sum + cat.score, 0);
  result.base_score = calculatedBase;
  result.total_score = calculatedBase;
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
      bonusScore: 0,
      status: "done",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(submissions.id, submissionId));
}
