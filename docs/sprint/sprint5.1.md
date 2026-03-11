# Sprint 5.1: 평가 엔진 보완 및 UX 개선

- **기간**: 2026-03-10 (1일 스프린트)
- **브랜치**: `sprint5` (sprint5 브랜치에서 계속 작업)
- **Phase**: Phase 3 — AI 평가 엔진 보완
- **상태**: ✅ 완료 (2026-03-10)

---

## 목표

Sprint 5 코드 리뷰에서 식별된 Important 이슈 4건을 해소하고, 평가 모델 선택 기능 및 평가 근거 마크다운 렌더링을 추가하여 평가 엔진의 안정성과 운용 편의성을 높인다.

> **Sprint 6과의 관계**: Sprint 5.1은 Sprint 5 브랜치(sprint5)에서 이어서 진행하며, Sprint 6(결과 대시보드 실데이터 연결) 착수 전에 완료한다.

---

## 배경 — Sprint 5 코드 리뷰 식별 이슈

| ID | 위치 | 내용 | 영향도 |
|----|------|------|--------|
| I-1 | `github-collector.ts:169` | `Promise.all`로 3개 배치 동시 실행 → 순간 최대 9개 GitHub API 요청 | 높음 |
| I-2 | `evaluation-runner.ts:10-14` | `progressMap`, `getProgress` 사용되지 않는 Dead Code | 낮음 |
| I-3 | `evaluate/route.ts:34` | 평가 실행 시 `done` 건까지 전체 재평가 → 의도치 않은 재평가 발생 | 높음 |
| I-4 | `re-evaluate/route.ts` | 동기 실행으로 API 타임아웃(60초) 위험 | 높음 |

---

## 신규/수정 파일 구조

```
src/
  lib/
    github-collector.ts         수정: Promise.all → 순차 배치 실행 (I-1)
    evaluation-runner.ts        수정: progressMap/getProgress 제거 (I-2), done 제외 필터 (I-3)
    ai-evaluator.ts             수정: model 파라미터 추가
  app/
    api/
      sessions/[id]/
        evaluate/
          route.ts              수정: done 제외 필터 반영 (I-3)
        evaluate/reset/
          route.ts              신규: POST 평가 리셋 API
        submissions/[subId]/
          re-evaluate/
            route.ts            삭제: 재평가 API 제거 (I-4 해소)
  components/
    admin/
      EvaluateButton.tsx        수정: 재평가 UI 제거, 모델 선택 UI 추가
      SubmissionRow.tsx         수정: 재평가 버튼 제거, 리셋 버튼 연결
      SubmissionTable.tsx       수정: reEvaluate 핸들러 제거, 리셋 핸들러 추가
      ProjectReport.tsx         수정: reasoning 마크다운 렌더링
```

---

## 작업 목록

### T5.1-1. GitHub API 배치 순차 실행 (I-1 해소)

**목표**: `github-collector.ts`의 `Promise.all` 3배치 동시 실행을 순차 실행으로 변경하여 순간 최대 GitHub API 요청 수를 3개로 제한한다.

**수정 파일**: `src/lib/github-collector.ts`

#### 현재 코드 (L169-173)

```ts
const [documents, configContents, sourceContents] = await Promise.all([
  fetchBatch(docFiles),
  fetchBatch(configFilePaths),
  fetchBatch(sourceFiles),
]);
```

#### 변경 내용

```ts
// 순차 실행: 문서 → 설정 → 소스 순서로 처리
const documents = await fetchBatch(docFiles);
const configContents = await fetchBatch(configFilePaths);
const sourceContents = await fetchBatch(sourceFiles);
```

**완료 기준:**
- ⬜ `Promise.all` 제거, 세 배치가 순차 실행됨
- ⬜ `npm run build` 성공

---

### T5.1-2. Dead Code 제거 (I-2 해소)

**목표**: `evaluation-runner.ts`에서 프론트엔드가 사용하지 않는 `progressMap` 인메모리 Map과 `getProgress` export 함수를 제거한다.

**수정 파일**: `src/lib/evaluation-runner.ts`

