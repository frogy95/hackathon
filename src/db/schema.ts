import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// 평가 세션
export const evaluationSessions = sqliteTable("evaluation_sessions", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  description: text("description"),
  submissionDeadline: text("submission_deadline").notNull(), // ISO 8601
  criteriaConfig: text("criteria_config"), // JSON 문자열
  resultsPublished: integer("results_published", { mode: "boolean" }).notNull().default(false),
  adminPasswordHash: text("admin_password_hash"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// 제출 상태 enum
export type SubmissionStatus = "submitted" | "collecting" | "evaluating" | "done" | "error";

// 참가자 제출
export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(), // UUID
  sessionId: text("session_id")
    .notNull()
    .references(() => evaluationSessions.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  repoUrl: text("repo_url").notNull(),
  deployUrl: text("deploy_url"),
  submittedAt: text("submitted_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  excluded: integer("excluded", { mode: "boolean" }).notNull().default(false),
  adminNote: text("admin_note"),
  status: text("status").notNull().default("submitted"), // SubmissionStatus
  collectedData: text("collected_data"), // JSON
  screenshots: text("screenshots"), // JSON
  totalScore: real("total_score"),
  baseScore: real("base_score"),
  bonusScore: real("bonus_score"),
  jobRole: text("job_role").notNull().default("개발"), // "PM/기획" | "디자인" | "개발" | "QA"
  checkPassword: text("check_password").notNull().default("0000"), // 숫자 4자리
  errorMessage: text("error_message"), // 평가 오류 메시지 (nullable)
  editCount: integer("edit_count").notNull().default(0), // 수정&재평가 요청 횟수
});

// 행운상 추첨 이력
export const luckyDraws = sqliteTable("lucky_draws", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => evaluationSessions.id),
  settings: text("settings").notNull(), // JSON: LuckyDrawSettings
  winners: text("winners").notNull(),   // JSON: LuckyDrawWinner[]
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// 항목별 점수
export const scores = sqliteTable("scores", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id")
    .notNull()
    .references(() => submissions.id),
  criteriaKey: text("criteria_key").notNull(),
  score: real("score").notNull(),
  maxScore: real("max_score").notNull(),
  reasoning: text("reasoning"),
});
