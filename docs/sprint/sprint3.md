# Sprint 3: API 구현 + 참가자 기능 연결

## 스프린트 정보

- **기간**: 2026-03-17 ~ 2026-03-23 (1주)
- **목표**: Next.js API Routes 기반 백엔드 구현 + 프론트엔드 연결 — 참가자 제출, 관리자 인증, 세션 CRUD, GitHub URL 검증을 실제 DB와 연결하여 MVP의 참가자 흐름을 완성한다.
- **브랜치**: `sprint3`
- **Phase**: Phase 2 - 백엔드 API + 핵심 기능 연결 (MVP 완성)
- **상태**: ✅ 완료 (2026-03-10)

---

## 프로젝트 구조 (Sprint 3 신규/수정 파일)

```
src/
  app/
    api/
      auth/
        admin/
          route.ts                          # 관리자 인증 API (T3-2) [신규]
      sessions/
        route.ts                            # 세션 목록 조회 + 생성 API (T3-3) [신규]
        [id]/
          route.ts                          # 세션 상세 조회 + 수정 API (T3-3) [신규]
          submissions/
            route.ts                        # 참가자 제출 생성/수정 API (T3-4) [신규]
            check/
              route.ts                      # 참가자 본인 제출 조회 API (T3-4) [신규]
      validate/
        github-url/
          route.ts                          # GitHub URL 실시간 검증 API (T3-5) [신규]
    submit/[sessionId]/
      page.tsx                              # 제출 폼: mock → API 연결 (T3-4) [수정]
    check/[sessionId]/
      page.tsx                              # 확인 페이지: mock → API 연결 (T3-4) [수정]
    admin/
      layout.tsx                            # 인증 가드: sessionStorage → JWT 쿠키 (T3-2) [수정]
      page.tsx                              # 로그인 페이지 (T3-2) [수정]
      dashboard/
        page.tsx                            # 대시보드: mock → API 연결 (T3-3) [수정]
      session/[sessionId]/
        page.tsx                            # 세션 상세: mock → API 연결 (T3-3) [수정]
  components/
    admin/
      LoginForm.tsx                         # 인증: sessionStorage → API 연결 (T3-2) [수정]
  lib/
    api-utils.ts                            # 공통 응답 포맷, withAdminAuth, parseBody (T3-1) [신규]
    auth-server.ts                          # bcrypt 해시 검증 + JWT 발급 (서버 전용) (T3-2) [신규]
    auth.ts                                 # 클라이언트 인증 헬퍼 (쿠키 기반으로 수정) (T3-2) [수정]
    validations.ts                          # 세션/제출 zod 스키마 추가 (T3-3, T3-4) [수정]
.env.local                                  # 환경 변수 추가 (T3-2) [수정 — git 미추적]
.env.example                                # 환경 변수 템플릿 추가 (T3-2) [수정]
```

---

## 작업 목록

### T3-1. API Route 기반 구조 설계 (복잡도: S)

**목표**: API Route 전반에서 재사용할 공통 유틸리티를 `src/lib/api-utils.ts`에 집중 구현하여 각 엔드포인트가 비즈니스 로직에 집중할 수 있는 기반을 만든다.

**구현 범위**:
- ⬜ `src/lib/api-utils.ts` 신규 생성
  - `successResponse(data, status?)` — `{ success: true, data }` 형태의 `NextResponse` 반환
  - `errorResponse(message, status?)` — `{ success: false, error: message }` 형태의 `NextResponse` 반환
  - `withAdminAuth(handler)` — 쿠키의 JWT 검증 후 유효하면 handler 실행, 아니면 401 반환
  - `parseBody<T>(request)` — `request.json()` 파싱 + 예외 처리 (잘못된 JSON → 400 반환)
  - 공통 HTTP 상태 코드 상수 (`HTTP_STATUS`)

**기술 접근 방법**:
- `NextResponse`를 직접 import하여 응답 생성
- `withAdminAuth`는 `jose` 또는 `jsonwebtoken` 패키지로 JWT 검증 (T3-2에서 발급 구조 확정 후 연동)
- TypeScript 제네릭으로 타입 안전성 확보: `parseBody<T>(request: Request): Promise<T>`

