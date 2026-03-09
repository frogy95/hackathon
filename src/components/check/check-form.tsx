"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmissionDetail } from "./submission-detail";
import { checkFormSchema, type CheckFormData } from "@/lib/validations";
import { mockSubmissions, mockScores, mockSession } from "@/lib/mock-data";
import type { Submission, Score } from "@/types";

interface CheckFormProps {
  sessionId: string;
}

export function CheckForm({ sessionId }: CheckFormProps) {
  const [result, setResult] = useState<{
    submission: Submission;
    scores: Score[];
  } | null>(null);
  const [notFound, setNotFound] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckFormData>({
    resolver: zodResolver(checkFormSchema),
  });

  const onSubmit = async (data: CheckFormData) => {
    // Phase 2에서 실제 API 호출로 교체
    await new Promise((res) => setTimeout(res, 300));

    const found = mockSubmissions.find(
      (s) => s.name === data.name && s.employeeId === data.employeeId
    );

    if (!found) {
      setNotFound(true);
      setResult(null);
      return;
    }

    const scores = mockScores.filter((s) => s.submissionId === found.id);
    setNotFound(false);
    setResult({ submission: found as Submission, scores: scores as Score[] });
  };

  const isDeadlinePassed = new Date(mockSession.submissionDeadline) < new Date();

  return (
    <div className="space-y-6">
      {/* 조회 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            placeholder="홍길동"
            {...register("name")}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="employeeId">사번</Label>
          <Input
            id="employeeId"
            placeholder="EMP001"
            {...register("employeeId")}
            aria-invalid={!!errors.employeeId}
          />
          {errors.employeeId && (
            <p className="text-xs text-red-600">{errors.employeeId.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "조회 중..." : "제출 내역 조회"}
        </Button>
      </form>

      {/* 결과 */}
      {notFound && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center text-sm text-yellow-800">
          제출 내역을 찾을 수 없습니다. 이름과 사번을 다시 확인해주세요.
        </div>
      )}

      {result && (
        <SubmissionDetail
          submission={result.submission}
          scores={result.scores}
          isDeadlinePassed={isDeadlinePassed}
          resultsPublished={mockSession.resultsPublished}
          criteriaConfig={mockSession.criteriaConfig}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
