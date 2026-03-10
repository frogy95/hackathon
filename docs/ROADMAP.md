# 프로젝트 로드맵: AI-Native 해커톤 평가 시스템

## 개요
- **목표**: 해커톤 참가자가 산출물을 제출하고, 관리자가 AI 자동 평가를 실행하여 일관되고 투명한 평가 결과를 제공하는 웹 애플리케이션
- **전체 예상 기간**: 8주 (4 Phase, 각 2주 스프린트)
- **현재 진행 단계**: Phase 2 (Sprint 3 예정)
- **기준일**: 2026-03-10

## 진행 상태 범례
- ✅ 완료
- 🔄 진행 중
- 📋 예정
- ⏸️ 보류

---

## 📊 프로젝트 현황 대시보드

| 항목 | 상태 |
|------|------|
| 전체 진행률 | 62.5% (Sprint 5/8 완료) |
| 현재 Phase | Phase 3 진행 중 (Sprint 5 완료) |
| 다음 마일스톤 | Sprint 6 - 결과 대시보드 실데이터 연결 |
| MVP 목표 | Phase 2 완료 시점 |

---

## 🏗️ 기술 아키텍처 결정 사항

| 구분 | 기술 | 선정 이유 |
|------|------|-----------|
| 프론트엔드 | Next.js 15 (App Router) + TypeScript | 풀스택 단일 프레임워크, SSR/SSG 지원, API Routes 내장 |
| UI | Tailwind CSS + shadcn/ui | 빠른 UI 구축, 일관된 디자인 시스템, 접근성 기본 지원 |
| 차트 | Recharts | 레이더 차트 지원, React 네이티브 통합 |
| AI | Claude API (claude-sonnet-4-6) | 코드 분석 능력, Vision 지원, 비용 효율 |
| GitHub 연동 | Octokit | 공식 SDK, TypeScript 타입 지원 |
| 스크린샷 캡처 | Playwright | 헤드리스 브라우저, 안정적인 스크린샷 캡처 |
| DB | SQLite + Drizzle ORM | 별도 DB 서버 불필요, 마이그레이션 지원, 타입 안전 |
| 배포 | Vercel 또는 로컬 실행 | 간편 배포, Next.js 최적화 |

---

## 🔗 의존성 맵

```
Phase 1: 프로젝트 초기화 + 프론트엔드 UI 쉘
    │
    ├─→ Phase 2: 백엔드 API + DB + 핵심 기능 연결 (MVP 완성)
    │       │
    │       ├─→ Phase 3: AI 평가 엔진 + 결과 대시보드
    │       │       │
    │       │       └─→ Phase 4: 배포 보너스 + 행운상 + 확장 기능
    │       │
    │       └─→ (Phase 3 의존: 제출 데이터가 DB에 존재해야 평가 가능)
    │
    └─→ (Phase 2 의존: UI 쉘이 있어야 API 연결 가능)
```

---

## Phase 1: 프로젝트 초기화 + 프론트엔드 UI 쉘 (Sprint 1-2, 2주)

### ✅ 상태: 완료 (Sprint 1 완료 2026-03-09 / Sprint 2 완료 2026-03-10)

### 목표
프로젝트 기반 구조를 세우고, 모든 주요 페이지의 프론트엔드 UI를 목업 데이터로 먼저 구현한다. 사용자(참가자/관리자)가 화면을 보고 피드백할 수 있는 상태를 만든다.

### 작업 목록

#### Sprint 1: 프로젝트 초기화 + 참가자 UI (1주차) — ✅ 완료 (2026-03-09)

- ✅ **T1-1. 프로젝트 초기화** (복잡도: S)
  - Next.js 15 App Router + TypeScript 프로젝트 생성
  - Tailwind CSS + shadcn/ui 설정
  - ESLint, Prettier 설정
  - 프로젝트 디렉토리 구조 확정
  - 환경 변수 템플릿 (.env.example) 생성
  - 검증: `npm run build` 성공

- ✅ **T1-2. DB 스키마 설계 및 마이그레이션** (복잡도: M)
  - Drizzle ORM + SQLite 설정
  - PRD 섹션 5 데이터 모델 기반 스키마 정의: EvaluationSession, Submission, Score 테이블
  - 마이그레이션 파일 생성 및 적용
  - 시드 데이터 스크립트 작성 (목업 데이터 10건)
  - 검증: `npx drizzle-kit push` 성공, 시드 데이터 삽입 확인 (세션 1, 제출 10, 점수 4)

- ✅ **T1-3. 공통 레이아웃 및 네비게이션** (복잡도: S)
  - 루트 레이아웃 (헤더, 푸터)
  - 참가자용 / 관리자용 레이아웃 분리
  - 반응형 네비게이션 바
  - 검증: 빌드 성공으로 구조 검증 완료

