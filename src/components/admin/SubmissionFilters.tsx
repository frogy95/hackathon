"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import type { SubmissionStatus } from "@/types";

type FilterStatus = "all" | SubmissionStatus;

interface StatusCount {
  all: number;
  submitted: number;
  collecting: number;
  evaluating: number;
  done: number;
  error: number;
}

interface SubmissionFiltersProps {
  statusFilter: FilterStatus;
  searchQuery: string;
  statusCounts: StatusCount;
  onStatusChange: (status: FilterStatus) => void;
  onSearchChange: (query: string) => void;
}

const tabItems: Array<{ value: FilterStatus; label: string }> = [
  { value: "all", label: "전체" },
  { value: "submitted", label: "제출완료" },
  { value: "collecting", label: "수집중" },
  { value: "evaluating", label: "평가중" },
  { value: "done", label: "평가완료" },
  { value: "error", label: "오류" },
];

export function SubmissionFilters({
  statusFilter,
  searchQuery,
  statusCounts,
  onStatusChange,
  onSearchChange,
}: SubmissionFiltersProps) {
  return (
    <div className="space-y-3">
      <Tabs
        value={statusFilter}
        onValueChange={(v) => onStatusChange(v as FilterStatus)}
      >
        <TabsList className="flex-wrap h-auto gap-1">
          {tabItems.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              {label}
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                {statusCounts[value]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="이름 또는 이메일 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
