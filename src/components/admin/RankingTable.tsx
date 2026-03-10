"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronUp, ChevronDown } from "lucide-react";

type SortKey = "documentation" | "implementation" | "ux" | "idea" | "total";
type SortDir = "asc" | "desc";

interface RankingEntry {
  submissionId: string;
  name: string;
  email: string;
  scores: {
    documentation: number;
    implementation: number;
    ux: number;
    idea: number;
  };
  baseScore: number;
  bonusScore: number;
  totalScore: number;
}

interface RankingTableProps {
  rankings: RankingEntry[];
  sessionId: string;
}

const columns: Array<{ key: SortKey; label: string; max: number }> = [
  { key: "documentation", label: "문서화", max: 35 },
  { key: "implementation", label: "구현력", max: 25 },
  { key: "ux", label: "완성도/UX", max: 25 },
  { key: "idea", label: "아이디어", max: 15 },
  { key: "total", label: "총점", max: 110 },
];

export function RankingTable({ rankings, sessionId }: RankingTableProps) {
  const [includeBonus, setIncludeBonus] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    return [...rankings]
      .map((r) => ({
        ...r,
        displayTotal: includeBonus ? r.totalScore : r.baseScore,
      }))
      .sort((a, b) => {
        const av =
          sortKey === "total" ? a.displayTotal : a.scores[sortKey as keyof typeof a.scores];
        const bv =
          sortKey === "total" ? b.displayTotal : b.scores[sortKey as keyof typeof b.scores];
        return sortDir === "desc" ? bv - av : av - bv;
      });
  }, [rankings, includeBonus, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch
          id="bonus-toggle"
          checked={includeBonus}
          onCheckedChange={setIncludeBonus}
        />
        <Label htmlFor="bonus-toggle" className="cursor-pointer text-sm">
          배포 보너스 포함
        </Label>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">순위</TableHead>
            <TableHead>이름</TableHead>
            {columns.map(({ key, label, max }) => (
              <TableHead
                key={key}
                className="cursor-pointer select-none hover:text-zinc-800 text-right"
                onClick={() => handleSort(key)}
              >
                <span className="flex items-center justify-end gap-1">
                  {label}
                  <span className="text-zinc-400 font-normal text-xs">/{max}</span>
                  {sortKey === key ? (
                    sortDir === "desc" ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5" />
                    )
                  ) : null}
                </span>
              </TableHead>
            ))}
            {includeBonus && (
              <TableHead className="text-right text-zinc-400 text-xs font-normal">보너스</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((entry, idx) => (
            <TableRow key={entry.submissionId}>
              <TableCell className="font-bold text-zinc-500">{idx + 1}</TableCell>
              <TableCell>
                <Link
                  href={`/admin/session/${sessionId}/results/${entry.submissionId}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {entry.name}
                </Link>
              </TableCell>
              <TableCell className="text-right">{entry.scores.documentation}</TableCell>
              <TableCell className="text-right">{entry.scores.implementation}</TableCell>
              <TableCell className="text-right">{entry.scores.ux}</TableCell>
              <TableCell className="text-right">{entry.scores.idea}</TableCell>
              <TableCell className="text-right font-semibold">{entry.displayTotal}</TableCell>
              {includeBonus && (
                <TableCell className="text-right text-zinc-400 text-xs">
                  +{entry.bonusScore}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
