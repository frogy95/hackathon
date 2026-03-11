# Sprint 8 검증 보고서

**스프린트:** Sprint 8 — Vercel 실서버 배포
**검증일:** 2026-03-11
**검증자:** sprint-close 에이전트

---

## 자동 검증 완료 항목

| 항목 | 결과 | 비고 |
|------|------|------|
| `npm run build` | ✅ 성공 | TypeScript 오류 없음, Next.js 빌드 정상 |
| `better-sqlite3` 제거 | ✅ 완료 | `package.json` 의존성 없음 확인 |
| `@libsql/client` 추가 | ✅ 완료 | `package.json` 의존성 등록 완료 |
| `src/db/index.ts` libsql 재작성 | ✅ 완료 | `createClient` + `drizzle-orm/libsql` 사용 |
| `drizzle.config.ts` turso dialect | ✅ 완료 | `dialect: "turso"` + `authToken` 필드 추가 |
| `next.config.ts` serverExternalPackages | ✅ 완료 | `["@libsql/client"]` 등록 |
| `evaluate/route.ts` waitUntil 래핑 | ✅ 완료 | `@vercel/functions` waitUntil 적용 |
| `re-evaluate/route.ts` waitUntil 래핑 | ✅ 완료 | waitUntil + 점수 초기화 로직 개선 |
| `vercel.json` 생성 | ✅ 완료 | evaluate 300s, re-evaluate 60s maxDuration |
| `.env.example` 업데이트 | ✅ 완료 | DATABASE_URL, DATABASE_AUTH_TOKEN, DISABLE_SCREENSHOTS 추가 |
| `docs/deploy.md` 업데이트 | ✅ 완료 | Sprint 8 Vercel 배포 체크리스트 추가 |

---

## 수동 검증 필요 항목

아래 항목은 Vercel 실제 배포 환경에서 사용자가 직접 검증해야 합니다. 상세 절차는 `docs/deploy.md`의 Sprint 8 섹션을 참조하세요.

### Turso DB 설정 (최초 1회)

- ⬜ Turso CLI 설치 및 `turso auth login`
- ⬜ `turso db create hackathon-eval` — DB 생성
- ⬜ `turso db show hackathon-eval --url` — DATABASE_URL 확인
- ⬜ `turso db tokens create hackathon-eval` — DATABASE_AUTH_TOKEN 발급
- ⬜ `npx drizzle-kit push` — Turso DB에 스키마 적용
- ⬜ `npx tsx src/db/seed.ts` — 시드 데이터 삽입

### Vercel 배포 설정

- ⬜ Vercel 대시보드에서 GitHub 저장소 import
- ⬜ 환경변수 7개 설정 (DATABASE_URL, DATABASE_AUTH_TOKEN, ADMIN_PASSWORD_HASH, JWT_SECRET, ANTHROPIC_API_KEY, GITHUB_TOKEN, DISABLE_SCREENSHOTS)
- ⬜ "Deploy" 클릭 → 빌드 성공 확인

### 배포 후 기능 검증

- ⬜ 배포 URL 랜딩 페이지 로드 확인
- ⬜ `/admin` 로그인 확인
- ⬜ `/admin/dashboard` 세션 목록 확인
- ⬜ 제출 목록 조회 확인
- ⬜ CSV 내보내기 확인
- ⬜ 단건 재평가 실행 확인 (ANTHROPIC_API_KEY 필요, Pro 플랜 이상)

---

## 코드 리뷰 요약

### 주요 변경 파일

| 파일 | 변경 유형 | 핵심 내용 |
|------|-----------|-----------|
| `src/db/index.ts` | 재작성 | better-sqlite3 → libsql 드라이버 교체 |
| `drizzle.config.ts` | 수정 | sqlite → turso dialect, authToken 추가 |
| `next.config.ts` | 수정 | serverExternalPackages 추가 |
| `src/app/api/sessions/[id]/evaluate/route.ts` | 수정 | waitUntil 래핑 |
| `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts` | 수정 | waitUntil + 점수 초기화 개선 |
| `vercel.json` | 신규 | 함수별 maxDuration 설정 |
| `.env.example` | 수정 | DB 환경변수 문서화 |
| `docs/deploy.md` | 수정 | Sprint 8 배포 체크리스트 |

### 잠재적 개선 사항 (Medium)

1. **로컬 fallback DB 경로 하드코딩**: `src/db/index.ts`에서 `file:./hackathon.db`가 하드코딩되어 있음. 환경변수 기본값으로 처리되어 있어 동작에는 문제없으나, 명시적인 환경 구분 처리를 고려할 수 있음.

2. **waitUntil 로컬 no-op 동작**: `@vercel/functions`의 `waitUntil`은 로컬(`npm run dev`) 환경에서 no-op으로 동작하여 기존 fire-and-forget 방식과 동일하게 실행됨. 로컬 개발 영향 없음.

3. **Vercel Hobby 플랜 제한**: `evaluate` 함수의 maxDuration 300초는 Pro 플랜 이상에서만 유효. Hobby 플랜에서는 10초 제한으로 일괄 평가 불가. `docs/deploy.md`에 명시되어 있음.

---

## 비고

- Sprint 8의 핵심 목적인 Vercel 실서버 배포를 위한 인프라 변경이 완료됨
- `better-sqlite3` (네이티브 바이너리) → `@libsql/client` (HTTP/WebSocket) 교체로 서버리스 환경 호환성 확보
- 로컬 개발 환경에서는 `DATABASE_URL=file:./hackathon.db` 기본값으로 기존과 동일하게 동작
- T4-5(평가 기준 커스터마이징), T4-6(PDF 리포트), T4-7(성능 최적화)는 백로그로 이관됨
