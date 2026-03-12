"use client";

import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart } from "@/components/ui/radar-chart";
import { normalizeReasoning } from "@/lib/utils";
import type { Score, CriteriaConfig } from "@/types";

interface ScoreResultProps {
  scores: Score[];
  totalScore: number;
  criteriaConfig: CriteriaConfig;
}

export function ScoreResult({
  scores,
  totalScore,
  criteriaConfig,
}: ScoreResultProps) {
  const scoreMap = Object.fromEntries(scores.map((s) => [s.criteriaKey, s]));

  // 레이더 차트 + 점수 요약용 데이터
  const radarItems = criteriaConfig.criteria.map((criterion) => ({
    key: criterion.key,
    label: criterion.label,
    score: scoreMap[criterion.key]?.score ?? 0,
    maxScore: criterion.maxScore,
  }));

  return (
    <div className="space-y-4">
      {/* 총점 히어로 블록 */}
      <div className="rounded-xl bg-zinc-900 text-white p-6 text-center">
        <p className="text-sm text-zinc-400 mb-1">최종 점수</p>
        <p className="text-3xl sm:text-5xl font-bold text-emerald-400">{totalScore}</p>
        <p className="text-xs text-zinc-500 mt-1">/ 100점</p>
      </div>

      {/* 레이더 차트 + 점수 요약 2열 그리드 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">항목별 점수 시각화</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarChart items={radarItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">점수 요약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {radarItems.map(({ key, label, score, maxScore }) => {
              const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-700">{label}</span>
                    <span className="font-medium">
                      {score}
                      <span className="text-zinc-400 text-xs"> / {maxScore}</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-semibold">
              <span>총점</span>
              <span>{totalScore}점</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 항목별 평가 근거 */}
      <div className="space-y-3">
        {criteriaConfig.criteria.map((criterion) => {
          const score = scoreMap[criterion.key];
          if (!score?.reasoning) return null;
          const mdText = normalizeReasoning(score.reasoning);
          return (
            <Card key={criterion.key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{criterion.label}</CardTitle>
                  <Badge variant="secondary">
                    {score.score} / {criterion.maxScore}점
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-zinc-700 leading-relaxed prose prose-sm max-w-none prose-headings:text-zinc-800 prose-headings:font-semibold prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1">
                  <ReactMarkdown>{mdText}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
