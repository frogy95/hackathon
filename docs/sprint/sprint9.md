# Sprint 9: 운영 준비 — 이메일 도메인 제한 + 중복 거부 + 보너스 제거 + 이메일 결과 발송

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 해커톤 실운영 전 필수 조건 — 내부 도메인 전용 제출 제한, 중복 제출 거부, 보너스 점수 체계 완전 제거, 자동 평가 완료 후 이메일로 결과 발송 파이프라인 구축.

**Architecture:** 유효성 검증(T9-1) → 제출 API 정책 변경(T9-2) → 보너스 코드 전면 제거(T9-3) → 이메일 모듈 신규 구현(T9-4) → 평가 완료 후 이메일 발송 파이프라인 연결(T9-5) → UI 안내 문구 추가(T9-6) → 환경 변수/배포 설정 정리(T9-7).

**Tech Stack:** Next.js 15 App Router, TypeScript, Drizzle ORM + libsql, Resend SDK, zod, @vercel/functions waitUntil

**기간:** 1주 (2026-03-11 ~)

**브랜치:** `sprint9` (main에서 분기)

---

## 사전 확인 사항

현재 코드베이스 상태 (Sprint 8 완료 기준):
- 중복 이메일 제출 시 upsert(덮어쓰기) 동작 — T9-2에서 409 거부로 변경
- `bonus_score`, `ScreenshotResult`, `VisionEvaluationResult` 타입이 `src/types/evaluation.ts`, `src/types/index.ts`, `src/db/schema.ts`에 잔존
- `src/lib/vision-evaluator.ts`, `src/lib/screenshot-capturer.ts` 파일 존재
- `src/lib/evaluation-runner.ts`에서 두 파일을 import하고 스크린샷/Vision 단계 실행
- `src/components/check/score-result.tsx`에서 `bonusScore` prop 표시
- `src/components/admin/ProjectReport.tsx`에서 `bonusScore`, `ScreenshotResult` 사용
- Resend 미설치

보너스 참조 파일 전체 목록 (T9-3 작업 범위):
- `src/types/evaluation.ts` — `ScreenshotResult`, `VisionEvaluationResult`, `EvaluationResult.bonus_score/bonus` 필드
- `src/types/index.ts` — `Submission.bonusScore`, `CriteriaConfig.bonus`
- `src/db/schema.ts` — `submissions.bonusScore` 컬럼 (DB 컬럼은 유지, 코드에서만 제거)
- `src/lib/evaluation-runner.ts` — import, 스크린샷/Vision 단계 전체
- `src/lib/ai-evaluator.ts` — JSON 출력 포맷의 `bonus_score`, `bonus` 필드
- `src/components/check/score-result.tsx` — `bonusScore` prop, 보너스 섹션 UI
- `src/components/check/submission-detail.tsx` — `bonusScore` 참조
- `src/components/admin/RankingTable.tsx` — 보너스 토글 UI
- `src/components/admin/ProjectReport.tsx` — `bonusScore`, `bonusReasoning`, `screenshots` 표시
- `src/app/admin/session/[sessionId]/results/page.tsx` — 보너스 포함/미포함 토글
- `src/app/admin/session/[sessionId]/results/[submissionId]/page.tsx` — screenshots 전달
- `src/app/api/sessions/[id]/evaluate/reset/route.ts` — bonusScore 리셋
- `src/app/api/sessions/[id]/export/csv/route.ts` — bonusScore CSV 컬럼

---

## T9-1: 이메일 도메인 제한

**파일:**
- 수정: `src/lib/validations.ts`

**구현 목표:** `submissionSchema`의 `email` 필드에 `.refine()` 추가 — `@ubcare.co.kr` 도메인만 허용.

### Step 1: `submissionSchema` email 필드 수정

`src/lib/validations.ts`의 email 필드를 아래와 같이 변경한다:

```typescript
email: z
  .string()
  .email("올바른 이메일 주소를 입력해주세요.")
  .refine(
    (val) => val.endsWith("@ubcare.co.kr"),
    "ubcare.co.kr 이메일만 허용됩니다"
  ),
```

### Step 2: 빌드 확인

```bash
npm run build
```

기대 결과: 에러 없이 빌드 성공.

### Step 3: 커밋

