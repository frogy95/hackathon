# Sprint 2: 관리자 UI

## 스프린트 정보

- **기간**: 2026-03-10 ~ 2026-03-16 (1주)
- **목표**: 관리자용 UI 전체 구현 — 로그인, 대시보드, 세션 상세, 결과 대시보드 (목업 데이터)
- **브랜치**: `sprint2`
- **Phase**: Phase 1 - 프론트엔드 UI 쉘
- **상태**: ✅ 완료 (2026-03-10)

## 프로젝트 구조 (Sprint 2 신규/수정 파일)

```
src/
  app/
    admin/
      page.tsx                              # 관리자 로그인 (T1-6)
      layout.tsx                            # 인증 가드 (T1-6)
      dashboard/
        page.tsx                            # 세션 목록 대시보드 (T1-7)
      session/[sessionId]/
        page.tsx                            # 세션 상세 - 제출 현황 (T1-8)
        results/
          page.tsx                          # 결과 대시보드 / 순위표 (T1-9)
        results/[submissionId]/
          page.tsx                          # 개별 프로젝트 상세 리포트 (T1-9)
  components/
    admin/
      LoginForm.tsx                         # 비밀번호 입력 폼 (T1-6)
      SessionCard.tsx                       # 세션 목록 카드 (T1-7)
      CreateSessionModal.tsx                # 세션 생성 모달 (T1-7)
      SubmissionTable.tsx                   # 제출 목록 테이블 (T1-8)
      SubmissionFilters.tsx                 # 상태별 필터 + 검색 (T1-8)
      SubmissionRow.tsx                     # 테이블 행 (제외/복원, 메모) (T1-8)
      RankingTable.tsx                      # 전체 순위표 (T1-9)
      RadarChart.tsx                        # Recharts 레이더 차트 (T1-9)
      ProjectReport.tsx                     # 개별 프로젝트 상세 리포트 (T1-9)
  lib/
    mock-data.ts                            # 관리자용 목업 데이터 추가 (T1-7, T1-8, T1-9)
    auth.ts                                 # 세션 스토리지 인증 헬퍼 (T1-6)
```

## 작업 목록

### T1-6. 관리자 로그인 UI (복잡도: S)

**목표**: `/admin` 접속 시 비밀번호 입력 폼을 제공하고, 세션 스토리지 기반 간이 인증으로 대시보드 진입을 제어한다.

**구현 범위**:
- ⬜ `src/lib/auth.ts` 생성 — 세션 스토리지 기반 인증 헬퍼 함수
  - `setAdminAuth()`, `getAdminAuth()`, `clearAdminAuth()`
  - 하드코딩 비밀번호 `admin1234` (Phase 2에서 API 인증으로 교체)
- ⬜ `src/components/admin/LoginForm.tsx` 생성
  - react-hook-form + zod 폼 검증
  - 비밀번호 입력 필드 (type="password")
  - 오류 메시지 표시 (잘못된 비밀번호)
  - 로그인 성공 시 `/admin/dashboard`로 리디렉션
- ⬜ `src/app/admin/page.tsx` 수정 — LoginForm 컴포넌트 렌더링
- ⬜ `src/app/admin/layout.tsx` 수정 — 인증 가드 로직 추가
  - 세션 스토리지 인증 상태 확인
  - 미인증 시 `/admin`(로그인 페이지)으로 리디렉션
  - 단, `/admin` 경로 자체는 인증 없이 접근 가능

**기술 접근 방법**:
- 클라이언트 컴포넌트(`'use client'`)로 구현 (세션 스토리지 접근 필요)
- `useRouter`로 리디렉션 처리
- zod 스키마: `z.object({ password: z.string().min(1, "비밀번호를 입력해주세요") })`

**완료 기준**:
- ⬜ `/admin` 접속 시 비밀번호 입력 폼 렌더링
- ⬜ 올바른 비밀번호 입력 → `/admin/dashboard` 이동
- ⬜ 틀린 비밀번호 입력 → 오류 메시지 표시
- ⬜ 대시보드 접속 후 새로고침 → 인증 유지
- ⬜ 직접 `/admin/dashboard` 접속 시 미인증이면 로그인 페이지로 리디렉션

---

### T1-7. 관리자 대시보드 UI (복잡도: M)

