# Sprint 11: 운영 이슈 수정 — 테스트 이메일 URL + 즉시 결과 확인

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 테스트 이메일의 "결과확인" 버튼이 실제 세션으로 연결되도록 수정하고, 평가 완료 즉시 결과를 확인할 수 있도록 `resultsPublished` 의존성을 제거한다.

**Architecture:** 테스트 이메일 API에서 하드코딩된 sessionId를 DB 조회로 대체하고, 백엔드 check API와 프론트엔드 submission-detail 컴포넌트에서 `resultsPublished` 조건을 제거하여 `status === "done"`만으로 결과를 표시한다.

**Tech Stack:** Next.js 15 App Router API Routes, Drizzle ORM, TypeScript, nodemailer

---

## 스프린트 개요

- **기간**: 2026-03-12 (1일)
- **목표**: 운영 중 발견된 2가지 이슈 수정
- **Phase**: Phase 5 이후 운영 개선
- **상태**: ✅ 완료 (2026-03-12)

---

## Task 1: 테스트 이메일 API — 실제 세션 ID 사용

**Files:**
- Modify: `src/app/api/admin/test-email/route.ts` (전체 재작성)

**현상:** `sessionId: "test-session"` 하드코딩으로 인해 이메일의 "결과확인" 버튼이 `/check/test-session`으로 이동 (존재하지 않는 세션)

**해결:** DB에서 첫 번째 세션을 조회하여 실제 sessionId를 사용

### Step 1: 구현

`src/app/api/admin/test-email/route.ts`를 다음과 같이 수정:

```ts
// POST /api/admin/test-email — 이메일 발송 테스트
import { apiSuccess, apiError, withAdminAuth } from "@/lib/api-utils";
import { sendEvaluationResultEmail } from "@/lib/email-sender";
import { db } from "@/db";
import { evaluationSessions } from "@/db/schema";

export const POST = withAdminAuth(async () => {
  try {
    // DB에서 첫 번째 세션 조회
    const session = await db
      .select({ id: evaluationSessions.id })
      .from(evaluationSessions)
      .limit(1)
      .then((r) => r[0]);

    if (!session) {
      return apiError("NO_SESSION", "테스트에 사용할 세션이 없습니다. 세션을 먼저 생성해주세요.", 400);
    }

    await sendEvaluationResultEmail({
      to: "frogy95@ubcare.co.kr",
      name: "테스트 사용자",
      totalScore: 87,
      baseScore: 82,
      jobRole: "개발",
      sessionId: session.id,
      submittedAt: new Date().toISOString(),
    });
    return apiSuccess({ message: "테스트 이메일 발송 완료" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return apiError("EMAIL_SEND_FAILED", `이메일 발송 실패: ${message}`, 500);
  }
});
```

### Step 2: 빌드 확인

Run: `npm run build`
Expected: 에러 없이 빌드 성공

### Step 3: 커밋

```bash
git add src/app/api/admin/test-email/route.ts
git commit -m "fix: 테스트 이메일 sessionId를 DB 조회로 변경"
```

**완료 기준:**
- ✅ 테스트 이메일의 "결과확인" 버튼이 실제 존재하는 세션의 `/check/{sessionId}`로 이동
- ✅ 세션이 없을 경우 400 에러 반환

---

## Task 2: 백엔드 — 평가 완료 시 즉시 결과 반환

**Files:**
- Modify: `src/app/api/sessions/[id]/submissions/check/route.ts:52-59`

**현상:** 54행의 `session.resultsPublished && sub.status === "done"` 조건 때문에 관리자가 "결과 공개"를 누르기 전까지 점수 데이터가 반환되지 않음

**해결:** `resultsPublished` 조건 제거, `sub.status === "done"`만으로 점수 반환

### Step 1: 구현

`src/app/api/sessions/[id]/submissions/check/route.ts` 54행 수정:

변경 전:
```ts
  if (session.resultsPublished && sub.status === "done") {
```

변경 후:
```ts
  if (sub.status === "done") {
```

### Step 2: 빌드 확인

Run: `npm run build`
Expected: 에러 없이 빌드 성공

### Step 3: 커밋

```bash
git add src/app/api/sessions/[id]/submissions/check/route.ts
git commit -m "fix: 평가 완료 시 resultsPublished 없이 즉시 결과 반환"
```

**완료 기준:**
- ✅ `status === "done"`인 제출 건은 `resultsPublished`와 관계없이 점수 데이터 반환
- ✅ `status !== "done"`인 제출 건은 여전히 점수 미반환

---

## Task 3: 프론트엔드 — 평가 완료 시 즉시 ScoreResult 표시

**Files:**
- Modify: `src/components/check/submission-detail.tsx:108-134`

**현상:** 109행의 `resultsPublished &&` 조건과 116행의 `resultsPublished &&` 조건으로 인해 UI에서도 결과 공개 전 점수가 표시되지 않음

**해결:** `resultsPublished` 조건 제거, `submission.status === "done"`만으로 ScoreResult 표시. 미공개 상태 안내 문구도 제거.

### Step 1: 구현

`src/components/check/submission-detail.tsx` 108-134행을 다음으로 교체:

