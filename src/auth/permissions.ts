import { type SchoolRole, schoolRoles } from "@/db/schema";

/**
 * School RBAC matrix (static roles, no permission-management UI in MVP).
 *
 * - owner:     full access to the school
 * - secretary: students, calendar, lessons, vehicles/assignments, basic
 *              payments (record only), exams — no users, no settings,
 *              no voids, no reports
 * - instructor: own calendar/lessons/students, complete + no-show + notes
 *              on own lessons — no finance, no users, no other instructors
 * - student:   own profile/schedule/progress/payments/exams only
 *
 * Permission keys are coarse capabilities; row-level scoping (own vs all)
 * is enforced separately in server functions via the membership.
 */
export type { SchoolRole };
export { schoolRoles };

const ALL: Record<string, true> = {};

function perms(...keys: Array<string>): Record<string, true> {
  return Object.fromEntries(keys.map((k) => [k, true]));
}

export const ROLE_PERMISSIONS: Record<SchoolRole, Record<string, true>> = {
  owner: ALL, // everything; checked via roleRank first
  secretary: perms(
    "students.manage",
    "students.assign",
    "calendar.manage",
    "lessons.manage",
    "vehicles.view",
    "vehicles.assign",
    "instructors.view",
    "packages.view",
    "payments.record",
    "exams.manage",
    "progress.view_school",
  ),
  instructor: perms(
    "lessons.complete_own",
    "lessons.note_own",
    "calendar.view_own",
    "students.view_assigned",
    "progress.view_assigned",
    "exams.view_assigned",
  ),
  student: perms(
    "profile.view_own",
    "calendar.view_own",
    "progress.view_own",
    "payments.view_own",
    "exams.view_own",
  ),
};

export const ROLE_RANK: Record<SchoolRole, number> = {
  student: 0,
  instructor: 1,
  secretary: 2,
  owner: 3,
};

export function roleAtLeast(role: SchoolRole, min: SchoolRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Coarse capability check. Row-level scoping happens in server functions. */
export function roleCan(role: SchoolRole, permission: string): boolean {
  if (role === "owner") return true;
  return ROLE_PERMISSIONS[role][permission] === true;
}

/** Roles allowed to manage the schedule (create/move/cancel lessons). */
export const SCHEDULE_MANAGERS: Array<SchoolRole> = ["owner", "secretary"];
