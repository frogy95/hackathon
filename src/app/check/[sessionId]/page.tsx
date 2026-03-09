import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckForm } from "@/components/check/check-form";
import { mockSession } from "@/lib/mock-data";

interface CheckPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function CheckPage({ params }: CheckPageProps) {
  const { sessionId } = await params;

  // Phase 2에서 DB 조회로 교체
  if (sessionId !== mockSession.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">제출 확인 / 결과 조회</h1>
        <p className="text-zinc-600">{mockSession.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>내 제출 내역 조회</CardTitle>
          <CardDescription>이름과 이메일을 입력하여 제출 내역과 평가 결과를 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <CheckForm sessionId={sessionId} />
        </CardContent>
      </Card>
    </div>
  );
}
