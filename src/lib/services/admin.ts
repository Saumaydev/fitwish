import { randomUUID } from "crypto";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminAuditLogs,
  attendance,
  authSessions,
  calculations,
  dietPlans,
  gymHolidays,
  memberships,
  notifications,
  payments,
  progress,
  progressPhotos,
  reports,
  trainerAttendance,
  trainerRequests,
  trainers,
  users,
  workoutPlans,
  workoutSessions,
} from "@/db/schema";
import { ApiError } from "@/lib/auth";
import { APPROVAL, NOTIF_TYPES } from "@/lib/constants";
import { addMonths, membershipState } from "@/lib/format";
import { createNotification, notifyAdmins } from "./notifications";
import { toMeUser } from "./users";
import type {
  AdminDashboardDTO,
  AdminMemberDTO,
  AdminTrainerDTO,
  AuditDTO,
  HolidayDTO,
  MemberRowDTO,
  Paginated,
  PaymentDTO,
  ReportDTO,
  TrainerAttendanceDayDTO,
  TrainerAttendanceHistoryDTO,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Audit logging                                                       */
/* ------------------------------------------------------------------ */

export async function audit(adminUid: string, action: string, targetType: string, targetId: string | null, metadata?: Record<string, unknown>) {
  await db.insert(adminAuditLogs).values({
    id: randomUUID(),
    adminUid,
    action,
    targetType,
    targetId,
    metadata: metadata ?? null,
  });
}

export async function listAudit(limit = 12): Promise<AuditDTO[]> {
  const rows = await db
    .select({
      log: adminAuditLogs,
      name: users.name,
    })
    .from(adminAuditLogs)
    .leftJoin(users, eq(adminAuditLogs.adminUid, users.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.log.id,
    adminUid: r.log.adminUid,
    adminName: r.name ?? null,
    action: r.log.action,
    targetType: r.log.targetType,
    targetId: r.log.targetId,
    createdAt: r.log.createdAt.toISOString(),
  }));
}

/* ------------------------------------------------------------------ */
/* Dashboard aggregates (count queries — no full downloads)            */
/* ------------------------------------------------------------------ */

