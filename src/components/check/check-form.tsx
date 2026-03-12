"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmissionDetail } from "./submission-detail";
import { checkFormSchema, type CheckFormData } from "@/lib/validations";
import type { Submission, Score, CriteriaConfig } from "@/types";

interface CheckFormProps {
  sessionId: string;
  resultsPublished: boolean;
  submissionDeadline: string;
}

export function CheckForm({ sessionId, resultsPublished, submissionDeadline }: CheckFormProps) {
  const [result, setResult] = useState<{
    submission: Submission;
    scores: Score[];
    criteriaConfig: CriteriaConfig | null;
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

    try {
      const params = new URLSearchParams({ email: data.email, checkPassword: data.checkPassword });
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
        criteriaConfig: (json.data.criteriaConfig as CriteriaConfig) ?? null,
      });
    } catch {
      setApiError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const isDeadlinePassed = new Date(submissionDeadline) < new Date();

  return (
    <div className="space-y-6">
      {/* 조회 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <div className="space-y-1.5">
          <Label htmlFor="checkPassword">조회 비밀번호 <span className="text-zinc-400 text-xs">(숫자 4자리)</span></Label>
          <Input
            id="checkPassword"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            {...register("checkPassword")}
            aria-invalid={!!errors.checkPassword}
          />
          {errors.checkPassword && (
            <p className="text-xs text-red-600">{errors.checkPassword.message}</p>
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
          제출 내역을 찾을 수 없습니다. 이메일과 조회 비밀번호를 다시 확인해주세요.
        </div>
      )}

      {result && (
        <SubmissionDetail
          submission={result.submission}
          scores={result.scores}
          isDeadlinePassed={isDeadlinePassed}
          resultsPublished={resultsPublished}
          criteriaConfig={result.criteriaConfig}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
