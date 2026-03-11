import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-4">
      {/* 총점 */}
      <div className="rounded-xl bg-zinc-900 text-white p-6 text-center">
        <p className="text-sm text-zinc-400 mb-1">최종 점수</p>
        <p className="text-5xl font-bold">{totalScore}</p>
      </div>

      {/* 항목별 점수 */}
      <div className="space-y-3">
        {criteriaConfig.criteria.map((criterion) => {
          const score = scoreMap[criterion.key];
          return (
            <Card key={criterion.key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{criterion.label}</CardTitle>
                  <span className="text-lg font-bold text-zinc-900">
                    {score?.score ?? "-"}
                    <span className="text-sm text-zinc-400 font-normal">
                      /{criterion.maxScore}
                    </span>
                  </span>
                </div>
                {score && (
                  <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-zinc-900 h-1.5 rounded-full"
                      style={{ width: `${(score.score / criterion.maxScore) * 100}%` }}
                    />
                  </div>
                )}
              </CardHeader>
              {score?.reasoning && (
                <CardContent>
                  <p className="text-sm text-zinc-600 leading-relaxed">{score.reasoning}</p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
