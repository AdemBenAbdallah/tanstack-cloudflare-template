import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lesson, lessonKinds, lessonStatuses } from "@/db/schema";
import { requireRoleFn } from "@/lib/auth-guard";

const STAFF = ["admin", "manager"] as const;

const lessonInput = z.object({
  studentId: z.string().min(1),
  instructorId: z.string().min(1),
  vehicle: z.string().max(60).optional(),
  kind: z.enum(lessonKinds).default("practice"),
  status: z.enum(lessonStatuses).default("scheduled"),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  notes: z.string().max(500).optional(),
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

export const listLessonsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireRoleFn({ data: { roles: [...STAFF] } });
    const db = await getDb();
    return db.query.lesson.findMany({
      with: {
        student: { columns: { id: true, name: true, email: true } },
        instructor: { columns: { id: true, name: true, email: true } },
      },
      orderBy: (t, { asc }) => [asc(t.startsAt)],
      limit: 500,
    });
  },
);

export const listUsersFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireRoleFn({ data: { roles: [...STAFF] } });
    const db = await getDb();
    return db.query.user.findMany({
      columns: { id: true, name: true, email: true, role: true },
      orderBy: (t, { asc }) => [asc(t.name)],
      limit: 200,
    });
  },
);

export const createLessonFn = createServerFn({ method: "POST" })
  .validator(lessonInput)
  .handler(async ({ data }) => {
    await requireRoleFn({ data: { roles: [...STAFF] } });
    const { eq } = await import("drizzle-orm");
    const [{ user: userTable }] = await Promise.all([import("@/db/schema")]);
    const db = await getDb();
    const [student, instructor] = await Promise.all([
      db.query.user.findFirst({ where: eq(userTable.id, data.studentId) }),
      db.query.user.findFirst({ where: eq(userTable.id, data.instructorId) }),
    ]);
    if (!student || !instructor) throw new Error("UNKNOWN_USER");
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new Error("INVALID_DATE");
    }
    if (endsAt <= startsAt) throw new Error("END_BEFORE_START");
    const id = crypto.randomUUID();
    await db.insert(lesson).values({
      id,
      studentId: data.studentId,
      instructorId: data.instructorId,
      vehicle: data.vehicle?.trim() || null,
      kind: data.kind,
      status: data.status,
      startsAt,
      endsAt,
      notes: data.notes?.trim() || null,
    });
    return { id };
  });

export const updateLessonFn = createServerFn({ method: "POST" })
  .validator(lessonInput.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireRoleFn({ data: { roles: [...STAFF] } });
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      endsAt <= startsAt
    ) {
      throw new Error("INVALID_DATE");
    }
    await db
      .update(lesson)
      .set({
        studentId: data.studentId,
        instructorId: data.instructorId,
        vehicle: data.vehicle?.trim() || null,
        kind: data.kind,
        status: data.status,
        startsAt,
        endsAt,
        notes: data.notes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(lesson.id, data.id));
    return { id: data.id };
  });

export const deleteLessonFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireRoleFn({ data: { roles: [...STAFF] } });
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    await db.delete(lesson).where(eq(lesson.id, data.id));
    return { ok: true };
  });
