"use client";

// 평가 실행 버튼 + 모델 선택 + 평가 리셋 버튼 컴포넌트
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Play, Loader2, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";

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
  doneCount?: number;
}

export function EvaluateButton({ sessionId, submissionCount, doneCount = 0 }: EvaluateButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<EvalState>("idle");
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [selectedModel, setSelectedModel] = useState<"haiku" | "sonnet">("haiku");
  const [resetLoading, setResetLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evalTotalRef = useRef<number>(0);

  // 미완료건 수 (평가 실행 대상)
  const pendingCount = submissionCount - doneCount;
  const allDone = submissionCount > 0 && pendingCount === 0;

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

      if (evalTotalRef.current > 0 && data.inProgress === 0 && data.pending === 0) {
        stopPolling();
        setState("done");

        if (data.failed > 0) {
          toast.warning(
            `평가 완료: ${data.done}건 성공, ${data.failed}건 실패`,
            { description: "실패한 항목은 평가 실행으로 재시도하세요." }
          );
        } else {
          toast.success(`평가 완료: ${data.done}건 모두 성공했습니다.`);
        }
        setState("idle");
        router.refresh();
        return;
      }

      pollingRef.current = setTimeout(pollProgress, 2000);
    } catch {
      console.error("진행률 조회 실패");
      pollingRef.current = setTimeout(pollProgress, 2000);
    }
  }, [sessionId, stopPolling, router]);

  // 평가 시작
  const handleEvaluate = async () => {
    if (state === "running" || allDone) return;

    setState("running");
    setProgress(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ model: selectedModel }),
      });

      const json = await res.json();

      if (!res.ok) {
        const message = json.error?.message ?? "평가 시작 실패";
        toast.error(message);
        setState("error");
        return;
      }

      evalTotalRef.current = json.data.total;
      toast.info(`평가를 시작했습니다. (총 ${json.data.total}건, 모델: ${selectedModel === "haiku" ? "Haiku" : "Sonnet"})`);

      setProgress({
        total: json.data.total,
        done: 0,
        failed: 0,
        inProgress: 0,
        pending: json.data.total,
      });

      pollingRef.current = setTimeout(pollProgress, 1000);
    } catch {
      toast.error("평가 요청 중 오류가 발생했습니다.");
      setState("error");
    }
  };

  // 평가 리셋
  const handleReset = async () => {
    if (!confirm("모든 평가 결과를 초기화합니다. 계속하시겠습니까?")) return;

    setResetLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/evaluate/reset`, {
        method: "POST",
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error?.message ?? "평가 리셋에 실패했습니다.");
        return;
      }

      toast.success(`평가가 리셋되었습니다. (${json.data.count}건)`);
      setProgress(null);
      setState("idle");
      router.refresh();
    } catch {
      toast.error("평가 리셋 중 오류가 발생했습니다.");
    } finally {
      setResetLoading(false);
    }
  };

  const evalTotal = evalTotalRef.current || 0;
  const evalDone = evalTotal > 0 && progress
    ? Math.max(0, evalTotal - progress.inProgress - progress.pending)
    : 0;
  const percentage = evalTotal > 0 ? Math.round((evalDone / evalTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      {/* 모델 선택 */}
      <div className="flex items-center gap-2">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as "haiku" | "sonnet")}
          disabled={state === "running"}
          className="h-8 text-xs border border-zinc-200 rounded px-2 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="haiku">Haiku (빠름)</option>
          <option value="sonnet">Sonnet (정밀)</option>
        </select>

        <Button
          size="sm"
          onClick={handleEvaluate}
          disabled={state === "running" || submissionCount === 0 || allDone}
          title={
            allDone
              ? "모든 평가가 완료되었습니다"
              : submissionCount === 0
              ? "평가할 제출이 없습니다"
              : undefined
          }
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
          ) : allDone ? (
            <>
              <CheckCircle className="h-4 w-4 mr-1.5" />
              모든 평가 완료
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1.5" />
              평가 실행 ({pendingCount}건)
            </>
          )}
        </Button>

        {/* 평가 리셋 버튼 (평가 완료 건이 있을 때만 표시) */}
        {doneCount > 0 && state !== "running" && (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={handleReset}
            disabled={resetLoading}
            title="모든 평가 결과 초기화"
          >
            {resetLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            평가 리셋
          </Button>
        )}
      </div>

      {/* 진행률 바 */}
      {progress && (
        <div className="w-full min-w-[200px]">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>
              {evalDone}/{evalTotal} 완료
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
    </div>
  );
}