```bash
git add src/lib/validations.ts
git commit -m "feat: 제출 이메일을 ubcare.co.kr 도메인으로 제한"
```

---

## T9-2: 중복 제출 거부 (upsert → 409 Conflict)

**파일:**
- 수정: `src/app/api/sessions/[id]/submissions/route.ts`

**구현 목표:** 동일 이메일로 제출 시 기존 upsert 대신 409 Conflict를 반환하여 중복 제출을 거부한다.

### Step 1: POST 핸들러의 upsert 로직 변경

`src/app/api/sessions/[id]/submissions/route.ts`에서 existing 분기를 찾아 업데이트 로직을 삭제하고 에러 반환으로 교체한다:

```typescript
// 기존 (제거)
if (existing) {
  // ... 업데이트 로직 ...
  return apiSuccess(updated);
} else {
  // ... 생성 로직 ...
  return apiSuccess(created, 201);
}
```

변경 후:

```typescript
if (existing) {
  return apiError(
    "DUPLICATE_SUBMISSION",
    "이미 제출하셨습니다. 동일 이메일로는 중복 제출이 불가합니다.",
    409
  );
}

// 신규 제출 생성
const id = crypto.randomUUID();
await db.insert(submissions).values({
  id,
  sessionId,
  name,
  email,
  repoUrl,
  deployUrl: deployUrl ?? null,
  jobRole,
  checkPassword,
  submittedAt: now,
  updatedAt: now,
});

const created = await db
  .select()
  .from(submissions)
  .where(eq(submissions.id, id))
  .then((r) => r[0]);

return apiSuccess(created, 201);
```

`ErrorCode` 객체에 `DUPLICATE_SUBMISSION`이 없으므로 `apiError`의 3번째 인자(status)를 직접 `409`로 넘긴다 — `api-utils.ts`의 `apiError` 함수 시그니처가 `(code, message, status)` 형태이므로 그대로 사용 가능.

### Step 2: 빌드 확인

```bash
npm run build
```

### Step 3: 커밋

```bash
git add src/app/api/sessions/[id]/submissions/route.ts
git commit -m "feat: 중복 이메일 제출 시 upsert 대신 409 Conflict 반환"
```

---

## T9-3: 보너스 점수 체계 전면 제거

**파일:**
- 삭제: `src/lib/vision-evaluator.ts`
- 삭제: `src/lib/screenshot-capturer.ts`
- 수정: `src/types/evaluation.ts`
- 수정: `src/types/index.ts`
- 수정: `src/lib/evaluation-runner.ts`
- 수정: `src/lib/ai-evaluator.ts`
- 수정: `src/components/check/score-result.tsx`
- 수정: `src/components/check/submission-detail.tsx`
- 수정: `src/components/admin/RankingTable.tsx`
- 수정: `src/components/admin/ProjectReport.tsx`
- 수정: `src/app/admin/session/[sessionId]/results/page.tsx`
- 수정: `src/app/admin/session/[sessionId]/results/[submissionId]/page.tsx`
- 수정: `src/app/api/sessions/[id]/evaluate/reset/route.ts`
- 수정: `src/app/api/sessions/[id]/export/csv/route.ts`

**주의:** `src/db/schema.ts`의 `bonusScore` 컬럼과 `screenshots` 컬럼은 DB 호환성을 위해 **삭제하지 않는다**. 코드 레이어에서만 참조를 제거한다.

### Step 1: 파일 삭제

```bash
rm src/lib/vision-evaluator.ts
rm src/lib/screenshot-capturer.ts
```

### Step 2: `src/types/evaluation.ts` 정리

`ScreenshotResult`, `VisionEvaluationResult` 인터페이스를 삭제하고, `EvaluationResult`에서 보너스 필드를 제거한다:

```typescript
// 평가 관련 타입 정의

// GitHub 수집 데이터
export interface FileTreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

export interface FileContent {
  path: string;
  content: string;
  truncated: boolean;
}

export interface CommitSummary {
  totalCount: number;
  recentMessages: string[];
}

export interface CollectedData {
  repoFullName: string;
  tree: FileTreeItem[];
  documents: FileContent[];
  sourceFiles: FileContent[];
  configFiles: FileContent[];
  commitSummary: CommitSummary;
  collectedAt: string;
  tokenEstimate: number;
}

export interface SubItemResult {
  key: string;
  name: string;
  score: number;
  max_score: number;
  reasoning: string;
}

export interface CategoryResult {
  key: string;
  name: string;
  score: number;
  max_score: number;
  sub_items: SubItemResult[];
}

export interface EvaluationResult {
  total_score: number;
  base_score: number;
  categories: CategoryResult[];
  summary: string;
}
```

