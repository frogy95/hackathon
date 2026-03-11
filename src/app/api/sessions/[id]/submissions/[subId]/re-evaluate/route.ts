// POST /api/sessions/[id]/submissions/[subId]/re-evaluate — 단건 재평가
import { NextRequest } from "next/server";
import { waitUntil } from "@vercel/functions";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { submissions, scores } from "@/db/schema";
import { apiSuccess, apiError, ErrorCode, withAdminAuth } from "@/lib/api-utils";
import { evaluateAndNotify } from "@/lib/evaluation-runner";

interface Context {
  params: Promise<{ id: string; subId: string }>;
}

export const POST = withAdminAuth(async (request: NextRequest, context: unknown) => {
  const { id: sessionId, subId: submissionId } = await (context as Context).params;

  // 제출 존재 + 세션 소속 확인
  const submission = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .then((r) => r[0]);

  if (!submission || submission.sessionId !== sessionId) {
    return apiError(ErrorCode.NOT_FOUND.code, "제출을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  // 기존 점수 삭제
  await db.delete(scores).where(eq(scores.submissionId, submissionId));

  // 상태 리셋 + 오류 메시지 초기화
  await db
    .update(submissions)
    .set({
      status: "submitted",
      errorMessage: null,
      totalScore: null,
      baseScore: null,
      bonusScore: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(submissions.id, submissionId));

  // body에서 model 추출 (optional)
  let model: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    model = body.model;
  } catch {
    // body 없음 — 무시
  }

  // 비동기 백그라운드 실행 (서버리스 환경에서 응답 후에도 실행 보장)
  waitUntil(evaluateAndNotify(submissionId, model).catch((err) => {
    console.error(`[재평가 오류] 제출 ${submissionId}:`, err);
  }));

  return apiSuccess({ message: "재평가를 시작했습니다." }, 202);
});
