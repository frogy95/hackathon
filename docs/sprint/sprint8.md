# Sprint 8: Vercel 실서버 배포 (사후 작성)

**완료일:** 2026-03-11

> **참고:** 이 문서는 구현 완료 후 사후 작성된 계획 문서입니다. 실제 변경 내용을 기반으로 작성되었습니다.

---

**Goal:** Phase 4 마지막 스프린트. 로컬 SQLite(better-sqlite3) 의존성을 제거하고 Turso(libsql) 원격 DB로 교체하여 Vercel 서버리스 환경에서 정상 동작하도록 전체 배포 인프라를 재구성한다.

**Architecture:** DB 드라이버를 `better-sqlite3`(동기 I/O) → `@libsql/client`(비동기 libsql 프로토콜)로 교체한다. 장시간 실행이 필요한 평가 API는 `@vercel/functions`의 `waitUntil`로 래핑하여 서버리스 함수의 응답 반환 후에도 백그라운드 작업이 완료될 때까지 실행을 보장한다. `vercel.json`으로 함수별 최대 실행 시간을 설정한다.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + libsql(Turso), `@vercel/functions`, TypeScript, Vercel

**기간:** 2026-03-11

---

## 구현 범위

### 포함 (In Scope)

- T8-1: DB 드라이버 교체 — `better-sqlite3` 제거, `@libsql/client` + `drizzle-orm/libsql` 도입
- T8-2: `drizzle.config.ts` — `turso` dialect로 변경
- T8-3: `next.config.ts` — `serverExternalPackages`에 `@libsql/client` 추가
- T8-4: 평가 API `waitUntil` 래핑 — `/api/sessions/[id]/evaluate` 및 재평가 API
- T8-5: `vercel.json` 신규 생성 — 함수별 `maxDuration` 설정
- T8-6: `.env.example` 업데이트 — `DATABASE_URL`, `DATABASE_AUTH_TOKEN` 환경변수 문서화
- T8-7: `docs/deploy.md` — Sprint 8 배포 체크리스트 추가

### 제외 (Out of Scope)

- T4-5 평가 기준 커스터마이징 UI (백로그)
- T4-6 PDF 리포트 생성 (백로그)
- T4-7 Lighthouse 성능 최적화 (백로그)
- Playwright 스크린샷 Vercel 호환 처리 (현재 `DISABLE_SCREENSHOTS` 환경변수로 우회)

---

## 작업 분해 (Task Breakdown)

---

### Task 1: DB 드라이버 교체 — better-sqlite3 → libsql

**변경 파일:**
- 수정: `package.json`
- 수정: `src/db/index.ts`

**배경:** `better-sqlite3`는 Node.js 네이티브 모듈(`.node` 바이너리)로 Vercel 서버리스 환경에서 동작하지 않는다. Turso가 제공하는 `@libsql/client`는 HTTP/WebSocket 기반 libsql 프로토콜을 사용하여 서버리스 환경에서도 정상 동작한다. 

**패키지 변경:**

```bash
# 제거
npm uninstall better-sqlite3

# 추가
npm install @libsql/client
```

**`src/db/index.ts` 재작성:**

```typescript
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./hackathon.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

**핵심 변경점:**
- `DATABASE_URL` 환경변수로 로컬(`file:./hackathon.db`) 또는 Turso 원격 URL(`libsql://...`) 모두 지원
- `DATABASE_AUTH_TOKEN`은 Turso 원격 연결 시 필수, 로컬 파일 DB 사용 시 불필요
- 기존 `drizzle-orm/better-sqlite3` import가 `drizzle-orm/libsql`로 교체됨

---

### Task 2: drizzle.config.ts — turso dialect 적용

**변경 파일:**
- 수정: `drizzle.config.ts`

**변경 내용:**

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./hackathon.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
```

**핵심 변경점:**
- `dialect: "sqlite"` → `dialect: "turso"` 변경
- `dbCredentials`에 `authToken` 필드 추가 (Turso 원격 DB 인증)
- 로컬 개발 시에도 `file:` URL 프로토콜로 동작하므로 하위 호환성 유지

---

### Task 3: next.config.ts — serverExternalPackages 추가

**변경 파일:**
- 수정: `next.config.ts`

**변경 내용:**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
```

