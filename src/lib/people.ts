import { createServerFn } from "@tanstack/react-start";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import type { SchoolRole } from "@/auth/permissions";
import {
  instructorProfile,
  schoolMember,
  studentProfile,
  user,
  vehicle,
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

const profileFields = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  phone: z
    .string()
    .regex(/^\+?[0-9 ]{8,20}$/)
    .optional(),
});

/**
 * Staff-provisioned accounts (no public signup for school members).
 * Creates the login (email+password), the membership and the profile
 * atomically. Owner may create any role; secretary may create students only.
 */
export const createSchoolUserFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2).max(80),
      email: z.string().email().max(120),
      password: z.string().min(8).max(72),
      role: z.enum(["secretary", "instructor", "student"]),
      profile: profileFields,
    }),
  )
  .handler(async ({ data }) => {
    const membership = await requireMembershipFn();
    const caller = membership.role as SchoolRole;
    if (
      caller !== "owner" &&
      !(caller === "secretary" && data.role === "student")
    ) {
      throw new Error("FORBIDDEN");
    }
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    const email = data.email.trim().toLowerCase();
    const taken = await db.query.user.findFirst({
      where: eq(user.email, email),
      columns: { id: true },
    });
    if (taken) throw new Error("EMAIL_TAKEN");

    const userId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const now = new Date();
    const passwordHash = await hashPassword(data.password);

    if (data.role === "student") {
      await db.batch([
        db.insert(user).values({
          id: userId,
          name: data.name.trim(),
          email,
          emailVerified: false,
          role: "user",
          banned: false,
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(schoolMember).values({
          id: memberId,
          schoolId: membership.schoolId,
          userId,
          role: "student",
          status: "active",
          invitedByMemberId: membership.memberId,
          joinedAt: now,
          createdAt: now,
          updatedAt: now,
        }),
      ]);
      const { account } = await import("@/db/schema");
      await db.batch([
        db.insert(account).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(studentProfile).values({
          id: profileId,
          schoolId: membership.schoolId,
          userId,
          firstName: data.profile.firstName.trim(),
          lastName: data.profile.lastName.trim(),
          phone: data.profile.phone?.trim() || null,
          status: "new",
          enrollmentDate: now,
          createdAt: now,
          updatedAt: now,
        }),
      ]);
    } else {
      await db.batch([
        db.insert(user).values({
          id: userId,
          name: data.name.trim(),
          email,
          emailVerified: false,
          role: "user",
          banned: false,
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(schoolMember).values({
          id: memberId,
          schoolId: membership.schoolId,
          userId,
          role: data.role,
          status: "active",
          invitedByMemberId: membership.memberId,
          joinedAt: now,
          createdAt: now,
          updatedAt: now,
        }),
      ]);
      const { account } = await import("@/db/schema");
      await db.batch([
        db.insert(account).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        }),
        ...(data.role === "instructor"
          ? [
              db.insert(instructorProfile).values({
                id: profileId,
                schoolId: membership.schoolId,
                userId,
                firstName: data.profile.firstName.trim(),
                lastName: data.profile.lastName.trim(),
                phone: data.profile.phone?.trim() || null,
                active: true,
                createdAt: now,
                updatedAt: now,
              }),
            ]
          : []),
      ]);
    }

    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "user.created",
      entity: data.role,
      entityId: profileId,
      meta: { email, role: data.role },
    });
    return { userId, profileId };
  });

export const listStudentsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    return db.query.studentProfile.findMany({
      where: eq(studentProfile.schoolId, membership.schoolId),
      with: {
        user: { columns: { email: true } },
      },
      orderBy: (t, { asc }) => [asc(t.firstName)],
      limit: 500,
    });
  },
);

export const updateStudentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      firstName: z.string().min(2).max(60),
      lastName: z.string().min(2).max(60),
      phone: z
        .string()
        .regex(/^\+?[0-9 ]{8,20}$/)
        .optional(),
      licenseCategory: z.string().min(1).max(4),
      status: z.enum([
        "new",
        "in_training",
        "ready_for_exam",
        "passed",
        "abandoned",
      ]),
      assignedInstructorId: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const existing = await db.query.studentProfile.findFirst({
      where: and(
        eq(studentProfile.id, data.id),
        eq(studentProfile.schoolId, membership.schoolId),
      ),
      columns: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    if (data.assignedInstructorId) {
      const inst = await db.query.instructorProfile.findFirst({
        where: and(
          eq(instructorProfile.id, data.assignedInstructorId),
          eq(instructorProfile.schoolId, membership.schoolId),
        ),
        columns: { id: true },
      });
      if (!inst) throw new Error("UNKNOWN_INSTRUCTOR");
    }
    await db.batch([
      db
        .update(studentProfile)
        .set({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone?.trim() || null,
          licenseCategory: data.licenseCategory,
          status: data.status,
          assignedInstructorId: data.assignedInstructorId || null,
          updatedAt: new Date(),
        })
        .where(eq(studentProfile.id, data.id)),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "student.updated",
      entity: "student",
      entityId: data.id,
      meta: { status: data.status },
    });
    return { id: data.id };
  });

