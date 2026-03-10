// POST /api/sessions/[id]/submissions/[subId]/re-evaluate — 개별 재평가
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, withAdminAuth } from "@/lib/api-utils";
import { evaluateSingle } from "@/lib/evaluation-runner";

interface Context {
  params: Promise<{ id: string; subId: string }>;
}

export const POST = withAdminAuth(async (request: NextRequest, context: unknown) => {
  const { id, subId } = await (context as Context).params;

  // 세션 존재 확인
  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, id))
    .then((r) => r[0]);

  if (!session) {
    return apiError(ErrorCode.NOT_FOUND.code, "세션을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  // 제출 존재 확인
  const submission = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, subId))
    .then((r) => r[0]);

  if (!submission || submission.sessionId !== id) {
    return apiError(ErrorCode.NOT_FOUND.code, "제출을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  // 이미 진행 중이면 거부
  if (submission.status === "collecting" || submission.status === "evaluating") {
    return apiError(
      "EVALUATION_IN_PROGRESS",
      "이미 평가가 진행 중입니다.",
      409
    );
  }

  // 동기 실행 (완료까지 대기)
  try {
    await evaluateSingle(subId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return apiError(
      ErrorCode.INTERNAL_ERROR.code,
      `재평가 실패: ${message}`,
      ErrorCode.INTERNAL_ERROR.status
    );
  }

  // 업데이트된 제출 조회
  const updated = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, subId))
    .then((r) => r[0]);

  return apiSuccess(updated);
});
