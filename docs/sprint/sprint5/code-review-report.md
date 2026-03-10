# Sprint 5 코드 리뷰 보고서

- **날짜**: 2026-03-10
- **리뷰 대상**: sprint5 브랜치 (main 대비 신규/수정 파일 전체)
- **리뷰어**: sprint-close 에이전트 (Claude Sonnet 4.6)

---

## 리뷰 대상 파일

| 파일 | 변경 유형 |
|------|-----------|
| `src/types/evaluation.ts` | 신규 |
| `src/lib/github-collector.ts` | 신규 |
| `src/lib/ai-evaluator.ts` | 신규 |
| `src/lib/evaluation-runner.ts` | 신규 |
| `src/app/api/sessions/[id]/evaluate/route.ts` | 신규 |
| `src/app/api/sessions/[id]/evaluate/progress/route.ts` | 신규 |
| `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts` | 신규 |
| `src/components/admin/EvaluateButton.tsx` | 신규 |
| `src/app/admin/session/[sessionId]/page.tsx` | 수정 |

---

## Critical 이슈

없음.

---

## Important 이슈

### I-1. `github-collector.ts` L160 — Promise.all 3개 배치 동시 실행으로 Rate limit 위험

**위치**: `src/lib/github-collector.ts` 160번째 줄

```ts
const [documents, configContents, sourceContents] = await Promise.all([
  fetchBatch(docFiles),
  fetchBatch(configFilePaths),
  fetchBatch(sourceFiles),
]);
```

**문제**: 세 배치가 동시에 시작되고 각 배치 내부에서도 3개씩 병렬 요청이 나가므로 순간 최대 9개 동시 GitHub API 요청이 발생할 수 있습니다. `GITHUB_TOKEN` 미설정 시 Rate limit(60 req/hr) 초과 위험이 높습니다.

**권고**: 세 배치를 순차 실행하거나, 전체 파일 목록을 합친 후 단일 `fetchBatch`로 처리합니다.

---

### I-2. `evaluation-runner.ts` — 사용되지 않는 인메모리 `progressMap`

**위치**: `src/lib/evaluation-runner.ts` 10-14번째 줄

**문제**: `progressMap`(인메모리)을 업데이트하지만 프론트엔드는 DB 폴링 API(`/evaluate/progress`)만 사용합니다. `getProgress` export도 아무 곳에서도 사용되지 않아 Dead Code가 됩니다.

**권고**: `progressMap` 및 `getProgress`를 제거하거나, Sprint 5 기술 고려사항에 "인메모리 맵은 현재 미사용" 주석을 추가합니다.

---

### I-3. `evaluate/route.ts` — Vercel 환경에서 백그라운드 실행 보장 불가

**위치**: `src/app/api/sessions/[id]/evaluate/route.ts` 65-68번째 줄

```ts
runEvaluation(id).catch((err) => {
  console.error(`[평가 오류] 세션 ${id}:`, err);
});
return apiSuccess({ message: "평가를 시작했습니다.", total: targets.length }, 202);
```

**문제**: Vercel Serverless Function에서는 응답 반환 후 비동기 작업이 중단될 수 있습니다. 로컬 Node.js 환경에서는 정상 동작하지만 Vercel 배포 환경에서 평가가 중간에 끊길 위험이 있습니다.

**권고**: Sprint 5 범위에서는 로컬 환경 전용으로 사용하고, Sprint 7/8 배포 준비(T4-8) 단계에서 `waitUntil()` 또는 별도 큐 방식으로 전환합니다. sprint5.md 기술 고려사항에 이미 문서화되어 있으므로 현재 단계에서는 허용합니다.

---

### I-4. `re-evaluate/route.ts` — 동기 실행으로 API 타임아웃 위험

**위치**: `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts`

**문제**: `evaluateSingle(subId)`는 GitHub 데이터 수집 + Claude API 호출을 포함하여 수십 초가 소요될 수 있습니다. Next.js API Route 기본 타임아웃(60초)을 초과하면 클라이언트에 504가 반환되지만 DB 작업은 계속 진행될 수 있습니다.

**권고**: 일괄 평가와 동일하게 비동기 백그라운드 실행 + 진행률 폴링 방식으로 전환하거나, `export const maxDuration = 120;` 설정으로 타임아웃을 연장합니다.

---

## Suggestion (향후 개선 권장)

### S-1. `github-collector.ts` — `Retry-After` 헤더 값 처리 방식 확인 필요

GitHub API는 Rate limit 초과 시 `x-ratelimit-reset`(Unix timestamp) 또는 `Retry-After`(초) 중 하나를 반환합니다. 현재 코드는 `retry-after` 헤더만 처리합니다. `x-ratelimit-reset`도 처리하면 더 정확한 재시도 타이밍을 얻을 수 있습니다.

### S-2. `EvaluateButton.tsx` — 페이지 새로고침 시 진행 중 상태 복구

평가 실행 중 새로고침하면 버튼이 `idle`로 돌아갑니다. `useEffect`에서 마운트 시 progress API를 조회하여 `inProgress > 0` 또는 `pending > 0`이면 자동으로 `running` 상태로 복구하고 폴링을 재개하면 UX가 향상됩니다.

### S-3. `evaluation-runner.ts` — 에러 전파 흐름 단순화

`tasks` 래퍼 내 `catch` 블록에서 `progressMap.failed` 업데이트 후 throw하는 구조가 복잡합니다. `evaluateSingle`이 이미 DB에 에러를 기록하고 throw하므로, 래퍼에서는 단순히 카운트 업데이트만 하고 throw하지 않아도 됩니다(`withConcurrencyLimit`의 rejected 결과를 collect하기 때문).

---

## 총평

**전체 평가: 양호 (Important 이슈 4건, Critical 없음)**

Sprint 계획 문서를 충실히 따랐으며, 타입 정의가 명확하고 에러 처리 패턴이 일관됩니다. PRD 루브릭이 시스템 프롬프트에 정확히 반영되어 있고, JSON 파싱 fallback 로직도 실용적입니다. Important 이슈 I-3은 설계 단계에서 인지하고 문서화된 제약사항으로, 로컬 개발 환경에서는 허용 가능합니다. I-1, I-2, I-4는 Sprint 6 또는 운영 환경 전환 전에 수정을 권장합니다.
