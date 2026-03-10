# Sprint 4 검증 보고서

- 작성일: 2026-03-10
- 검증 환경: 로컬 개발 서버 (`npm run dev`, 포트 3000)
- 브랜치: `sprint4`

---

## 자동 검증 결과 (curl)

### 1. 관리자 인증

| 항목 | 결과 | 비고 |
|------|------|------|
| `POST /api/auth/admin` (password: admin1234) | ✅ 통과 | `{"success":true,"data":{"message":"로그인 성공"}}` 반환 |

### 2. GET /api/sessions/[id]/submissions — 제출 목록 조회

| 항목 | 결과 | 비고 |
|------|------|------|
| 인증 없이 접근 | ✅ 통과 | HTTP 401 반환 |
| 인증 후 전체 목록 조회 | ✅ 통과 | 10건 반환, `success: true` |
| `?status=done` 필터 | ✅ 통과 | 1건(김철수) 반환, 상태 필터 정상 동작 |

### 3. PATCH /api/sessions/[id]/submissions/[subId] — 제출 수정

| 항목 | 결과 | 비고 |
|------|------|------|
| `excluded: true` 요청 | ✅ 통과 | 응답에 `"excluded": true` 반영 확인 |
| 복원 `excluded: false` 요청 | ✅ 통과 | 응답에 `"excluded": false` 반영 확인, DB 영속성 확인 |

### 4. GET /api/sessions/[id]/export/csv — CSV 내보내기

| 항목 | 결과 | 비고 |
|------|------|------|
| HTTP 상태 | ✅ 통과 | 200 OK |
| Content-Type | ✅ 통과 | `text/csv; charset=utf-8` |
| Content-Disposition | ✅ 통과 | `attachment; filename=submissions-session-2026-spring.csv` |
| BOM 포함 여부 | ✅ 통과 | 파일 시작 3바이트 `\uFEFF` 확인 (UTF-8 BOM) |
| 헤더 행 | ✅ 통과 | 이름, 이메일, GitHub URL, 배포 URL, 상태, 총점, 기본점, 보너스점 등 15개 컬럼 |
| 데이터 행 | ✅ 통과 | excluded=false인 제출만 포함 확인 |

---

## 수동 검증 결과 (사용자 직접 확인)

Sprint 4 구현 완료 후 사용자가 브라우저에서 직접 수행한 검증입니다.

| 항목 | 결과 |
|------|------|
| 제외/복원 버튼 동작 및 상태 유지 | ✅ 완료 |
| 메모 저장 및 새로고침 후 유지 | ✅ 완료 |
| Toast 알림 동작 (제외/복원/메모/세션관리) | ✅ 완료 |
| CSV 내보내기 버튼 및 파일 다운로드 | ✅ 완료 |
| Excel 한글 깨짐 없음 (BOM 처리) | ✅ 완료 |
| 대시보드 로딩 스켈레톤 표시 | ✅ 완료 |

---

## 코드 리뷰 요약

### Critical / High 이슈: 없음

### Medium 이슈

1. **SQL 인젝션 가능성 — `like` 파라미터 (route.ts:47)**
   - `search` 쿼리 파라미터를 직접 `like(col, `%${search}%`)` 에 삽입
   - Drizzle ORM의 파라미터 바인딩을 통해 실제 SQL 인젝션은 방지되나, `%`, `_` 와일드카드 문자가 의도치 않게 패턴 매칭에 영향을 줄 수 있음
   - 권장 대응: 입력에서 `%`, `_`, `\` 이스케이프 처리 (Phase 4 이전 개선 권고)

2. **낙관적 업데이트 미적용 — SubmissionTable**
   - `toggleExclude`, `updateNote` 호출 시 API 응답을 기다린 후 상태를 업데이트함
   - 서버 응답이 느릴 경우 사용자가 로딩 스피너만 보게 되는 UX 문제
   - 권장 대응: 낙관적 업데이트 후 실패 시 롤백 패턴 적용 (향후 개선)

3. **CSV 내보내기 인증 우회 가능**
   - `window.location.href`로 CSV를 내보내면 쿠키가 함께 전송되므로 현재는 정상 동작
   - 단, 쿠키 설정이 변경될 경우(`SameSite=None` 등) 인증이 누락될 수 있음
   - 현재 구현 범위 내에서는 허용 가능한 수준

### Suggestions

- `SubmissionRow`에서 로딩 중 버튼 비활성화가 `excludeLoading`과 `noteLoading`을 독립 관리함 — 다른 행 조작과 독립적으로 동작하므로 설계 양호
- `escape` 함수가 인라인으로 정의됨 — 별도 유틸 파일로 추출 시 재사용성 향상 가능 (낮은 우선순위)
- 대시보드 스켈레톤이 `Array.from({ length: 3 })`으로 고정됨 — 실제 세션 수에 따라 동적으로 변경 가능하나 현재는 허용 가능

---

## 빌드 상태

- `npm run build`: ✅ 통과 (TypeScript 오류 없음)

---

## 결론

Sprint 4의 모든 핵심 기능(T2-6, T2-7, T2-8, T2-9)이 정상 구현되었으며 자동/수동 검증을 모두 통과했습니다. Critical/High 이슈 없음. Phase 2 MVP 마일스톤(M2) 달성.
