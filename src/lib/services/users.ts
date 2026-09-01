import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { gymHolidays, memberships, notifications, payments, trainerRequests, trainers, users } from "@/db/schema";
import { ApiError } from "@/lib/auth";
import { APPROVAL, NOTIF_TYPES } from "@/lib/constants";
import { createNotification } from "./notifications";
import type {
  EmergencyContact,
  MeUser,
  TrainerDTO,
  TrainerRequestDTO,
  UserBundle,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function toTrainerDTO(t: typeof trainers.$inferSelect): TrainerDTO {
  return {
    uid: t.uid,
    name: t.name,
    qualification: t.qualification,
    experience: t.experience,
    bio: t.bio,
    photoUrl: t.photoUrl,
    availability: t.availability,
    approvalStatus: t.approvalStatus as TrainerDTO["approvalStatus"],
    adminApproval: t.adminApproval as TrainerDTO["adminApproval"],
    isActive: t.isActive,
  };
}

export async function toMeUser(u: typeof users.$inferSelect): Promise<MeUser> {
  let trainer: TrainerDTO | null = null;
  if (u.role === "trainer" || u.role === "admin") {
    const [t] = await db.select().from(trainers).where(eq(trainers.uid, u.id)).limit(1);
    if (t) trainer = toTrainerDTO(t);
  }
  return {
    id: u.id,
    role: u.role as MeUser["role"],
    name: u.name,
    email: u.email,
    phone: u.phone,
    photoUrl: u.photoUrl,
    heightCm: u.heightCm,
    emergencyContact: u.emergencyContact ?? null,
    theme: (u.theme as MeUser["theme"]) ?? "system",
    language: u.language ?? "en",
    approvalStatus: u.approvalStatus as MeUser["approvalStatus"],
    assignedTrainerUid: u.assignedTrainerUid,
    sessionTime: u.sessionTime,
    trainer,
  };
}

/* ------------------------------------------------------------------ */
/* Profile bundle for the user Home screen                             */
/* ------------------------------------------------------------------ */

export async function getUserBundle(uid: string): Promise<UserBundle> {
  const [u] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!u) throw new ApiError(404, "Account not found.");

  const [membership] = await db.select().from(memberships).where(eq(memberships.userUid, uid)).limit(1);
  let trainer: TrainerDTO | null = null;
  if (u.assignedTrainerUid) {
    const [t] = await db.select().from(trainers).where(eq(trainers.uid, u.assignedTrainerUid)).limit(1);
    if (t) trainer = toTrainerDTO(t);
  }

  const [unread] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.recipientUid, uid), sql`${notifications.readAt} is null`));

  const latest = await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUid, uid))
    .orderBy(sql`${notifications.createdAt} desc`)
    .limit(4);

  const [openPayment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.userUid, uid), eq(payments.status, "requested")))
    .limit(1);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [todayHolidayRow] = await db.select().from(gymHolidays).where(eq(gymHolidays.date, todayStr)).limit(1);

  return {
    user: await toMeUser(u),
    membership: membership ?? null,
    trainer,
    sessionTime: u.sessionTime,
    unreadNotifications: unread?.count ?? 0,
    openPaymentRequest: Boolean(openPayment),
    todayHoliday: todayHolidayRow
      ? { id: todayHolidayRow.id, name: todayHolidayRow.name, reason: todayHolidayRow.reason, date: todayHolidayRow.date }
      : null,
    latestNotifications: latest.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      actionRef: n.actionRef,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Profile + settings updates                                          */
/* ------------------------------------------------------------------ */

export async function updateProfile(
  uid: string,
  fields: { name?: string; phone?: string; photoUrl?: string | null; heightCm?: number | null; emergencyContact?: EmergencyContact }
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.phone !== undefined) patch.phone = fields.phone.trim();
  if (fields.photoUrl !== undefined) patch.photoUrl = fields.photoUrl;
  if (fields.heightCm !== undefined) patch.heightCm = fields.heightCm;
  if (fields.emergencyContact !== undefined) patch.emergencyContact = fields.emergencyContact;
  if (patch.name === "" ) throw new ApiError(400, "Name can't be empty.");
  await db.update(users).set(patch).where(eq(users.id, uid));
}