#### 제거 대상

- L1 주석 (`인메모리 진행률 맵...`) 포함 L8-14: `progressMap` 선언 및 `getProgress` 함수 전체
- `runEvaluation` 내부 `progressMap` 참조 (L131, L137-138, L140-141, L149-150)

#### 변경 후 `runEvaluation` 구조

```ts
export async function runEvaluation(sessionId: string): Promise<void> {
  const pendingSubmissions = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.sessionId, sessionId),
        eq(submissions.excluded, false),
        // T5.1-3에서 done 제외 필터 추가 예정
      )
    );

  const targets = pendingSubmissions;

  if (targets.length === 0) {
    console.log(`[평가] 세션 ${sessionId}: 평가할 제출이 없습니다.`);
    return;
  }

  console.log(`[평가] 세션 ${sessionId}: ${targets.length}건 평가 시작`);

  const tasks = targets.map((sub) => async () => {
    await evaluateSingle(sub.id);
  });

  await withConcurrencyLimit(tasks, 3);

  console.log(`[평가] 세션 ${sessionId} 완료`);
}
```

**완료 기준:**
- ⬜ `progressMap`, `getProgress` 코드 제거
- ⬜ `runEvaluation` 내부 `progressMap` 참조 없음
- ⬜ `npm run build` 성공

---

### T5.1-3. 재평가 제거 + done 제외 필터 (I-3 해소)

**목표**:
1. `evaluate/route.ts`에서 `done` 상태 제출을 평가 대상에서 제외한다.
2. `re-evaluate` API와 관련 UI(SubmissionRow 재평가 버튼, SubmissionTable `reEvaluate` 핸들러)를 제거한다.

재평가가 필요한 경우 T5.1-4에서 구현하는 "평가 리셋 → 평가 실행" 흐름으로 대체한다.

#### 수정: `src/app/api/sessions/[id]/evaluate/route.ts`

```ts
// 변경 전 (L33-34):
// 평가 대상: 비제외 전체 (done 포함)
const targets = allSubs;

// 변경 후:
// 평가 대상: 비제외 + done이 아닌 건만
const targets = allSubs.filter((s) => s.status !== "done");
```

상태 리셋 코드(L44-51, `inArray`로 `submitted` 리셋)는 `done` 제외 후 남은 targets에만 적용되므로 그대로 유지한다.

#### 삭제: `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts`

파일 전체 삭제.

#### 수정: `src/components/admin/SubmissionRow.tsx`

- `onReEvaluate` prop 및 관련 state (`reEvalLoading`, `handleReEvaluate`) 제거
- `canReEvaluate` 계산 제거
- 재평가 버튼 JSX 제거

변경 후 `SubmissionRowProps`:

```ts
interface SubmissionRowProps {
  submission: SubmissionRowData;
  onToggleExclude: (id: string) => Promise<void>;
  onUpdateNote: (id: string, note: string) => Promise<void>;
  // onReEvaluate 제거
}
```

#### 수정: `src/components/admin/SubmissionTable.tsx`

- `reEvaluate` 핸들러 함수 제거 (L109-126)
- `SubmissionRow`에 `onReEvaluate` prop 전달 제거

**완료 기준:**
- ⬜ 평가 실행 시 `status === "done"` 제출은 처리 대상에서 제외됨
- ⬜ `re-evaluate/route.ts` 파일 삭제됨
- ⬜ `SubmissionRow`, `SubmissionTable`에 재평가 관련 코드 없음
- ⬜ `npm run build` 성공

---

### T5.1-4. 평가 리셋 API + UI

**목표**: 관리자가 평가 완료(`done`)된 세션 또는 오류(`error`) 제출을 초기 상태(`submitted`)로 리셋하여 재평가를 실행할 수 있는 API와 UI를 추가한다.

리셋 범위: 세션 전체 비제외 제출의 `status`, `totalScore`, `baseScore`, `bonusScore`를 초기화하고 `scores` 테이블에서 해당 행을 삭제한다.

#### 신규: `src/app/api/sessions/[id]/evaluate/reset/route.ts`

