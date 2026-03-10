# Sprint 4: 관리자 기능 연결 + MVP 마무리

- **기간**: 2026-03-10
- **브랜치**: `sprint4` (master에서 분기)
- **목표**: 제출 목록 관리 API 완성, CSV 내보내기, Toast/로딩 UX 개선으로 Phase 2 MVP 완성

---

## 배경

Sprint 3에서 API 기반 구조(인증, 세션 CRUD, 제출 upsert, GitHub 검증)를 완성했다.
그러나 아래 항목이 미완성 상태였다:

- 관리자 제출 목록의 제외/메모 변경이 로컬 state에서만 동작 → 새로고침 시 유실
- CSV 내보내기 기능 없음
- alert() 사용, 로딩 텍스트만 있어 UX 미비

---

## 작업 목록

### T2-6. 제출 목록 관리 API (M) — ✅ 완료

#### T2-6-1. PATCH 제출 수정 API
- **새 파일**: `src/app/api/sessions/[id]/submissions/[subId]/route.ts`
  - `withAdminAuth` 래핑
  - 해당 제출이 해당 세션에 속하는지 확인
  - `excluded`, `adminNote` 부분 업데이트
  - `updatedAt` 갱신 후 수정된 제출 반환

- **수정**: `src/lib/validations.ts`
  - `updateSubmissionSchema` 추가 (`excluded?: boolean`, `adminNote?: string`)

#### T2-6-2. GET 제출 목록 API
- **수정**: `src/app/api/sessions/[id]/submissions/route.ts` — GET 핸들러 추가
  - `withAdminAuth` 래핑
  - 쿼리 파라미터: `status`, `excluded`, `search`, `sort`(name|submittedAt|totalScore), `order`(asc|desc)
  - Drizzle `like()`, `eq()`, `and()`, `or()` 동적 조합
  - 기본 정렬: `submittedAt desc`

#### T2-6-3. 프론트엔드 API 연결
- **수정**: `src/components/admin/SubmissionTable.tsx`
  - `sessionId` prop 추가
  - `toggleExclude` → `PATCH /api/sessions/${sessionId}/submissions/${id}` 호출
  - `updateNote` → 동일 PATCH 호출
  - 실패 시 sonner toast 알림

- **수정**: `src/components/admin/SubmissionRow.tsx`
  - `onToggleExclude`, `onUpdateNote`를 async로 변경
  - 호출 중 버튼에 `Loader2` 스피너 표시 (`excludeLoading`, `noteLoading` 상태)

- **수정**: `src/app/admin/session/[sessionId]/page.tsx`
  - `<SubmissionTable>` 에 `sessionId` prop 전달

---

### T2-7. CSV 내보내기 (S) — ✅ 완료

- **새 파일**: `src/app/api/sessions/[id]/export/csv/route.ts`
  - `withAdminAuth` 래핑
  - submissions + scores 쿼리
  - 컬럼: 이름, 이메일, GitHub URL, 배포 URL, 상태, 총점, 기본점, 보너스점, documentation, implementation, ux, idea, 제출일시, 제외여부, 관리자메모
  - `excluded=true` 행은 기본 제외, `?includeExcluded=true`로 포함 가능
  - BOM(`\uFEFF`) 접두사로 Excel 한글 호환
  - `Content-Disposition: attachment; filename=submissions-{sessionId}.csv`

- **수정**: `src/components/admin/SubmissionTable.tsx`
  - 필터 영역 옆에 "CSV 내보내기" 버튼 추가
  - `window.location.href`로 다운로드 (쿠키 자동 전송)

---

### T2-8. 에러 처리 & 로딩 상태 (M) — ✅ 완료

#### T2-8-1. 패키지 설치
- `sonner` 설치

#### T2-8-2. Toast 알림
- **수정**: `src/app/admin/layout.tsx` — `<Toaster richColors position="bottom-right" />` 추가
- **수정**: `src/components/admin/SessionActions.tsx` — `alert()` → `toast.error/success()`
- **수정**: `src/components/admin/SubmissionTable.tsx` — 제외/복원, 메모 저장 성공/실패 toast
- **수정**: `src/components/admin/CreateSessionModal.tsx` — 세션 생성 성공 toast

#### T2-8-3. 로딩 스켈레톤
- **새 파일**: `src/components/ui/skeleton.tsx` — `animate-pulse bg-zinc-200 rounded` 기반
- **수정**: `src/app/admin/dashboard/page.tsx` — "불러오는 중..." 텍스트 → 스켈레톤 카드 3개

---

### T2-9. MVP 통합 테스트 & 정리 (M) — ✅ 완료

#### T2-9-1. mock-data.ts 삭제
- `src/lib/mock-data.ts` 삭제 (import 참조 없음 확인 후)

#### T2-9-2. 빌드 검증
- `npm run build` 통과 확인 — 컴파일 에러, 타입 에러 없음

#### T2-9-3. E2E 플로우 테스트
- 자동 검증: `npm run build` 성공
- 수동 검증 항목은 `docs/deploy.md` Sprint 4 섹션 참조

---

## 파일 변경 요약

| 구분 | 파일 | 내용 |
|------|------|------|
| 새 파일 | `src/app/api/sessions/[id]/submissions/[subId]/route.ts` | PATCH 제출 수정 |
| 새 파일 | `src/app/api/sessions/[id]/export/csv/route.ts` | CSV 내보내기 |
| 새 파일 | `src/components/ui/skeleton.tsx` | 스켈레톤 컴포넌트 |
| 수정 | `src/app/api/sessions/[id]/submissions/route.ts` | GET 핸들러 추가 |
| 수정 | `src/lib/validations.ts` | `updateSubmissionSchema` 추가 |
| 수정 | `src/components/admin/SubmissionTable.tsx` | sessionId prop, API 호출, CSV 버튼 |
| 수정 | `src/components/admin/SubmissionRow.tsx` | async 핸들러, 로딩 스피너 |
| 수정 | `src/app/admin/session/[sessionId]/page.tsx` | sessionId prop 전달 |
| 수정 | `src/app/admin/layout.tsx` | Toaster 추가 |
| 수정 | `src/components/admin/SessionActions.tsx` | alert → toast |
| 수정 | `src/components/admin/CreateSessionModal.tsx` | 세션 생성 성공 toast |
| 수정 | `src/app/admin/dashboard/page.tsx` | 스켈레톤 로딩 |
| 삭제 | `src/lib/mock-data.ts` | 미사용 목업 데이터 |

---

## 자동 검증 결과

- ✅ `npm run build` — 빌드 성공, TypeScript 오류 없음
- ✅ 신규 라우트 인식: `/api/sessions/[id]/submissions/[subId]`, `/api/sessions/[id]/export/csv`

## 수동 검증 항목

`docs/deploy.md` Sprint 4 섹션 참조.

---

## 완료 기준 (Definition of Done)

- ✅ 제외/복원 상태가 DB에 저장되어 새로고침 후에도 유지됨
- ✅ 메모 저장 상태가 DB에 저장되어 새로고침 후에도 유지됨
- ✅ CSV 내보내기 — BOM 포함, 제외 행 기본 제외
- ✅ 모든 관리자 액션에 Toast 알림 적용
- ✅ 대시보드 로딩 시 스켈레톤 표시
- ✅ `mock-data.ts` 삭제 (기술 부채 해소)
- ✅ `npm run build` 에러 없이 성공
