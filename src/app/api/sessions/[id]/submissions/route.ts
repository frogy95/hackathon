import { NextRequest } from "next/server";
import { eq, and, like, or, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, parseBody, withAdminAuth } from "@/lib/api-utils";
import { submissionSchema } from "@/lib/validations";

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

// POST /api/sessions/[id]/submissions — 제출 생성/수정 (upsert)
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

  const { name, email, repoUrl, deployUrl } = parsed.data;

  // 동일 이메일 제출 확인 (upsert)
  const existing = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.sessionId, sessionId), eq(submissions.email, email)))
    .then((r) => r[0]);

  const now = new Date().toISOString();

  if (existing) {
    // 기존 제출 업데이트
    await db
      .update(submissions)
      .set({
        name,
        repoUrl,
        deployUrl: deployUrl ?? null,
        updatedAt: now,
        status: "submitted",
      })
      .where(eq(submissions.id, existing.id));

    const updated = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, existing.id))
      .then((r) => r[0]);

    return apiSuccess(updated);
  } else {
    // 신규 제출 생성
    const id = crypto.randomUUID();
    await db.insert(submissions).values({
      id,
      sessionId,
      name,
      email,
      repoUrl,
      deployUrl: deployUrl ?? null,
      submittedAt: now,
      updatedAt: now,
    });

    const created = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .then((r) => r[0]);

    return apiSuccess(created, 201);
  }
}