**목표**: `/admin/dashboard`에서 평가 세션 목록을 카드로 표시하고, 세션 생성 모달/폼을 제공한다. 모든 데이터는 목업으로 동작한다.

**구현 범위**:
- ⬜ `src/lib/mock-data.ts` 확장 — 관리자 대시보드용 목업 데이터
  - `mockAdminSessions`: 세션명, 제출 수, 상태(진행중/마감/결과공개), 생성일 포함 3건 이상
- ⬜ `src/components/admin/SessionCard.tsx` 생성
  - 세션명, 제출 수, 상태 Badge, 생성일 표시
  - 세션 상세 링크 (`/admin/session/[sessionId]`)
  - 상태별 색상 구분 (진행중: green, 마감: yellow, 결과공개: blue)
- ⬜ `src/components/admin/CreateSessionModal.tsx` 생성
  - shadcn/ui Dialog 컴포넌트 사용
  - 입력 필드: 세션명(필수), 마감일시(필수), 안내 문구(선택)
  - react-hook-form + zod 폼 검증
  - 저장 시 콘솔 로그 출력 (Phase 2에서 API 연결)
  - 취소/저장 버튼
- ⬜ `src/app/admin/dashboard/page.tsx` 수정
  - 상단: 페이지 제목 + "세션 생성" 버튼
  - 세션 카드 그리드 렌더링 (목업 데이터)
  - 빈 상태 처리 (세션 없을 때 안내 문구)
  - 로그아웃 버튼 (세션 스토리지 초기화 후 `/admin`으로 이동)

**기술 접근 방법**:
- shadcn/ui: `Card`, `Badge`, `Dialog`, `Button`, `Input`, `Label` 컴포넌트 활용
- 날짜/시간 입력: `<input type="datetime-local" />`
- 목업 데이터는 컴포넌트에서 직접 import

**완료 기준**:
- ⬜ 세션 카드 목록이 목업 데이터로 렌더링됨
- ⬜ "세션 생성" 버튼 클릭 시 모달 열림
- ⬜ 모달 내 필수 필드 미입력 시 오류 메시지 표시
- ⬜ 세션 카드 클릭 시 세션 상세 페이지로 이동
- ⬜ 로그아웃 시 로그인 페이지로 이동

---

### T1-8. 세션 상세 - 제출 현황 UI (복잡도: L)

**목표**: `/admin/session/[sessionId]`에서 제출 목록 테이블을 렌더링하고, 상태별 필터링/검색, 개별 제출 건 제외/복원 토글, 관리자 메모, 마감 조작 버튼을 제공한다. 모든 데이터는 목업으로 동작한다.

**구현 범위**:
- ⬜ `src/lib/mock-data.ts` 확장 — 제출 현황 목업 데이터 10건
  - 각 항목: 이름, 사번, GitHub URL, 배포 URL(일부 없음), 제출 시각, 평가 상태(submitted/evaluating/done/error), 제외 여부, 관리자 메모
  - 평가 상태 다양하게 구성 (각 상태 2건 이상)
- ⬜ `src/components/admin/SubmissionFilters.tsx` 생성
  - 상태 탭 필터: 전체 / 제출완료 / 평가중 / 평가완료 / 오류 (각 탭에 건수 Badge)
  - 이름/사번 텍스트 검색 입력
  - 필터 상태를 부모 컴포넌트로 콜백
- ⬜ `src/components/admin/SubmissionRow.tsx` 생성
  - 테이블 행: 이름, 사번, GitHub URL(링크), 배포 URL(링크 또는 없음 표시), 제출 시각, 평가 상태 Badge
  - 제외/복원 토글 버튼 (제외 시 행 배경 회색 처리)
  - 관리자 메모 입력 (인라인 편집, 클릭 시 input 활성화)
- ⬜ `src/components/admin/SubmissionTable.tsx` 생성
  - SubmissionFilters + shadcn/ui Table 조합
  - 필터/검색 상태에 따른 목록 필터링 (클라이언트 사이드)
  - 빈 결과 처리 안내 문구
  - 테이블 헤더 정렬 (제출 시각 기준 오름/내림차순)