```ts
// POST /api/sessions/[id]/evaluate/reset — 평가 결과 전체 리셋
import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions, scores } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, withAdminAuth } from "@/lib/api-utils";

interface Context {
  params: Promise<{ id: string }>;
}

export const POST = withAdminAuth(async (request: NextRequest, context: unknown) => {
  const { id } = await (context as Context).params;

  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, id))
    .then((r) => r[0]);

  if (!session) {
    return apiError(ErrorCode.NOT_FOUND.code, "세션을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  // 비제외 제출 목록 조회
  const targetSubs = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.sessionId, id), eq(submissions.excluded, false)));

  if (targetSubs.length === 0) {
    return apiError("NO_SUBMISSIONS", "리셋할 제출이 없습니다.", 400);
  }

  const targetIds = targetSubs.map((s) => s.id);

  // scores 삭제 (해당 세션 제출 전체)
  // Drizzle inArray가 필요하므로 순회 삭제 또는 inArray 사용
  for (const subId of targetIds) {
    await db.delete(scores).where(eq(scores.submissionId, subId));
  }

  // submissions 상태 및 점수 초기화
  const now = new Date().toISOString();
  for (const subId of targetIds) {
    await db
      .update(submissions)
      .set({
        status: "submitted",
        totalScore: null,
        baseScore: null,
        bonusScore: null,
        updatedAt: now,
      })
      .where(eq(submissions.id, subId));
  }

  return apiSuccess({ message: "평가 결과가 리셋되었습니다.", count: targetIds.length });
});
```

> **주의**: `submissions` 스키마의 `totalScore`, `baseScore`, `bonusScore` 컬럼이 nullable인지 확인 필요. 만약 NOT NULL이면 `0`으로 리셋한다 (스키마 확인 후 조정).

#### 수정: `src/components/admin/EvaluateButton.tsx`

리셋 버튼을 진행 중 아닌 `idle` 상태에서 표시한다. 리셋 후 페이지를 새로고침하여 제출 목록 상태를 반영한다.

추가할 내용:

```tsx
// props에 추가
interface EvaluateButtonProps {
  sessionId: string;
  submissionCount: number;
  doneCount?: number;
  // 신규
  hasEvaluated?: boolean;  // doneCount > 0이면 true
}

// 리셋 핸들러 추가
const handleReset = async () => {
  if (!confirm("평가 결과를 전체 리셋하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

  try {
    const res = await fetch(`/api/sessions/${sessionId}/evaluate/reset`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error?.message ?? "리셋 실패");
      return;
    }

    toast.success(`평가 결과가 리셋되었습니다. (${json.data.count}건)`);
    // 페이지 새로고침으로 제출 목록 갱신
    window.location.reload();
  } catch {
    toast.error("리셋 요청 중 오류가 발생했습니다.");
  }
};
```

리셋 버튼 JSX (평가 버튼 아래에 배치):

```tsx
{doneCount > 0 && state !== "running" && (
  <Button
    size="sm"
    variant="ghost"
    className="text-xs text-zinc-400 hover:text-red-600"
    onClick={handleReset}
  >
    평가 리셋
  </Button>
)}
```

**완료 기준:**
- ⬜ `POST /api/sessions/[id]/evaluate/reset` 호출 시 scores 삭제 + submissions 상태/점수 초기화
- ⬜ 리셋 후 해당 세션 제출의 `status`가 모두 `submitted`로 변경됨
- ⬜ 프론트엔드 리셋 버튼은 `doneCount > 0`일 때만 표시
- ⬜ 리셋 확인 다이얼로그 표시
- ⬜ `npm run build` 성공

---

### T5.1-5. AI 평가 모델 선택 파라미터 + EvaluateButton 모델 선택 UI

**목표**: 관리자가 평가 실행 전 AI 모델을 선택할 수 있도록 `haiku`(빠름/저비용) 또는 `sonnet`(정확/고비용) 옵션을 제공한다.

#### 수정: `src/lib/ai-evaluator.ts`

`evaluateWithAI` 함수 시그니처에 `model` 파라미터 추가:

