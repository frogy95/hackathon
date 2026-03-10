import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions, scores } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode } from "@/lib/api-utils";

interface Context {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id]/submissions/check?name=...&email=...
export async function GET(request: NextRequest, context: Context) {
  const { id: sessionId } = await context.params;
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const email = searchParams.get("email")?.trim();

  if (!name || !email) {
    return apiError(ErrorCode.VALIDATION_ERROR.code, "이름과 이메일을 입력해주세요.", ErrorCode.VALIDATION_ERROR.status);
  }

  // 세션 존재 확인
  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, sessionId))
    .then((r) => r[0]);

  if (!session) {
    return apiError(ErrorCode.NOT_FOUND.code, "세션을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  // 제출 조회 (이름 + 이메일)
  const sub = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.sessionId, sessionId),
        eq(submissions.name, name),
        eq(submissions.email, email)
      )
    )
    .then((r) => r[0]);

  if (!sub) {
    return apiError(ErrorCode.NOT_FOUND.code, "제출 내역을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  // 결과 공개 + 평가 완료일 때만 점수 포함
  let scoreData: typeof scores.$inferSelect[] = [];
  if (session.resultsPublished && sub.status === "done") {
    scoreData = await db
      .select()
      .from(scores)
      .where(eq(scores.submissionId, sub.id));
  }

  return apiSuccess({
    submission: sub,
    scores: scoreData,
    resultsPublished: session.resultsPublished,
    submissionDeadline: session.submissionDeadline,
  });
}
