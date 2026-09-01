import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type {
  EmergencyContact,
  WorkoutExercise,
  ExerciseResult,
  Measurements,
  DietMeal,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* users/{uid} — auth identity + profile                               */
/* ------------------------------------------------------------------ */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull().default("user"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    photoUrl: text("photo_url"),
    heightCm: doublePrecision("height_cm"),
    emergencyContact: jsonb("emergency_contact").$type<EmergencyContact>(),
    notificationPrefs: jsonb("notification_prefs")
      .$type<{ workouts: boolean; payments: boolean; announcements: boolean }>()
      .default({ workouts: true, payments: true, announcements: true }),
    language: text("language").notNull().default("en"),
    theme: text("theme").notNull().default("system"),
    assignedTrainerUid: text("assigned_trainer_uid"),
    sessionTime: text("session_time"),
    approvalStatus: text("approval_status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), index("users_role_idx").on(t.role)]
);

/* ------------------------------------------------------------------ */
/* trainers/{uid} — trainer profile + approval                         */
/* ------------------------------------------------------------------ */
export const trainers = pgTable(
  "trainers",
  {
    uid: text("uid").primaryKey(),
    name: text("name").notNull(),
    qualification: text("qualification"),
    experience: text("experience"),
    bio: text("bio"),
    photoUrl: text("photo_url"),
    availability: text("availability"),
    approvalStatus: text("approval_status").notNull().default("pending"),
    adminApproval: text("admin_approval").notNull().default("pending"),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("trainers_approval_idx").on(t.approvalStatus)]
);

/* ------------------------------------------------------------------ */
/* memberships/{membershipId}                                          */
/* ------------------------------------------------------------------ */
export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    plan: text("plan").notNull(),
    startDate: text("start_date").notNull(),
    durationMonths: integer("duration_months").notNull(),
    expiryDate: text("expiry_date").notNull(),
    totalAmount: integer("total_amount").notNull().default(0),
    paidAmount: integer("paid_amount").notNull().default(0),
    dueAmount: integer("due_amount").notNull().default(0),
    paymentStatus: text("payment_status").notNull().default("due"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("memberships_user_uq").on(t.userUid)]
);

/* ------------------------------------------------------------------ */
/* workoutPlans/{planId}                                               */
/* ------------------------------------------------------------------ */
export const workoutPlans = pgTable(
  "workoutPlans",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    trainerUid: text("trainer_uid"),
    title: text("title").notNull(),
    exercises: jsonb("exercises").$type<WorkoutExercise[]>().notNull().default([]),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("workout_plans_user_uq").on(t.userUid)]
);

/* ------------------------------------------------------------------ */
/* dietPlans/{planId} — trainer-assigned nutrition plan                */
/* ------------------------------------------------------------------ */
export const dietPlans = pgTable(
  "dietPlans",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    trainerUid: text("trainer_uid"),
    title: text("title").notNull(),
    notes: text("notes"),
    meals: jsonb("meals").$type<DietMeal[]>().notNull().default([]),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("diet_plans_user_uq").on(t.userUid)]
);

/* ------------------------------------------------------------------ */
/* workoutSessions/{sessionId}                                         */
/* ------------------------------------------------------------------ */
export const workoutSessions = pgTable(
  "workoutSessions",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    trainerUid: text("trainer_uid"),
    planId: text("plan_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status").notNull().default("completed"),
    exerciseResults: jsonb("exercise_results").$type<ExerciseResult[]>().notNull().default([]),
  },
  (t) => [index("workout_sessions_user_idx").on(t.userUid)]
);

/* ------------------------------------------------------------------ */
/* attendance/{userUid_YYYY-MM-DD} — deterministic, idempotent         */
/* ------------------------------------------------------------------ */
export const attendance = pgTable(
  "attendance",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    trainerUid: text("trainer_uid"),
    date: text("date").notNull(),
    status: text("status").notNull(), // present | absent
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("attendance_user_date_uq").on(t.userUid, t.date), index("attendance_trainer_idx").on(t.trainerUid)]
);

