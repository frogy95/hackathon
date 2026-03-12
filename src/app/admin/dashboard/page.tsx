"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/admin/SessionCard";
import { CreateSessionModal } from "@/components/admin/CreateSessionModal";
import { Skeleton } from "@/components/ui/skeleton";
import { clearAdminAuth } from "@/lib/auth";
import { toast } from "sonner";
import { PlusCircle, LogOut, Mail } from "lucide-react";

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
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

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

  const handleTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success("테스트 이메일 발송 완료 (frogy95@ubcare.co.kr)");
      } else {
        toast.error(`발송 실패: ${json.error?.message ?? "알 수 없는 오류"}`);
      }
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleLogout = async () => {
    await clearAdminAuth();
    router.push("/admin");
  };

  return (
    <>
      {/* 다크 밴드 */}
      <section className="page-header-band">
        <div className="hero-dots absolute inset-0 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-4 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">평가 세션 목록</h1>
            {!loading && (
              <p className="text-sm text-zinc-400 mt-1">총 {sessions.length}개 세션</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* TODO: 임시 테스트 버튼 — 이메일 설정 확인 후 제거 */}
            <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={sendingTestEmail} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white bg-transparent">
              <Mail className="h-4 w-4 mr-1.5" />
              {sendingTestEmail ? "발송 중..." : "테스트 이메일"}
            </Button>
            <Button onClick={() => setModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              세션 생성
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              <LogOut className="h-4 w-4 mr-1.5" />
              로그아웃
            </Button>
          </div>
        </div>
      </section>

      {/* 콘텐츠 영역 */}
      <div className="mx-auto max-w-5xl px-4 py-8">

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
    </>
  );
}
