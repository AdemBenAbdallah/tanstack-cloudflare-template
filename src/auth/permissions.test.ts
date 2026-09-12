import { describe, expect, it } from "vitest";
import {
  ROLE_PERMISSIONS,
  ROLE_RANK,
  roleAtLeast,
  roleCan,
  schoolRoles,
} from "./permissions";

describe("school RBAC matrix", () => {
  it("orders roles student < instructor < secretary < owner", () => {
    expect(
      [...schoolRoles].sort((a, b) => ROLE_RANK[a] - ROLE_RANK[b]),
    ).toEqual(["student", "instructor", "secretary", "owner"]);
    expect(roleAtLeast("owner", "secretary")).toBe(true);
    expect(roleAtLeast("secretary", "owner")).toBe(false);
    expect(roleAtLeast("instructor", "instructor")).toBe(true);
  });

  it("gives owner every permission", () => {
    for (const role of ["secretary", "instructor", "student"] as const) {
      for (const perm of Object.keys(ROLE_PERMISSIONS[role])) {
        expect(roleCan("owner", perm)).toBe(true);
      }
    }
    expect(roleCan("owner", "anything.new")).toBe(true);
  });

  it("keeps secretary out of users, settings, voids and reports", () => {
    expect(roleCan("secretary", "students.manage")).toBe(true);
    expect(roleCan("secretary", "lessons.manage")).toBe(true);
    expect(roleCan("secretary", "payments.record")).toBe(true);
    expect(roleCan("secretary", "users.manage")).toBe(false);
    expect(roleCan("secretary", "settings.manage")).toBe(false);
    expect(roleCan("secretary", "payments.void")).toBe(false);
    expect(roleCan("secretary", "reports.view")).toBe(false);
  });

  it("restricts instructors to their own scope, never finance", () => {
    expect(roleCan("instructor", "lessons.complete_own")).toBe(true);
    expect(roleCan("instructor", "calendar.view_own")).toBe(true);
    expect(roleCan("instructor", "lessons.manage")).toBe(false);
    expect(roleCan("instructor", "payments.record")).toBe(false);
    expect(roleCan("instructor", "payments.view_own")).toBe(false);
    expect(roleCan("instructor", "users.manage")).toBe(false);
  });

  it("restricts students to their own data", () => {
    expect(roleCan("student", "calendar.view_own")).toBe(true);
    expect(roleCan("student", "progress.view_own")).toBe(true);
    expect(roleCan("student", "calendar.view_school")).toBe(false);
    expect(roleCan("student", "students.manage")).toBe(false);
  });
});
