// 쿠키 기반 관리자 인증 헬퍼 (클라이언트 사이드)

// admin_logged_in 쿠키 존재 여부로 로그인 상태 확인
export function getAdminAuth(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("admin_logged_in="));
}

// 로그아웃: API 호출 + 클라이언트 쿠키 제거
export async function clearAdminAuth(): Promise<void> {
  await fetch("/api/auth/admin", { method: "DELETE" });
  // 클라이언트 쿠키 즉시 제거
  document.cookie = "admin_logged_in=; max-age=0; path=/";
}
