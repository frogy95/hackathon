"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Clock, StopCircle } from "lucide-react";

interface SessionActionsProps {
  sessionId: string;
  currentDeadline: string; // ISO 8601
}

export function SessionActions({ sessionId, currentDeadline }: SessionActionsProps) {
  const router = useRouter();
  const [extendOpen, setExtendOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState(
    // datetime-local 형식으로 변환
    new Date(currentDeadline).toISOString().slice(0, 16)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleExtend = async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionDeadline: new Date(newDeadline).toISOString() }),
    });
    setLoading(false);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "마감 수정에 실패했습니다.");
      return;
    }
    setExtendOpen(false);
    toast.success("마감일시가 수정되었습니다.");
    router.refresh();
  };

  const handleClose = async () => {
    if (!confirm("즉시 마감하면 더 이상 제출할 수 없습니다. 계속하시겠습니까?")) return;
    setLoading(true);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // 현재 시각으로 마감일 설정
      body: JSON.stringify({ submissionDeadline: new Date().toISOString() }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("즉시 마감에 실패했습니다.");
      return;
    }
    toast.success("즉시 마감되었습니다.");
    router.refresh();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setExtendOpen(true)} disabled={loading}>
        <Clock className="h-4 w-4 mr-1.5" />
        마감 연장
      </Button>
      <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
        <StopCircle className="h-4 w-4 mr-1.5" />
        즉시 마감
      </Button>

      {/* 마감 연장 다이얼로그 */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>마감일시 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Input
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>취소</Button>
            <Button onClick={handleExtend} disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
