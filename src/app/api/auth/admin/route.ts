import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminPassword, createAdminToken } from "@/lib/auth-server";
import { apiSuccess, apiError, ErrorCode, parseBody } from "@/lib/api-utils";

const loginSchema = z.object({
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

// POST /api/auth/admin — 로그인
export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, loginSchema);
  if ("error" in parsed) return parsed.error;

  const valid = await verifyAdminPassword(parsed.data.password);
  if (!valid) {
    return apiError(ErrorCode.UNAUTHORIZED.code, "비밀번호가 올바르지 않습니다.", ErrorCode.UNAUTHORIZED.status);
  }

  const token = await createAdminToken();
  const response = apiSuccess({ message: "로그인 성공" });

  // HttpOnly 쿠키 — 서버 인증용
  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24시간
    path: "/",
  });

  // 클라이언트 라우팅 가드용 쿠키 (non-HttpOnly)
  response.cookies.set("admin_logged_in", "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return response;
}

// DELETE /api/auth/admin — 로그아웃
export async function DELETE(_request: NextRequest) {
  const response = NextResponse.json({ success: true, data: { message: "로그아웃 완료" } });
  response.cookies.set("admin_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("admin_logged_in", "", { maxAge: 0, path: "/" });
  return response;
}
