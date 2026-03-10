import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { evaluationSessions, submissions, scores } from "@/db/schema";
import { apiError, ErrorCode, withAdminAuth } from "@/lib/api-utils";

interface Context {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id]/export/csv — CSV 내보내기 (관리자 전용)
export const GET = withAdminAuth(async (request: NextRequest, context: unknown) => {
  const { id: sessionId } = await (context as Context).params;

  const session = await db
    .select()
    .from(evaluationSessions)
    .where(eq(evaluationSessions.id, sessionId))
    .then((r) => r[0]);

  if (!session) {
    return apiError(ErrorCode.NOT_FOUND.code, "세션을 찾을 수 없습니다.", ErrorCode.NOT_FOUND.status);
  }

  const { searchParams } = new URL(request.url);
  const includeExcluded = searchParams.get("includeExcluded") === "true";

  const conditions = [eq(submissions.sessionId, sessionId)];
  if (!includeExcluded) {
    conditions.push(eq(submissions.excluded, false));
  }

  const subs = await db
    .select()
    .from(submissions)
    .where(and(...conditions))
    .orderBy(submissions.submittedAt);

  // 항목별 점수 조회
  const subIds = subs.map((s) => s.id);
  const allScores =
    subIds.length > 0
      ? await db.select().from(scores).where(inArray(scores.submissionId, subIds))
      : [];

  // submissionId → criteriaKey → score 맵
  const scoreMap = new Map<string, Map<string, number>>();
  for (const sc of allScores) {
    if (!scoreMap.has(sc.submissionId)) scoreMap.set(sc.submissionId, new Map());
    scoreMap.get(sc.submissionId)!.set(sc.criteriaKey, sc.score);
  }

  // CSV 헤더
  const headers = [
    "이름",
    "이메일",
    "GitHub URL",
    "배포 URL",
    "상태",
    "총점",
    "기본점",
    "보너스점",
    "documentation",
    "implementation",
    "ux",
    "idea",
    "제출일시",
    "제외여부",
    "관리자메모",
  ];

  // CSV 행 생성 (특수문자 이스케이프)
  const escape = (val: string | null | undefined) => {
    if (val == null) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = subs.map((s) => {
    const criteriaScores = scoreMap.get(s.id) ?? new Map();
    return [
      escape(s.name),
      escape(s.email),
      escape(s.repoUrl),
      escape(s.deployUrl),
      escape(s.status),
      escape(s.totalScore?.toString()),
      escape(s.baseScore?.toString()),
      escape(s.bonusScore?.toString()),
      escape(criteriaScores.get("documentation")?.toString()),
      escape(criteriaScores.get("implementation")?.toString()),
      escape(criteriaScores.get("ux")?.toString()),
      escape(criteriaScores.get("idea")?.toString()),
      escape(s.submittedAt),
      escape(s.excluded ? "제외" : ""),
      escape(s.adminNote),
    ].join(",");
  });

  // BOM + 헤더 + 데이터
  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=submissions-${sessionId}.csv`,
    },
  });
});
