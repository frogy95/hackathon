import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ProjectReport } from "@/components/admin/ProjectReport";
import { db } from "@/db";
import { submissions, scores } from "@/db/schema";
import type { JobRole } from "@/types";

interface Props {
  params: Promise<{ sessionId: string; submissionId: string }>;
}

export default async function ProjectReportPage({ params }: Props) {
  const { submissionId } = await params;

  const sub = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .then((r) => r[0]);

  if (!sub || sub.status !== "done") notFound();

  const scoreRows = await db
    .select()
    .from(scores)
    .where(eq(scores.submissionId, submissionId));

  // 항목별 점수/근거 맵 구성
  const scoreMap: Record<string, number> = {};
  const reasoningMap: Record<string, string> = {};
  for (const s of scoreRows) {
    scoreMap[s.criteriaKey] = s.score;
    reasoningMap[s.criteriaKey] = s.reasoning ?? "";
  }

  const report = {
    submissionId: sub.id,
    name: sub.name,
    email: sub.email,
    repoUrl: sub.repoUrl,
    deployUrl: sub.deployUrl ?? null,
    jobRole: (sub.jobRole ?? "개발") as JobRole,
    scores: scoreMap,
    reasoning: reasoningMap,
    baseScore: sub.baseScore ?? 0,
    bonusScore: sub.bonusScore ?? null,
    bonusReasoning: null,
    totalScore: sub.totalScore ?? 0,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ProjectReport report={report} />
    </div>
  );
}
