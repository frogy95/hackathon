"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmissionSuccess } from "./submission-success";
import { submissionSchema, type SubmissionFormData } from "@/lib/validations";

interface SubmissionFormProps {
  sessionId: string;
  isExpired: boolean;
  onJobRoleChange?: (role: string) => void;
}

type GithubStatus = "idle" | "checking" | "valid" | "invalid";

export function SubmissionForm({ sessionId, isExpired, onJobRoleChange }: SubmissionFormProps) {
  const [submittedData, setSubmittedData] = useState<SubmissionFormData | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [githubStatus, setGithubStatus] = useState<GithubStatus>("idle");
  const [githubMessage, setGithubMessage] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
  });

  const repoUrl = watch("repoUrl");
  const jobRole = watch("jobRole");

  // 직군 변경 시 부모에 알림
  useEffect(() => {
    if (jobRole && onJobRoleChange) {
      onJobRoleChange(jobRole);
    }
  }, [jobRole, onJobRoleChange]);

  // GitHub URL 실시간 검증 (500ms debounce)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!repoUrl || repoUrl.length < 10) {
      setGithubStatus("idle");
      return;
    }

    setGithubStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/validate/github-url?url=${encodeURIComponent(repoUrl)}`);
        const json = await res.json();
        if (json.data?.valid) {
          setGithubStatus("valid");
          setGithubMessage("저장소가 확인되었습니다.");
        } else {
          setGithubStatus("invalid");
          setGithubMessage(json.data?.reason ?? "저장소를 확인할 수 없습니다.");
        }
      } catch {
        setGithubStatus("invalid");
        setGithubMessage("검증 중 오류가 발생했습니다.");
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [repoUrl]);

  const onSubmit = async (data: SubmissionFormData) => {
    setSubmitError("");
    const res = await fetch(`/api/sessions/${sessionId}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const code = json?.error?.code;
      if (code === "DEADLINE_PASSED") {
        setError("root", { message: "제출 마감이 지났습니다." });
      } else {
        setSubmitError(json?.error?.message ?? "제출에 실패했습니다. 다시 시도해주세요.");
      }
      return;
    }

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
      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}
      {errors.root && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

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

      {/* 직군 선택 */}
      <div className="space-y-1.5">
        <Label htmlFor="jobRole">직군 *</Label>
        <select
          id="jobRole"
          {...register("jobRole")}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          defaultValue=""
        >
          <option value="" disabled>직군을 선택해주세요</option>
          <option value="PM/기획">PM/기획</option>
          <option value="디자인">디자인</option>
          <option value="개발">개발</option>
          <option value="QA">QA</option>
        </select>
        {errors.jobRole && <p className="text-xs text-red-600">{errors.jobRole.message}</p>}
      </div>

      {/* 조회 비밀번호 */}
      <div className="space-y-1.5">
        <Label htmlFor="checkPassword">조회 비밀번호 * <span className="text-zinc-400 text-xs">(숫자 4자리)</span></Label>
        <Input
          id="checkPassword"
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="0000"
          {...register("checkPassword")}
          aria-invalid={!!errors.checkPassword}
        />
        {errors.checkPassword && <p className="text-xs text-red-600">{errors.checkPassword.message}</p>}
        <p className="text-xs text-zinc-400">결과 조회 시 사용할 비밀번호입니다.</p>
      </div>

      {/* GitHub URL + 실시간 검증 */}
      <div className="space-y-1.5">
        <Label htmlFor="repoUrl">GitHub 저장소 URL *</Label>
        <div className="relative">
          <Input
            id="repoUrl"
            type="url"
            placeholder="https://github.com/username/repository"
            {...register("repoUrl")}
            aria-invalid={!!errors.repoUrl}
            className="pr-8"
          />
          {githubStatus === "checking" && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-zinc-400" />
          )}
          {githubStatus === "valid" && (
            <CheckCircle className="absolute right-2.5 top-2.5 h-4 w-4 text-green-500" />
          )}
          {githubStatus === "invalid" && (
            <XCircle className="absolute right-2.5 top-2.5 h-4 w-4 text-red-500" />
          )}
        </div>
        {errors.repoUrl && <p className="text-xs text-red-600">{errors.repoUrl.message}</p>}
        {githubStatus === "valid" && (
          <p className="text-xs text-green-600">{githubMessage}</p>
        )}
        {githubStatus === "invalid" && !errors.repoUrl && (
          <p className="text-xs text-red-600">{githubMessage}</p>
        )}
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
