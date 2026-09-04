import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { trainers, users, workoutPlans, workoutSessions } from "@/db/schema";
import { ApiError } from "@/lib/auth";
import { NOTIF_TYPES } from "@/lib/constants";
import { createNotification } from "./notifications";
import type { ExerciseResult, UserWorkoutBundle, WorkoutExercise, WorkoutPlanDTO } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

export async function getPlanForUser(userUid: string): Promise<WorkoutPlanDTO | null> {
  const [plan] = await db.select().from(workoutPlans).where(eq(workoutPlans.userUid, userUid)).limit(1);
  if (!plan) return null;
  return {
    id: plan.id,
    userUid: plan.userUid,
    trainerUid: plan.trainerUid,
    title: plan.title,
    exercises: plan.exercises ?? [],
    status: plan.status,
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function savePlanForClient(
  trainerUid: string,
  clientUid: string,
  title: string,
  exercises: WorkoutExercise[]
): Promise<void> {
  const [client] = await db.select().from(users).where(eq(users.id, clientUid)).limit(1);
  if (!client || client.assignedTrainerUid !== trainerUid) {
    throw new ApiError(403, "You can only edit plans for your assigned clients.");
  }
  const cleaned = exercises
  .filter((e) => e.name && e.name.trim())
  .map((e, i) => ({
    ...e,
    name: e.name.trim(),
    sets: Number(e.sets) || 1,
    reps: e.reps || "—",
    time: e.time == null ? null : Math.max(1, Number(e.time) || 1),
    rest: Number(e.rest) || 0,
    instructions: (e.instructions || "").trim(),
    order: i,
    exerciseId: e.exerciseId || randomUUID(),
  }));

  const id = `plan_${clientUid}`;
  const [existing] = await db.select({ id: workoutPlans.id }).from(workoutPlans).where(eq(workoutPlans.id, id)).limit(1);
  if (existing) {
    await db
      .update(workoutPlans)
      .set({ trainerUid, title: title.trim(), exercises: cleaned, updatedAt: new Date() })
      .where(eq(workoutPlans.id, id));
  } else {
    await db.insert(workoutPlans).values({
      id,
      userUid: clientUid,
      trainerUid,
      title: title.trim(),
      exercises: cleaned,
      status: "active",
    });
  }

  await createNotification(clientUid, {
    type: NOTIF_TYPES.WORKOUT_UPDATED,
    title: "Workout plan updated",
    body: `Your trainer updated your workout plan: ${title.trim()}.`,
    actionRef: "/app/user/workout",
  });
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

export async function getUserWorkoutBundle(userUid: string): Promise<UserWorkoutBundle> {
  const plan = await getPlanForUser(userUid);
  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userUid, userUid))
    .orderBy(sql`${workoutSessions.completedAt} desc`)
    .limit(10);
  return {
    plan,
    sessions: sessions.map((s) => ({
      id: s.id,
      planId: s.planId,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt.toISOString(),
      exerciseResults: s.exerciseResults ?? [],
    })),
  };
}

export async function completeWorkoutSession(
  userUid: string,
  data: { planId?: string; startedAt: string; results: ExerciseResult[] }
): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userUid)).limit(1);
  if (!user) throw new ApiError(404, "Account not found.");

  const id = randomUUID();
  const startedAt = new Date(data.startedAt);
  const completedAt = new Date();
  if (isNaN(startedAt.getTime()) || completedAt.getTime() - startedAt.getTime() > 86400000) {
    throw new ApiError(400, "Invalid workout timing.");
  }

  await db.insert(workoutSessions).values({
    id,
    userUid,
    trainerUid: user.assignedTrainerUid,
    planId: data.planId ?? null,
    startedAt,
    completedAt,
    status: "completed",
    exerciseResults: data.results.filter((r) => r.completed),
  });

  if (user.assignedTrainerUid) {
    await createNotification(user.assignedTrainerUid, {
      type: NOTIF_TYPES.WORKOUT_COMPLETED,
      title: "Workout completed",
      body: `${user.name} just finished a workout.`,
      actionRef: "/app/trainer/clients",
    });
  }
  return id;
}

/* ------------------------------------------------------------------ */
/* Trainer session-time control                                        */
/* ------------------------------------------------------------------ */

export async function setClientSessionTime(
  trainerUid: string,
  clientUid: string,
  time: string
): Promise<void> {
  const [client] = await db.select().from(users).where(eq(users.id, clientUid)).limit(1);
  if (!client || client.assignedTrainerUid !== trainerUid) {
    throw new ApiError(403, "You can only set sessions for your assigned clients.");
  }
  const trimmed = time.trim();
  if (!/^([01]?\d|2[0-3]):[0-5]\d( ?(AM|PM|am|pm))?$|^([1-9]|1[0-2]):[0-5]\d ?(AM|PM|am|pm)$/.test(trimmed)) {
    throw new ApiError(400, "Enter a valid time like 6:30 PM.");
  }
  await db.update(users).set({ sessionTime: trimmed, updatedAt: new Date() }).where(eq(users.id, clientUid));
  await createNotification(clientUid, {
    type: NOTIF_TYPES.SESSION_TIME,
    title: "Session time updated",
    body: `Your trainer set your session time to ${trimmed}.`,
    actionRef: "/app/user/home",
  });
}

export async function getTrainerName(trainerUid: string | null): Promise<string | null> {
  if (!trainerUid) return null;
  const [t] = await db.select({ name: trainers.name }).from(trainers).where(eq(trainers.uid, trainerUid)).limit(1);
  return t?.name ?? null;
}

export async function isAssignedClient(trainerUid: string, clientUid: string): Promise<boolean> {
  const [client] = await db
    .select({ uid: users.id })
    .from(users)
    .where(and(eq(users.id, clientUid), eq(users.assignedTrainerUid, trainerUid)))
    .limit(1);
  return Boolean(client);
}