- ✅ **T1-4. 참가자 제출 폼 UI** (복잡도: M) [FR-004]
  - `/submit/[sessionId]` 페이지 구현
  - 세션명, 안내 문구, 마감 카운트다운 표시
  - 입력 필드: 이름(2자 이상), 이메일(이메일 형식 검증), GitHub URL(URL 형식), 배포 URL(선택)
  - 클라이언트 사이드 폼 유효성 검증 (react-hook-form + zod)
  - 마감 시간 이후 제출 불가 UI 표시
  - 제출 완료 확인 화면 (제출 시각, 입력 내용 요약)
  - 목업 데이터로 동작 확인 (API 연결 없이)

- ✅ **T1-5. 참가자 제출 확인/결과 조회 UI** (복잡도: S) [FR-005, FR-014]
  - `/check/[sessionId]` 페이지 구현
  - 이름 + 이메일 입력 폼
  - 제출 내역 표시 (제출 시각, 입력 내용)
  - 마감 전: 수정 버튼 표시
  - 결과 공개 후: 항목별 점수 + 평가 근거 표시 (목업)
  - 목업 데이터 (`lib/mock-data.ts`) 기반 동작

#### Sprint 2: 관리자 UI (2주차) — ✅ 완료 (2026-03-10)

- ✅ **T1-6. 관리자 로그인 UI** (복잡도: S)
  - `/admin` 접속 시 비밀번호 입력 폼
  - 세션 스토리지 기반 간이 인증 상태 관리 (프론트엔드 전용)
  - 검증: 비밀번호 입력 후 대시보드 진입

- ✅ **T1-7. 관리자 대시보드 UI** (복잡도: M) [FR-001]
  - `/admin/dashboard` 페이지
  - 평가 세션 목록 카드 (세션명, 제출 수, 상태, 생성일)
  - 세션 생성 모달/폼: 세션명, 마감일시, 안내 문구 입력
  - 목업 데이터로 세션 목록 렌더링
  - 검증: 세션 목록 및 생성 폼 렌더링 확인

- ✅ **T1-8. 세션 상세 - 제출 현황 UI** (복잡도: L) [FR-006, FR-007]
  - `/admin/session/[sessionId]` 페이지
  - 제출 목록 테이블: 이름, 이메일, 저장소 URL, 배포 URL 유무, 제출 시각, 평가 상태
  - 상태별 필터링: 전체 / 제출완료 / 평가중 / 평가완료 / 오류
  - 검색 기능 (이름, 이메일)
  - 개별 제출 건: 제외/복원 토글, 관리자 메모
  - 마감 연장/즉시 마감 버튼 [FR-002]
  - 평가 실행 버튼 (비활성 상태, Phase 3에서 연결)
  - 결과 공개 토글 (비활성 상태, Phase 3에서 연결)
  - 목업 데이터 10건으로 테이블 동작 확인
  - 검증: 테이블 정렬/필터/검색 동작 확인

- ✅ **T1-9. 결과 대시보드 UI (목업)** (복잡도: M) [FR-012, FR-013]
  - 전체 순위표 테이블 (총점 기준 정렬, 항목별 정렬)
  - 배포 보너스 포함/미포함 토글
  - 개별 프로젝트 상세 리포트 페이지
    - 항목별 점수 표시
    - Recharts 레이더 차트 (항목별 균형 시각화)
    - 평가 근거 텍스트 영역
  - 목업 데이터로 차트 및 테이블 렌더링
  - 검증: 순위표 정렬, 레이더 차트 렌더링 확인

### 완료 기준 (Definition of Done)
- ✅ 모든 주요 페이지(`/submit`, `/check`, `/admin`, `/admin/session`, 결과 대시보드)가 목업 데이터로 렌더링됨
- ✅ 반응형 레이아웃이 모바일(390px)과 데스크톱(1280px)에서 정상 동작
- ✅ 폼 유효성 검증이 클라이언트 사이드에서 동작
- ✅ `npm run build` 에러 없이 성공
- ✅ DB 스키마가 정의되고 시드 데이터로 검증 완료

### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**참가자 제출 폼 검증:**
1. `browser_navigate` -> `http://localhost:3000/submit/test-session` 접속
2. `browser_snapshot` -> 세션명, 안내 문구, 마감 카운트다운, 입력 폼 존재 확인
3. `browser_click` -> 제출 버튼 클릭 (빈 폼)
4. `browser_snapshot` -> 유효성 검증 에러 메시지 표시 확인
5. `browser_fill_form` -> 이름, 이메일, GitHub URL 입력
6. `browser_click` -> 제출 버튼 클릭
7. `browser_snapshot` -> 제출 완료 확인 화면 표시
8. `browser_console_messages(level: "error")` -> 콘솔 에러 없음

**관리자 대시보드 검증:**
1. `browser_navigate` -> `http://localhost:3000/admin` 접속
2. `browser_snapshot` -> 비밀번호 입력 폼 확인
3. `browser_type` -> 비밀번호 입력
4. `browser_click` -> 로그인 버튼 클릭
5. `browser_snapshot` -> 세션 목록 렌더링 확인
6. `browser_click` -> 세션 카드 클릭
7. `browser_snapshot` -> 제출 목록 테이블 렌더링 확인
8. `browser_click` -> 상태 필터 클릭
9. `browser_snapshot` -> 필터링 결과 확인

