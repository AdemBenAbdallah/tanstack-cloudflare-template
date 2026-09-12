import { describe, expect, it } from "vitest";
import { ALL_ROLES, roles, statement } from "./permissions";

describe("RBAC roles", () => {
  it("defines the global dashboard roles", () => {
    expect(ALL_ROLES).toEqual(["user", "manager", "admin"]);
    expect(Object.keys(roles).sort()).toEqual(["admin", "manager", "user"]);
  });

  it("exposes project permissions in the access-control statement", () => {
    expect(statement.project).toEqual(["create", "read", "update", "delete"]);
    // Inherits the Better Auth admin plugin defaults (user/session control)
    expect(Object.keys(statement)).toEqual(
      expect.arrayContaining(["user", "session", "project"]),
    );
  });
});