- ⬜ `src/app/admin/session/[sessionId]/page.tsx` 수정
  - 상단: 세션 정보 (세션명, 마감일시, 제출 수)
  - 마감 관련 버튼 영역: "마감 연장" 버튼, "즉시 마감" 버튼
  - "평가 실행" 버튼 (비활성 상태, `disabled`, Phase 3에서 연결)
  - "결과 공개" 토글 (비활성 상태, Phase 3에서 연결)
  - "결과 대시보드" 링크 (`/admin/session/[sessionId]/results`)
  - SubmissionTable 컴포넌트 렌더링

**기술 접근 방법**:
- shadcn/ui: `Table`, `TableHeader`, `TableRow`, `TableCell`, `Badge`, `Button`, `Input`, `Tabs` 컴포넌트 활용
- 클라이언트 컴포넌트(`'use client'`)로 필터/검색 상태 관리
- `useState`로 제출 목록 로컬 상태 관리 (제외/메모 변경 반영)
- URL 파라미터 `sessionId`는 `params.sessionId`로 접근

**완료 기준**:
- ⬜ 목업 데이터 10건이 테이블에 렌더링됨
- ⬜ 상태 탭 필터링 동작 (각 탭 클릭 시 해당 상태 건만 표시)
- ⬜ 이름/사번 검색 동작 (입력 즉시 필터링)
- ⬜ 제출 시각 기준 정렬 (헤더 클릭 시 오름/내림차순 토글)
- ⬜ 제외/복원 토글 시 시각적 변화 (행 배경 회색)
- ⬜ 관리자 메모 인라인 편집 동작
- ⬜ "평가 실행", "결과 공개" 버튼이 비활성 상태로 렌더링됨

---

### T1-9. 결과 대시보드 UI (목업) (복잡도: M)

**목표**: 전체 순위표 테이블과 개별 프로젝트 상세 리포트 페이지를 구현한다. Recharts 레이더 차트로 항목별 점수를 시각화하고, 배포 보너스 포함/미포함 토글을 제공한다. 모든 데이터는 목업으로 동작한다.

**구현 범위**:
- ⬜ `recharts` 패키지 설치
- ⬜ `src/lib/mock-data.ts` 확장 — 결과 대시보드 목업 데이터
  - `mockRankings`: 10건 순위 데이터 (이름, 사번, 항목별 점수 4개, 배포 보너스, 총점)
  - 항목: 완성도(30점), 기술적 구현(30점), 혁신성(20점), 발표/문서화(20점)
  - 배포 보너스: 최대 10점 (일부만 보유)
- ⬜ `src/components/admin/RankingTable.tsx` 생성
  - 순위, 이름, 사번, 항목별 점수, 총점 테이블
  - 헤더 클릭으로 항목별 정렬 (오름/내림차순)
  - 배포 보너스 포함/미포함 토글 (Switch 또는 Checkbox)
  - 토글 시 총점 재계산 및 순위 재정렬
  - 상세 리포트 링크 (이름 클릭)
- ⬜ `src/components/admin/RadarChart.tsx` 생성
  - Recharts `RadarChart` 컴포넌트 활용
  - 항목별 점수를 레이더 차트로 시각화
  - 반응형 컨테이너 (`ResponsiveContainer`)
  - 범례 표시
- ⬜ `src/components/admin/ProjectReport.tsx` 생성
  - 프로젝트 기본 정보 (이름, 사번, GitHub URL, 배포 URL)
  - RadarChart 레이더 차트
  - 항목별 점수 상세 (막대 또는 수치 표시)
  - 평가 근거 텍스트 영역 (항목별)
  - 배포 보너스 섹션 (보너스 점수 + 근거)
- ⬜ `src/app/admin/session/[sessionId]/results/page.tsx` 생성
  - 페이지 제목 + 세션명 표시
  - RankingTable 컴포넌트 렌더링
- ⬜ `src/app/admin/session/[sessionId]/results/[submissionId]/page.tsx` 생성
  - ProjectReport 컴포넌트 렌더링
  - "목록으로 돌아가기" 링크

**기술 접근 방법**:
- `recharts` 설치: `npm install recharts`
- shadcn/ui: `Table`, `Switch`, `Card`, `Badge` 컴포넌트 활용
- 클라이언트 컴포넌트(`'use client'`)로 정렬/토글 상태 관리
- 레이더 차트 데이터 포맷: `[{ subject: '완성도', score: 85, fullMark: 100 }, ...]`