**완료 기준**:
- ⬜ `api-utils.ts`가 빌드 에러 없이 컴파일됨
- ⬜ `successResponse`, `errorResponse` 함수가 올바른 JSON 구조를 반환함
- ⬜ `withAdminAuth` 래퍼가 존재하며 JWT 검증 로직 포함 (T3-2 연동 전 stub 허용)

---

### T3-2. 관리자 인증 API (복잡도: S)

**목표**: 하드코딩 비밀번호(`admin1234`) 방식을 환경 변수 + bcrypt + JWT 기반 인증으로 교체하고, 이후 모든 관리자 API에서 `withAdminAuth`로 보호할 수 있는 인증 체계를 구축한다.

**구현 범위**:

- ⬜ **패키지 설치**: `npm install bcryptjs jsonwebtoken` / `npm install -D @types/bcryptjs @types/jsonwebtoken`

- ⬜ `.env.local` 환경 변수 추가 (git 미추적 파일이므로 수동 추가 안내)
  ```
  ADMIN_PASSWORD_HASH=<bcrypt hash of admin1234>
  JWT_SECRET=<32자 이상의 무작위 문자열>
  ```

- ⬜ `.env.example` 업데이트
  ```
  ADMIN_PASSWORD_HASH=<bcrypt hash — npx ts-node -e "const b=require('bcryptjs');console.log(b.hashSync('admin1234',10))" 으로 생성>
  JWT_SECRET=<32자 이상의 무작위 문자열>
  ```

- ⬜ `src/lib/auth-server.ts` 신규 생성 (서버 전용 — 클라이언트에서 절대 import 불가)
  - `verifyAdminPassword(password: string): Promise<boolean>` — bcrypt.compare로 환경 변수 해시와 비교
  - `signAdminToken(): string` — JWT 발급 (payload: `{ role: 'admin' }`, 만료: 8h)
  - `verifyAdminToken(token: string): boolean` — JWT 검증

- ⬜ `src/app/api/auth/admin/route.ts` 신규 생성
  - `POST /api/auth/admin` — body: `{ password: string }`
  - 성공: JWT를 `httpOnly` 쿠키(`admin_token`)에 설정 후 `successResponse({ ok: true })`
  - 실패: `errorResponse("비밀번호가 올바르지 않습니다", 401)`
  - zod로 body 검증 (`password: z.string().min(1)`)

- ⬜ `src/lib/api-utils.ts`의 `withAdminAuth` 완성 — `cookies().get('admin_token')` 값으로 `verifyAdminToken` 호출

- ⬜ `src/lib/auth.ts` 수정 — 클라이언트 인증 헬퍼를 sessionStorage 방식에서 쿠키 존재 여부 확인 방식으로 변경
  - `isAdminAuthenticated()`: `document.cookie`에 `admin_token` 쿠키 존재 여부 확인
  - `clearAdminAuth()`: `POST /api/auth/logout` 호출 또는 쿠키 만료 처리

- ⬜ `src/components/admin/LoginForm.tsx` 수정
  - `fetch('POST /api/auth/admin', { password })` 호출로 변경
  - 기존 sessionStorage 직접 설정 로직 제거
  - 에러 응답 메시지를 UI에 표시

- ⬜ `src/app/admin/layout.tsx` 수정 — 인증 가드를 쿠키 확인 방식으로 변경

**기술 접근 방법**:
- `auth-server.ts`는 서버 전용 코드 — 파일 상단에 `import 'server-only'` 추가 (또는 경로 규칙으로 분리)
- `next/headers`의 `cookies()`로 서버 사이드 쿠키 접근
- JWT 만료 시간: 8시간 (`expiresIn: '8h'`)
- httpOnly 쿠키로 XSS 방지

