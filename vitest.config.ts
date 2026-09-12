import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(
        `${import.meta.dirname}/drizzle`,
      );
      return {
        miniflare: {
          // Ephemeral in-memory D1 for tests (overrides wrangler.jsonc,
          // whose database_id is a placeholder until real D1s are created).
          d1Databases: ["DB"],
          bindings: { TEST_MIGRATIONS: migrations },
        },
      };
    }),
  ],
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
