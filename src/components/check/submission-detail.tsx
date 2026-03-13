import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreResult } from "./score-result";
import type { Submission, Score, CriteriaConfig } from "@/types";

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "info" | "warning" | "destructive" | "secondary" }> = {
  submitted: { label: "제출 완료", variant: "info" },
  evaluating: { label: "평가 중", variant: "warning" },
  done: { label: "평가 완료", variant: "success" },
  error: { label: "오류", variant: "destructive" },
};

interface SubmissionDetailProps {
  submission: Submission;
  scores: Score[];
  isDeadlinePassed: boolean;
  resultsPublished: boolean;
  criteriaConfig: CriteriaConfig | null;
  sessionId: string;
}

export function SubmissionDetail({
  submission,
  scores,
  isDeadlinePassed,
  resultsPublished,
  criteriaConfig,
  sessionId,
}: SubmissionDetailProps) {
  const statusInfo = STATUS_LABELS[submission.status] ?? { label: submission.status, variant: "secondary" as const };

  return (
    <div className="space-y-4">
      {/* 제출 내역 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>제출 내역</CardTitle>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-zinc-500">제출 시각</span>
            <span className="col-span-2">
              {new Date(submission.submittedAt).toLocaleString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            <span className="text-zinc-500">GitHub</span>
            <span className="col-span-2">
              <a
                href={submission.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-600 hover:underline break-all"
              >
                <Github className="h-3 w-3 flex-shrink-0" />
                {submission.repoUrl}
              </a>
            </span>

            {submission.deployUrl && (
              <>
                <span className="text-zinc-500">배포 URL</span>
                <span className="col-span-2">
                  <a
                    href={submission.deployUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline break-all"
                  >
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    {submission.deployUrl}
                  </a>
                </span>
              </>
            )}
          </div>

          {/* 마감 전이면 수정&재평가 요청 버튼 (최대 5회) */}
          {!isDeadlinePassed && (
            <div className="pt-2">
              {submission.editCount < 5 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/submit/${sessionId}?email=${encodeURIComponent(submission.email)}&checkPassword=${encodeURIComponent(submission.checkPassword)}`}>
                    수정&amp;재평가 요청 ({submission.editCount}/5)
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  수정&amp;재평가 요청 (3/3)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 평가 결과 */}
      {submission.status === "done" && criteriaConfig &&
        submission.totalScore !== null ? (
        <ScoreResult
          scores={scores}
          totalScore={submission.totalScore}
          criteriaConfig={criteriaConfig}
        />
      ) : submission.status === "done" ? (
        <Card>
          <CardContent className="pt-6 text-center text-zinc-500">
            평가 결과를 불러올 수 없습니다.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-zinc-500">
            {submission.status === "evaluating"
              ? "현재 평가가 진행 중입니다. 잠시 후 다시 확인해주세요."
              : submission.status === "error"
                ? "관리자가 오류를 확인 중이며, 처리 후 평가 결과 메일이 발송됩니다."
                : "평가가 아직 시작되지 않았습니다."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
