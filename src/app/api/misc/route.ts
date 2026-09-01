import type { NextRequest } from "next/server";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handle, readJson } from "@/lib/api-helpers";
import { getUserAttendance, listCalcs, saveCalc } from "@/lib/services/progress";
import {
  dismissNotification,
  getUserPayments,
  getUserReports,
  listNotifications,
  markNotificationsRead,
  requestPayment,
  submitReport,
} from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

/* GET /api/misc?action=attendance | calcs | notifications | reports | payments */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireApiUser(["user", "trainer"]);
    const action = req.nextUrl.searchParams.get("action") ?? "";
    if (action === "attendance") return await getUserAttendance(user.id);
    if (action === "calcs") return { calcs: await listCalcs(user.id) };
    if (action === "notifications") return { notifications: await listNotifications(user.id, 40) };
    if (action === "reports") return { reports: await getUserReports(user.id) };
    if (action === "payments") return { payments: await getUserPayments(user.id) };
    throw new ApiError(400, "Unknown action.");
  });
}

/* POST /api/misc — calc | report | paymentRequest */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser(["user", "trainer"]);
    const body = await readJson<Record<string, unknown>>(req);
    const action = String(body.action ?? "");

    if (action === "calc") {
      await saveCalc(user.id, {
        type: String(body.type ?? ""),
        inputs: (body.inputs ?? {}) as Record<string, number | string>,
        result: String(body.result ?? ""),
      });
      return { ok: true };
    }

    if (action === "report") {
      const type = String(body.type ?? "other");
      const description = String(body.description ?? "").trim();
      if (description.length < 10) throw new ApiError(400, "Please describe the problem in a bit more detail.");
      const report = await submitReport(user.id, { type, description });
      return { ok: true, report };
    }

    if (action === "paymentRequest") {
      await requestPayment(user.id);
      return { ok: true };
    }

    throw new ApiError(400, "Unknown action.");
  });
}

/* PATCH /api/misc — markRead | dismiss notifications */
export async function PATCH(req: Request) {
  return handle(async () => {
    const user = await requireApiUser(["user", "trainer"]);
    const body = await readJson<Record<string, unknown>>(req);
    const action = String(body.action ?? "");

    if (action === "markRead") {
      await markNotificationsRead(user.id, body.id ? String(body.id) : undefined, Boolean(body.all));
      return { ok: true };
    }
    if (action === "dismiss") {
      await dismissNotification(user.id, String(body.id ?? ""));
      return { ok: true };
    }
    throw new ApiError(400, "Unknown action.");
  });
}
