// POST /api/admin/test-email — 이메일 발송 테스트 (임시, 나중에 제거 예정)
import { apiSuccess, apiError, withAdminAuth } from "@/lib/api-utils";
import { sendEvaluationResultEmail } from "@/lib/email-sender";

export const POST = withAdminAuth(async () => {
  try {
    await sendEvaluationResultEmail({
      to: "frogy95@ubcare.co.kr",
      name: "테스트 사용자",
      totalScore: 87,
      baseScore: 82,
      jobRole: "개발",
      sessionId: "test-session",
      submittedAt: new Date().toISOString(),
    });
    return apiSuccess({ message: "테스트 이메일 발송 완료" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return apiError("EMAIL_SEND_FAILED", `이메일 발송 실패: ${message}`, 500);
  }
});
