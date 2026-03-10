import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { RankingTable } from "@/components/admin/RankingTable";
import { db } from "@/db";
import { evaluationSessions, submissions, scores as scoresTable } from "@/db/schema";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { sessionId } = await params;

  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, sessionId))
    .then((r) => r[0]);

  if (!session) notFound();

  // 평가 완료 제출만 순위 표시
  const completedSubs = await db
    .select()
    .from(submissions)
    .where(eq(submissions.sessionId, sessionId))
    .orderBy(desc(submissions.totalScore));

  const doneSubs = completedSubs.filter((s) => s.status === "done" && s.totalScore !== null);

  // 각 제출의 항목별 점수 조회
  const rankings = await Promise.all(
    doneSubs.map(async (sub, idx) => {
      const scoreRows = await db
        .select()
        .from(scoresTable)
        .where(eq(scoresTable.submissionId, sub.id));

      const scoreMap: Record<string, number> = {};
      for (const s of scoreRows) {
        scoreMap[s.criteriaKey] = s.score;
      }

      const entryScores = {
        documentation: scoreMap["documentation"] ?? 0,
        implementation: scoreMap["implementation"] ?? 0,
        ux: scoreMap["ux"] ?? 0,
        idea: scoreMap["idea"] ?? 0,
      };

      return {
        submissionId: sub.id,
        name: sub.name,
        email: sub.email,
        repoUrl: sub.repoUrl,
        deployUrl: sub.deployUrl ?? null,
        scores: entryScores,
        baseScore: sub.baseScore ?? 0,
        bonusScore: sub.bonusScore ?? 0,
        totalScore: sub.totalScore ?? 0,
        rank: idx + 1,
      };
    })
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href={`/admin/session/${sessionId}`}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        세션 상세로 돌아가기
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">결과 대시보드</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {session.name} · 평가완료 {rankings.length}건
        </p>
      </div>

      <RankingTable rankings={rankings} sessionId={sessionId} />
    </div>
  );
}
