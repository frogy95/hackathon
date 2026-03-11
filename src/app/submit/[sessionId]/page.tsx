export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Calendar, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* 세션 정보 (전체 너비) */}
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">{session.name}</h1>
        {session.description && <p className="text-zinc-600">{session.description}</p>}
      </div>

      {/* 마감 정보 */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-zinc-600">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          마감:{" "}
          {new Date(session.submissionDeadline).toLocaleString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <CountdownTimer deadline={session.submissionDeadline} />
        </span>
      </div>

      <Separator className="mb-8" />

      {/* 2열 그리드: 폼 + 평가 기준 패널 */}
      <div className="grid gap-8 md:grid-cols-[1fr_400px]">
        <SubmitPageClient sessionId={sessionId} isExpired={isExpired} />
      </div>
    </div>
  );
}
