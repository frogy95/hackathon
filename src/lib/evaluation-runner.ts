// 일괄 평가 오케스트레이터 (동시성 제한 + 진행률 추적)
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { collectGitHubData } from "./github-collector";
import { evaluateWithAI, saveEvaluationResult } from "./ai-evaluator";

// 인메모리 진행률 맵 (sessionId → 진행 상태)
// 주의: 멀티 프로세스 환경에서는 DB 폴링으로 대체됨
const progressMap = new Map<string, { total: number; done: number; failed: number }>();

export function getProgress(sessionId: string) {
  return progressMap.get(sessionId) ?? null;
}

// 동시성 제한 유틸리티
async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  const queue = [...tasks];
  let active = 0;

  return new Promise((resolve) => {
    function next() {
      if (queue.length === 0 && active === 0) {
        resolve(results);
        return;
      }
      while (active < limit && queue.length > 0) {
        const task = queue.shift()!;
        active++;
        task().then(
          (value) => {
            results.push({ status: "fulfilled", value });
            active--;
            next();
          },
          (reason) => {
            results.push({ status: "rejected", reason });
            active--;
            next();
          }
        );
      }
    }
    next();
  });
}

// 단건 평가 (수집 → AI 평가 → DB 저장)
export async function evaluateSingle(submissionId: string): Promise<void> {
  const submission = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .then((r) => r[0]);

  if (!submission) {
    throw new Error(`제출을 찾을 수 없습니다: ${submissionId}`);
  }

  const now = new Date().toISOString();

  try {
    // 수집 단계
    await db
      .update(submissions)
      .set({ status: "collecting", updatedAt: now })
      .where(eq(submissions.id, submissionId));

    const collectedData = await collectGitHubData(submission.repoUrl);

    await db
      .update(submissions)
      .set({
        collectedData: JSON.stringify(collectedData),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(submissions.id, submissionId));

    // AI 평가 단계
    await db
      .update(submissions)
      .set({ status: "evaluating", updatedAt: new Date().toISOString() })
      .where(eq(submissions.id, submissionId));

    const hasDeployUrl = !!submission.deployUrl;
    const result = await evaluateWithAI(collectedData, hasDeployUrl);

    await saveEvaluationResult(submissionId, result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[평가 오류] ${submissionId}: ${message}`);

    await db
      .update(submissions)
      .set({
        status: "error",
        adminNote: `평가 오류: ${message}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(submissions.id, submissionId));

    throw error;
  }
}

// 세션 전체 일괄 평가 실행
export async function runEvaluation(sessionId: string): Promise<void> {
  // 비제외 + 미완료 제출 목록 조회
  const pendingSubmissions = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.sessionId, sessionId),
        eq(submissions.excluded, false)
      )
    );

  // 이미 완료된 건은 건너뜀
  const targets = pendingSubmissions.filter((s) => s.status !== "done");

  if (targets.length === 0) {
    console.log(`[평가] 세션 ${sessionId}: 평가할 제출이 없습니다.`);
    return;
  }

  progressMap.set(sessionId, { total: targets.length, done: 0, failed: 0 });
  console.log(`[평가] 세션 ${sessionId}: ${targets.length}건 평가 시작`);

  const tasks = targets.map((sub) => async () => {
    try {
      await evaluateSingle(sub.id);
      const current = progressMap.get(sessionId)!;
      progressMap.set(sessionId, { ...current, done: current.done + 1 });
    } catch {
      const current = progressMap.get(sessionId)!;
      progressMap.set(sessionId, { ...current, failed: current.failed + 1 });
      throw new Error(`제출 ${sub.id} 평가 실패`);
    }
  });

  // 동시성 3개 제한
  await withConcurrencyLimit(tasks, 3);

  const final = progressMap.get(sessionId);
  console.log(`[평가] 세션 ${sessionId} 완료: ${final?.done}성공 / ${final?.failed}실패`);
}