**완료 기준**:
- ⬜ 올바른 비밀번호 입력 → `POST /api/auth/admin` 200 응답 + `admin_token` 쿠키 설정
- ⬜ 틀린 비밀번호 입력 → 401 응답 + 오류 메시지 UI 표시
- ⬜ `withAdminAuth`로 감싼 API에 쿠키 없이 접근 시 401 반환
- ⬜ 새로고침 후에도 로그인 상태 유지 (쿠키 만료 전)
- ⬜ `npm run build` 빌드 성공

---

### T3-3. 세션 CRUD API (복잡도: M)

**목표**: 관리자가 평가 세션을 생성/조회/수정할 수 있는 API를 구현하고, 프론트엔드 대시보드와 세션 상세 페이지를 목업 데이터에서 실제 API 호출로 전환한다.

**구현 범위**:

- ⬜ `src/lib/validations.ts` 수정 — 세션 관련 zod 스키마 추가
  ```typescript
  export const createSessionSchema = z.object({
    name: z.string().min(1, "세션명을 입력해주세요").max(100),
    deadline: z.string().datetime("올바른 날짜 형식이 아닙니다"),
    description: z.string().max(500).optional(),
  });
  export const updateSessionSchema = z.object({
    deadline: z.string().datetime().optional(),
    closedAt: z.string().datetime().nullable().optional(),
    resultsPublished: z.boolean().optional(),
  });
  ```

- ⬜ `src/app/api/sessions/route.ts` 신규 생성
  - `GET /api/sessions` — 전체 세션 목록 반환 (최신순 정렬)
    - 각 세션에 `submissionCount` 포함 (Drizzle subquery)
    - `withAdminAuth`로 보호
  - `POST /api/sessions` — 세션 생성
    - body: `createSessionSchema` 검증
    - `id`: `nanoid()` 또는 `crypto.randomUUID()` 자동 생성
    - `withAdminAuth`로 보호

- ⬜ `src/app/api/sessions/[id]/route.ts` 신규 생성
  - `GET /api/sessions/[id]` — 세션 상세 + 제출 건수 반환
    - `withAdminAuth`로 보호
    - 존재하지 않는 세션 ID: 404 반환
  - `PATCH /api/sessions/[id]` — 세션 수정
    - body: `updateSessionSchema` 검증
    - `closedAt: new Date()` 설정으로 "즉시 마감" 구현
    - `withAdminAuth`로 보호

- ⬜ `src/app/admin/dashboard/page.tsx` 수정 — 관리자 대시보드 API 연결
  - `useEffect`에서 `GET /api/sessions` 호출
  - 로딩 스켈레톤 표시 (데이터 로딩 중)
  - 에러 상태 처리 (API 호출 실패 시 안내 메시지)
  - `CreateSessionModal` 저장 시 `POST /api/sessions` 호출 후 목록 갱신

- ⬜ `src/app/admin/session/[sessionId]/page.tsx` 수정 — 세션 상세 API 연결
  - `GET /api/sessions/[id]` 호출로 세션 정보 표시
  - "마감 연장" 버튼: `PATCH /api/sessions/[id]` + `{ deadline: newDeadline }` 호출
  - "즉시 마감" 버튼: `PATCH /api/sessions/[id]` + `{ closedAt: new Date().toISOString() }` 호출

**기술 접근 방법**:
- Drizzle ORM 쿼리: `db.select().from(evaluationSessions).orderBy(desc(evaluationSessions.createdAt))`
- 제출 건수 집계: `db.select({ count: count() }).from(submissions).where(eq(submissions.sessionId, id))`
- 클라이언트 데이터 페칭: `useState` + `useEffect` (tanstack-query는 T2-8 범위로 미루고, 이번 Sprint에서는 직접 fetch 사용)
- 날짜는 ISO 8601 문자열로 주고받고, 표시 시에만 `Intl.DateTimeFormat`으로 포맷