**결과 대시보드 검증:**
1. `browser_navigate` -> 순위표 페이지 접속
2. `browser_snapshot` -> 순위표 테이블 및 레이더 차트 렌더링 확인
3. `browser_click` -> 항목별 정렬 헤더 클릭
4. `browser_snapshot` -> 정렬 결과 확인
5. `browser_click` -> 개별 프로젝트 상세 리포트 링크 클릭
6. `browser_snapshot` -> 상세 리포트 페이지 렌더링 확인

**공통 검증:**
- `browser_console_messages(level: "error")` -> 모든 페이지에서 콘솔 에러 없음
- 모바일 뷰포트(390px)에서 `browser_snapshot` -> 반응형 레이아웃 확인

### 기술 고려사항
- shadcn/ui 컴포넌트는 필요한 것만 설치 (Button, Input, Table, Card, Dialog, Badge, Tabs 등)
- 폼 관리: react-hook-form + zod 스키마 검증
- 목업 데이터는 `/lib/mock-data.ts`에 집중 관리, Phase 2에서 API로 교체
- 디렉토리 구조: `app/`, `components/`, `lib/`, `db/` 분리

---

## Phase 2: 백엔드 API + 핵심 기능 연결 (Sprint 3-4, 2주) - MVP 완성

### ✅ 상태: 완료 (Sprint 3 완료 2026-03-10 / Sprint 4 완료 2026-03-10)

### 목표
Phase 1의 프론트엔드 UI를 실제 API와 연결하여 참가자 제출 -> 관리자 관리의 핵심 흐름을 완성한다. MVP로서 독립 배포 가능한 상태를 만든다.

### 작업 목록

#### Sprint 3: API 구현 + 참가자 기능 연결 (3주차) — ✅ 완료 (2026-03-10)

- ✅ **T2-1. API Route 기반 구조 설계** (복잡도: S)
  - Next.js App Router API Routes 구조 확정 (`app/api/...`)
  - 공통 응답 포맷, 에러 핸들링 미들웨어
  - API 경로 목록 문서화
  - 검증: API 엔드포인트 1개 이상 호출 성공

- ✅ **T2-2. 관리자 인증 API** (복잡도: S)
  - `POST /api/auth/admin` - 비밀번호 검증, 세션 토큰 발급
  - 환경 변수로 관리자 비밀번호 관리 (bcrypt 해시)
  - API Route 미들웨어: 관리자 전용 엔드포인트 보호
  - 검증: 올바른/잘못된 비밀번호로 인증 성공/실패 확인

- ✅ **T2-3. 평가 세션 CRUD API** (복잡도: M) [FR-001, FR-002]
  - `POST /api/sessions` - 세션 생성 (세션명, 마감일시, 안내 문구)
  - `GET /api/sessions` - 세션 목록 조회
  - `GET /api/sessions/[id]` - 세션 상세 조회
  - `PATCH /api/sessions/[id]` - 마감일시 수정, 즉시 마감, 결과 공개 토글
  - 세션 생성 시 고유 ID 자동 발급
  - 프론트엔드 관리자 대시보드 연결
  - 검증: 세션 생성/조회/수정 API 호출 및 UI 반영 확인

- ✅ **T2-4. 참가자 제출 API** (복잡도: L) [FR-004, FR-005]
  - `POST /api/sessions/[id]/submissions` - 제출 생성/수정
  - `GET /api/sessions/[id]/submissions/check` - 이름+이메일로 본인 제출 조회
  - GitHub URL 유효성 검증 (서버 사이드): Octokit으로 public repo 존재 여부 확인
  - 동일 이메일 중복 제출 시 기존 제출 덮어쓰기 (upsert)
  - 마감일시 이후 제출 거부 로직
  - 프론트엔드 제출 폼/확인 페이지 연결
  - 검증: 제출 생성/조회/수정/마감 후 거부 흐름 확인

- ✅ **T2-5. GitHub URL 실시간 검증** (복잡도: S) [FR-004]
  - `GET /api/validate/github-url?url=...` - GitHub API로 repo 존재/public 여부 확인
  - 프론트엔드 debounce 연동 (입력 후 500ms 대기 후 검증)
  - 검증: 유효/무효/private URL에 대한 검증 결과 표시

#### Sprint 4: 관리자 기능 연결 + MVP 마무리 (4주차) — ✅ 완료 (2026-03-10)

- ✅ **T2-6. 제출 목록 관리 API** (복잡도: M) [FR-006, FR-007]
  - `GET /api/sessions/[id]/submissions` - 전체 제출 목록 (필터/정렬/검색)
  - `PATCH /api/sessions/[id]/submissions/[subId]` - 제외/복원, 관리자 메모
  - 프론트엔드 제출 현황 테이블 연결
  - 검증: 목록 조회/필터/제외/메모 기능 동작 확인

- ✅ **T2-7. CSV 내보내기** (복잡도: S) [FR-015]
  - `GET /api/sessions/[id]/export/csv` - 전체 제출 목록 + 점수 CSV 다운로드
  - 프론트엔드 내보내기 버튼 연결
  - 검증: CSV 파일 다운로드 및 내용 정확성 확인

