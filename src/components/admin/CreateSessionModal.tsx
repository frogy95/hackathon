"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSessionSchema, type CreateSessionData } from "@/lib/validations";

interface CreateSessionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateSessionModal({ open, onClose, onCreated }: CreateSessionModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateSessionData>({
    resolver: zodResolver(createSessionSchema),
  });

  const onSubmit = async (data: CreateSessionData) => {
    // datetime-local 값을 ISO 8601로 변환
    const deadline = new Date(data.submissionDeadline).toISOString();

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, submissionDeadline: deadline }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError("root", { message: json?.error?.message ?? "세션 생성에 실패했습니다." });
      return;
    }

    toast.success("세션이 생성되었습니다.");
    reset();
    onClose();
    onCreated?.();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 세션 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <p className="text-xs text-red-600">{errors.root.message}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">세션명 *</Label>
            <Input
              id="name"
              placeholder="예: 2026 봄 해커톤"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="submissionDeadline">마감일시 *</Label>
            <Input
              id="submissionDeadline"
              type="datetime-local"
              {...register("submissionDeadline")}
              aria-invalid={!!errors.submissionDeadline}
            />
            {errors.submissionDeadline && (
              <p className="text-xs text-red-600">{errors.submissionDeadline.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              안내 문구 <span className="text-zinc-400 text-xs">(선택)</span>
            </Label>
            <Input
              id="description"
              placeholder="참가자에게 보여질 안내 문구를 입력하세요"
              {...register("description")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