**배경:** `@libsql/client`는 Node.js 네이티브 기능(WebSocket, 파일시스템)을 사용하므로 Next.js 서버 번들링에서 외부 패키지로 처리해야 한다. `serverExternalPackages`에 명시하지 않으면 Webpack 번들링 과정에서 오류가 발생한다.

---

### Task 4: 평가 API — waitUntil 백그라운드 실행 래핑

**변경 파일:**
- 수정: `src/app/api/sessions/[id]/evaluate/route.ts`
- 수정: `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts`

**배경:** Vercel 서버리스 함수는 `Response` 반환 후 즉시 프로세스가 종료될 수 있다. AI 평가 작업은 수 분이 소요되므로, `@vercel/functions`의 `waitUntil`로 래핑하면 응답 반환 후에도 Promise가 완료될 때까지 실행이 보장된다.

**`evaluate/route.ts` 핵심 변경:**

```typescript
import { waitUntil } from "@vercel/functions";

// 변경 전:
runEvaluation(id, model).catch((err) => {
  console.error(`[평가 오류] 세션 ${id}:`, err);
});

// 변경 후:
waitUntil(runEvaluation(id, model).catch((err) => {
  console.error(`[평가 오류] 세션 ${id}:`, err);
}));
```

**`re-evaluate/route.ts` 핵심 변경:**

```typescript
import { waitUntil } from "@vercel/functions";

// 변경 전:
evaluateSingle(submissionId, model).catch((err) => {
  console.error(`[재평가 오류] 제출 ${submissionId}:`, err);
});

// 변경 후:
waitUntil(evaluateSingle(submissionId, model).catch((err) => {
  console.error(`[재평가 오류] 제출 ${submissionId}:`, err);
}));
```

**추가 변경 — re-evaluate route 개선:** 기존 Sprint 6 구현 대비 기존 점수(scores) 삭제 및 totalScore/baseScore/bonusScore 초기화 로직이 추가되어 재평가 정확성이 향상됨.

---

### Task 5: vercel.json — 함수 maxDuration 설정

**변경 파일:**
- 신규 생성: `vercel.json`

**내용:**

```json
{
  "functions": {
    "src/app/api/sessions/[id]/evaluate/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts": {
      "maxDuration": 60
    }
  }
}
```

**설정 근거:**

| 함수 | maxDuration | 이유 |
|------|-------------|------|
| `evaluate` | 300초 (5분) | 세션 전체 일괄 평가: GitHub 수집 + Claude API 호출 × N건. Vercel Pro 최대값. |
| `re-evaluate` | 60초 (1분) | 단일 제출 재평가: 1건만 처리하므로 300초 불필요 |

**주의:** Vercel 무료 플랜(Hobby)의 최대 함수 실행 시간은 10초. Pro 플랜 이상에서 최대 300초 설정 가능.

---

### Task 6: .env.example 업데이트

**변경 파일:**
- 수정: `.env.example`

**추가된 환경변수:**

```bash
# DB 연결 설정
# 로컬 개발: file:./hackathon.db (기본값)
# Turso 호스팅: libsql://your-db-name.turso.io
DATABASE_URL=file:./hackathon.db

# Turso 인증 토큰 (로컬 파일 DB 사용 시 불필요, Turso 호스팅 시 필수)
# turso db tokens create your-db-name 으로 생성
DATABASE_AUTH_TOKEN=

# Vercel 배포 시 Playwright 스크린샷 비활성화 (용량 초과 방지)
DISABLE_SCREENSHOTS=false
```

**변경 내역:** 기존 `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` 명칭을 `DATABASE_URL` / `DATABASE_AUTH_TOKEN`으로 통일. `src/db/index.ts`에서 참조하는 환경변수명과 일치.

---

### Task 7: docs/deploy.md — Sprint 8 배포 체크리스트 추가

**변경 파일:**
- 수정: `docs/deploy.md`

**추가 내용 요약:**
- Turso DB 생성 및 `DATABASE_URL`, `DATABASE_AUTH_TOKEN` 환경변수 설정 방법
- Vercel 프로젝트 생성 및 환경변수 등록 절차
- `npx drizzle-kit push` Turso 대상 실행 방법
- Playwright 스크린샷 비활성화(`DISABLE_SCREENSHOTS=true`) 안내
- Vercel 배포 후 기능 검증 체크리스트

---

## 의존성 및 리스크