- ✅ **T2-8. 에러 처리 및 로딩 상태 통합** (복잡도: M)
  - 모든 API 호출에 로딩 스피너/스켈레톤 적용
  - API 오류 시 사용자 친화적 에러 메시지 표시 (sonner toast)
  - alert() → toast.error/success() 교체 (SessionActions, CreateSessionModal)
  - 검증: Toast 알림 및 스켈레톤 UI 정상 동작

- ✅ **T2-9. MVP 통합 테스트 및 버그 수정** (복잡도: M)
  - 참가자 전체 흐름 테스트: 제출 -> 확인 -> 수정 -> 마감 후 거부
  - 관리자 전체 흐름 테스트: 로그인 -> 세션 생성 -> 제출 관리
  - mock-data.ts 삭제, npm run build 통과
  - PATCH route 타입 오류(500 크래시) 수정
  - 검증: E2E 흐름 이상 없음

### 완료 기준 (Definition of Done)
- ✅ 참가자가 실제로 제출 폼을 통해 데이터를 제출하고 DB에 저장됨
- ✅ 관리자가 비밀번호로 로그인하여 세션 생성/관리 가능
- ✅ GitHub URL 실시간 유효성 검증 동작
- ✅ 마감일시 기반 제출 허용/거부 동작
- ✅ 제출 목록 필터링/검색/제외 기능 동작
- ✅ CSV 내보내기 동작
- ✅ 모든 API 에러에 대해 사용자 친화적 피드백 제공
- ✅ `npm run build` 에러 없이 성공

### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**참가자 제출 전체 흐름:**
1. `browser_navigate` -> `http://localhost:3000/submit/{sessionId}` 접속
2. `browser_snapshot` -> 세션 정보 로딩 확인
3. `browser_type` -> GitHub URL 입력 (유효한 public repo)
4. `browser_wait_for` -> "유효한 저장소" 검증 메시지 대기
5. `browser_fill_form` -> 나머지 필드 입력
6. `browser_click` -> 제출 버튼
7. `browser_wait_for` -> 제출 완료 메시지 대기
8. `browser_network_requests` -> `POST /api/sessions/.../submissions` 200 응답 확인
9. `browser_navigate` -> `/check/{sessionId}` 이동
10. `browser_fill_form` -> 이름 + 이메일 입력
11. `browser_click` -> 조회 버튼
12. `browser_snapshot` -> 제출 내역 표시 확인

**관리자 전체 흐름:**
1. `browser_navigate` -> `http://localhost:3000/admin` 접속
2. `browser_type` -> 비밀번호 입력
3. `browser_click` -> 로그인
4. `browser_network_requests` -> `POST /api/auth/admin` 200 확인
5. `browser_click` -> 세션 생성 버튼
6. `browser_fill_form` -> 세션 정보 입력
7. `browser_click` -> 저장
8. `browser_network_requests` -> `POST /api/sessions` 200 확인
9. `browser_snapshot` -> 새 세션 목록에 표시 확인
10. `browser_click` -> 세션 상세 진입
11. `browser_snapshot` -> 제출 목록 테이블 확인

**공통 검증:**
- `browser_console_messages(level: "error")` -> 콘솔 에러 없음
- `browser_network_requests` -> 모든 API 호출 2xx 응답

### 기술 고려사항
- Next.js API Routes에서 Drizzle ORM으로 SQLite 직접 접근
- GitHub API 토큰은 `GITHUB_TOKEN` 환경 변수로 관리, 서버 사이드에서만 사용
- 관리자 인증은 간이 세션 방식 (JWT 또는 암호화된 쿠키)
- tanstack-query 또는 SWR로 클라이언트 데이터 페칭 및 캐싱

---

## Phase 3: AI 평가 엔진 + 결과 대시보드 연결 (Sprint 5-6, 2주)

### ✅ 상태: 진행 중 (Sprint 5 완료 2026-03-10 / Sprint 5.1 완료 2026-03-10)

### 목표
GitHub 저장소 데이터 수집 및 Claude API 기반 자동 평가를 구현하고, 결과 대시보드를 실제 데이터로 연결한다.

### 작업 목록

#### Sprint 5.1: 평가 엔진 보완 및 UX 개선 (5.1주차) — ✅ 완료 (2026-03-10)

- ✅ **T5.1-1. GitHub API 배치 순차 실행**: Promise.all → 순차 실행으로 동시 요청 수 제한
- ✅ **T5.1-2. Dead Code 제거**: progressMap, getProgress 제거
- ✅ **T5.1-3. 재평가 제거 + done 제외 필터**: re-evaluate API 삭제, done 건 평가 제외
- ✅ **T5.1-4. 평가 리셋 API + UI**: POST /api/sessions/[id]/evaluate/reset 신규 구현
- ✅ **T5.1-5. AI 평가 모델 선택**: haiku/sonnet 선택 UI + API 파라미터 전달
- ✅ **T5.1-6. 마크다운 렌더링**: react-markdown + @tailwindcss/typography prose 클래스 적용

