import { env as cfEnv } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

function resolveEnv(overrides?: Partial<AuthEnv>): AuthEnv {
  const cf = (cfEnv ?? {}) as unknown as Record<string, unknown>;
  return {
    DB: (overrides?.DB ?? cf.DB) as D1Database,
    BETTER_AUTH_SECRET:
      overrides?.BETTER_AUTH_SECRET ??
      (cf.BETTER_AUTH_SECRET as string | undefined),
    BETTER_AUTH_URL:
      overrides?.BETTER_AUTH_URL ?? (cf.BETTER_AUTH_URL as string | undefined),
    GOOGLE_CLIENT_ID:
      overrides?.GOOGLE_CLIENT_ID ??
      (cf.GOOGLE_CLIENT_ID as string | undefined),
    GOOGLE_CLIENT_SECRET:
      overrides?.GOOGLE_CLIENT_SECRET ??
      (cf.GOOGLE_CLIENT_SECRET as string | undefined),
  };
}

/**
 * Per-request auth factory. D1 bindings only exist inside a request
 * handler on Workers, so never initialize Better Auth at module scope.
 *
 * School roles (owner/secretary/instructor/student) live in
 * school_member — NOT in Better Auth. The admin plugin is intentionally
 * absent: user management happens through school memberships.
 */
export function createAuth(overrides?: Partial<AuthEnv>) {
  const env = resolveEnv(overrides);
  if (!env.DB) {
    throw new Error(
      "Missing D1 binding `DB`. Check wrangler.jsonc and dev bindings.",
    );
  }

  const googleConfigured = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
  );

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: "sqlite",
    }),
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    socialProviders: googleConfigured
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string,
          },
        }
      : undefined,
    plugins: [tanstackStartCookies()],
  });
}

export type AppAuth = ReturnType<typeof createAuth>;
