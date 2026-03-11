// 일괄 평가 오케스트레이터 (동시성 제한)
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { collectGitHubData } from "./github-collector";
import { evaluateWithAI, saveEvaluationResult } from "./ai-evaluator";
import { sendEvaluationResultEmail } from "./email-sender";

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
export async function evaluateSingle(submissionId: string, model?: string): Promise<void> {
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
    // 직군 정보를 읽어 직군별 평가 기준 적용
    const jobRole = (submission.jobRole ?? "개발") as import("@/types").JobRole;
    const result = await evaluateWithAI(collectedData, hasDeployUrl, jobRole, model);

    await saveEvaluationResult(submissionId, result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[평가 오류] ${submissionId}: ${message}`);

    await db
      .update(submissions)
      .set({
        status: "error",
        errorMessage: message,
        adminNote: `평가 오류: ${message}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(submissions.id, submissionId));

    throw error;
  }
}

// 단건 평가 후 이메일 발송 (자동/재평가/일괄 평가 공통)
export async function evaluateAndNotify(submissionId: string, model?: string): Promise<void> {
  // 평가 에러는 호출자로 그대로 전파
  await evaluateSingle(submissionId, model);

  // 이메일 발송 (실패해도 평가 결과에 영향 없음)
  try {
    const submission = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .then((r) => r[0]);

    if (submission && submission.status === "done") {
      await sendEvaluationResultEmail({
        to: submission.email,
        name: submission.name,
        totalScore: submission.totalScore ?? 0,
        baseScore: submission.baseScore ?? 0,
        jobRole: (submission.jobRole ?? "개발") as import("@/types").JobRole,
        sessionId: submission.sessionId,
        submittedAt: submission.submittedAt,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[이메일 발송 오류] ${submissionId}: ${message}`);
  }
}

// 세션 전체 일괄 평가 실행 (done 제외)
export async function runEvaluation(sessionId: string, model?: string): Promise<void> {
  // 비제외 + done이 아닌 제출 목록 조회
  const pendingSubmissions = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.sessionId, sessionId),
        eq(submissions.excluded, false)
      )
    );

  const targets = pendingSubmissions.filter((s) => s.status !== "done");

  if (targets.length === 0) {
    console.log(`[평가] 세션 ${sessionId}: 평가할 제출이 없습니다.`);
    return;
  }

  console.log(`[평가] 세션 ${sessionId}: ${targets.length}건 평가 시작 (모델: ${model ?? "기본"})`);

  const tasks = targets.map((sub) => async () => {
    await evaluateAndNotify(sub.id, model);
  });

  // 동시성 3개 제한
  const results = await withConcurrencyLimit(tasks, 3);

  const failed = results.filter((r) => r.status === "rejected").length;
  const succeeded = results.length - failed;
  console.log(`[평가] 세션 ${sessionId} 완료: ${succeeded}성공 / ${failed}실패`);
}