export async function getDashboard(adminUid: string): Promise<AdminDashboardDTO> {
  const [totalUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "user"));
  const [pendingMembers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "user"), eq(users.approvalStatus, APPROVAL.PENDING)));
  const [totalTrainers] = await db.select({ count: sql<number>`count(*)::int` }).from(trainers);
  const [activeTrainers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trainers)
    .where(and(eq(trainers.approvalStatus, APPROVAL.APPROVED), eq(trainers.isActive, true)));
  const [pendingTrainers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trainers)
    .where(eq(trainers.approvalStatus, APPROVAL.PENDING));
  const [totalMemberships] = await db.select({ count: sql<number>`count(*)::int` }).from(memberships);
  const allMemberships = await db.select().from(memberships);
  const expiring = allMemberships.filter((m) => membershipState(m) === "expiring").length;
  const expired = allMemberships.filter((m) => membershipState(m) === "expired").length;
  const [due] = await db
    .select({ sum: sql<number>`coalesce(sum(${memberships.dueAmount}), 0)::int` })
    .from(memberships)
    .where(sql`${memberships.dueAmount} > 0`);
  const [pendingReports] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(and(or(eq(reports.status, "pending"), eq(reports.status, "open"))));
  const [pendingPayments] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(eq(payments.status, "requested"));

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [attToday] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendance)
    .where(and(eq(attendance.date, todayStr), eq(attendance.status, "present")));

  const since = new Date(Date.now() - 14 * 86400000);
  const signupsRaw = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(and(eq(users.role, "user"), sql`${users.createdAt} >= ${since}`));
  const signupsMap = new Map<string, number>();
  for (const s of signupsRaw) {
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}-${String(s.createdAt.getDate()).padStart(2, "0")}`;
    signupsMap.set(key, (signupsMap.get(key) ?? 0) + 1);
  }
  const signups: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    signups.push({ date: key.slice(5), count: signupsMap.get(key) ?? 0 });
  }

  return {
    totalUsers: totalUsers?.count ?? 0,
    pendingMemberApprovals: pendingMembers?.count ?? 0,
    totalTrainers: totalTrainers?.count ?? 0,
    activeTrainers: activeTrainers?.count ?? 0,
    inactiveTrainers: (totalTrainers?.count ?? 0) - (activeTrainers?.count ?? 0),
    pendingTrainerApprovals: pendingTrainers?.count ?? 0,
    activeMemberships: totalMemberships?.count ?? 0,
    expiringMemberships: expiring,
    expiredMemberships: expired,
    totalDue: due?.sum ?? 0,
    pendingReports: pendingReports?.count ?? 0,
    pendingPayments: pendingPayments?.count ?? 0,
    attendanceToday: attToday?.count ?? 0,
    signups,
    recentAudit: await listAudit(8),
  };
}

/* ------------------------------------------------------------------ */
/* Members                                                             */
/* ------------------------------------------------------------------ */

export async function listMembers(
  adminUid: string,
  opts: { q?: string; filter?: string; page?: number; pageSize?: number }
): Promise<Paginated<MemberRowDTO>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, opts.pageSize ?? 12));
  const conds = [eq(users.role, "user")] as ReturnType<typeof and>[];
  const where: ReturnType<typeof or>[] = [];
  if (opts.q) {
    const q = `%${opts.q.trim().toLowerCase()}%`;
    where.push(ilike(users.name, q), ilike(users.email, q), ilike(users.phone, q));
    conds.push(or(...where));
  }
  if (opts.filter === "pending") conds.push(eq(users.approvalStatus, APPROVAL.PENDING));
  if (opts.filter === "rejected") conds.push(eq(users.approvalStatus, APPROVAL.REJECTED));

  const base = and(...conds);
  const [totalRow] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(base);

  const rows = await db
    .select({
      user: users,
      membership: memberships,
      trainerName: trainers.name,
    })
    .from(users)
    .leftJoin(memberships, eq(memberships.userUid, users.id))
    .leftJoin(trainers, eq(trainers.uid, users.assignedTrainerUid))
    .where(base)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  let items: MemberRowDTO[] = rows.map((r) => ({
    uid: r.user.id,
    name: r.user.name,
    email: r.user.email,
    phone: r.user.phone,
    photoUrl: r.user.photoUrl,
    approvalStatus: r.user.approvalStatus as MemberRowDTO["approvalStatus"],
    plan: r.membership?.plan ?? null,
    membershipStatus: r.membership ? membershipState(r.membership) : null,
    dueAmount: r.membership?.dueAmount ?? null,
    trainerName: r.trainerName ?? null,
    sessionTime: r.user.sessionTime,
    createdAt: r.user.createdAt.toISOString(),
  }));

  if (opts.filter === "due") items = items.filter((m) => (m.dueAmount ?? 0) > 0);
  if (opts.filter === "expiring") items = items.filter((m) => m.membershipStatus === "expiring");
  if (opts.filter === "no-membership") items = items.filter((m) => !m.plan);

  return { items, total: totalRow?.count ?? 0, page, pageSize };
}

export async function getMemberDetail(adminUid: string, memberUid: string): Promise<AdminMemberDTO> {
  const [user] = await db.select().from(users).where(eq(users.id, memberUid)).limit(1);
  if (!user || user.role !== "user") throw new ApiError(404, "Member not found.");

  const [membership] = await db.select().from(memberships).where(eq(memberships.userUid, memberUid)).limit(1);
  let assignedTrainer = null;
  if (user.assignedTrainerUid) {
    const [t] = await db.select().from(trainers).where(eq(trainers.uid, user.assignedTrainerUid)).limit(1);
    if (t) assignedTrainer = t;
  }
  const [att] = await db
    .select({
      present: sql<number>`count(*) filter (where ${attendance.status} = 'present')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(attendance)
    .where(eq(attendance.userUid, memberUid));
  const entries = await db
    .select()
    .from(progress)
    .where(eq(progress.userUid, memberUid))
    .orderBy(sql`${progress.date} desc`)
    .limit(20);
  const [workouts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workoutSessions)
    .where(eq(workoutSessions.userUid, memberUid));

  return {
    user: await toMeUser(user),
    membership: membership ?? null,
    trainer: null,
    assignedTrainer: assignedTrainer
      ? {
          uid: assignedTrainer.uid,
          name: assignedTrainer.name,
          qualification: assignedTrainer.qualification,
          experience: assignedTrainer.experience,
          bio: assignedTrainer.bio,
          photoUrl: assignedTrainer.photoUrl,
          availability: assignedTrainer.availability,
          approvalStatus: assignedTrainer.approvalStatus as AdminTrainerDTO["trainer"]["approvalStatus"],
          adminApproval: assignedTrainer.adminApproval as AdminTrainerDTO["trainer"]["adminApproval"],
          isActive: assignedTrainer.isActive,
        }
      : null,
    attendance: {
      total: att?.total ?? 0,
      present: att?.present ?? 0,
      absent: (att?.total ?? 0) - (att?.present ?? 0),
      percent: att?.total ? Math.round(((att?.present ?? 0) / att.total) * 100) : 0,
    },
    entries: entries.map((e) => ({
      id: e.id,
      date: e.date,
      weight: e.weight,
      bmi: e.bmi,
      measurements: e.measurements ?? null,
    })),
    workoutCount: workouts?.count ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Member approval (admin-gated member signup)                         */
/* ------------------------------------------------------------------ */

export async function approveMember(adminUid: string, memberUid: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, memberUid)).limit(1);
  if (!user || user.role !== "user") throw new ApiError(404, "Member not found.");
  await db.update(users).set({ approvalStatus: APPROVAL.APPROVED, updatedAt: new Date() }).where(eq(users.id, memberUid));
  await audit(adminUid, "approve_member", "user", memberUid, { name: user.name });
  await createNotification(memberUid, {
    type: NOTIF_TYPES.MEMBER_APPROVED,
    title: "Welcome to FitWish!",
    body: "Your membership account was approved by the gym admin. You can now sign in.",
    actionRef: "/app/user/home",
  });
}

