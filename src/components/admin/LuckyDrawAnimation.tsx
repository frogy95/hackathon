"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LuckyDrawWinner } from "@/types";

interface LuckyDrawAnimationProps {
  winners: LuckyDrawWinner[];
  candidateNames: string[]; // 슬롯 애니메이션용 이름 풀
  onReset: () => void;
}

// 슬롯 한 개 컴포넌트
function SlotReel({
  finalName,
  delay,
  running,
  revealed,
  namePool,
}: {
  finalName: string;
  delay: number;
  running: boolean;
  revealed: boolean;
  namePool: string[];
}) {
  const [displayName, setDisplayName] = useState(namePool[0] ?? "???");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && !revealed) {
      let idx = 0;
      intervalRef.current = setInterval(() => {
        idx = (idx + 1) % namePool.length;
        setDisplayName(namePool[idx]);
      }, 80);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    if (revealed) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeout(() => setDisplayName(finalName), delay);
    }
  }, [running, revealed, finalName, namePool, delay]);

  return (
    <div
      className={`
        border-2 rounded-xl px-6 py-4 text-center transition-all duration-500
        ${revealed
          ? "border-yellow-400 bg-yellow-50 shadow-lg scale-105"
          : running
            ? "border-zinc-300 bg-zinc-50 animate-pulse"
            : "border-zinc-200 bg-white"
        }
      `}
    >
      <div className={`text-2xl font-bold transition-all duration-300 ${revealed ? "text-yellow-700" : "text-zinc-700"}`}>
        {revealed ? "🎉" : "🎰"}
      </div>
      <div className={`text-xl font-bold mt-1 ${revealed ? "text-yellow-800" : "text-zinc-800"}`}>
        {displayName}
      </div>
    </div>
  );
}

export function LuckyDrawAnimation({
  winners,
  candidateNames,
  onReset,
}: LuckyDrawAnimationProps) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "revealing" | "done">("idle");
  const [revealIndex, setRevealIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, []);

  // 이름 풀 준비 (최소 10개 이상 확보)
  const namePool = candidateNames.length >= 3 ? candidateNames : ["참가자A", "참가자B", "참가자C"];

  const handleStart = () => {
    setPhase("spinning");
    setRevealIndex(-1);

    // 3초 후 순차 공개 시작
    spinTimeoutRef.current = setTimeout(() => {
      setPhase("revealing");
      revealNext(0);
    }, 3000);
  };

  const revealNext = (idx: number) => {
    if (idx >= winners.length) {
      setPhase("done");
      return;
    }
    setRevealIndex(idx);
    revealTimeoutRef.current = setTimeout(() => revealNext(idx + 1), 800);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-2xl p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900">
          🏆 행운상 추첨 결과 — {winners.length}명
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleFullscreen}>
            전체화면
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            다시 추첨
          </Button>
        </div>
      </div>

      {/* 슬롯 그리드 */}
      <div
        className={`grid gap-4 ${
          winners.length === 1
            ? "grid-cols-1 max-w-xs mx-auto"
            : winners.length <= 3
              ? "grid-cols-3"
              : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
        }`}
      >
        {winners.map((winner, idx) => (
          <SlotReel
            key={winner.submissionId}
            finalName={winner.name}
            delay={idx * 100}
            running={phase === "spinning" || phase === "revealing"}
            revealed={revealIndex >= idx}
            namePool={namePool}
          />
        ))}
      </div>

      {/* 당첨자 상세 목록 (완료 후) */}
      {phase === "done" && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-4">
            <h3 className="font-semibold text-yellow-800 mb-3">🎊 당첨자 명단</h3>
            <div className="space-y-2">
              {winners.map((winner, idx) => (
                <div key={winner.submissionId} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 shadow-sm">
                  <span className="font-bold text-yellow-700 w-6">{idx + 1}</span>
                  <span className="font-medium text-zinc-900">{winner.name}</span>
                  <span className="text-sm text-zinc-500">{winner.email}</span>
                  <Badge variant="secondary" className="ml-auto">{winner.jobRole}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 시작 버튼 */}
      {phase === "idle" && (
        <Button onClick={handleStart} size="lg" className="w-full text-lg py-6">
          🎰 추첨 시작!
        </Button>
      )}

      {phase === "spinning" && (
        <div className="text-center text-zinc-500 animate-pulse text-sm">
          당첨자를 선정하는 중...
        </div>
      )}
    </div>
  );
}