/* ------------------------------------------------------------------ */
/* trainerAttendance/{trainerUid_YYYY-MM-DD} — marked by the ADMIN     */
/* ------------------------------------------------------------------ */
export const trainerAttendance = pgTable(
  "trainerAttendance",
  {
    id: text("id").primaryKey(),
    trainerUid: text("trainer_uid").notNull(),
    markedByUid: text("marked_by_uid"),
    date: text("date").notNull(),
    status: text("status").notNull(), // present | absent
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("trainer_attendance_trainer_date_uq").on(t.trainerUid, t.date),
    index("trainer_attendance_date_idx").on(t.date),
  ]
);



/* ------------------------------------------------------------------ */
/* trainerRequests/{requestId}                                         */
/* ------------------------------------------------------------------ */
export const trainerRequests = pgTable(
  "trainerRequests",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    trainerUid: text("trainer_uid").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("trainer_requests_user_trainer_uq").on(t.userUid, t.trainerUid),
    index("trainer_requests_trainer_idx").on(t.trainerUid, t.status),
  ]
);

/* ------------------------------------------------------------------ */
/* progress/{progressId} — weight / measurement logs                   */
/* ------------------------------------------------------------------ */
export const progress = pgTable(
  "progress",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    date: text("date").notNull(),
    weight: doublePrecision("weight"),
    bmi: doublePrecision("bmi"),
    measurements: jsonb("measurements").$type<Measurements>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("progress_user_idx").on(t.userUid, t.date)]
);

/* ------------------------------------------------------------------ */
/* progressPhotos/{photoId} — UID scoped storage                       */
/* ------------------------------------------------------------------ */
export const progressPhotos = pgTable(
  "progressPhotos",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    storagePath: text("storage_path").notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    date: text("date").notNull(),
    category: text("category").notNull().default("general"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("progress_photos_user_idx").on(t.userUid)]
);

/* ------------------------------------------------------------------ */
/* calculations/{calcId}                                               */
/* ------------------------------------------------------------------ */
export const calculations = pgTable(
  "calculations",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    type: text("type").notNull(), // bmi | bmr | calories
    inputs: jsonb("inputs").$type<Record<string, number | string>>().notNull(),
    result: text("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("calculations_user_idx").on(t.userUid, t.createdAt)]
);

/* ------------------------------------------------------------------ */
/* notifications/{notificationId}                                      */
/* ------------------------------------------------------------------ */
export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientUid: text("recipient_uid").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    actionRef: text("action_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_recipient_idx").on(t.recipientUid, t.createdAt)]
);

/* ------------------------------------------------------------------ */
/* reports/{reportId}                                                  */
/* ------------------------------------------------------------------ */
export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    userName: text("user_name").notNull(),
    userEmail: text("user_email").notNull(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("reports_status_idx").on(t.status, t.createdAt)]
);

/* ------------------------------------------------------------------ */
/* gymHolidays/{holidayId}                                             */
/* ------------------------------------------------------------------ */
export const gymHolidays = pgTable("gymHolidays", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  reason: text("reason"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* payments/{paymentId} — renewal payment requests                     */
/* ------------------------------------------------------------------ */
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userUid: text("user_uid").notNull(),
    userName: text("user_name").notNull(),
    amount: integer("amount").notNull(),
    status: text("status").notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("payments_status_idx").on(t.status, t.createdAt)]
);

/* ------------------------------------------------------------------ */
/* adminAuditLogs/{logId}                                              */
/* ------------------------------------------------------------------ */
export const adminAuditLogs = pgTable(
  "adminAuditLogs",
  {
    id: text("id").primaryKey(),
    adminUid: text("admin_uid").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_audit_created_idx").on(t.createdAt)]
);

/* ------------------------------------------------------------------ */
/* authSessions — server-side session tokens                           */
/* ------------------------------------------------------------------ */
export const authSessions = pgTable("authSessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
