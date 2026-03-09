"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/admin/SessionCard";
import { CreateSessionModal } from "@/components/admin/CreateSessionModal";
import { clearAdminAuth } from "@/lib/auth";
import { mockAdminSessions } from "@/lib/mock-data";
import { PlusCircle, LogOut } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const handleLogout = () => {
    clearAdminAuth();
    router.push("/admin");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">평가 세션 목록</h1>
          <p className="text-sm text-zinc-500 mt-1">총 {mockAdminSessions.length}개 세션</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            세션 생성
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1.5" />
            로그아웃
          </Button>
        </div>
      </div>

      {mockAdminSessions.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg">세션이 없습니다</p>
          <p className="text-sm mt-1">새 세션을 생성해주세요</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockAdminSessions.map((session) => (
            <SessionCard key={session.id} {...session} />
          ))}
        </div>
      )}

      <CreateSessionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