export async function rejectMember(adminUid: string, memberUid: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, memberUid)).limit(1);
  if (!user || user.role !== "user") throw new ApiError(404, "Member not found.");
  await db.update(users).set({ approvalStatus: APPROVAL.REJECTED, updatedAt: new Date() }).where(eq(users.id, memberUid));
  await audit(adminUid, "reject_member", "user", memberUid, { name: user.name });
  await createNotification(memberUid, {
    type: NOTIF_TYPES.MEMBER_REJECTED,
    title: "Registration declined",
    body: "Your FitWish registration was declined. Please contact the gym front desk.",
  });
}

export async function deactivateMember(adminUid: string, memberUid: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, memberUid)).limit(1);
  if (!user || user.role !== "user") throw new ApiError(404, "Member not found.");
  await db.update(users).set({ approvalStatus: APPROVAL.REJECTED, updatedAt: new Date() }).where(eq(users.id, memberUid));
  await audit(adminUid, "deactivate_member", "user", memberUid, { name: user.name });
  await createNotification(memberUid, {
    type: NOTIF_TYPES.MEMBER_DEACTIVATED,
    title: "Account deactivated",
    body: "Your gym membership account was deactivated by the gym admin. Please contact the front desk.",
  });
}

export async function activateMember(adminUid: string, memberUid: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, memberUid)).limit(1);
  if (!user || user.role !== "user") throw new ApiError(404, "Member not found.");
  await db.update(users).set({ approvalStatus: APPROVAL.APPROVED, updatedAt: new Date() }).where(eq(users.id, memberUid));
  await audit(adminUid, "activate_member", "user", memberUid, { name: user.name });
  await createNotification(memberUid, {
    type: NOTIF_TYPES.MEMBER_APPROVED,
    title: "Account reactivated",
    body: "Your gym membership account was reactivated by the gym admin. You can sign in again.",
  });
}

/* ------------------------------------------------------------------ */
/* Trainers                                                            */
/* ------------------------------------------------------------------ */

export async function listTrainersAdmin(adminUid: string): Promise<AdminTrainerDTO[]> {
  const rows = await db
    .select({
      trainer: trainers,
      email: users.email,
      phone: users.phone,
    })
    .from(trainers)
    .leftJoin(users, eq(trainers.uid, users.id))
    .orderBy(desc(trainers.createdAt));

  const result: AdminTrainerDTO[] = [];
  for (const r of rows) {
    const [clients] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.assignedTrainerUid, r.trainer.uid), eq(users.role, "user")));
    result.push({
      trainer: {
        uid: r.trainer.uid,
        name: r.trainer.name,
        qualification: r.trainer.qualification,
        experience: r.trainer.experience,
        bio: r.trainer.bio,
        photoUrl: r.trainer.photoUrl,
        availability: r.trainer.availability,
        approvalStatus: r.trainer.approvalStatus as AdminTrainerDTO["trainer"]["approvalStatus"],
        adminApproval: r.trainer.adminApproval as AdminTrainerDTO["trainer"]["adminApproval"],
        isActive: r.trainer.isActive,
      },
      email: r.email ?? null,
      phone: r.phone ?? null,
      clientCount: clients?.count ?? 0,
      createdAt: r.trainer.createdAt.toISOString(),
    });
  }
  return result;
}

