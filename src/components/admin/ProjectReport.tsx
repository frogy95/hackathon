import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart } from "./RadarChart";
import { ExternalLink, Github } from "lucide-react";

interface ProjectReportData {
  submissionId: string;
  name: string;
  email: string;
  repoUrl: string;
  deployUrl: string | null;
  scores: {
    completeness: number;
    creativity: number;
    technical: number;
    presentation: number;
  };
  reasoning: {
    completeness: string;
    creativity: string;
    technical: string;
    presentation: string;
  };
  baseScore: number;
  bonusScore: number | null;
  bonusReasoning: string | null;
  totalScore: number;
}

const criteriaLabels: Record<string, { label: string; max: number }> = {
  completeness: { label: "완성도", max: 30 },
  creativity: { label: "창의성", max: 25 },
  technical: { label: "기술적 구현", max: 25 },
  presentation: { label: "발표/문서화", max: 20 },
};

export function ProjectReport({ report }: { report: ProjectReportData }) {
  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{report.name}</CardTitle>
              <p className="text-sm text-zinc-500 mt-1">{report.email}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-zinc-900">{report.totalScore}</div>
              <div className="text-xs text-zinc-400">총점 (100점 만점)</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a
            href={report.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-zinc-700 hover:text-zinc-900"
          >
            <Github className="h-4 w-4" />
            GitHub 저장소
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {report.deployUrl && (
            <a
              href={report.deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-zinc-700 hover:text-zinc-900"
            >
              <ExternalLink className="h-4 w-4" />
              배포 URL
            </a>
          )}
        </CardContent>
      </Card>

      {/* 레이더 차트 + 점수 요약 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">항목별 점수 시각화</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarChart scores={report.scores} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">점수 요약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(report.scores).map(([key, score]) => {
              const { label, max } = criteriaLabels[key];
              const pct = Math.round((score / max) * 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-700">{label}</span>
                    <span className="font-medium">
                      {score}
                      <span className="text-zinc-400 text-xs"> / {max}</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-800 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-semibold">
              <span>기본 점수</span>
              <span>{report.baseScore}점</span>
            </div>
            {report.bonusScore !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">배포 보너스</span>
                <span className="text-green-700">+{report.bonusScore}점</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 항목별 평가 근거 */}
      <div className="space-y-4">
        {Object.entries(report.reasoning).map(([key, text]) => {
          const { label, max } = criteriaLabels[key];
          const score = report.scores[key as keyof typeof report.scores];
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                  <Badge variant="secondary">
                    {score} / {max}점
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-700 leading-relaxed">{text}</p>
              </CardContent>
            </Card>
          );
        })}

        {/* 배포 보너스 */}
        {report.bonusReasoning && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">배포 보너스</CardTitle>
                <Badge variant="success">+{report.bonusScore}점</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700 leading-relaxed">{report.bonusReasoning}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="pt-2">
        <Link
          href="."
          className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          ← 순위표로 돌아가기
        </Link>
      </div>
    </div>
  );
}
