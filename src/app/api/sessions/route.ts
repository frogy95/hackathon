import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, withAdminAuth, parseBody } from "@/lib/api-utils";
import { createSessionSchema } from "@/lib/validations";

// GET /api/sessions — 세션 목록 + 제출 수
export async function GET() {
  try {
    const rows = await db
      .select({
        id: evaluationSessions.id,
        name: evaluationSessions.name,
        description: evaluationSessions.description,
        submissionDeadline: evaluationSessions.submissionDeadline,
        resultsPublished: evaluationSessions.resultsPublished,
        createdAt: evaluationSessions.createdAt,
        submissionCount: sql<number>`count(${submissions.id})`,
      })
      .from(evaluationSessions)
      .leftJoin(submissions, eq(submissions.sessionId, evaluationSessions.id))
      .groupBy(evaluationSessions.id)
      .orderBy(sql`${evaluationSessions.createdAt} DESC`);

    // 상태 계산 (status 컬럼이 없으므로 런타임 계산)
    const sessions = rows.map((s) => {
      const now = new Date();
      const deadline = new Date(s.submissionDeadline);
      const status = s.resultsPublished
        ? "results_published"
        : deadline < now
          ? "closed"
          : "active";
      return { ...s, status };
    });

    return apiSuccess(sessions);
  } catch (e) {
    console.error("세션 목록 조회 오류:", e);
    return apiError(ErrorCode.INTERNAL_ERROR.code, "세션 목록을 불러오는 데 실패했습니다.", ErrorCode.INTERNAL_ERROR.status);
  }
}

// POST /api/sessions — 세션 생성 (관리자 전용)
export const POST = withAdminAuth(async (request: NextRequest) => {
  const parsed = await parseBody(request, createSessionSchema);
  if ("error" in parsed) return parsed.error;

  const { name, submissionDeadline, description } = parsed.data;

  try {
    const id = crypto.randomUUID();
    await db.insert(evaluationSessions).values({
      id,
      name,
      submissionDeadline,
      description: description ?? null,
    });

    const created = await db
      .select()
      .from(evaluationSessions)
      .where(eq(evaluationSessions.id, id))
      .then((r) => r[0]);

    return apiSuccess(created, 201);
  } catch (e) {
    console.error("세션 생성 오류:", e);
    return apiError(ErrorCode.INTERNAL_ERROR.code, "세션 생성에 실패했습니다.", ErrorCode.INTERNAL_ERROR.status);
  }
});
