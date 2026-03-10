import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, parseBody } from "@/lib/api-utils";
import { submissionSchema } from "@/lib/validations";

interface Context {
  params: Promise<{ id: string }>;
}

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
