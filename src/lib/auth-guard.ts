import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SchoolRole } from "@/auth/permissions";
import { roleCan } from "@/auth/permissions";
import { schoolRoles } from "@/db/schema";

const roleSchema = z.enum(schoolRoles);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface MembershipContext {
  user: SessionUser;
  memberId: string;
  schoolId: string;
  role: SchoolRole;
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
    },
  };
}

async function readDb() {
  const [{ createDb }, { env }] = await Promise.all([
    import("@/db/index"),
    import("@/lib/env.server"),
  ]);
  const d1 = (env as unknown as Record<string, unknown>).DB as
    | D1Database
    | undefined;
  if (!d1) throw new Error("Missing D1 binding `DB`.");
  return createDb(d1);
}

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ user: SessionUser } | null> => readSession(),
);

/**
 * School context for the request. The tenant NEVER comes from the client:
 * it is resolved server-side from the session's single membership
 * (UNIQUE(user_id) enforces one school per login in the MVP).
 */
export const getMembershipFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<MembershipContext | null> => {
    const session = await readSession();
    if (!session) return null;
    const db = await readDb();
    const { eq } = await import("drizzle-orm");
    const { schoolMember } = await import("@/db/schema");
    const membership = await db.query.schoolMember.findFirst({
      where: eq(schoolMember.userId, session.user.id),
    });
    if (!membership) return null;
    if (membership.status !== "active") throw new Error("MEMBERSHIP_INACTIVE");
    return {
      user: session.user,
      memberId: membership.id,
      schoolId: membership.schoolId,
      role: membership.role as SchoolRole,
    };
  },
);

export const requireMembershipFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<MembershipContext> => {
    const membership = await getMembershipFn();
    if (!membership) throw new Error("UNAUTHORIZED");
    return membership;
  },
);

export const requireSchoolRoleFn = createServerFn({ method: "GET" })
  .validator(z.object({ roles: z.array(roleSchema).min(1) }))
  .handler(async ({ data }): Promise<MembershipContext> => {
    const membership = await requireMembershipFn();
    if (!(data.roles as Array<string>).includes(membership.role)) {
      throw new Error("FORBIDDEN");
    }
    return membership;
  });

/** Coarse server-side capability check (row scoping stays in each fn). */
export const schoolCanFn = createServerFn({ method: "POST" })
  .validator(z.object({ permission: z.string().min(1) }))
  .handler(async ({ data }): Promise<boolean> => {
    const membership = await requireMembershipFn();
    return roleCan(membership.role, data.permission);
  });
