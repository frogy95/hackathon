import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, parseBody, withAdminAuth } from "@/lib/api-utils";
import { updateSubmissionSchema } from "@/lib/validations";

interface Context {
  params: Promise<{ id: string; subId: string }>;
}

// PATCH /api/sessions/[id]/submissions/[subId] — 제출 수정 (excluded, adminNote)
export const PATCH = withAdminAuth(async (request: NextRequest, context: unknown) => {
  const { id: sessionId, subId } = await (context as Context).params;

  // 해당 세션에 속하는 제출인지 확인
  const submission = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, subId), eq(submissions.sessionId, sessionId)))
    .then((r) => r[0]);

  if (!submission) {
    return apiError(ErrorCode.NOT_FOUND.code, "제출을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  const parsed = await parseBody(request, updateSubmissionSchema);
  if ("error" in parsed) return parsed.error;

  const { excluded, adminNote } = parsed.data;

  const updateData: Partial<typeof submission> & { updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };
  if (excluded !== undefined) updateData.excluded = excluded;
  if (adminNote !== undefined) updateData.adminNote = adminNote || null;

  await db.update(submissions).set(updateData).where(eq(submissions.id, subId));

  const updated = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, subId))
    .then((r) => r[0]);

  return apiSuccess(updated);
});
