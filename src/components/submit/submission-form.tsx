"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmissionSuccess } from "./submission-success";
import { submissionSchema, type SubmissionFormData } from "@/lib/validations";

interface SubmissionFormProps {
  sessionId: string;
  isExpired: boolean;
}

export function SubmissionForm({ sessionId, isExpired }: SubmissionFormProps) {
  const [submittedData, setSubmittedData] = useState<SubmissionFormData | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
  });

  const onSubmit = async (data: SubmissionFormData) => {
    // Phase 2에서 실제 API 호출로 교체
    await new Promise((res) => setTimeout(res, 500)); // 목업 딜레이
    setSubmittedAt(new Date().toISOString());
    setSubmittedData(data);
  };

  if (submittedData) {
    return (
      <SubmissionSuccess data={submittedData} sessionId={sessionId} submittedAt={submittedAt} />
    );
  }

  if (isExpired) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700 font-medium">제출 마감이 지났습니다.</p>
        <p className="text-red-600 text-sm mt-1">더 이상 제출할 수 없습니다.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* 이름 */}
      <div className="space-y-1.5">
        <Label htmlFor="name">이름 *</Label>
        <Input
          id="name"
          placeholder="홍길동"
          {...register("name")}
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      {/* 이메일 */}
      <div className="space-y-1.5">
        <Label htmlFor="email">이메일 *</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@company.com"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      {/* GitHub URL */}
      <div className="space-y-1.5">
        <Label htmlFor="repoUrl">GitHub 저장소 URL *</Label>
        <Input
          id="repoUrl"
          type="url"
          placeholder="https://github.com/username/repository"
          {...register("repoUrl")}
          aria-invalid={!!errors.repoUrl}
        />
        {errors.repoUrl && <p className="text-xs text-red-600">{errors.repoUrl.message}</p>}
      </div>

      {/* 배포 URL (선택) */}
      <div className="space-y-1.5">
        <Label htmlFor="deployUrl">
          배포 URL <span className="text-zinc-400 text-xs">(선택)</span>
        </Label>
        <Input
          id="deployUrl"
          type="url"
          placeholder="https://my-app.vercel.app"
          {...register("deployUrl")}
          aria-invalid={!!errors.deployUrl}
        />
        {errors.deployUrl && <p className="text-xs text-red-600">{errors.deployUrl.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "제출 중..." : "제출하기"}
      </Button>
    </form>
  );
}
