"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const createSessionSchema = z.object({
  name: z.string().min(1, "세션명을 입력해주세요"),
  deadline: z.string().min(1, "마감일시를 입력해주세요"),
  description: z.string().optional(),
});

type CreateSessionFormData = z.infer<typeof createSessionSchema>;

interface CreateSessionModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateSessionModal({ open, onClose }: CreateSessionModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
  });

  const onSubmit = async (data: CreateSessionFormData) => {
    // Phase 2에서 POST /api/sessions API 호출로 교체
    console.log("세션 생성:", data);
    reset();
    onClose();
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
            <Label htmlFor="deadline">마감일시 *</Label>
            <Input
              id="deadline"
              type="datetime-local"
              {...register("deadline")}
              aria-invalid={!!errors.deadline}
            />
            {errors.deadline && <p className="text-xs text-red-600">{errors.deadline.message}</p>}
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