**완료 기준**:
- ⬜ `GET /api/sessions` → 세션 목록 + 제출 건수 응답
- ⬜ `POST /api/sessions` → 세션 생성 + DB 저장 확인 (SQLite 파일 직접 확인 또는 GET으로 재조회)
- ⬜ `GET /api/sessions/[id]` → 세션 상세 응답, 존재하지 않는 ID → 404
- ⬜ `PATCH /api/sessions/[id]` → 마감 연장 / 즉시 마감 적용 확인
- ⬜ 관리자 대시보드에서 실제 세션 데이터 렌더링 (목업 제거)
- ⬜ 세션 생성 후 목록 자동 갱신

---

### T3-4. 참가자 제출 API (복잡도: L)

**목표**: 참가자가 제출 폼을 통해 데이터를 DB에 저장하고, 이름+이메일로 본인 제출 내역을 조회할 수 있는 API를 구현하여 참가자 전체 흐름을 완성한다.

**구현 범위**:

- ⬜ `src/lib/validations.ts` 수정 — 제출 관련 zod 스키마 추가
  ```typescript
  export const createSubmissionSchema = z.object({
    name: z.string().min(2, "이름은 2자 이상 입력해주세요"),
    email: z.string().email("올바른 이메일 형식을 입력해주세요"),
    githubUrl: z.string().url().regex(/^https:\/\/github\.com\//, "GitHub URL 형식이 아닙니다"),
    deployUrl: z.string().url("올바른 URL 형식이 아닙니다").optional().or(z.literal("")),
  });
  export const checkSubmissionSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  });
  ```

- ⬜ `src/app/api/sessions/[id]/submissions/route.ts` 신규 생성
  - `POST /api/sessions/[id]/submissions` — 제출 생성 또는 수정 (upsert)
    - `createSubmissionSchema`로 body 검증
    - 세션 존재 여부 및 마감 여부 확인 (마감 후 제출 시 400 반환)
    - 동일 이메일 기존 제출 있으면 UPDATE, 없으면 INSERT (upsert)
    - 성공: 생성/수정된 submission 반환
  - 인증 불필요 (공개 엔드포인트)

- ⬜ `src/app/api/sessions/[id]/submissions/check/route.ts` 신규 생성
  - `GET /api/sessions/[id]/submissions/check?name=&email=` — 이름+이메일로 본인 제출 조회
    - 쿼리 파라미터로 `name`, `email` 수신
    - `checkSubmissionSchema`로 쿼리 파라미터 검증
    - 제출 내역 반환 (결과 공개 전에는 점수 필드 null)
    - 일치하는 제출 없으면 404 반환
  - 인증 불필요 (공개 엔드포인트)

- ⬜ `src/app/submit/[sessionId]/page.tsx` 수정 — 제출 폼 API 연결
  - 폼 제출 시 `POST /api/sessions/[sessionId]/submissions` 호출
  - 세션 정보는 `GET /api/sessions/[sessionId]`로 로드 (세션명, 마감일시, 안내 문구)
  - 마감 여부: API 응답의 `closedAt` 또는 `deadline` 기준으로 폼 비활성화
  - 제출 성공 시 완료 화면 표시 (제출 시각, 입력 내용 요약)
  - API 에러 시 오류 메시지 표시 (예: "마감된 세션입니다", "이미 제출하신 내역이 수정되었습니다")
  - 목업 데이터 import 제거

- ⬜ `src/app/check/[sessionId]/page.tsx` 수정 — 확인 페이지 API 연결
  - 이름+이메일 조회 시 `GET /api/sessions/[sessionId]/submissions/check?name=&email=` 호출
  - 제출 내역 표시 (제출 시각, GitHub URL, 배포 URL)
  - 마감 전: "수정하기" 버튼 → 제출 폼으로 이동 (이름/이메일 쿼리 파라미터로 전달)
  - 결과 공개 후: 항목별 점수 + 평가 근거 표시 (점수 데이터가 null이면 "평가 중" 표시)
  - 목업 데이터 import 제거

