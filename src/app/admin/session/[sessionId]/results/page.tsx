import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RankingTable } from "@/components/admin/RankingTable";
import { mockAdminSessions, mockRankings } from "@/lib/mock-data";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { sessionId } = await params;
  const session = mockAdminSessions.find((s) => s.id === sessionId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href={`/admin/session/${sessionId}`}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        세션 상세로 돌아가기
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">결과 대시보드</h1>
        {session && (
          <p className="text-sm text-zinc-500 mt-1">{session.name} · 평가완료 {mockRankings.length}건</p>
        )}
      </div>

      <RankingTable rankings={mockRankings} sessionId={sessionId} />
    </div>
  );
}
