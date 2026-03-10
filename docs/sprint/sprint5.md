# Sprint 5: GitHub 데이터 수집 + AI 평가 엔진

- **기간**: 2026-03-10 (1주)
- **브랜치**: `sprint5` (master에서 분기)
- **Phase**: Phase 3 — AI 평가 엔진 + 결과 대시보드 연결
- **상태**: 계획 수립 완료, 구현 예정

---

## 목표

GitHub 저장소 데이터 수집 엔진과 Claude API 기반 AI 평가 모듈을 구현한다.
관리자가 "평가 실행" 버튼을 누르면 제출 목록 전체에 대해 데이터 수집 → AI 평가 → DB 저장이 자동으로 진행되며,
실시간 진행률이 UI에 표시되는 MVP 수준의 평가 파이프라인을 완성한다.

> **Phase 3 이후 범위**: 결과 대시보드 실데이터 연결, 참가자 결과 조회 연결, 상태 에러 복구는 Sprint 6에서 담당한다.

---

## 배경

Sprint 4에서 Phase 2 MVP가 완료되었다.
- 참가자 제출 → DB 저장 흐름이 동작한다.
- 관리자는 제출 목록을 관리하고 CSV로 내보낼 수 있다.
- 세션 상세 페이지의 "평가 실행" 버튼은 현재 비활성 상태이다 (Phase 3 구현 예정 표시).

Sprint 5에서 아래 세 가지를 구현하여 AI 평가 파이프라인의 첫 동작 버전을 만든다:

1. **T3-1**: GitHub 저장소 데이터 수집 엔진 (Octokit)
2. **T3-2**: AI 평가 프롬프트 설계 및 구현 (Anthropic SDK)
3. **T3-3**: 일괄 평가 실행 API + 진행률 표시 (SSE 폴링)

---

## 신규/수정 파일 구조

```
src/
  lib/
    github-collector.ts       # 신규: GitHub 저장소 데이터 수집 모듈
    ai-evaluator.ts           # 신규: Claude API 평가 모듈 (프롬프트 + 응답 파싱)
    evaluation-runner.ts      # 신규: 일괄 평가 오케스트레이터 (동시성 제한)
  app/
    api/
      sessions/[id]/
        evaluate/
          route.ts            # 신규: POST 일괄 평가 시작
          progress/
            route.ts          # 신규: GET 진행률 조회 (SSE 또는 폴링용)
        submissions/[subId]/
          re-evaluate/
            route.ts          # 신규: POST 개별 재평가
  components/
    admin/
      EvaluateButton.tsx      # 신규: 평가 실행 버튼 + 진행률 바 컴포넌트
  types/
    evaluation.ts             # 신규: 평가 관련 타입 (CollectedData, EvaluationResult 등)
```

**수정 파일:**
```
src/
  app/
    admin/session/[sessionId]/page.tsx   # 수정: EvaluateButton 컴포넌트 연결
  db/
    schema.ts                            # 수정: scores 테이블에 subItemsJson 컬럼 추가 검토
```

---

## 작업 목록

### T3-1. GitHub 저장소 데이터 수집 엔진 (복잡도: L) — ⬜ 예정

**목표**: Octokit을 사용하여 제출된 GitHub public 저장소에서 평가에 필요한 데이터를 수집하고 `Submission.collectedData` (JSON)에 저장한다.

#### T3-1-1. 타입 정의
- **파일**: `src/types/evaluation.ts`
- `CollectedData` 인터페이스 정의:
  ```ts
  interface CollectedData {
    repoFullName: string;           // "owner/repo"
    tree: FileTreeItem[];           // 파일/폴더 구조 (경로, 타입, 크기)
    documents: FileContent[];       // README.md, PRD.md, CLAUDE.md 등
    sourceFiles: FileContent[];     // .ts, .tsx, .js, .py 등 소스 파일
    configFiles: FileContent[];     // package.json, requirements.txt 등
    commitSummary: CommitSummary;   // 총 커밋 수, 최근 50개 메시지
    collectedAt: string;            // ISO 8601
    tokenEstimate: number;          // 총 추정 토큰 수
  }
  interface FileContent {
    path: string;
    content: string;                // 최대 500줄로 잘린 내용
    truncated: boolean;
  }
  ```
