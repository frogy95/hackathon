import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions, scores } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode } from "@/lib/api-utils";
import { ROLE_CRITERIA } from "@/lib/role-criteria";
import type { JobRole } from "@/types";

interface Context {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id]/submissions/check?email=...&checkPassword=...
export async function GET(request: NextRequest, context: Context) {
  const { id: sessionId } = await context.params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim();
  const checkPassword = searchParams.get("checkPassword")?.trim();

  if (!email || !checkPassword) {
    return apiError(ErrorCode.VALIDATION_ERROR.code, "이메일과 조회 비밀번호를 입력해주세요.", ErrorCode.VALIDATION_ERROR.status);
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

  // 제출 조회 (이메일 + 조회비밀번호)
  const sub = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.sessionId, sessionId),
        eq(submissions.email, email),
        eq(submissions.checkPassword, checkPassword)
      )
    )
    .then((r) => r[0]);

  if (!sub) {
    return apiError(ErrorCode.NOT_FOUND.code, "제출 내역을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  // 평가 완료일 때 즉시 점수 포함 (결과 공개 여부 무관)
  let scoreData: typeof scores.$inferSelect[] = [];
  if (sub.status === "done") {
    scoreData = await db
      .select()
      .from(scores)
      .where(eq(scores.submissionId, sub.id));
  }

  // 직군별 criteriaConfig 구성
  const jobRole = (sub.jobRole ?? "개발") as JobRole;
  const roleCriteria = ROLE_CRITERIA[jobRole] ?? ROLE_CRITERIA["개발"];
  const criteriaConfig = {
    criteria: roleCriteria.map((c) => ({
      key: c.key,
      label: c.name,
      maxScore: c.maxScore,
    })),
  };

  return apiSuccess({
    submission: sub,
    scores: scoreData,
    resultsPublished: session.resultsPublished,
    submissionDeadline: session.submissionDeadline,
    criteriaConfig,
  });
}
