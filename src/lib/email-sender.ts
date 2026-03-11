// Resend 기반 이메일 발송 모듈
import { Resend } from "resend";
import type { JobRole } from "@/types";

// 런타임 시점에 지연 초기화 (빌드 시 환경 변수 없어도 오류 없음)
function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY가 설정되지 않았습니다.");
  }
  return new Resend(apiKey);
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? "최지선 <frogy95@ubcare.co.kr>";

interface EvaluationResultEmailPayload {
  to: string;
  name: string;
  totalScore: number;
  baseScore: number;
  jobRole: JobRole;
  sessionId: string;
  submittedAt: string;
}

// 평가 완료 결과 이메일 발송
export async function sendEvaluationResultEmail(
  payload: EvaluationResultEmailPayload
): Promise<void> {
  const { to, name, totalScore, baseScore, jobRole, sessionId, submittedAt } = payload;

  const submittedDate = new Date(submittedAt).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = `[ubcare 해커톤] ${name}님의 평가 결과가 도착했습니다`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- 헤더 -->
    <div style="background-color: #18181b; padding: 32px 32px 24px;">
      <p style="margin: 0; font-size: 13px; color: #a1a1aa; letter-spacing: 0.05em; text-transform: uppercase;">ubcare 해커톤</p>
      <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">평가 결과 안내</h1>
    </div>

    <!-- 본문 -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 20px; font-size: 15px; color: #3f3f46; line-height: 1.6;">
        안녕하세요, <strong>${name}</strong>님!<br>
        제출하신 해커톤 결과물에 대한 AI 평가가 완료되었습니다.
      </p>

      <!-- 점수 카드 -->
      <div style="background: #f4f4f5; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="margin: 0 0 4px; font-size: 13px; color: #71717a;">최종 점수</p>
        <p style="margin: 0; font-size: 48px; font-weight: 800; color: #18181b; line-height: 1;">${totalScore}</p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #71717a;">기본 점수 ${baseScore}점 · 직군: ${jobRole}</p>
      </div>

      <!-- 제출 정보 -->
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; color: #71717a; width: 100px;">제출 시각</td>
          <td style="padding: 8px 0; color: #3f3f46;">${submittedDate}</td>
        </tr>
      </table>

      <!-- 안내 -->
      <div style="background: #eff6ff; border-left: 3px solid #3b82f6; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #1d4ed8; line-height: 1.5;">
          결과 공개 후 조회 페이지에서 상세 평가 내용을 확인하실 수 있습니다.
        </p>
      </div>

      <!-- 버튼 -->
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://hackathon.ubcare.co.kr"}/check/${sessionId}"
           style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          결과 확인하기
        </a>
      </div>
    </div>

    <!-- 푸터 -->
    <div style="padding: 20px 32px; border-top: 1px solid #f4f4f5;">
      <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
        이 메일은 ubcare 해커톤 평가 시스템에서 자동 발송되었습니다.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const resend = getResend();

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`이메일 발송 실패 (${to}): ${error.message}`);
  }

  console.log(`[이메일] 평가 결과 발송 완료: ${to}`);
}
