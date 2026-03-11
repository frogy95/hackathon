import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./hackathon.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
