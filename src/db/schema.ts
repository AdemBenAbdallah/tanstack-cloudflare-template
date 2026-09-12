import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// --- Better Auth core tables (SQLite / D1) ---

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  // Global role for the dashboard RBAC model: user | manager | admin
  role: text("role").notNull().default("user"),
  banned: integer("banned", { mode: "boolean" }).notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// --- Demo app tables (RBAC showcase) ---

export const project = sqliteTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  projects: many(project),
  lessonsAsStudent: many(lesson, { relationName: "lessonStudent" }),
  lessonsAsInstructor: many(lesson, { relationName: "lessonInstructor" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const projectRelations = relations(project, ({ one }) => ({
  owner: one(user, { fields: [project.ownerId], references: [user.id] }),
}));

// --- Driving-school schedule ---

export const lessonKinds = ["theory", "practice", "exam"] as const;
export const lessonStatuses = ["scheduled", "completed", "cancelled"] as const;

export const lesson = sqliteTable("lesson", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  instructorId: text("instructor_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  vehicle: text("vehicle"),
  kind: text("kind").notNull().default("practice"),
  status: text("status").notNull().default("scheduled"),
  startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
  notes: text("notes"),
  // Reserved for a future one-way push to Google Calendar.
  googleEventId: text("google_event_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const lessonRelations = relations(lesson, ({ one }) => ({
  student: one(user, {
    fields: [lesson.studentId],
    references: [user.id],
    relationName: "lessonStudent",
  }),
  instructor: one(user, {
    fields: [lesson.instructorId],
    references: [user.id],
    relationName: "lessonInstructor",
  }),
}));

export type UserRow = typeof user.$inferSelect;
export type ProjectRow = typeof project.$inferSelect;
export type LessonRow = typeof lesson.$inferSelect;
export type LessonKind = (typeof lessonKinds)[number];
export type LessonStatus = (typeof lessonStatuses)[number];
