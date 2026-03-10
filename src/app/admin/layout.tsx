"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { getAdminAuth } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // 로그인 페이지 자체는 인증 없이 접근 가능
    if (pathname === "/admin") {
      setChecked(true);
      return;
    }
    if (!getAdminAuth()) {
      router.replace("/admin");
      return;
    }
    setChecked(true);
  }, [pathname, router]);

  if (!checked) return null;
  return (
    <>
      {children}
      <Toaster richColors position="bottom-right" />
    </>
  );
}
