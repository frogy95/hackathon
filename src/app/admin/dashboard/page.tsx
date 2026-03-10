"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/admin/SessionCard";
import { CreateSessionModal } from "@/components/admin/CreateSessionModal";
import { Skeleton } from "@/components/ui/skeleton";
import { clearAdminAuth } from "@/lib/auth";
import { PlusCircle, LogOut } from "lucide-react";

interface SessionItem {
  id: string;
  name: string;
  description: string | null;
  submissionDeadline: string;
  resultsPublished: boolean;
  status: "active" | "closed" | "results_published";
  submissionCount: number;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("세션 목록 조회 실패");
      const json = await res.json();
      setSessions(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleLogout = async () => {
    await clearAdminAuth();
    router.push("/admin");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">평가 세션 목록</h1>
          {!loading && (
            <p className="text-sm text-zinc-500 mt-1">총 {sessions.length}개 세션</p>
          )}
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

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 p-5 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg">세션이 없습니다</p>
          <p className="text-sm mt-1">새 세션을 생성해주세요</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <SessionCard key={session.id} {...session} />
          ))}
        </div>
      )}

      <CreateSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchSessions}
      />
    </div>
  );
}
