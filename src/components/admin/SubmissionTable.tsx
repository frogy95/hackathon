"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { SubmissionFilters } from "./SubmissionFilters";
import { SubmissionRow } from "./SubmissionRow";
import { ChevronUp, ChevronDown } from "lucide-react";
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
}

interface SubmissionTableProps {
  submissions: SubmissionData[];
}

export function SubmissionTable({ submissions: initialSubmissions }: SubmissionTableProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
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

  const toggleExclude = (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, excluded: !s.excluded } : s))
    );
  };

  const updateNote = (id: string, note: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, adminNote: note || null } : s))
    );
  };

  return (
    <div className="space-y-4">
      <SubmissionFilters
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        statusCounts={statusCounts}
        onStatusChange={setStatusFilter}
        onSearchChange={setSearchQuery}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
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
            <TableHead>관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <td colSpan={8} className="py-10 text-center text-sm text-zinc-400">
                검색 결과가 없습니다
              </td>
            </TableRow>
          ) : (
            filtered.map((submission) => (
              <SubmissionRow
                key={submission.id}
                submission={submission}
                onToggleExclude={toggleExclude}
                onUpdateNote={updateNote}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