#### Sprint 5: 데이터 수집 + AI 평가 (5주차) — ✅ 완료 (2026-03-10)

- ✅ **T3-1. GitHub 저장소 데이터 수집 엔진** (복잡도: L) [FR-008]
  - Octokit으로 저장소 데이터 수집 모듈 구현
    - 파일/폴더 구조 (tree)
    - README.md, PRD.md, CLAUDE.md 등 문서 파일 내용
    - 주요 소스 코드 파일 (확장자 기반 필터링: .ts, .tsx, .js, .py 등)
    - package.json, requirements.txt 등 의존성 파일
    - 커밋 히스토리 요약 (최근 50개 커밋 메시지, 총 커밋 수)
  - 파일 우선순위 정의: 문서 > 설정 > 핵심 컴포넌트 > 기타 [FR-008, 8.3]
  - 토큰 한도 관리: 파일당 최대 라인 수 제한, 전체 토큰 추정
  - Rate limit 대응: 429 응답 시 Retry-After 헤더 기반 대기 후 재시도
  - 수집 실패 시 해당 제출 건 status를 "error"로 변경, 사유 기록
  - 수집 데이터를 Submission.collected_data (JSON)에 저장
  - 검증: 실제 public repo 1개에 대해 데이터 수집 성공, JSON 구조 확인

- ✅ **T3-2. AI 평가 프롬프트 설계 및 구현** (복잡도: L) [FR-010, FR-011]
  - Claude API 호출 모듈 구현 (Anthropic SDK)
  - 평가 프롬프트 설계 (PRD 섹션 8 기반):
    - 시스템 프롬프트: 평가자 역할, 루브릭 전문, JSON 출력 포맷
    - 유저 프롬프트: 수집된 저장소 데이터 (파일 구조, 문서, 코드)
  - 기본 평가 기준 4개 대항목 + 세부 항목 구현 (배포 보너스 제외, Phase 4에서 추가)
  - 응답 파싱: JSON 출력에서 항목별 점수 + reasoning 추출
  - Score 테이블에 항목별 점수 저장, Submission에 total_score/base_score 업데이트
  - temperature 0 설정으로 일관성 확보
  - 검증: 실제 repo 1개에 대해 평가 실행, 점수 및 근거 생성 확인

- ✅ **T3-3. 일괄 평가 실행 + 진행률 표시** (복잡도: L) [FR-010]
  - `POST /api/sessions/[id]/evaluate` - 일괄 평가 시작
  - 병렬 3개 노드로 동시 평가 (Promise.allSettled + 동시성 제한)
  - 실시간 진행률 표시: Server-Sent Events (SSE) 또는 폴링
    - "3/30 데이터 수집 중", "12/30 평가 완료" 등
  - 부분 실패 시 성공 건 결과 보존, 실패 건 별도 표시
  - 개별 프로젝트 단위 재평가 API: `POST /api/submissions/[id]/re-evaluate`
  - 프론트엔드: 평가 실행 버튼 클릭 -> 진행률 바 표시 -> 완료 알림
  - 검증: 목업 5건에 대해 일괄 평가 실행, 진행률 표시, 부분 실패 처리

#### Sprint 6: 결과 대시보드 실데이터 연결 (6주차)

- ⬜ **T3-4. 전체 순위표 API 연결** (복잡도: M) [FR-012]
  - `GET /api/sessions/[id]/rankings` - 총점 기준 순위 데이터
  - 항목별 정렬 지원 (쿼리 파라미터)
  - 배포 보너스 포함/미포함 토글 지원
  - Phase 1 목업 UI를 실제 API로 교체
  - 검증: 순위표에 실제 평가 데이터 표시, 정렬/토글 동작

- ⬜ **T3-5. 개별 상세 리포트 API 연결** (복잡도: M) [FR-013]
  - `GET /api/submissions/[id]/report` - 상세 리포트 데이터
  - 항목별 점수, 세부 항목 점수, 평가 근거 포함
  - Recharts 레이더 차트에 실제 데이터 바인딩
  - 검증: 상세 리포트에 실제 점수 + 근거 표시, 레이더 차트 정상 렌더링

- ⬜ **T3-6. 참가자 결과 조회 연결** (복잡도: S) [FR-014]
  - `GET /api/sessions/[id]/submissions/check` 응답에 점수 데이터 포함
  - 관리자 "결과 공개" 토글 활성화 후에만 점수 반환
  - 참가자에게는 본인 점수 + 근거만 표시 (순위/타인 정보 비공개)
  - 검증: 결과 공개 전/후 참가자 이름+이메일 조회 결과 차이 확인

- ⬜ **T3-7. 평가 상태 관리 및 에러 복구** (복잡도: M)
  - 제출 건별 상태 전이: submitted -> collecting -> evaluating -> done / error
  - 에러 발생 시 상세 에러 메시지 저장 및 관리자 화면 표시
  - 개별 재평가 버튼 UI + API 연결
  - 검증: 에러 발생 시 관리자가 사유를 확인하고 재평가 실행 가능

