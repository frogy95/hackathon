// POST /api/admin/test-email — 이메일 발송 테스트 (임시, 나중에 제거 예정)
import { apiSuccess, apiError, withAdminAuth } from "@/lib/api-utils";
import { sendEvaluationResultEmail } from "@/lib/email-sender";
import { db } from "@/db";
import { evaluationSessions } from "@/db/schema";

export const POST = withAdminAuth(async () => {
  try {
    // DB에서 첫 번째 세션 조회
    const session = await db
      .select()
      .from(evaluationSessions)
      .limit(1)
      .then((r) => r[0]);

    if (!session) {
      return apiError("NOT_FOUND", "세션이 없습니다. 먼저 세션을 생성해주세요.", 400);
    }

    await sendEvaluationResultEmail({
      to: "frogy95@ubcare.co.kr",
      name: "테스트 사용자",
      totalScore: 87,
      baseScore: 82,
      jobRole: "개발",
      sessionId: session.id,
      submittedAt: new Date().toISOString(),
    });
    return apiSuccess({ message: "테스트 이메일 발송 완료" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return apiError("EMAIL_SEND_FAILED", `이메일 발송 실패: ${message}`, 500);
  }
});