export const listInstructorsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const membership = await requireMembershipFn();
    if (membership.role !== "owner" && membership.role !== "secretary") {
      throw new Error("FORBIDDEN");
    }
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    return db.query.instructorProfile.findMany({
      where: eq(instructorProfile.schoolId, membership.schoolId),
      with: { user: { columns: { email: true } } },
      orderBy: (t, { asc }) => [asc(t.firstName)],
      limit: 200,
    });
  },
);

export const updateInstructorFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      firstName: z.string().min(2).max(60),
      lastName: z.string().min(2).max(60),
      phone: z
        .string()
        .regex(/^\+?[0-9 ]{8,20}$/)
        .optional(),
      active: z.boolean(),
      notes: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: ["owner"] },
    });
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const existing = await db.query.instructorProfile.findFirst({
      where: and(
        eq(instructorProfile.id, data.id),
        eq(instructorProfile.schoolId, membership.schoolId),
      ),
      columns: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    await db.batch([
      db
        .update(instructorProfile)
        .set({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone?.trim() || null,
          active: data.active,
          notes: data.notes?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(instructorProfile.id, data.id)),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "instructor.updated",
      entity: "instructor",
      entityId: data.id,
    });
    return { id: data.id };
  });

const vehicleInput = z.object({
  name: z.string().min(2).max(80),
  plate: z.string().max(20).optional(),
  category: z.string().min(1).max(4).default("B"),
  transmission: z.enum(["manual", "auto"]).default("manual"),
  active: z.boolean().default(true),
});

export const listVehiclesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { eq } = await import("drizzle-orm");
    return db.query.vehicle.findMany({
      where: eq(vehicle.schoolId, membership.schoolId),
      orderBy: (t, { asc }) => [asc(t.name)],
      limit: 200,
    });
  },
);

export const createVehicleFn = createServerFn({ method: "POST" })
  .validator(vehicleInput)
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date();
    await db.batch([
      db.insert(vehicle).values({
        id,
        schoolId: membership.schoolId,
        name: data.name.trim(),
        plate: data.plate?.trim() || null,
        category: data.category,
        transmission: data.transmission,
        active: data.active,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "vehicle.created",
      entity: "vehicle",
      entityId: id,
    });
    return { id };
  });

export const updateVehicleFn = createServerFn({ method: "POST" })
  .validator(vehicleInput.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const existing = await db.query.vehicle.findFirst({
      where: and(
        eq(vehicle.id, data.id),
        eq(vehicle.schoolId, membership.schoolId),
      ),
      columns: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    await db.batch([
      db
        .update(vehicle)
        .set({
          name: data.name.trim(),
          plate: data.plate?.trim() || null,
          category: data.category,
          transmission: data.transmission,
          active: data.active,
          updatedAt: new Date(),
        })
        .where(eq(vehicle.id, data.id)),
    ]);
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "vehicle.updated",
      entity: "vehicle",
      entityId: data.id,
    });
    return { id: data.id };
  });

export const deleteVehicleFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const membership = await requireSchoolRoleFn({
      data: { roles: [...STAFF] },
    });
    const db = await getDb();
    const { and, eq } = await import("drizzle-orm");
    const existing = await db.query.vehicle.findFirst({
      where: and(
        eq(vehicle.id, data.id),
        eq(vehicle.schoolId, membership.schoolId),
      ),
      columns: { id: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    try {
      await db.batch([db.delete(vehicle).where(eq(vehicle.id, data.id))]);
    } catch {
      // RESTRICT FK: lessons still reference this vehicle.
      throw new Error("VEHICLE_IN_USE");
    }
    await writeAudit(db, {
      schoolId: membership.schoolId,
      actorMemberId: membership.memberId,
      action: "vehicle.deleted",
      entity: "vehicle",
      entityId: data.id,
    });
    return { ok: true };
  });