export async function approveTrainer(adminUid: string, trainerUid: string): Promise<void> {
  const [trainer] = await db.select().from(trainers).where(eq(trainers.uid, trainerUid)).limit(1);
  if (!trainer) throw new ApiError(404, "Trainer not found.");
  await db
    .update(trainers)
    .set({ approvalStatus: APPROVAL.APPROVED, adminApproval: APPROVAL.APPROVED, isActive: true, updatedAt: new Date() })
    .where(eq(trainers.uid, trainerUid));
  await db.update(users).set({ approvalStatus: APPROVAL.APPROVED, updatedAt: new Date() }).where(eq(users.id, trainerUid));
  await audit(adminUid, "approve_trainer", "trainer", trainerUid, { name: trainer.name });
  await createNotification(trainerUid, {
    type: NOTIF_TYPES.TRAINER_APPROVED,
    title: "You're approved!",
    body: "The gym admin approved your trainer account. You can now access the trainer panel.",
    actionRef: "/app/trainer/home",
  });
}

export async function rejectTrainer(adminUid: string, trainerUid: string): Promise<void> {
  const [trainer] = await db.select().from(trainers).where(eq(trainers.uid, trainerUid)).limit(1);
  if (!trainer) throw new ApiError(404, "Trainer not found.");
  await db
    .update(trainers)
    .set({ approvalStatus: APPROVAL.REJECTED, adminApproval: APPROVAL.REJECTED, isActive: false, updatedAt: new Date() })
    .where(eq(trainers.uid, trainerUid));
  await db.update(users).set({ approvalStatus: APPROVAL.REJECTED, updatedAt: new Date() }).where(eq(users.id, trainerUid));
  await audit(adminUid, "reject_trainer", "trainer", trainerUid, { name: trainer.name });
  await createNotification(trainerUid, {
    type: NOTIF_TYPES.TRAINER_REJECTED_BY_ADMIN,
    title: "Application declined",
    body: "Your trainer application was declined by the gym admin.",
  });
}

export async function deactivateTrainer(adminUid: string, trainerUid: string): Promise<void> {
  const [trainer] = await db.select().from(trainers).where(eq(trainers.uid, trainerUid)).limit(1);
  if (!trainer) throw new ApiError(404, "Trainer not found.");
  await db.update(trainers).set({ isActive: false, updatedAt: new Date() }).where(eq(trainers.uid, trainerUid));
  await audit(adminUid, "deactivate_trainer", "trainer", trainerUid, { name: trainer.name });
  await createNotification(trainerUid, {
    type: NOTIF_TYPES.TRAINER_DEACTIVATED,
    title: "Account deactivated",
    body: "Your trainer access was deactivated by the gym admin.",
  });
}

export async function activateTrainer(adminUid: string, trainerUid: string): Promise<void> {
  const [trainer] = await db.select().from(trainers).where(eq(trainers.uid, trainerUid)).limit(1);
  if (!trainer) throw new ApiError(404, "Trainer not found.");
  await db
    .update(trainers)
    .set({ isActive: true, approvalStatus: APPROVAL.APPROVED, adminApproval: APPROVAL.APPROVED, updatedAt: new Date() })
    .where(eq(trainers.uid, trainerUid));
  await audit(adminUid, "activate_trainer", "trainer", trainerUid, { name: trainer.name });
  await createNotification(trainerUid, {
    type: NOTIF_TYPES.TRAINER_APPROVED,
    title: "Account reactivated",
    body: "Your trainer access was reactivated by the gym admin.",
  });
}

/* ------------------------------------------------------------------ */
/* Membership management                                               */
/* ------------------------------------------------------------------ */

export interface MembershipInput {
  plan: string;
  startDate: string;
  durationMonths: number;
  totalAmount: number;
  paidAmount: number;
}

