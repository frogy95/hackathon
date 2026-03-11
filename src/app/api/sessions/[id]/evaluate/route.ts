// POST /api/sessions/[id]/evaluate — 일괄 평가 시작 (done 제외)
import { NextRequest } from "next/server";
import { waitUntil } from "@vercel/functions";
import { eq, and, ne } from "drizzle-orm";
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

  // body에서 model 추출 (optional, 기본 "haiku")
  let model: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    model = body.model;
  } catch {
    // body 없음 — 무시
  }

  // 비제외 + done이 아닌 제출 목록 조회
  const targets = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.sessionId, id),
        eq(submissions.excluded, false),
        ne(submissions.status, "done")
      )
    );

  if (targets.length === 0) {
    return apiError(
      "NO_PENDING_SUBMISSIONS",
      "평가할 제출이 없습니다. (모든 제출이 완료되었거나 없습니다)",
      400
    );
  }

  // 평가 대상 상태를 submitted으로 리셋 (error/collecting/evaluating 건 재시도 가능)
  const targetIds = targets.map((s) => s.id);
  await db
    .update(submissions)
    .set({ status: "submitted", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(submissions.sessionId, id),
        eq(submissions.excluded, false),
        ne(submissions.status, "done")
      )
    );

  // 비동기 백그라운드 실행 (서버리스 환경에서 응답 후에도 실행 보장)
  waitUntil(runEvaluation(id, model).catch((err) => {
    console.error(`[평가 오류] 세션 ${id}:`, err);
  }));

  return apiSuccess({ message: "평가를 시작했습니다.", total: targetIds.length }, 202);
});
