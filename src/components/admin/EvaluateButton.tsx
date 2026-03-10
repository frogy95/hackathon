"use client";

// 평가 실행 버튼 + 진행률 바 컴포넌트
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Play, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ProgressData {
  total: number;
  done: number;
  failed: number;
  inProgress: number;
  pending: number;
}

type EvalState = "idle" | "running" | "done" | "error";

interface EvaluateButtonProps {
  sessionId: string;
  submissionCount: number;
}

export function EvaluateButton({ sessionId, submissionCount }: EvaluateButtonProps) {
  const [state, setState] = useState<EvalState>("idle");
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 폴링 중단
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // 진행률 폴링
  const pollProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/evaluate/progress`, {
        credentials: "include",
      });
      if (!res.ok) return;

      const json = await res.json();
      const data: ProgressData = json.data;
      setProgress(data);

      // 완료 조건: done + failed >= total
      if (data.total > 0 && data.done + data.failed >= data.total) {
        stopPolling();
        setState("done");

        if (data.failed > 0) {
          toast.warning(
            `평가 완료: ${data.done}건 성공, ${data.failed}건 실패`,
            { description: "실패한 항목은 개별 재평가 버튼을 사용하세요." }
          );
        } else {
          toast.success(`평가 완료: ${data.done}건 모두 성공했습니다.`);
        }
        return;
      }

      // 계속 폴링 (2초 간격)
      pollingRef.current = setTimeout(pollProgress, 2000);
    } catch {
      console.error("진행률 조회 실패");
      pollingRef.current = setTimeout(pollProgress, 2000);
    }
  }, [sessionId, stopPolling]);

  // 평가 시작
  const handleEvaluate = async () => {
    if (state === "running") return;

    setState("running");
    setProgress(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/evaluate`, {
        method: "POST",
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        const message = json.error?.message ?? "평가 시작 실패";
        toast.error(message);
        setState("error");
        return;
      }

      toast.info(`평가를 시작했습니다. (총 ${json.data.total}건)`);

      // 초기 progress 설정
      setProgress({
        total: json.data.total,
        done: 0,
        failed: 0,
        inProgress: 0,
        pending: json.data.total,
      });

      // 폴링 시작 (1초 후 첫 번째 폴링)
      pollingRef.current = setTimeout(pollProgress, 1000);
    } catch {
      toast.error("평가 요청 중 오류가 발생했습니다.");
      setState("error");
    }
  };

  const percentage = progress && progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        onClick={handleEvaluate}
        disabled={state === "running" || submissionCount === 0}
        title={submissionCount === 0 ? "평가할 제출이 없습니다" : undefined}
      >
        {state === "running" ? (
          <>
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            평가 중...
          </>
        ) : state === "done" ? (
          <>
            <CheckCircle className="h-4 w-4 mr-1.5" />
            평가 완료
          </>
        ) : state === "error" ? (
          <>
            <AlertCircle className="h-4 w-4 mr-1.5" />
            재시도
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-1.5" />
            평가 실행
          </>
        )}
      </Button>

      {/* 진행률 바 */}
      {progress && (
        <div className="w-full min-w-[200px]">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>
              {progress.done}/{progress.total} 완료
              {progress.failed > 0 && (
                <span className="text-red-500 ml-1">({progress.failed}건 실패)</span>
              )}
            </span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                progress.failed > 0 ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {progress.inProgress > 0 && (
            <p className="text-xs text-zinc-400 mt-1">
              {progress.inProgress}건 처리 중...
            </p>
          )}
        </div>
      )}

      {/* 실패 안내 */}
      {state === "done" && progress && progress.failed > 0 && (
        <p className="text-xs text-amber-600">
          {progress.failed}건 실패 — 제출 목록에서 개별 재평가하세요.
        </p>
      )}
    </div>
  );
}
