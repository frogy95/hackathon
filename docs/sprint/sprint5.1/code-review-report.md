# Sprint 5.1 코드 리뷰 보고서

- **리뷰 일시**: 2026-03-10
- **대상 PR**: [#6 feat: Sprint 5.1 완료 — 평가 엔진 보완 및 UX 개선](https://github.com/frogy95/hackathon/pull/6)
- **브랜치**: `sprint5.1` → `sprint5`
- **리뷰어**: sprint-close 에이전트

---

## 요약

Sprint 5 코드 리뷰에서 식별된 Important 이슈 4건 중 3건이 계획대로 해소되었고, I-4(재평가 API 타임아웃)는 API 삭제 방식으로 근본적으로 해결되었습니다. 신규 기능(평가 리셋 API, 모델 선택 UI, 마크다운 렌더링) 구현도 적절합니다. Critical 이슈는 없고, 주목할 만한 Medium 이슈 3건과 Suggestion 3건이 있습니다.

---

## Critical 이슈 (없음)

---

## Important 이슈

### [M-1] `evaluate/route.ts` — `model` 파라미터 파싱 로직 중복 try-catch

**파일**: `src/app/api/sessions/[id]/evaluate/route.ts` L28-34

```ts
let model: string | undefined;
try {
  const body = await request.json().catch(() => ({}));
  model = body.model;
} catch {
  // body 없음 — 무시
}
```

`.catch(() => ({}))` 체이닝으로 이미 오류를 흡수하고 있으므로 외부 `try-catch`가 불필요합니다. 내부 `.catch`가 항상 객체를 반환하므로 외부 try 블록은 절대 catch 경로에 진입하지 않습니다. 실질적인 버그는 아니지만, 혼란을 줄이기 위해 하나로 통일하는 것이 좋습니다.

**영향도**: 낮음 (동작 오류 없음, 코드 가독성 문제)

---

### [M-2] `evaluation-runner.ts` — `model` 파라미터 타입이 `string | undefined`로 너무 느슨

**파일**: `src/lib/evaluation-runner.ts` L45, L103

```ts
export async function evaluateSingle(submissionId: string, model?: string): Promise<void>
export async function runEvaluation(sessionId: string, model?: string): Promise<void>
```

`ai-evaluator.ts`에 `MODEL_MAP` (haiku/sonnet 별칭) 이 정의되어 있지만, `evaluation-runner.ts`는 `string` 타입을 그대로 전달합니다. 임의의 문자열이 전달될 경우 `MODEL_MAP[model]`이 `undefined`를 반환하고 `model` 원본값을 그대로 Anthropic API에 전달하여 400 오류가 발생할 수 있습니다.

현재 클라이언트(`EvaluateButton`)는 `"haiku"` 또는 `"sonnet"` 만 전송하여 실질적 위험은 낮지만, API를 직접 호출하는 경우(curl 등) 예상치 못한 모델 ID가 전달될 수 있습니다.

**영향도**: 낮음 (프론트엔드가 검증하지만 서버 측 타입 가드 부재)

---

### [M-3] `evaluate/reset/route.ts` — scores 순회 삭제가 비효율적

**파일**: `src/app/api/sessions/[id]/evaluate/reset/route.ts` L37-39

```ts
for (const sub of targets) {
  await db.delete(scores).where(eq(scores.submissionId, sub.id));
}
```

이후 submissions 업데이트는 일괄 처리(`where(and(...))`)로 단일 쿼리를 사용하는 반면, scores 삭제는 건당 1개 쿼리를 실행합니다. 제출 수가 많을 경우 (50건 이상) 응답 지연이 발생할 수 있습니다. Drizzle의 `inArray` 연산자를 사용하면 단일 `DELETE WHERE submissionId IN (...)` 쿼리로 최적화 가능합니다.

**영향도**: 낮음 (현재 데이터 규모에서는 문제없음, 스케일 시 성능 저하 가능)

---

## Suggestion (제안)

### [S-1] `EvaluateButton.tsx` — `confirm()` 대신 Dialog 컴포넌트 사용 권장

**파일**: `src/components/admin/EvaluateButton.tsx` L127

```ts
if (!confirm("모든 평가 결과를 초기화합니다. 계속하시겠습니까?")) return;
```

`confirm()`은 브라우저 기본 다이얼로그로 디자인 일관성이 없고, 일부 환경(iframe, Electron)에서 차단됩니다. 프로젝트에 shadcn/ui의 `AlertDialog` 컴포넌트가 이미 있다면 해당 컴포넌트를 활용하는 것이 권장됩니다.

---

### [S-2] `ai-evaluator.ts` — `evaluateWithAI` 인자에 `hasDeployUrl`이 불완전하게 활용됨

**파일**: `src/lib/ai-evaluator.ts` L219-261

`hasDeployUrl` 파라미터를 받지만 사용자 프롬프트(`buildUserPrompt`)에는 전달하지 않고, 결과 객체에만 기록합니다. 프롬프트 내 "배포 URL 존재 여부: 제출 데이터 확인 필요" 주석(`buildUserPrompt` L105)이 그대로 남아 있어 AI에게 정확한 정보가 전달되지 않습니다. Sprint 4 배포 보너스 구현 전 정리가 필요합니다.

---

### [S-3] `ProjectReport.tsx` — `normalizeReasoning` 함수의 JSON 파싱이 런타임 오류 가능성

**파일**: `src/components/admin/ProjectReport.tsx` `normalizeReasoning` 함수

```ts
const parsed = JSON.parse(text) as { ... };
```

`JSON.parse`가 성공했지만 `parsed.sub_items`가 예상 타입과 다를 경우(예: null이 아닌 string) 런타임 오류가 발생할 수 있습니다. `try-catch`가 외부에 있어 보호는 되지만 `as` 타입 단언이 타입 안전성을 우회합니다. `parsed` 의 실제 타입 확인 코드가 더 견고합니다.

---

## 이슈 해소 검증

| Sprint 5 이슈 | 해소 여부 | 비고 |
|---------------|-----------|------|
| I-1: Promise.all 동시 요청 | ✅ 해소 | 순차 실행으로 변경, 배치 내 최대 3개 유지 |
| I-2: progressMap Dead Code | ✅ 해소 | 완전 제거 확인 |
| I-3: done 건 재평가 | ✅ 해소 | `ne(status, "done")` 필터 + `evaluation-runner.ts` 내 `.filter()` 이중 방어 |
| I-4: 재평가 API 타임아웃 | ✅ 해소 | API 삭제로 근본 해결, "리셋 → 재실행" 흐름으로 대체 |

---

## 긍정적 평가

- **이중 방어**: `evaluate/route.ts`에서 `ne()` DB 필터, `evaluation-runner.ts`에서 `.filter()` 추가 방어로 done 제외가 이중으로 보장됩니다.
- **MODEL_MAP 별칭**: `haiku`/`sonnet` 단순 별칭 → 실제 모델 ID 매핑으로 프론트엔드가 모델 ID를 직접 다루지 않아 변경이 용이합니다.
- **하위 호환 `normalizeReasoning`**: 구 JSON 형식 reasoning을 마크다운으로 변환하여 기존 평가 데이터도 정상 렌더링됩니다.
- **리셋 버튼 조건부 표시**: `doneCount > 0` 조건을 통해 불필요한 리셋 버튼 노출을 방지합니다.

---

## 결론

Critical 이슈 없음. Important 이슈 3건은 모두 영향도가 낮으며 현재 사용 환경에서 실질적 버그를 일으키지 않습니다. Sprint 6 착수 전 M-1(중복 try-catch 정리) 및 M-3(inArray 최적화) 정도를 간단히 해결하면 충분합니다. 나머지 항목은 향후 리팩토링 시 참고 자료로 남깁니다.

---

## 추가 리뷰 — Sprint 5.1 후속 변경 (2026-03-10)

### 변경 내용

1. `@tailwindcss/typography` 패키지 설치, `globals.css`에 `@plugin` 등록
2. `EvaluateButton.tsx` — 독립 카드 레이아웃으로 개선 (border/rounded-lg/p-4)
3. `SubmissionTable.tsx` — `useEffect`로 `initialSubmissions` 동기화 추가
4. `page.tsx` (세션 상세) — `EvaluateButton`을 헤더 액션 영역 밖으로 분리

### 새로운 Important 이슈

#### [M-4] `SubmissionTable.tsx` — useEffect 낙관적 업데이트 소실 위험

**위치**: `src/components/admin/SubmissionTable.tsx` L42-44

`router.refresh()`가 실행되면 서버 컴포넌트가 재렌더링되어 `initialSubmissions` prop이 갱신되고, `useEffect`가 `setSubmissions(initialSubmissions)`를 실행함. 이때 사용자가 메모 편집 인라인 UI를 열고 있거나 낙관적 상태(제외/메모)가 적용된 직후라면 로컬 상태가 서버 데이터로 덮어씌워질 수 있음. 평가 완료 후 `router.refresh()` 트리거가 메모 입력 중에 발생하면 입력 중인 메모가 소실됨.

**영향도**: 낮음 (드문 시나리오이나 데이터 소실 가능)

**권고**: SubmissionRow에서 편집 중 상태를 부모에게 알려 갱신을 억제하거나, 편집 상태가 활성화된 경우 `useEffect` 내부에서 갱신을 지연하는 방어 로직 추가 검토.

#### [M-5] `EvaluateButton.tsx` — `state === "done"` 노출 시간 부재

**위치**: `src/components/admin/EvaluateButton.tsx` L69-72

평가 완료 시 `setState("done")` 직후 `setState("idle")`을 호출하므로 "평가 완료" 버튼 상태가 사실상 UI에 노출되지 않음. 기능 문제는 없으나 `state === "done"` 분기(L193-197)가 dead code가 됨. 의도적 설계라면 해당 분기 제거, 잠시 표시 목적이라면 `setTimeout(() => setState("idle"), 2000)` 추가 권장.

**영향도**: 낮음 (dead code, UX 개선 여지)

### 새로운 Suggestion

#### [S-4] Tailwind v4 `@plugin` 문법 환경 의존성

**위치**: `src/app/globals.css` L2

`@plugin "@tailwindcss/typography"` 문법은 Tailwind CSS v4 전용. 현재 v4 사용 중이라면 문제없음. v3 환경으로 이식 시 `tailwind.config.ts`의 `plugins` 배열 방식으로 전환 필요.

### 추가 긍정적 평가

- `EvaluateButton`을 독립 카드 컴포넌트로 분리하여 세션 상세 페이지의 관심사를 더 명확히 분리함.
- `@tailwindcss/typography` 적용으로 AI 평가 근거 마크다운의 가독성이 크게 향상됨.
