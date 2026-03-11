import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { RankingTable } from "@/components/admin/RankingTable";
import { db } from "@/db";
import { evaluationSessions, submissions, scores as scoresTable } from "@/db/schema";
import { ROLE_CRITERIA } from "@/lib/role-criteria";
import type { JobRole } from "@/types";

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
    doneSubs.map(async (sub) => {
      const scoreRows = await db
        .select()
        .from(scoresTable)
        .where(eq(scoresTable.submissionId, sub.id));

      const scoreMap: Record<string, number> = {};
      for (const s of scoreRows) {
        scoreMap[s.criteriaKey] = s.score;
      }

      return {
        submissionId: sub.id,
        name: sub.name,
        email: sub.email,
        jobRole: (sub.jobRole ?? "개발") as JobRole,
        scores: scoreMap,
        baseScore: sub.baseScore ?? 0,
        bonusScore: sub.bonusScore ?? 0,
        totalScore: sub.totalScore ?? 0,
      };
    })
  );

  // 동적 컬럼 구성: 단일 직군이면 해당 직군 기준, 혼합이면 공통 키 표시
  const jobRoles = [...new Set(rankings.map((r) => r.jobRole))];
  let columns: { key: string; label: string; max: number }[];

  if (jobRoles.length === 1) {
    // 단일 직군 — 해당 직군의 모든 기준 표시
    const criteria = ROLE_CRITERIA[jobRoles[0]];
    columns = criteria.map((c) => ({ key: c.key, label: c.name, max: c.maxScore }));
  } else {
    // 혼합 직군 — 공통 기준 키만 표시 (모든 직군에 존재하는 키)
    const commonKeys = ["documentation", "implementation", "ux", "idea", "verification_plan"];
    // 공통 기준의 label/max는 "개발" 직군 기준으로 표시
    const devCriteria = ROLE_CRITERIA["개발"];
    const devMap = Object.fromEntries(devCriteria.map((c) => [c.key, c]));
    columns = commonKeys
      .filter((k) => devMap[k])
      .map((k) => ({ key: k, label: devMap[k].name, max: devMap[k].maxScore }));
  }

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

      <RankingTable rankings={rankings} sessionId={sessionId} columns={columns} />
    </div>
  );
}
