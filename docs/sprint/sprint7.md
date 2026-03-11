# Sprint 7: 배포 보너스 + 행운상 추첨 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 4 첫 번째 스프린트. 배포 URL Playwright 스크린샷 캡처 → Claude Vision 기반 보너스 평가, 그리고 행운상 랜덤 추첨 기능을 구현하여 전체 시스템을 확장한다.

**Architecture:** 배포 보너스는 기존 `evaluation-runner.ts` 흐름에 스크린샷 캡처 단계를 추가하고 `ai-evaluator.ts`에 Vision 호출을 통합한다. 행운상 추첨은 `luckyDraws` DB 테이블 + REST API + 클라이언트 애니메이션 컴포넌트로 구성한다. 두 트랙은 독립적으로 구현 가능하며 공유 상태가 없다.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + SQLite, Playwright (headless), Anthropic SDK (Vision), React CSS animation, TypeScript, zod

**기간:** 2026-03-11 ~ 2026-03-17

---

## 구현 범위

### 포함 (In Scope)
- T4-1: Playwright 기반 배포 URL 스크린샷 캡처 (데스크톱 1280x800 + 모바일 390x844)
- T4-2: Claude Vision API 보너스 평가 (배포 가점 3점 + 시각적 완성도 7점 = 최대 10점)
- T4-3: 관리자 UI에 스크린샷 표시 + 보너스 점수 반영 (`ProjectReport`, `RankingTable`)
- T4-4: 행운상 추첨 전체 (DB 스키마, API, 설정 UI, 애니메이션 UI)

### 제외 (Out of Scope)
- T4-5 평가 기준 커스터마이징 UI (Sprint 8)
- T4-6 PDF 리포트 생성 (Sprint 8)
- T4-7 성능 최적화 / Lighthouse (Sprint 8)
- T4-8 Vercel 배포 설정 (Sprint 8)

---

## 작업 분해 (Task Breakdown)

---

### Task 1: screenshot-capturer.ts 구현

**Files:**
- Create: `src/lib/screenshot-capturer.ts`

**의존성:** `@playwright/test` 또는 `playwright` npm 패키지 필요.

**Step 1: playwright 패키지 설치 여부 확인 후 없으면 설치**

```bash
# package.json에서 playwright 존재 여부 확인
grep -i playwright package.json
# 없으면 설치
npm install playwright
npx playwright install chromium
```

예상 출력: `+ playwright@x.x.x` 또는 이미 설치된 경우 버전 출력.

**Step 2: `src/lib/screenshot-capturer.ts` 파일 작성**

```typescript
// Playwright 기반 배포 URL 스크린샷 캡처 모듈
import { chromium } from "playwright";
import path from "path";
import fs from "fs/promises";

export interface ScreenshotResult {
  desktopPath: string | null;   // public/screenshots/{submissionId}-desktop.png
  mobilePath: string | null;    // public/screenshots/{submissionId}-mobile.png
  desktopBase64: string | null; // Vision API 전달용
  mobileBase64: string | null;
  error: string | null;
}

const SCREENSHOTS_DIR = path.join(process.cwd(), "public", "screenshots");

export async function captureScreenshots(
  deployUrl: string,
  submissionId: string
): Promise<ScreenshotResult> {
  // public/screenshots 디렉토리 생성 (없으면)
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const desktopFile = `${submissionId}-desktop.png`;
  const mobileFile = `${submissionId}-mobile.png`;
  const desktopPath = path.join(SCREENSHOTS_DIR, desktopFile);
  const mobilePath = path.join(SCREENSHOTS_DIR, mobileFile);

  try {
    // 데스크톱 캡처
    const desktopCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopCtx.newPage();
    await desktopPage.goto(deployUrl, { waitUntil: "networkidle", timeout: 30000 });
    await desktopPage.waitForTimeout(3000);
    await desktopPage.screenshot({ path: desktopPath, fullPage: false });
    await desktopCtx.close();

    // 모바일 캡처
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto(deployUrl, { waitUntil: "networkidle", timeout: 30000 });
    await mobilePage.waitForTimeout(3000);
    await mobilePage.screenshot({ path: mobilePath, fullPage: false });
    await mobileCtx.close();

    // base64 인코딩 (Vision API용)
    const desktopBuf = await fs.readFile(desktopPath);
    const mobileBuf = await fs.readFile(mobilePath);

    return {
      desktopPath: `/screenshots/${desktopFile}`,
      mobilePath: `/screenshots/${mobileFile}`,
      desktopBase64: desktopBuf.toString("base64"),
      mobileBase64: mobileBuf.toString("base64"),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      desktopPath: null,
      mobilePath: null,
      desktopBase64: null,
      mobileBase64: null,
      error: message,
    };
  } finally {
    await browser.close();
  }
}
```

**Step 3: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

예상 출력: 오류 없음. `playwright` 타입이 없으면 `npm install --save-dev @types/playwright` 또는 `playwright`의 내장 타입 사용.

**Step 4: 커밋**

```bash
git add src/lib/screenshot-capturer.ts package.json package-lock.json
git commit -m "feat: Playwright 스크린샷 캡처 모듈 구현"
```