- `EvaluationResult` 인터페이스 정의 (PRD 섹션 8.2 JSON 출력 포맷 기준)

#### T3-1-2. GitHub 수집 모듈 구현
- **파일**: `src/lib/github-collector.ts`
- `@octokit/rest` 패키지 사용 (주의: `@octokit/rest`는 현재 package.json에 없음 → 설치 필요)
- 입력: GitHub 저장소 URL (`https://github.com/owner/repo`)
- 단계:
  1. URL에서 `owner`, `repo` 파싱
  2. `repos.get()` → 저장소 존재 및 public 여부 확인 (private이면 에러)
  3. `git.getTree({ recursive: "1" })` → 전체 파일 트리 수집
  4. 파일 우선순위 분류 (문서 > 설정 > 소스):
     - **문서**: `*.md`, `*.txt` (최상위 디렉토리 우선)
     - **설정**: `package.json`, `requirements.txt`, `Dockerfile`, `.env.example`
     - **소스**: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs` (500줄 제한)
  5. `repos.getContent()` → 개별 파일 내용 수집 (Base64 디코딩)
  6. `repos.listCommits({ per_page: 50 })` → 최근 커밋 수집
  7. 토큰 추정: 총 문자 수 / 4 (근사값)
- Rate limit 처리:
  - 응답 헤더 `x-ratelimit-remaining` 확인
  - 429 또는 remaining = 0 시 `Retry-After` 헤더 기반 대기 후 재시도 (최대 2회)
- 에러 시: `Error` throw → 호출부에서 해당 제출의 `status = "error"`로 처리
- 검증 기준: `GITHUB_TOKEN` 환경 변수 설정 시 실제 public repo 1개 수집 성공, JSON 구조 로그 출력

#### T3-1-3. 환경 변수 추가
- `.env.local` (로컬) 및 `.env.example`에 추가:
  ```
  GITHUB_TOKEN=ghp_...           # GitHub Personal Access Token (public repo read 권한)
  ANTHROPIC_API_KEY=sk-ant-...   # Claude API 키
  ```

**완료 기준:**
- ⬜ 실제 public GitHub 저장소 URL 입력 시 `CollectedData` JSON 반환
- ⬜ 파일 우선순위 분류 결과가 `documents`, `sourceFiles`, `configFiles`로 분리됨
- ⬜ 단일 파일 최대 500줄 잘림 처리 (`truncated: true`) 동작
- ⬜ Rate limit 발생 시 재시도 로직 동작 (테스트는 목업으로 대체 가능)
- ⬜ `GITHUB_TOKEN` 미설정 시 에러 메시지 명확히 반환

---

### T3-2. AI 평가 프롬프트 설계 및 구현 (복잡도: L) — ⬜ 예정

**목표**: `@anthropic-ai/sdk`를 사용하여 수집된 저장소 데이터를 Claude에게 전달하고, PRD 평가 기준(4개 대항목 100점)에 따른 항목별 점수 + 근거를 생성하여 DB에 저장한다.

> **배포 보너스(+10점) 평가는 Sprint 7(Phase 4)에서 구현한다.** Sprint 5에서는 기본 100점 만점 평가에 집중한다.

#### T3-2-1. 타입 정의 보완
- **파일**: `src/types/evaluation.ts` (T3-1-1에서 생성한 파일에 추가)
- `EvaluationResult` 인터페이스:
  ```ts
  interface EvaluationResult {
    total_score: number;
    base_score: number;
    bonus_score: number;       // Sprint 5에서는 항상 0
    has_deploy_url: boolean;
    categories: CategoryResult[];
    bonus: null;               // Sprint 5에서는 null
    summary: string;
  }
  interface CategoryResult {
    key: string;               // "documentation" | "implementation" | "ux" | "idea"
    name: string;
    score: number;
    max_score: number;
    sub_items: SubItemResult[];
  }
  interface SubItemResult {
    key: string;
    name: string;
    score: number;
    max_score: number;
    reasoning: string;
  }
  ```

#### T3-2-2. 시스템 프롬프트 설계
- **파일**: `src/lib/ai-evaluator.ts`
- 시스템 프롬프트 구성 원칙:
  - 평가자 역할 정의: "당신은 해커톤 산출물 평가 전문가입니다."
  - 채점 루브릭 전문 포함 (PRD FR-011 기준):
    | 대항목 | key | 배점 | 세부 항목 |
    |--------|-----|------|-----------|
    | AI-Native 문서화 체계 | documentation | 35점 | project_definition(15), ai_context(10), progress_log(10) |
    | 기술 구현력 | implementation | 25점 | architecture(10), code_quality(8), tech_stack(7) |
    | 완성도 및 UX | ux | 25점 | completeness(12), user_experience(8), responsive(5) |
    | 아이디어 및 활용 가치 | idea | 15점 | problem_definition(7), differentiation(8) |
  - 출력 포맷 강제: "반드시 위 JSON 스키마만 출력하라. 마크다운 코드블록 없이 JSON만 출력."
  - 평가 근거 지침: "구체적인 파일명과 코드 내용을 인용하여 근거를 제시하라."

#### T3-2-3. 유저 프롬프트 구성
- `CollectedData`를 구조화된 텍스트로 변환:
  ```
  ## 저장소 정보
  - 저장소: {repoFullName}
  - 총 커밋 수: {commitCount}
  - 최근 커밋 메시지: {recentCommits}

  ## 파일 구조
  {tree를 들여쓰기 트리 형태로}

  ## 문서 파일
  ### {path}
  {content}

  ## 소스 파일
  ### {path}
  {content}

  ## 설정 파일
  ### {path}
  {content}
  ```
- 토큰 초과 방지: 전체 프롬프트 추정 토큰이 90,000을 초과하면 소스 파일을 순서대로 제외

#### T3-2-4. Claude API 호출 및 응답 파싱
- **파일**: `src/lib/ai-evaluator.ts`
- `@anthropic-ai/sdk` 사용 (주의: 현재 package.json에 없음 → 설치 필요)
- 설정:
  - `model`: `claude-sonnet-4-6` (ROADMAP 기준)
  - `temperature`: 0
  - `max_tokens`: 4096
- 응답 처리:
  - `content[0].text`에서 JSON 파싱
  - 파싱 실패 시 정규표현식으로 JSON 블록 추출 시도
  - 최종 실패 시 에러 throw

#### T3-2-5. DB 저장
- **파일**: `src/lib/ai-evaluator.ts` (또는 `evaluation-runner.ts`에서 호출)
- `EvaluationResult` → DB 저장 로직:
  1. `scores` 테이블: `criteriaKey`별 행 삽입 (대항목 4개)
  2. `submissions` 테이블 업데이트: `totalScore`, `baseScore`, `bonusScore = 0`, `status = "done"`
- 기존 점수가 있으면 `scores` 행 교체 (upsert 또는 delete-insert)

**완료 기준:**
- ⬜ 실제 저장소 `CollectedData`를 입력 시 `EvaluationResult` JSON 반환
- ⬜ 항목별 점수 합산이 `base_score`와 일치
- ⬜ `reasoning`에 구체적인 파일명 또는 코드 내용 인용이 포함됨
- ⬜ DB `scores` 테이블에 4개 행, `submissions`에 점수 저장 확인
- ⬜ `temperature: 0` 적용 및 JSON-only 출력 동작

---

### T3-3. 일괄 평가 실행 + 진행률 표시 (복잡도: L) — ⬜ 예정

**목표**: 관리자가 "평가 실행" 버튼을 클릭하면 세션 내 비제외 제출 전체에 대해 데이터 수집 → AI 평가를 병렬 3개 동시 실행하고, 프론트엔드에 진행률을 표시한다.

#### T3-3-1. 평가 오케스트레이터 구현
- **파일**: `src/lib/evaluation-runner.ts`
- `runEvaluation(sessionId: string)` 함수:
  1. `excluded = false` 인 제출 목록 조회
  2. 이미 `status = "done"` 인 건은 건너뜀 (재평가 버튼으로만 재실행 가능)
  3. `p-limit` (동시성 3) 또는 직접 구현한 세마포어로 병렬 제한
     ```ts
     // p-limit 미설치 시 직접 구현 예시
     async function withConcurrencyLimit<T>(
       tasks: (() => Promise<T>)[],
       limit: number
     ): Promise<PromiseSettledResult<T>[]>
     ```
  4. 각 제출에 대해:
     - `status = "collecting"` 업데이트
     - `github-collector.ts` 호출 → `collectedData` 저장
     - `status = "evaluating"` 업데이트
     - `ai-evaluator.ts` 호출 → `scores` 저장, `status = "done"` 업데이트
     - 에러 발생 시: `status = "error"`, `adminNote`에 에러 사유 저장
  5. `Promise.allSettled` 사용으로 부분 실패 허용
- 진행률 추적: 인메모리 Map으로 `sessionId → { total, done, failed }` 관리

#### T3-3-2. 평가 시작 API
- **파일**: `src/app/api/sessions/[id]/evaluate/route.ts`
- `POST /api/sessions/[id]/evaluate`
  - `withAdminAuth` 래핑
  - 세션 존재 확인
  - 이미 진행 중(`status = "collecting"` 또는 `"evaluating"` 인 제출이 있음)이면 409 반환
  - 비동기 `runEvaluation(id)` 실행 (응답을 기다리지 않음 → 즉시 202 반환)
  - 반환: `{ message: "평가를 시작했습니다.", total: N }`

#### T3-3-3. 진행률 조회 API (폴링)
- **파일**: `src/app/api/sessions/[id]/evaluate/progress/route.ts`
- `GET /api/sessions/[id]/evaluate/progress`
  - 인증 불필요 (폴링 편의성) 또는 `withAdminAuth` 중 선택 → `withAdminAuth` 적용
  - 전략: **DB 폴링 방식** (SSE 대신 — Next.js Serverless 환경 호환성 우선)
    - `submissions` 테이블에서 해당 세션의 상태별 카운트 집계
    - 반환: `{ total, done, failed, inProgress, pending }`
  - 프론트엔드에서 2초 간격으로 폴링하여 진행률 바 업데이트

> **설계 결정**: SSE 방식은 Next.js Serverless 환경(Vercel)에서 스트리밍 제한이 있다. 인메모리 Map은 프로세스가 여러 개일 때 공유되지 않는다. 따라서 **DB 폴링 방식**을 기본으로 채택한다. (SSE는 Phase 4 배포 환경이 확정된 후 필요 시 추가)

#### T3-3-4. 개별 재평가 API
- **파일**: `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts`
- `POST /api/sessions/[id]/submissions/[subId]/re-evaluate`
  - `withAdminAuth` 래핑
  - 해당 제출을 단건으로 수집 → 평가 실행 (동기 실행, 완료 시 응답)
  - `status = "error"` 인 건도 재실행 가능
  - 기존 `scores` 행 삭제 후 재삽입

#### T3-3-5. EvaluateButton 프론트엔드 컴포넌트
- **파일**: `src/components/admin/EvaluateButton.tsx`
- 클라이언트 컴포넌트 (`'use client'`)
- 상태: `idle` | `running` | `done` | `error`
- `running` 상태 진입 시:
  - `POST /api/sessions/[id]/evaluate` 호출
  - 2초 간격으로 `GET /api/sessions/[id]/evaluate/progress` 폴링
  - 진행률 바: `done / total * 100` + 텍스트 ("12/30 평가 완료")
  - `done + failed >= total` 이 되면 폴링 중단 → 완료 Toast 알림
- 에러 건이 있으면 "N건 실패 — 개별 재평가 버튼을 사용하세요" 경고 표시
- Props: `sessionId: string`, `submissionCount: number`

#### T3-3-6. 세션 상세 페이지 연결
- **수정**: `src/app/admin/session/[sessionId]/page.tsx`
  - 기존 비활성화된 "평가 실행" 버튼을 `<EvaluateButton>` 컴포넌트로 교체
  - `submissionCount`를 서버에서 계산하여 prop으로 전달

**완료 기준:**
- ⬜ `POST /api/sessions/[id]/evaluate` 호출 시 202 즉시 반환, 백그라운드 실행 시작
- ⬜ 2초 폴링으로 `{ total, done, failed }` 실시간 갱신
- ⬜ 프론트엔드 진행률 바가 "0/N → N/N" 으로 업데이트됨
- ⬜ 부분 실패 건에 `status = "error"`, `adminNote`에 사유 저장
- ⬜ 개별 재평가 API로 에러 건 단독 재실행 가능
- ⬜ 동시 3개 병렬 실행 제한 동작 확인

---

## 신규 패키지 설치

```bash
npm install @octokit/rest @anthropic-ai/sdk
```

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@octokit/rest` | latest | GitHub REST API SDK |
| `@anthropic-ai/sdk` | latest | Claude API SDK |

