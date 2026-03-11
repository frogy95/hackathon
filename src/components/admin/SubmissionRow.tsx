"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableRow, TableCell } from "@/components/ui/table";
import { ExternalLink, Pencil, Check, Loader2, RefreshCw, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SubmissionStatus } from "@/types";

interface SubmissionRowData {
  id: string;
  name: string;
  email: string;
  repoUrl: string;
  deployUrl: string | null;
  submittedAt: string;
  status: SubmissionStatus;
  excluded: boolean;
  adminNote: string | null;
  errorMessage: string | null;
  jobRole?: string | null;
  sessionId: string;
}

interface SubmissionRowProps {
  submission: SubmissionRowData;
  onToggleExclude: (id: string) => Promise<void>;
  onUpdateNote: (id: string, note: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const statusConfig: Record<SubmissionStatus, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  submitted: { label: "제출완료", variant: "secondary" },
  collecting: { label: "수집중", variant: "secondary" },
  evaluating: { label: "평가중", variant: "warning" },
  done: { label: "평가완료", variant: "success" },
  error: { label: "오류", variant: "destructive" },
};

export function SubmissionRow({ submission, onToggleExclude, onUpdateNote, onDelete }: SubmissionRowProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(submission.adminNote ?? "");
  const [excludeLoading, setExcludeLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [reEvalLoading, setReEvalLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { label, variant } = statusConfig[submission.status];
  const submittedAt = new Date(submission.submittedAt).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleNoteConfirm = async () => {
    setNoteLoading(true);
    await onUpdateNote(submission.id, noteValue);
    setNoteLoading(false);
    setEditingNote(false);
  };

  const handleToggleExclude = async () => {
    setExcludeLoading(true);
    await onToggleExclude(submission.id);
    setExcludeLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${submission.name}"의 제출을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleteLoading(true);
    await onDelete(submission.id);
    setDeleteLoading(false);
  };

  const handleReEvaluate = async () => {
    setReEvalLoading(true);
    try {
      const res = await fetch(
        `/api/sessions/${submission.sessionId}/submissions/${submission.id}/re-evaluate`,
        { method: "POST" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json?.error?.message ?? "재평가 요청에 실패했습니다.");
      } else {
        toast.success("재평가를 시작했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setReEvalLoading(false);
    }
  };

  const showReEvalButton = submission.status === "error" || submission.status === "done";

  return (
    <TableRow className={submission.excluded ? "bg-zinc-100 opacity-60" : ""}>
      <TableCell className="font-medium">{submission.name}</TableCell>
      <TableCell className="text-zinc-500 text-xs">{submission.jobRole ?? "개발"}</TableCell>
      <TableCell className="text-zinc-500 text-xs">{submission.email}</TableCell>
      <TableCell>
        <a
          href={submission.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline max-w-[160px] truncate"
        >
          {submission.repoUrl.replace("https://github.com/", "")}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </TableCell>
      <TableCell>
        {submission.deployUrl ? (
          <a
            href={submission.deployUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            링크 <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-zinc-400">없음</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-zinc-500">{submittedAt}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Badge variant={variant}>{label}</Badge>
          {submission.status === "error" && submission.errorMessage && (
            <span title={submission.errorMessage} className="cursor-help flex-shrink-0">
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {editingNote ? (
          <div className="flex items-center gap-1">
            <Input
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              className="h-7 text-xs w-32"
              onKeyDown={(e) => e.key === "Enter" && !noteLoading && handleNoteConfirm()}
              autoFocus
              disabled={noteLoading}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleNoteConfirm}
              disabled={noteLoading}
            >
              {noteLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 max-w-[120px] truncate"
            onClick={() => setEditingNote(true)}
          >
            <span className="truncate">{noteValue || "메모 추가"}</span>
            <Pencil className="h-3 w-3 shrink-0 opacity-50" />
          </button>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {showReEvalButton && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-zinc-500 hover:text-blue-600"
              onClick={handleReEvaluate}
              disabled={reEvalLoading}
              title="재평가"
            >
              {reEvalLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant={submission.excluded ? "outline" : "ghost"}
            className="h-7 text-xs"
            onClick={handleToggleExclude}
            disabled={excludeLoading}
          >
            {excludeLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : submission.excluded ? (
              "복원"
            ) : (
              "제외"
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-400 hover:text-red-600 hover:bg-red-50"
            onClick={handleDelete}
            disabled={deleteLoading}
            title="영구 삭제"
          >
            {deleteLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