---

### Task 2: types/evaluation.ts — BonusResult 타입 추가

**Files:**
- Modify: `src/types/evaluation.ts`

**Step 1: `BonusResult` 인터페이스와 `EvaluationResult.bonus` 타입 확장**

현재 `EvaluationResult.bonus`는 `null`로 고정되어 있다. Vision 평가 결과를 담을 타입을 추가한다.

`src/types/evaluation.ts` 파일 끝에 추가:

```typescript
// Vision 기반 배포 보너스 평가 결과
export interface BonusResult {
  deploy_accessible: boolean;   // 배포 URL 접근 가능 여부
  deploy_score: number;         // 최대 3점
  visual_score: number;         // 최대 7점
  reasoning: string;            // 평가 근거
}
```

`EvaluationResult` 인터페이스의 `bonus` 필드 타입을 변경:

```typescript
// 변경 전:
bonus: null;

// 변경 후:
bonus: BonusResult | null;
```

**Step 2: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

예상 출력: 오류 없음. `ai-evaluator.ts`에서 `result.bonus = null` 대입이 여전히 유효하므로 기존 코드는 영향 없음.

**Step 3: 커밋**

```bash
git add src/types/evaluation.ts
git commit -m "feat: BonusResult 타입 추가 (Vision 배포 보너스용)"
```

---

### Task 3: vision-evaluator.ts 구현

**Files:**
- Create: `src/lib/vision-evaluator.ts`

**배경:** Claude Vision API에 스크린샷 base64를 첨부하여 배포 보너스 점수(최대 10점)를 생성한다.

**Step 1: `src/lib/vision-evaluator.ts` 파일 작성**

```typescript
// Claude Vision API 기반 배포 보너스 평가 모듈
import Anthropic from "@anthropic-ai/sdk";
import type { BonusResult } from "@/types/evaluation";

const VISION_SYSTEM_PROMPT = `당신은 웹 애플리케이션 시각적 품질 평가 전문가입니다.
제공된 배포 URL 스크린샷(데스크톱 + 모바일)을 보고 아래 기준으로 평가하세요.

## 평가 기준

### 1. 배포 접근 가능 (deploy_score, 최대 3점)
- 3점: 페이지가 완전히 로드되고 핵심 콘텐츠 표시
- 1-2점: 부분 로드 또는 일부 오류
- 0점: 404/500 에러 페이지, 빈 화면

### 2. 시각적 완성도 (visual_score, 최대 7점)
- 레이아웃 구조 (2점): 헤더/콘텐츠/푸터 등 구조가 명확한가
- 색상/타이포그래피 (2점): 일관된 색상 팔레트, 읽기 쉬운 폰트 사용
- 시각적 계층 (2점): 중요도에 따른 시각적 강조가 적절한가
- 모바일 대응 (1점): 모바일 뷰에서 레이아웃이 깨지지 않는가

## 출력 형식

반드시 아래 JSON만 출력하라. 마크다운 코드블록 없이 순수 JSON만:

{
  "deploy_accessible": <boolean>,
  "deploy_score": <0-3>,
  "visual_score": <0-7>,
  "reasoning": "<데스크톱/모바일 스크린샷 각각에 대한 구체적인 관찰과 근거>"
}`;

const MODEL_MAP: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
};

export async function evaluateWithVision(
  desktopBase64: string,
  mobileBase64: string,
  model?: string
): Promise<BonusResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  }

  const anthropic = new Anthropic({ apiKey });
  // Vision은 sonnet 기본 (haiku도 Vision 지원)
  const modelId = MODEL_MAP[model ?? "sonnet"] ?? MODEL_MAP["sonnet"];

  const message = await anthropic.messages.create({
    model: modelId,
    max_tokens: 1024,
    temperature: 0,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "아래 스크린샷을 평가해주세요.\n\n**데스크톱 뷰 (1280x800):**",
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: desktopBase64,
            },
          },
          {
            type: "text",
            text: "**모바일 뷰 (390x844):**",
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: mobileBase64,
            },
          },
        ],
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // JSON 파싱
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `Vision 응답에서 JSON 추출 실패. 응답: ${responseText.slice(0, 300)}`
    );
  }

  const parsed = JSON.parse(jsonMatch[0]) as BonusResult;
  // 점수 범위 보정
  parsed.deploy_score = Math.max(0, Math.min(3, parsed.deploy_score));
  parsed.visual_score = Math.max(0, Math.min(7, parsed.visual_score));
  return parsed;
}
```

**Step 2: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

예상 출력: 오류 없음.

**Step 3: 커밋**

```bash
git add src/lib/vision-evaluator.ts
git commit -m "feat: Claude Vision API 배포 보너스 평가 모듈 구현"
```

---

### Task 4: evaluation-runner.ts — 스크린샷 캡처 + Vision 평가 통합

**Files:**
- Modify: `src/lib/evaluation-runner.ts`