> `p-limit` 은 ESM 전용이므로 Next.js 환경 호환성 문제가 발생할 수 있다. 동시성 제한 로직은 직접 구현하거나 `p-limit@3` (CJS 지원 마지막 버전)을 사용한다.

---

## 환경 변수

`.env.local` (로컬 개발용, 깃 추적 제외) 및 `.env.example` (깃 추적, 키 없이):

```env
# GitHub API
GITHUB_TOKEN=ghp_your_token_here

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

환경 변수 미설정 시 동작:
- `GITHUB_TOKEN` 미설정: GitHub API 미인증 요청 (rate limit 60 req/hr) — 경고 로그 출력
- `ANTHROPIC_API_KEY` 미설정: 평가 API 호출 시 500 에러 반환 + 명확한 에러 메시지

---

## 완료 기준 (Definition of Done)

- ⬜ `@octokit/rest`로 실제 public GitHub 저장소 데이터 수집 성공
- ⬜ `@anthropic-ai/sdk`로 Claude API 호출하여 4개 대항목 점수 + 근거 생성
- ⬜ 일괄 평가: 202 즉시 응답, 백그라운드 실행, 부분 실패 허용
- ⬜ 진행률 폴링: DB 기반 `{ total, done, failed }` 2초 간격 갱신
- ⬜ 프론트엔드 진행률 바 "0/N → N/N" 업데이트 후 완료 Toast
- ⬜ 에러 건에 `status = "error"`, `adminNote` 저장
- ⬜ 개별 재평가 API 동작
- ⬜ `npm run build` 에러 없이 성공
- ⬜ `ANTHROPIC_API_KEY`, `GITHUB_TOKEN` `.env.example`에 문서화

---

## 진행 현황

| 태스크 | 상태 | 비고 |
|--------|------|------|
| T3-1. GitHub 데이터 수집 엔진 | ⬜ 예정 | `@octokit/rest` 설치 필요 |
| T3-2. AI 평가 프롬프트 + 구현 | ⬜ 예정 | `@anthropic-ai/sdk` 설치 필요 |
| T3-3. 일괄 평가 API + 진행률 UI | ⬜ 예정 | T3-1, T3-2 완료 후 |

---

## 의존성 및 리스크

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| Claude API JSON 출력 불안정 | 높음 | 정규표현식 JSON 추출 fallback, temperature 0 적용 |
| GitHub API rate limit (미인증: 60 req/hr) | 높음 | `GITHUB_TOKEN` 설정 필수 (5,000 req/hr), 환경 변수 미설정 시 경고 |
| 대형 저장소 토큰 초과 (>100k 토큰) | 중간 | 90,000 토큰 임계값 설정, 소스 파일 우선 제외 전략 |
| p-limit ESM 호환성 문제 | 중간 | 동시성 제한 직접 구현 또는 p-limit@3 사용 |
| 평가 실행 중 서버 재시작 | 중간 | 인메모리 상태 유실 → DB 폴링 방식으로 완화 (DB는 영속) |
| Next.js API Route 60초 타임아웃 | 높음 | 비동기 백그라운드 실행 (202 즉시 반환), 폴링으로 상태 추적 |

---

## 기술 고려사항

### 비동기 백그라운드 실행 패턴
Next.js API Route는 응답 반환 후 추가 작업이 종료된다. 이를 우회하기 위해:
```ts
// 응답 먼저 반환
const response = NextResponse.json({ message: "평가를 시작했습니다.", total: N }, { status: 202 });
// 비동기 실행 (응답과 무관하게 실행)
runEvaluation(sessionId).catch(console.error);
return response;
```
> 주의: Vercel Edge 환경에서는 `waitUntil()`이 필요할 수 있다. 로컬 개발 및 Node.js 환경에서는 위 패턴으로 동작한다.

### DB 폴링 진행률 조회 쿼리
```ts
// submissions 테이블에서 상태별 카운트
const counts = await db
  .select({ status: submissions.status, count: count() })
  .from(submissions)
  .where(and(eq(submissions.sessionId, id), eq(submissions.excluded, false)))
  .groupBy(submissions.status);
