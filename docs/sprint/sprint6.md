# Sprint 6 구현 계획: 결과 대시보드 실데이터 연결

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 3 마지막 스프린트 — 결과 대시보드를 실데이터로 연결하고, 순위표 직군별 동적 컬럼, 참가자 결과 조회 개선, 개별 재평가 및 에러 복구 기능을 완성한다.

**Architecture:** DB에 `errorMessage` 컬럼을 추가하여 에러 상세를 저장하고, 재평가 API를 신규 구현한다. 순위표(`RankingTable.tsx`)는 직군별 동적 컬럼으로 교체하고, 참가자 결과 조회(`check` 페이지)는 `criteriaConfig`를 API 응답에 포함시켜 실점수를 표시한다. 관리자 세션 상세 페이지의 "결과 공개" 버튼을 실제 동작하도록 연결한다.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + SQLite, TypeScript, Tailwind CSS + shadcn/ui, Zod

---

## 사전 체크

- `npm run dev` 로컬 실행 확인
- `npx drizzle-kit push` 경로: 프로젝트 루트에서 실행
- 시드 데이터: `npx tsx src/db/seed.ts`
- 관리자 비밀번호: `.env` 파일의 `ADMIN_PASSWORD` 값

---

## Task 1: DB 스키마 — `submissions` 테이블에 `errorMessage` 컬럼 추가

**영향 파일:**
- 수정: `src/db/schema.ts`
- 수정: `src/db/seed.ts` (해당 컬럼 없는 경우 null 처리 확인)

**배경:** Sprint 5.x에서 평가 오류 시 `status = "error"`만 기록하고 사유는 저장하지 않았다. 관리자가 오류 내용을 확인하고 재평가 여부를 판단할 수 있도록 `errorMessage` 컬럼을 추가한다.

**Step 1: `src/db/schema.ts`에 컬럼 추가**

`submissions` 테이블 정의 끝에 아래 컬럼을 추가한다:

```ts
errorMessage: text("error_message"), // 평가 오류 발생 시 사유 저장
```

`checkPassword` 컬럼 다음 줄에 삽입한다.

**Step 2: DB 마이그레이션 적용**

```bash
npx drizzle-kit push
```

예상 출력: `[✓] Changes applied` 또는 `Nothing to migrate (already up to date)` — 둘 다 정상.

**Step 3: 타입 파일 업데이트**

`src/types/index.ts`의 `Submission` 인터페이스에 추가:

```ts
errorMessage: string | null;
```

**Step 4: 커밋**

```bash
git add src/db/schema.ts src/types/index.ts
git commit -m "feat: submissions 테이블에 errorMessage 컬럼 추가"
```

---

## Task 2: 평가 러너 — 에러 발생 시 `errorMessage` 저장

**영향 파일:**
- 수정: `src/lib/evaluation-runner.ts`

**배경:** 현재 evaluation-runner는 오류 시 `status = "error"`로만 업데이트한다. errorMessage 컬럼이 생겼으므로 오류 내용을 함께 저장한다.

**Step 1: `evaluation-runner.ts` 오류 핸들링 구간 찾기**

`status: "error"` 로 업데이트하는 모든 `db.update` 호출을 찾아 `errorMessage` 필드를 추가한다.

```ts
// 변경 전 (예시 패턴)
await db.update(submissions).set({
  status: "error",
  updatedAt: new Date().toISOString(),
}).where(eq(submissions.id, submissionId));

// 변경 후
await db.update(submissions).set({
  status: "error",
  errorMessage: err instanceof Error ? err.message : String(err),
  updatedAt: new Date().toISOString(),
}).where(eq(submissions.id, submissionId));
```

**Step 2: 정상 완료 시 errorMessage 초기화**

`status: "done"` 으로 업데이트하는 구간에 `errorMessage: null` 추가 — 재평가 성공 시 이전 오류 메시지가 지워지도록.

**Step 3: 커밋**

```bash
git add src/lib/evaluation-runner.ts
git commit -m "feat: 평가 오류 메시지 errorMessage 컬럼에 저장"
```

---

## Task 3: 재평가 API 신규 구현

**영향 파일:**
- 신규: `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts`

