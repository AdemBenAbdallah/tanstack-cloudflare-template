import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Global-role RBAC model for a single dashboard.
 *
 * - user:    read + create projects
 * - manager: + update projects, list/get users (no bans, no role changes, no deletes)
 * - admin:   full user/session control + full project control
 */
export const statement = {
  ...defaultStatements,
  project: ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const user = ac.newRole({
  project: ["create", "read"],
});

export const manager = ac.newRole({
  project: ["create", "read", "update"],
  user: ["list", "get"],
  session: ["list"],
});

export const admin = ac.newRole({
  project: ["create", "read", "update", "delete"],
  ...adminAc.statements,
});

export const roles = { user, manager, admin } as const;

export type Role = keyof typeof roles;
export const ALL_ROLES: Role[] = ["user", "manager", "admin"];