```

### 토큰 한도 관리
- 단일 파일 최대 500줄 (초과 시 잘라내고 `truncated: true`)
- 전체 추정 토큰 = 총 문자 수 / 4
- 90,000 토큰 초과 시 소스 파일부터 제외 (문서 파일은 유지)

### Claude API 호출 설정
```ts
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  temperature: 0,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: userPrompt }],
});
```

---

## 🧪 Playwright MCP 검증 시나리오

> `npm run dev` 실행 후 아래 순서로 검증 (사전에 제출 데이터 최소 1건 존재 필요)

**평가 실행 흐름 검증:**
1. `browser_navigate` -> `http://localhost:3000/admin` 접속 후 로그인
2. `browser_navigate` -> `http://localhost:3000/admin/session/{sessionId}` 접속
3. `browser_snapshot` -> "평가 실행" 버튼 활성화 상태 확인 (이전: 비활성화)
4. `browser_click` -> "평가 실행" 버튼 클릭
5. `browser_network_requests` -> `POST /api/sessions/{id}/evaluate` 202 응답 확인
6. `browser_snapshot` -> 진행률 바 표시 확인 ("0/N 평가 완료")
7. `browser_wait_for` -> 진행률 텍스트 변화 대기 (폴링 2초 간격)
8. `browser_snapshot` -> 진행률 업데이트 확인

