"use client";

import { useState } from "react";
import { LuckyDrawSettings } from "@/components/admin/LuckyDrawSettings";
import { LuckyDrawAnimation } from "@/components/admin/LuckyDrawAnimation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LuckyDraw, LuckyDrawWinner, Submission } from "@/types";

interface LuckyDrawPageClientProps {
  sessionId: string;
  submissions: Pick<Submission, "id" | "name" | "email" | "jobRole" | "status" | "excluded">[];
  history: LuckyDraw[];
}

export function LuckyDrawPageClient({
  sessionId,
  submissions,
  history: initialHistory,
}: LuckyDrawPageClientProps) {
  const [winners, setWinners] = useState<LuckyDrawWinner[] | null>(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [history, setHistory] = useState<LuckyDraw[]>(initialHistory);

  const handleWinnersDrawn = (newWinners: LuckyDrawWinner[], count: number) => {
    setWinners(newWinners);
    setCandidateCount(count);
  };

  const handleReset = async () => {
    setWinners(null);
    // 이력 새로고침
    try {
      const res = await fetch(`/api/sessions/${sessionId}/lucky-draw`);
      if (res.ok) {
        const data = await res.json() as LuckyDraw[];
        setHistory(data);
      }
    } catch {
      // 이력 새로고침 실패 무시
    }
  };

  const allNames = submissions.filter((s) => !s.excluded).map((s) => s.name);

  return (
    <div className="space-y-8">
      {/* 추첨 결과 or 설정 */}
      {winners ? (
        <LuckyDrawAnimation
          winners={winners}
          candidateNames={allNames}
          onReset={handleReset}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <LuckyDrawSettings
            sessionId={sessionId}
            submissions={submissions}
            onWinnersDrawn={handleWinnersDrawn}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">추첨 방법 안내</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-600">
              <p>1. 당첨 인원 수를 설정합니다.</p>
              <p>2. 추첨 대상 범위를 선택합니다.</p>
              <p className="text-zinc-400">  - <strong>전체 참가자</strong>: 비제외 모든 참가자</p>
              <p className="text-zinc-400">  - <strong>평가 완료만</strong>: AI 평가가 완료된 참가자</p>
              <p>3. 특정 참가자를 제외할 수 있습니다.</p>
              <p>4. 추첨 시작 후 슬롯머신 애니메이션과 함께 당첨자가 공개됩니다.</p>
              <p>5. 전체화면 모드로 시상식 분위기를 연출할 수 있습니다.</p>
              <div className="mt-4 p-3 bg-zinc-50 rounded-lg">
                <p className="text-zinc-500 text-xs">
                  대상 {allNames.length}명의 참가자 풀에서 추첨합니다.
                  <br />현재 후보: {candidateCount > 0 ? `${candidateCount}명` : "-"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 추첨 이력 */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-zinc-900">추첨 이력</h2>
          <div className="space-y-2">
            {[...history].reverse().map((draw) => (
              <Card key={draw.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-zinc-700">
                        {new Date(draw.createdAt).toLocaleString("ko-KR")}
                      </span>
                      <Badge variant="secondary">{draw.winners.length}명 당첨</Badge>
                      <Badge variant="outline">
                        {draw.settings.targetRange === "done" ? "평가완료" : "전체"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {draw.winners.map((w) => (
                        <span
                          key={w.submissionId}
                          className="text-sm bg-yellow-50 border border-yellow-200 text-yellow-800 px-2 py-0.5 rounded"
                        >
                          {w.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
