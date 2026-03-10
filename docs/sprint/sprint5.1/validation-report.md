# Sprint 5.1 검증 보고서

- **검증 일시**: 2026-03-10
- **검증 환경**: `npm run dev` (localhost:3000)
- **빌드 상태**: ✅ `npm run build` 사전 성공 확인

---

## 자동 검증 결과

### 빌드 검증

| 항목 | 결과 | 비고 |
|------|------|------|
| `npm run build` | ✅ 성공 | TypeScript 오류 없음 (구현 완료 시점 확인) |
| `.next/BUILD_ID` 존재 | ✅ 확인 | 빌드 아티팩트 정상 |
| `evaluate/reset` 라우트 빌드 포함 | ✅ 확인 | `.next/server/app/api/sessions/[id]/evaluate/reset/` 디렉토리 존재 |

### API 인증 검증

| 항목 | 결과 | HTTP 상태 |
|------|------|-----------|
| 인증 없이 `POST /evaluate` | ✅ 401 반환 | 401 |
| 인증 없이 `POST /evaluate/reset` | ✅ 401 반환 | 401 |

### 신규 API 동작 검증

| 항목 | 결과 | 응답 |
|------|------|------|
| 인증 후 `POST /evaluate/reset` | ✅ 정상 | `{"message":"평가가 리셋되었습니다.","count":1}` |
| 존재하지 않는 세션 `reset` | ✅ 404 반환 | `NOT_FOUND` |
| 존재하지 않는 세션 `evaluate` | ✅ 404 반환 | `NOT_FOUND` |
| `POST /evaluate` (`model:"haiku"`) | ✅ 정상 | `{"message":"평가를 시작했습니다.","total":1}` |
| `GET /evaluate/progress` | ✅ 정상 | `{"total":1,"done":0,"failed":0,"inProgress":1,"pending":0}` |

### 삭제된 API 검증

| 항목 | 결과 | HTTP 상태 |
|------|------|-----------|
| `POST /submissions/[id]/re-evaluate` 삭제 확인 | ✅ 404 반환 | 404 |

---

## 수동 검증 필요 항목

`npm run dev` 실행 후 브라우저에서 직접 확인하세요.

### 1. EvaluateButton 모델 선택 UI 확인

세션 상세 페이지(`/admin/session/session-2026-spring`)에서:

- ⬜ "Haiku (빠름)" / "Sonnet (정밀)" 드롭다운이 평가 버튼 좌측에 표시되는지 확인
- ⬜ 평가 실행 중 드롭다운이 비활성화되는지 확인
- ⬜ 평가 완료 건이 있을 때 "평가 리셋" 버튼이 표시되는지 확인

### 2. 평가 리셋 버튼 동작 확인

- ⬜ "평가 리셋" 버튼 클릭 → 브라우저 confirm 다이얼로그 표시 확인
- ⬜ 확인 클릭 → Toast "평가가 리셋되었습니다. (N건)" 표시 확인
- ⬜ 제출 목록 상태가 "제출완료"로 리셋되어 표시되는지 확인

### 3. 모델 선택 후 평가 실행 확인 (ANTHROPIC_API_KEY 필수)

- ⬜ Sonnet 선택 후 평가 실행 → 평가 진행 확인
- ⬜ 진행률 바 표시 확인
- ⬜ 완료 Toast에 선택한 모델명 표시 확인

### 4. ProjectReport 마크다운 렌더링 확인

세션 결과 페이지(`/admin/session/session-2026-spring/results`)에서:

- ⬜ 평가 완료된 제출의 상세 리포트 접속
- ⬜ reasoning 텍스트에서 `### 항목명` 헤딩이 굵게 표시되는지 확인
- ⬜ 별도 섹션으로 분리된 세부 평가 항목이 마크다운 형식으로 표시되는지 확인

---

## 이슈 해소 확인

| Sprint 5 이슈 | 자동 검증 | 비고 |
|---------------|-----------|------|
| I-1: Promise.all 동시 요청 | ✅ 코드 확인 | github-collector.ts L169 순차 실행으로 변경 확인 |
| I-2: progressMap Dead Code | ✅ 코드 확인 | evaluation-runner.ts에 progressMap 없음 확인 |
| I-3: done 건 재평가 | ✅ API 동작 확인 | reset 후 제출 1건에 대해 evaluate 정상 반환 |
| I-4: 재평가 API 타임아웃 | ✅ 404 확인 | /re-evaluate 엔드포인트 404 반환 확인 |
