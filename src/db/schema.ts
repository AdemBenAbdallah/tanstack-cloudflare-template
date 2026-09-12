import { relations } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

// --- Better Auth core tables (SQLite / D1). Untouched by domain migrations. ---

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  // PLATFORM role only (platform_admin = template operator). School roles
  // live in school_member.role — never use this column for school access.
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

// --- Multi-tenant core: schools + memberships ---
//
// FK policy (D1): every domain FK is RESTRICT/NO ACTION. Never CASCADE —
// D1 ignores PRAGMA foreign_keys=OFF inside migrations, so a table rebuild
// with CASCADE children silently wipes data. Deletes are programmatic.

export const schoolStatuses = ["active", "suspended"] as const;

export const school = sqliteTable("school", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const schoolRoles = [
  "owner",
  "secretary",
  "instructor",
  "student",
] as const;
export type SchoolRole = (typeof schoolRoles)[number];

export const memberStatuses = ["active", "inactive"] as const;

export const schoolMember = sqliteTable(
  "school_member",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    // MVP: one school per login — UNIQUE(user_id) enforces it at the DB layer.
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "restrict" }),
    role: text("role").notNull().default("student"),
    status: text("status").notNull().default("active"),
    invitedByMemberId: text("invited_by_member_id"),
    joinedAt: integer("joined_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("member_school_role_idx").on(t.schoolId, t.role)],
);

// --- People ---

export const studentStatuses = [
  "new",
  "in_training",
  "ready_for_exam",
  "passed",
  "abandoned",
] as const;

export const studentProfile = sqliteTable(
  "student_profile",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone"),
    dateOfBirth: integer("date_of_birth", { mode: "timestamp" }),
    licenseCategory: text("license_category").notNull().default("B"),
    enrollmentDate: integer("enrollment_date", { mode: "timestamp" }),
    status: text("status").notNull().default("new"),
    assignedInstructorId: text("assigned_instructor_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    foreignKey({
      columns: [t.schoolId, t.assignedInstructorId],
      foreignColumns: [instructorProfile.schoolId, instructorProfile.id],
    }),
    unique("student_school_user_key").on(t.schoolId, t.userId),
    unique("student_school_key").on(t.schoolId, t.id),
    index("student_school_status_idx").on(t.schoolId, t.status),
  ],
);

export const instructorProfile = sqliteTable(
  "instructor_profile",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone"),
    hireDate: integer("hire_date", { mode: "timestamp" }),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    unique("instructor_school_user_key").on(t.schoolId, t.userId),
    unique("instructor_school_key").on(t.schoolId, t.id),
  ],
);

// --- Fleet & catalog ---

export const vehicle = sqliteTable(
  "vehicle",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    plate: text("plate"),
    category: text("category").notNull().default("B"),
    transmission: text("transmission").notNull().default("manual"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    unique("vehicle_school_key").on(t.schoolId, t.id),
    index("vehicle_school_active_idx").on(t.schoolId, t.active),
  ],
);

export const packageEntity = sqliteTable(
  "package",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    // Included quantities (snapshotted into enrollment at purchase).
    drivingMinutes: integer("driving_minutes").notNull().default(0),
    parkingSessions: integer("parking_sessions").notNull().default(0),
    theoryMinutes: integer("theory_minutes").notNull().default(0),
    examDriveAttempts: integer("exam_drive_attempts").notNull().default(0),
    examParkingAttempts: integer("exam_parking_attempts").notNull().default(0),
    priceMillimes: integer("price_millimes").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("package_school_active_idx").on(t.schoolId, t.active)],
);

export const enrollmentStatuses = ["active", "completed", "cancelled"] as const;

