import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  enrollment,
  exam,
  examStatuses,
  examTypes,
  packageEntity,
  payment,
  paymentMethods,
} from "@/db/schema";
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

const packageInput = z.object({
  name: z.string().min(2).max(80),
  drivingMinutes: z.number().int().min(0).max(60000),
  parkingSessions: z.number().int().min(0).max(1000),
  theoryMinutes: z.number().int().min(0).max(60000),
  examDriveAttempts: z.number().int().min(0).max(100),
  examParkingAttempts: z.number().int().min(0).max(100),
  priceMillimes: z.number().int().min(0),
  active: z.boolean().default(true),
});

export const listPackagesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    return db.query.packageEntity.findMany({
      where: eq(packageEntity.schoolId, membership.schoolId),
      orderBy: (t, { asc }) => [asc(t.name)],
      limit: 100,
    });
  },
);

export const createPackageFn = createServerFn({ method: "POST" })
  .validator(packageInput)
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: ["owner"] },
    });
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date();
    await db.batch([
      db.insert(packageEntity).values({
        id,
        schoolId: membership.schoolId,
        name: data.name.trim(),
        drivingMinutes: data.drivingMinutes,
        parkingSessions: data.parkingSessions,
        theoryMinutes: data.theoryMinutes,
        examDriveAttempts: data.examDriveAttempts,
        examParkingAttempts: data.examParkingAttempts,
        priceMillimes: data.priceMillimes,
        active: data.active,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "package.created",
      entity: "package",
      entityId: id,
    });
    return { id };
  });

export const updatePackageFn = createServerFn({ method: "POST" })
  .validator(packageInput.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: ["owner"] },
    });
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const existing = await db.query.packageEntity.findFirst({
      where: and(
        eq(packageEntity.id, data.id),
        eq(packageEntity.schoolId, membership.schoolId),
      ),
      columns: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    await db.batch([
      db
        .update(packageEntity)
        .set({
          name: data.name.trim(),
          drivingMinutes: data.drivingMinutes,
          parkingSessions: data.parkingSessions,
          theoryMinutes: data.theoryMinutes,
          examDriveAttempts: data.examDriveAttempts,
          examParkingAttempts: data.examParkingAttempts,
          priceMillimes: data.priceMillimes,
          active: data.active,
          updatedAt: new Date(),
        })
        .where(eq(packageEntity.id, data.id)),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "package.updated",
      entity: "package",
      entityId: data.id,
    });
    return { id: data.id };
  });

export const createEnrollmentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ studentId: z.string().min(1), packageId: z.string().min(1) }),
  )
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const { studentProfile } = await import("@/db/schema");
    const [student, pkg] = await Promise.all([
      db.query.studentProfile.findFirst({
        where: and(
          eq(studentProfile.id, data.studentId),
          eq(studentProfile.schoolId, membership.schoolId),
        ),
        columns: { id: true },
      }),
      db.query.packageEntity.findFirst({
        where: and(
          eq(packageEntity.id, data.packageId),
          eq(packageEntity.schoolId, membership.schoolId),
        ),
      }),
    ]);
    if (!student) throw new Error("UNKNOWN_STUDENT");
    if (pkg?.active !== true) throw new Error("UNKNOWN_PACKAGE");
    const active = await db.query.enrollment.findFirst({
      where: and(
        eq(enrollment.studentId, data.studentId),
        eq(enrollment.schoolId, membership.schoolId),
        eq(enrollment.status, "active"),
      ),
      columns: { id: true },
    });
    if (active) throw new Error("ALREADY_ENROLLED");

    const id = crypto.randomUUID();
    const now = new Date();
    await db.batch([
      db.insert(enrollment).values({
        id,
        schoolId: membership.schoolId,
        studentId: data.studentId,
        packageId: data.packageId,
        drivingMinutes: pkg.drivingMinutes,
        parkingSessions: pkg.parkingSessions,
        theoryMinutes: pkg.theoryMinutes,
        examDriveAttempts: pkg.examDriveAttempts,
        examParkingAttempts: pkg.examParkingAttempts,
        priceMillimes: pkg.priceMillimes,
        status: "active",
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "enrollment.created",
      entity: "enrollment",
      entityId: id,
      meta: { studentId: data.studentId, packageId: data.packageId },
    });
    return { id };
  });

