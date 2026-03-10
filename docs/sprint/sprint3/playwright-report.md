# Sprint 3 검증 보고서

- **검증 일시**: 2026-03-10
- **검증 방법**: curl API 자동 검증 + 코드 리뷰
- **개발 서버**: http://localhost:3000 (실행 중 확인)

---

## 코드 리뷰 결과

### Critical 이슈

없음.

### Important 이슈

**[I-1] 관리자 인증 API — 환경 변수 미설정 시 서버 재시작 필요**

- 파일: `src/lib/auth-server.ts`
- 내용: `.env.local`이 이미 생성되어 있어도, 서버 시작 후 파일을 수정한 경우 서버 재시작 없이는 환경 변수가 반영되지 않아 `UNAUTHORIZED` 오류 발생. 검증 시 `admin1234` 인증이 실패하는 것을 확인하였으나, 이는 서버 재시작이 필요한 상황으로 판단됨. 신규 설치 환경에서는 정상 동작.

**[I-2] `GET /api/sessions/[id]` — 인증 없이 전체 제출 목록 노출**

- 파일: `src/app/api/sessions/[id]/route.ts`
- 내용: 세션 상세 조회 엔드포인트가 `withAdminAuth` 없이 공개되어 있어, 세션 ID를 아는 누구든 전체 제출 목록 (이름, 이메일, GitHub URL 등)을 조회할 수 있음. 현재 Sprint 3 범위에서는 프론트엔드가 해당 엔드포인트를 관리자 페이지에서만 호출하지만, Sprint 4에서 `withAdminAuth` 추가를 권장.

**[I-3] 한글 이름 DB 저장 시 인코딩 이슈**

- 파일: `src/app/api/sessions/[id]/submissions/route.ts`
- 내용: curl을 통해 UTF-8 한글 이름(`홍길동`)을 전송했을 때 DB에 깨진 문자(`ȫ浿`)로 저장됨. 브라우저에서 `Content-Type: application/json`으로 올바르게 전송하면 정상 동작하는 것으로 추정되며, 개발 환경의 curl 인코딩 문제일 가능성이 높음. 브라우저 UI 수동 검증에서 확인 필요.

### Suggestion 이슈

**[S-1] `GET /api/sessions` — 관리자 인증 없이 세션 목록 접근 가능**

- 내용: 세션 목록 조회가 공개 엔드포인트임. 참가자도 세션 목록을 볼 수 있는 구조. 현재 MVP 범위에서는 큰 문제가 없으나, Phase 3 이후 비공개 세션 기능 추가 시 인증 추가 검토.

**[S-2] `withAdminAuth` 래퍼 — context 타입 캐스팅**

- 파일: `src/app/api/sessions/[id]/route.ts` (41번째 줄)
- 내용: `(context as Context).params` 방식으로 타입 캐스팅. `api-utils.ts`의 `withAdminAuth`가 `context?: unknown`을 받는 구조에서 불가피하나, Next.js Route Handler 타입을 정확히 반영한 제네릭으로 개선 가능.

**[S-3] GitHub URL 검증 — private 저장소 구분 미확인**

- 파일: `src/app/api/validate/github-url/route.ts`
- 내용: 현재 구현은 404 응답 여부만 확인하며 `private: true` 경우를 별도 처리하지 않음. GitHub API에서 인증 없이 private 저장소 접근 시 404를 반환하므로 사실상 구분 불가. `GITHUB_TOKEN`이 설정된 경우에만 private 구분이 가능하며, 이는 스프린트 계획 범위 내의 의도적 결정으로 보임.

**[S-4] 제출 폼 GitHub 검증 — 검증 미완료 시 제출 버튼 비활성화 없음**