**배경:** `evaluateSingle` 함수에 스크린샷 캡처 단계를 추가한다. `deployUrl`이 있는 경우에만 실행하며, 캡처 실패 시 보너스 0점으로 처리하되 평가는 계속 진행한다.

**Step 1: `evaluateSingle` 함수 수정**

`evaluation-runner.ts`에서 import 추가:

```typescript
import { captureScreenshots } from "./screenshot-capturer";
import { evaluateWithVision } from "./vision-evaluator";
```

AI 평가 단계 이후, `saveEvaluationResult` 호출 전에 다음 블록 삽입:

```typescript
// 스크린샷 캡처 + Vision 보너스 평가 (deployUrl이 있는 경우)
let screenshotsJson: string | null = null;
if (submission.deployUrl) {
  try {
    const shots = await captureScreenshots(submission.deployUrl, submissionId);
    if (shots.error) {
      console.warn(`[스크린샷] ${submissionId}: ${shots.error}`);
      // 보너스 0점, error 기록
      result.bonus = null;
      result.bonus_score = 0;
    } else {
      screenshotsJson = JSON.stringify({
        desktop: shots.desktopPath,
        mobile: shots.mobilePath,
      });

      const visionResult = await evaluateWithVision(
        shots.desktopBase64!,
        shots.mobileBase64!,
        model
      );
      result.bonus = visionResult;
      result.bonus_score = visionResult.deploy_score + visionResult.visual_score;
      result.total_score = result.base_score + result.bonus_score;
    }
  } catch (visionErr) {
    const visionMsg = visionErr instanceof Error ? visionErr.message : String(visionErr);
    console.warn(`[Vision 평가 오류] ${submissionId}: ${visionMsg}`);
    result.bonus = null;
    result.bonus_score = 0;
  }
}

// screenshots DB 저장
if (screenshotsJson) {
  await db
    .update(submissions)
    .set({ screenshots: screenshotsJson })
    .where(eq(submissions.id, submissionId));
}
```

**Step 2: `saveEvaluationResult` 함수 수정 (`ai-evaluator.ts`)**

`BonusResult | null` 타입을 올바르게 직렬화하기 위해 `submissions` 업데이트 부분에서 `bonusScore` 저장 확인:

현재 코드가 `result.bonus_score`를 `bonusScore`로 저장하고 있으므로 추가 수정 불필요.
단, bonus reasoning을 scores 테이블에 "bonus" 키로 저장하려면 다음을 `saveEvaluationResult` 끝에 추가:

```typescript
// 배포 보너스 reasoning 저장 (bonus가 있는 경우)
if (result.bonus) {
  const bonusScoreId = crypto.randomUUID();
  await db.insert(scores).values({
    id: bonusScoreId,
    submissionId,
    criteriaKey: "bonus",
    score: result.bonus_score,
    maxScore: 10,
    reasoning: result.bonus.reasoning,
  });
}
```

**Step 3: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

예상 출력: 오류 없음.

**Step 4: 커밋**

```bash
git add src/lib/evaluation-runner.ts src/lib/ai-evaluator.ts
git commit -m "feat: 평가 파이프라인에 스크린샷 캡처 + Vision 보너스 평가 통합"
```

---

### Task 5: ProjectReport.tsx — 스크린샷 + 보너스 섹션 추가

**Files:**
- Modify: `src/components/admin/ProjectReport.tsx`

**배경:** 상세 리포트에 스크린샷 이미지(데스크톱/모바일)와 Vision 평가 근거를 표시한다.

**Step 1: `ProjectReportData` 인터페이스에 스크린샷 필드 추가**

```typescript
interface ProjectReportData {
  // 기존 필드들...
  screenshots: { desktop: string | null; mobile: string | null } | null; // 추가
  bonusReasoning: string | null; // 이미 있음
}
```

**Step 2: 스크린샷 섹션 JSX 추가**

`{/* 항목별 평가 근거 */}` 섹션 바로 위에 삽입:

```tsx
{/* 스크린샷 */}
{report.screenshots && (report.screenshots.desktop || report.screenshots.mobile) && (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">배포 URL 스크린샷</CardTitle>
    </CardHeader>
    <CardContent className="grid md:grid-cols-2 gap-4">
      {report.screenshots.desktop && (
        <div>
          <p className="text-xs text-zinc-400 mb-1.5">데스크톱 (1280x800)</p>
          <img
            src={report.screenshots.desktop}
            alt="데스크톱 스크린샷"
            className="w-full rounded border border-zinc-200"
          />
        </div>
      )}
      {report.screenshots.mobile && (
        <div>
          <p className="text-xs text-zinc-400 mb-1.5">모바일 (390x844)</p>
          <img
            src={report.screenshots.mobile}
            alt="모바일 스크린샷"
            className="w-full rounded border border-zinc-200"
          />
        </div>
      )}
    </CardContent>
  </Card>
)}
```

**Step 3: results 페이지 서버 컴포넌트에서 `screenshots` 데이터 전달 확인**

`src/app/admin/session/[sessionId]/results/[submissionId]/page.tsx` (또는 결과 상세 페이지)에서 `submissions.screenshots` 컬럼을 파싱하여 `ProjectReport`에 전달한다:

```typescript
const screenshotsRaw = submission.screenshots
  ? (JSON.parse(submission.screenshots) as { desktop: string | null; mobile: string | null })
  : null;
```

**Step 4: 빌드 오류 확인**

```bash
npm run build
```

예상 출력: 오류 없음.

**Step 5: 커밋**

```bash
git add src/components/admin/ProjectReport.tsx
git commit -m "feat: ProjectReport에 스크린샷 + Vision 보너스 섹션 추가"
```

---

### Task 6: DB 스키마 — luckyDraws 테이블 추가

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: `luckyDraws` 테이블 추가**

`src/db/schema.ts` 파일 끝에 추가:

```typescript
// 행운상 추첨 이력
export const luckyDraws = sqliteTable("lucky_draws", {
  id: text("id").primaryKey(), // UUID
  sessionId: text("session_id")
    .notNull()
    .references(() => evaluationSessions.id),
  drawnAt: text("drawn_at").notNull().default(sql`(datetime('now'))`),
  // 추첨 설정
  winnerCount: integer("winner_count").notNull().default(1),
  poolType: text("pool_type").notNull().default("all"), // "all" | "evaluated" | "bottom_n_percent"
  bottomPercent: integer("bottom_percent"), // poolType이 "bottom_n_percent"일 때
  excludedIds: text("excluded_ids"), // JSON: string[] — 제외할 submissionId 목록
  // 추첨 결과
  winners: text("winners").notNull(), // JSON: Array<{ submissionId, name, email }>
});
```

**Step 2: DB 스키마 적용**

```bash
npx drizzle-kit push
```

예상 출력: `lucky_draws` 테이블 생성 확인.

**Step 3: 커밋**

```bash
git add src/db/schema.ts
git commit -m "feat: luckyDraws DB 테이블 추가"
```

---

### Task 7: types/index.ts — LuckyDraw 타입 추가

**Files:**
- Modify: `src/types/index.ts`

**Step 1: `LuckyDraw` 관련 타입 추가**

`src/types/index.ts` 파일 끝에 추가:

```typescript
export type LuckyDrawPoolType = "all" | "evaluated" | "bottom_n_percent";

export interface LuckyDrawWinner {
  submissionId: string;
  name: string;
  email: string;
}

export interface LuckyDraw {
  id: string;
  sessionId: string;
  drawnAt: string;
  winnerCount: number;
  poolType: LuckyDrawPoolType;
  bottomPercent: number | null;
  excludedIds: string[];
  winners: LuckyDrawWinner[];
}
```

**Step 2: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

**Step 3: 커밋**

```bash
git add src/types/index.ts
git commit -m "feat: LuckyDraw 관련 타입 추가"
```

---

### Task 8: validations.ts — luckyDrawSchema 추가

**Files:**
- Modify: `src/lib/validations.ts`

**Step 1: `luckyDrawSchema` 추가**

`src/lib/validations.ts` 파일 끝에 추가:

```typescript
// 행운상 추첨 요청 스키마
export const luckyDrawSchema = z.object({
  winnerCount: z
    .number()
    .int()
    .min(1, "당첨 인원은 1명 이상이어야 합니다.")
    .max(50, "당첨 인원은 50명 이하여야 합니다."),
  poolType: z.enum(["all", "evaluated", "bottom_n_percent"] as const),
  bottomPercent: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .nullable(),
  excludedIds: z.array(z.string()).default([]),
});

export type LuckyDrawData = z.infer<typeof luckyDrawSchema>;
```

**Step 2: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

**Step 3: 커밋**

```bash
git add src/lib/validations.ts
git commit -m "feat: luckyDrawSchema 유효성 검증 스키마 추가"
```

---

### Task 9: lucky-draw API Route 구현

**Files:**
- Create: `src/app/api/sessions/[id]/lucky-draw/route.ts`

**Step 1: `route.ts` 파일 작성**