export const recordPaymentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      enrollmentId: z.string().min(1),
      amountMillimes: z.number().int().positive().max(100_000_000),
      method: z.enum(paymentMethods).default("cash"),
      note: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const existing = await db.query.enrollment.findFirst({
      where: and(
        eq(enrollment.id, data.enrollmentId),
        eq(enrollment.schoolId, membership.schoolId),
      ),
      columns: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    const id = crypto.randomUUID();
    const now = new Date();
    await db.batch([
      db.insert(payment).values({
        id,
        schoolId: membership.schoolId,
        enrollmentId: data.enrollmentId,
        amountMillimes: data.amountMillimes,
        method: data.method,
        receivedByMemberId: membership.memberId,
        note: data.note?.trim() || null,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "payment.created",
      entity: "payment",
      entityId: id,
      meta: { amountMillimes: data.amountMillimes, method: data.method },
    });
    return { id };
  });

export const voidPaymentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ id: z.string().min(1), reason: z.string().min(2).max(200) }),
  )
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: ["owner"] },
    });
    const db = await getDb();
    const { and, eq, isNull } = await import("drizzle-orm");
    const existing = await db.query.payment.findFirst({
      where: and(
        eq(payment.id, data.id),
        eq(payment.schoolId, membership.schoolId),
        isNull(payment.voidedAt),
      ),
      columns: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    await db.batch([
      db
        .update(payment)
        .set({
          voidedAt: new Date(),
          voidReason: data.reason.trim(),
          updatedAt: new Date(),
        })
        .where(eq(payment.id, data.id)),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "payment.voided",
      entity: "payment",
      entityId: data.id,
      meta: { reason: data.reason },
    });
    return { ok: true };
  });

export interface StudentProgress {
  enrollmentId: string | null;
  packageName: string | null;
  priceMillimes: number;
  paidMillimes: number;
  balanceMillimes: number;
  driving: { included: number; used: number; remaining: number };
  parking: { included: number; used: number; remaining: number };
  theory: { included: number; used: number; remaining: number };
  examDrive: { included: number; used: number; remaining: number };
  examParking: { included: number; used: number; remaining: number };
}

const EMPTY_PROGRESS: StudentProgress = {
  enrollmentId: null,
  packageName: null,
  priceMillimes: 0,
  paidMillimes: 0,
  balanceMillimes: 0,
  driving: { included: 0, used: 0, remaining: 0 },
  parking: { included: 0, used: 0, remaining: 0 },
  theory: { included: 0, used: 0, remaining: 0 },
  examDrive: { included: 0, used: 0, remaining: 0 },
  examParking: { included: 0, used: 0, remaining: 0 },
};

/** Progress derived purely from lesson + payment records. Nothing stored. */
export const getStudentProgressFn = createServerFn({ method: "POST" })
  .validator(z.object({ studentId: z.string().min(1) }))
  .handler(async ({ data }): Promise<StudentProgress> => {
    const membership = await requireMembershipFn();
    const db = await getDb();
    const { and, eq, isNull } = await import("drizzle-orm");
    const { lesson, studentProfile } = await import("@/db/schema");

    const student = await db.query.studentProfile.findFirst({
      where: and(
        eq(studentProfile.id, data.studentId),
        eq(studentProfile.schoolId, membership.schoolId),
      ),
      columns: { id: true, userId: true },
    });
    if (!student) throw new Error("NOT_FOUND");

    // Row scoping: students see only themselves; instructors only assigned.
    if (membership.role === "student") {
      const own = await db.query.studentProfile.findFirst({
        where: and(
          eq(studentProfile.schoolId, membership.schoolId),
          eq(studentProfile.userId, membership.user.id),
        ),
        columns: { id: true },
      });
      if (!own || own.id !== data.studentId) throw new Error("FORBIDDEN");
    }
    if (membership.role === "instructor") {
      const { instructorProfile } = await import("@/db/schema");
      const mine = await db.query.instructorProfile.findFirst({
        where: and(
          eq(instructorProfile.schoolId, membership.schoolId),
          eq(instructorProfile.userId, membership.user.id),
        ),
        columns: { id: true },
      });
      const target = await db.query.studentProfile.findFirst({
        where: and(
          eq(studentProfile.id, data.studentId),
          eq(studentProfile.schoolId, membership.schoolId),
        ),
        columns: { assignedInstructorId: true },
      });
      if (!mine || target?.assignedInstructorId !== mine.id) {
        throw new Error("FORBIDDEN");
      }
    }

    const active = await db.query.enrollment.findFirst({
      where: and(
        eq(enrollment.studentId, data.studentId),
        eq(enrollment.schoolId, membership.schoolId),
        eq(enrollment.status, "active"),
      ),
    });
    if (!active) return { ...EMPTY_PROGRESS };

    const pkg = active.packageId
      ? await db.query.packageEntity.findFirst({
          where: eq(packageEntity.id, active.packageId),
          columns: { name: true },
        })
      : null;

    const completed = await db.query.lesson.findMany({
      where: and(
        eq(lesson.schoolId, membership.schoolId),
        eq(lesson.studentId, data.studentId),
        eq(lesson.status, "completed"),
      ),
      columns: { kind: true, startsAt: true, endsAt: true },
      limit: 2000,
    });

    const minutes = (kinds: Array<string>) =>
      completed
        .filter((l) => kinds.includes(l.kind))
        .reduce(
          (sum, l) => sum + (l.endsAt.getTime() - l.startsAt.getTime()) / 60000,
          0,
        );
    const count = (kind: string) =>
      completed.filter((l) => l.kind === kind).length;
    const sessions = (kinds: Array<string>) =>
      completed.filter((l) => kinds.includes(l.kind)).length;

    const payments = await db.query.payment.findMany({
      where: and(eq(payment.enrollmentId, active.id), isNull(payment.voidedAt)),
      columns: { amountMillimes: true },
      limit: 500,
    });
    const paid = payments.reduce((sum, p) => sum + p.amountMillimes, 0);

    const drivingUsed = Math.round(minutes(["driving", "parking"]));
    const theoryUsed = Math.round(minutes(["theory"]));
    const parkingUsed = sessions(["parking"]);
    const examDriveUsed = count("exam_drive");
    const examParkingUsed = count("exam_parking");

    return {
      enrollmentId: active.id,
      packageName: pkg?.name ?? null,
      priceMillimes: active.priceMillimes,
      paidMillimes: paid,
      balanceMillimes: Math.max(0, active.priceMillimes - paid),
      driving: {
        included: active.drivingMinutes,
        used: drivingUsed,
        remaining: Math.max(0, active.drivingMinutes - drivingUsed),
      },
      parking: {
        included: active.parkingSessions,
        used: parkingUsed,
        remaining: Math.max(0, active.parkingSessions - parkingUsed),
      },
      theory: {
        included: active.theoryMinutes,
        used: theoryUsed,
        remaining: Math.max(0, active.theoryMinutes - theoryUsed),
      },
      examDrive: {
        included: active.examDriveAttempts,
        used: examDriveUsed,
        remaining: Math.max(0, active.examDriveAttempts - examDriveUsed),
      },
      examParking: {
        included: active.examParkingAttempts,
        used: examParkingUsed,
        remaining: Math.max(0, active.examParkingAttempts - examParkingUsed),
      },
    };
  });