### 완료 기준 (Definition of Done)
- ✅ GitHub 저장소 데이터를 자동으로 수집하여 DB에 저장
- ✅ Claude API로 저장소를 평가하여 항목별 점수 + 근거 생성
- ✅ 병렬 3개 동시 평가, 진행률 실시간 표시
- ✅ 순위표에 실제 평가 결과 표시, 항목별 정렬 동작
- ✅ 개별 상세 리포트에 레이더 차트 + 평가 근거 표시
- ✅ 참가자 결과 조회가 "결과 공개" 토글에 따라 동작
- ✅ 부분 실패 시 성공 건 보존, 개별 재평가 가능
- ✅ 단일 저장소 평가 완료 180초 이내

### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증 (사전에 제출 데이터 존재 필요)

**AI 평가 실행 검증:**
1. `browser_navigate` -> `http://localhost:3000/admin/session/{sessionId}` 접속
2. `browser_snapshot` -> 제출 목록 및 "평가 실행" 버튼 확인
3. `browser_click` -> "평가 실행" 버튼 클릭
4. `browser_wait_for` -> 진행률 표시 텍스트 대기 (예: "1/5 평가 완료")
5. `browser_snapshot` -> 진행률 바 및 상태 변화 확인
6. `browser_wait_for` -> "평가 완료" 메시지 대기 (timeout 적절히 설정)
7. `browser_snapshot` -> 제출 목록의 상태가 "평가완료"로 변경 확인

**순위표 검증:**
1. `browser_navigate` -> 순위표 페이지 접속
2. `browser_snapshot` -> 순위표에 실제 점수 데이터 표시 확인
3. `browser_click` -> 항목별 정렬 헤더 클릭
4. `browser_snapshot` -> 정렬 순서 변경 확인
5. `browser_click` -> 배포 보너스 토글
6. `browser_snapshot` -> 순위 변동 확인

**상세 리포트 검증:**
1. `browser_click` -> 특정 프로젝트 상세 리포트 링크 클릭
2. `browser_snapshot` -> 항목별 점수, 레이더 차트, 평가 근거 텍스트 확인

**참가자 결과 조회 검증:**
1. `browser_navigate` -> `/check/{sessionId}` 접속
2. `browser_fill_form` -> 이름 + 이메일 입력
3. `browser_click` -> 조회 버튼
4. `browser_snapshot` -> 결과 공개 전: 점수 미표시 확인
5. (관리자 화면에서 결과 공개 토글 활성화 후)
6. `browser_snapshot` -> 결과 공개 후: 점수 + 근거 표시 확인

**공통 검증:**
- `browser_console_messages(level: "error")` -> 콘솔 에러 없음
- `browser_network_requests` -> API 호출 성공(2xx) 확인

### 기술 고려사항
- Claude API 호출 시 `@anthropic-ai/sdk` 사용, API 키는 `ANTHROPIC_API_KEY` 환경 변수
- 병렬 평가: `p-limit` 또는 직접 구현한 동시성 제한 (최대 3개)
- SSE 방식 진행률: Next.js API Route에서 `ReadableStream` 반환
- 저장소 데이터 수집 시 파일 크기 제한 (단일 파일 최대 500줄, 전체 최대 10만 토큰 추정)
- Claude API temperature: 0으로 설정하여 재현성 확보

---

## Phase 4: 배포 보너스 + 행운상 + 확장 기능 (Sprint 7-8, 2주)

### 📋 상태: 예정

### 목표
배포 URL 스크린샷 캡처 및 Vision 기반 시각적 평가(배포 보너스), 행운상 추첨 기능, 그리고 나머지 확장 기능을 구현하여 전체 시스템을 완성한다.

### 작업 목록

#### Sprint 7: 배포 보너스 + 행운상 (7주차)

- ⬜ **T4-1. 배포 URL 스크린샷 캡처** (복잡도: L) [FR-009]
  - Playwright 기반 스크린샷 캡처 모듈 구현
    - 데스크톱 뷰포트 (1280x800) + 모바일 뷰포트 (390x844)
    - 페이지 로드 후 3초 대기
    - 캡처 이미지 저장 (로컬 파일 시스템 또는 public 디렉토리)
  - 배포 URL 접근 실패 시 (404, 타임아웃 등) 사유 기록
  - Submission.screenshots JSON 필드에 이미지 경로 저장
  - 검증: 실제 배포 URL 1개에 대해 데스크톱/모바일 스크린샷 캡처 성공

- ⬜ **T4-2. Vision 기반 시각적 평가 (배포 보너스)** (복잡도: M) [FR-011-1]
  - Claude API Vision 입력으로 스크린샷 전달
  - 배포 보너스 평가 프롬프트 설계:
    - 배포 가점 (3점): URL 접근 가능 여부 (pass/fail)
    - 시각적 완성도 (7점): 레이아웃, 색상/타이포그래피, 시각적 계층, 모바일 대응
  - 기존 평가 결과에 bonus_score 추가 저장
  - Submission.total_score = base_score + bonus_score 업데이트
  - 상세 리포트에 스크린샷 이미지 표시
  - 검증: 배포 URL이 있는/없는 프로젝트에 대해 보너스 점수 차이 확인

