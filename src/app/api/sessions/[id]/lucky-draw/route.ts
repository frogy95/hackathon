// 행운상 추첨 API
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions, luckyDraws } from "@/db/schema";
import { luckyDrawSchema } from "@/lib/validations";
import { withAdminAuth, apiError } from "@/lib/api-utils";
import type { LuckyDrawWinner } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Fisher-Yates 셔플 (crypto.getRandomValues 사용)
function secureShuffleAndPick<T>(arr: T[], count: number): T[] {
  const array = [...arr];
  const pickCount = Math.min(count, array.length);

  for (let i = array.length - 1; i > array.length - 1 - pickCount; i--) {
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const j = randomBytes[0] % (i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array.slice(array.length - pickCount);
}

// POST: 추첨 실행
export const POST = withAdminAuth(async (req: NextRequest, context: unknown) => {
  const { params } = context as RouteParams;
  const { id: sessionId } = await params;

  // 세션 존재 확인
  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, sessionId))
    .then((r) => r[0]);

  if (!session) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }

  // 요청 바디 파싱
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 바디가 올바르지 않습니다." }, { status: 400 });
  }

  const parsed = luckyDrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "요청 데이터가 유효하지 않습니다.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { winnerCount, targetRange, excludeSubmissionIds } = parsed.data;

  // 대상 제출 목록 조회
  const allSubs = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.sessionId, sessionId),
        eq(submissions.excluded, false)
      )
    );

  // 범위 필터링
  let candidates = targetRange === "done"
    ? allSubs.filter((s) => s.status === "done")
    : allSubs;

  // 기존 당첨자 조회 → 자동 제외
  const previousDraws = await db
    .select()
    .from(luckyDraws)
    .where(eq(luckyDraws.sessionId, sessionId));

  const previousWinnerIds = new Set(
    previousDraws.flatMap((d) => {
      const winners = JSON.parse(d.winners) as LuckyDrawWinner[];
      return winners.map((w) => w.submissionId);
    })
  );

  // 제외 목록 제거 (수동 제외 + 이전 당첨자 자동 제외)
  candidates = candidates.filter(
    (s) => !excludeSubmissionIds.includes(s.id) && !previousWinnerIds.has(s.id)
  );

  if (candidates.length === 0) {
    return NextResponse.json({ error: "추첨 대상이 없습니다." }, { status: 400 });
  }

  // 추첨
  const pickedSubs = secureShuffleAndPick(candidates, winnerCount);
  const winners: LuckyDrawWinner[] = pickedSubs.map((s) => ({
    submissionId: s.id,
    name: s.name,
    email: s.email,
    jobRole: s.jobRole as import("@/types").JobRole,
  }));

  // DB 저장
  const drawId = crypto.randomUUID();
  await db.insert(luckyDraws).values({
    id: drawId,
    sessionId,
    settings: JSON.stringify({ winnerCount, targetRange, excludeSubmissionIds }),
    winners: JSON.stringify(winners),
  });

  return NextResponse.json({ id: drawId, winners, candidateCount: candidates.length });
});

// GET: 추첨 이력 조회
export const GET = withAdminAuth(async (_req: NextRequest, context: unknown) => {
  const { params } = context as RouteParams;
  const { id: sessionId } = await params;

  const draws = await db
    .select()
    .from(luckyDraws)
    .where(eq(luckyDraws.sessionId, sessionId))
    .orderBy(luckyDraws.createdAt);

  const parsed = draws.map((d) => ({
    id: d.id,
    sessionId: d.sessionId,
    settings: JSON.parse(d.settings) as import("@/types").LuckyDrawSettings,
    winners: JSON.parse(d.winners) as LuckyDrawWinner[],
    createdAt: d.createdAt,
  }));

  return NextResponse.json(parsed);
});