export const listStudentEnrollmentsFn = createServerFn({ method: "POST" })
  .validator(z.object({ studentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { and, eq, isNull } = await import("drizzle-orm");
    const { studentProfile } = await import("@/db/schema");
    const student = await db.query.studentProfile.findFirst({
      where: and(
        eq(studentProfile.id, data.studentId),
        eq(studentProfile.schoolId, membership.schoolId),
      ),
      columns: { id: true },
    });
    if (!student) throw new Error("NOT_FOUND");
    const enrollments = await db.query.enrollment.findMany({
      where: and(
        eq(enrollment.studentId, data.studentId),
        eq(enrollment.schoolId, membership.schoolId),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 20,
    });
    const withPayments = await Promise.all(
      enrollments.map(async (e) => {
        const pays = await db.query.payment.findMany({
          where: and(eq(payment.enrollmentId, e.id), isNull(payment.voidedAt)),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 100,
        });
        const paid = pays.reduce((s, p) => s + p.amountMillimes, 0);
        return { ...e, payments: pays, paidMillimes: paid };
      }),
    );
    return withPayments;
  });

export const listExamsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    return db.query.exam.findMany({
      where: eq(exam.schoolId, membership.schoolId),
      with: {
        student: { columns: { id: true, firstName: true, lastName: true } },
      },
      orderBy: (t, { asc }) => [asc(t.scheduledFor)],
      limit: 200,
    });
  },
);

export const createExamFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      studentId: z.string().min(1),
      type: z.enum(examTypes),
      scheduledFor: z.string().min(1),
      note: z.string().max(300).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const { studentProfile } = await import("@/db/schema");
    const student = await db.query.studentProfile.findFirst({
      where: and(
        eq(studentProfile.id, data.studentId),
        eq(studentProfile.schoolId, membership.schoolId),
      ),
      columns: { id: true },
    });
    if (!student) throw new Error("NOT_FOUND");
    const when = new Date(data.scheduledFor);
    if (Number.isNaN(when.getTime())) throw new Error("INVALID_DATE");
    const id = crypto.randomUUID();
    const now = new Date();
    await db.batch([
      db.insert(exam).values({
        id,
        schoolId: membership.schoolId,
        studentId: data.studentId,
        type: data.type,
        scheduledFor: when,
        status: "scheduled",
        resultNote: data.note?.trim() || null,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "exam.created",
      entity: "exam",
      entityId: id,
    });
    return { id };
  });

export const updateExamFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      status: z.enum(examStatuses),
      resultNote: z.string().max(300).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const existing = await db.query.exam.findFirst({
      where: and(eq(exam.id, data.id), eq(exam.schoolId, membership.schoolId)),
      columns: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    await db.batch([
      db
        .update(exam)
        .set({
          status: data.status,
          resultNote: data.resultNote?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(exam.id, data.id)),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: `exam.status:${data.status}`,
      entity: "exam",
      entityId: data.id,
    });
    return { id: data.id };
  });
