# Sprint 10 자동 검증 보고서

**검증 일자**: 2026-03-11
**검증 환경**: Next.js 개발/빌드 환경 (로컬 Turso DB SSL 인증서 오류로 런타임 DB 연결 불가)

---

## 빌드 검증

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ 성공 — TypeScript 오류 없음 |
| 신규/수정 라우트 빌드 인식 | ✅ `/api/sessions/[id]/submissions/[subId]/re-evaluate` 정상 |
| 모든 API 라우트 빌드 포함 | ✅ 13개 API 라우트 전체 빌드 성공 |

## API 엔드포인트 검증

| 항목 | 결과 |
|------|------|
| `POST /api/auth/admin` (올바른 비밀번호) | ✅ 200 + `{"success":true}` 반환 |
| 기타 DB 의존 API (`/api/sessions` 등) | ⬜ Turso SSL 오류 (로컬 환경 설정 문제, Sprint 10 변경과 무관) |

## 코드 변경 정적 검증

| 항목 | 결과 |
|------|------|
| `editCount` DB 스키마 필드 추가 | ✅ `src/db/schema.ts` 반영 확인 |
| `Submission.editCount: number` 타입 추가 | ✅ `src/types/index.ts` 반영 확인 |
| `evaluateAndNotify` 리팩토링 | ✅ 평가 에러 전파 + 이메일 try/catch 분리 확인 |
| `runEvaluation` 이메일 통합 | ✅ `evaluateAndNotify` 호출로 변경 확인 |
| `re-evaluate` 라우트 이메일 발송 | ✅ `evaluateAndNotify` 호출로 변경 확인 |
| POST submissions 수정&재평가 로직 | ✅ editCount 3회 제한 + UPDATE + 재평가 로직 확인 |
| 참가자 UI 수정&재평가 버튼 | ✅ editCount 조건부 렌더링 확인 |
| 오류 안내 문구 변경 | ✅ "관리자가 오류를 확인 중이며..." 문구 확인 |

## 수동 검증 필요 항목

(로컬 Turso DB 연결 후 또는 Vercel 환경에서 수행)

- ⬜ `npx drizzle-kit push` — editCount 컬럼 DB 반영
- ⬜ 동일 이메일 재제출 → "수정&재평가 요청 (1/3)" 버튼 확인
- ⬜ 3회 수정 후 재제출 → 403 오류 반환 확인
- ⬜ 버튼 disabled 상태 (3/3) 확인
- ⬜ 재평가 완료 후 이메일 수신 확인 (RESEND_API_KEY 필요)
- ⬜ error 상태 제출 조회 → 새 안내 문구 확인

## 참고 사항

로컬 개발 서버에서 Turso DB SSL 인증서 오류(`UNABLE_TO_VERIFY_LEAF_SIGNATURE`)가 발생합니다. 이는 Sprint 10 코드 변경과 무관하며, 로컬 `.env.local`의 `DATABASE_URL`을 Turso 클라우드 연결 URL이 아닌 로컬 SQLite 파일 경로로 변경하거나, `NODE_TLS_REJECT_UNAUTHORIZED=0` 환경 변수 설정으로 우회 가능합니다.