export const enrollment = sqliteTable(
  "enrollment",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    studentId: text("student_id").notNull(),
    packageId: text("package_id").references(() => packageEntity.id, {
      onDelete: "restrict",
    }),
    // Snapshot at purchase — later catalog edits never rewrite history.
    drivingMinutes: integer("driving_minutes").notNull(),
    parkingSessions: integer("parking_sessions").notNull(),
    theoryMinutes: integer("theory_minutes").notNull(),
    examDriveAttempts: integer("exam_drive_attempts").notNull(),
    examParkingAttempts: integer("exam_parking_attempts").notNull(),
    priceMillimes: integer("price_millimes").notNull(),
    status: text("status").notNull().default("active"),
    startedAt: integer("started_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    foreignKey({
      columns: [t.schoolId, t.studentId],
      foreignColumns: [studentProfile.schoolId, studentProfile.id],
    }),
    unique("enrollment_school_key").on(t.schoolId, t.id),
    index("enrollment_student_idx").on(t.schoolId, t.studentId),
  ],
);

// --- Lessons (core domain) ---

export const lessonKinds = [
  "driving",
  "parking",
  "theory",
  "exam_drive",
  "exam_parking",
] as const;
// practice is the legacy template kind, kept accepted for old rows only.
export const lessonStatuses = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
] as const;

export const lesson = sqliteTable(
  "lesson",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    studentId: text("student_id").notNull(),
    instructorId: text("instructor_id").notNull(),
    vehicleId: text("vehicle_id"),
    kind: text("kind").notNull().default("driving"),
    status: text("status").notNull().default("scheduled"),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
    notes: text("notes"),
    createdByMemberId: text("created_by_member_id"),
    // Reserved for a future one-way push to Google Calendar.
    googleEventId: text("google_event_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    // Same-school enforcement at the DB layer: a lesson can only reference
    // a student/instructor/vehicle of its own school.
    foreignKey({
      columns: [t.schoolId, t.studentId],
      foreignColumns: [studentProfile.schoolId, studentProfile.id],
    }),
    foreignKey({
      columns: [t.schoolId, t.instructorId],
      foreignColumns: [instructorProfile.schoolId, instructorProfile.id],
    }),
    foreignKey({
      columns: [t.schoolId, t.vehicleId],
      foreignColumns: [vehicle.schoolId, vehicle.id],
    }),
    index("lesson_school_start_idx").on(t.schoolId, t.startsAt),
    index("lesson_school_status_idx").on(t.schoolId, t.status),
    index("lesson_instructor_idx").on(t.schoolId, t.instructorId, t.startsAt),
  ],
);

// --- Money ---

export const paymentMethods = [
  "cash",
  "bank_transfer",
  "e_dinar",
  "check",
] as const;

export const payment = sqliteTable(
  "payment",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    enrollmentId: text("enrollment_id").notNull(),
    amountMillimes: integer("amount_millimes").notNull(),
    method: text("method").notNull().default("cash"),
    receivedByMemberId: text("received_by_member_id"),
    note: text("note"),
    voidedAt: integer("voided_at", { mode: "timestamp" }),
    voidReason: text("void_reason"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    foreignKey({
      columns: [t.schoolId, t.enrollmentId],
      foreignColumns: [enrollment.schoolId, enrollment.id],
    }),
    index("payment_enrollment_idx").on(t.schoolId, t.enrollmentId),
  ],
);

// --- Exams (administrative record; attempts consumed via exam_* lessons) ---

export const examTypes = ["theory", "drive", "parking"] as const;
export const examStatuses = [
  "scheduled",
  "passed",
  "failed",
  "absent",
  "cancelled",
] as const;

export const exam = sqliteTable(
  "exam",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    studentId: text("student_id").notNull(),
    type: text("type").notNull(),
    scheduledFor: integer("scheduled_for", { mode: "timestamp" }).notNull(),
    status: text("status").notNull().default("scheduled"),
    resultNote: text("result_note"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    foreignKey({
      columns: [t.schoolId, t.studentId],
      foreignColumns: [studentProfile.schoolId, studentProfile.id],
    }),
    index("exam_student_idx").on(t.schoolId, t.studentId),
  ],
);