**배경:** Sprint 5.1에서 re-evaluate API를 삭제했다. Sprint 6에서 개별 재평가 버튼 UI가 필요하므로, 단일 제출 건에 대해 재평가를 실행하는 API를 새로 구현한다. 전체 평가(`runEvaluation`)를 세션 단위로 실행하는 기존 구조를 재활용한다.

**Step 1: 디렉토리 생성 및 파일 작성**

경로: `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts`

```ts
// POST /api/sessions/[id]/submissions/[subId]/re-evaluate
// 단일 제출 건 재평가 (관리자 전용)
import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, withAdminAuth } from "@/lib/api-utils";
import { runEvaluation } from "@/lib/evaluation-runner";

interface Context {
  params: Promise<{ id: string; subId: string }>;
}

export const POST = withAdminAuth(async (request: NextRequest, context: unknown) => {
  const { id: sessionId, subId } = await (context as Context).params;

  // 제출 존재 및 세션 소속 확인
  const sub = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, subId), eq(submissions.sessionId, sessionId)))
    .then((r) => r[0]);

  if (!sub) {
    return apiError(ErrorCode.NOT_FOUND.code, "제출을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  if (sub.excluded) {
    return apiError(ErrorCode.VALIDATION_ERROR.code, "제외된 제출은 재평가할 수 없습니다.", ErrorCode.VALIDATION_ERROR.status);
  }

  // body에서 model 추출 (optional)
  let model: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    model = body.model;
  } catch {
    // 무시
  }

  // 상태를 submitted으로 리셋 (재평가 트리거)
  await db
    .update(submissions)
    .set({ status: "submitted", errorMessage: null, updatedAt: new Date().toISOString() })
    .where(eq(submissions.id, subId));

  // runEvaluation은 세션 단위 실행이므로
  // 해당 제출만 submitted 상태이므로 해당 건만 처리됨
  runEvaluation(sessionId, model).catch((err) => {
    console.error(`[재평가 오류] 제출 ${subId}:`, err);
  });

  return apiSuccess({ message: "재평가를 시작했습니다.", submissionId: subId }, 202);
});
```

**Step 2: 커밋**

```bash
git add src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts
git commit -m "feat: 개별 제출 재평가 API 구현 (POST re-evaluate)"
```

---

## Task 4: 순위표 동적 컬럼 — `RankingTable.tsx` 리팩터링

**영향 파일:**
- 수정: `src/components/admin/RankingTable.tsx`
- 수정: `src/app/admin/session/[sessionId]/results/page.tsx`

**배경:** 현재 `RankingTable.tsx`는 `documentation / implementation / ux / idea` 4개 컬럼을 하드코딩한다. Sprint 5.2 이후 직군별로 기준이 다르므로(예: 디자인 직군에 `design_system`, QA에 `verification_plan` 30점 등) 참가자별로 컬럼이 달라진다. 순위표는 **세션 내 모든 직군을 포함**하므로, DB에 실제 존재하는 `criteriaKey` 집합을 동적으로 수집하여 컬럼을 구성한다.

**Step 1: `RankingTable.tsx` — 타입 및 인터페이스 변경**

```ts
// 변경 전 (하드코딩된 scores 타입)
interface RankingEntry {
  submissionId: string;
  name: string;
  email: string;
  scores: {
    documentation: number;
    implementation: number;
    ux: number;
    idea: number;
  };
  baseScore: number;
  bonusScore: number;
  totalScore: number;
}

// 변경 후 (동적 scores)
interface RankingEntry {
  submissionId: string;
  name: string;
  email: string;
  jobRole: string;
  scores: Record<string, number>;
  baseScore: number;
  bonusScore: number;
  totalScore: number;
}

// 동적 컬럼 정보를 부모에서 주입
interface RankingTableProps {
  rankings: RankingEntry[];
  sessionId: string;
  criteriaColumns: Array<{ key: string; label: string; max: number }>;
}
```

**Step 2: `RankingTable.tsx` — `SortKey` 타입 변경**

```ts
// 변경 전
type SortKey = "documentation" | "implementation" | "ux" | "idea" | "total";

// 변경 후
type SortKey = string; // 동적 criteriaKey + "total"
```

