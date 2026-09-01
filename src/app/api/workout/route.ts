import { ApiError, requireApiUser } from "@/lib/auth";
import { handle, readJson } from "@/lib/api-helpers";
import { completeWorkoutSession, getUserWorkoutBundle } from "@/lib/services/workout";
import type { ExerciseResult } from "@/lib/types";

export const dynamic = "force-dynamic";

/* GET /api/workout — plan + recent sessions */
export async function GET() {
  return handle(async () => {
    const user = await requireApiUser(["user"]);
    return await getUserWorkoutBundle(user.id);
  });
}

/* POST /api/workout — complete a session */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser(["user"]);
    const body = await readJson<Record<string, unknown>>(req);
    const action = String(body.action ?? "");

    if (action === "complete") {
      const results = Array.isArray(body.results)
        ? (body.results as ExerciseResult[]).filter((r) => r && r.exerciseId)
        : [];
      if (!results.length) throw new ApiError(400, "Nothing to save — complete at least one set.");
      const sessionId = await completeWorkoutSession(user.id, {
        planId: body.planId ? String(body.planId) : undefined,
        startedAt: String(body.startedAt ?? new Date().toISOString()),
        results,
      });
      return { ok: true, sessionId };
    }

    throw new ApiError(400, "Unknown action.");
  });
}
