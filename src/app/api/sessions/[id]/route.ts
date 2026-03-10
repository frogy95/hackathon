import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, withAdminAuth, parseBody } from "@/lib/api-utils";
import { updateSessionSchema } from "@/lib/validations";

interface Context {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id] — 세션 상세 + 제출 목록
export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;

  try {
    const session = await db
      .select()
      .from(evaluationSessions)
      .where(eq(evaluationSessions.id, id))
      .then((r) => r[0]);

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND.code, "세션을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
    }

    const subs = await db
      .select()
      .from(submissions)
      .where(eq(submissions.sessionId, id))
      .orderBy(submissions.submittedAt);

    return apiSuccess({ ...session, submissions: subs });
  } catch (e) {
    console.error("세션 상세 조회 오류:", e);
    return apiError(ErrorCode.INTERNAL_ERROR.code, "세션 조회에 실패했습니다.", ErrorCode.INTERNAL_ERROR.status);
  }
}

// PATCH /api/sessions/[id] — 세션 수정 (관리자 전용)
export const PATCH = withAdminAuth(async (request: NextRequest, context: unknown) => {
  const { id } = await (context as Context).params;

  const parsed = await parseBody(request, updateSessionSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const existing = await db
      .select()
      .from(evaluationSessions)
      .where(eq(evaluationSessions.id, id))
      .then((r) => r[0]);

    if (!existing) {
      return apiError(ErrorCode.NOT_FOUND.code, "세션을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
    }

    const updateData: Partial<{ submissionDeadline: string; resultsPublished: boolean }> = {};
    if (parsed.data.submissionDeadline !== undefined) {
      updateData.submissionDeadline = parsed.data.submissionDeadline;
    }
    if (parsed.data.resultsPublished !== undefined) {
      updateData.resultsPublished = parsed.data.resultsPublished;
    }

    await db.update(evaluationSessions).set(updateData).where(eq(evaluationSessions.id, id));

    const updated = await db
      .select()
      .from(evaluationSessions)
      .where(eq(evaluationSessions.id, id))
      .then((r) => r[0]);

    return apiSuccess(updated);
  } catch (e) {
    console.error("세션 수정 오류:", e);
    return apiError(ErrorCode.INTERNAL_ERROR.code, "세션 수정에 실패했습니다.", ErrorCode.INTERNAL_ERROR.status);
  }
});
