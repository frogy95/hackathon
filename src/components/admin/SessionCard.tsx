import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users } from "lucide-react";

type SessionStatus = "active" | "closed" | "results_published";

interface SessionCardProps {
  id: string;
  name: string;
  description: string | null;
  submissionDeadline: string;
  status: SessionStatus;
  submissionCount: number;
  createdAt: string;
}

const statusConfig: Record<SessionStatus, { label: string; variant: "success" | "warning" | "info" }> = {
  active: { label: "진행중", variant: "success" },
  closed: { label: "마감", variant: "warning" },
  results_published: { label: "결과공개", variant: "info" },
};

export function SessionCard({
  id,
  name,
  description,
  submissionDeadline,
  status,
  submissionCount,
  createdAt,
}: SessionCardProps) {
  const { label, variant } = statusConfig[status];
  const deadline = new Date(submissionDeadline).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const created = new Date(createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

  return (
    <Link href={`/admin/session/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{name}</CardTitle>
            <Badge variant={variant} className="shrink-0">
              {label}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 line-clamp-2">{description}</p>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>제출 {submissionCount}건</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>마감: {deadline}</span>
          </div>
          <div className="text-zinc-400">생성일: {created}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
