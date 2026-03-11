// POST /api/sessions/[id]/evaluate/reset — 평가 결과 전체 리셋
import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions, scores } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, withAdminAuth } from "@/lib/api-utils";

interface Context {
  params: Promise<{ id: string }>;
}

export const POST = withAdminAuth(async (_request: NextRequest, context: unknown) => {
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

  // 비제외 제출 목록 조회
  const targets = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.sessionId, id), eq(submissions.excluded, false)));

  if (targets.length === 0) {
    return apiError("NO_SUBMISSIONS", "리셋할 제출이 없습니다.", 400);
  }

  // scores 삭제 (각 제출의 점수 기록 제거)
  for (const sub of targets) {
    await db.delete(scores).where(eq(scores.submissionId, sub.id));
  }

  // submissions 상태 및 점수 초기화
  await db
    .update(submissions)
    .set({
      status: "submitted",
      totalScore: null,
      baseScore: null,
      bonusScore: null,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(submissions.sessionId, id), eq(submissions.excluded, false)));

  return apiSuccess({ message: "평가가 리셋되었습니다.", count: targets.length });
});
