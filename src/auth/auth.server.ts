import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { createDb } from "@/db/index";
import { env } from "@/lib/env.server";
import { ac, admin, manager, user } from "./permissions";

/**
 * Per-request auth factory. D1 bindings only exist inside a request
 * handler on Workers, so never initialize Better Auth at module scope.
 * Server-only (`.server.ts`) — never import from client components.
 */
export function createAuth() {
  const e = env as unknown as Record<string, unknown>;
  const d1 = e.DB as D1Database | undefined;
  if (!d1) {
    throw new Error(
      "Missing D1 binding `DB`. Check wrangler.jsonc and dev bindings.",
    );
  }

  const clientId = e.GOOGLE_CLIENT_ID as string | undefined;
  const clientSecret = e.GOOGLE_CLIENT_SECRET as string | undefined;

  return betterAuth({
    secret: e.BETTER_AUTH_SECRET as string | undefined,
    baseURL: e.BETTER_AUTH_URL as string | undefined,
    database: drizzleAdapter(createDb(d1), { provider: "sqlite" }),
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    socialProviders:
      clientId && clientSecret
        ? { google: { clientId, clientSecret } }
        : undefined,
    plugins: [
      adminPlugin({
        ac,
        roles: { user, manager, admin },
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
      tanstackStartCookies(),
    ],
  });
}

export type AppAuth = ReturnType<typeof createAuth>;
