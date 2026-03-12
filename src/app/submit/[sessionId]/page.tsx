export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Calendar, Clock } from "lucide-react";
import { CountdownTimer } from "@/components/submit/countdown-timer";
import { SubmitPageClient } from "@/components/submit/criteria-panel-wrapper";
import { db } from "@/db";
import { evaluationSessions } from "@/db/schema";

interface SubmitPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SubmitPage({ params }: SubmitPageProps) {
  const { sessionId } = await params;

  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, sessionId))
    .then((r) => r[0]);

  if (!session) notFound();

  const isExpired = new Date(session.submissionDeadline) < new Date();

  return (
    <>
      {/* 다크 밴드 */}
      <section className="page-header-band">
        <div className="hero-dots absolute inset-0 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-bold text-white">{session.name}</h1>
          {session.description && <p className="text-zinc-400 mt-1">{session.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-400" />
              마감:{" "}
              {new Date(session.submissionDeadline).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-emerald-400" />
              <CountdownTimer deadline={session.submissionDeadline} />
            </span>
          </div>
        </div>
      </section>

      {/* 콘텐츠 영역 */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* 2열 그리드: 폼 + 평가 기준 패널 */}
        <div className="grid gap-8 md:grid-cols-[1fr_400px]">
          <SubmitPageClient sessionId={sessionId} isExpired={isExpired} />
        </div>
      </div>
    </>
  );
}
