"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SubmissionFilters } from "./SubmissionFilters";
import { SubmissionRow } from "./SubmissionRow";
import { ChevronUp, ChevronDown, Download } from "lucide-react";
import type { SubmissionStatus } from "@/types";

type FilterStatus = "all" | SubmissionStatus;
type SortDir = "asc" | "desc";

interface SubmissionData {
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
  feedback?: string | null;
}

interface SubmissionTableProps {
  sessionId: string;
  submissions: SubmissionData[];
}

export function SubmissionTable({ sessionId, submissions: initialSubmissions }: SubmissionTableProps) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    setSubmissions(initialSubmissions);
  }, [initialSubmissions]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const statusCounts = useMemo(() => {
    return {
      all: submissions.length,
      submitted: submissions.filter((s) => s.status === "submitted").length,
      collecting: submissions.filter((s) => s.status === "collecting").length,
      evaluating: submissions.filter((s) => s.status === "evaluating").length,
      done: submissions.filter((s) => s.status === "done").length,
      error: submissions.filter((s) => s.status === "error").length,
    };
  }, [submissions]);

  const filtered = useMemo(() => {
    return submissions
      .filter((s) => statusFilter === "all" || s.status === statusFilter)
      .filter((s) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.name.includes(q) || s.email.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const diff = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        return sortDir === "asc" ? diff : -diff;
      });
  }, [submissions, statusFilter, searchQuery, sortDir]);

  const toggleExclude = async (id: string) => {
    const submission = submissions.find((s) => s.id === id);
    if (!submission) return;

    const newExcluded = !submission.excluded;
    const res = await fetch(`/api/sessions/${sessionId}/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excluded: newExcluded }),
    });

    if (!res.ok) {
      toast.error(newExcluded ? "제외 처리에 실패했습니다." : "복원에 실패했습니다.");
      return;
    }

    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, excluded: newExcluded } : s))
    );
    toast.success(newExcluded ? "제외 처리되었습니다." : "복원되었습니다.");
    router.refresh();
  };

  const deleteSubmission = async (id: string) => {
    const res = await fetch(`/api/sessions/${sessionId}/submissions/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      toast.error("삭제에 실패했습니다.");
      return;
    }

    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    toast.success("제출이 삭제되었습니다.");
    router.refresh();
  };

  const updateNote = async (id: string, note: string) => {
    const res = await fetch(`/api/sessions/${sessionId}/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote: note }),
    });

    if (!res.ok) {
      toast.error("메모 저장에 실패했습니다.");
      return;
    }

    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, adminNote: note || null } : s))
    );
    toast.success("메모가 저장되었습니다.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SubmissionFilters
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          statusCounts={statusCounts}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearchQuery}
        />
        <Button
          variant="outline"
          size="sm"
          className="sm:w-auto w-full"
          onClick={() => {
            window.location.href = `/api/sessions/${sessionId}/export/csv`;
          }}
        >
          <Download className="h-4 w-4 mr-1.5" />
          CSV 내보내기
        </Button>
      </div>

      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>직군</TableHead>
            <TableHead>이메일</TableHead>
            <TableHead>GitHub</TableHead>
            <TableHead>배포 URL</TableHead>
            <TableHead
              className="cursor-pointer select-none hover:text-zinc-800"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            >
              <span className="flex items-center gap-1">
                제출 시각
                {sortDir === "asc" ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </span>
            </TableHead>
            <TableHead>상태</TableHead>
            <TableHead>메모</TableHead>
            <TableHead>소감</TableHead>
            <TableHead>관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <td colSpan={10} className="py-10 text-center text-sm text-zinc-400">
                검색 결과가 없습니다
              </td>
            </TableRow>
          ) : (
            filtered.map((submission) => (
              <SubmissionRow
                key={submission.id}
                submission={{ ...submission, sessionId }}
                onToggleExclude={toggleExclude}
                onUpdateNote={updateNote}
                onDelete={deleteSubmission}
              />
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
