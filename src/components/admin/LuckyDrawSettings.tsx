"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LuckyDrawWinner, Submission } from "@/types";

interface LuckyDrawSettingsProps {
  sessionId: string;
  submissions: Pick<Submission, "id" | "name" | "email" | "jobRole" | "status" | "excluded">[];
  onWinnersDrawn: (winners: LuckyDrawWinner[], candidateCount: number) => void;
}

export function LuckyDrawSettings({
  sessionId,
  submissions,
  onWinnersDrawn,
}: LuckyDrawSettingsProps) {
  const [winnerCount, setWinnerCount] = useState(1);
  const [targetRange, setTargetRange] = useState<"all" | "done">("all");
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 비제외 제출 목록
  const activeSubs = submissions.filter((s) => !s.excluded);
  const candidateCount = activeSubs.filter((s) => {
    if (excludeIds.includes(s.id)) return false;
    if (targetRange === "done") return s.status === "done";
    return true;
  }).length;

  const toggleExclude = (id: string) => {
    setExcludeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDraw = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/lucky-draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerCount,
          targetRange,
          excludeSubmissionIds: excludeIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "추첨에 실패했습니다.");
      }
      const data = await res.json() as { winners: LuckyDrawWinner[]; candidateCount: number };
      onWinnersDrawn(data.winners, data.candidateCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">추첨 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 당첨 인원 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">당첨 인원</label>
          <div className="flex items-center gap-3">
            <button
              className="w-8 h-8 rounded border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
              onClick={() => setWinnerCount((n) => Math.max(1, n - 1))}
              disabled={winnerCount <= 1}
            >
              −
            </button>
            <span className="text-xl font-bold w-8 text-center">{winnerCount}</span>
            <button
              className="w-8 h-8 rounded border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
              onClick={() => setWinnerCount((n) => Math.min(candidateCount, n + 1))}
              disabled={winnerCount >= candidateCount}
            >
              +
            </button>
            <span className="text-sm text-zinc-500">명 (대상: {candidateCount}명)</span>
          </div>
        </div>

        {/* 대상 범위 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">추첨 대상 범위</label>
          <div className="flex gap-2">
            {(["all", "done"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTargetRange(range)}
                className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                  targetRange === range
                    ? "border-zinc-800 bg-zinc-800 text-white"
                    : "border-zinc-300 text-zinc-600 hover:border-zinc-500"
                }`}
              >
                {range === "all" ? "전체 참가자" : "평가 완료만"}
              </button>
            ))}
          </div>
        </div>

        {/* 제외 목록 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">
            제외할 참가자 <span className="text-zinc-400 font-normal">(선택)</span>
          </label>
          <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded p-2 space-y-1">
            {activeSubs.length === 0 ? (
              <p className="text-sm text-zinc-400 py-2 text-center">제출이 없습니다</p>
            ) : (
              activeSubs.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 px-1 py-0.5 rounded"
                >
                  <input
                    type="checkbox"
                    checked={excludeIds.includes(s.id)}
                    onChange={() => toggleExclude(s.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{s.name}</span>
                  <span className="text-xs text-zinc-400">{s.email}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">{s.jobRole}</Badge>
                </label>
              ))
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button
          onClick={handleDraw}
          disabled={loading || candidateCount === 0}
          className="w-full"
          size="lg"
        >
          {loading ? "추첨 중..." : `🎰 추첨 시작 (${winnerCount}명)`}
        </Button>
      </CardContent>
    </Card>
  );
}