- ⬜ **T4-3. 배포 보너스 토글 반영** (복잡도: S)
  - 순위표에서 배포 보너스 포함/미포함 토글 시 순위 재계산
  - 상세 리포트에 배포 보너스 섹션 추가 (스크린샷 + Vision 평가 근거)
  - 검증: 토글 전환 시 순위 변동 확인

- ⬜ **T4-4. 행운상 랜덤 추첨** (복잡도: L) [FR-016]
  - `/admin/session/[sessionId]/lucky-draw` 페이지 구현
  - 추첨 설정 UI:
    - 당첨 인원 수 입력
    - 추첨 대상 범위 선택: 전체 제출자 / 평가 대상자만 / 점수 하위 N%
    - 실력 기반 수상자 제외 옵션 (체크박스로 특정 참가자 제외)
  - 추첨 API: `POST /api/sessions/[id]/lucky-draw`
    - 조건에 맞는 참가자 풀에서 랜덤 선택
    - 추첨 결과 DB 저장 (추첨 이력 관리)
  - 추첨 애니메이션 UI:
    - 슬롯머신 또는 룰렛 방식 애니메이션 (CSS animation + JS)
    - 전체화면 모드 지원 (프레젠테이션용)
    - 당첨자 발표 연출 (이름 표시)
  - 재추첨 기능
  - 검증: 추첨 설정 -> 애니메이션 -> 결과 표시 -> 재추첨 흐름 확인

#### Sprint 8: 확장 기능 + 마무리 (8주차)

- ⬜ **T4-5. 평가 기준 커스터마이징 UI** (복잡도: M) [FR-003]
  - 세션 생성/수정 시 평가 기준 편집 폼
  - 대항목별 배점 수정, 세부 항목 수정, 루브릭 텍스트 편집
  - 수정된 기준은 세션의 criteria_config (JSON)에 저장
  - 평가 실행 시 해당 세션의 커스텀 기준 사용
  - 검증: 기준 수정 후 평가 실행 시 수정된 기준 반영 확인

- ⬜ **T4-6. PDF 리포트 생성** (복잡도: M) [FR-015]
  - 전체 결과 PDF 내보내기 (순위표 + 항목별 점수)
  - 개별 프로젝트 PDF 리포트 (상세 점수 + 근거 + 레이더 차트)
  - 검증: PDF 다운로드 및 내용 정확성 확인

- ⬜ **T4-7. 성능 최적화 및 마무리** (복잡도: M)
  - Lighthouse 성능 점수 90+ 달성 목표
  - 이미지 최적화 (스크린샷 압축, lazy loading)
  - API 응답 시간 점검 및 필요 시 인덱스 추가
  - 전체 E2E 흐름 최종 테스트
  - 검증: Lighthouse 점수 측정, 전체 흐름 이상 없음

- ⬜ **T4-8. 배포 준비** (복잡도: S)
  - Vercel 배포 설정 또는 로컬 실행 가이드 문서화
  - 환경 변수 설정 가이드 (GITHUB_TOKEN, ANTHROPIC_API_KEY, ADMIN_PASSWORD 등)
  - 운영 체크리스트 작성
  - 검증: 배포 환경에서 전체 기능 동작 확인

### 완료 기준 (Definition of Done)
- ✅ 배포 URL이 있는 프로젝트에 대해 스크린샷 캡처 + Vision 평가 동작
- ✅ 배포 보너스 포함/미포함 순위 토글 정상 동작
- ✅ 행운상 추첨 애니메이션이 전체화면에서 동작
- ✅ 평가 기준 커스터마이징 후 평가 실행 시 반영됨
- ✅ PDF 리포트 생성 및 다운로드 가능
- ✅ Lighthouse 성능 점수 90+
- ✅ 배포 환경에서 전체 E2E 흐름 정상 동작

### 🧪 Playwright MCP 검증 시나리오
> `npm run dev` 실행 후 아래 순서로 검증

**배포 보너스 검증:**
1. `browser_navigate` -> 관리자 세션 상세 페이지 접속
2. `browser_click` -> "평가 실행" 버튼 (배포 URL이 있는 제출 건 포함)
3. `browser_wait_for` -> 평가 완료 대기
4. `browser_navigate` -> 순위표 페이지
5. `browser_snapshot` -> 배포 보너스 점수 표시 확인
6. `browser_click` -> 배포 보너스 토글
7. `browser_snapshot` -> 순위 변동 확인
8. `browser_click` -> 배포 URL이 있는 프로젝트 상세 리포트
9. `browser_snapshot` -> 스크린샷 이미지 + Vision 평가 근거 표시 확인

**행운상 추첨 검증:**
1. `browser_navigate` -> `/admin/session/{sessionId}/lucky-draw` 접속
2. `browser_snapshot` -> 추첨 설정 UI 확인
3. `browser_type` -> 당첨 인원 수 입력
4. `browser_select_option` -> 추첨 대상 범위 선택
5. `browser_click` -> "추첨 시작" 버튼
6. `browser_wait_for` -> 애니메이션 완료 대기
7. `browser_snapshot` -> 당첨자 이름 표시 확인
8. `browser_click` -> "재추첨" 버튼
9. `browser_snapshot` -> 새로운 당첨자 확인

