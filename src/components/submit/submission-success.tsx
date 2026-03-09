import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SubmissionFormData } from "@/lib/validations";

interface SubmissionSuccessProps {
  data: SubmissionFormData;
  sessionId: string;
  submittedAt: string;
}

export function SubmissionSuccess({ data, sessionId, submittedAt }: SubmissionSuccessProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold text-zinc-900">제출이 완료되었습니다!</h2>
        <p className="text-zinc-500 text-sm">
          제출 시각:{" "}
          {new Date(submittedAt).toLocaleString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 text-left space-y-3">
          <h3 className="font-semibold text-zinc-900 mb-4">제출 내용 요약</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-zinc-500 font-medium">이름</span>
            <span className="col-span-2 text-zinc-900">{data.name}</span>

            <span className="text-zinc-500 font-medium">이메일</span>
            <span className="col-span-2 text-zinc-900">{data.email}</span>

            <span className="text-zinc-500 font-medium">GitHub URL</span>
            <span className="col-span-2 text-zinc-900 break-all">
              <a
                href={data.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {data.repoUrl}
              </a>
            </span>

            {data.deployUrl && (
              <>
                <span className="text-zinc-500 font-medium">배포 URL</span>
                <span className="col-span-2 text-zinc-900 break-all">
                  <a
                    href={data.deployUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {data.deployUrl}
                  </a>
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Button asChild className="w-full">
        <Link href={`/check/${sessionId}`}>제출 확인 페이지로 이동</Link>
      </Button>
    </div>
  );
}