**API 직접 검증 (curl):**
```bash
# 로그인 토큰 발급
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/admin \
  -H "Content-Type: application/json" \
  -d '{"password":"admin1234"}' | jq -r '.token')

# 평가 시작
curl -s -X POST http://localhost:3000/api/sessions/{SESSION_ID}/evaluate \
  -H "Authorization: Bearer $TOKEN"
# 기대: {"message":"평가를 시작했습니다.","total":N}

# 진행률 조회
curl -s http://localhost:3000/api/sessions/{SESSION_ID}/evaluate/progress \
  -H "Authorization: Bearer $TOKEN"
# 기대: {"total":N,"done":M,"failed":0,"inProgress":K,"pending":P}
```

**공통 검증:**
- `browser_console_messages(level: "error")` -> 콘솔 에러 없음
- `browser_network_requests` -> API 호출 성공(2xx) 확인

---

## 예상 산출물

Sprint 5 완료 시 다음이 동작 가능한 상태가 된다:
- 관리자가 세션 상세 페이지에서 "평가 실행" 버튼을 클릭하면 백그라운드 평가 시작
- 화면에 진행률 바가 실시간(2초 폴링)으로 업데이트됨
- 평가 완료 후 `submissions` 테이블에 `totalScore`, `baseScore` 저장
- `scores` 테이블에 4개 대항목 점수 및 근거 저장
- 실패한 제출 건은 `status = "error"`, `adminNote`에 사유 기록
- 개별 재평가 버튼으로 에러 건 단독 재실행 가능

> Sprint 6에서는 이 데이터를 결과 대시보드(순위표, 상세 리포트)와 연결하고 참가자 결과 조회를 완성한다.