**평가 기준 커스터마이징 검증:**
1. `browser_navigate` -> 세션 생성/편집 페이지
2. `browser_snapshot` -> 평가 기준 편집 폼 확인
3. `browser_type` -> 배점 수정
4. `browser_click` -> 저장
5. `browser_network_requests` -> API 저장 성공 확인

**PDF 내보내기 검증:**
1. `browser_navigate` -> 결과 대시보드
2. `browser_click` -> "PDF 내보내기" 버튼
3. `browser_network_requests` -> PDF 다운로드 요청 확인

**공통 검증:**
- `browser_console_messages(level: "error")` -> 콘솔 에러 없음
- `browser_network_requests` -> 모든 API 호출 2xx 응답

### 기술 고려사항
- Playwright 서버 사이드 실행: Next.js API Route 내에서 headless browser 실행
- 스크린샷 이미지: `public/screenshots/` 디렉토리에 저장 또는 Base64로 DB 저장
- Vision 평가: Claude API 메시지에 이미지를 base64로 첨부
- PDF 생성: `@react-pdf/renderer` 또는 `puppeteer`로 HTML -> PDF 변환
- 행운상 애니메이션: CSS keyframes + requestAnimationFrame, Framer Motion 활용 가능

---

## ⚠️ 리스크 및 완화 전략

| 리스크 | 영향도 | 발생 가능성 | 완화 전략 |
|--------|--------|-------------|-----------|
| GitHub API rate limit (5,000 req/hr) | 높음 | 중간 | 인증 토큰 사용, 수집 데이터 캐싱, 필수 파일만 우선 수집 |
| Claude API 응답 일관성 부족 | 중간 | 중간 | temperature 0, 상세 루브릭, 출력 포맷 강제 (JSON mode) |
| Claude API 토큰 한도 초과 | 중간 | 높음 | 파일 우선순위 기반 선별적 포함, 파일당 최대 라인 제한 |
| 배포 URL 접근 실패 | 낮음 | 높음 | 배포 보너스 0점 처리, 사유 기록, 코드 기반 100점 만점 평가 |
| Playwright 서버 사이드 실행 환경 제약 | 중간 | 중간 | Vercel 배포 시 Serverless Function 제한 확인, 필요 시 별도 서비스 분리 |
| 대량 저장소 일괄 평가 시 타임아웃 | 중간 | 중간 | 백그라운드 작업 큐 구현, SSE 진행률 표시, 건별 재시도 |
| 참가자 사칭 제출 | 낮음 | 낮음 | 이메일 기반 간이 인증, 관리자 제출 목록 검토 |

---

## 📈 마일스톤

| 마일스톤 | 목표일 | 설명 | Phase |
|----------|--------|------|-------|
| M1: 프론트엔드 UI 완성 | 2주차 (Sprint 2 종료) | 모든 화면 목업 데이터로 렌더링, 사용자 피드백 수집 가능 | Phase 1 |
| M2: MVP 릴리스 | 4주차 (Sprint 4 종료) | 제출 -> 관리 흐름 동작, CSV 내보내기, 배포 가능 | Phase 2 |
| M3: AI 평가 동작 | 6주차 (Sprint 6 종료) | 자동 평가 + 결과 대시보드 + 참가자 결과 조회 | Phase 3 |
| M4: 전체 기능 완성 | 8주차 (Sprint 8 종료) | 배포 보너스 + 행운상 + PDF + 성능 최적화 | Phase 4 |

---

## 🔮 향후 계획 (Backlog) - Phase 2 확장 (PRD 기준)

아래 항목은 MVP 이후 필요에 따라 추가 스프린트에서 구현한다.

- ⏸️ **심사위원 수동 점수 병합**: AI 점수 + 사람 점수 가중 평균 (PRD Phase 2)
- ⏸️ **평가 히스토리 관리**: 동일 프로젝트 재평가 이력 비교 (PRD Phase 2)
- ⏸️ **알림 시스템**: 제출 완료/평가 완료 시 이메일 또는 슬랙 알림
- ⏸️ **다중 세션 비교**: 여러 해커톤 세션 간 결과 비교 분석
- ⏸️ **참가자 대시보드 강화**: 평가 근거에 대한 참가자 피드백 기능

---

## 기술 부채 관리

| 항목 | 발생 시점 | 해결 시점 | 설명 |
|------|-----------|-----------|------|
| 목업 데이터 제거 | Phase 1 | Phase 2 완료 시 | `/lib/mock-data.ts` 파일 및 목업 참조 코드 제거 |
| 에러 바운더리 보강 | Phase 2 | Phase 4 (T4-7) | 전체 페이지 에러 바운더리 및 에러 로깅 추가 |
| API 응답 타입 정합성 | Phase 2-3 | Phase 4 (T4-7) | API 응답과 프론트엔드 타입 일관성 점검 |
| 테스트 코드 작성 | 전 Phase | Phase 4 이후 | 핵심 비즈니스 로직 단위 테스트 추가 |
