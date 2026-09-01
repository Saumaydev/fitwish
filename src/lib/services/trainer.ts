import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendance,
  dietPlans,
  gymHolidays,
  memberships,
  notifications,
  progress,
  progressPhotos,
  trainerRequests,
  trainers,
  users,
  workoutPlans,
  workoutSessions,
} from "@/db/schema";
import { ApiError } from "@/lib/auth";
import { APPROVAL, NOTIF_TYPES } from "@/lib/constants";
import { attendancePercent, membershipState } from "@/lib/format";
import { createNotification, listNotifications, unreadCount } from "./notifications";
import type {
  AttendanceRecordDTO,
  AttendanceSummary,
  ClientBundle,
  ClientDTO,
  HolidayDTO,
  TrainerOverviewDTO,
  TrainerRequestDTO,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Assigned clients — the ONLY users a trainer may read                */
/* ------------------------------------------------------------------ */

async function assertAssignedClient(trainerUid: string, clientUid: string) {
  const [client] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, clientUid), eq(users.assignedTrainerUid, trainerUid)))
    .limit(1);
  if (!client) throw new ApiError(403, "That member is not assigned to you.");
  return client;
}

export async function getAssignedClients(trainerUid: string): Promise<ClientDTO[]> {
  const rows = await db
    .select({
      user: users,
      membership: memberships,
    })
    .from(users)
    .leftJoin(memberships, eq(memberships.userUid, users.id))
    .where(eq(users.assignedTrainerUid, trainerUid))
    .orderBy(sql`${users.name} asc`);

  const result: ClientDTO[] = [];
  for (const { user, membership } of rows) {
    const [workouts] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workoutSessions)
      .where(eq(workoutSessions.userUid, user.id));
    const [att] = await db
      .select({
        present: sql<number>`count(*) filter (where ${attendance.status} = 'present')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .where(eq(attendance.userUid, user.id));
    const [weightRow] = await db
      .select({ weight: progress.weight })
      .from(progress)
      .where(eq(progress.userUid, user.id))
      .orderBy(sql`${progress.date} desc`)
      .limit(1);
    result.push({
      uid: user.id,
      name: user.name,
      photoUrl: user.photoUrl,
      plan: membership?.plan ?? null,
      sessionTime: user.sessionTime,
      membershipStatus: membershipState(membership),
      latestWeight: weightRow?.weight ?? null,
      workoutCount: workouts?.count ?? 0,
      attendancePercent: attendancePercent(att?.present ?? 0, att?.total ?? 0),
    });
  }
  return result;
}

export async function getClientBundle(trainerUid: string, clientUid: string): Promise<ClientBundle> {
  const client = await assertAssignedClient(trainerUid, clientUid);

  const [membership] = await db.select().from(memberships).where(eq(memberships.userUid, clientUid)).limit(1);
  const [plan] = await db.select().from(workoutPlans).where(eq(workoutPlans.userUid, clientUid)).limit(1);
  const [dietPlan] = await db.select().from(dietPlans).where(eq(dietPlans.userUid, clientUid)).limit(1);

  const [att] = await db
    .select({
      present: sql<number>`count(*) filter (where ${attendance.status} = 'present')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(attendance)
    .where(eq(attendance.userUid, clientUid));

  const recentAttendance = await db
    .select()
    .from(attendance)
    .where(eq(attendance.userUid, clientUid))
    .orderBy(sql`${attendance.date} desc`)
    .limit(10);

  const entries = await db
    .select()
    .from(progress)
    .where(eq(progress.userUid, clientUid))
    .orderBy(sql`${progress.date} asc`)
    .limit(60);

  const photos = await db
    .select()
    .from(progressPhotos)
    .where(eq(progressPhotos.userUid, clientUid))
    .orderBy(sql`${progressPhotos.date} desc`)
    .limit(40);

  const [workouts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workoutSessions)
    .where(eq(workoutSessions.userUid, clientUid));

  const summary: AttendanceSummary = {
    total: att?.total ?? 0,
    present: att?.present ?? 0,
    absent: (att?.total ?? 0) - (att?.present ?? 0),
    percent: attendancePercent(att?.present ?? 0, att?.total ?? 0),
  };

  return {
    user: {
      id: client.id,
      role: "user",
      name: client.name,
      email: client.email,
      phone: client.phone,
      photoUrl: client.photoUrl,
      heightCm: client.heightCm,
      emergencyContact: client.emergencyContact ?? null,
      theme: "system",
      language: "en",
      approvalStatus: "approved",
      assignedTrainerUid: client.assignedTrainerUid,
      sessionTime: client.sessionTime,
      trainer: null,
    },
    membership: membership ?? null,
    plan: plan
      ? {
          id: plan.id,
          userUid: plan.userUid,
          trainerUid: plan.trainerUid,
          title: plan.title,
          exercises: plan.exercises ?? [],
          status: plan.status,
          updatedAt: plan.updatedAt.toISOString(),
        }
      : null,
    dietPlan: dietPlan
      ? {
          id: dietPlan.id,
          userUid: dietPlan.userUid,
          trainerUid: dietPlan.trainerUid,
          title: dietPlan.title,
          notes: dietPlan.notes,
          meals: dietPlan.meals ?? [],
          status: dietPlan.status,
          updatedAt: dietPlan.updatedAt.toISOString(),
        }
      : null,
    sessionTime: client.sessionTime,
    attendance: summary,
    recentAttendance: recentAttendance.map((a) => ({
      id: a.id,
      date: a.date,
      status: a.status as AttendanceRecordDTO["status"],
    })),
    entries: entries.map((e) => ({
      id: e.id,
      date: e.date,
      weight: e.weight,
      bmi: e.bmi,
      measurements: e.measurements ?? null,
    })),
    photos: photos.map((p) => ({
      id: p.id,
      url: p.url,
      thumbnailUrl: p.thumbnailUrl,
      date: p.date,
      category: p.category,
      storagePath: p.storagePath,
    })),
    workoutCount: workouts?.count ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Overview for trainer home                                           */
/* ------------------------------------------------------------------ */

export async function getTrainerOverview(trainerUid: string): Promise<TrainerOverviewDTO> {
  const clients = await getAssignedClients(trainerUid);

  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trainerRequests)
    .where(and(eq(trainerRequests.trainerUid, trainerUid), eq(trainerRequests.status, "pending")));

  const pendingRows = await db
    .select({
      id: trainerRequests.id,
      userUid: trainerRequests.userUid,
      createdAt: trainerRequests.createdAt,
      name: users.name,
      photoUrl: users.photoUrl,
    })
    .from(trainerRequests)
    .innerJoin(users, eq(trainerRequests.userUid, users.id))
    .where(and(eq(trainerRequests.trainerUid, trainerUid), eq(trainerRequests.status, "pending")))
    .orderBy(sql`${trainerRequests.createdAt} desc`)
    .limit(6);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [unmarkedToday] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(attendance)
    .where(and(eq(attendance.trainerUid, trainerUid), eq(attendance.date, todayStr)));

  const withSessions = clients.filter((c) => c.sessionTime);
  const activeClients = clients.filter((c) => c.membershipStatus === "active" || c.membershipStatus === "expiring");

  /* Holiday reminders — same source the member panel uses. */
  const holidayRows = await db
    .select()
    .from(gymHolidays)
    .where(sql`${gymHolidays.date} >= ${todayStr}`)
    .orderBy(sql`${gymHolidays.date} asc`)
    .limit(6);
  const upcoming: HolidayDTO[] = holidayRows.map((h) => ({ id: h.id, name: h.name, reason: h.reason, date: h.date }));
  const todayHoliday = upcoming.find((h) => h.date === todayStr) ?? null;

  /* Notifications for the trainer */
  const latestNotifications = await listNotifications(trainerUid, 5);
  const unread = await unreadCount(trainerUid);

  return {
    clientCount: clients.length,
    todaySessionCount: withSessions.length,
    activeClientCount: activeClients.length,
    pendingTasks: (pending?.count ?? 0) + Math.max(0, clients.length - (unmarkedToday?.count ?? 0)),
    schedule: withSessions
      .sort((a, b) => (a.sessionTime ?? "").localeCompare(b.sessionTime ?? ""))
      .map((c) => ({
        userUid: c.uid,
        name: c.name,
        photoUrl: c.photoUrl,
        sessionTime: c.sessionTime,
        membershipPlan: c.plan,
      })),
    pendingRequests: pendingRows.map((r) => ({
      id: r.id,
      userUid: r.userUid,
      trainerUid,
      status: "pending",
      userName: r.name,
      userPhoto: r.photoUrl,
      createdAt: r.createdAt.toISOString(),
    })),
    unreadNotifications: unread,
    latestNotifications,
    todayHoliday,
    upcomingHolidays: upcoming,
  };
}

/* ------------------------------------------------------------------ */
/* Requests — accept / reject (idempotent, transaction-guarded)        */
/* ------------------------------------------------------------------ */

export async function getTrainerRequests(trainerUid: string): Promise<TrainerRequestDTO[]> {
  const rows = await db
    .select({
      id: trainerRequests.id,
      userUid: trainerRequests.userUid,
      status: trainerRequests.status,
      createdAt: trainerRequests.createdAt,
      name: users.name,
      photoUrl: users.photoUrl,
    })
    .from(trainerRequests)
    .innerJoin(users, eq(trainerRequests.userUid, users.id))
    .where(eq(trainerRequests.trainerUid, trainerUid))
    .orderBy(sql`${trainerRequests.createdAt} desc`)
    .limit(40);
  return rows.map((r) => ({
    id: r.id,
    userUid: r.userUid,
    trainerUid,
    status: r.status as TrainerRequestDTO["status"],
    userName: r.name,
    userPhoto: r.photoUrl,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function acceptTrainerRequest(trainerUid: string, requestId: string): Promise<void> {
  const [request] = await db.select().from(trainerRequests).where(eq(trainerRequests.id, requestId)).limit(1);
  if (!request || request.trainerUid !== trainerUid) throw new ApiError(404, "Request not found.");
  if (request.status === "accepted") return; // idempotent
  if (request.status === "rejected") throw new ApiError(409, "This request was already rejected.");

  await db.transaction(async (tx) => {
    const [recheck] = await tx.select().from(trainerRequests).where(eq(trainerRequests.id, requestId)).limit(1);
    if (!recheck || recheck.status !== "pending") return;
    await tx
      .update(trainerRequests)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(trainerRequests.id, requestId));
    await tx
      .update(users)
      .set({ assignedTrainerUid: trainerUid, updatedAt: new Date() })
      .where(eq(users.id, request.userUid));
  });

  const [user] = await db.select().from(users).where(eq(users.id, request.userUid)).limit(1);
  if (user) {
    await createNotification(user.id, {
      type: NOTIF_TYPES.TRAINER_ACCEPTED,
      title: "Trainer request accepted",
      body: `${user.assignedTrainerUid === trainerUid ? "" : ""}You are now training with your requested trainer.`,
      actionRef: "/app/user/home",
    });
  }
}

export async function rejectTrainerRequest(trainerUid: string, requestId: string): Promise<void> {
  const [request] = await db.select().from(trainerRequests).where(eq(trainerRequests.id, requestId)).limit(1);
  if (!request || request.trainerUid !== trainerUid) throw new ApiError(404, "Request not found.");
  if (request.status !== "pending") return; // idempotent
  await db
    .update(trainerRequests)
    .set({ status: "rejected", respondedAt: new Date() })
    .where(eq(trainerRequests.id, requestId));
  await createNotification(request.userUid, {
    type: NOTIF_TYPES.TRAINER_REJECTED,
    title: "Trainer request declined",
    body: "Your trainer request was declined. You can request another trainer.",
    actionRef: "/app/user/trainers",
  });
}

/* ------------------------------------------------------------------ */
/* Attendance marking (idempotent by user + date)                      */
/* ------------------------------------------------------------------ */

export async function markAttendance(
  trainerUid: string,
  data: { userUid: string; date: string; status: "present" | "absent" }
): Promise<void> {
  await assertAssignedClient(trainerUid, data.userUid);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new ApiError(400, "Invalid date.");
  const id = `${data.userUid}_${data.date}`;
  const [existing] = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
  if (existing) {
    await db
      .update(attendance)
      .set({ status: data.status, trainerUid, updatedAt: new Date() })
      .where(eq(attendance.id, id));
  } else {
    await db.insert(attendance).values({
      id,
      userUid: data.userUid,
      trainerUid,
      date: data.date,
      status: data.status,
    });
  }
}

export async function getTrainerAttendanceHistory(trainerUid: string, limit = 40) {
  const rows = await db
    .select({
      id: attendance.id,
      date: attendance.date,
      status: attendance.status,
      userUid: attendance.userUid,
      name: users.name,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.userUid, users.id))
    .where(eq(attendance.trainerUid, trainerUid))
    .orderBy(sql`${attendance.date} desc, ${attendance.updatedAt} desc`)
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    userUid: r.userUid,
    userName: r.name,
    date: r.date,
    status: r.status as "present" | "absent",
  }));
}

/* ------------------------------------------------------------------ */
/* Trainer profile updates — approval fields NEVER editable here       */
/* ------------------------------------------------------------------ */

export async function updateTrainerProfile(
  trainerUid: string,
  fields: {
    name?: string;
    phone?: string;
    photoUrl?: string | null;
    qualification?: string;
    experience?: string;
    bio?: string;
    availability?: string;
  }
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.qualification !== undefined) patch.qualification = fields.qualification.trim();
  if (fields.experience !== undefined) patch.experience = fields.experience.trim();
  if (fields.bio !== undefined) patch.bio = fields.bio.trim();
  if (fields.availability !== undefined) patch.availability = fields.availability.trim();
  if (fields.photoUrl !== undefined) patch.photoUrl = fields.photoUrl;
  if (patch.name === "") throw new ApiError(400, "Name can't be empty.");
  await db.update(trainers).set(patch).where(eq(trainers.uid, trainerUid));
  if (fields.name !== undefined || fields.photoUrl !== undefined || fields.phone !== undefined) {
    const uPatch: Record<string, unknown> = { updatedAt: new Date() };
    if (fields.name !== undefined) uPatch.name = fields.name.trim();
    if (fields.photoUrl !== undefined) uPatch.photoUrl = fields.photoUrl;
    if (fields.phone !== undefined) uPatch.phone = fields.phone.trim();
    await db.update(users).set(uPatch).where(eq(users.id, trainerUid));
  }
}

export async function notifyAdminsForTrainerConnect(trainerUid: string): Promise<void> {
  const [t] = await db.select().from(trainers).where(eq(trainers.uid, trainerUid)).limit(1);
  if (!t) return;
  const { notifyAdmins } = await import("./notifications");
  await notifyAdmins({
    type: "trainer_connect",
    title: "Trainer wants to connect",
    body: `${t.name} is waiting for admin approval.`,
    actionRef: "/app/admin/requests",
  });
}