**기술 접근 방법**:
- Upsert 구현: `db.insert(submissions).values(...).onConflictDoUpdate({ target: [submissions.sessionId, submissions.email], set: { ... } })`
- 마감 여부 판단: `session.closedAt !== null || new Date(session.deadline) < new Date()`
- 결과 공개 여부: `session.resultsPublished === true` 일 때만 점수 반환
- 수정 흐름: check 페이지에서 수정 버튼 클릭 → submit 페이지로 이동 → 기존 제출 데이터 prefill (쿼리 파라미터로 이름/이메일 전달 → submit 페이지에서 check API 호출 후 기존 데이터 채워넣기)

**완료 기준**:
- ⬜ `POST /api/sessions/[id]/submissions` → 새 제출 DB 저장 확인
- ⬜ 동일 이메일 재제출 시 UPDATE (upsert) 동작 확인
- ⬜ 마감 후 제출 시 400 에러 + "마감된 세션입니다" 메시지
- ⬜ `GET /api/sessions/[id]/submissions/check` → 본인 제출 내역 반환
- ⬜ 이름+이메일 불일치 시 404 반환
- ⬜ 참가자 제출 폼에서 실제 DB 저장 + 완료 화면 표시
- ⬜ 참가자 확인 페이지에서 실제 제출 내역 조회 표시
- ⬜ 목업 데이터 import가 submit/check 페이지에서 제거됨

---

### T3-5. GitHub URL 실시간 검증 (복잡도: S)

**목표**: 참가자가 GitHub URL을 입력할 때 500ms debounce 후 서버 사이드에서 해당 저장소가 public으로 존재하는지 검증하는 UX를 제공한다.

**구현 범위**:

- ⬜ **패키지 설치**: `npm install @octokit/rest` (GitHub API 클라이언트)

- ⬜ `.env.example` 업데이트
  ```
  GITHUB_TOKEN=<GitHub Personal Access Token — public repo 접근 가능한 토큰>
  ```

- ⬜ `src/app/api/validate/github-url/route.ts` 신규 생성
  - `GET /api/validate/github-url?url=<githubUrl>` — GitHub API로 repo 존재/public 여부 확인
  - URL 파싱: `https://github.com/{owner}/{repo}` 형식에서 owner, repo 추출
  - Octokit으로 `GET /repos/{owner}/{repo}` 호출
    - 200 + `private: false` → `{ valid: true, message: "유효한 public 저장소입니다" }`
    - 200 + `private: true` → `{ valid: false, message: "private 저장소는 사용할 수 없습니다" }`
    - 404 → `{ valid: false, message: "저장소를 찾을 수 없습니다" }`
  - `GITHUB_TOKEN` 환경 변수 없을 때: 미인증 요청으로 폴백 (rate limit 낮음 — 경고 로그)
  - 인증 불필요 (공개 엔드포인트)
  - 캐시 헤더: `Cache-Control: max-age=60` (같은 URL 반복 요청 감소)

- ⬜ `src/app/submit/[sessionId]/page.tsx` 수정 — debounce 검증 UI 추가
  - GitHub URL 입력 필드에 debounce 로직 추가 (500ms)
  - 검증 상태 표시:
    - 입력 중(debounce 대기): 기본 상태
    - 검증 중: "검증 중..." 텍스트 + 스피너 아이콘
    - 유효: 초록 체크 아이콘 + "유효한 public 저장소입니다"
    - 무효: 빨간 X 아이콘 + 오류 메시지
  - 검증이 완료되지 않거나 무효인 경우 제출 버튼 비활성화
  - debounce 구현: `useRef` + `setTimeout` 조합 또는 `use-debounce` 패키지

**기술 접근 방법**:
- debounce: `npm install use-debounce` 또는 직접 구현 (`useRef<ReturnType<typeof setTimeout>>`)
- 검증 상태 타입: `'idle' | 'checking' | 'valid' | 'invalid'`
- URL 파싱: `new URL(githubUrl).pathname.split('/').filter(Boolean)` → `[owner, repo]`
- GitHub URL 형식이 아닌 경우 API 호출 없이 즉시 `invalid` 처리 (regex 사전 체크)