export async function updateMembership(
  adminUid: string,
  memberUid: string,
  input: MembershipInput
): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, memberUid)).limit(1);
  if (!user || user.role !== "user") throw new ApiError(404, "Member not found.");

  const startDate = input.startDate;
  const durationMonths = Math.max(1, Math.min(60, Math.round(input.durationMonths)));
  const expiryDate = addMonths(startDate, durationMonths);
  const totalAmount = Math.max(0, Math.round(input.totalAmount));
  const paidAmount = Math.max(0, Math.round(input.paidAmount));
  const dueAmount = Math.max(0, totalAmount - paidAmount);
  const paymentStatus = dueAmount === 0 ? "paid" : paidAmount > 0 ? "partial" : "due";

  const [existing] = await db.select().from(memberships).where(eq(memberships.userUid, memberUid)).limit(1);
  if (existing) {
    await db
      .update(memberships)
      .set({
        plan: input.plan,
        startDate,
        durationMonths,
        expiryDate,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(memberships.id, existing.id));
  } else {
    await db.insert(memberships).values({
      id: randomUUID(),
      userUid: memberUid,
      plan: input.plan,
      startDate,
      durationMonths,
      expiryDate,
      totalAmount,
      paidAmount,
      dueAmount,
      paymentStatus,
    });
  }

  await audit(adminUid, "update_membership", "user", memberUid, {
    name: user.name,
    plan: input.plan,
    dueAmount,
  });
  await createNotification(memberUid, {
    type: NOTIF_TYPES.MEMBERSHIP_UPDATED,
    title: "Membership updated",
    body: `Your ${input.plan} membership was updated. Expiry: ${expiryDate.split("-").reverse().join("/")}, Due: ₹${dueAmount.toLocaleString("en-IN")}.`,
    actionRef: "/app/user/home",
  });
}

/* ------------------------------------------------------------------ */
/* Trainer assignment                                                  */
/* ------------------------------------------------------------------ */

export async function assignTrainer(adminUid: string, memberUid: string, trainerUid: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, memberUid)).limit(1);
  if (!user || user.role !== "user") throw new ApiError(404, "Member not found.");

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
  if (!trainer) throw new ApiError(404, "Choose an active, approved trainer.");

  await db.update(users).set({ assignedTrainerUid: trainerUid, updatedAt: new Date() }).where(eq(users.id, memberUid));
  await audit(adminUid, "assign_trainer", "user", memberUid, { trainerUid, trainerName: trainer.name });
  await createNotification(memberUid, {
    type: NOTIF_TYPES.SESSION_TIME,
    title: "Trainer assigned",
    body: `The gym admin assigned you to trainer ${trainer.name}.`,
    actionRef: "/app/user/home",
  });
  await createNotification(trainerUid, {
    type: NOTIF_TYPES.TRAINER_REQUEST,
    title: "New client assigned",
    body: `${user.name} was assigned to you by the gym admin.`,
    actionRef: "/app/trainer/clients",
  });
}

/* ------------------------------------------------------------------ */
/* Trainer attendance — marked by the ADMIN                            */
/* ------------------------------------------------------------------ */

export async function listTrainerAttendance(date: string): Promise<TrainerAttendanceDayDTO> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, "Invalid date.");

  const trainerRows = await db
    .select({
      uid: trainers.uid,
      name: trainers.name,
      photoUrl: trainers.photoUrl,
      approvalStatus: trainers.approvalStatus,
      isActive: trainers.isActive,
    })
    .from(trainers)
    .orderBy(sql`${trainers.name} asc`);

  const marks = await db.select().from(trainerAttendance).where(eq(trainerAttendance.date, date));
  const byTrainer = new Map(marks.map((m) => [m.trainerUid, m.status as "present" | "absent"]));

  const rows = trainerRows
    .filter((t) => t.approvalStatus === APPROVAL.APPROVED)
    .map((t) => ({
      trainerUid: t.uid,
      name: t.name,
      photoUrl: t.photoUrl,
      status: byTrainer.get(t.uid) ?? null,
    }));

  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;

  return { date, rows, present, absent, unmarked: rows.length - present - absent };
}