**Step 3: `RankingTable.tsx` — columns 렌더링 로직 변경**

`columns` 상수를 제거하고 `criteriaColumns` prop을 사용하도록 변경:

```tsx
// 변경 전
const columns: Array<{ key: SortKey; label: string; max: number }> = [
  { key: "documentation", label: "문서화", max: 35 },
  ...
];

// 변경 후: props에서 받으므로 로컬 상수 제거
// criteriaColumns prop을 columns 대신 사용
```

테이블 헤더:
```tsx
{criteriaColumns.map(({ key, label, max }) => (
  <TableHead
    key={key}
    className="cursor-pointer select-none hover:text-zinc-800 text-right"
    onClick={() => handleSort(key)}
  >
    <span className="flex items-center justify-end gap-1">
      {label}
      <span className="text-zinc-400 font-normal text-xs">/{max}</span>
      {sortKey === key ? (
        sortDir === "desc" ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />
      ) : null}
    </span>
  </TableHead>
))}
```

테이블 바디 셀 (`criteriaColumns` 기준 순서대로 렌더링):
```tsx
{criteriaColumns.map(({ key }) => (
  <TableCell key={key} className="text-right">
    {entry.scores[key] ?? "-"}
  </TableCell>
))}
```

**Step 4: `results/page.tsx` — criteriaColumns 동적 수집 로직 추가**

`ROLE_CRITERIA_LABELS` 상수를 재활용하기 위해 `ProjectReport.tsx`에서 정의한 내용을 공통 위치로 이동시키거나, `results/page.tsx` 내부에서 점수 데이터로부터 동적 수집한다.

방식: DB에서 수집한 `scoreRows`에 존재하는 모든 `criteriaKey`를 수집하여 컬럼 목록을 구성. 직군별 라벨 매핑은 `src/lib/criteria-config.ts`로 추출한다.

**Step 4-1: `src/lib/criteria-config.ts` 신규 생성**

```ts
// 직군별 평가 기준 메타데이터 (RankingTable, ProjectReport 공유)
import type { JobRole } from "@/types";

export const ROLE_CRITERIA_META: Record<JobRole, Record<string, { label: string; max: number }>> = {
  "PM/기획": {
    documentation: { label: "AI-Native 문서화 체계", max: 40 },
    implementation: { label: "기술 구현력", max: 10 },
    ux: { label: "완성도 및 UX", max: 20 },
    idea: { label: "아이디어 및 활용 가치", max: 20 },
    verification_plan: { label: "검증 계획", max: 10 },
  },
  "개발": {
    documentation: { label: "AI-Native 문서화 체계", max: 30 },
    implementation: { label: "기술 구현력", max: 30 },
    ux: { label: "완성도 및 UX", max: 15 },
    idea: { label: "아이디어 및 활용 가치", max: 10 },
    verification_plan: { label: "검증 계획", max: 15 },
  },
  "디자인": {
    documentation: { label: "AI-Native 문서화 체계", max: 20 },
    implementation: { label: "기술 구현력", max: 10 },
    ux: { label: "완성도 및 UX", max: 20 },
    idea: { label: "아이디어 및 활용 가치", max: 10 },
    design_system: { label: "디자인 시스템", max: 30 },
    verification_plan: { label: "검증 계획", max: 10 },
  },
  "QA": {
    documentation: { label: "AI-Native 문서화 체계", max: 30 },
    implementation: { label: "기술 구현력", max: 10 },
    ux: { label: "완성도 및 UX", max: 20 },
    idea: { label: "아이디어 및 활용 가치", max: 10 },
    verification_plan: { label: "검증 계획", max: 30 },
  },
};

// 세션 내 모든 점수 행으로부터 표시할 컬럼 목록 동적 수집
// 컬럼 출현 빈도 기준 정렬, 라벨은 "개발" 기준 fallback
export function buildCriteriaColumns(
  allScoreRows: Array<{ criteriaKey: string; maxScore: number }>
): Array<{ key: string; label: string; max: number }> {
  const keySet = new Map<string, { maxTotal: number; count: number }>();

  for (const row of allScoreRows) {
    const existing = keySet.get(row.criteriaKey);
    if (existing) {
      existing.count++;
      existing.maxTotal = Math.max(existing.maxTotal, row.maxScore);
    } else {
      keySet.set(row.criteriaKey, { maxTotal: row.maxScore, count: 1 });
    }
  }

  // 고정 표시 순서 (공통 기준 먼저, 직군 특화 후)
  const KEY_ORDER = ["documentation", "implementation", "ux", "idea", "design_system", "verification_plan"];
  const devMeta = ROLE_CRITERIA_META["개발"];

  const columns: Array<{ key: string; label: string; max: number }> = [];

  // 정해진 순서대로 포함
  for (const key of KEY_ORDER) {
    if (keySet.has(key)) {
      const meta = devMeta[key] ?? ROLE_CRITERIA_META["디자인"][key] ?? ROLE_CRITERIA_META["QA"][key];
      columns.push({
        key,
        label: meta?.label ?? key,
        max: keySet.get(key)!.maxTotal,
      });
    }
  }

  // 순서에 없는 키 추가 (미래 확장 대비)
  for (const [key, { maxTotal }] of keySet.entries()) {
    if (!KEY_ORDER.includes(key)) {
      columns.push({ key, label: key, max: maxTotal });
    }
  }

  return columns;
}
```