**완료 기준**:
- ⬜ `GET /api/validate/github-url?url=https://github.com/vercel/next.js` → `{ valid: true }` 응답
- ⬜ 존재하지 않는 저장소 URL → `{ valid: false, message: "저장소를 찾을 수 없습니다" }` 응답
- ⬜ private 저장소 URL → `{ valid: false, message: "private 저장소는 사용할 수 없습니다" }` 응답
- ⬜ 제출 폼에서 500ms 후 검증 API 호출 → 검증 결과 UI 표시
- ⬜ 검증 유효 상태에서만 제출 버튼 활성화

---

## 완료 기준 (Definition of Done)

- ✅ 참가자가 `/submit/[sessionId]`에서 실제 DB에 제출 데이터를 저장할 수 있다
- ✅ 참가자가 `/check/[sessionId]`에서 이름+이메일로 본인 제출 내역을 조회할 수 있다
- ✅ 관리자가 올바른 비밀번호로 로그인 시 JWT 쿠키가 발급되고 이후 API 호출에서 인증된다
- ✅ 관리자가 세션을 생성하고 대시보드에서 목록을 확인할 수 있다
- ✅ 관리자가 세션 마감일을 변경하거나 즉시 마감할 수 있다
- ✅ GitHub URL 입력 시 debounce 후 실시간 검증 결과가 표시된다
- ✅ 마감된 세션에 제출 시 400 에러와 안내 메시지가 표시된다
- ✅ `/submit`, `/check` 페이지에서 `mock-data.ts` import가 제거된다
- ✅ 모든 관리자 전용 API가 `withAdminAuth`로 보호된다
- ✅ `npm run build` 에러 없이 성공

---

## 진행 현황

| 태스크 | 상태 | 완료일 |
|--------|------|--------|
| T3-1. API Route 기반 구조 설계 | ✅ 완료 | 2026-03-10 |
| T3-2. 관리자 인증 API | ✅ 완료 | 2026-03-10 |
| T3-3. 세션 CRUD API | ✅ 완료 | 2026-03-10 |
| T3-4. 참가자 제출 API | ✅ 완료 | 2026-03-10 |
| T3-5. GitHub URL 실시간 검증 | ✅ 완료 | 2026-03-10 |

---

## 검증 결과

- [API 검증 보고서](sprint3/playwright-report.md)

---

## 파일 변경 요약

### 신규 생성 파일 (9개)

| 파일 | 태스크 | 설명 |
|------|--------|------|
| `src/lib/api-utils.ts` | T3-1 | 공통 API 유틸리티 (응답 포맷, 인증 래퍼) |
| `src/lib/auth-server.ts` | T3-2 | 서버 전용 인증 (bcrypt, JWT) |
| `src/app/api/auth/admin/route.ts` | T3-2 | 관리자 로그인 API |
| `src/app/api/sessions/route.ts` | T3-3 | 세션 목록 조회 + 생성 |
| `src/app/api/sessions/[id]/route.ts` | T3-3 | 세션 상세 조회 + 수정 |
| `src/app/api/sessions/[id]/submissions/route.ts` | T3-4 | 참가자 제출 생성/수정 (upsert) |
| `src/app/api/sessions/[id]/submissions/check/route.ts` | T3-4 | 참가자 본인 제출 조회 |
| `src/app/api/validate/github-url/route.ts` | T3-5 | GitHub URL 실시간 검증 |
| `.env.example` | T3-2, T3-5 | 환경 변수 템플릿 업데이트 |

### 수정 파일 (7개)

| 파일 | 태스크 | 변경 내용 |
|------|--------|-----------|
| `src/lib/auth.ts` | T3-2 | sessionStorage → 쿠키 기반 인증 헬퍼로 교체 |
| `src/lib/validations.ts` | T3-3, T3-4 | 세션/제출 zod 스키마 추가 |
| `src/components/admin/LoginForm.tsx` | T3-2 | API 호출로 교체, sessionStorage 직접 설정 제거 |
| `src/app/admin/layout.tsx` | T3-2 | 인증 가드를 쿠키 확인 방식으로 변경 |
| `src/app/admin/dashboard/page.tsx` | T3-3 | mock → `GET /api/sessions` 연결 |
| `src/app/admin/session/[sessionId]/page.tsx` | T3-3 | mock → `GET /api/sessions/[id]` 연결 |
| `src/app/submit/[sessionId]/page.tsx` | T3-4, T3-5 | mock 제거, 제출 API + GitHub 검증 연결 |
| `src/app/check/[sessionId]/page.tsx` | T3-4 | mock 제거, 제출 조회 API 연결 |