### Step 3: `src/types/index.ts` 정리

`Submission.bonusScore` 필드 제거, `CriteriaConfig.bonus` 옵셔널 필드 제거:

```typescript
export interface CriteriaConfig {
  criteria: CriteriaItem[];
  // bonus 필드 제거
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
  // bonusScore 제거
  jobRole: JobRole;
  checkPassword: string;
}
```

### Step 4: `src/lib/evaluation-runner.ts` 정리

`captureScreenshots`, `evaluateVisual` import 및 사용 코드를 제거하고 `evaluateSingle` 함수를 단순화한다:

```typescript
// 일괄 평가 오케스트레이터 (동시성 제한)
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { collectGitHubData } from "./github-collector";
import { evaluateWithAI, saveEvaluationResult } from "./ai-evaluator";

// 동시성 제한 유틸리티 (기존 withConcurrencyLimit 함수 유지)
async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  // ... 기존 구현 그대로 유지 ...
}

// 단건 평가 (수집 → AI 평가 → DB 저장)
export async function evaluateSingle(submissionId: string, model?: string): Promise<void> {
  const submission = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .then((r) => r[0]);

  if (!submission) {
    throw new Error(`제출을 찾을 수 없습니다: ${submissionId}`);
  }

  const now = new Date().toISOString();

  try {
    // 수집 단계
    await db
      .update(submissions)
      .set({ status: "collecting", updatedAt: now })
      .where(eq(submissions.id, submissionId));

    const collectedData = await collectGitHubData(submission.repoUrl);

    await db
      .update(submissions)
      .set({
        collectedData: JSON.stringify(collectedData),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(submissions.id, submissionId));

    // AI 평가 단계
    await db
      .update(submissions)
      .set({ status: "evaluating", updatedAt: new Date().toISOString() })
      .where(eq(submissions.id, submissionId));

    const jobRole = (submission.jobRole ?? "개발") as import("@/types").JobRole;
    const result = await evaluateWithAI(collectedData, false, jobRole, model);

    await saveEvaluationResult(submissionId, result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[평가 오류] ${submissionId}: ${message}`);

    await db
      .update(submissions)
      .set({
        status: "error",
        errorMessage: message,
        adminNote: `평가 오류: ${message}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(submissions.id, submissionId));

    throw error;
  }
}

// 세션 전체 일괄 평가 실행 (done 제외) — 기존 runEvaluation 그대로 유지
export async function runEvaluation(sessionId: string, model?: string): Promise<void> {
  // ... 기존 구현 그대로 유지 (변경 없음) ...
}
```

### Step 5: `src/lib/ai-evaluator.ts` 정리

`buildSystemPrompt`의 JSON 출력 포맷에서 `bonus_score`, `has_deploy_url`, `bonus` 필드를 제거한다. `evaluateWithAI` 함수 시그니처에서 `hasDeployUrl` 파라미터는 유지하되 사용하지 않거나 제거한다. `EvaluationResult` 타입도 변경에 맞게 업데이트한다.

출력 JSON 포맷 변경 (buildSystemPrompt 내부):

```
{
  "total_score": <number>,
  "base_score": <number>,
  "categories": [ ... ],
  "summary": "<3-5문장의 종합 평가 의견>"
}
```

주의사항 텍스트도 `bonus_score` 관련 내용 제거:

```
주의사항:
- total_score = base_score = 모든 categories의 score 합산 (최대 ${totalMax})
- 각 category의 score = 해당 sub_items의 score 합산
- ...
```

`saveEvaluationResult` 함수에서 `bonusScore` 저장 코드도 제거 — `totalScore`와 `baseScore`만 저장한다.

### Step 6: `src/components/check/score-result.tsx` 정리

`bonusScore` prop 제거, 보너스 섹션 UI 제거, 총점 표시 단순화:

```typescript
interface ScoreResultProps {
  scores: Score[];
  totalScore: number;
  baseScore: number;
  // bonusScore 제거
  criteriaConfig: CriteriaConfig;
}

// 총점 표시:
<p className="text-sm text-zinc-400 mt-2">기본 점수 {baseScore}점</p>

// 보너스 섹션(criteriaConfig.bonus?.map) 전체 블록 삭제
```

### Step 7: `src/components/check/submission-detail.tsx` 정리

`bonusScore` 참조 제거. 파일을 읽어 실제 참조 위치를 확인한 후 해당 prop 전달 코드 삭제.

### Step 8: `src/components/admin/RankingTable.tsx` 정리

파일을 읽어 보너스 토글 UI 및 `bonusScore` 관련 컬럼/로직을 제거한다. `totalScore`만 표시하도록 단순화.

### Step 9: `src/components/admin/ProjectReport.tsx` 정리

- `bonusScore`, `bonusReasoning` prop 제거
- `screenshots` prop 및 이미지 표시 섹션 제거
- `ScreenshotResult` import 제거
- `ProjectReportData` 인터페이스에서 해당 필드 제거

### Step 10: `src/app/admin/session/[sessionId]/results/page.tsx` 정리

파일을 읽어 보너스 포함/미포함 토글 UI 및 관련 상태 코드를 제거한다.

### Step 11: `src/app/admin/session/[sessionId]/results/[submissionId]/page.tsx` 정리

파일을 읽어 `screenshots` 데이터 조회 및 `ProjectReport`로의 prop 전달 코드를 제거한다.

### Step 12: `src/app/api/sessions/[id]/evaluate/reset/route.ts` 정리

`bonusScore: null` 리셋 코드를 제거한다. 파일을 읽어 해당 줄만 삭제.

### Step 13: `src/app/api/sessions/[id]/export/csv/route.ts` 정리

CSV 헤더 및 행에서 `보너스점수` 컬럼 및 `bonusScore` 참조를 제거한다.

### Step 14: criteria-panel에 안내 문구 추가

보너스 점수 제거에 대한 참가자 안내 문구를 `src/components/check/score-result.tsx`의 총점 카드 하단에 추가한다:

```tsx
<p className="text-xs text-zinc-500 mt-1">
  예선통과자는 배포URL로 추가평가를 받게됩니다.
</p>
```

### Step 15: 빌드 확인 및 보너스 키워드 Grep

```bash
npm run build
```

빌드 성공 후 보너스 키워드 잔존 여부 확인:

```bash
# 아래 명령의 결과가 0건이어야 한다 (schema.ts, seed.ts, sprint 문서 제외)
grep -r "bonus" src --include="*.ts" --include="*.tsx" \
  --exclude="src/db/schema.ts" --exclude="src/db/seed.ts"
```

기대 결과: 0건 (schema.ts, seed.ts의 DB 컬럼 정의 외 참조 없음).

### Step 16: 커밋

```bash
git add -A
git commit -m "feat: 보너스 점수 체계 전면 제거 (vision-evaluator, screenshot-capturer 삭제)"
```

---

## T9-4: 이메일 발송 모듈

**파일:**
- 신규: `src/lib/email-sender.ts`

**구현 목표:** Resend SDK를 사용하여 평가 결과를 HTML 이메일로 발송하는 모듈을 구현한다.

### Step 1: Resend 설치

```bash
npm install resend
```

### Step 2: `src/lib/email-sender.ts` 신규 생성

```typescript
// 이메일 발송 모듈 (Resend SDK)
import { Resend } from "resend";
import type { CategoryResult } from "@/types/evaluation";
import type { JobRole } from "@/types";

const resend = new Resend(process.env.RESEND_API_KEY);

// 발신자 주소 — 환경변수 우선, 없으면 기본값 사용
const EMAIL_FROM = process.env.EMAIL_FROM ?? "최지선 <frogy95@ubcare.co.kr>";

export interface EvaluationEmailData {
  to: string;            // 수신자 이메일
  name: string;          // 참가자 이름
  jobRole: JobRole;
  totalScore: number;
  baseScore: number;
  categories: CategoryResult[];
  summary: string;
  sessionName: string;
}

function buildHtmlBody(data: EvaluationEmailData): string {
  const categoryRows = data.categories
    .map(
      (cat) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7;">${cat.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: bold;">
          ${cat.score} / ${cat.max_score}
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #18181b; padding: 32px 40px;">
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">해커톤 평가 결과</h1>
      <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 14px;">${data.sessionName}</p>
    </div>
    <div style="padding: 32px 40px;">
      <p style="margin: 0 0 24px; color: #3f3f46; font-size: 16px;">
        안녕하세요, <strong>${data.name}</strong>님 (${data.jobRole}).<br />
        해커톤 AI 평가가 완료되었습니다.
      </p>

      <div style="background: #18181b; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 13px;">최종 점수</p>
        <p style="margin: 0; color: #ffffff; font-size: 48px; font-weight: 800; line-height: 1;">${data.totalScore}</p>
        <p style="margin: 8px 0 0; color: #71717a; font-size: 13px;">기본 점수 ${data.baseScore}점</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr>
            <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #71717a; border-bottom: 2px solid #e4e4e7;">평가 항목</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 13px; color: #71717a; border-bottom: 2px solid #e4e4e7;">점수</th>
          </tr>
        </thead>
        <tbody>${categoryRows}</tbody>
      </table>

      <div style="background: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #3f3f46;">종합 평가</p>
        <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.6;">${data.summary}</p>
      </div>

      <p style="margin: 0; font-size: 13px; color: #a1a1aa; text-align: center;">
        예선통과자는 배포 URL로 추가평가를 받게됩니다.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendEvaluationResultEmail(data: EvaluationEmailData): Promise<void> {
  const html = buildHtmlBody(data);

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: `[${data.sessionName}] 평가 결과 — ${data.totalScore}점`,
    html,
  });

  if (error) {
    throw new Error(`이메일 발송 실패: ${error.message}`);
  }

  console.log(`[이메일] 발송 완료: ${data.to} (${data.totalScore}점)`);
}
```

### Step 3: 빌드 확인

```bash
npm run build
```

### Step 4: 커밋

```bash
git add src/lib/email-sender.ts package.json package-lock.json
git commit -m "feat: Resend 기반 이메일 발송 모듈 구현"
```

---

## T9-5: 자동 평가 + 이메일 파이프라인

**파일:**
- 수정: `src/lib/evaluation-runner.ts`
- 수정: `src/app/api/sessions/[id]/submissions/route.ts`

**구현 목표:** 단건 평가 완료 후 자동으로 결과 이메일을 발송하는 `evaluateAndNotify` 함수를 구현하고, 제출 API의 POST 핸들러에서 `waitUntil`로 호출한다.

### Step 1: `evaluateAndNotify` 함수를 `evaluation-runner.ts`에 추가

기존 `evaluateSingle` 함수 다음에 추가:

```typescript
// 단건 평가 후 이메일 자동 발송
export async function evaluateAndNotify(
  submissionId: string,
  sessionName: string,
  model?: string
): Promise<void> {
  // 평가 실행
  await evaluateSingle(submissionId, model);

  // 평가 완료 후 최신 데이터 조회
  const submission = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .then((r) => r[0]);

  if (!submission || submission.status !== "done") {
    console.log(`[이메일 스킵] ${submissionId}: 평가 완료 상태 아님 (${submission?.status})`);
    return;
  }

  // 점수 데이터 조회
  const { scores } = await import("@/db/schema");
  const scoreRows = await db
    .select()
    .from(scores)
    .where(eq(scores.submissionId, submissionId));

  // categories 재구성 (scores 테이블 → CategoryResult 형태)
  // scores 테이블에는 최상위 기준별 합산이 저장됨
  const categories = scoreRows.map((s) => ({
    key: s.criteriaKey,
    name: s.criteriaKey,
    score: s.score,
    max_score: s.maxScore,
    sub_items: [],
  }));

  // summary는 collectedData에서 읽거나 생략 (없으면 빈 문자열)
  const collectedDataRaw = submission.collectedData;
  let summary = "";
  if (collectedDataRaw) {
    try {
      const parsed = JSON.parse(collectedDataRaw);
      summary = parsed.summary ?? "";
    } catch {
      // 무시
    }
  }

  const { sendEvaluationResultEmail } = await import("./email-sender");

  await sendEvaluationResultEmail({
    to: submission.email,
    name: submission.name,
    jobRole: (submission.jobRole ?? "개발") as import("@/types").JobRole,
    totalScore: submission.totalScore ?? 0,
    baseScore: submission.baseScore ?? 0,
    categories,
    summary,
    sessionName,
  });
}
```

**주의:** `summary`는 `ai-evaluator.ts`의 `saveEvaluationResult`가 `collectedData`가 아닌 별도 컬럼에 저장하지 않는다. 정확한 저장 위치를 `ai-evaluator.ts`에서 확인 후, 실제 summary를 가져오는 방법으로 조정한다. summary를 별도 컬럼에 저장하지 않는 경우 빈 문자열("") 또는 "평가가 완료되었습니다."로 대체한다.

### Step 2: 제출 API에서 waitUntil로 평가 파이프라인 호출

`src/app/api/sessions/[id]/submissions/route.ts`의 POST 핸들러 상단에 import 추가:

```typescript
import { waitUntil } from "@vercel/functions";
import { evaluateAndNotify } from "@/lib/evaluation-runner";
```

신규 제출 생성 후, `return apiSuccess(created, 201)` 직전에 삽입:

```typescript
// 비동기 백그라운드: 자동 평가 + 이메일 발송
waitUntil(
  evaluateAndNotify(id, session.name).catch((err) => {
    console.error(`[자동 평가 오류] 제출 ${id}:`, err);
  })
);

return apiSuccess(created, 201);
```

### Step 3: 빌드 확인

```bash
npm run build
```

### Step 4: 커밋

```bash
git add src/lib/evaluation-runner.ts src/app/api/sessions/[id]/submissions/route.ts
git commit -m "feat: 제출 후 자동 평가 + 이메일 발송 파이프라인 구현"
```

---

## T9-6: 제출 완료 UI 안내 문구

**파일:**
- 수정: `src/components/submit/submission-success.tsx`

**구현 목표:** 제출 완료 화면에 자동 심사 및 이메일 안내 문구를 추가한다.

### Step 1: 안내 문구 추가

`submission-success.tsx`의 `<h2>제출이 완료되었습니다!</h2>` 아래에 안내 문구를 추가한다:

```tsx
<p className="text-zinc-500 text-sm">
  제출 시각: ...
</p>
<p className="text-sm text-blue-600 font-medium mt-1">
  자동심사 후, 이메일로 평가내용을 받게됩니다.
</p>
```

정확한 위치: `<p className="text-zinc-500 text-sm">` 제출 시각 표시 태그 다음 줄.

### Step 2: 빌드 확인

```bash
npm run build
```

### Step 3: 커밋

```bash
git add src/components/submit/submission-success.tsx
git commit -m "feat: 제출 완료 화면에 자동심사 이메일 안내 문구 추가"
```

---

## T9-7: 환경 변수 / 배포 설정

**파일:**
- 수정: `.env.example`
- 수정: `vercel.json`

**구현 목표:** Resend 관련 환경변수를 문서화하고, 제출 API에 maxDuration을 설정한다.

### Step 1: `.env.example`에 Resend 변수 추가

기존 내용 끝에 추가:

```bash
# 이메일 발송 (Resend)
# https://resend.com 에서 API 키 발급
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# 발신자 이메일 주소 (Resend에서 인증된 도메인 필요)
EMAIL_FROM=최지선 <frogy95@ubcare.co.kr>
```

### Step 2: `vercel.json`에 submissions route maxDuration 추가

```json
{
  "functions": {
    "src/app/api/sessions/[id]/evaluate/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/sessions/[id]/submissions/route.ts": {
      "maxDuration": 300
    }
  }
}
```

### Step 3: 빌드 확인

```bash
npm run build
```

### Step 4: 커밋

```bash
git add .env.example vercel.json
git commit -m "chore: Resend 환경변수 및 submissions route maxDuration 설정"
```

---

## 최종 검증 기준 (Definition of Done)

- ✅ `npm run build` 에러 없이 성공
- ✅ `bonus` 키워드 Grep — `src/db/schema.ts`, `src/db/seed.ts` 외 0건
- ✅ `screenshot-capturer`, `vision-evaluator` import 0건
- ✅ 이메일 도메인 검증: `@ubcare.co.kr` 외 이메일 → zod 에러 반환
- ✅ 중복 제출: 동일 이메일 2번째 제출 → 409 Conflict 반환
- ✅ `src/lib/email-sender.ts` 존재, `sendEvaluationResultEmail` 함수 export
- ✅ `evaluateAndNotify` 함수 `evaluation-runner.ts`에 export
- ✅ 제출 API POST에서 `waitUntil(evaluateAndNotify(...))` 호출
- ✅ `vercel.json`에 submissions route maxDuration 300 설정
- ✅ `.env.example`에 RESEND_API_KEY, EMAIL_FROM 항목 존재

## 구현 완료 (2026-03-11)

Sprint 9 구현이 완료되었습니다. 검증 보고서: [deploy.md 체크리스트](../deploy.md)

---

## 예상 산출물

| 파일 | 변경 유형 |
|------|-----------|
| `src/lib/validations.ts` | 수정 — 이메일 도메인 제한 추가 |
| `src/app/api/sessions/[id]/submissions/route.ts` | 수정 — 중복 거부 + waitUntil 평가 파이프라인 |
| `src/lib/vision-evaluator.ts` | 삭제 |
| `src/lib/screenshot-capturer.ts` | 삭제 |
| `src/types/evaluation.ts` | 수정 — 보너스 타입 제거 |
| `src/types/index.ts` | 수정 — bonusScore, CriteriaConfig.bonus 제거 |
| `src/lib/evaluation-runner.ts` | 수정 — 보너스 단계 제거 + evaluateAndNotify 추가 |
| `src/lib/ai-evaluator.ts` | 수정 — 출력 포맷에서 bonus 필드 제거 |
| `src/components/check/score-result.tsx` | 수정 — bonusScore prop/UI 제거 + 안내 문구 |
| `src/components/check/submission-detail.tsx` | 수정 — bonusScore 참조 제거 |
| `src/components/admin/RankingTable.tsx` | 수정 — 보너스 토글 제거 |
| `src/components/admin/ProjectReport.tsx` | 수정 — bonusScore/screenshots 제거 |
| `src/app/admin/session/[sessionId]/results/page.tsx` | 수정 — 보너스 토글 UI 제거 |
| `src/app/admin/session/[sessionId]/results/[submissionId]/page.tsx` | 수정 — screenshots prop 제거 |
| `src/app/api/sessions/[id]/evaluate/reset/route.ts` | 수정 — bonusScore 리셋 제거 |
| `src/app/api/sessions/[id]/export/csv/route.ts` | 수정 — 보너스 CSV 컬럼 제거 |
| `src/lib/email-sender.ts` | 신규 — Resend 이메일 발송 모듈 |
| `src/components/submit/submission-success.tsx` | 수정 — 자동심사 안내 문구 추가 |
| `.env.example` | 수정 — RESEND_API_KEY, EMAIL_FROM 추가 |
| `vercel.json` | 수정 — submissions maxDuration 300 추가 |

---

## 의존성 및 리스크

| 항목 | 리스크 | 대응 |
|------|--------|------|
| Resend 도메인 인증 | `ubcare.co.kr` 도메인이 Resend에 인증되지 않으면 발송 실패 | `.env.example`에 인증 절차 안내, 로컬 테스트는 RESEND_API_KEY 없이 skip 처리 |
| summary 저장 위치 | `ai-evaluator.ts`가 summary를 별도 컬럼에 저장하지 않음 | T9-5 구현 시 실제 저장 방식 확인 후 빈 문자열로 대체 또는 별도 컬럼 추가 |
| 보너스 필드 제거 후 기존 데이터 | DB의 bonusScore 컬럼은 유지하므로 기존 데이터는 영향 없음 | schema.ts 수정 없음으로 호환성 유지 |
| waitUntil Vercel 제한 | submissions route maxDuration 300초로 설정 | vercel.json 업데이트로 대응 |

---

## 수동 검증 항목 (deploy.md 기록 필요)

- ⬜ Resend 대시보드에서 `ubcare.co.kr` 도메인 인증 완료
- ⬜ Vercel 환경변수에 RESEND_API_KEY, EMAIL_FROM 설정
- ⬜ 실제 `@ubcare.co.kr` 이메일로 제출 → 이메일 수신 확인
- ⬜ 비 ubcare 이메일로 제출 시 에러 메시지 확인
- ⬜ 동일 이메일 중복 제출 시 409 에러 메시지 확인