```ts
// 변경 전
export async function evaluateWithAI(
  collectedData: CollectedData,
  hasDeployUrl: boolean
): Promise<EvaluationResult>

// 변경 후
export type EvaluationModel = "claude-haiku-4-5" | "claude-sonnet-4-6";

export async function evaluateWithAI(
  collectedData: CollectedData,
  hasDeployUrl: boolean,
  model: EvaluationModel = "claude-haiku-4-5"
): Promise<EvaluationResult>
```

내부 Anthropic 호출에서 `model` 변수 사용:

```ts
const message = await anthropic.messages.create({
  model,           // "claude-haiku-4-5" 또는 "claude-sonnet-4-6"
  max_tokens: 4096,
  temperature: 0,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: userPrompt }],
});
```

#### 수정: `src/lib/evaluation-runner.ts`

`evaluateSingle` 함수 및 `runEvaluation` 함수에 `model` 파라미터 전달:

```ts
export async function evaluateSingle(
  submissionId: string,
  model: EvaluationModel = "claude-haiku-4-5"
): Promise<void>

export async function runEvaluation(
  sessionId: string,
  model: EvaluationModel = "claude-haiku-4-5"
): Promise<void>
```

#### 수정: `src/app/api/sessions/[id]/evaluate/route.ts`

요청 body에서 `model` 파라미터 수신:

```ts
// 요청 body 파싱
const body = await request.json().catch(() => ({}));
const model: EvaluationModel = body.model === "claude-sonnet-4-6"
  ? "claude-sonnet-4-6"
  : "claude-haiku-4-5";  // 기본값: haiku

// runEvaluation에 전달
runEvaluation(id, model).catch((err) => {
  console.error(`[평가 오류] 세션 ${id}:`, err);
});
```

#### 수정: `src/components/admin/EvaluateButton.tsx`

모델 선택 UI (`<select>` 또는 라디오 버튼):

```tsx
import { useState, ... } from "react";

// state 추가
const [selectedModel, setSelectedModel] = useState<"claude-haiku-4-5" | "claude-sonnet-4-6">("claude-haiku-4-5");

// POST body에 model 포함
const res = await fetch(`/api/sessions/${sessionId}/evaluate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ model: selectedModel }),
});

// 모델 선택 UI (버튼 위에 배치)
{state !== "running" && (
  <div className="flex items-center gap-2 text-xs text-zinc-500">
    <span>모델:</span>
    <label className="flex items-center gap-1 cursor-pointer">
      <input
        type="radio"
        name="model"
        value="claude-haiku-4-5"
        checked={selectedModel === "claude-haiku-4-5"}
        onChange={() => setSelectedModel("claude-haiku-4-5")}
        className="w-3 h-3"
      />
      Haiku (빠름)
    </label>
    <label className="flex items-center gap-1 cursor-pointer">
      <input
        type="radio"
        name="model"
        value="claude-sonnet-4-6"
        checked={selectedModel === "claude-sonnet-4-6"}
        onChange={() => setSelectedModel("claude-sonnet-4-6")}
        className="w-3 h-3"
      />
      Sonnet (정확)
    </label>
  </div>
)}
```

**완료 기준:**
- ⬜ `evaluateWithAI`, `evaluateSingle`, `runEvaluation`에 `model` 파라미터 추가
- ⬜ `POST /api/sessions/[id]/evaluate` body에 `{ "model": "claude-haiku-4-5" }` 전달 시 해당 모델로 평가
- ⬜ `EvaluateButton`에 모델 선택 라디오 UI 표시
- ⬜ 기본값 `claude-haiku-4-5`, 실행 중에는 모델 선택 비활성화
- ⬜ `npm run build` 성공

---

### T5.1-6. ProjectReport reasoning 마크다운 렌더링

**목표**: `ProjectReport.tsx`에서 AI가 생성한 `reasoning` 텍스트를 일반 `<p>` 대신 마크다운으로 렌더링하여 굵게, 목록, 링크 등 형식이 정상 표시되도록 한다.

#### 패키지 설치

`react-markdown`은 ESM 전용이므로 Next.js 환경에서 호환성 설정이 필요하다. 대안으로 `marked` + `DOMPurify` 조합 또는 `next-mdx-remote`를 사용할 수 있으나, 코드량 최소화를 위해 `react-markdown`을 사용하고 `next.config.ts`에서 트랜스파일 설정을 추가한다.

```bash
npm install react-markdown
```

`next.config.ts`에 다음 추가 (이미 있으면 배열에 추가):

```ts
const nextConfig = {
  transpilePackages: ["react-markdown"],
  // ... 기존 설정
};
```

> **대안**: `react-markdown` 설치 없이 간단한 커스텀 렌더러를 구현할 수도 있다. `**텍스트**` → `<strong>`, `\n` → `<br>` 수준으로만 처리한다면 별도 패키지 없이 정규표현식으로 해결 가능하다. 빌드 오류 시 이 방식으로 전환한다.

#### 수정: `src/components/admin/ProjectReport.tsx`

```tsx
import ReactMarkdown from "react-markdown";

