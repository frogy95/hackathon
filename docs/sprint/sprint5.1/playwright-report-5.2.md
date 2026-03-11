# Sprint 5.2 검증 보고서

- **작성일**: 2026-03-11
- **브랜치**: sprint5.1
- **빌드 상태**: `npm run build` 성공

---

## 자동 검증 완료 (2026-03-11)

### 빌드 검증

- ✅ `npm run build` — 빌드 성공, TypeScript 오류 없음
- ✅ 모든 라우트 인식 확인 (총 14개 서버 렌더링 라우트)

### 스키마 및 시드 검증

- ✅ `npx drizzle-kit push` — `jobRole`, `checkPassword` 컬럼 추가 완료 (사용자 보고)
- ✅ `npx tsx src/db/seed.ts` — 10건 시드 데이터 jobRole/checkPassword 포함 완료 (사용자 보고)

### API 검증 (dev 서버 실행 중)

**제출 생성 — jobRole + checkPassword 저장:**

- ✅ `POST /api/sessions/session-2026-spring/submissions` (`jobRole:"QA"`, `checkPassword:"1234"`) — 201 반환, 응답에 `jobRole:"QA"`, `checkPassword:"1234"` 포함 확인

**조회 API — 이메일 + checkPassword 매칭:**

- ✅ `GET .../submissions/check?email=testqa@example.com&checkPassword=1234` — 200 반환, `jobRole:"QA"` 확인
- ✅ 잘못된 checkPassword(`9999`) 조회 — 404 반환 확인

**유효성 검증:**

- ✅ `jobRole` 누락 제출 — `VALIDATION_ERROR` 반환 확인
- ✅ `checkPassword` 누락 제출 — `VALIDATION_ERROR` 반환 확인
- ✅ `GET /api/sessions/.../submissions` (인증 없이) — 401 반환 확인

**제출 목록 `jobRole` 필드:**

- ✅ 관리자 제출 목록 API 응답에 `jobRole` 필드 정상 포함 확인 (개발, 디자인, QA 등)

---

## 수동 검증 필요 항목

`npm run dev` 실행 상태에서 브라우저로 직접 확인하세요.

### 1. 제출 폼 — 직군 선택 + 조회 비밀번호

`/submit/session-2026-spring` 접속:

- ⬜ 직군 선택 드롭다운이 표시되는지 확인 (PM/기획, 디자인, 개발, QA)
- ⬜ 직군 미선택 시 폼 제출 불가 (유효성 오류 메시지 표시)
- ⬜ 조회 비밀번호 필드(숫자 4자리)가 표시되는지 확인
- ⬜ 4자리가 아닌 입력 시 유효성 오류 메시지 표시 확인
- ⬜ 모든 필드 입력 후 제출 성공 확인

### 2. 조회 페이지 — 이메일 + 조회비밀번호

`/check/session-2026-spring` 접속:

- ⬜ 이름 필드가 없고 이메일 + 조회 비밀번호만 표시되는지 확인
- ⬜ `kimcs@example.com` + `1234` 입력 → 제출 내역 조회 확인 (시드 데이터 checkPassword 확인 필요)
- ⬜ 잘못된 조회 비밀번호 → "제출 내역을 찾을 수 없습니다" 표시 확인

### 3. 관리자 제출 목록 — 직군 컬럼

`/admin/session/session-2026-spring` 접속:

- ⬜ 테이블에 "직군" 컬럼이 표시되는지 확인
- ⬜ 시드 데이터 10건의 직군(개발, 디자인, PM/기획, QA)이 올바르게 표시되는지 확인

### 4. 결과 리포트 — 직군별 표시

`/admin/session/session-2026-spring/results/{submissionId}` 접속 (평가 완료 건이 있는 경우):

- ⬜ 리포트 상단에 직군 Badge (예: "개발") 표시 확인
- ⬜ 항목별 점수가 해당 직군 기준으로 표시되는지 확인
- ⬜ 레이더 차트 축이 해당 직군의 평가 항목으로 표시되는지 확인

### 5. AI 평가 — 직군별 루브릭 적용 (ANTHROPIC_API_KEY 필수)

- ⬜ 직군이 "디자인"인 제출에 대해 평가 실행 → `design_system` 항목 점수 포함 확인
- ⬜ 직군이 "QA"인 제출에 대해 평가 실행 → `verification_plan` 항목 배점이 30점으로 반영 확인

---

## 코드 리뷰 결과 요약

- [코드 리뷰 보고서 (Sprint 5.2)](code-review-report-5.2.md)
- Critical 이슈: 없음
- Important 이슈 3건 (I-1 jobRole 캐스팅, I-2 만점 하드코딩, I-3 checkPassword 평문)
- Suggestion 4건 (ROLE_CRITERIA 이중 정의, select 컴포넌트, DB 업데이트 중복, normalizeReasoning 정리)