---

## 의존성 및 리스크

| 항목 | 내용 | 대응 방안 |
|------|------|-----------|
| Sprint 1+2 의존 | DB 스키마 및 UI 컴포넌트 완성 기반 | 이미 완료 — 의존성 충족 |
| bcryptjs, jsonwebtoken 패키지 | T3-2 시작 전 설치 필요 | `npm install bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken` |
| @octokit/rest 패키지 | T3-5 시작 전 설치 필요 | `npm install @octokit/rest` |
| .env.local 미생성 | 환경 변수 없으면 T3-2 API 500 에러 | sprint 시작 시 .env.local 생성 작업을 첫 번째로 수행 |
| GITHUB_TOKEN 미설정 | 시간당 60회 rate limit (미인증 요청) | 개발 중 충분, 단 토큰 설정 권장 |
| Drizzle onConflictDoUpdate | SQLite upsert 지원 여부 확인 필요 | Drizzle v0.29+ 지원 확인, 미지원 시 SELECT → INSERT/UPDATE 분기 처리 |
| 인증 방식 전환 리스크 | sessionStorage → 쿠키로 변경 시 기존 로그인 상태 초기화 | 새 Sprint 브랜치 작업이므로 하위호환 불필요, 명시적으로 로그인 재요구 |

---

## 기술 고려사항

- **서버/클라이언트 코드 분리**: `auth-server.ts`는 서버 전용 코드. 실수로 클라이언트 번들에 포함되지 않도록 파일명 규칙(`-server.ts`) 또는 `import 'server-only'` 지시어 사용
- **환경 변수 접근**: `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, `GITHUB_TOKEN`은 서버 사이드에서만 접근. `NEXT_PUBLIC_` 접두사 절대 사용 금지
- **upsert 처리**: 동일 이메일로 재제출 시 이전 데이터 덮어쓰기 — 마감 전에만 허용, 덮어쓰기 성공 시 HTTP 200 (신규 생성 시 201과 구분)
- **마감 판단 로직**: `session.closedAt !== null` (즉시 마감) 또는 `new Date(session.deadline) <= new Date()` (시간 경과) 중 하나라도 true면 마감 상태
- **GitHub URL 검증 캐싱**: 동일 URL의 반복 요청을 줄이기 위해 API 응답에 `Cache-Control: public, max-age=60` 헤더 추가
- **목업 데이터 제거 범위**: 이번 Sprint에서는 `submit`, `check`, 관리자 `dashboard`, `session` 페이지의 mock 참조만 제거. `mock-data.ts` 파일 자체는 Sprint 4 완료 시점(T2-6 이후)에 전면 정리 예정

---

## 검증 계획

### 자동 검증 (sprint-close 시점에 실행)

- ⬜ `npm run build` — TypeScript 컴파일 에러 없음 확인
- ⬜ API 동작 검증 (curl / fetch) — 서버 실행 중 아래 시나리오 실행:

  ```bash
  # T3-2: 관리자 인증
  curl -c cookies.txt -X POST http://localhost:3000/api/auth/admin \
    -H 'Content-Type: application/json' \
    -d '{"password":"admin1234"}' | jq .
  # 기대: {"success":true,"data":{"ok":true}}

  # T3-3: 세션 목록 조회 (인증 쿠키 사용)
  curl -b cookies.txt http://localhost:3000/api/sessions | jq .
  # 기대: {"success":true,"data":[...]}

  # T3-3: 세션 생성
  curl -b cookies.txt -X POST http://localhost:3000/api/sessions \
    -H 'Content-Type: application/json' \
    -d '{"name":"테스트 세션","deadline":"2026-12-31T23:59:00.000Z","description":"테스트"}' | jq .
  # 기대: {"success":true,"data":{"id":"...","name":"테스트 세션",...}}

  # T3-4: 참가자 제출
  curl -X POST http://localhost:3000/api/sessions/session-2026-spring/submissions \
    -H 'Content-Type: application/json' \
    -d '{"name":"홍길동","email":"hong@example.com","githubUrl":"https://github.com/vercel/next.js","deployUrl":""}' | jq .
  # 기대: {"success":true,"data":{"id":"...",...}}

  # T3-4: 본인 제출 조회
  curl "http://localhost:3000/api/sessions/session-2026-spring/submissions/check?name=홍길동&email=hong@example.com" | jq .
  # 기대: {"success":true,"data":{"name":"홍길동",...}}

  # T3-5: GitHub URL 검증
  curl "http://localhost:3000/api/validate/github-url?url=https://github.com/vercel/next.js" | jq .
  # 기대: {"valid":true,"message":"유효한 public 저장소입니다"}
  ```

### 수동 검증 필요

- ⬜ 관리자 로그인 → 대시보드 → 세션 생성 → 세션 상세 전체 흐름 (브라우저 UI)
- ⬜ 참가자 제출 폼 → GitHub URL 실시간 검증 UI → 제출 완료 화면 (브라우저 UI)
- ⬜ 참가자 확인 페이지 → 이름+이메일 조회 → 제출 내역 표시 (브라우저 UI)
- ⬜ 마감 후 제출 시도 → "마감된 세션입니다" 오류 메시지 표시 (브라우저 UI)

### Playwright MCP 검증 시나리오

> `npm run dev` 실행 후 아래 순서로 검증

**관리자 인증 API 연결 검증:**
1. `browser_navigate` -> `http://localhost:3000/admin` 접속
2. `browser_type` -> 올바른 비밀번호 입력 (`admin1234`)
3. `browser_click` -> 로그인 버튼
4. `browser_network_requests` -> `POST /api/auth/admin` 200 응답 확인
5. `browser_snapshot` -> `/admin/dashboard` 이동 + 실제 세션 데이터 표시 확인

