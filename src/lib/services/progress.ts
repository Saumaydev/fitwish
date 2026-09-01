import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendance, calculations, gymHolidays, progress, progressPhotos, workoutSessions } from "@/db/schema";
import { ApiError } from "@/lib/auth";
import { attendancePercent } from "@/lib/format";
import type {
  AttendanceRecordDTO,
  AttendanceSummary,
  CalcDTO,
  HolidayDTO,
  ProgressEntryDTO,
  ProgressPhotoDTO,
  UserProgressBundle,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* User attendance                                                     */
/* ------------------------------------------------------------------ */

export async function getUserAttendance(userUid: string) {
  const rows = await db
    .select()
    .from(attendance)
    .where(eq(attendance.userUid, userUid))
    .orderBy(sql`${attendance.date} desc`)
    .limit(120);
  const present = rows.filter((r) => r.status === "present").length;
  const summary: AttendanceSummary = {
    total: rows.length,
    present,
    absent: rows.length - present,
    percent: attendancePercent(present, rows.length),
  };
  const records: AttendanceRecordDTO[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    status: r.status as AttendanceRecordDTO["status"],
  }));
  const holidays = await upcomingHolidays(6);
  return { summary, records, holidays };
}

export async function upcomingHolidays(limit = 6): Promise<HolidayDTO[]> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const rows = await db
    .select()
    .from(gymHolidays)
    .where(sql`${gymHolidays.date} >= ${todayStr}`)
    .orderBy(sql`${gymHolidays.date} asc`)
    .limit(limit);
  return rows.map((h) => ({ id: h.id, name: h.name, reason: h.reason, date: h.date }));
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export async function getUserProgress(userUid: string): Promise<UserProgressBundle> {
  const entries = await db
    .select()
    .from(progress)
    .where(eq(progress.userUid, userUid))
    .orderBy(sql`${progress.date} asc`)
    .limit(120);

  const photos = await db
    .select()
    .from(progressPhotos)
    .where(eq(progressPhotos.userUid, userUid))
    .orderBy(sql`${progressPhotos.date} desc, ${progressPhotos.createdAt} desc`)
    .limit(60);

  const [workouts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workoutSessions)
    .where(eq(workoutSessions.userUid, userUid));

  const attRows = await db
    .select({ status: attendance.status })
    .from(attendance)
    .where(eq(attendance.userUid, userUid));
  const present = attRows.filter((a) => a.status === "present").length;

  const last = entries[entries.length - 1];

  return {
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
    attendance: {
      total: attRows.length,
      present,
      absent: attRows.length - present,
      percent: attendancePercent(present, attRows.length),
    },
    latestWeight: last?.weight ?? null,
    latestBmi: last?.bmi ?? null,
  };
}

export async function logWeight(
  userUid: string,
  data: { date: string; weight: number; bmi: number | null; measurements?: Record<string, number | null> }
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new ApiError(400, "Invalid date.");
  if (!data.weight || data.weight < 20 || data.weight > 400) throw new ApiError(400, "Enter a valid weight in kg.");
  await db.insert(progress).values({
    id: randomUUID(),
    userUid,
    date: data.date,
    weight: Math.round(data.weight * 10) / 10,
    bmi: data.bmi,
    measurements: (data.measurements ?? null) as ProgressEntryDTO["measurements"],
  });
}

export async function addProgressPhoto(
  userUid: string,
  data: { url: string; thumbnailUrl: string | null; storagePath: string; date: string; category: string }
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new ApiError(400, "Invalid date.");
  await db.insert(progressPhotos).values({
    id: randomUUID(),
    userUid,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl,
    storagePath: data.storagePath,
    date: data.date,
    category: data.category,
  });
}

export async function deleteProgressPhoto(userUid: string, photoId: string): Promise<void> {
  const [photo] = await db.select().from(progressPhotos).where(eq(progressPhotos.id, photoId)).limit(1);
  if (!photo || photo.userUid !== userUid) throw new ApiError(404, "Photo not found.");
  await db.delete(progressPhotos).where(eq(progressPhotos.id, photoId));
  const { deleteUpload } = await import("./upload");
  await deleteUpload(photo.storagePath);
  if (photo.thumbnailUrl) {
    try {
      const url = new URL(photo.thumbnailUrl, "http://local");
      const thumbPath = url.searchParams.get("p");
      if (thumbPath) await deleteUpload(decodeURIComponent(thumbPath));
    } catch {
      /* best effort */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Calculator history                                                  */
/* ------------------------------------------------------------------ */

export async function listCalcs(userUid: string): Promise<CalcDTO[]> {
  const rows = await db
    .select()
    .from(calculations)
    .where(eq(calculations.userUid, userUid))
    .orderBy(sql`${calculations.createdAt} desc`)
    .limit(30);
  return rows.map((c) => ({
    id: c.id,
    type: c.type,
    inputs: c.inputs ?? {},
    result: c.result,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function saveCalc(userUid: string, data: { type: string; inputs: Record<string, number | string>; result: string }): Promise<void> {
  if (!["bmi", "bmr", "calories", "water", "protein"].includes(data.type)) throw new ApiError(400, "Unknown calculator type.");
  await db.insert(calculations).values({
    id: randomUUID(),
    userUid,
    type: data.type,
    inputs: data.inputs,
    result: data.result,
  });
}
