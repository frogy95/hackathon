# Sprint 5.2 코드 리뷰 보고서

- **작성일**: 2026-03-11
- **검토 범위**: Sprint 5.2에서 변경된 16개 파일
- **빌드 상태**: `npm run build` 성공 (사용자 확인)

---

## 요약

| 등급 | 건수 |
|------|------|
| Critical | 0 |
| Important | 3 |
| Suggestion | 4 |

---

## Critical (즉시 수정 필요)

없음.

---

## Important (다음 스프린트 전 해소 권장)

### I-1. `evaluation-runner.ts` — `jobRole` 타입 캐스팅 취약성

**위치**: `src/lib/evaluation-runner.ts` L83

```ts
const jobRole = (submission.jobRole ?? "개발") as import("@/types").JobRole;
```

**문제**: DB에서 읽어온 `submission.jobRole`이 `JobRole` 열거 값에 해당하지 않는 임의 문자열일 경우 (예: 이전 스키마 데이터 또는 직접 DB 수정) `as` 캐스팅으로 타입 체크를 우회한다. `ROLE_CRITERIA[jobRole]`에서 `undefined`를 반환하고 `buildSystemPrompt`가 크래시할 수 있다.

**영향도**: 중간 — 정상적인 경로에서는 발생하지 않으나, 잘못된 DB 데이터가 있으면 평가 건 전체가 `error` 상태로 처리된다.

**권장 수정**: 화이트리스트 검증 함수를 추가하거나 `ROLE_CRITERIA`에 없을 경우 기본값("개발")으로 폴백.

---

### I-2. `ProjectReport.tsx` — `"최대 100점"` 하드코딩

**위치**: `src/components/admin/ProjectReport.tsx` L108

```tsx
<div className="text-xs text-zinc-400">총점 (최대 100점)</div>
```

**문제**: Sprint 5.2에서 직군별 만점이 달라졌다 (PM/기획 100점, 개발 100점, 디자인 90점, QA 100점). 현재 코드는 직군에 관계없이 "최대 100점"을 표시한다. 디자인 직군 평가 결과를 표시할 때 실제 최대 점수와 다른 값을 사용자에게 노출한다.

**영향도**: 중간 — 관리자 UI에서 잘못된 만점 정보를 표시하여 혼란을 줄 수 있다.

**권장 수정**: `ROLE_CRITERIA_LABELS` 값을 합산하거나, `ai-evaluator.ts`의 `ROLE_CRITERIA`에서 계산한 totalMax를 API 응답에 포함하여 동적으로 표시.

---

### I-3. `check/route.ts` — `checkPassword` 평문 노출

**위치**: `src/app/api/sessions/[id]/submissions/check/route.ts` L44

```ts
eq(submissions.checkPassword, checkPassword)
```

**문제**: `checkPassword`가 DB에 평문으로 저장되어 있고, 조회 API에서도 평문 대조한다. 현재는 간이 인증(숫자 4자리)이므로 보안상 허용 범위이나, DB 파일이 유출될 경우 조회 비밀번호가 노출된다. 해커톤 특성상 개인정보 유출 위험이 낮지만 나쁜 관행으로 이어질 수 있다.

**영향도**: 낮음 (해커톤 컨텍스트) — 프로덕션 서비스 전환 시 반드시 해시 저장으로 변경 필요.

**권장 수정**: Phase 4 이전 bcrypt 해시 저장으로 전환하거나 `// TODO: Phase 4에서 해시 저장으로 전환` 주석 추가.

---

## Suggestion (개선 제안)

### S-1. `ai-evaluator.ts` — `ROLE_CRITERIA_LABELS`와 `ROLE_CRITERIA` 이중 정의

`ai-evaluator.ts`의 `ROLE_CRITERIA`와 `ProjectReport.tsx`의 `ROLE_CRITERIA_LABELS`가 동일한 기준을 별도로 정의하고 있다. 두 파일에서 만점 수치가 다를 경우 UI와 AI 평가 결과가 불일치할 수 있다.

**권장**: `ROLE_CRITERIA_LABELS`를 `ai-evaluator.ts`의 `ROLE_CRITERIA`에서 파생하여 단일 소스 관리.

### S-2. `submission-form.tsx` — `<select>` 태그 shadcn Select 컴포넌트와 불일치

직군 선택 필드에 `<select>` 네이티브 태그를 사용하고 Tailwind 클래스를 직접 부여했다. 다른 인풋 필드는 shadcn `<Input>` 컴포넌트를 사용하여 디자인 시스템 일관성에서 벗어난다.

**권장**: shadcn `<Select>` 컴포넌트로 교체하거나 공통 스타일 토큰을 사용.

### S-3. `evaluation-runner.ts` — DB 상태 업데이트 중복

`evaluateSingle` 내에서 `collecting` → `evaluating` → `done/error` 상태 전이 시 DB `updatedAt` 업데이트가 각 단계마다 `new Date().toISOString()`을 별도 생성한다. 단일 `now` 변수를 재사용하거나 DB 함수로 처리하는 것이 더 정확하다.

### S-4. `ProjectReport.tsx` — `normalizeReasoning` 함수 범위

구 JSON 형식 reasoning 호환용 `normalizeReasoning` 함수가 컴포넌트 파일 내에 정의되어 있다. Sprint 5.1에서 AI 평가 저장 형식이 마크다운으로 통일된 이후에는 이 호환 코드의 실행 경로가 사라질 것이므로, 충분히 안정화된 후 제거할 수 있다.

---

## 긍정적 사항

- `ROLE_CRITERIA` 상수 설계가 명확하고 확장성이 좋다. 새 직군 추가 시 해당 상수만 수정하면 된다.
- `buildSystemPrompt(jobRole)` 동적 생성 방식이 프롬프트 관리의 단일 책임 원칙을 잘 따른다.
- `RadarChart` 컴포넌트가 `items` 배열 방식으로 리팩토링되어 재사용성이 향상됐다.
- `check/route.ts`에서 이름 제거 후 이메일 + checkPassword 조합이 UX 관점에서 더 간결하다.
- `normalizeReasoning` 함수를 통한 구 형식 하위 호환 처리가 안전한 마이그레이션을 보장한다.
