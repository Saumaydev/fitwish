import type { NextRequest } from "next/server";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handle, readJson } from "@/lib/api-helpers";
import { ROLES } from "@/lib/constants";
import {
  acceptTrainerRequest,
  getAssignedClients,
  getClientBundle,
  getTrainerAttendanceHistory,
  getTrainerOverview,
  getTrainerRequests,
  markAttendance,
  notifyAdminsForTrainerConnect,
  rejectTrainerRequest,
  updateTrainerProfile,
} from "@/lib/services/trainer";
import { savePlanForClient, setClientSessionTime } from "@/lib/services/workout";
import { saveDietPlanForClient } from "@/lib/services/diet";
import type { DietMeal, WorkoutExercise } from "@/lib/types";

export const dynamic = "force-dynamic";

/* GET /api/trainer?action=overview | clients | client&uid | attendanceHistory | requests */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireApiUser([ROLES.TRAINER]);
    const action = req.nextUrl.searchParams.get("action") ?? "overview";

    if (action === "clients") return { clients: await getAssignedClients(user.id) };
    if (action === "attendanceHistory") return { records: await getTrainerAttendanceHistory(user.id) };
    if (action === "requests") return { requests: await getTrainerRequests(user.id) };
    if (action === "client") {
      const uid = req.nextUrl.searchParams.get("uid");
      if (!uid) throw new ApiError(400, "Missing client id.");
      return await getClientBundle(user.id, uid);
    }
    return await getTrainerOverview(user.id);
  });
}

/* POST /api/trainer — all trainer mutations */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser([ROLES.TRAINER]);
    const body = await readJson<Record<string, unknown>>(req);
    const action = String(body.action ?? "");

    if (action === "acceptRequest") {
      await acceptTrainerRequest(user.id, String(body.id ?? ""));
      return { ok: true };
    }
    if (action === "rejectRequest") {
      await rejectTrainerRequest(user.id, String(body.id ?? ""));
      return { ok: true };
    }
    if (action === "setSessionTime") {
      await setClientSessionTime(user.id, String(body.userUid ?? ""), String(body.time ?? ""));
      return { ok: true };
    }
    if (action === "savePlan") {
      const exercises = Array.isArray(body.exercises) ? (body.exercises as WorkoutExercise[]) : [];
      await savePlanForClient(user.id, String(body.userUid ?? ""), String(body.title ?? "My Workout Plan"), exercises);
      return { ok: true };
    }
    if (action === "saveDietPlan") {
      const meals = Array.isArray(body.meals) ? (body.meals as DietMeal[]) : [];
      await saveDietPlanForClient(
        user.id,
        String(body.userUid ?? ""),
        String(body.title ?? "My Diet Plan"),
        meals,
        body.notes !== undefined ? String(body.notes) : undefined
      );
      return { ok: true };
    }
    if (action === "markAttendance") {
      const status = body.status === "absent" ? "absent" : "present";
      await markAttendance(user.id, {
        userUid: String(body.userUid ?? ""),
        date: String(body.date ?? ""),
        status,
      });
      return { ok: true };
    }
    if (action === "updateProfile") {
      await updateTrainerProfile(user.id, {
        name: body.name !== undefined ? String(body.name) : undefined,
        phone: body.phone !== undefined ? String(body.phone) : undefined,
        photoUrl: body.photoUrl !== undefined ? (body.photoUrl as string | null) : undefined,
        qualification: body.qualification !== undefined ? String(body.qualification) : undefined,
        experience: body.experience !== undefined ? String(body.experience) : undefined,
        bio: body.bio !== undefined ? String(body.bio) : undefined,
        availability: body.availability !== undefined ? String(body.availability) : undefined,
      });
      return { ok: true };
    }
    if (action === "connectAdmin") {
      await notifyAdminsForTrainerConnect(user.id);
      return { ok: true };
    }

    throw new ApiError(400, "Unknown action.");
  });
}
