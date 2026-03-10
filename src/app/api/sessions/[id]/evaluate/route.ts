// POST /api/sessions/[id]/evaluate — 일괄 평가 시작
import { NextRequest } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, withAdminAuth } from "@/lib/api-utils";
import { runEvaluation } from "@/lib/evaluation-runner";

interface Context {
  params: Promise<{ id: string }>;
}

export const POST = withAdminAuth(async (request: NextRequest, context: unknown) => {
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
  const allSubs = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.sessionId, id), eq(submissions.excluded, false)));

  // 이미 진행 중인 평가 확인
  const inProgressSubs = allSubs.filter(
    (s) => s.status === "collecting" || s.status === "evaluating"
  );
  if (inProgressSubs.length > 0) {
    return apiError(
      "EVALUATION_IN_PROGRESS",
      `현재 ${inProgressSubs.length}건이 평가 중입니다. 완료 후 재시도해주세요.`,
      409
    );
  }

  // 평가 대상 (done 제외)
  const targets = allSubs.filter((s) => s.status !== "done");

  if (targets.length === 0) {
    return apiError(
      "NO_PENDING_SUBMISSIONS",
      "평가할 제출이 없습니다. 모든 제출이 이미 평가 완료 상태입니다.",
      400
    );
  }

  // 평가 대상 제출 상태를 submitted으로 리셋 (error 건 포함 재평가)
  const targetIds = targets.map((s) => s.id);
  if (targetIds.length > 0) {
    await db
      .update(submissions)
      .set({ status: "submitted", updatedAt: new Date().toISOString() })
      .where(inArray(submissions.id, targetIds));
  }

  // 비동기 백그라운드 실행 (응답을 기다리지 않음)
  runEvaluation(id).catch((err) => {
    console.error(`[평가 오류] 세션 ${id}:`, err);
  });

  return apiSuccess({ message: "평가를 시작했습니다.", total: targets.length }, 202);
});
