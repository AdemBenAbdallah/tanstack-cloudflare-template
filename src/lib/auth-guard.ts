import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { Role } from "@/auth/permissions";

const roleSchema = z.enum(["user", "manager", "admin"]);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

async function readSession(): Promise<{ user: SessionUser } | null> {
  // Server-only modules are lazily imported so the client stub of this
  // server-function module never references `cloudflare:workers`.
  const { createAuth } = await import("@/auth/auth.server");
  const cookie = getRequestHeader("cookie") ?? "";
  const auth = createAuth();
  const result = await auth.api.getSession({
    headers: new Headers({ cookie }),
  });
  if (!result?.user) return null;
  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: (result.user as { role?: string }).role ?? "user",
    },
  };
}

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ user: SessionUser } | null> => readSession(),
);

export const requireSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ user: SessionUser }> => {
    const session = await readSession();
    if (!session) throw new Error("UNAUTHORIZED");
    return session;
  },
);

export const requireRoleFn = createServerFn({ method: "GET" })
  .validator(z.object({ roles: z.array(roleSchema).min(1) }))
  .handler(async ({ data }): Promise<{ user: SessionUser }> => {
    const session = await readSession();
    if (!session) throw new Error("UNAUTHORIZED");
    if (!(data.roles as Array<string>).includes(session.user.role)) {
      throw new Error("FORBIDDEN");
    }
    return session;
  });

export const userHasPermissionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      role: roleSchema,
      permissions: z.record(z.string(), z.array(z.string())),
    }),
  )
  .handler(async ({ data }): Promise<boolean> => {
    const { createAuth } = await import("@/auth/auth.server");
    const auth = createAuth();
    const input: { role: Role; permissions: Record<string, Array<string>> } =
      data;
    const res = await auth.api.userHasPermission({
      body: { role: input.role, permissions: input.permissions },
    });
    return Boolean(res);
  });
