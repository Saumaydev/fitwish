import type { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { handle, readJson } from "@/lib/api-helpers";
import { getApprovedTrainers, getUserTrainerRequests, requestTrainer } from "@/lib/services/users";
import { upcomingHolidays } from "@/lib/services/progress";

export const dynamic = "force-dynamic";

/* GET /api/gym?action=trainers | holidays | myRequests */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireApiUser(["user"]);
    const action = req.nextUrl.searchParams.get("action") ?? "trainers";
    if (action === "holidays") return { holidays: await upcomingHolidays(6) };
    if (action === "myRequests") return { requests: await getUserTrainerRequests(user.id) };
    return { trainers: await getApprovedTrainers() };
  });
}

/* POST /api/gym — request a trainer */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser(["user"]);
    const body = await readJson<Record<string, unknown>>(req);
    const action = String(body.action ?? "");

    if (action === "requestTrainer") {
      await requestTrainer(user.id, String(body.trainerUid ?? ""));
      return { ok: true };
    }

    return { ok: false, error: "Unknown action." };
  });
}
