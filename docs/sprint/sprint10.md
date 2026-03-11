# Sprint 10: 오류 안내 개선 + 재평가 이메일 + 수정&재평가 제한

## 스프린트 개요

- **기간**: 2026-03-11
- **목표**: 참가자 오류 안내 문구 개선, 재평가 시 이메일 발송, 수정&재평가 횟수 제한(3회) 구현
- **상태**: ✅ 완료 (2026-03-11)

## 구현 내용

### T10-1. DB 스키마 — editCount 필드 추가

`src/db/schema.ts`의 `submissions` 테이블에 `editCount integer` 필드 추가.

```ts
editCount: integer("edit_count").notNull().default(0), // 수정&재평가 요청 횟수
```

### T10-2. 타입 정의 업데이트

`src/types/index.ts` Submission 인터페이스에 `editCount: number` 필드 추가.

### T10-3. 오류 안내 문구 변경

`src/components/check/submission-detail.tsx`에서 error 상태 안내 문구를 변경:

- 변경 전: "평가 중 오류가 발생했습니다."
- 변경 후: "관리자가 오류를 확인 중이며, 처리 후 평가 결과 메일이 발송됩니다."

### T10-4. evaluateAndNotify 리팩토링

`src/lib/evaluation-runner.ts`에서 `evaluateAndNotify` 함수:
- 평가 에러는 호출자로 그대로 전파 (`throw error`)
- 이메일 발송은 별도 try/catch로 감싸 실패해도 평가 결과에 영향 없음

### T10-5 & T10-6. 일괄 평가 + 재평가 이메일 발송

- `runEvaluation`: `evaluateSingle` 대신 `evaluateAndNotify` 호출로 이메일 발송 통합
- `re-evaluate` 라우트: `evaluateSingle` 대신 `evaluateAndNotify` 호출

### T10-7. POST submissions — 수정&재평가 로직

중복 이메일 처리 방식 변경:

| 조건 | 기존 동작 | 변경 후 동작 |
|------|-----------|-------------|
| 중복 이메일, editCount < 3 | 409 Conflict | editCount + 1, UPDATE, 재평가 + 이메일 |
| 중복 이메일, editCount >= 3 | 409 Conflict | 403 EDIT_LIMIT_EXCEEDED |
| 신규 이메일 | 201 Created | 201 Created (동일) |

### T10-8. 참가자 UI — 수정&재평가 버튼

`src/components/check/submission-detail.tsx`:
- 마감 전, editCount < 3: "수정&재평가 요청 (N/3)" 버튼 (활성, /submit 링크)
- 마감 전, editCount >= 3: "수정&재평가 요청 (3/3)" 버튼 (disabled)
- 마감 후: 버튼 미표시

## 변경 파일 목록

| 파일 | 변경 유형 | 주요 내용 |
|------|-----------|-----------|
| `src/db/schema.ts` | 수정 | editCount 필드 추가 |
| `src/types/index.ts` | 수정 | Submission.editCount 추가 |
| `src/components/check/submission-detail.tsx` | 수정 | 오류 안내 문구 + 수정&재평가 버튼 UI |
| `src/lib/evaluation-runner.ts` | 수정 | evaluateAndNotify 리팩토링, runEvaluation 이메일 통합 |
| `src/app/api/sessions/[id]/submissions/route.ts` | 수정 | 중복 이메일 수정&재평가 처리 |
| `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts` | 수정 | evaluateAndNotify 호출로 이메일 발송 |
| `docs/deploy.md` | 수정 | Sprint 10 체크리스트 추가 |

## 검증 결과

- [자동 검증 보고서](sprint10/playwright-report.md)
- 빌드: ✅ 성공 (TypeScript 오류 없음)
- DB/타입 정합성: ✅ 정적 코드 분석으로 확인
- UI 검증: ⬜ 로컬 Turso DB 연결 후 수동 확인 필요 (deploy.md 참조)

## 완료 기준 (Definition of Done)

- ✅ `editCount` 필드 DB 스키마 + 타입 반영
- ✅ 참가자 error 상태 안내 문구 변경
- ✅ 일괄 평가 / 재평가 API 모두 이메일 발송
- ✅ 수정&재평가 3회 초과 시 403 반환
- ✅ 참가자 UI 수정&재평가 버튼 (횟수 표시 + disabled)
- ✅ `npm run build` 에러 없이 성공