export async function updateSettings(
  uid: string,
  fields: { theme?: string; notificationPrefs?: { workouts?: boolean; payments?: boolean; announcements?: boolean } }
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.theme) patch.theme = fields.theme;
  if (fields.notificationPrefs) {
    const [u] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    const prefs = { workouts: true, payments: true, announcements: true, ...(u?.notificationPrefs ?? {}), ...fields.notificationPrefs };
    patch.notificationPrefs = prefs;
  }
  await db.update(users).set(patch).where(eq(users.id, uid));
}

/* ------------------------------------------------------------------ */
/* Trainer directory + requests                                        */
/* ------------------------------------------------------------------ */

export async function getApprovedTrainers(): Promise<TrainerDTO[]> {
  const rows = await db
    .select()
    .from(trainers)
    .where(
      and(
        eq(trainers.approvalStatus, APPROVAL.APPROVED),
        eq(trainers.adminApproval, APPROVAL.APPROVED),
        eq(trainers.isActive, true)
      )
    )
    .orderBy(sql`${trainers.name} asc`);
  return rows.map(toTrainerDTO);
}

export async function requestTrainer(userUid: string, trainerUid: string): Promise<void> {
  const [trainer] = await db
    .select()
    .from(trainers)
    .where(
      and(
        eq(trainers.uid, trainerUid),
        eq(trainers.approvalStatus, APPROVAL.APPROVED),
        eq(trainers.adminApproval, APPROVAL.APPROVED),
        eq(trainers.isActive, true)
      )
    )
    .limit(1);
  if (!trainer) throw new ApiError(404, "That trainer is not available.");

  const [existing] = await db
    .select()
    .from(trainerRequests)
    .where(and(eq(trainerRequests.userUid, userUid), eq(trainerRequests.trainerUid, trainerUid)))
    .limit(1);

  if (existing && existing.status === "accepted") {
    throw new ApiError(409, "You already train with this trainer.");
  }
  if (existing && existing.status === "pending") {
    throw new ApiError(409, "Your request is already pending with this trainer.");
  }

  const [user] = await db.select().from(users).where(eq(users.id, userUid)).limit(1);
  if (!user) throw new ApiError(404, "Account not found.");

  if (existing && existing.status === "rejected") {
    await db
      .update(trainerRequests)
      .set({ status: "pending", respondedAt: null, createdAt: new Date() })
      .where(eq(trainerRequests.id, existing.id));
  } else {
    await db.insert(trainerRequests).values({
      id: randomUUID(),
      userUid,
      trainerUid,
      status: "pending",
    });
  }

  await createNotification(trainerUid, {
    type: NOTIF_TYPES.TRAINER_REQUEST,
    title: "New client request",
    body: `${user.name} wants to train with you.`,
    actionRef: "/app/trainer/requests",
  });
}

export async function getUserTrainerRequests(userUid: string): Promise<TrainerRequestDTO[]> {
  const rows = await db
    .select({
      id: trainerRequests.id,
      trainerUid: trainerRequests.trainerUid,
      status: trainerRequests.status,
      createdAt: trainerRequests.createdAt,
      name: trainers.name,
    })
    .from(trainerRequests)
    .innerJoin(trainers, eq(trainerRequests.trainerUid, trainers.uid))
    .where(eq(trainerRequests.userUid, userUid))
    .orderBy(sql`${trainerRequests.createdAt} desc`)
    .limit(20);
  return rows.map((r) => ({
    id: r.id,
    userUid,
    trainerUid: r.trainerUid,
    status: r.status as TrainerRequestDTO["status"],
    userName: r.name,
    userPhoto: null,
    createdAt: r.createdAt.toISOString(),
  }));
}
