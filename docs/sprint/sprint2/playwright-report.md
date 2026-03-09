# Sprint 2 Playwright 검증 보고서

- **검증 일자**: 2026-03-10
- **검증 방식**: HTTP 상태 코드 자동 검증 + 페이지 콘텐츠 텍스트 확인
- **비고**: 이 환경에서 Playwright MCP 도구가 로드되지 않아 curl 기반 자동 검증을 수행하였습니다. 인터랙티브 UI 동작(클릭, 입력, 애니메이션)은 수동 검증 항목으로 분류하였습니다.

---

## 자동 검증 결과

### HTTP 상태 코드 검증

| URL | 예상 | 실제 | 결과 |
|-----|------|------|------|
| `http://localhost:3000/admin` | 200 | 200 | ✅ |
| `http://localhost:3000/admin/dashboard` | 200 | 200 | ✅ |
| `http://localhost:3000/admin/session/session-2026-spring` | 200 | 200 | ✅ |
| `http://localhost:3000/admin/session/session-2026-spring/results` | 200 | 200 | ✅ |
| `http://localhost:3000/admin/session/session-2026-spring/results/sub-001` | 200 | 200 | ✅ |

### 페이지 콘텐츠 키워드 검증

| 페이지 | 검증 키워드 | 결과 |
|--------|-------------|------|
| `/admin` | `관리자 로그인`, `비밀번호`, `LoginForm` | ✅ |
| `/admin/session/session-2026-spring` | `SubmissionTable`, `마감 연장`, `즉시 마감`, `평가 실행`, `결과 공개` | ✅ |
| `/admin/session/.../results` | `RankingTable` | ✅ |
| `/admin/session/.../results/sub-001` | `RadarChart`, `점수` | ✅ |

### 빌드 검증

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ 성공 (TypeScript 에러 없음, 사전 확인) |

---

## 수동 검증 필요 항목

아래 항목은 브라우저에서 직접 확인이 필요합니다.

### 관리자 로그인 (`/admin`)

- ⬜ 비밀번호 입력 폼이 화면에 표시됨
- ⬜ 빈 폼 제출 시 "비밀번호를 입력해주세요" 오류 메시지 표시
- ⬜ 잘못된 비밀번호 입력 시 "비밀번호가 올바르지 않습니다" 오류 표시
- ⬜ `admin1234` 입력 후 로그인 → `/admin/dashboard` 이동 확인
- ⬜ 대시보드 접속 후 새로고침 → 인증 유지 확인
- ⬜ 직접 `/admin/dashboard` 접속 (미인증) → 로그인 페이지로 리디렉션 확인

### 관리자 대시보드 (`/admin/dashboard`)

- ⬜ 세션 카드 3건 이상 렌더링 확인
- ⬜ "세션 생성" 버튼 클릭 → 모달 열림 확인
- ⬜ 모달 내 빈 폼 "저장" 클릭 → 필수 필드 오류 메시지 표시
- ⬜ 세션 카드 클릭 → 세션 상세 페이지 이동 확인
- ⬜ "로그아웃" 버튼 클릭 → 로그인 페이지 이동 확인

### 세션 상세 (`/admin/session/session-2026-spring`)

- ⬜ 제출 목록 테이블 10건 렌더링 확인
- ⬜ "평가완료" 탭 클릭 → 해당 상태 건만 필터링 확인
- ⬜ 이름 검색 입력 → 즉시 필터링 확인
- ⬜ 제출 시각 헤더 클릭 → 오름/내림차순 정렬 확인
- ⬜ 특정 행의 제외 토글 → 행 배경 회색 변경 확인
- ⬜ 관리자 메모 인라인 편집 확인
- ⬜ "평가 실행", "결과 공개" 버튼이 `disabled` 상태로 표시됨

### 결과 대시보드 (`/admin/session/session-2026-spring/results`)

- ⬜ 순위표 테이블 10건 렌더링 확인
- ⬜ 항목별 정렬 헤더 클릭 → 정렬 동작 확인
- ⬜ 배포 보너스 토글 ON/OFF → 총점 및 순위 변동 확인
- ⬜ 참가자 이름 클릭 → 상세 리포트 페이지 이동 확인

### 상세 리포트 (`/admin/session/session-2026-spring/results/sub-001`)

- ⬜ 레이더 차트 렌더링 확인
- ⬜ 항목별 점수 + 평가 근거 텍스트 표시 확인
- ⬜ "목록으로 돌아가기" 링크 동작 확인

### 반응형 레이아웃

- ⬜ 모바일(390px) 뷰포트에서 관리자 페이지 레이아웃 확인
- ⬜ 데스크톱(1280px) 뷰포트에서 테이블 레이아웃 확인

---

## 콘솔 에러 검증

브라우저 개발자 도구(F12 → Console)에서 각 페이지 접속 후 콘솔 에러 없음을 확인해주세요.

- ⬜ `/admin` — 콘솔 에러 없음
- ⬜ `/admin/dashboard` — 콘솔 에러 없음
- ⬜ `/admin/session/session-2026-spring` — 콘솔 에러 없음
- ⬜ `/admin/session/session-2026-spring/results` — 콘솔 에러 없음 (Recharts 렌더링 에러 포함)
- ⬜ `/admin/session/session-2026-spring/results/sub-001` — 콘솔 에러 없음
