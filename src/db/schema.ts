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
export type SubmissionStatus = "submitted" | "evaluating" | "done" | "error";

// 참가자 제출
export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(), // UUID
  sessionId: text("session_id")
    .notNull()
    .references(() => evaluationSessions.id),
  name: text("name").notNull(),
  employeeId: text("employee_id").notNull(),
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