export async function markTrainerAttendance(
  adminUid: string,
  data: { trainerUid: string; date: string; status: "present" | "absent" }
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new ApiError(400, "Invalid date.");
  const [trainer] = await db.select().from(trainers).where(eq(trainers.uid, data.trainerUid)).limit(1);
  if (!trainer) throw new ApiError(404, "Trainer not found.");

  const id = `${data.trainerUid}_${data.date}`;
  const [existing] = await db.select().from(trainerAttendance).where(eq(trainerAttendance.id, id)).limit(1);
  if (existing) {
    if (existing.status === data.status) return; // idempotent
    await db
      .update(trainerAttendance)
      .set({ status: data.status, markedByUid: adminUid, updatedAt: new Date() })
      .where(eq(trainerAttendance.id, id));
  } else {
    await db.insert(trainerAttendance).values({
      id,
      trainerUid: data.trainerUid,
      markedByUid: adminUid,
      date: data.date,
      status: data.status,
    });
  }

  await audit(adminUid, "mark_trainer_attendance", "trainer", data.trainerUid, {
    date: data.date,
    status: data.status,
  });
  await createNotification(data.trainerUid, {
    type: "trainer_attendance",
    title: "Attendance marked",
    body: `The gym admin marked you ${data.status} for ${data.date}.`,
    actionRef: "/app/trainer/home",
  });
}

export async function listTrainerAttendanceHistory(limit = 60): Promise<TrainerAttendanceHistoryDTO[]> {
  const rows = await db
    .select({
      id: trainerAttendance.id,
      trainerUid: trainerAttendance.trainerUid,
      date: trainerAttendance.date,
      status: trainerAttendance.status,
      name: trainers.name,
    })
    .from(trainerAttendance)
    .innerJoin(trainers, eq(trainerAttendance.trainerUid, trainers.uid))
    .orderBy(sql`${trainerAttendance.date} desc, ${trainerAttendance.updatedAt} desc`)
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    trainerUid: r.trainerUid,
    trainerName: r.name,
    date: r.date,
    status: r.status as "present" | "absent",
  }));
}

/* ------------------------------------------------------------------ */
/* Holidays                                                            */
/* ------------------------------------------------------------------ */

export async function listHolidays(): Promise<HolidayDTO[]> {
  const rows = await db.select().from(gymHolidays).orderBy(sql`${gymHolidays.date} asc`);
  return rows.map((h) => ({ id: h.id, name: h.name, reason: h.reason, date: h.date }));
}

