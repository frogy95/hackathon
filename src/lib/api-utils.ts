import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminToken } from "./auth-server";

// 공통 응답 포맷
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// 에러 코드 → HTTP 상태 매핑
export const ErrorCode = {
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", status: 400 },
  UNAUTHORIZED: { code: "UNAUTHORIZED", status: 401 },
  NOT_FOUND: { code: "NOT_FOUND", status: 404 },
  DEADLINE_PASSED: { code: "DEADLINE_PASSED", status: 409 },
  INTERNAL_ERROR: { code: "INTERNAL_ERROR", status: 500 },
} as const;

// 관리자 인증 미들웨어
export function withAdminAuth(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: unknown) => {
    const token = req.cookies.get("admin_token")?.value;
    if (!token) {
      return apiError(ErrorCode.UNAUTHORIZED.code, "인증이 필요합니다.", ErrorCode.UNAUTHORIZED.status);
    }
    const valid = await verifyAdminToken(token);
    if (!valid) {
      return apiError(ErrorCode.UNAUTHORIZED.code, "유효하지 않은 인증 토큰입니다.", ErrorCode.UNAUTHORIZED.status);
    }
    return handler(req, context);
  };
}

// 요청 바디 파싱 + zod 검증
export async function parseBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        error: apiError(
          ErrorCode.VALIDATION_ERROR.code,
          result.error.issues.map((e) => e.message).join(", "),
          ErrorCode.VALIDATION_ERROR.status
        ),
      };
    }
    return { data: result.data };
  } catch {
    return {
      error: apiError(
        ErrorCode.VALIDATION_ERROR.code,
        "요청 본문을 파싱할 수 없습니다.",
        ErrorCode.VALIDATION_ERROR.status
      ),
    };
  }
}
