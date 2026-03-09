import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Score, CriteriaConfig } from "@/types";

interface ScoreResultProps {
  scores: Score[];
  totalScore: number;
  baseScore: number;
  bonusScore: number;
  criteriaConfig: CriteriaConfig;
}

export function ScoreResult({
  scores,
  totalScore,
  baseScore,
  bonusScore,
  criteriaConfig,
}: ScoreResultProps) {
  const scoreMap = Object.fromEntries(scores.map((s) => [s.criteriaKey, s]));

  return (
    <div className="space-y-4">
      {/* 총점 */}
      <div className="rounded-xl bg-zinc-900 text-white p-6 text-center">
        <p className="text-sm text-zinc-400 mb-1">최종 점수</p>
        <p className="text-5xl font-bold">{totalScore}</p>
        <p className="text-sm text-zinc-400 mt-2">
          기본 점수 {baseScore} + 보너스 {bonusScore}
        </p>
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

        {/* 배포 보너스 */}
        {criteriaConfig.bonus?.map((bonus) => (
          <Card key={bonus.key} className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-amber-800">{bonus.label}</CardTitle>
                <span className="text-lg font-bold text-amber-800">
                  {bonusScore}
                  <span className="text-sm text-amber-600 font-normal">/{bonus.maxScore}</span>
                </span>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