**Step 4-2: `results/page.tsx` — criteriaColumns 계산 및 전달**

```tsx
// 모든 점수 행 수집
const allScoreRows = (
  await Promise.all(
    doneSubs.map((sub) =>
      db.select().from(scoresTable).where(eq(scoresTable.submissionId, sub.id))
    )
  )
).flat();

// 동적 컬럼 구성
import { buildCriteriaColumns } from "@/lib/criteria-config";
const criteriaColumns = buildCriteriaColumns(allScoreRows);

// rankings 구성 시 scores를 Record<string, number>로 빌드
const rankings = doneSubs.map((sub) => {
  const subScores = allScoreRows.filter((s) => s.submissionId === sub.id);
  const scoreMap: Record<string, number> = {};
  for (const s of subScores) {
    scoreMap[s.criteriaKey] = s.score;
  }
  return {
    submissionId: sub.id,
    name: sub.name,
    email: sub.email,
    jobRole: sub.jobRole,
    scores: scoreMap,
    baseScore: sub.baseScore ?? 0,
    bonusScore: sub.bonusScore ?? 0,
    totalScore: sub.totalScore ?? 0,
  };
});

// RankingTable에 criteriaColumns 전달
<RankingTable rankings={rankings} sessionId={sessionId} criteriaColumns={criteriaColumns} />
```

**Step 4-3: `ProjectReport.tsx` — ROLE_CRITERIA_LABELS 제거, criteria-config.ts 재사용**

`ProjectReport.tsx` 내부의 `ROLE_CRITERIA_LABELS` 상수를 삭제하고 `ROLE_CRITERIA_META` import로 대체:

```ts
import { ROLE_CRITERIA_META } from "@/lib/criteria-config";
// 기존: const criteriaLabels = ROLE_CRITERIA_LABELS[report.jobRole] ?? ...
// 변경: const criteriaLabels = ROLE_CRITERIA_META[report.jobRole] ?? ROLE_CRITERIA_META["개발"];
```

**Step 5: 커밋**

```bash
git add src/lib/criteria-config.ts src/components/admin/RankingTable.tsx src/app/admin/session/[sessionId]/results/page.tsx src/components/admin/ProjectReport.tsx
git commit -m "feat: 순위표 직군별 동적 컬럼 + criteria-config.ts 공통 분리"
```

---

## Task 5: 관리자 세션 상세 — "결과 공개" 버튼 활성화

**영향 파일:**
- 수정: `src/app/admin/session/[sessionId]/page.tsx`

**배경:** 현재 "결과 공개" 버튼은 `disabled` 상태로 하드코딩되어 있다. `resultsPublished` 토글은 이미 `PATCH /api/sessions/[id]`에 구현되어 있으므로, 버튼을 실제 동작하도록 연결한다. 토글 후 페이지를 갱신하여 상태가 반영되어야 한다.

**Step 1: `SessionActions.tsx` 확인**