```typescript
// POST /api/sessions/[id]/lucky-draw — 추첨 실행 + 결과 저장
import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions, luckyDraws } from "@/db/schema";
import { apiSuccess, apiError, withAdminAuth, parseBody } from "@/lib/api-utils";
import { luckyDrawSchema } from "@/lib/validations";
import type { LuckyDrawWinner } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(req, async () => {
    const { id: sessionId } = await params;

    // 세션 존재 확인
    const session = await db
      .select()
      .from(evaluationSessions)
      .where(eq(evaluationSessions.id, sessionId))
      .then((r) => r[0]);

    if (!session) {
      return apiError("SESSION_NOT_FOUND", "세션을 찾을 수 없습니다.", 404);
    }

    const body = await parseBody(req, luckyDrawSchema);
    if (!body.success) {
      return apiError("INVALID_REQUEST", body.error, 400);
    }

    const { winnerCount, poolType, bottomPercent, excludedIds } = body.data;

    // 추첨 대상 풀 구성
    let pool = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.sessionId, sessionId),
          eq(submissions.excluded, false)
        )
      );

    if (poolType === "evaluated") {
      pool = pool.filter((s) => s.status === "done");
    } else if (poolType === "bottom_n_percent" && bottomPercent) {
      // 점수 있는 것만, 총점 오름차순 후 하위 N%
      const scored = pool
        .filter((s) => s.totalScore !== null)
        .sort((a, b) => (a.totalScore ?? 0) - (b.totalScore ?? 0));
      const cutoff = Math.ceil(scored.length * (bottomPercent / 100));
      pool = scored.slice(0, cutoff);
    }

    // excludedIds 제외
    pool = pool.filter((s) => !excludedIds.includes(s.id));

    if (pool.length === 0) {
      return apiError("EMPTY_POOL", "추첨 대상자가 없습니다.", 400);
    }

    if (winnerCount > pool.length) {
      return apiError(
        "WINNER_COUNT_EXCEEDS_POOL",
        `추첨 인원(${winnerCount}명)이 대상자 수(${pool.length}명)를 초과합니다.`,
        400
      );
    }

    // Fisher-Yates 셔플 후 앞 winnerCount개 선택
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, winnerCount);

    const winners: LuckyDrawWinner[] = selected.map((s) => ({
      submissionId: s.id,
      name: s.name,
      email: s.email,
    }));

    // DB 저장
    const drawId = crypto.randomUUID();
    await db.insert(luckyDraws).values({
      id: drawId,
      sessionId,
      winnerCount,
      poolType,
      bottomPercent: bottomPercent ?? null,
      excludedIds: JSON.stringify(excludedIds),
      winners: JSON.stringify(winners),
    });

    return apiSuccess({ drawId, winners, poolSize: pool.length });
  });
}

// GET /api/sessions/[id]/lucky-draw — 최근 추첨 이력 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(req, async () => {
    const { id: sessionId } = await params;

    const draws = await db
      .select()
      .from(luckyDraws)
      .where(eq(luckyDraws.sessionId, sessionId))
      .orderBy(luckyDraws.drawnAt);

    const parsed = draws.map((d) => ({
      ...d,
      excludedIds: JSON.parse(d.excludedIds ?? "[]") as string[],
      winners: JSON.parse(d.winners) as LuckyDrawWinner[],
    }));

    return apiSuccess(parsed);
  });
}
```

**Step 2: 빌드 오류 확인**

```bash
npm run build
```

예상 출력: 오류 없음.

**Step 3: 커밋**

```bash
git add src/app/api/sessions/[id]/lucky-draw/route.ts
git commit -m "feat: 행운상 추첨 API Route 구현 (POST/GET)"
```

---

### Task 10: LuckyDrawSettings.tsx — 추첨 설정 클라이언트 컴포넌트

**Files:**
- Create: `src/components/admin/LuckyDrawSettings.tsx`

**Step 1: `LuckyDrawSettings.tsx` 작성**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LuckyDrawWinner, LuckyDrawPoolType } from "@/types";

interface LuckyDrawSettingsProps {
  sessionId: string;
  submissions: Array<{ id: string; name: string; email: string }>;
  onWinnersDrawn: (winners: LuckyDrawWinner[]) => void;
}