**완료 기준**:
- ⬜ 순위표 테이블이 목업 데이터 10건으로 렌더링됨
- ⬜ 항목별 정렬 헤더 클릭 시 정렬 동작
- ⬜ 배포 보너스 포함/미포함 토글 시 총점 및 순위 변경됨
- ⬜ 이름 클릭 시 상세 리포트 페이지로 이동
- ⬜ 상세 리포트에 레이더 차트가 렌더링됨
- ⬜ 상세 리포트에 항목별 점수 + 평가 근거 텍스트 표시됨

---

## 완료 기준 (Definition of Done)

- ⬜ 관리자 로그인 → 대시보드 → 세션 상세 → 결과 대시보드 전체 탐색 흐름 동작
- ⬜ 모든 관리자 페이지가 목업 데이터로 렌더링됨
- ⬜ 상태별 필터링, 검색, 정렬 기능이 클라이언트 사이드에서 동작
- ⬜ Recharts 레이더 차트가 정상 렌더링됨
- ⬜ 반응형 레이아웃이 모바일(390px)과 데스크톱(1280px)에서 정상 동작
- ⬜ `npm run build` 에러 없이 성공

## 진행 현황

| 태스크 | 상태 | 완료일 |
|--------|------|--------|
| T1-6. 관리자 로그인 UI | ✅ 완료 | 2026-03-10 |
| T1-7. 관리자 대시보드 UI | ✅ 완료 | 2026-03-10 |
| T1-8. 세션 상세 - 제출 현황 UI | ✅ 완료 | 2026-03-10 |
| T1-9. 결과 대시보드 UI (목업) | ✅ 완료 | 2026-03-10 |

## 의존성 및 리스크

| 항목 | 내용 |
|------|------|
| Sprint 1 의존 | T1-1~T1-5 완료 기반 (프로젝트 구조, shadcn/ui, mock-data.ts) |
| recharts 설치 | T1-9 시작 전 `npm install recharts` 필요 |
| shadcn/ui 컴포넌트 | Dialog, Tabs, Table, Switch, Badge 수동 생성 필요 (인터랙티브 CLI 미사용) |
| 세션 스토리지 인증 | Phase 2에서 실제 API 인증으로 교체 예정 (기술 부채 인식) |
| 비활성 버튼 | "평가 실행", "결과 공개" 버튼은 Phase 3 연결까지 `disabled` 유지 |

## 기술 고려사항

- shadcn/ui 컴포넌트는 인터랙티브 CLI 문제로 수동 생성 (`src/components/ui/` 아래)
- 목업 데이터는 `src/lib/mock-data.ts`에 집중 관리, Phase 2에서 API로 교체
- 세션 스토리지는 SSR 환경에서 접근 불가 → 클라이언트 컴포넌트에서만 사용
- Recharts는 클라이언트 렌더링 전용 → `'use client'` 지시어 필수
- 관리자 레이아웃 인증 가드는 `useEffect` + `useRouter`로 클라이언트 사이드 처리

## 자동 검증 결과

### HTTP 상태 코드 (2026-03-10)

| URL | 결과 |
|-----|------|
| `/admin` | ✅ 200 OK |
| `/admin/dashboard` | ✅ 200 OK |
| `/admin/session/session-2026-spring` | ✅ 200 OK |
| `/admin/session/session-2026-spring/results` | ✅ 200 OK |
| `/admin/session/session-2026-spring/results/sub-001` | ✅ 200 OK |

- ✅ `npm run build` — 빌드 성공 (TypeScript 에러 없음)
- ✅ 모든 관리자 페이지 HTTP 200 응답 확인
- ✅ 페이지 콘텐츠 키워드 확인 (`LoginForm`, `SubmissionTable`, `RankingTable`, `RadarChart`)

## 검증 결과

- [Playwright 검증 보고서 (수동 검증 체크리스트 포함)](sprint2/playwright-report.md)
- [코드 리뷰 보고서](sprint2/code-review-report.md)

## 주요 구현 파일