`src/components/admin/SessionActions.tsx`를 읽어 기존 `PATCH /api/sessions/[id]` 호출 패턴을 파악한다.

**Step 2: `page.tsx`에서 "결과 공개" 버튼을 클라이언트 컴포넌트로 분리**

`src/components/admin/PublishResultsButton.tsx` 신규 생성:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface PublishResultsButtonProps {
  sessionId: string;
  resultsPublished: boolean;
}

export function PublishResultsButton({ sessionId, resultsPublished }: PublishResultsButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultsPublished: !resultsPublished }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json?.error?.message ?? "결과 공개 설정 변경에 실패했습니다.");
        return;
      }

      toast.success(resultsPublished ? "결과 공개가 해제되었습니다." : "결과가 공개되었습니다.");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={resultsPublished ? "destructive" : "default"}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
      ) : resultsPublished ? (
        <EyeOff className="h-4 w-4 mr-1.5" />
      ) : (
        <Eye className="h-4 w-4 mr-1.5" />
      )}
      {resultsPublished ? "결과 공개 해제" : "결과 공개"}
    </Button>
  );
}
```

**Step 3: `page.tsx`에서 기존 disabled 버튼을 `PublishResultsButton`으로 교체**

```tsx
// 변경 전
<Button size="sm" variant="secondary" disabled title="Phase 3에서 연결 예정">
  결과 공개
</Button>

// 변경 후
import { PublishResultsButton } from "@/components/admin/PublishResultsButton";
<PublishResultsButton sessionId={sessionId} resultsPublished={session.resultsPublished} />
```

**Step 4: 커밋**

```bash
git add src/components/admin/PublishResultsButton.tsx src/app/admin/session/[sessionId]/page.tsx
git commit -m "feat: 결과 공개 버튼 실동작 연결 (PublishResultsButton)"
```

---

## Task 6: 관리자 제출 목록 — 오류 메시지 표시 + 재평가 버튼

**영향 파일:**
- 수정: `src/components/admin/SubmissionRow.tsx`
- 수정: `src/components/admin/SubmissionTable.tsx`

**배경:** `SubmissionRow`에 재평가 버튼과 오류 메시지 tooltip을 추가한다. 재평가 버튼은 status가 `error`인 경우에만 표시한다.

**Step 1: `SubmissionRow.tsx` — 인터페이스에 `errorMessage` 추가**

```ts
interface SubmissionRowData {
  // 기존 필드 유지
  errorMessage?: string | null; // 신규 추가
}
```

**Step 2: `SubmissionRow.tsx` — 오류 상태 시 재평가 버튼 + 오류 메시지 표시**

```tsx
// 오류 뱃지 옆에 오류 메시지 tooltip 추가
// status === "error"인 행에 재평가 버튼 추가

{submission.status === "error" && (
  <Button
    size="sm"
    variant="outline"
    className="h-7 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
    onClick={handleReEvaluate}
    disabled={reEvalLoading}
    title={submission.errorMessage ?? "오류 상세 없음"}
  >
    {reEvalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "재평가"}
  </Button>
)}
```

오류 메시지가 있는 경우 행 하단에 소형 텍스트로 표시:

```tsx
{submission.status === "error" && submission.errorMessage && (
  <TableCell colSpan={/* 전체 컬럼 수 */} className="pt-0 pb-2">
    <p className="text-xs text-red-500 truncate max-w-xs" title={submission.errorMessage}>
      오류: {submission.errorMessage}
    </p>
  </TableCell>
)}
```

> 참고: colSpan을 사용한 오류 행은 테이블 구조를 복잡하게 만들 수 있으므로, 대신 오류 뱃지에 `title` 속성으로 tooltip을 제공하는 것으로 단순화해도 된다. 선택은 구현자 판단.

**Step 3: `SubmissionRow.tsx` — 재평가 핸들러 추가**

```ts
const [reEvalLoading, setReEvalLoading] = useState(false);

interface SubmissionRowProps {
  submission: SubmissionRowData;
  onToggleExclude: (id: string) => Promise<void>;
  onUpdateNote: (id: string, note: string) => Promise<void>;
  onReEvaluate?: (id: string) => Promise<void>; // 신규
}

