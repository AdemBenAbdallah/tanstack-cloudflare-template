import { env } from "cloudflare:test";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { describe, expect, it } from "vitest";
import { type AppDb, createDb } from "@/db/index";
import {
  enrollment,
  instructorProfile,
  lesson,
  packageEntity,
  payment,
  school,
  schoolMember,
  studentProfile,
  user,
  vehicle,
} from "@/db/schema";

let seq = 0;
const uid = (p: string) => `${p}_${Date.now()}_${seq++}`;

/** Drizzle wraps DB failures without the SQLite message, so rejection
 *  tests assert THAT the write fails; companion tests below prove the
 *  guardrails (triggers, FKs, unique indexes) exist and positive controls
 *  prove legitimate writes succeed. */
async function expectDbError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch {
    return;
  }
  throw new Error("expected query to fail, but it succeeded");
}

async function setupSchool(db: AppDb, name: string) {
  const schoolId = uid("school");
  await db.insert(school).values({ id: schoolId, name, slug: uid("slug") });

  async function addUser(email: string, role: string) {
    const userId = uid("user");
    await db.insert(user).values({
      id: userId,
      name: email,
      email: `${uid("e")}_${email}`,
      emailVerified: false,
      role,
      banned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return userId;
  }

  async function addMember(
    userId: string,
    role: "owner" | "instructor" | "student",
  ) {
    const memberId = uid("member");
    await db.insert(schoolMember).values({
      id: memberId,
      schoolId,
      userId,
      role,
      status: "active",
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return memberId;
  }

  const ownerUserId = await addUser("owner@x.tn", "user");
  await addMember(ownerUserId, "owner");

  const instructorUserId = await addUser("moniteur@x.tn", "user");
  await addMember(instructorUserId, "instructor");
  const instructorId = uid("inst");
  await db.insert(instructorProfile).values({
    id: instructorId,
    schoolId,
    userId: instructorUserId,
    firstName: "Karim",
    lastName: "Moniteur",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const studentUserId = await addUser("eleve@x.tn", "user");
  await addMember(studentUserId, "student");
  const studentId = uid("stud");
  await db.insert(studentProfile).values({
    id: studentId,
    schoolId,
    userId: studentUserId,
    firstName: "Sara",
    lastName: "Eleve",
    licenseCategory: "B",
    status: "in_training",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const vehicleId = uid("veh");
  await db.insert(vehicle).values({
    id: vehicleId,
    schoolId,
    name: "Peugeot 208",
    plate: `TN-${seq}`,
    category: "B",
    transmission: "manual",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { schoolId, instructorId, studentId, vehicleId };
}

const H = 3600_000;
const day = (h: number) =>
  new Date(`2026-09-14T${String(h).padStart(2, "0")}:00:00Z`);

describe("lesson overlap protection (app rule + DB trigger)", () => {
  it("rejects overlapping lessons for the same instructor", async () => {
    const db = createDb((env as unknown as Record<string, D1Database>).DB);
    const s = await setupSchool(db, "Overlap School");
    await db.insert(lesson).values({
      id: uid("l"),
      schoolId: s.schoolId,
      studentId: s.studentId,
      instructorId: s.instructorId,
      vehicleId: s.vehicleId,
      kind: "driving",
      status: "scheduled",
      startsAt: day(9),
      endsAt: new Date(day(9).getTime() + H),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expectDbError(
      db.insert(lesson).values({
        id: uid("l"),
        schoolId: s.schoolId,
        studentId: s.studentId,
        instructorId: s.instructorId,
        vehicleId: s.vehicleId,
        kind: "driving",
        status: "scheduled",
        startsAt: new Date(day(9).getTime() + 30 * 60_000),
        endsAt: new Date(day(10).getTime() + 30 * 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it("rejects overlapping lessons for the same vehicle with another instructor", async () => {
    const db = createDb((env as unknown as Record<string, D1Database>).DB);
    const s = await setupSchool(db, "Vehicle School");
    const otherUserId = uid("user");
    await db.insert(user).values({
      id: otherUserId,
      name: "Second",
      email: `${uid("e")}@x.tn`,
      emailVerified: false,
      role: "user",
      banned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(schoolMember).values({
      id: uid("member"),
      schoolId: s.schoolId,
      userId: otherUserId,
      role: "instructor",
      status: "active",
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const otherInstructorId = uid("inst");
    await db.insert(instructorProfile).values({
      id: otherInstructorId,
      schoolId: s.schoolId,
      userId: otherUserId,
      firstName: "Second",
      lastName: "Moniteur",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(lesson).values({
      id: uid("l"),
      schoolId: s.schoolId,
      studentId: s.studentId,
      instructorId: s.instructorId,
      vehicleId: s.vehicleId,
      kind: "driving",
      status: "scheduled",
      startsAt: day(9),
      endsAt: new Date(day(9).getTime() + H),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expectDbError(
      db.insert(lesson).values({
        id: uid("l"),
        schoolId: s.schoolId,
        studentId: s.studentId,
        instructorId: otherInstructorId,
        vehicleId: s.vehicleId,
        kind: "driving",
        status: "scheduled",
        startsAt: day(9),
        endsAt: new Date(day(9).getTime() + H),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it("allows back-to-back lessons and ignores cancelled ones", async () => {
    const db = createDb((env as unknown as Record<string, D1Database>).DB);
    const s = await setupSchool(db, "BackToBack School");
    const cancelledId = uid("l");
    await db.insert(lesson).values({
      id: cancelledId,
      schoolId: s.schoolId,
      studentId: s.studentId,
      instructorId: s.instructorId,
      vehicleId: s.vehicleId,
      kind: "driving",
      status: "cancelled",
      startsAt: day(9),
      endsAt: new Date(day(9).getTime() + H),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Same slot as the cancelled lesson: allowed.
    const firstId = uid("l");
    await db.insert(lesson).values({
      id: firstId,
      schoolId: s.schoolId,
      studentId: s.studentId,
      instructorId: s.instructorId,
      vehicleId: s.vehicleId,
      kind: "driving",
      status: "scheduled",
      startsAt: day(9),
      endsAt: new Date(day(9).getTime() + H),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Back-to-back (end == start): allowed.
    await db.insert(lesson).values({
      id: uid("l"),
      schoolId: s.schoolId,
      studentId: s.studentId,
      instructorId: s.instructorId,
      vehicleId: s.vehicleId,
      kind: "driving",
      status: "scheduled",
      startsAt: new Date(day(9).getTime() + H),
      endsAt: new Date(day(9).getTime() + 2 * H),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const rows = await db.query.lesson.findMany({
      where: (t, { eq }) => eq(t.schoolId, s.schoolId),
    });
    expect(rows).toHaveLength(3);
  });
});

describe("tenant isolation at the DB layer", () => {
  it("rejects lessons mixing profiles from another school", async () => {
    const db = createDb((env as unknown as Record<string, D1Database>).DB);
    const a = await setupSchool(db, "School A");
    const b = await setupSchool(db, "School B");
    await expectDbError(
      db.insert(lesson).values({
        id: uid("l"),
        schoolId: a.schoolId,
        studentId: b.studentId,
        instructorId: a.instructorId,
        kind: "driving",
        status: "scheduled",
        startsAt: day(9),
        endsAt: new Date(day(9).getTime() + H),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it("rejects a second membership for the same user (single school MVP)", async () => {
    const db = createDb((env as unknown as Record<string, D1Database>).DB);
    const a = await setupSchool(db, "School C");
    const b = await setupSchool(db, "School D");
    const userId = uid("user");
    await db.insert(user).values({
      id: userId,
      name: "Multi",
      email: `${uid("e")}@x.tn`,
      emailVerified: false,
      role: "user",
      banned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    void a;
    await db.insert(schoolMember).values({
      id: uid("member"),
      schoolId: b.schoolId,
      userId,
      role: "student",
      status: "active",
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expectDbError(
      db.insert(schoolMember).values({
        id: uid("member"),
        schoolId: b.schoolId,
        userId,
        role: "instructor",
        status: "active",
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });
});

describe("hours ledger derives from lessons", () => {
  it("sums completed minutes per bucket, ignoring cancelled", async () => {
    const db = createDb((env as unknown as Record<string, D1Database>).DB);
    const s = await setupSchool(db, "Ledger School");
    const mk = (
      id: string,
      kind: "driving" | "theory" | "parking",
      status: "completed" | "cancelled",
      startH: number,
      lenH: number,
    ) => ({
      id,
      schoolId: s.schoolId,
      studentId: s.studentId,
      instructorId: s.instructorId,
      kind,
      status,
      startsAt: day(startH),
      endsAt: new Date(day(startH).getTime() + lenH * H),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(lesson).values(mk(uid("l"), "driving", "completed", 8, 1));
    await db.insert(lesson).values(mk(uid("l"), "driving", "completed", 10, 2));
    await db.insert(lesson).values(mk(uid("l"), "theory", "completed", 14, 2));
    await db.insert(lesson).values(mk(uid("l"), "driving", "cancelled", 16, 1));

    const rows = await db.query.lesson.findMany({
      where: (t, { and, eq }) =>
        and(eq(t.schoolId, s.schoolId), eq(t.status, "completed")),
    });
    const minutes = (kinds: Array<string>) =>
      rows
        .filter((r) => kinds.includes(r.kind))
        .reduce(
          (sum, r) => sum + (r.endsAt.getTime() - r.startsAt.getTime()) / 60000,
          0,
        );
    expect(minutes(["driving", "parking"])).toBe(180);
    expect(minutes(["theory"])).toBe(120);
  });
});

describe("packages and payments", () => {
  it("tracks balance as snapshot price minus valid payments", async () => {
    const db = createDb((env as unknown as Record<string, D1Database>).DB);
    const s = await setupSchool(db, "Billing School");
    const packageId = uid("pkg");
    await db.insert(packageEntity).values({
      id: packageId,
      schoolId: s.schoolId,
      name: "Permis B",
      drivingMinutes: 1200,
      parkingSessions: 10,
      theoryMinutes: 1200,
      examDriveAttempts: 1,
      examParkingAttempts: 1,
      priceMillimes: 1_500_000,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const enrollmentId = uid("enr");
    await db.insert(enrollment).values({
      id: enrollmentId,
      schoolId: s.schoolId,
      studentId: s.studentId,
      packageId,
      drivingMinutes: 1200,
      parkingSessions: 10,
      theoryMinutes: 1200,
      examDriveAttempts: 1,
      examParkingAttempts: 1,
      priceMillimes: 1_500_000,
      status: "active",
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(payment).values({
      id: uid("pay"),
      schoolId: s.schoolId,
      enrollmentId,
      amountMillimes: 900_000,
      method: "cash",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const payments = await db.query.payment.findMany({
      where: (t, { and, eq, isNull }) =>
        and(eq(t.enrollmentId, enrollmentId), isNull(t.voidedAt)),
    });
    const paid = payments.reduce((sum, p) => sum + p.amountMillimes, 0);
    expect(paid).toBe(900_000);
    expect(1_500_000 - paid).toBe(600_000);
  });
});

describe("schema guardrails exist in the migrated database", () => {
  it("has overlap triggers and composite same-school FKs", async () => {
    const db = createDb((env as unknown as Record<string, D1Database>).DB);
    const { sql } = await import("drizzle-orm");
    const triggers = (await db.all(
      sql`SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'lesson_no_overlap_%'`,
    )) as Array<{ name: string }>;
    expect(triggers.map((t) => t.name).sort()).toEqual([
      "lesson_no_overlap_insert",
      "lesson_no_overlap_update",
    ]);

    const fks = (await db.all(
      sql`SELECT "table" AS tbl FROM pragma_foreign_key_list('lesson')`,
    )) as Array<{ tbl: string }>;
    const targets = fks.map((r) => r.tbl).sort();
    for (const expected of [
      "instructor_profile",
      "school",
      "student_profile",
      "vehicle",
    ]) {
      expect(targets).toContain(expected);
    }

    const indexes = (await db.all(
      sql`SELECT name FROM pragma_index_list('school_member') WHERE "unique" = 1`,
    )) as Array<{ name: string }>;
    expect(indexes.length).toBeGreaterThan(0);
  });
});

describe("staff provisioning primitives", () => {
  it("hashes and verifies passwords in the Workers runtime", async () => {
    const db = createDb((env as unknown as Record<string, D1Database>).DB);
    const hash = await hashPassword("password123");
    expect(await verifyPassword({ hash, password: "password123" })).toBe(true);
    expect(await verifyPassword({ hash, password: "wrongpass1" })).toBe(false);

    const { account } = await import("@/db/schema");
    const userId = `user_prov_${Date.now()}`;
    const now = new Date();
    await db.insert(user).values({
      id: userId,
      name: "Provisioned",
      email: `prov${Date.now()}@x.tn`,
      emailVerified: false,
      role: "user",
      banned: false,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(account).values({
      id: `acc_prov_${Date.now()}`,
      accountId: userId,
      providerId: "credential",
      userId,
      password: hash,
      createdAt: now,
      updatedAt: now,
    });
    const row = await db.query.account.findFirst({
      where: (t, { eq }) => eq(t.userId, userId),
    });
    expect(row?.providerId).toBe("credential");
    expect(
      await verifyPassword({
        hash: row?.password ?? "",
        password: "password123",
      }),
    ).toBe(true);
  });
});