export function LuckyDrawSettings({
  sessionId,
  submissions,
  onWinnersDrawn,
}: LuckyDrawSettingsProps) {
  const [winnerCount, setWinnerCount] = useState(1);
  const [poolType, setPoolType] = useState<LuckyDrawPoolType>("all");
  const [bottomPercent, setBottomPercent] = useState(30);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDraw = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/lucky-draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerCount,
          poolType,
          bottomPercent: poolType === "bottom_n_percent" ? bottomPercent : null,
          excludedIds,
        }),
      });

      const json = await res.json() as {
        success: boolean;
        data?: { winners: LuckyDrawWinner[]; poolSize: number };
        error?: { message: string };
      };

      if (!json.success || !json.data) {
        toast.error(json.error?.message ?? "추첨에 실패했습니다.");
        return;
      }

      toast.success(`추첨 완료: ${json.data.winners.length}명 선정 (풀 크기: ${json.data.poolSize}명)`);
      onWinnersDrawn(json.data.winners);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">추첨 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 당첨 인원 */}
        <div className="space-y-1.5">
          <Label htmlFor="winner-count">당첨 인원 수</Label>
          <Input
            id="winner-count"
            type="number"
            min={1}
            max={50}
            value={winnerCount}
            onChange={(e) => setWinnerCount(Number(e.target.value))}
            className="w-32"
          />
        </div>

        {/* 추첨 대상 범위 */}
        <div className="space-y-1.5">
          <Label>추첨 대상 범위</Label>
          <div className="flex flex-col gap-1.5">
            {(
              [
                { value: "all", label: "전체 제출자" },
                { value: "evaluated", label: "평가 완료 대상자만" },
                { value: "bottom_n_percent", label: "점수 하위 N%" },
              ] as const
            ).map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="pool-type"
                  value={value}
                  checked={poolType === value}
                  onChange={() => setPoolType(value)}
                />
                {label}
              </label>
            ))}
          </div>
          {poolType === "bottom_n_percent" && (
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                type="number"
                min={1}
                max={100}
                value={bottomPercent}
                onChange={(e) => setBottomPercent(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-zinc-500">%</span>
            </div>
          )}
        </div>

        {/* 제외 대상 */}
        {submissions.length > 0 && (
          <div className="space-y-1.5">
            <Label>제외할 참가자 (체크 = 추첨 제외)</Label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
              {submissions.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={excludedIds.includes(s.id)}
                    onChange={() => toggleExclude(s.id)}
                  />
                  <span>{s.name}</span>
                  <span className="text-zinc-400 text-xs">{s.email}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleDraw} disabled={loading} className="w-full">
          {loading ? "추첨 중..." : "추첨 시작"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 2: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

**Step 3: 커밋**

```bash
git add src/components/admin/LuckyDrawSettings.tsx
git commit -m "feat: LuckyDrawSettings 추첨 설정 컴포넌트 구현"
```

---

### Task 11: LuckyDrawAnimation.tsx — 추첨 애니메이션 컴포넌트

**Files:**
- Create: `src/components/admin/LuckyDrawAnimation.tsx`

**Step 1: `LuckyDrawAnimation.tsx` 작성**

슬롯머신 스타일: 당첨자 이름이 빠르게 스크롤되다가 멈추는 CSS animation.

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import type { LuckyDrawWinner } from "@/types";

interface LuckyDrawAnimationProps {
  winners: LuckyDrawWinner[];
  allNames: string[]; // 풀 전체 이름 목록 (슬롯 효과용)
  onReset: () => void;
}

type Phase = "idle" | "spinning" | "done";

export function LuckyDrawAnimation({
  winners,
  allNames,
  onReset,
}: LuckyDrawAnimationProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayedName, setDisplayedName] = useState("");
  const [currentWinnerIdx, setCurrentWinnerIdx] = useState(0);
  const [revealedWinners, setRevealedWinners] = useState<LuckyDrawWinner[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const startSpin = () => {
    if (phase === "spinning") return;
    setPhase("spinning");

    const target = winners[currentWinnerIdx];
    if (!target) return;

    // 1.5초 동안 랜덤 이름 표시 후 당첨자 이름으로 고정
    const interval = setInterval(() => {
      const randomName = allNames[Math.floor(Math.random() * allNames.length)];
      setDisplayedName(randomName ?? "");
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      setDisplayedName(target.name);
      setPhase("done");
      setRevealedWinners((prev) => [...prev, target]);
    }, 1500);
  };

  const handleNext = () => {
    const nextIdx = currentWinnerIdx + 1;
    if (nextIdx < winners.length) {
      setCurrentWinnerIdx(nextIdx);
      setPhase("idle");
      setDisplayedName("");
    }
  };

  const toggleFullscreen = () => setIsFullscreen((f) => !f);

  const isAllRevealed = revealedWinners.length === winners.length;

  return (
    <div
      className={`transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center"
          : "rounded-xl border border-zinc-200 bg-zinc-50 p-6"
      }`}
    >
      {/* 전체화면 토글 */}
      <div className={`${isFullscreen ? "absolute top-4 right-4" : "flex justify-end mb-4"}`}>
        <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 슬롯 디스플레이 */}
      <div
        className={`text-center ${isFullscreen ? "text-white" : ""} space-y-6`}
      >
        <div
          className={`font-bold tabular-nums transition-all ${
            isFullscreen ? "text-8xl" : "text-5xl"
          } ${
            phase === "spinning" ? "animate-pulse text-yellow-400" : ""
          } ${
            phase === "done" ? "text-green-500" : isFullscreen ? "text-white" : "text-zinc-800"
          }`}
        >
          {displayedName || (phase === "idle" ? "?" : "")}
        </div>

        {phase === "done" && (
          <p
            className={`${
              isFullscreen ? "text-zinc-300 text-xl" : "text-zinc-500 text-sm"
            }`}
          >
            {revealedWinners.length}번째 당첨자
          </p>
        )}

        {/* 버튼 영역 */}
        <div className="flex gap-3 justify-center">
          {phase === "idle" && !isAllRevealed && (
            <Button
              onClick={startSpin}
              className={isFullscreen ? "text-lg px-8 py-4 h-auto" : ""}
            >
              {currentWinnerIdx === 0 ? "추첨 시작" : "다음 추첨"}
            </Button>
          )}
          {phase === "done" && !isAllRevealed && (
            <Button onClick={handleNext} variant="outline">
              다음 당첨자 공개
            </Button>
          )}
        </div>
      </div>

      {/* 당첨자 목록 */}
      {revealedWinners.length > 0 && (
        <div className={`${isFullscreen ? "mt-12 text-white" : "mt-6"} space-y-2`}>
          <p
            className={`font-semibold text-sm ${
              isFullscreen ? "text-zinc-300" : "text-zinc-500"
            }`}
          >
            당첨자 목록
          </p>
          <ul className="space-y-1">
            {revealedWinners.map((w, i) => (
              <li
                key={w.submissionId}
                className={`${
                  isFullscreen ? "text-xl text-white" : "text-sm text-zinc-800"
                } flex items-center gap-2`}
              >
                <span className="text-zinc-400">{i + 1}.</span>
                <span className="font-medium">{w.name}</span>
                <span className={isFullscreen ? "text-zinc-400" : "text-zinc-400 text-xs"}>
                  {w.email}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 재추첨 버튼 */}
      {isAllRevealed && (
        <div className="mt-6">
          <Button variant="outline" onClick={onReset}>
            재추첨
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

**Step 3: 커밋**

```bash
git add src/components/admin/LuckyDrawAnimation.tsx
git commit -m "feat: LuckyDrawAnimation 슬롯머신 스타일 추첨 애니메이션 컴포넌트 구현"
```

---

### Task 12: lucky-draw 페이지 구현

**Files:**
- Create: `src/app/admin/session/[sessionId]/lucky-draw/page.tsx`

**Step 1: 페이지 파일 작성**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions } from "@/db/schema";
import { ArrowLeft } from "lucide-react";
import { LuckyDrawPageClient } from "./LuckyDrawPageClient";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function LuckyDrawPage({ params }: Props) {
  const { sessionId } = await params;

  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, sessionId))
    .then((r) => r[0]);

  if (!session) notFound();

  const subs = await db
    .select({
      id: submissions.id,
      name: submissions.name,
      email: submissions.email,
      status: submissions.status,
      totalScore: submissions.totalScore,
      excluded: submissions.excluded,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.sessionId, sessionId),
        eq(submissions.excluded, false)
      )
    )
    .orderBy(submissions.submittedAt);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/admin/session/${sessionId}`}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        세션으로 돌아가기
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900 mb-1">행운상 추첨</h1>
      <p className="text-sm text-zinc-500 mb-8">{session.name}</p>

      <LuckyDrawPageClient sessionId={sessionId} submissions={subs} />
    </div>
  );
}
```

**Step 2: LuckyDrawPageClient.tsx 작성 (상태 관리)**

```tsx
"use client";

import { useState } from "react";
import { LuckyDrawSettings } from "@/components/admin/LuckyDrawSettings";
import { LuckyDrawAnimation } from "@/components/admin/LuckyDrawAnimation";
import type { LuckyDrawWinner } from "@/types";

interface Sub {
  id: string;
  name: string;
  email: string;
  status: string;
  totalScore: number | null;
  excluded: boolean;
}

interface Props {
  sessionId: string;
  submissions: Sub[];
}

export function LuckyDrawPageClient({ sessionId, submissions }: Props) {
  const [winners, setWinners] = useState<LuckyDrawWinner[] | null>(null);

  const allNames = submissions.map((s) => s.name);

  const handleReset = () => setWinners(null);

  if (winners) {
    return (
      <LuckyDrawAnimation
        winners={winners}
        allNames={allNames}
        onReset={handleReset}
      />
    );
  }

  return (
    <LuckyDrawSettings
      sessionId={sessionId}
      submissions={submissions}
      onWinnersDrawn={setWinners}
    />
  );
}
```

**Step 3: 빌드 오류 확인**

```bash
npm run build
```

예상 출력: 오류 없음.

**Step 4: 커밋**

```bash
git add src/app/admin/session/[sessionId]/lucky-draw/page.tsx src/app/admin/session/[sessionId]/lucky-draw/LuckyDrawPageClient.tsx
git commit -m "feat: 행운상 추첨 페이지 구현 (설정 + 애니메이션)"
```

---

### Task 13: 세션 상세 페이지에 행운상 추첨 버튼 추가

**Files:**
- Modify: `src/app/admin/session/[sessionId]/page.tsx`

**Step 1: "행운상 추첨" 링크 버튼 추가**

`src/app/admin/session/[sessionId]/page.tsx`의 `{/* 액션 버튼 */}` 섹션에서 "결과 대시보드" 버튼 옆에 추가:

```tsx
import { Gift } from "lucide-react"; // 상단 import에 추가

// 버튼 목록에 추가:
<Link href={`/admin/session/${sessionId}/lucky-draw`}>
  <Button size="sm" variant="outline">
    <Gift className="h-4 w-4 mr-1.5" />
    행운상 추첨
  </Button>
</Link>
```

**Step 2: 빌드 오류 확인**

```bash
npm run build
```

**Step 3: 커밋**

```bash
git add src/app/admin/session/[sessionId]/page.tsx
git commit -m "feat: 세션 상세 페이지에 행운상 추첨 버튼 추가"
```

---

## 의존성 및 리스크

| 항목 | 내용 | 대응 방안 |
|------|------|-----------|
| Playwright 서버 실행 | Next.js API Route 내 headless Chromium 실행 — 로컬은 정상, Vercel 환경 미지원 | 로컬/Docker 실행 기준으로 구현; 배포 환경 제약은 Sprint 8 deploy.md에 기록 |
| Vision 이미지 크기 | 1280x800 PNG → base64 후 약 2-4MB, API 요청 크기 제한 주의 | `captureScreenshots`에서 PNG 압축 또는 JPEG 변환으로 크기 축소 가능 |
| Playwright 설치 크기 | Chromium 바이너리 약 300MB | 개발/서버 환경에서만 설치, 운영 환경 주의 |
| luckyDraws DB 마이그레이션 | `npx drizzle-kit push` 실행 필요 | 개발자가 직접 실행 (deploy.md에 기록) |

---

## 완료 기준 (Definition of Done)

- ✅ `captureScreenshots` 함수가 실제 배포 URL에 대해 데스크톱/모바일 PNG를 `public/screenshots/`에 저장
- ✅ `evaluateWithVision` 함수가 스크린샷을 Claude Vision에 전달하여 `VisionEvaluationResult` JSON을 반환
- ✅ 평가 실행 시 `deployUrl`이 있는 제출 건에 `bonusScore` 저장, `totalScore = baseScore + bonusScore`
- ✅ `ProjectReport` 상세 리포트에 스크린샷 이미지 + Vision 평가 근거 표시
- ✅ `RankingTable` 배포 보너스 토글 시 보너스 점수 포함/미포함 순위 재계산
- ✅ `POST /api/sessions/[id]/lucky-draw` 가 설정에 따라 랜덤 당첨자를 선정하고 DB에 저장
- ⬜ `/admin/session/[sessionId]/lucky-draw` 페이지에서 설정 → 슬롯 애니메이션 → 당첨자 표시 → 재추첨 흐름 동작 (수동 검증 필요)
- ✅ `npm run build` 오류 없이 성공

## 검증 결과

- [Playwright 검증 보고서 및 코드 리뷰](sprint7/playwright-report.md)

---

## 예상 산출물

| 파일 | 유형 | 설명 |
|------|------|------|
| `src/lib/screenshot-capturer.ts` | 신규 | Playwright 스크린샷 캡처 모듈 |
| `src/lib/vision-evaluator.ts` | 신규 | Claude Vision 보너스 평가 모듈 |
| `src/types/evaluation.ts` | 수정 | `BonusResult` 타입 추가 |
| `src/lib/evaluation-runner.ts` | 수정 | 스크린샷/Vision 단계 통합 |
| `src/lib/ai-evaluator.ts` | 수정 | bonus reasoning DB 저장 추가 |
| `src/components/admin/ProjectReport.tsx` | 수정 | 스크린샷 + 보너스 섹션 추가 |
| `src/db/schema.ts` | 수정 | `luckyDraws` 테이블 추가 |
| `src/types/index.ts` | 수정 | `LuckyDraw` 관련 타입 추가 |
| `src/lib/validations.ts` | 수정 | `luckyDrawSchema` 추가 |
| `src/app/api/sessions/[id]/lucky-draw/route.ts` | 신규 | 추첨 API (POST/GET) |
| `src/components/admin/LuckyDrawSettings.tsx` | 신규 | 추첨 설정 컴포넌트 |
| `src/components/admin/LuckyDrawAnimation.tsx` | 신규 | 슬롯머신 애니메이션 컴포넌트 |
| `src/app/admin/session/[sessionId]/lucky-draw/page.tsx` | 신규 | 추첨 페이지 (서버) |
| `src/app/admin/session/[sessionId]/lucky-draw/LuckyDrawPageClient.tsx` | 신규 | 추첨 페이지 (클라이언트 상태) |
| `src/app/admin/session/[sessionId]/page.tsx` | 수정 | 행운상 추첨 버튼 추가 |

---

## Playwright MCP 검증 시나리오

> `npm run dev` 실행 후 아래 순서로 검증

### 배포 보너스 검증
1. `browser_navigate` → 관리자 세션 상세 페이지 접속
2. `browser_click` → "평가 실행" (deployUrl 있는 제출 건 포함)
3. `browser_wait_for` → 평가 완료 대기
4. `browser_navigate` → 결과 대시보드 순위표
5. `browser_snapshot` → 보너스 점수 컬럼 표시 확인
6. `browser_click` → 배포 보너스 포함/미포함 토글
7. `browser_snapshot` → 순위 변동 확인
8. `browser_click` → deployUrl 있는 프로젝트 상세 리포트
9. `browser_snapshot` → 스크린샷 이미지 + Vision 평가 근거 표시 확인

### 행운상 추첨 검증
1. `browser_navigate` → `/admin/session/{sessionId}/lucky-draw` 접속
2. `browser_snapshot` → 추첨 설정 UI 확인 (당첨 인원, 범위, 제외 목록)
3. `browser_type` → 당첨 인원 수 입력
4. `browser_click` → "추첨 시작" 버튼
5. `browser_wait_for` → 슬롯 애니메이션 완료 대기 (약 2초)
6. `browser_snapshot` → 당첨자 이름 표시 확인
7. `browser_click` → "재추첨" 버튼
8. `browser_snapshot` → 설정 화면으로 복귀 확인
9. `browser_network_requests` → `POST /api/sessions/.../lucky-draw` 200 응답 확인

### 공통 검증
- `browser_console_messages(level: "error")` → 콘솔 에러 없음
- `browser_network_requests` → 모든 API 호출 2xx 응답