const handleReEvaluate = async () => {
  if (!onReEvaluate) return;
  setReEvalLoading(true);
  await onReEvaluate(submission.id);
  setReEvalLoading(false);
};
```

**Step 4: `SubmissionTable.tsx` — `onReEvaluate` 핸들러 구현 및 전달**

```ts
const handleReEvaluate = async (submissionId: string) => {
  try {
    const res = await fetch(
      `/api/sessions/${sessionId}/submissions/${submissionId}/re-evaluate`,
      { method: "POST" }
    );
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json?.error?.message ?? "재평가 시작에 실패했습니다.");
      return;
    }
    toast.success("재평가를 시작했습니다.");
  } catch {
    toast.error("네트워크 오류가 발생했습니다.");
  }
};
```

`SubmissionRow`에 `onReEvaluate={handleReEvaluate}` 전달.

**Step 5: 커밋**

```bash
git add src/components/admin/SubmissionRow.tsx src/components/admin/SubmissionTable.tsx
git commit -m "feat: 오류 제출 재평가 버튼 + errorMessage 표시"
```

---

## Task 7: 참가자 결과 조회 — `criteriaConfig` 연결

**영향 파일:**
- 수정: `src/app/api/sessions/[id]/submissions/check/route.ts`
- 수정: `src/components/check/submission-detail.tsx`
- 수정: `src/components/check/check-form.tsx`
- 수정: `src/components/check/score-result.tsx` (있는 경우)

**배경:** `SubmissionDetail`은 `criteriaConfig` prop을 받아 `ScoreResult`로 점수를 표시하지만, `CheckForm`에서 `criteriaConfig={null}`을 하드코딩해 항상 "평가 결과를 불러올 수 없습니다."가 표시된다. check API 응답에 참가자 직군에 맞는 criteriaConfig를 포함시켜야 한다.

**Step 1: `check/route.ts` — 응답에 criteriaConfig 포함**

```ts
// 기존 코드에서 scoreData 수집 후, criteriaConfig 구성 추가

// 직군별 기준 메타데이터 가져오기
import { ROLE_CRITERIA_META } from "@/lib/criteria-config";
import type { JobRole } from "@/types";

// criteriaConfig 구성 (결과 공개 + done 상태일 때만)
let criteriaConfigData = null;
if (session.resultsPublished && sub.status === "done") {
  const roleMeta = ROLE_CRITERIA_META[(sub.jobRole as JobRole) ?? "개발"] ?? ROLE_CRITERIA_META["개발"];
  criteriaConfigData = {
    criteria: Object.entries(roleMeta).map(([key, { label, maxScore }]) => ({
      key,
      label,
      maxScore,
    })),
  };
}

return apiSuccess({
  submission: sub,
  scores: scoreData,
  resultsPublished: session.resultsPublished,
  submissionDeadline: session.submissionDeadline,
  criteriaConfig: criteriaConfigData,
});
```

> 주의: `ROLE_CRITERIA_META`의 값 구조는 `{ label: string; max: number }`이고 `CriteriaItem`은 `{ key, label, maxScore }`이므로 변환이 필요하다. `max` → `maxScore` 매핑 필수.

**Step 2: `check-form.tsx` — API 응답에서 criteriaConfig 추출하여 전달**

```ts
// 기존: criteriaConfig={null}
// 변경:
const [criteriaConfig, setCriteriaConfig] = useState<CriteriaConfig | null>(null);

// onSubmit 내부 응답 처리:
const json = await res.json();
setCriteriaConfig(json.data.criteriaConfig ?? null);
setResult({
  submission: json.data.submission as Submission,
  scores: json.data.scores as Score[],
});

// SubmissionDetail에 전달:
<SubmissionDetail
  ...
  criteriaConfig={criteriaConfig}
  ...
