"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmissionDetail } from "./submission-detail";
import { checkFormSchema, type CheckFormData } from "@/lib/validations";
import type { Submission, Score } from "@/types";

interface CheckFormProps {
  sessionId: string;
  resultsPublished: boolean;
  submissionDeadline: string;
}

export function CheckForm({ sessionId, resultsPublished, submissionDeadline }: CheckFormProps) {
  const [result, setResult] = useState<{
    submission: Submission;
    scores: Score[];
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckFormData>({
    resolver: zodResolver(checkFormSchema),
  });

  const onSubmit = async (data: CheckFormData) => {
    setApiError("");
    setNotFound(false);
    setResult(null);

    const params = new URLSearchParams({ name: data.name, email: data.email });
    const res = await fetch(`/api/sessions/${sessionId}/submissions/check?${params}`);

    if (res.status === 404) {
      setNotFound(true);
      return;
    }

    if (!res.ok) {
      setApiError("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const json = await res.json();
    setResult({
      submission: json.data.submission as Submission,
      scores: json.data.scores as Score[],
    });
  };

  const isDeadlinePassed = new Date(submissionDeadline) < new Date();

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
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="example@company.com"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "조회 중..." : "제출 내역 조회"}
        </Button>
      </form>

      {/* 결과 */}
      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          {apiError}
        </div>
      )}

      {notFound && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center text-sm text-yellow-800">
          제출 내역을 찾을 수 없습니다. 이름과 이메일을 다시 확인해주세요.
        </div>
      )}

      {result && (
        <SubmissionDetail
          submission={result.submission}
          scores={result.scores}
          isDeadlinePassed={isDeadlinePassed}
          resultsPublished={resultsPublished}
          criteriaConfig={null}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
