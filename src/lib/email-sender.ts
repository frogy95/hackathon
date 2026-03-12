// nodemailer + Gmail SMTP 기반 이메일 발송 모듈
import nodemailer from "nodemailer";
import type { JobRole } from "@/types";

// 런타임 시점에 지연 초기화 (빌드 시 환경 변수 없어도 오류 없음)
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? "465"),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? "해커톤 평가 시스템 <noreply@example.com>";

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

  const checkUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://hackathon-gamma-ebon.vercel.app"}/check/${sessionId}`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f0f0f2; margin: 0; padding: 32px 16px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10);">

    <!-- 헤더 -->
    <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 40px 36px 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 12px;">🏆</div>
      <p style="margin: 0 0 6px; font-size: 12px; color: #a1a1aa; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600;">ubcare 해커톤</p>
      <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">평가 결과 안내</h1>
    </div>

    <!-- 본문 -->
    <div style="padding: 36px 36px 28px;">
      <p style="margin: 0 0 28px; font-size: 15px; color: #52525b; line-height: 1.7;">
        안녕하세요, <strong style="color: #18181b;">${name}</strong>님!<br>
        제출하신 해커톤 결과물에 대한 AI 평가가 완료되었습니다.
      </p>

      <!-- 점수 카드 -->
      <div style="background: linear-gradient(135deg, #18181b 0%, #3f3f46 100%); border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
        <p style="margin: 0 0 12px; font-size: 12px; color: #a1a1aa; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;">최종 점수</p>
        <div style="display: inline-block; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 50%; width: 120px; height: 120px; line-height: 120px; margin-bottom: 14px;">
          <span style="font-size: 44px; font-weight: 900; color: #ffffff; line-height: 1;">${totalScore}</span>
        </div>
        <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
          기본 점수 <strong style="color: #d4d4d8;">${baseScore}점</strong> &nbsp;·&nbsp; 직군: <strong style="color: #d4d4d8;">${jobRole}</strong>
        </p>
      </div>

      <!-- 제출 정보 -->
      <div style="background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #71717a; width: 90px;">📅 제출 시각</td>
            <td style="padding: 6px 0; color: #3f3f46; font-weight: 500;">${submittedDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #71717a;">💼 직군</td>
            <td style="padding: 6px 0; color: #3f3f46; font-weight: 500;">${jobRole}</td>
          </tr>
        </table>
      </div>

      <!-- 안내 박스 -->
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 10px 10px 0; margin-bottom: 28px;">
        <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #1e40af;">💡 상세 결과 확인</p>
        <p style="margin: 0; font-size: 13px; color: #1d4ed8; line-height: 1.6;">
          아래 버튼을 클릭하면 항목별 점수와 AI 피드백을 상세히 확인하실 수 있습니다.
        </p>
      </div>

      <!-- CTA 버튼 -->
      <div style="text-align: center;">
        <a href="${checkUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #18181b 0%, #3f3f46 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 15px; font-weight: 700; letter-spacing: 0.01em; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
          🔍 결과 확인하기
        </a>
        <p style="margin: 12px 0 0; font-size: 12px; color: #a1a1aa;">버튼이 작동하지 않으면 아래 링크를 복사하세요</p>
        <p style="margin: 4px 0 0; font-size: 11px; color: #71717a; word-break: break-all;">${checkUrl}</p>
      </div>
    </div>

    <!-- 푸터 -->
    <div style="padding: 20px 36px 24px; border-top: 1px solid #e4e4e7; background: #fafafa;">
      <p style="margin: 0 0 4px; font-size: 12px; color: #a1a1aa; text-align: center;">
        이 메일은 ubcare 해커톤 평가 시스템에서 자동 발송되었습니다.
      </p>
      <p style="margin: 0; font-size: 12px; color: #d4d4d8; text-align: center;">
        문의사항이 있으시면 해커톤 운영진에게 연락해 주세요.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const transporter = getTransporter();

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });

  console.log(`[이메일] 평가 결과 발송 완료: ${to}`);
}