export async function createHoliday(adminUid: string, data: { name: string; reason: string; date: string }): Promise<void> {
  if (!data.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new ApiError(400, "Enter a name and a valid date.");
  await db.insert(gymHolidays).values({ id: randomUUID(), name: data.name.trim(), reason: data.reason.trim() || null, date: data.date });
  await audit(adminUid, "create_holiday", "holiday", null, { name: data.name.trim(), date: data.date });
}

export async function updateHoliday(adminUid: string, id: string, data: { name: string; reason: string; date: string }): Promise<void> {
  await db
    .update(gymHolidays)
    .set({ name: data.name.trim(), reason: data.reason.trim() || null, date: data.date, updatedAt: new Date() })
    .where(eq(gymHolidays.id, id));
  await audit(adminUid, "update_holiday", "holiday", id);
}

export async function deleteHoliday(adminUid: string, id: string): Promise<void> {
  await db.delete(gymHolidays).where(eq(gymHolidays.id, id));
  await audit(adminUid, "delete_holiday", "holiday", id);
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export async function listReportsAdmin(filter: string): Promise<ReportDTO[]> {
  const rows = await db
    .select()
    .from(reports)
    .orderBy(desc(reports.createdAt))
    .limit(100);
  return rows
    .filter((r) => (filter === "all" ? true : filter === "open" ? r.status !== "resolved" : r.status === filter))
    .map((r) => ({
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

export async function updateReportStatus(adminUid: string, id: string, status: "pending" | "open" | "resolved"): Promise<void> {
  const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!report) throw new ApiError(404, "Report not found.");
  await db
    .update(reports)
    .set({ status, resolvedAt: status === "resolved" ? new Date() : null })
    .where(eq(reports.id, id));
  await audit(adminUid, `report_${status}`, "report", id);
  await createNotification(report.userUid, {
    type: NOTIF_TYPES.REPORT_STATUS,
    title: "Report status updated",
    body: `Your report is now ${status === "resolved" ? "resolved" : status}.`,
    actionRef: "/app/user/settings",
  });
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export async function listPaymentsAdmin(filter: string): Promise<PaymentDTO[]> {
  const rows = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(100);
  return rows
    .filter((p) => (filter === "all" ? true : p.status === filter))
    .map((p) => ({
      id: p.id,
      userUid: p.userUid,
      userName: p.userName,
      amount: p.amount,
      status: p.status as PaymentDTO["status"],
      createdAt: p.createdAt.toISOString(),
    }));
}

export async function markPaymentReceived(adminUid: string, paymentId: string): Promise<void> {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) throw new ApiError(404, "Payment request not found.");
  if (payment.status === "received") return; // idempotent

  await db.transaction(async (tx) => {
    const [recheck] = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!recheck || recheck.status !== "requested") return;
    await tx.update(payments).set({ status: "received", resolvedAt: new Date() }).where(eq(payments.id, paymentId));
    const [membership] = await tx.select().from(memberships).where(eq(memberships.userUid, payment.userUid)).limit(1);
    if (membership) {
      const paidAmount = membership.paidAmount + payment.amount;
      const dueAmount = Math.max(0, membership.totalAmount - paidAmount);
      await tx
        .update(memberships)
        .set({
          paidAmount,
          dueAmount,
          paymentStatus: dueAmount === 0 ? "paid" : "partial",
          updatedAt: new Date(),
        })
        .where(eq(memberships.id, membership.id));
    }
  });

  await audit(adminUid, "payment_received", "payment", paymentId, { amount: payment.amount, userName: payment.userName });
  await createNotification(payment.userUid, {
    type: NOTIF_TYPES.PAYMENT_RECEIVED,
    title: "Payment received",
    body: `Your payment of ₹${payment.amount.toLocaleString("en-IN")} was recorded by the gym admin.`,
    actionRef: "/app/user/home",
  });
}

/* ------------------------------------------------------------------ */
/* Admin notifications                                                 */
/* ------------------------------------------------------------------ */

export async function sendNotification(
  adminUid: string,
  data: { audience: "all" | "users" | "trainers" | "single"; userUid?: string; title: string; body: string }
): Promise<number> {
  if (!data.title.trim() || !data.body.trim()) throw new ApiError(400, "Title and message are required.");
  let recipients: { id: string }[] = [];
  if (data.audience === "single") {
    if (!data.userUid) throw new ApiError(400, "Pick a recipient.");
    recipients = [{ id: data.userUid }];
  } else {
    const cond =
      data.audience === "users"
        ? eq(users.role, "user")
        : data.audience === "trainers"
          ? eq(users.role, "trainer")
          : or(eq(users.role, "user"), eq(users.role, "trainer"));
    recipients = await db.select({ id: users.id }).from(users).where(cond);
  }
  for (const r of recipients) {
    await createNotification(r.id, {
      type: NOTIF_TYPES.ANNOUNCEMENT,
      title: data.title.trim(),
      body: data.body.trim(),
    });
  }
  await audit(adminUid, "send_notification", "notification", null, { audience: data.audience, count: recipients.length });
  return recipients.length;
}

export async function listAllNotificationsAdmin(limit = 50) {
  const rows = await db
    .select({
      n: notifications,
      recipientName: users.name,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.recipientUid, users.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.n.id,
    recipientUid: r.n.recipientUid,
    recipientName: r.recipientName ?? "—",
    title: r.n.title,
    body: r.n.body,
    type: r.n.type,
    createdAt: r.n.createdAt.toISOString(),
  }));
}

/* ------------------------------------------------------------------ */
/* Admin requests hub                                                  */
/* ------------------------------------------------------------------ */

export async function getAdminRequests(adminUid: string) {
  const [pendingMembers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "user"), eq(users.approvalStatus, APPROVAL.PENDING)));

  const memberRows = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "user"), eq(users.approvalStatus, APPROVAL.PENDING)))
    .orderBy(desc(users.createdAt))
    .limit(50);

  const trainerRows = await db
    .select({
      t: trainers,
      email: users.email,
    })
    .from(trainers)
    .leftJoin(users, eq(trainers.uid, users.id))
    .where(eq(trainers.approvalStatus, APPROVAL.PENDING))
    .orderBy(desc(trainers.createdAt))
    .limit(50);

  const paymentRows = await listPaymentsAdmin("requested");
  const requestRows = await db
    .select({
      id: trainerRequests.id,
      userUid: trainerRequests.userUid,
      trainerUid: trainerRequests.trainerUid,
      createdAt: trainerRequests.createdAt,
      userName: users.name,
      trainerName: trainers.name,
    })
    .from(trainerRequests)
    .innerJoin(users, eq(trainerRequests.userUid, users.id))
    .innerJoin(trainers, eq(trainerRequests.trainerUid, trainers.uid))
    .where(eq(trainerRequests.status, "pending"))
    .orderBy(desc(trainerRequests.createdAt))
    .limit(50);

  return {
    members: memberRows.map((m) => ({
      uid: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      photoUrl: m.photoUrl,
      createdAt: m.createdAt.toISOString(),
    })),
    trainers: trainerRows.map((r) => ({
      uid: r.t.uid,
      name: r.t.name,
      qualification: r.t.qualification,
      experience: r.t.experience,
      email: r.email,
      photoUrl: r.t.photoUrl,
      availability: r.t.availability,
      createdAt: r.t.createdAt.toISOString(),
    })),
    payments: paymentRows,
    trainerRequests: requestRows.map((r) => ({
      id: r.id,
      userUid: r.userUid,
      trainerUid: r.trainerUid,
      userName: r.userName,
      trainerName: r.trainerName,
      createdAt: r.createdAt.toISOString(),
    })),
    pendingMemberCount: pendingMembers?.count ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Member search for notifications composer                            */
/* ------------------------------------------------------------------ */

export async function searchUsers(adminUid: string, q: string, limit = 8) {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)))
    .limit(limit);
  return rows;
}