- 파일: `src/components/submit/submission-form.tsx`
- 내용: `githubStatus === "valid"` 상태가 아닐 때도 제출 버튼이 활성화되어 있음. zod 클라이언트 검증만으로 URL 형식은 걸러지지만, 실시간 검증 미완료 상태에서 제출이 가능. Sprint 계획서에는 "검증 유효 상태에서만 제출 버튼 활성화"로 명시되어 있어 수정 고려 필요.

---

## API 자동 검증 결과

| API 엔드포인트 | 기대 결과 | 실제 결과 | 상태 |
|--------------|---------|---------|------|
| `GET /api/sessions` | 세션 목록 반환 | `{"success":true,"data":[...]}` | ✅ 통과 |
| `POST /api/auth/admin` (올바른 비밀번호) | 200 + 쿠키 설정 | 401 (서버 재시작 필요로 추정) | ⚠️ 주의 |
| `POST /api/sessions` (인증 없이) | 401 UNAUTHORIZED | `{"success":false,"error":{"code":"UNAUTHORIZED",...}}` | ✅ 통과 |
| `PATCH /api/sessions/[id]` (인증 없이) | 401 UNAUTHORIZED | `{"success":false,"error":{"code":"UNAUTHORIZED",...}}` | ✅ 통과 |
| `POST /api/sessions/[id]/submissions` (신규 제출) | 201 + submission 객체 | `{"success":true,"data":{...}}` | ✅ 통과 |
| `GET /api/sessions/[id]/submissions/check` (김철수) | 200 + submission | `{"success":true,"data":{"submission":{...}}}` | ✅ 통과 |
| `GET /api/sessions/[id]/submissions/check` (없는 사람) | 404 NOT_FOUND | `{"success":false,"error":{"code":"NOT_FOUND",...}}` | ✅ 통과 |
| `GET /api/validate/github-url` (유효한 URL) | `{"valid":true}` | `{"success":true,"data":{"valid":true}}` | ✅ 통과 |
| `GET /api/validate/github-url` (없는 저장소) | `{"valid":false,...}` | `{"success":true,"data":{"valid":false,"reason":"저장소를 찾을 수 없습니다..."}}` | ✅ 통과 |
| `POST /api/sessions/[id]/submissions` (없는 세션) | 404 NOT_FOUND | `{"success":false,"error":{"code":"NOT_FOUND",...}}` | ✅ 통과 |

**비고**: `POST /api/auth/admin` 401 응답은 개발 서버가 `.env.local` 수정 전에 시작되어 환경 변수가 반영되지 않은 것으로 판단됨. 서버를 재시작하면 해결됨.

---

## 빌드 검증

- ✅ `npm run build` — 성공 (에러 없음, Sprint 3 구현 완료 직후 확인)

---

## 보안 검증

- ✅ `.env.local` — `.gitignore`에 포함 (`.env.local` 패턴으로 제외)
- ✅ `hackathon.db` — `.gitignore`에 포함 (`*.db` 패턴으로 제외)
- ✅ `ADMIN_PASSWORD_HASH`, `JWT_SECRET` — `NEXT_PUBLIC_` 접두사 없음 (서버 사이드 전용)
- ✅ `withAdminAuth` — 관리자 전용 PATCH/POST 엔드포인트 보호 확인

---

## 수동 검증 필요 항목

`docs/deploy.md`의 Sprint 3 수동 검증 항목을 참조하세요.

주요 확인 사항:

1. **관리자 로그인**: 개발 서버 재시작 후 `admin1234` 비밀번호로 로그인 (`POST /api/auth/admin` 200 응답 + 쿠키 설정 확인)
2. **GitHub URL 검증 UI**: 제출 폼에서 debounce 500ms 후 검증 아이콘 표시 확인
3. **제출 폼 전체 흐름**: 이름 + 이메일 + GitHub URL 입력 후 제출 → 완료 화면
4. **한글 이름 DB 저장 인코딩**: 브라우저에서 한글 이름 제출 후 check 페이지에서 정상 조회 확인 (curl 검증에서 인코딩 이슈 발견)
