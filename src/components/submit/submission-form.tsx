"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [submittedData, setSubmittedData] = useState<SubmissionFormData | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [githubStatus, setGithubStatus] = useState<GithubStatus>("idle");
  const [githubMessage, setGithubMessage] = useState<string>("");
  const [isPrefilling, setIsPrefilling] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
  });

  // 쿼리 파라미터로 기존 제출 데이터 프리필
  useEffect(() => {
    const email = searchParams.get("email");
    const checkPassword = searchParams.get("checkPassword");
    if (!email || !checkPassword) return;

    setIsPrefilling(true);
    fetch(`/api/sessions/${sessionId}/submissions/check?email=${encodeURIComponent(email)}&checkPassword=${encodeURIComponent(checkPassword)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const sub = json?.data?.submission;
        if (sub) {
          reset({
            name: sub.name ?? "",
            email: sub.email ?? "",
            jobRole: sub.jobRole ?? "",
            checkPassword: sub.checkPassword ?? "",
            repoUrl: sub.repoUrl ?? "",
            deployUrl: sub.deployUrl ?? "",
            feedback: sub.feedback ?? "",
          });
          if (sub.jobRole && onJobRoleChange) {
            onJobRoleChange(sub.jobRole);
          }
        }
      })
      .catch(() => null)
      .finally(() => setIsPrefilling(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const repoUrl = watch("repoUrl");
  const jobRole = watch("jobRole");
  const feedback = watch("feedback") ?? "";
  const FEEDBACK_MAX = 512;
  const feedbackLen = feedback.length;
  const feedbackRemaining = FEEDBACK_MAX - feedbackLen;
  const feedbackProgress = Math.min(feedbackLen / FEEDBACK_MAX, 1);
  // SVG 원형 프로그레스 설정
  const circleR = 8;
  const circleC = 2 * Math.PI * circleR;
  const circleDash = circleC * feedbackProgress;
  const feedbackColor =
    feedbackRemaining < 0
      ? "text-red-500"
      : feedbackRemaining <= 20
        ? "text-amber-500"
        : "text-zinc-400";
  const circleColor =
    feedbackRemaining < 0
      ? "#ef4444"
      : feedbackRemaining <= 20
        ? "#f59e0b"
        : "#a1a1aa";

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
    try {
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
    } catch {
      setSubmitError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
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

  if (isPrefilling) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">기존 제출 데이터를 불러오는 중...</span>
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

      {/* 참여 소감 (선택) */}
      <div className="space-y-1.5">
        <Label htmlFor="feedback">
          참여 소감 <span className="text-zinc-400 text-xs">(선택)</span>
        </Label>
        <textarea
          id="feedback"
          rows={4}
          placeholder="해커톤에 참여하면서 느낀 점을 자유롭게 적어주세요."
          {...register("feedback")}
          aria-invalid={!!errors.feedback}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
        <div className="flex items-center justify-end gap-1.5">
          <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
            <circle cx="10" cy="10" r={circleR} fill="none" stroke="#e4e4e7" strokeWidth="2" />
            <circle
              cx="10" cy="10" r={circleR}
              fill="none"
              stroke={circleColor}
              strokeWidth="2"
              strokeDasharray={`${circleDash} ${circleC}`}
              strokeLinecap="round"
              transform="rotate(-90 10 10)"
            />
          </svg>
          <span className={`text-xs tabular-nums ${feedbackColor}`}>
            {feedbackLen}/{FEEDBACK_MAX}
          </span>
        </div>
        {errors.feedback && <p className="text-xs text-red-600">{errors.feedback.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "제출 중..." : "제출하기"}
      </Button>
    </form>
  );
}
