import { randomUUID } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { memberships, notifications, payments, reports, users } from "@/db/schema";
import { ApiError } from "@/lib/auth";
import { NOTIF_TYPES } from "@/lib/constants";
import type { NotificationDTO, PaymentDTO, ReportDTO } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export async function createNotification(
  recipientUid: string,
  data: { type: string; title: string; body: string; actionRef?: string }
): Promise<void> {
  await db.insert(notifications).values({
    id: randomUUID(),
    recipientUid,
    type: data.type,
    title: data.title,
    body: data.body,
    actionRef: data.actionRef ?? null,
  });
}

export async function notifyAdmins(data: { type: string; title: string; body: string; actionRef?: string }): Promise<void> {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  for (const a of admins) {
    await createNotification(a.id, data);
  }
}

export async function listNotifications(uid: string, limit = 30): Promise<NotificationDTO[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUid, uid))
    .orderBy(sql`${notifications.createdAt} desc`)
    .limit(limit);
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    actionRef: n.actionRef,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function unreadCount(uid: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.recipientUid, uid), isNull(notifications.readAt)));
  return row?.count ?? 0;
}

export async function markNotificationsRead(uid: string, id?: string, all = false): Promise<void> {
  if (all) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.recipientUid, uid), isNull(notifications.readAt)));
    return;
  }
  if (!id) throw new ApiError(400, "Missing notification id.");
  const [n] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  if (!n || n.recipientUid !== uid) throw new ApiError(404, "Notification not found.");
  await db.update(notifications).set({ readAt: n.readAt ?? new Date() }).where(eq(notifications.id, id));
}

export async function dismissNotification(uid: string, id: string): Promise<void> {
  const [n] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  if (!n || n.recipientUid !== uid) throw new ApiError(404, "Notification not found.");
  await db.delete(notifications).where(eq(notifications.id, id));
}

/* ------------------------------------------------------------------ */
/* Payments — renewal payment requests                                 */
/* ------------------------------------------------------------------ */

export async function requestPayment(userUid: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userUid)).limit(1);
  const [membership] = await db.select().from(memberships).where(eq(memberships.userUid, userUid)).limit(1);
  if (!user || !membership) throw new ApiError(404, "No membership found.");
  if (membership.dueAmount <= 0) throw new ApiError(400, "You have no payment due.");

  const [open] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userUid, userUid), eq(payments.status, "requested")))
    .limit(1);
  if (open) throw new ApiError(409, "A payment request is already open.");

  await db.insert(payments).values({
    id: randomUUID(),
    userUid,
    userName: user.name,
    amount: membership.dueAmount,
    status: "requested",
  });

  await notifyAdmins({
    type: NOTIF_TYPES.PAYMENT_REQUESTED,
    title: "Payment request",
    body: `${user.name} requested a payment of ₹${membership.dueAmount.toLocaleString("en-IN")}.`,
    actionRef: "/app/admin/requests",
  });
}

export async function getUserPayments(userUid: string): Promise<PaymentDTO[]> {
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.userUid, userUid))
    .orderBy(sql`${payments.createdAt} desc`)
    .limit(10);
  return rows.map((p) => ({
    id: p.id,
    userUid: p.userUid,
    userName: p.userName,
    amount: p.amount,
    status: p.status as PaymentDTO["status"],
    createdAt: p.createdAt.toISOString(),
  }));
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export async function submitReport(
  userUid: string,
  data: { type: string; description: string }
): Promise<ReportDTO> {
  const [user] = await db.select().from(users).where(eq(users.id, userUid)).limit(1);
  if (!user) throw new ApiError(404, "Account not found.");
  const id = randomUUID();
  await db.insert(reports).values({
    id,
    userUid,
    userName: user.name,
    userEmail: user.email,
    type: data.type,
    description: data.description.trim(),
    status: "pending",
  });
  await notifyAdmins({
    type: "report_submitted",
    title: "New report",
    body: `${user.name} submitted a problem report.`,
    actionRef: "/app/admin/reports",
  });
  return {
    id,
    userUid,
    userName: user.name,
    userEmail: user.email,
    type: data.type,
    description: data.description.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

export async function getUserReports(userUid: string): Promise<ReportDTO[]> {
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.userUid, userUid))
    .orderBy(sql`${reports.createdAt} desc`)
    .limit(20);
  return rows.map((r) => ({
    id: r.id,
    userUid: r.userUid,
    userName: r.userName,
    userEmail: r.userEmail,
    type: r.type,
    description: r.description,
    status: r.status as ReportDTO["status"],
    createdAt: r.createdAt.toISOString(),
  }));
}