/>
```

**Step 3: `score-result.tsx` 확인**

`src/components/check/score-result.tsx` 파일을 읽어 `CriteriaConfig`를 올바르게 사용하는지 확인한다. `criteriaConfig.criteria`의 `maxScore` 필드를 사용한다면 Step 1의 변환이 정확해야 한다.

**Step 4: 커밋**

```bash
git add src/app/api/sessions/[id]/submissions/check/route.ts src/components/check/check-form.tsx
git commit -m "feat: 참가자 결과 조회에 criteriaConfig 연결 — 실점수 표시"
```

---

## Task 8: 상세 리포트 — `bonusReasoning` 연결

**영향 파일:**
- 수정: `src/app/admin/session/[sessionId]/results/[submissionId]/page.tsx`
- 수정: `src/db/schema.ts` (scores 테이블에 bonus_reasoning 있는지 확인)

**배경:** `ProjectReportPage`에서 `bonusReasoning: null`을 하드코딩한다. bonusReasoning은 현재 별도 컬럼이 없으므로, `scores` 테이블의 `criteriaKey = "bonus"` 행의 reasoning 필드에서 읽거나, `submissions` 테이블에 직접 저장하는 방식을 택한다.

**분석:** evaluation-runner가 bonusScore를 어떻게 저장하는지 확인 후 결정한다.

**Step 1: `src/lib/evaluation-runner.ts` 분석**

bonus 관련 저장 로직을 확인한다. `scores` 테이블에 `criteriaKey = "bonus"`로 저장하는 패턴이 있다면 해당 row의 reasoning을 읽으면 된다.

**Step 2: `[submissionId]/page.tsx` — bonusReasoning 읽기**

```ts
// scores 중 criteriaKey === "bonus"인 행을 찾아 reasoning 추출
const bonusScore = scoreRows.find((s) => s.criteriaKey === "bonus");

const report = {
  ...
  bonusReasoning: bonusScore?.reasoning ?? null,
};
```

evaluation-runner가 bonus를 `submissions.bonusScore`에만 저장하고 별도 score row가 없다면, 이 태스크는 "현재 bonusReasoning 저장 구조 없음 — Phase 4 배포 보너스 구현 시 연동" 으로 처리하고 코드는 변경하지 않는다. (YAGNI 원칙)

**Step 3: 커밋 (변경 있을 경우)**

```bash
git add src/app/admin/session/[sessionId]/results/[submissionId]/page.tsx
git commit -m "fix: 상세 리포트 bonusReasoning DB에서 읽기"
```

---

## Task 9: 빌드 검증 및 최종 커밋

**Step 1: TypeScript 컴파일 오류 확인**

```bash
npx tsc --noEmit
```

예상 출력: 오류 없음.

오류가 있다면 각 오류 메시지를 확인하고 해당 파일 수정 → 다시 실행.

**Step 2: 프로덕션 빌드 확인**

```bash
npm run build
```

예상 출력: `Route (app)` 목록이 출력되며 빌드 성공.

**Step 3: 개발 서버로 수동 검증**

```bash
npm run dev
```

다음 순서로 브라우저에서 확인:
1. `http://localhost:3000/admin` → 로그인
2. 세션 상세 페이지 → "결과 공개" 버튼 클릭 → 상태 변경 확인
3. `오류` 상태 제출 건 존재 시 → 재평가 버튼 노출, 클릭 후 `submitted` 상태로 변경 확인
4. 결과 대시보드 → 순위표 컬럼이 실제 DB 기준으로 렌더링 확인
5. 개별 상세 리포트 → 항목별 점수 + 근거 + 레이더 차트 정상 확인
6. `http://localhost:3000/check/{sessionId}` → 이메일 + 비밀번호 입력 → 결과 공개 상태에서 점수 표시 확인

**Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore: Sprint 6 빌드 검증 및 마무리"
```

---

## 완료 기준 (Definition of Done)

- ✅ `submissions` 테이블에 `errorMessage` 컬럼이 추가되고 `npx drizzle-kit push` 적용됨
- ✅ 평가 오류 발생 시 `errorMessage`에 오류 상세가 저장됨
- ✅ 재평가 API (`POST /api/sessions/[id]/submissions/[subId]/re-evaluate`)가 동작함
- ✅ 관리자 제출 목록에서 `error` 상태 행에 재평가 버튼이 표시되고 동작함
- ✅ 순위표가 하드코딩 4개 컬럼 대신 DB 실데이터 기반 동적 컬럼으로 렌더링됨
- ✅ "결과 공개" 버튼이 실제 동작하고 토글 후 페이지 상태가 갱신됨
- ✅ 참가자 결과 조회 페이지에서 결과 공개 상태일 때 실점수가 표시됨
- ✅ `criteria-config.ts`가 `ProjectReport.tsx`와 `RankingTable.tsx`에서 공유됨
- ✅ `npm run build` 에러 없이 성공
- ✅ TypeScript 컴파일 오류 없음

---

## 의존성 및 리스크

| 항목 | 내용 | 대응 |
|------|------|------|
| `runEvaluation` 재사용 | 세션 단위 실행 함수를 재평가에 재사용 — 다른 `submitted` 건이 없으면 해당 건만 처리됨 | 재평가 전 해당 건만 `submitted`로 리셋하므로 안전 |
| `ROLE_CRITERIA_META` 중복 제거 | `ProjectReport.tsx`의 인라인 상수와 신규 `criteria-config.ts` 중복 가능성 | Task 4에서 `ProjectReport.tsx` 상수 제거 + import로 교체 명시 |
| `CriteriaItem.maxScore` vs `ROLE_CRITERIA_META.max` 필드명 불일치 | `CriteriaItem` 타입은 `maxScore`, meta는 `max` | check route에서 변환 시 명시적 매핑 필요 (Task 7 Step 1 주의사항 참조) |
| `bonusReasoning` 저장 구조 미확정 | evaluation-runner가 bonus reasoning을 저장하지 않을 수 있음 | Task 8에서 runner 코드 확인 후 YAGNI 원칙으로 처리 |

---

## 예상 산출물

- `src/lib/criteria-config.ts` — 신규: 직군별 기준 메타데이터 + 동적 컬럼 빌더
- `src/components/admin/PublishResultsButton.tsx` — 신규: 결과 공개 토글 버튼
- `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts` — 신규: 재평가 API
- 수정 파일: `schema.ts`, `types/index.ts`, `evaluation-runner.ts`, `RankingTable.tsx`, `ProjectReport.tsx`, `results/page.tsx`, `session/[sessionId]/page.tsx`, `SubmissionRow.tsx`, `SubmissionTable.tsx`, `check/route.ts`, `check-form.tsx`

---

## Playwright MCP 검증 시나리오 (sprint-close 시 실행)

> `npm run dev` 실행 상태에서 순서대로 검증

**결과 대시보드 검증:**
1. `browser_navigate` → `http://localhost:3000/admin` → 로그인
2. `browser_navigate` → `/admin/session/{sessionId}/results`
3. `browser_snapshot` → 순위표 컬럼이 직군별 기준으로 렌더링되는지 확인
4. `browser_click` → 항목 헤더 정렬 클릭 → 정렬 순서 변경 확인
5. `browser_click` → 특정 참가자 이름 링크 → 상세 리포트
6. `browser_snapshot` → 항목별 점수, 레이더 차트, 평가 근거 확인

**결과 공개 버튼 검증:**
1. `browser_navigate` → `/admin/session/{sessionId}`
2. `browser_snapshot` → "결과 공개" 버튼 노출 확인 (disabled 아님)
3. `browser_click` → "결과 공개" 버튼
4. `browser_snapshot` → 버튼 텍스트가 "결과 공개 해제"로 변경 확인

**참가자 결과 조회 검증:**
1. `browser_navigate` → `/check/{sessionId}`
2. 이메일 + 비밀번호 입력 → 조회
3. `browser_snapshot` → 결과 공개 전: "결과가 아직 공개되지 않았습니다." 표시 확인
4. (관리자에서 결과 공개 활성화 후)
5. `browser_snapshot` → 점수 및 항목별 근거 표시 확인

**재평가 버튼 검증:**
1. `browser_navigate` → `/admin/session/{sessionId}`
2. `browser_snapshot` → `error` 상태 행에 재평가 버튼 노출 확인
3. `browser_click` → 재평가 버튼
4. `browser_snapshot` → 상태가 `수집중` 또는 `평가중`으로 변경 확인

**공통 검증:**
- `browser_console_messages(level: "error")` → 콘솔 에러 없음
- `browser_network_requests` → 모든 API 호출 2xx 응답
