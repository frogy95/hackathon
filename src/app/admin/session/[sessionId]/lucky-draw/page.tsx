export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions, luckyDraws } from "@/db/schema";
import { ArrowLeft, Gift } from "lucide-react";
import { LuckyDrawPageClient } from "./LuckyDrawPageClient";
import type { LuckyDraw, LuckyDrawSettings, LuckyDrawWinner, JobRole } from "@/types";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function LuckyDrawPage({ params }: Props) {
  const { sessionId } = await params;

  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, sessionId))
    .then((r) => r[0]);

  if (!session) notFound();

  // 비제외 참가자 목록
  const rawSubs = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.sessionId, sessionId), eq(submissions.excluded, false)))
    .orderBy(submissions.submittedAt);

  const subList = rawSubs.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    jobRole: s.jobRole as JobRole,
    status: s.status as import("@/types").SubmissionStatus,
    excluded: s.excluded,
  }));

  // 추첨 이력
  const rawDraws = await db
    .select()
    .from(luckyDraws)
    .where(eq(luckyDraws.sessionId, sessionId))
    .orderBy(luckyDraws.createdAt);

  const drawHistory: LuckyDraw[] = rawDraws.map((d) => ({
    id: d.id,
    sessionId: d.sessionId,
    settings: JSON.parse(d.settings) as LuckyDrawSettings,
    winners: JSON.parse(d.winners) as LuckyDrawWinner[],
    createdAt: d.createdAt,
  }));

  return (
    <>
      {/* 다크 밴드 */}
      <section className="page-header-band">
        <div className="hero-dots absolute inset-0 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-4 py-8">
          <Link
            href={`/admin/session/${sessionId}`}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-4 w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            세션으로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <Gift className="h-6 w-6 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">행운상 추첨</h1>
              <p className="text-sm text-zinc-400">{session.name}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 콘텐츠 영역 */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <LuckyDrawPageClient
          sessionId={sessionId}
          submissions={subList}
          history={drawHistory}
        />
      </div>
    </>
  );
}
