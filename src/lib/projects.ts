import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireRoleFn, requireSessionFn } from "@/lib/auth-guard";

const createProjectInput = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

async function getDb() {
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

export const listProjectsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSessionFn();
    const db = await getDb();
    return db.query.project.findMany({
      with: { owner: { columns: { id: true, name: true, email: true } } },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 50,
    });
  },
);

export const createProjectFn = createServerFn({ method: "POST" })
  .validator(createProjectInput)
  .handler(async ({ data }) => {
    // user + manager + admin can create
    const { user } = await requireRoleFn({
      data: { roles: ["user", "manager", "admin"] },
    });
    const [{ project }] = await Promise.all([import("@/db/schema")]);
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.insert(project).values({
      id,
      name: data.name,
      description: data.description ?? null,
      ownerId: user.id,
    });
    return { id };
  });

export const deleteProjectFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    // Only admins can delete — the core RBAC demo
    await requireRoleFn({ data: { roles: ["admin"] } });
    const [{ project }] = await Promise.all([import("@/db/schema")]);
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    await db.delete(project).where(eq(project.id, data.id));
    return { ok: true };
  });