// 변경 전 (reasoning 렌더링 부분):
<p className="text-sm text-zinc-700 leading-relaxed">{text}</p>

// 변경 후:
<div className="text-sm text-zinc-700 leading-relaxed prose prose-sm max-w-none">
  <ReactMarkdown>{text}</ReactMarkdown>
</div>
```

Tailwind `prose` 클래스를 사용하려면 `@tailwindcss/typography` 플러그인이 필요하다. 미설치 시 `prose` 클래스 대신 기본 스타일을 적용한다:

```tsx
<div className="text-sm text-zinc-700 leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mt-0.5">
  <ReactMarkdown>{text}</ReactMarkdown>
</div>
```

**완료 기준:**
- ⬜ `react-markdown` 설치 완료
- ⬜ `ProjectReport.tsx` reasoning 영역에 `ReactMarkdown` 적용
- ⬜ AI가 생성한 `**굵게**` 텍스트가 `<strong>`으로 렌더링됨
- ⬜ `npm run build` 성공
- ⬜ 빌드 오류 발생 시 커스텀 인라인 렌더러로 대체

---

## 의존성 및 리스크

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| `submissions` 테이블 `totalScore` 등 NOT NULL 제약 | 중간 | `src/db/schema.ts` 확인 후 null 불가 시 `0`으로 리셋 |
| `react-markdown` ESM 전용 빌드 오류 | 중간 | `next.config.ts` transpilePackages 설정 또는 커스텀 렌더러로 대체 |
| `evaluate/reset` API 호출 중 다른 평가 실행 시 충돌 | 낮음 | 리셋 확인 다이얼로그로 의도치 않은 호출 방지 |
| `re-evaluate/route.ts` 삭제 후 `SubmissionRow` 참조 제거 누락 | 중간 | `SubmissionRow`, `SubmissionTable` 동시 수정 필수 |

---

## 완료 기준 (Definition of Done)

- ✅ I-1 해소: GitHub API 배치가 순차 실행되며 동시 요청 수가 3개 이하
- ✅ I-2 해소: `progressMap`, `getProgress` Dead Code 제거됨
- ✅ I-3 해소: 평가 실행 시 `done` 상태 제출은 건너뜀
- ✅ I-4 해소: `re-evaluate/route.ts` 삭제, 재평가는 "리셋 → 재실행" 흐름으로 대체
- ✅ 평가 리셋 API(`POST /api/sessions/[id]/evaluate/reset`)가 정상 동작
- ✅ EvaluateButton에 모델 선택 UI(haiku/sonnet)가 표시됨
- ✅ ProjectReport에서 reasoning 텍스트가 마크다운으로 렌더링됨
- ✅ `npm run build` 에러 없이 성공

---

## 진행 현황

| 태스크 | 상태 | 비고 |
|--------|------|------|
| T5.1-1. GitHub API 순차 실행 | ✅ 완료 | `github-collector.ts` L169 수정 |
| T5.1-2. Dead Code 제거 | ✅ 완료 | `evaluation-runner.ts` progressMap 제거 |
| T5.1-3. 재평가 제거 + done 필터 | ✅ 완료 | route.ts, SubmissionRow, SubmissionTable 수정 |
| T5.1-4. 평가 리셋 API + UI | ✅ 완료 | 신규 reset/route.ts + EvaluateButton |
| T5.1-5. 모델 선택 파라미터 + UI | ✅ 완료 | ai-evaluator, evaluation-runner, EvaluateButton |
| T5.1-6. 마크다운 렌더링 | ✅ 완료 | react-markdown 설치 + ProjectReport 수정 |

---

## 기술 고려사항

### DB 스키마 nullable 확인 (T5.1-4)

리셋 API 구현 전 `src/db/schema.ts`에서 `submissions` 테이블의 `totalScore`, `baseScore`, `bonusScore` 컬럼 정의를 확인한다.

- nullable이면: `.set({ ..., totalScore: null, ... })`
- NOT NULL이면: `.set({ ..., totalScore: 0, ... })`

### re-evaluate API 삭제 시 import 오류 방지 (T5.1-3)

`re-evaluate/route.ts`를 삭제하기 전에 해당 경로를 참조하는 코드(SubmissionRow, SubmissionTable)에서 관련 핸들러를 먼저 제거하고 삭제한다. 순서:

1. `SubmissionRow.tsx` — `onReEvaluate` prop 제거
2. `SubmissionTable.tsx` — `reEvaluate` 핸들러 제거
3. `re-evaluate/route.ts` 파일 삭제

### react-markdown 설치 실패 대안 (T5.1-6)

`react-markdown` 또는 `next.config.ts` 설정으로 빌드가 통과하지 않을 경우 아래 커스텀 렌더러를 사용한다:

```tsx
// 간단한 마크다운 인라인 렌더러
function SimpleMarkdown({ children }: { children: string }) {
  // **텍스트** → <strong>, 줄바꿈 → <br>
  const parts = children.split(/(\*\*[^*]+\*\*|\n)/g);
  return (
    <p className="text-sm text-zinc-700 leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part === "\n") return <br key={i} />;
        return part;
      })}
    </p>
  );
}
```

---

## 검증 기준

### 자동 검증 (npm run build)

```bash
npm run build
```

빌드 성공 = TypeScript 타입 오류 없음, 삭제된 파일 참조 없음 확인.

### API 동작 검증 (curl)

```bash
# 로그인 토큰 발급
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/admin \
  -H "Content-Type: application/json" \
  -d '{"password":"admin1234"}' | jq -r '.token')

