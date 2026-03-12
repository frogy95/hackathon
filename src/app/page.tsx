export const dynamic = 'force-dynamic';

import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { ArrowRight, CheckCircle, BarChart3, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { evaluationSessions, submissions } from "@/db/schema";

export default async function HomePage() {
  // 진행 중인 세션 목록 조회
  const rows = await db
    .select({
      id: evaluationSessions.id,
      name: evaluationSessions.name,
      description: evaluationSessions.description,
      submissionDeadline: evaluationSessions.submissionDeadline,
      resultsPublished: evaluationSessions.resultsPublished,
      submissionCount: sql<number>`count(${submissions.id})`,
    })
    .from(evaluationSessions)
    .leftJoin(submissions, eq(submissions.sessionId, evaluationSessions.id))
    .groupBy(evaluationSessions.id)
    .orderBy(sql`${evaluationSessions.createdAt} DESC`);

  const now = new Date();
  const sessions = rows.map((s) => {
    const deadline = new Date(s.submissionDeadline);
    const status = s.resultsPublished
      ? "results_published"
      : deadline < now
        ? "closed"
        : "active";
    return { ...s, status, deadline };
  });

  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <div className="space-y-12">
      {/* 히어로 섹션 */}
      <section className="relative bg-zinc-950 overflow-hidden">
        {/* 도트 패턴 */}
        <div className="hero-dots absolute inset-0 pointer-events-none" />
        {/* 장식 글로우 원 — 좌상단 */}
        <div className="animate-pulse-ring absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        {/* 장식 글로우 원 — 우하단 */}
        <div className="animate-pulse-ring absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center space-y-5">
          <p className="animate-fade-in-up inline-flex items-center gap-2 text-xs font-mono text-emerald-400/70 tracking-widest uppercase border border-emerald-500/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-Native Hackathon
          </p>
          <h1 className="animate-fade-in-up-delay-1 text-4xl sm:text-5xl font-bold tracking-tighter text-white">
            <span className="text-emerald-400 mr-2 font-mono">&gt;</span>
            해커톤 평가 시스템
          </h1>
          <p className="animate-fade-in-up-delay-2 text-base text-zinc-400 max-w-lg mx-auto">
            유비케어 AI-Native 해커톤 — AI가 자동으로 제출물을 분석하고 공정하게 평가합니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 space-y-12">
      {/* 기능 소개 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-zinc-800 bg-zinc-950 text-white hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-200">
          <CardHeader>
            <div className="bg-emerald-500/10 rounded-full p-2 w-fit mb-2">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <CardTitle className="text-white">간편한 제출</CardTitle>
            <CardDescription className="text-zinc-400">
              이름, 이메일, GitHub URL만 입력하면 제출 완료. 마감 카운트다운으로 시간을 확인하세요.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950 text-white hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-200">
          <CardHeader>
            <div className="bg-emerald-500/10 rounded-full p-2 w-fit mb-2">
              <BarChart3 className="h-8 w-8 text-emerald-400" />
            </div>
            <CardTitle className="text-white">AI 자동 평가</CardTitle>
            <CardDescription className="text-zinc-400">
              제출된 저장소와 배포 URL을 AI가 자동으로 분석하여 항목별 점수와 근거를 제공합니다.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950 text-white hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-200">
          <CardHeader>
            <div className="bg-emerald-500/10 rounded-full p-2 w-fit mb-2">
              <Clock className="h-8 w-8 text-emerald-400" />
            </div>
            <CardTitle className="text-white">실시간 결과 조회</CardTitle>
            <CardDescription className="text-zinc-400">
              이름과 이메일로 언제든지 제출 상태와 평가 결과를 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      {/* 세션 목록 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-900">
          {activeSessions.length > 0 ? "현재 진행 중인 해커톤" : "해커톤 목록"}
        </h2>

        {sessions.length === 0 ? (
          <Card className="border-zinc-200">
            <CardContent className="py-12 text-center text-zinc-400">
              진행 중인 해커톤이 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessions.map((session) => (
              <Card key={session.id} className="border-zinc-200 hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{session.name}</CardTitle>
                    <Badge
                      variant={
                        session.status === "active"
                          ? "success"
                          : session.status === "closed"
                            ? "warning"
                            : "info"
                      }
                    >
                      {session.status === "active"
                        ? "진행중"
                        : session.status === "closed"
                          ? "마감"
                          : "결과공개"}
                    </Badge>
                  </div>
                  {session.description && (
                    <CardDescription className="line-clamp-2">{session.description}</CardDescription>
                  )}
                  <p className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    마감:{" "}
                    {session.deadline.toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </CardHeader>
                <CardContent className="flex gap-2">
                  {session.status === "active" && (
                    <Button asChild size="sm">
                      <Link href={`/submit/${session.id}`}>
                        제출하기
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/check/${session.id}`}>결과 확인</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
