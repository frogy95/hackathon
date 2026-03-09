import Link from "next/link";
import { ArrowRight, CheckCircle, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_SESSION_ID = "session-2026-spring";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-12">
      {/* 히어로 섹션 */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-zinc-900">해커톤 평가 시스템</h1>
        <p className="text-lg text-zinc-600 max-w-xl mx-auto">
          AI-Native 해커톤 참가자 제출, 자동 평가, 결과 공개를 하나의 플랫폼에서 처리합니다.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button asChild size="lg">
            <Link href={`/submit/${DEMO_SESSION_ID}`}>
              제출하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href={`/check/${DEMO_SESSION_ID}`}>내 결과 확인</Link>
          </Button>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
            <CardTitle>간편한 제출</CardTitle>
            <CardDescription>
              이름, 사번, GitHub URL만 입력하면 제출 완료. 마감 카운트다운으로 시간을 확인하세요.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <BarChart3 className="h-8 w-8 text-blue-500 mb-2" />
            <CardTitle>AI 자동 평가</CardTitle>
            <CardDescription>
              제출된 저장소와 배포 URL을 AI가 자동으로 분석하여 항목별 점수와 근거를 제공합니다.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Clock className="h-8 w-8 text-amber-500 mb-2" />
            <CardTitle>실시간 결과 조회</CardTitle>
            <CardDescription>
              이름과 사번으로 언제든지 제출 상태와 평가 결과를 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      {/* 현재 세션 */}
      <section>
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>현재 진행 중인 해커톤</CardTitle>
            <CardDescription>2026 봄 해커톤 · 마감: 2026년 3월 20일 18:00</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button asChild>
              <Link href={`/submit/${DEMO_SESSION_ID}`}>제출하기</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/check/${DEMO_SESSION_ID}`}>결과 확인</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
