import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart } from "@/components/ui/radar-chart";
import { normalizeReasoning } from "@/lib/utils";
import { ExternalLink, Github } from "lucide-react";
import type { JobRole } from "@/types";

interface ProjectReportData {
  submissionId: string;
  name: string;
  email: string;
  repoUrl: string;
  deployUrl: string | null;
  jobRole: JobRole;
  scores: Record<string, number>;
  reasoning: Record<string, string>;
  baseScore: number;
  totalScore: number;
}

// 직군별 평가 기준 라벨 및 만점 정의
const ROLE_CRITERIA_LABELS: Record<JobRole, Record<string, { label: string; max: number }>> = {
  "PM/기획": {
    documentation: { label: "AI-Native 문서화 체계", max: 40 },
    implementation: { label: "기술 구현력", max: 10 },
    ux: { label: "완성도 및 UX", max: 20 },
    idea: { label: "아이디어 및 활용 가치", max: 20 },
    verification_plan: { label: "검증 계획", max: 10 },
  },
  "개발": {
    documentation: { label: "AI-Native 문서화 체계", max: 30 },
    implementation: { label: "기술 구현력", max: 30 },
    ux: { label: "완성도 및 UX", max: 15 },
    idea: { label: "아이디어 및 활용 가치", max: 10 },
    verification_plan: { label: "검증 계획", max: 15 },
  },
  "디자인": {
    documentation: { label: "AI-Native 문서화 체계", max: 20 },
    implementation: { label: "기술 구현력", max: 10 },
    ux: { label: "완성도 및 UX", max: 20 },
    idea: { label: "아이디어 및 활용 가치", max: 10 },
    design_system: { label: "디자인 시스템", max: 30 },
    verification_plan: { label: "검증 계획", max: 10 },
  },
  "QA": {
    documentation: { label: "AI-Native 문서화 체계", max: 30 },
    implementation: { label: "기술 구현력", max: 10 },
    ux: { label: "완성도 및 UX", max: 20 },
    idea: { label: "아이디어 및 활용 가치", max: 10 },
    verification_plan: { label: "검증 계획", max: 30 },
  },
};


export function ProjectReport({ report }: { report: ProjectReportData }) {
  const criteriaLabels = ROLE_CRITERIA_LABELS[report.jobRole] ?? ROLE_CRITERIA_LABELS["개발"];

  // 레이더 차트용 데이터: DB에 있는 점수 키와 기준 라벨 매핑
  const radarItems = Object.entries(criteriaLabels)
    .filter(([key]) => report.scores[key] !== undefined)
    .map(([key, { label, max }]) => ({
      key,
      label,
      score: report.scores[key] ?? 0,
      maxScore: max,
    }));

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{report.name}</CardTitle>
              <p className="text-sm text-zinc-500 mt-1">{report.email}</p>
              <Badge variant="secondary" className="mt-2">{report.jobRole}</Badge>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-zinc-900">{report.totalScore}</div>
              <div className="text-xs text-zinc-400">총점 (최대 100점)</div>
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
                      className="h-full bg-zinc-800 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-semibold">
              <span>총점</span>
              <span>{report.totalScore}점</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 항목별 평가 근거 */}
      <div className="space-y-4">
        {Object.entries(report.reasoning).map(([key, text]) => {
          const meta = criteriaLabels[key];
          if (!meta) return null;
          const { label, max } = meta;
          const score = report.scores[key] ?? 0;
          const mdText = normalizeReasoning(text);
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
                <div className="text-sm text-zinc-700 leading-relaxed prose prose-sm max-w-none prose-headings:text-zinc-800 prose-headings:font-semibold prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1">
                  <ReactMarkdown>{mdText}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