# 평가 리셋 테스트
curl -s -X POST http://localhost:3000/api/sessions/{SESSION_ID}/evaluate/reset \
  -H "Authorization: Bearer $TOKEN"
# 기대: {"data":{"message":"평가 결과가 리셋되었습니다.","count":N}}

# haiku 모델로 평가 시작
curl -s -X POST http://localhost:3000/api/sessions/{SESSION_ID}/evaluate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-4-5"}'
# 기대: {"data":{"message":"평가를 시작했습니다.","total":N}} (done 건 제외한 수)
```

### 수동 검증 항목

1. 평가 완료 세션에서 "평가 실행" 클릭 → done 건 건너뜀 확인
2. "평가 리셋" 버튼 클릭 → 확인 다이얼로그 → scores 초기화 확인
3. 모델 선택 라디오 UI에서 Sonnet 선택 후 평가 실행
4. 프로젝트 상세 리포트에서 reasoning 마크다운 렌더링 확인

---

## 검증 결과

- [검증 보고서 (자동/수동 항목 분류)](sprint5.1/validation-report.md)
- [코드 리뷰 보고서](sprint5.1/code-review-report.md)

---

---

# Sprint 5.2: 직군별 평가 체계 + 제출 필드 확장

- **기간**: 2026-03-11 (1일 스프린트)
- **브랜치**: `sprint5.1` (sprint5.1 브랜치에서 계속 작업)
- **Phase**: Phase 3 — AI 평가 엔진 직군별 확장
- **상태**: ✅ 완료 (2026-03-11)

## 목표

참가자 직군(PM/기획, 개발, 디자인, QA)에 따라 차별화된 평가 기준을 적용하는 시스템을 구현한다. 제출 시 직군 선택과 조회 비밀번호를 입력하도록 필드를 확장하고, AI 평가 엔진이 직군별 루브릭으로 동적 프롬프트를 생성하도록 개선한다.

## 구현 내용

### DB 스키마 (`src/db/schema.ts`)
- `submissions` 테이블에 `jobRole` (default: "개발"), `checkPassword` (default: "0000") 컬럼 추가
- `npx drizzle-kit push` 완료

### 타입 + 유효성 검증
- `src/types/index.ts`: `JobRole` 타입 추가, `Submission` 인터페이스에 `jobRole`, `checkPassword` 추가
- `src/lib/validations.ts`: `submissionSchema`에 `jobRole`(enum), `checkPassword`(4자리 숫자) 추가; `checkFormSchema`는 name 제거 → email + checkPassword

### 제출 폼 UI
- `src/components/submit/submission-form.tsx`: 직군 선택 드롭다운 및 조회 비밀번호 입력 필드 추가
- `src/components/submit/submission-success.tsx`: jobRole, checkPassword 표시 추가

### 제출 API
- `src/app/api/sessions/[id]/submissions/route.ts` POST: `jobRole`, `checkPassword` 저장 (upsert 포함)

### 조회 페이지 + API
- `src/components/check/check-form.tsx`: 이름 필드 제거 → 이메일 + 조회비밀번호 조회
- `src/app/api/sessions/[id]/submissions/check/route.ts`: 이름 대신 checkPassword 매칭으로 변경

### AI 평가 엔진
- `src/lib/ai-evaluator.ts`: `ROLE_CRITERIA` 상수(직군별 평가 기준 4종), `buildSystemPrompt(jobRole)` 동적 생성, `evaluateWithAI()`에 `jobRole` 파라미터 추가
- `src/lib/evaluation-runner.ts`: `evaluateWithAI` 호출 시 `jobRole` 전달

### 결과 표시
- `src/components/admin/RadarChart.tsx`: `items` 배열 기반 동적 축 지원 (정적 축 제거)
- `src/components/admin/ProjectReport.tsx`: 직군별 기준 라벨(ROLE_CRITERIA_LABELS), jobRole Badge 표시, reasoning 정규화 함수(normalizeReasoning) 추가
- `src/components/admin/SubmissionTable.tsx` / `SubmissionRow.tsx`: "직군" 컬럼 추가

### 시드 데이터
- `src/db/seed.ts`: 10건 모두 `jobRole` (4개 직군 분배) + `checkPassword` 추가

## 완료 기준 (Definition of Done)

- ✅ DB 스키마 `jobRole`, `checkPassword` 컬럼 추가 및 `npx drizzle-kit push` 완료
- ✅ 제출 폼에서 직군 선택 + 조회 비밀번호 입력 가능
- ✅ 조회 페이지에서 이메일 + 조회비밀번호로 제출 조회 동작
- ✅ AI 평가 시 직군별 루브릭 적용 (PM/기획, 개발, 디자인, QA)
- ✅ 결과 리포트에서 직군 Badge 및 직군별 평가 기준 표시
- ✅ `npm run build` 에러 없이 성공

## 검증 결과

- [검증 보고서 (Sprint 5.2)](sprint5.1/playwright-report-5.2.md)
- [코드 리뷰 보고서 (Sprint 5.2)](sprint5.1/code-review-report-5.2.md)

---

## 예상 산출물

Sprint 5.1 완료 시:
- GitHub API 동시 요청이 최대 3개로 제한되어 rate limit 위험 감소
- Dead Code 제거로 코드베이스 정리
- 평가 실행이 미완료 건만 처리하여 의도치 않은 재평가 방지
- 관리자가 전체 리셋 후 재평가 실행 가능
- haiku/sonnet 모델 선택으로 비용/품질 트레이드오프 조절 가능
- 평가 근거 텍스트가 마크다운으로 표시되어 가독성 향상
