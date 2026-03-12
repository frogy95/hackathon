export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import type { SubmissionStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmissionTable } from "@/components/admin/SubmissionTable";
import { SessionActions } from "@/components/admin/SessionActions";
import { db } from "@/db";
import { evaluationSessions, submissions } from "@/db/schema";
import { ArrowLeft, BarChart2, Gift } from "lucide-react";
import { EvaluateButton } from "@/components/admin/EvaluateButton";
import { PublishResultsButton } from "@/components/admin/PublishResultsButton";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({ params }: Props) {
  const { sessionId } = await params;

  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, sessionId))
    .then((r) => r[0]);

  if (!session) notFound();

  const rawSubs = await db
    .select()
    .from(submissions)
    .where(eq(submissions.sessionId, sessionId))
    .orderBy(submissions.submittedAt);

  const subs = rawSubs.map((s) => ({
    ...s,
    status: s.status as SubmissionStatus,
    errorMessage: s.errorMessage ?? null,
  }));

  const now = new Date();
  const deadline = new Date(session.submissionDeadline);
  const status = session.resultsPublished
    ? "results_published"
    : deadline < now
      ? "closed"
      : "active";

  const deadlineStr = deadline.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      {/* 다크 밴드 */}
      <section className="page-header-band">
        <div className="hero-dots absolute inset-0 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-4 py-8">
          {/* 상단 내비게이션 */}
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-4 w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            대시보드로 돌아가기
          </Link>

          {/* 세션 정보 헤더 */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{session.name}</h1>
                <Badge
                  variant={
                    status === "active"
                      ? "success"
                      : status === "closed"
                        ? "warning"
                        : "info"
                  }
                >
                  {status === "active"
                    ? "진행중"
                    : status === "closed"
                      ? "마감"
                      : "결과공개"}
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mt-1">
                마감일시: {deadlineStr} · 제출 {subs.length}건
              </p>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-wrap items-center gap-2">
              <SessionActions sessionId={sessionId} currentDeadline={session.submissionDeadline} />
              <PublishResultsButton sessionId={sessionId} resultsPublished={session.resultsPublished} />
              <Link href={`/admin/session/${sessionId}/results`}>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white bg-transparent">
                  <BarChart2 className="h-4 w-4 mr-1.5" />
                  결과 대시보드
                </Button>
              </Link>
              <Link href={`/admin/session/${sessionId}/lucky-draw`}>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white bg-transparent">
                  <Gift className="h-4 w-4 mr-1.5" />
                  행운상 추첨
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 콘텐츠 영역 */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* AI 평가 컨트롤 카드 */}
        <div className="mb-6">
          <EvaluateButton
            sessionId={sessionId}
            submissionCount={subs.filter((s) => !s.excluded).length}
            doneCount={subs.filter((s) => !s.excluded && s.status === "done").length}
          />
        </div>

        {/* 제출 현황 테이블 */}
        <SubmissionTable sessionId={sessionId} submissions={subs} />
      </div>
    </>
  );
}
