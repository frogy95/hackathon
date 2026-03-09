# Sprint 1 코드 리뷰 보고서

- **리뷰 일시**: 2026-03-09
- **리뷰 대상 브랜치**: `sprint1`
- **리뷰어**: code-reviewer 에이전트

---

## 전체 평가

Sprint 1 목표(참가자 UI 쉘 + DB 스키마)를 계획에 충실하게 구현했습니다. 코드 구조, 타입 안전성, 컴포넌트 분리가 전반적으로 우수합니다.

---

## Critical 이슈 (필수 수정)

없음.

---

## Important 이슈 (권장 수정)

### I-1. `check-form.tsx` — 클라이언트에서 목업 데이터 직접 참조

**파일**: `src/components/check/check-form.tsx` (52번째 줄)

```typescript
const isDeadlinePassed = new Date(mockSession.submissionDeadline) < new Date();
```

`isDeadlinePassed` 판단을 클라이언트 컴포넌트 내부에서 `mockSession`을 직접 참조하여 계산하고 있습니다. 반면 `submit/page.tsx`는 서버 컴포넌트에서 동일한 로직을 계산한 후 prop으로 내려주는 패턴을 사용합니다. 패턴 불일치로 Phase 2에서 API 교체 시 변경 범위가 늘어날 수 있습니다.

**권장 방향**: `CheckPage`(서버 컴포넌트)에서 `isDeadlinePassed`와 `resultsPublished`를 계산하여 `CheckForm`에 prop으로 내려주는 것이 일관성 측면에서 바람직합니다.

---

### I-2. `submission-detail.tsx` — 조건 분기 복잡도

**파일**: `src/components/check/submission-detail.tsx` (101~131번째 줄)

평가 결과 렌더링 조건 분기(`resultsPublished && status === 'done' && totalScore !== null && ...`)가 중첩 삼항 연산자로 작성되어 가독성이 낮습니다. Phase 3에서 상태가 추가될 경우 유지보수 부담이 증가합니다.

**권장 방향**: 별도 함수(`renderEvaluationResult`)로 추출하거나, `switch` 또는 early return 패턴으로 리팩터링하는 것을 권장합니다.

---

### I-3. `mock-data.ts` — `resultsPublished: true` 하드코딩

**파일**: `src/lib/mock-data.ts` (9번째 줄)

`resultsPublished: true`로 설정되어 있어, `check` 페이지에서 기본적으로 점수가 표시됩니다. `seed.ts`의 실제 DB 값은 `false`로 설정되어 있어 불일치가 존재합니다. 개발 중 혼동을 유발할 수 있습니다.

**권장 방향**: 두 값을 `false`로 통일하거나, 주석에 명시적으로 "check 페이지 점수 표시 테스트를 위해 true"라고 의도를 문서화합니다.

---

## Suggestion (선택적 개선)

### S-1. `validations.ts` — `deployUrl` 검증 개선

`deployUrl`의 refine 조건이 `!val || val === "" || ...` 형태로 빈 문자열을 두 번 처리합니다. `z.string().url().optional().or(z.literal(''))` 또는 `.transform` 패턴으로 더 간결하게 표현할 수 있습니다.

### S-2. `countdown-timer.tsx` — 하이드레이션 불일치 가능성

SSR에서 `useState` 초기값을 `calcTimeLeft(deadline)`으로 설정하고 있어 서버/클라이언트 간 타임스탬프 차이로 하이드레이션 경고가 발생할 수 있습니다. `useState<TimeLeft | null>(null)`로 초기화하고 `useEffect`에서만 값을 설정하는 방식을 권장합니다.

### S-3. `SubmissionStatus` 중복 선언

`src/types/index.ts`와 `src/db/schema.ts` 양쪽에 `SubmissionStatus` 타입이 각각 정의되어 있습니다. DB 스키마에서 타입을 export하고 `types/index.ts`에서 re-export하거나, 한 곳에만 두는 방식으로 단일화를 권장합니다.

### S-4. `db/index.ts` 미확인

`db/index.ts`는 이번 리뷰에서 직접 열람하지 않았습니다. DB 연결 설정 및 에러 핸들링이 적절히 구현되어 있는지 추후 확인을 권장합니다.

---

## 잘된 점

- **계획 대비 구현 완성도**: T1-1 ~ T1-5 모두 계획 범위 내에서 구현 완료
- **타입 안전성**: `types/index.ts`의 인터페이스가 DB 스키마와 잘 대응하며, zod 스키마에서 TypeScript 타입을 자동 추론
- **컴포넌트 분리**: `SubmissionForm`, `CountdownTimer`, `SubmissionSuccess`, `CheckForm`, `SubmissionDetail`, `ScoreResult`로 단일 책임 원칙을 따른 명확한 분리
- **목업 데이터 격리**: `lib/mock-data.ts`에 집중 관리하여 Phase 2 API 교체 범위 명확화
- **접근성**: `aria-invalid` 속성으로 폼 접근성 고려
- **보안**: 외부 링크에 `rel="noopener noreferrer"` 적용
- **Next.js 15 패턴**: `params: Promise<{ sessionId: string }>` 비동기 params 처리 정확히 적용

---

## 결론

Critical 이슈 없음. Important 이슈 3건(I-1, I-2, I-3)은 Phase 2 API 연결 전에 수정하면 변경 범위를 줄일 수 있습니다. Sprint 2 시작 전 I-3(mock-data 불일치)는 우선 수정을 권장합니다.