**세션 생성 검증:**
1. `browser_click` -> "세션 생성" 버튼
2. `browser_fill` -> 세션명, 마감일시 입력
3. `browser_click` -> 저장 버튼
4. `browser_network_requests` -> `POST /api/sessions` 200 응답 확인
5. `browser_snapshot` -> 새 세션이 목록에 추가됨 확인

**참가자 제출 흐름 검증:**
1. `browser_navigate` -> `http://localhost:3000/submit/session-2026-spring` 접속
2. `browser_snapshot` -> 세션 정보 (실제 DB 데이터) 로딩 확인
3. `browser_fill` -> GitHub URL 입력 (`https://github.com/vercel/next.js`)
4. `browser_wait_for` -> 500ms debounce 후 "유효한 public 저장소입니다" 표시 대기
5. `browser_snapshot` -> 초록 체크 아이콘 + 검증 성공 메시지 확인
6. `browser_fill` -> 이름, 이메일 입력
7. `browser_click` -> 제출 버튼
8. `browser_network_requests` -> `POST /api/sessions/.../submissions` 200/201 응답 확인
9. `browser_snapshot` -> 제출 완료 화면 표시 확인

**참가자 확인 페이지 검증:**
1. `browser_navigate` -> `http://localhost:3000/check/session-2026-spring` 접속
2. `browser_fill` -> 위에서 제출한 이름 + 이메일 입력
3. `browser_click` -> 조회 버튼
4. `browser_network_requests` -> `GET /api/sessions/.../submissions/check` 200 응답 확인
5. `browser_snapshot` -> 제출 내역 (GitHub URL, 제출 시각) 표시 확인

**공통 검증:**
- `browser_console_messages(level: "error")` -> 모든 페이지에서 콘솔 에러 없음
- `browser_network_requests` -> 모든 API 호출 2xx 응답 확인
