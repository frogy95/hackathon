# Sprint 2 코드 리뷰 보고서

- **리뷰 일자**: 2026-03-10
- **검토 범위**: Sprint 2 구현 파일 전체 (관리자 UI)
- **리뷰어**: sprint-close 에이전트

---

## 요약

| 구분 | 건수 |
|------|------|
| Critical | 0 |
| Important | 1 |
| Suggestion | 3 |

전반적으로 코드 품질이 양호합니다. 컴포넌트 구조가 명확하게 분리되어 있고, TypeScript 타입 안전성이 잘 유지되고 있습니다. `'use client'` 지시어 사용이 일관적이며, `useMemo`를 통한 연산 최적화도 적절하게 적용되어 있습니다.

---

## Important (수정 권장)

### I-1. `auth.ts` 비밀번호 평문 하드코딩

**파일**: `src/lib/auth.ts` (5번 줄)

```ts
const ADMIN_PASSWORD = "admin1234";
```

**문제**: 비밀번호가 소스 코드에 평문으로 하드코딩되어 있어 저장소가 공개되면 즉시 노출됩니다.

**영향**: Phase 1 목업 단계이므로 보안 위협은 제한적이지만, Phase 2 API 인증 교체 전까지 git 히스토리에 남습니다.

**권장 조치**: Phase 2에서 환경 변수(`ADMIN_PASSWORD`) 기반 서버 사이드 인증으로 교체 예정 (계획 수립됨 — T2-2). 현 단계에서는 주석으로 명확히 표시되어 있어 인지된 기술 부채로 허용 가능합니다.

---

## Suggestion (개선 제안)

### S-1. `SubmissionTable` — 필터 건수가 전체 목록 기준

**파일**: `src/components/admin/SubmissionTable.tsx` (41~49번 줄)

현재 `statusCounts`는 `submissions` 전체 배열 기준으로 계산됩니다. 사용자가 검색어를 입력한 상태에서 탭 Badge에 표시되는 건수는 검색 필터링 전 전체 건수를 보여주므로 약간의 혼동이 생길 수 있습니다.

**제안**: Phase 2에서 서버 사이드 필터링으로 전환 시 자연스럽게 해결됩니다.

---

### S-2. `RankingTable` — `sortKey === "total"` 분기의 타입 캐스팅

**파일**: `src/components/admin/RankingTable.tsx` (61~62번 줄)

```ts
sortKey === "total" ? a.displayTotal : a.scores[sortKey as keyof typeof a.scores]
```

`sortKey`가 `"total"`이 아닌 경우 `keyof typeof a.scores`로 캐스팅하고 있으나, `SortKey` 타입에 `"total"`이 포함되어 있어 컴파일러가 자동 추론을 못 합니다. 별도 타입 가드 함수로 분리하면 더 명확해집니다.

**제안**: Phase 2 리팩터링 시 개선을 권장합니다. 현재 동작에는 문제 없음.

---

### S-3. `AdminLayout` — `checked` 상태로 인한 초기 깜빡임

**파일**: `src/app/admin/layout.tsx` (25번 줄)

```tsx
if (!checked) return null;
```

인증 확인 전 `null`을 반환하여 레이아웃이 잠시 빈 화면으로 보일 수 있습니다.

**제안**: 로딩 스켈레톤 또는 스피너로 교체하면 UX가 개선됩니다. Phase 2 API 인증 전환 시 함께 개선을 권장합니다.

---

## 잘된 점

- **컴포넌트 분리**: `SubmissionFilters` / `SubmissionRow` / `SubmissionTable` 로 역할이 명확하게 분리됨
- **useMemo 적용**: 필터링/정렬 연산에 적절히 메모이제이션 적용
- **SSR 안전성**: 세션 스토리지 접근 시 `typeof window !== "undefined"` 가드 일관적으로 적용
- **접근성**: `aria-invalid` 속성, `htmlFor`/`id` 연결 등 기본 접근성 고려됨
- **Phase 분리 주석**: Phase 2~3에서 교체/연결 예정 항목에 명시적 주석 기재
- **레이더 차트 정규화**: 항목별 만점이 다른 경우 0~100으로 정규화하여 시각적 왜곡 방지
- **TypeScript 타입 안전성**: 공유 타입은 `src/types/index.ts`에서 import, 컴포넌트 전용 타입은 로컬 정의로 구분
