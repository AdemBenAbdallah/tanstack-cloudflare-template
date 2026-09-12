import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db/index";
import { lesson, project, user } from "@/db/schema";

describe("D1 + Drizzle", () => {
  it("writes and reads through the DB binding", async () => {
    const e = env as unknown as Record<string, D1Database>;
    const db = createDb(e.DB);
    const now = new Date();

    await db.insert(user).values({
      id: "user_test_1",
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      role: "admin",
      banned: false,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(project).values({
      id: "project_test_1",
      name: "Test project",
      description: "RBAC demo",
      ownerId: "user_test_1",
      createdAt: now,
      updatedAt: now,
    });

    const found = await db.query.project.findFirst({
      where: (t, { eq }) => eq(t.id, "project_test_1"),
      with: { owner: true },
    });
    expect(found?.name).toBe("Test project");
    expect(found?.owner.email).toBe("test@example.com");
  });

  it("stores lessons with student + instructor relations", async () => {
    const e = env as unknown as Record<string, D1Database>;
    const db = createDb(e.DB);
    const now = new Date();

    for (const [id, email, role] of [
      ["user_lesson_student", "student@example.com", "user"],
      ["user_lesson_instructor", "instructor@example.com", "manager"],
    ] as const) {
      await db.insert(user).values({
        id,
        name: email,
        email,
        emailVerified: false,
        role,
        banned: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.insert(lesson).values({
      id: "lesson_test_1",
      studentId: "user_lesson_student",
      instructorId: "user_lesson_instructor",
      vehicle: "Car 3",
      kind: "practice",
      status: "scheduled",
      startsAt: new Date("2026-09-14T09:00:00Z"),
      endsAt: new Date("2026-09-14T10:00:00Z"),
      notes: null,
      createdAt: now,
      updatedAt: now,
    });

    const found = await db.query.lesson.findFirst({
      where: (t, { eq }) => eq(t.id, "lesson_test_1"),
      with: { student: true, instructor: true },
    });
    expect(found?.kind).toBe("practice");
    expect(found?.status).toBe("scheduled");
    expect(found?.student.email).toBe("student@example.com");
    expect(found?.instructor.email).toBe("instructor@example.com");
  });
});
