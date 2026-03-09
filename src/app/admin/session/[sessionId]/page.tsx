import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmissionTable } from "@/components/admin/SubmissionTable";
import { mockAdminSessions, mockAdminSubmissions } from "@/lib/mock-data";
import { ArrowLeft, BarChart2, Clock, StopCircle } from "lucide-react";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({ params }: Props) {
  const { sessionId } = await params;
  const session = mockAdminSessions.find((s) => s.id === sessionId) ?? {
    id: sessionId,
    name: sessionId,
    description: "",
    submissionDeadline: new Date().toISOString(),
    status: "active" as const,
    submissionCount: 0,
    createdAt: new Date().toISOString(),
    resultsPublished: false,
  };

  const submissions = mockAdminSubmissions.filter((s) => s.sessionId === sessionId);
  const deadline = new Date(session.submissionDeadline).toLocaleString("ko-KR", {
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
                session.status === "active"
                  ? "success"
                  : session.status === "closed"
                    ? "warning"
                    : "info"
              }
            >
              {session.status === "active"
                ? "진행중"
                : session.status === "closed"
                  ? "마감"
                  : "결과공개"}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            마감일시: {deadline} · 제출 {submissions.length}건
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-1.5" />
            마감 연장
          </Button>
          <Button variant="outline" size="sm">
            <StopCircle className="h-4 w-4 mr-1.5" />
            즉시 마감
          </Button>
          <Button size="sm" disabled title="Phase 3에서 연결 예정">
            평가 실행
          </Button>
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
      <SubmissionTable submissions={submissions} />
    </div>
  );
}