// --- Async notifications (outbox) + audit ---

export const outboxStatuses = [
  "pending",
  "sent",
  "failed",
  "cancelled",
] as const;
export const outboxKinds = [
  "lesson_reminder",
  "lesson_cancelled",
  "lesson_rescheduled",
  "payment_due",
  "exam_reminder",
] as const;

export const notificationOutbox = sqliteTable(
  "notification_outbox",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    recipientMemberId: text("recipient_member_id"),
    payloadJson: text("payload_json").notNull().default("{}"),
    status: text("status").notNull().default("pending"),
    scheduledFor: integer("scheduled_for", { mode: "timestamp" }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("outbox_due_idx").on(t.status, t.scheduledFor)],
);

export const auditEvent = sqliteTable(
  "audit_event",
  {
    id: text("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "restrict" }),
    actorMemberId: text("actor_member_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    metaJson: text("meta_json").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("audit_school_time_idx").on(t.schoolId, t.createdAt)],
);

// --- Relations ---

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(schoolMember),
  studentProfiles: many(studentProfile),
  instructorProfiles: many(instructorProfile),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const schoolRelations = relations(school, ({ many }) => ({
  members: many(schoolMember),
  students: many(studentProfile),
  instructors: many(instructorProfile),
  vehicles: many(vehicle),
  packages: many(packageEntity),
  enrollments: many(enrollment),
  lessons: many(lesson),
  payments: many(payment),
  exams: many(exam),
}));

export const schoolMemberRelations = relations(schoolMember, ({ one }) => ({
  school: one(school, {
    fields: [schoolMember.schoolId],
    references: [school.id],
  }),
  user: one(user, { fields: [schoolMember.userId], references: [user.id] }),
}));

export const studentProfileRelations = relations(
  studentProfile,
  ({ one, many }) => ({
    school: one(school, {
      fields: [studentProfile.schoolId],
      references: [school.id],
    }),
    user: one(user, {
      fields: [studentProfile.userId],
      references: [user.id],
    }),
    enrollments: many(enrollment),
    lessons: many(lesson),
  }),
);

export const instructorProfileRelations = relations(
  instructorProfile,
  ({ one, many }) => ({
    school: one(school, {
      fields: [instructorProfile.schoolId],
      references: [school.id],
    }),
    user: one(user, {
      fields: [instructorProfile.userId],
      references: [user.id],
    }),
    lessons: many(lesson),
  }),
);

export const lessonRelations = relations(lesson, ({ one }) => ({
  school: one(school, {
    fields: [lesson.schoolId],
    references: [school.id],
  }),
  student: one(studentProfile, {
    fields: [lesson.schoolId, lesson.studentId],
    references: [studentProfile.schoolId, studentProfile.id],
  }),
  instructor: one(instructorProfile, {
    fields: [lesson.schoolId, lesson.instructorId],
    references: [instructorProfile.schoolId, instructorProfile.id],
  }),
  vehicle: one(vehicle, {
    fields: [lesson.schoolId, lesson.vehicleId],
    references: [vehicle.schoolId, vehicle.id],
  }),
}));

export type UserRow = typeof user.$inferSelect;
export type SchoolRow = typeof school.$inferSelect;
export type SchoolMemberRow = typeof schoolMember.$inferSelect;
export type StudentProfileRow = typeof studentProfile.$inferSelect;
export type InstructorProfileRow = typeof instructorProfile.$inferSelect;
export type VehicleRow = typeof vehicle.$inferSelect;
export type PackageRow = typeof packageEntity.$inferSelect;
export type EnrollmentRow = typeof enrollment.$inferSelect;
export type LessonRow = typeof lesson.$inferSelect;
export type PaymentRow = typeof payment.$inferSelect;
export type ExamRow = typeof exam.$inferSelect;
export type LessonKind = (typeof lessonKinds)[number];
export type LessonStatus = (typeof lessonStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
