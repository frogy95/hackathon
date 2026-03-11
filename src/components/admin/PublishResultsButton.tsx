"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface PublishResultsButtonProps {
  sessionId: string;
  resultsPublished: boolean;
}

export function PublishResultsButton({ sessionId, resultsPublished }: PublishResultsButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultsPublished: !resultsPublished }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json?.error?.message ?? "결과 공개 설정에 실패했습니다.");
        return;
      }

      toast.success(resultsPublished ? "결과 공개를 비공개로 전환했습니다." : "결과를 공개했습니다.");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={resultsPublished ? "destructive" : "secondary"}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
      ) : resultsPublished ? (
        <EyeOff className="h-4 w-4 mr-1.5" />
      ) : (
        <Eye className="h-4 w-4 mr-1.5" />
      )}
      {resultsPublished ? "결과 비공개" : "결과 공개"}
    </Button>
  );
}
