import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppDb } from "@/db";
import {
  instructorProfile,
  lesson,
  lessonKinds,
  lessonStatuses,
  studentProfile,
  vehicle as vehicleTable,
} from "@/db/schema";
import type { MembershipContext } from "@/lib/auth-guard";
import { requireMembershipFn, requireSchoolRoleFn } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/school";

const STAFF = ["owner", "secretary"] as const;

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

const lessonInput = z.object({
  studentId: z.string().min(1),
  instructorId: z.string().min(1),
  vehicleId: z.string().min(1).optional(),
  kind: z.enum(lessonKinds),
  status: z.enum(lessonStatuses).default("scheduled"),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export type LessonInput = z.infer<typeof lessonInput>;

function toDates(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("INVALID_DATE");
  }
  if (end <= start) throw new Error("END_BEFORE_START");
  return { start, end };
}

/**
 * Application-level overlap check (good UX: friendly error before write).
 * The DB trigger remains the final consistency layer for races.
 * Mirrors the trigger rule: cancelled never blocks; a cancelled/no-show
 * NEW row is historical bookkeeping and never conflicts.
 */
export async function findOverlap(
  db: AppDb,
  schoolId: string,
  input: {
    instructorId?: string | null;
    vehicleId?: string | null;
    startsAt: Date;
    endsAt: Date;
    status: string;
    excludeId?: string;
  },
): Promise<string | null> {
  if (input.status === "cancelled" || input.status === "no_show") return null;
  const { and, eq, lt, gt, ne, notInArray } = await import("drizzle-orm");
  const conditions = [
    eq(lesson.schoolId, schoolId),
    notInArray(lesson.status, ["cancelled"]),
    lt(lesson.startsAt, input.endsAt),
    gt(lesson.endsAt, input.startsAt),
  ];
  if (input.excludeId) conditions.push(ne(lesson.id, input.excludeId));
  const rows = await db.query.lesson.findMany({
    where: and(...conditions),
    columns: { id: true, instructorId: true, vehicleId: true },
    limit: 50,
  });
  const hit = rows.find(
    (r) =>
      (input.instructorId && r.instructorId === input.instructorId) ||
      (input.vehicleId &&
        r.vehicleId !== null &&
        r.vehicleId === input.vehicleId),
  );
  return hit ? hit.id : null;
}

async function assertProfilesInSchool(
  db: AppDb,
  schoolId: string,
  studentId: string,
  instructorId: string,
  vehicleId?: string,
) {
  const { and, eq } = await import("drizzle-orm");
  const [student, instructor, vehicleRow] = await Promise.all([
    db.query.studentProfile.findFirst({
      where: and(
        eq(studentProfile.schoolId, schoolId),
        eq(studentProfile.id, studentId),
      ),
      columns: { id: true },
    }),
    db.query.instructorProfile.findFirst({
      where: and(
        eq(instructorProfile.schoolId, schoolId),
        eq(instructorProfile.id, instructorId),
      ),
      columns: { id: true },
    }),
    vehicleId
      ? db.query.vehicle.findFirst({
          where: and(
            eq(vehicleTable.schoolId, schoolId),
            eq(vehicleTable.id, vehicleId),
          ),
          columns: { id: true },
        })
      : null,
  ]);
  if (!student || !instructor || (vehicleId && !vehicleRow)) {
    throw new Error("UNKNOWN_ENTITY");
  }
}

async function callerInstructorId(
  db: AppDb,
  membership: MembershipContext,
): Promise<string | null> {
  if (membership.role !== "instructor") return null;
  const { and, eq } = await import("drizzle-orm");
  const row = await db.query.instructorProfile.findFirst({
    where: and(
      eq(instructorProfile.schoolId, membership.schoolId),
      eq(instructorProfile.userId, membership.user.id),
    ),
    columns: { id: true },
  });
  return row?.id ?? null;
}

async function callerStudentId(
  db: AppDb,
  membership: MembershipContext,
): Promise<string | null> {
  if (membership.role !== "student") return null;
  const { and, eq } = await import("drizzle-orm");
  const row = await db.query.studentProfile.findFirst({
    where: and(
      eq(studentProfile.schoolId, membership.schoolId),
      eq(studentProfile.userId, membership.user.id),
    ),
    columns: { id: true },
  });
  return row?.id ?? null;
}

export const listLessonsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const membership = await requireMembershipFn();
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");

    const scoped =
      membership.role === "instructor"
        ? { instructorId: await callerInstructorId(db, membership) }
        : membership.role === "student"
          ? { studentId: await callerStudentId(db, membership) }
          : null;
    if (
      (membership.role === "instructor" && !scoped?.instructorId) ||
      (membership.role === "student" && !scoped?.studentId)
    ) {
      return [];
    }

    return db.query.lesson.findMany({
      where: and(
        eq(lesson.schoolId, membership.schoolId),
        ...(scoped?.instructorId
          ? [eq(lesson.instructorId, scoped.instructorId)]
          : []),
        ...(scoped?.studentId ? [eq(lesson.studentId, scoped.studentId)] : []),
      ),
      with: {
        student: { columns: { id: true, firstName: true, lastName: true } },
        instructor: { columns: { id: true, firstName: true, lastName: true } },
        vehicle: { columns: { id: true, name: true } },
      },
      orderBy: (t, { asc }) => [asc(t.startsAt)],
      limit: 500,
    });
  },
);