변경 전:
```tsx
      {/* 평가 결과 */}
      {resultsPublished && submission.status === "done" && criteriaConfig &&
        submission.totalScore !== null ? (
        <ScoreResult
          scores={scores}
          totalScore={submission.totalScore}
          criteriaConfig={criteriaConfig}
        />
      ) : resultsPublished && submission.status === "done" ? (
        <Card>
          <CardContent className="pt-6 text-center text-zinc-500">
            평가 결과를 불러올 수 없습니다.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-zinc-500">
            {!resultsPublished
              ? "결과가 아직 공개되지 않았습니다."
              : submission.status === "evaluating"
                ? "현재 평가가 진행 중입니다. 잠시 후 다시 확인해주세요."
                : submission.status === "error"
                  ? "관리자가 오류를 확인 중이며, 처리 후 평가 결과 메일이 발송됩니다."
                  : "평가가 아직 시작되지 않았습니다."}
          </CardContent>
        </Card>
      )}
```

변경 후:
```tsx
      {/* 평가 결과 */}
      {submission.status === "done" && criteriaConfig &&
        submission.totalScore !== null ? (
        <ScoreResult
          scores={scores}
          totalScore={submission.totalScore}
          criteriaConfig={criteriaConfig}
        />
      ) : submission.status === "done" ? (
        <Card>
          <CardContent className="pt-6 text-center text-zinc-500">
            평가 결과를 불러올 수 없습니다.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-zinc-500">
            {submission.status === "evaluating"
              ? "현재 평가가 진행 중입니다. 잠시 후 다시 확인해주세요."
              : submission.status === "error"
                ? "관리자가 오류를 확인 중이며, 처리 후 평가 결과 메일이 발송됩니다."
                : "평가가 아직 시작되지 않았습니다."}
          </CardContent>
        </Card>
      )}
```

### Step 2: 빌드 확인

Run: `npm run build`
Expected: 에러 없이 빌드 성공

### Step 3: 커밋

```bash
git add src/components/check/submission-detail.tsx
git commit -m "fix: 프론트엔드 resultsPublished 조건 제거, 평가 완료 즉시 표시"
```

**완료 기준:**
- ✅ `status === "done"`이면 `resultsPublished`와 관계없이 ScoreResult 표시
- ✅ evaluating/error/submitted 상태는 기존과 동일하게 안내 문구 표시
- ✅ "결과가 아직 공개되지 않았습니다." 문구 제거

---

## Task 4: 이메일 안내 문구 수정

**Files:**
- Modify: `src/lib/email-sender.ts:85-88`

**현상:** 이메일 안내 문구가 "결과 공개 후 조회 페이지에서 상세 평가 내용을 확인하실 수 있습니다."로 되어 있어 결과 공개가 필요한 것처럼 오해 가능

**해결:** "조회 페이지에서 바로 상세 평가 내용을 확인하실 수 있습니다."로 변경

### Step 1: 구현

`src/lib/email-sender.ts` 87행 수정:

변경 전:
```html
          결과 공개 후 조회 페이지에서 상세 평가 내용을 확인하실 수 있습니다.
```

변경 후:
```html
          조회 페이지에서 바로 상세 평가 내용을 확인하실 수 있습니다.
```

### Step 2: 빌드 확인

Run: `npm run build`
Expected: 에러 없이 빌드 성공

### Step 3: 커밋

```bash
git add src/lib/email-sender.ts
git commit -m "fix: 이메일 안내 문구에서 '결과 공개 후' 제거"
```

**완료 기준:**
- ✅ 이메일 안내 문구가 즉시 확인 가능함을 반영

---

## 변경 파일 요약

| 파일 | 변경 유형 | 주요 내용 |
|------|-----------|-----------|
| `src/app/api/admin/test-email/route.ts` | 수정 | sessionId 하드코딩 → DB 조회 |
| `src/app/api/sessions/[id]/submissions/check/route.ts` | 수정 | `resultsPublished` 조건 제거 |
| `src/components/check/submission-detail.tsx` | 수정 | `resultsPublished` 조건 제거, 안내 문구 정리 |
| `src/lib/email-sender.ts` | 수정 | "결과 공개 후" → "바로" 문구 변경 |

---

## 완료 기준 (Definition of Done)

- ✅ 테스트 이메일의 "결과확인" 버튼이 실제 세션 URL로 이동
- ✅ 평가 완료(`status === "done"`) 참가자는 `resultsPublished`와 관계없이 즉시 결과 확인 가능
- ✅ 이메일 안내 문구가 즉시 확인 가능함을 반영
- ✅ `npm run build` 에러 없이 성공
- ⬜ Vercel 배포 후 정상 동작 확인 (수동)

---

## 검증 결과

- [검증 보고서 (코드 리뷰 + 수동 검증 항목)](sprint11/playwright-report.md)

---

## 의존성 및 리스크

| 리스크 | 영향도 | 완화 전략 |
|--------|--------|-----------|
| `resultsPublished` 제거 시 관리자가 일괄 결과 통제 불가 | 낮음 | 평가 완료 건만 개별 공개이므로 운영에 문제 없음. 필요 시 향후 개별 공개/비공개 토글 추가 가능 |
| 테스트 이메일 DB 조회 시 세션 없는 경우 | 낮음 | 400 에러 + 명확한 안내 메시지 반환 |
