import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppDb } from "@/db";
import {
  instructorProfile,
  school,
  schoolMember,
  studentProfile,
  vehicle,
} from "@/db/schema";
import { getSessionFn, requireMembershipFn } from "@/lib/auth-guard";

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

export async function writeAudit(
  db: AppDb,
  input: {
    schoolId: string;
    actorMemberId: string | null;
    action: string;
    entity: string;
    entityId: string;
    meta?: Record<string, unknown>;
  },
) {
  const { auditEvent } = await import("@/db/schema");
  await db.insert(auditEvent).values({
    id: crypto.randomUUID(),
    schoolId: input.schoolId,
    actorMemberId: input.actorMemberId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    metaJson: JSON.stringify(input.meta ?? {}),
    createdAt: new Date(),
  });
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "school"
  );
}

export const createSchoolFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2).max(100),
      city: z.string().max(60).optional(),
      phone: z.string().max(20).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionFn();
    if (!session) throw new Error("UNAUTHORIZED");
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    const existing = await db.query.schoolMember.findFirst({
      where: eq(schoolMember.userId, session.user.id),
    });
    if (existing) throw new Error("ALREADY_MEMBER");

    const schoolId = crypto.randomUUID();
    let slug = `${slugify(data.name)}-${schoolId.slice(0, 6)}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const clash = await db.query.school.findFirst({
        where: eq(school.slug, slug),
        columns: { id: true },
      });
      if (!clash) break;
      slug = `${slugify(data.name)}-${crypto.randomUUID().slice(0, 6)}`;
    }
    const memberId = crypto.randomUUID();
    const now = new Date();
    await db.batch([
      db.insert(school).values({
        id: schoolId,
        name: data.name.trim(),
        slug,
        city: data.city?.trim() || null,
        phone: data.phone?.trim() || null,
        status: "active",
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(schoolMember).values({
        id: memberId,
        schoolId,
        userId: session.user.id,
        role: "owner",
        status: "active",
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    await writeAudit(db, {
      schoolId,
      actorMemberId: memberId,
      action: "school.created",
      entity: "school",
      entityId: schoolId,
      meta: { name: data.name },
    });
    return { schoolId };
  });

export interface SchoolPerson {
  profileId: string;
  userId: string;
  name: string;
}

/** Staff-only directory for selects and assignment UI. */
export const listSchoolPeopleFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    students: Array<SchoolPerson & { status: string }>;
    instructors: Array<SchoolPerson & { active: boolean }>;
    vehicles: Array<{ id: string; name: string }>;
  }> => {
    const { role } = await requireMembershipFn();
    if (role !== "owner" && role !== "secretary") {
      throw new Error("FORBIDDEN");
    }
    const membership = await requireMembershipFn();
    const db = await getDb();
    const { eq, and } = await import("drizzle-orm");
    const [students, instructors, vehicles] = await Promise.all([
      db.query.studentProfile.findMany({
        where: eq(studentProfile.schoolId, membership.schoolId),
        columns: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          status: true,
        },
        orderBy: (t, { asc }) => [asc(t.firstName)],
        limit: 500,
      }),
      db.query.instructorProfile.findMany({
        where: and(
          eq(instructorProfile.schoolId, membership.schoolId),
          eq(instructorProfile.active, true),
        ),
        columns: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          active: true,
        },
        orderBy: (t, { asc }) => [asc(t.firstName)],
        limit: 200,
      }),
      db.query.vehicle.findMany({
        where: and(
          eq(vehicle.schoolId, membership.schoolId),
          eq(vehicle.active, true),
        ),
        columns: { id: true, name: true },
        orderBy: (t, { asc }) => [asc(t.name)],
        limit: 100,
      }),
    ]);
    return {
      students: students.map((s) => ({
        profileId: s.id,
        userId: s.userId,
        name: `${s.firstName} ${s.lastName}`,
        status: s.status,
      })),
      instructors: instructors.map((i) => ({
        profileId: i.id,
        userId: i.userId,
        name: `${i.firstName} ${i.lastName}`,
        active: i.active,
      })),
      vehicles: vehicles.map((v) => ({ id: v.id, name: v.name })),
    };
  },
);

export interface OverviewStats {
  schoolName: string;
  role: string;
  students: number;
  instructors: number;
  vehicles: number;
  lessonsToday: number;
  /** Null when the role must not see money (instructors). */
  outstandingMillimes: number | null;
}

export const getOverviewFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<OverviewStats> => {
    const membership = await requireMembershipFn();
    const db = await getDb();
    const { eq, and, gte, lt, sql } = await import("drizzle-orm");
    const { enrollment, lesson, payment, studentProfile } = await import(
      "@/db/schema"
    );
    const { schoolId, role } = membership;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 3600_000);

    async function callerProfileIds() {
      if (role === "instructor") {
        const row = await db.query.instructorProfile.findFirst({
          where: and(
            eq(instructorProfile.schoolId, schoolId),
            eq(instructorProfile.userId, membership.user.id),
          ),
          columns: { id: true },
        });
        return {
          instructorId: row?.id ?? null,
          studentId: null as string | null,
        };
      }
      if (role === "student") {
        const row = await db.query.studentProfile.findFirst({
          where: and(
            eq(studentProfile.schoolId, schoolId),
            eq(studentProfile.userId, membership.user.id),
          ),
          columns: { id: true },
        });
        return {
          instructorId: null as string | null,
          studentId: row?.id ?? null,
        };
      }
      return {
        instructorId: null as string | null,
        studentId: null as string | null,
      };
    }

    const scope = await callerProfileIds();

    const lessonScope =
      role === "owner" || role === "secretary"
        ? and(
            eq(lesson.schoolId, schoolId),
            gte(lesson.startsAt, start),
            lt(lesson.startsAt, end),
          )
        : scope.instructorId
          ? and(
              eq(lesson.schoolId, schoolId),
              eq(lesson.instructorId, scope.instructorId),
              gte(lesson.startsAt, start),
              lt(lesson.startsAt, end),
            )
          : scope.studentId
            ? and(
                eq(lesson.schoolId, schoolId),
                eq(lesson.studentId, scope.studentId),
                gte(lesson.startsAt, start),
                lt(lesson.startsAt, end),
              )
            : eq(lesson.schoolId, "__none__");

    const [students, instructors, vehicles, lessonsToday, money] =
      await Promise.all([
        role === "instructor" && scope.instructorId
          ? db
              .select({ n: sql<number>`count(*)` })
              .from(studentProfile)
              .where(
                and(
                  eq(studentProfile.schoolId, schoolId),
                  eq(studentProfile.assignedInstructorId, scope.instructorId),
                ),
              )
          : db
              .select({ n: sql<number>`count(*)` })
              .from(studentProfile)
              .where(
                role === "student" && scope.studentId
                  ? and(
                      eq(studentProfile.schoolId, schoolId),
                      eq(studentProfile.id, scope.studentId),
                    )
                  : eq(studentProfile.schoolId, schoolId),
              ),
        db
          .select({ n: sql<number>`count(*)` })
          .from(instructorProfile)
          .where(
            and(
              eq(instructorProfile.schoolId, schoolId),
              eq(instructorProfile.active, true),
            ),
          ),
        db
          .select({ n: sql<number>`count(*)` })
          .from(vehicle)
          .where(and(eq(vehicle.schoolId, schoolId), eq(vehicle.active, true))),
        db.select({ n: sql<number>`count(*)` }).from(lesson).where(lessonScope),
        role === "instructor"
          ? { priced: 0, paid: 0, hidden: true as const }
          : db
              .select({
                priced: sql<number>`coalesce(sum(${enrollment.priceMillimes}),0)`,
              })
              .from(enrollment)
              .where(
                role === "student" && scope.studentId
                  ? and(
                      eq(enrollment.schoolId, schoolId),
                      eq(enrollment.studentId, scope.studentId),
                    )
                  : eq(enrollment.schoolId, schoolId),
              )
              .then(async (rows) => {
                const { isNull } = await import("drizzle-orm");
                const paidWhere =
                  role === "student" && scope.studentId
                    ? and(
                        eq(payment.schoolId, schoolId),
                        isNull(payment.voidedAt),
                        eq(enrollment.studentId, scope.studentId),
                      )
                    : and(
                        eq(payment.schoolId, schoolId),
                        isNull(payment.voidedAt),
                      );
                const paid = await db
                  .select({
                    paid: sql<number>`coalesce(sum(${payment.amountMillimes}),0)`,
                  })
                  .from(payment)
                  .innerJoin(
                    enrollment,
                    eq(payment.enrollmentId, enrollment.id),
                  )
                  .where(paidWhere);
                return {
                  priced: rows[0]?.priced ?? 0,
                  paid: paid[0]?.paid ?? 0,
                  hidden: false as const,
                };
              }),
      ]);

    const schoolRow = await db.query.school.findFirst({
      where: eq(school.id, schoolId),
      columns: { name: true },
    });

    return {
      schoolName: schoolRow?.name ?? "",
      role: membership.role,
      students: students[0]?.n ?? 0,
      instructors: role === "student" ? 0 : (instructors[0]?.n ?? 0),
      vehicles: role === "student" ? 0 : (vehicles[0]?.n ?? 0),
      lessonsToday: lessonsToday[0]?.n ?? 0,
      outstandingMillimes: money.hidden
        ? null
        : Math.max(0, money.priced - money.paid),
    };
  },
);
