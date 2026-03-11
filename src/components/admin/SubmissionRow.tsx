"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableRow, TableCell } from "@/components/ui/table";
import { ExternalLink, Pencil, Check, Loader2 } from "lucide-react";
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
  jobRole?: string | null;
}

interface SubmissionRowProps {
  submission: SubmissionRowData;
  onToggleExclude: (id: string) => Promise<void>;
  onUpdateNote: (id: string, note: string) => Promise<void>;
}

const statusConfig: Record<SubmissionStatus, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  submitted: { label: "제출완료", variant: "secondary" },
  collecting: { label: "수집중", variant: "secondary" },
  evaluating: { label: "평가중", variant: "warning" },
  done: { label: "평가완료", variant: "success" },
  error: { label: "오류", variant: "destructive" },
};

export function SubmissionRow({ submission, onToggleExclude, onUpdateNote }: SubmissionRowProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(submission.adminNote ?? "");
  const [excludeLoading, setExcludeLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);

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
        <Badge variant={variant}>{label}</Badge>
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
      </TableCell>
    </TableRow>
  );
}