export const createLessonFn = createServerFn({ method: "POST" })
  .validator(lessonInput)
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    await assertProfilesInSchool(
      db,
      membership.schoolId,
      data.studentId,
      data.instructorId,
      data.vehicleId,
    );
    const { start, end } = toDates(data.startsAt, data.endsAt);
    const conflict = await findOverlap(db, membership.schoolId, {
      instructorId: data.instructorId,
      vehicleId: data.vehicleId ?? null,
      startsAt: start,
      endsAt: end,
      status: data.status,
    });
    if (conflict) throw new Error("OVERLAP_CONFLICT");

    const id = crypto.randomUUID();
    const now = new Date();
    await db.batch([
      db.insert(lesson).values({
        id,
        schoolId: membership.schoolId,
        studentId: data.studentId,
        instructorId: data.instructorId,
        vehicleId: data.vehicleId ?? null,
        kind: data.kind,
        status: data.status,
        startsAt: start,
        endsAt: end,
        notes: data.notes?.trim() || null,
        createdByMemberId: membership.memberId,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "lesson.created",
      entity: "lesson",
      entityId: id,
      meta: { kind: data.kind, startsAt: data.startsAt },
    });
    return { id };
  });

export const updateLessonFn = createServerFn({ method: "POST" })
  .validator(lessonInput.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const membership = await requireMembershipFn();
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const existing = await db.query.lesson.findFirst({
      where: and(
        eq(lesson.id, data.id),
        eq(lesson.schoolId, membership.schoolId),
      ),
    });
    if (!existing) throw new Error("NOT_FOUND");

    const isStaff =
      membership.role === "owner" || membership.role === "secretary";
    if (!isStaff) {
      if (membership.role !== "instructor") throw new Error("FORBIDDEN");
      const ownId = await callerInstructorId(db, membership);
      if (!ownId || existing.instructorId !== ownId) {
        throw new Error("FORBIDDEN");
      }
      // Instructors may move/complete/annotate their own lessons, but not
      // reassign the student, instructor, or kind.
      if (
        data.studentId !== existing.studentId ||
        data.instructorId !== existing.instructorId ||
        data.kind !== existing.kind
      ) {
        throw new Error("FORBIDDEN");
      }
    } else {
      await assertProfilesInSchool(
        db,
        membership.schoolId,
        data.studentId,
        data.instructorId,
        data.vehicleId,
      );
    }

    const { start, end } = toDates(data.startsAt, data.endsAt);
    const conflict = await findOverlap(db, membership.schoolId, {
      instructorId: data.instructorId,
      vehicleId: data.vehicleId ?? null,
      startsAt: start,
      endsAt: end,
      status: data.status,
      excludeId: data.id,
    });
    if (conflict) throw new Error("OVERLAP_CONFLICT");

    const wasStatus = existing.status;
    await db.batch([
      db
        .update(lesson)
        .set({
          studentId: data.studentId,
          instructorId: data.instructorId,
          vehicleId: data.vehicleId ?? null,
          kind: data.kind,
          status: data.status,
          startsAt: start,
          endsAt: end,
          notes: data.notes?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(lesson.id, data.id)),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action:
        wasStatus !== data.status
          ? `lesson.status:${data.status}`
          : "lesson.updated",
      entity: "lesson",
      entityId: data.id,
      meta: { from: wasStatus, to: data.status },
    });
    return { id: data.id };
  });

export const deleteLessonFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const existing = await db.query.lesson.findFirst({
      where: and(
        eq(lesson.id, data.id),
        eq(lesson.schoolId, membership.schoolId),
      ),
      columns: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    await db.batch([db.delete(lesson).where(eq(lesson.id, data.id))]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "lesson.deleted",
      entity: "lesson",
      entityId: data.id,
    });
    return { ok: true };
  });
