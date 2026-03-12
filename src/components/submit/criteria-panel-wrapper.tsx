"use client";

import { Suspense, useState } from "react";
import { SubmissionForm } from "./submission-form";
import { CriteriaPanel } from "./criteria-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface SubmitPageClientProps {
  sessionId: string;
  isExpired: boolean;
}

export function SubmitPageClient({ sessionId, isExpired }: SubmitPageClientProps) {
  const [selectedJobRole, setSelectedJobRole] = useState<string | undefined>(undefined);

  return (
    <>
      {/* 왼쪽: 제출 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>제출하기</CardTitle>
          <CardDescription>
            GitHub 저장소 URL은 필수입니다. 배포 URL이 있으면 추가 점수를 받을 수 있습니다.<br />
            이번 해커톤 기간에 착수한 산출물을 올려주세요.<br />
            기재사항 변경사항 없이 재-제출하더라도 현재 Git저장소의 최신 소스로 재평가 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex items-center justify-center py-12 text-zinc-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          }>
            <SubmissionForm
              sessionId={sessionId}
              isExpired={isExpired}
              onJobRoleChange={setSelectedJobRole}
            />
          </Suspense>
        </CardContent>
      </Card>

      {/* 오른쪽: 평가 기준 패널 */}
      <div className="md:sticky md:top-6 md:self-start">
        <CriteriaPanel jobRole={selectedJobRole} />
      </div>
    </>
  );
}
