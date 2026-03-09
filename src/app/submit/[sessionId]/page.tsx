import { notFound } from "next/navigation";
import { Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CountdownTimer } from "@/components/submit/countdown-timer";
import { SubmissionForm } from "@/components/submit/submission-form";
import { mockSession } from "@/lib/mock-data";

interface SubmitPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SubmitPage({ params }: SubmitPageProps) {
  const { sessionId } = await params;

  // Phase 2에서 DB 조회로 교체
  if (sessionId !== mockSession.id) {
    notFound();
  }

  const session = mockSession;
  const isExpired = new Date(session.submissionDeadline) < new Date();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      {/* 세션 정보 */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">{session.name}</h1>
        <p className="text-zinc-600">{session.description}</p>
      </div>

      {/* 마감 정보 */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
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

      <Separator />

      {/* 제출 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>제출하기</CardTitle>
          <CardDescription>
            GitHub 저장소 URL은 필수입니다. 배포 URL이 있으면 추가 점수를 받을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubmissionForm sessionId={sessionId} isExpired={isExpired} />
        </CardContent>
      </Card>
    </div>
  );
}