| 파일 | 설명 |
|------|------|
| `src/app/admin/page.tsx` | 관리자 로그인 |
| `src/app/admin/layout.tsx` | 인증 가드 |
| `src/app/admin/dashboard/page.tsx` | 세션 목록 대시보드 |
| `src/app/admin/session/[sessionId]/page.tsx` | 세션 상세 - 제출 현황 |
| `src/app/admin/session/[sessionId]/results/page.tsx` | 결과 순위표 |
| `src/app/admin/session/[sessionId]/results/[submissionId]/page.tsx` | 개별 프로젝트 상세 리포트 |
| `src/components/admin/LoginForm.tsx` | 로그인 폼 컴포넌트 |
| `src/components/admin/SessionCard.tsx` | 세션 카드 컴포넌트 |
| `src/components/admin/CreateSessionModal.tsx` | 세션 생성 모달 |
| `src/components/admin/SubmissionTable.tsx` | 제출 목록 테이블 |
| `src/components/admin/SubmissionFilters.tsx` | 필터 및 검색 |
| `src/components/admin/SubmissionRow.tsx` | 테이블 행 (제외/메모) |
| `src/components/admin/RankingTable.tsx` | 전체 순위표 |
| `src/components/admin/RadarChart.tsx` | Recharts 레이더 차트 |
| `src/components/admin/ProjectReport.tsx` | 개별 프로젝트 상세 리포트 |
| `src/lib/auth.ts` | 세션 스토리지 인증 헬퍼 |
| `src/lib/mock-data.ts` | 목업 데이터 (관리자 데이터 추가) |

## Playwright MCP 검증 시나리오

> `npm run dev` 실행 후 아래 순서로 검증

**관리자 로그인 검증:**
1. `browser_navigate` -> `http://localhost:3000/admin` 접속
2. `browser_snapshot` -> 비밀번호 입력 폼 확인
3. `browser_click` -> 로그인 버튼 클릭 (빈 폼)
4. `browser_snapshot` -> 필수 입력 오류 메시지 확인
5. `browser_type` -> 틀린 비밀번호 입력
6. `browser_click` -> 로그인 버튼 클릭
7. `browser_snapshot` -> "비밀번호가 올바르지 않습니다" 오류 확인
8. `browser_type` -> 올바른 비밀번호 입력 (`admin1234`)
9. `browser_click` -> 로그인 버튼 클릭
10. `browser_snapshot` -> `/admin/dashboard` 이동 확인

**관리자 대시보드 검증:**
1. `browser_snapshot` -> 세션 카드 목록 렌더링 확인
2. `browser_click` -> "세션 생성" 버튼
3. `browser_snapshot` -> 모달 열림 확인
4. `browser_click` -> 모달 내 "저장" 버튼 (빈 폼)
5. `browser_snapshot` -> 필수 필드 오류 메시지 확인
6. `browser_click` -> 모달 취소
7. `browser_click` -> 세션 카드 클릭
8. `browser_snapshot` -> 세션 상세 페이지 이동 확인

**세션 상세 검증:**
1. `browser_snapshot` -> 제출 목록 테이블 10건 렌더링 확인
2. `browser_click` -> "평가완료" 상태 탭 클릭
3. `browser_snapshot` -> 필터링 결과 확인 (해당 상태 건만 표시)
4. `browser_type` -> 검색창에 이름 입력
5. `browser_snapshot` -> 검색 결과 필터링 확인
6. `browser_click` -> 제출 시각 정렬 헤더
7. `browser_snapshot` -> 정렬 순서 변경 확인
8. `browser_click` -> 특정 행의 제외 토글
9. `browser_snapshot` -> 해당 행 배경 색상 변경 확인
10. `browser_snapshot` -> "평가 실행", "결과 공개" 버튼이 disabled 상태 확인

**결과 대시보드 검증:**
1. `browser_click` -> "결과 대시보드" 링크
2. `browser_snapshot` -> 순위표 테이블 10건 렌더링 확인
3. `browser_click` -> 항목별 정렬 헤더 클릭
4. `browser_snapshot` -> 정렬 순서 변경 확인
5. `browser_click` -> 배포 보너스 포함/미포함 토글
6. `browser_snapshot` -> 총점 및 순위 변동 확인
7. `browser_click` -> 특정 참가자 이름 클릭 (상세 리포트)
8. `browser_snapshot` -> 상세 리포트 페이지 이동 확인
9. `browser_snapshot` -> 레이더 차트 렌더링 확인
10. `browser_snapshot` -> 항목별 점수 + 평가 근거 텍스트 표시 확인

**공통 검증:**
- `browser_console_messages(level: "error")` -> 모든 페이지에서 콘솔 에러 없음
- 모바일 뷰포트(390px)에서 `browser_snapshot` -> 반응형 레이아웃 확인