/* ------------------------------------------------------------------ */
/* Permanent deletion (irreversible)                                   */
/* ------------------------------------------------------------------ */

async function purgeUserData(uid: string) {
  await db.delete(memberships).where(eq(memberships.userUid, uid));
  await db.delete(workoutPlans).where(eq(workoutPlans.userUid, uid));
  await db.delete(dietPlans).where(eq(dietPlans.userUid, uid));
  await db.delete(workoutSessions).where(eq(workoutSessions.userUid, uid));
  await db.delete(attendance).where(eq(attendance.userUid, uid));
  await db.delete(trainerRequests).where(eq(trainerRequests.userUid, uid));
  await db.delete(progress).where(eq(progress.userUid, uid));
  await db.delete(progressPhotos).where(eq(progressPhotos.userUid, uid));
  await db.delete(calculations).where(eq(calculations.userUid, uid));
  await db.delete(reports).where(eq(reports.userUid, uid));
  await db.delete(payments).where(eq(payments.userUid, uid));
  await db.delete(notifications).where(eq(notifications.recipientUid, uid));
  await db.delete(authSessions).where(eq(authSessions.userId, uid));
}

export async function deleteMemberPermanently(adminUid: string, memberUid: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, memberUid)).limit(1);
  if (!user || user.role !== "user") throw new ApiError(404, "Member not found.");
  await purgeUserData(memberUid);
  await db.delete(users).where(eq(users.id, memberUid));
  await audit(adminUid, "delete_member", "user", memberUid, { name: user.name, email: user.email });
}

export async function deleteTrainerPermanently(adminUid: string, trainerUid: string): Promise<void> {
  const [trainer] = await db.select().from(trainers).where(eq(trainers.uid, trainerUid)).limit(1);
  if (!trainer) throw new ApiError(404, "Trainer not found.");
  /* Detach the trainer from every member and their records first. */
  await db.update(users).set({ assignedTrainerUid: null, updatedAt: new Date() }).where(eq(users.assignedTrainerUid, trainerUid));
  await db.update(workoutPlans).set({ trainerUid: null, updatedAt: new Date() }).where(eq(workoutPlans.trainerUid, trainerUid));
  await db.update(dietPlans).set({ trainerUid: null, updatedAt: new Date() }).where(eq(dietPlans.trainerUid, trainerUid));
  await db.update(workoutSessions).set({ trainerUid: null }).where(eq(workoutSessions.trainerUid, trainerUid));
  await db.update(attendance).set({ trainerUid: null, updatedAt: new Date() }).where(eq(attendance.trainerUid, trainerUid));
  await db.delete(trainerRequests).where(eq(trainerRequests.trainerUid, trainerUid));
  await db.delete(trainerAttendance).where(eq(trainerAttendance.trainerUid, trainerUid));
  await purgeUserData(trainerUid);
  await db.delete(trainers).where(eq(trainers.uid, trainerUid));
  await db.delete(users).where(eq(users.id, trainerUid));
  await audit(adminUid, "delete_trainer", "trainer", trainerUid, { name: trainer.name });
}
