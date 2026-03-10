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
import { ArrowLeft, BarChart2 } from "lucide-react";
import { EvaluateButton } from "@/components/admin/EvaluateButton";

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
  }));

  const now = new Date();
  const deadline = new Date(session.submissionDeadline);
  const status = session.resultsPublished
    ? "results_published"
    : deadline < now
      ? "closed"
      : "active";

  const deadlineStr = deadline.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 상단 내비게이션 */}
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        대시보드로 돌아가기
      </Link>

      {/* 세션 정보 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">{session.name}</h1>
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
          <p className="text-sm text-zinc-500 mt-1">
            마감일시: {deadlineStr} · 제출 {subs.length}건
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap items-center gap-2">
          <SessionActions sessionId={sessionId} currentDeadline={session.submissionDeadline} />
          <EvaluateButton
            sessionId={sessionId}
            submissionCount={subs.filter((s) => !s.excluded).length}
            doneCount={subs.filter((s) => !s.excluded && s.status === "done").length}
          />
          <Button size="sm" variant="secondary" disabled title="Phase 3에서 연결 예정">
            결과 공개
          </Button>
          <Link href={`/admin/session/${sessionId}/results`}>
            <Button size="sm" variant="outline">
              <BarChart2 className="h-4 w-4 mr-1.5" />
              결과 대시보드
            </Button>
          </Link>
        </div>
      </div>

      {/* 제출 현황 테이블 */}
      <SubmissionTable sessionId={sessionId} submissions={subs} />
    </div>
  );
}
