// 세션 스토리지 기반 간이 인증 헬퍼 — Phase 2에서 API 인증으로 교체 예정

const AUTH_KEY = "admin_auth";
// 하드코딩 비밀번호 — Phase 2에서 환경 변수 + bcrypt로 교체
const ADMIN_PASSWORD = "admin1234";

export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function setAdminAuth(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(AUTH_KEY, "true");
  }
}

export function getAdminAuth(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

export function clearAdminAuth(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(AUTH_KEY);
  }
}
