import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = process.env.DATABASE_URL ?? "./hackathon.db";

const sqlite = new Database(path.resolve(DB_PATH));

// WAL 모드 활성화 (성능 향상)
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
export { sqlite };
