import { NextRequest } from "next/server";
import { waitUntil } from "@vercel/functions";
import { eq, and, like, or, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions, scores } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, parseBody, withAdminAuth } from "@/lib/api-utils";
import { submissionSchema } from "@/lib/validations";
import { evaluateAndNotify } from "@/lib/evaluation-runner";

interface Context {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id]/submissions — 제출 목록 조회 (관리자 전용)
export const GET = withAdminAuth(async (request: NextRequest, context: unknown) => {
  const { id: sessionId } = await (context as Context).params;

  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, sessionId))
    .then((r) => r[0]);

  if (!session) {
    return apiError(ErrorCode.NOT_FOUND.code, "세션을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const excludedParam = searchParams.get("excluded");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") ?? "submittedAt";
  const order = searchParams.get("order") ?? "desc";

  // 동적 where 조건 조합
  const conditions = [eq(submissions.sessionId, sessionId)];

  if (status) {
    conditions.push(eq(submissions.status, status));
  }
  if (excludedParam !== null) {
    conditions.push(eq(submissions.excluded, excludedParam === "true"));
  }
  if (search) {
    conditions.push(
      or(
        like(submissions.name, `%${search}%`),
        like(submissions.email, `%${search}%`)
      )!
    );
  }

  // 정렬 컬럼 매핑
  const sortColumn =
    sort === "name"
      ? submissions.name
      : sort === "totalScore"
        ? submissions.totalScore
        : submissions.submittedAt;

  const rows = await db
    .select()
    .from(submissions)
    .where(and(...conditions))
    .orderBy(order === "asc" ? asc(sortColumn) : desc(sortColumn));

  return apiSuccess(rows);
});

// POST /api/sessions/[id]/submissions — 신규 제출 생성 (중복 이메일 409 거부)
export async function POST(request: NextRequest, context: Context) {
  const { id: sessionId } = await context.params;

  // 세션 존재 확인
  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, sessionId))
    .then((r) => r[0]);

  if (!session) {
    return apiError(ErrorCode.NOT_FOUND.code, "세션을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  // 마감 확인
  if (new Date(session.submissionDeadline) < new Date()) {
    return apiError(
      ErrorCode.DEADLINE_PASSED.code,
      "제출 마감이 지났습니다.",
      ErrorCode.DEADLINE_PASSED.status
    );
  }

  // 요청 검증
  const parsed = await parseBody(request, submissionSchema);
  if ("error" in parsed) return parsed.error;

  const { name, email, repoUrl, deployUrl, jobRole, checkPassword, feedback } = parsed.data;

  // 동일 이메일 제출 중복 확인 — 중복이면 409 거부
  const existing = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.sessionId, sessionId), eq(submissions.email, email)))
    .then((r) => r[0]);

  if (existing) {
    // 수정 횟수 제한 확인 (최대 5회)
    if ((existing.editCount ?? 0) >= 5) {
      return apiError("EDIT_LIMIT_EXCEEDED", "수정 횟수 제한(5회)을 초과했습니다.", 403);
    }

    const now = new Date().toISOString();

    // 기존 점수 삭제
    await db.delete(scores).where(eq(scores.submissionId, existing.id));

    // 제출 정보 업데이트
    await db.update(submissions).set({
      name, repoUrl, deployUrl: deployUrl ?? null, jobRole, checkPassword,
      feedback: feedback ?? null,
      editCount: (existing.editCount ?? 0) + 1,
      status: "submitted",
      totalScore: null, baseScore: null, bonusScore: null,
      errorMessage: null, collectedData: null,
      updatedAt: now,
    }).where(eq(submissions.id, existing.id));

    // 재평가 + 이메일 발송 (백그라운드)
    waitUntil(evaluateAndNotify(existing.id).catch((err) => {
      console.error(`[수정 재평가 오류] 제출 ${existing.id}:`, err);
    }));

    const updated = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, existing.id))
      .then((r) => r[0]);
    return apiSuccess(updated, 200);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.insert(submissions).values({
    id,
    sessionId,
    name,
    email,
    repoUrl,
    deployUrl: deployUrl ?? null,
    jobRole,
    checkPassword,
    feedback: feedback ?? null,
    submittedAt: now,
    updatedAt: now,
  });

  const created = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .then((r) => r[0]);

  // 제출 즉시 자동 평가 + 이메일 발송 (백그라운드)
  waitUntil(
    evaluateAndNotify(id).catch((err) => {
      console.error(`[자동 평가 오류] 제출 ${id}:`, err);
    })
  );

  return apiSuccess(created, 201);
}