| 항목 | 내용 | 대응 방안 |
|------|------|-----------|
| Vercel 플랜 제한 | 무료(Hobby) 플랜 최대 10초, Pro 최대 300초 | 일괄 평가(300초)는 Pro 이상 필요. 문서에 명시. |
| Turso 무료 티어 제한 | 월 10억 행 읽기, 25MB 저장 | 해커톤 규모(수십~수백 건)에서는 무료 티어로 충분 |
| Playwright + Vercel 비호환 | Vercel Serverless에서 Chromium 실행 불가 | `DISABLE_SCREENSHOTS=true`로 스크린샷 단계 건너뜀. 배포 보너스는 로컬/Docker 환경에서만 동작. |
| `waitUntil` 비가용 환경 | 로컬 개발(`npm run dev`)에서는 `waitUntil`이 no-op | 로컬에서는 기존과 동일하게 fire-and-forget으로 동작하므로 개발 영향 없음 |
| 환경변수 미설정 | `DATABASE_URL` 미설정 시 `file:./hackathon.db` fallback | 로컬 개발 환경에서는 자동 fallback으로 정상 동작 |

---

## 완료 기준 (Definition of Done)

- ✅ `better-sqlite3` 의존성 제거, `@libsql/client` 설치 완료
- ✅ `src/db/index.ts`가 libsql 드라이버로 재작성되고 `DATABASE_URL` / `DATABASE_AUTH_TOKEN` 환경변수를 읽음
- ✅ `drizzle.config.ts`가 `turso` dialect를 사용하고 `npx drizzle-kit push` 로컬 파일 DB 대상으로 성공
- ✅ `next.config.ts`에 `serverExternalPackages: ["@libsql/client"]` 추가됨
- ✅ 평가 API 두 곳 모두 `waitUntil`로 백그라운드 작업을 래핑함
- ✅ `vercel.json` 생성 — evaluate 300초, re-evaluate 60초 maxDuration 설정
- ✅ `.env.example`에 `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `DISABLE_SCREENSHOTS` 환경변수 문서화
- ✅ `docs/deploy.md`에 Sprint 8 Vercel 배포 절차 추가
- ✅ `npm run build` 에러 없이 성공
- ⬜ Vercel 실제 배포 후 전체 기능 E2E 동작 확인 (수동 검증 필요)

---

## 예상 산출물

| 파일 | 유형 | 설명 |
|------|------|------|
| `package.json` | 수정 | `better-sqlite3` 제거, `@libsql/client` 추가 |
| `src/db/index.ts` | 수정 | libsql 드라이버 기반으로 재작성 |
| `drizzle.config.ts` | 수정 | `turso` dialect + `authToken` 인증 설정 |
| `next.config.ts` | 수정 | `serverExternalPackages`에 `@libsql/client` 추가 |
| `src/app/api/sessions/[id]/evaluate/route.ts` | 수정 | `waitUntil`로 백그라운드 평가 실행 래핑 |
| `src/app/api/sessions/[id]/submissions/[subId]/re-evaluate/route.ts` | 수정 | `waitUntil` 래핑 + 재평가 전 점수 초기화 개선 |
| `vercel.json` | 신규 생성 | 함수별 `maxDuration` 설정 |
| `.env.example` | 수정 | DB 연결 환경변수 (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`) 문서화 |
| `docs/deploy.md` | 수정 | Sprint 8 Vercel 배포 체크리스트 추가 |

---

## 검증 결과

- [Sprint 8 검증 보고서](sprint8/playwright-report.md)

## 배포 체크리스트

자동 검증 및 수동 검증 항목은 `docs/deploy.md`를 참조한다.

### 자동 검증 (빌드 시점)

- ✅ `npm run build` — TypeScript 컴파일 + Next.js 빌드 성공 확인
- ✅ `npx drizzle-kit push` — 로컬 파일 DB 대상으로 스키마 적용 확인

### 수동 검증 (배포 후)

- ⬜ Turso DB 생성 후 `DATABASE_URL`, `DATABASE_AUTH_TOKEN` Vercel 환경변수 등록
- ⬜ Vercel 배포 성공 확인 (`vercel deploy` 또는 GitHub 연동 자동 배포)
- ⬜ 배포 URL에서 참가자 제출 → 관리자 세션 확인 흐름 동작 확인
- ⬜ 배포 URL에서 평가 실행 → 진행 상태 폴링 → 완료 확인 (Pro 플랜 환경)
- ⬜ 결과 대시보드 순위표 + 상세 리포트 정상 렌더링 확인
