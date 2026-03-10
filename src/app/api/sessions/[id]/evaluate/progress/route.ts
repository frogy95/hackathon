// GET /api/sessions/[id]/evaluate/progress — 평가 진행률 조회 (DB 폴링)
import { NextRequest } from "next/server";
import { eq, and, count } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, withAdminAuth } from "@/lib/api-utils";

interface Context {
  params: Promise<{ id: string }>;
}

export const GET = withAdminAuth(async (request: NextRequest, context: unknown) => {
  const { id } = await (context as Context).params;

  // 세션 존재 확인
  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, id))
    .then((r) => r[0]);

  if (!session) {
    return apiError(ErrorCode.NOT_FOUND.code, "세션을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  // DB에서 상태별 카운트 집계
  const rows = await db
    .select({ status: submissions.status, count: count() })
    .from(submissions)
    .where(and(eq(submissions.sessionId, id), eq(submissions.excluded, false)))
    .groupBy(submissions.status);

  // 상태별 카운트 파싱
  const statusCounts: Record<string, number> = {};
  for (const row of rows) {
    statusCounts[row.status] = row.count;
  }

  const done = statusCounts["done"] ?? 0;
  const failed = statusCounts["error"] ?? 0;
  const inProgress =
    (statusCounts["collecting"] ?? 0) + (statusCounts["evaluating"] ?? 0);
  const pending = statusCounts["submitted"] ?? 0;
  const total = done + failed + inProgress + pending;

  return apiSuccess({
    total,
    done,
    failed,
    inProgress,
    pending,
  });
});
