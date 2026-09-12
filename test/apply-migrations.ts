import { applyD1Migrations, env } from "cloudflare:test";
import type { D1Migration } from "@cloudflare/vitest-plugin";
import { beforeAll } from "vitest";

beforeAll(async () => {
  const e = env as unknown as Record<string, unknown>;
  const db = e.DB as D1Database | undefined;
  const migrations = e.TEST_MIGRATIONS as Array<D1Migration> | undefined;
  if (!db) throw new Error("Missing D1 binding `DB` in test environment.");
  if (!migrations) {
    throw new Error("Missing `TEST_MIGRATIONS` binding in test environment.");
  }
  await applyD1Migrations(db, migrations);
});
