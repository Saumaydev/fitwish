import type { NextRequest } from "next/server";
import { ApiError, requireAdmin } from "@/lib/auth";
import { handle, readJson } from "@/lib/api-helpers";
import {
  activateMember,
  activateTrainer,
  approveMember,
  approveTrainer,
  assignTrainer,
  createHoliday,
  deactivateMember,
  deactivateTrainer,
  deleteHoliday,
  deleteMemberPermanently,
  deleteTrainerPermanently,
  getAdminRequests,
  getDashboard,
  getMemberDetail,
  listAllNotificationsAdmin,
  listAudit,
  listHolidays,
  listMembers,
  listPaymentsAdmin,
  listReportsAdmin,
  listTrainerAttendance,
  listTrainerAttendanceHistory,
  listTrainersAdmin,
  markPaymentReceived,
  markTrainerAttendance,
  rejectMember,
  rejectTrainer,
  searchUsers,
  sendNotification,
  updateHoliday,
  updateMembership,
  updateReportStatus,
} from "@/lib/services/admin";
import { getApprovedTrainers } from "@/lib/services/users";
import type { MembershipInput } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

/* GET /api/admin?action=... */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin();
    const action = req.nextUrl.searchParams.get("action") ?? "dashboard";
    const sp = req.nextUrl.searchParams;

    switch (action) {
      case "members":
        return await listMembers(admin.id, {
          q: sp.get("q") ?? undefined,
          filter: sp.get("filter") ?? undefined,
          page: sp.get("page") ? Number(sp.get("page")) : 1,
          pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 12,
        });
      case "member":
        return await getMemberDetail(admin.id, sp.get("uid") ?? "");
      case "trainers":
        return { trainers: await listTrainersAdmin(admin.id) };
      case "trainerAttendance": {
        const today = new Date();
        const fallback = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        return await listTrainerAttendance(sp.get("date") ?? fallback);
      }
      case "trainerAttendanceHistory":
        return { records: await listTrainerAttendanceHistory(60) };
      case "approvedTrainers":
        return { trainers: await getApprovedTrainers() };
      case "holidays":
        return { holidays: await listHolidays() };
      case "reports":
        return { reports: await listReportsAdmin(sp.get("filter") ?? "all") };
      case "payments":
        return { payments: await listPaymentsAdmin(sp.get("filter") ?? "all") };
      case "requests":
        return await getAdminRequests(admin.id);
      case "notifications":
        return { notifications: await listAllNotificationsAdmin(60) };
      case "audit":
        return { logs: await listAudit(30) };
      case "searchUsers":
        return { users: await searchUsers(admin.id, sp.get("q") ?? "") };
      default:
        return await getDashboard(admin.id);
    }
  });
}

/* POST /api/admin — admin mutations */
export async function POST(req: Request) {
  return handle(async () => {
    const admin = await requireAdmin();
    const body = await readJson<Record<string, unknown>>(req);
    const action = String(body.action ?? "");
    const uid = body.uid !== undefined ? String(body.uid) : "";

    switch (action) {
      case "approveMember":
        await approveMember(admin.id, uid);
        return { ok: true };
      case "rejectMember":
        await rejectMember(admin.id, uid);
        return { ok: true };
      case "deactivateMember":
        await deactivateMember(admin.id, uid);
        return { ok: true };
      case "activateMember":
        await activateMember(admin.id, uid);
        return { ok: true };
      case "approveTrainer":
        await approveTrainer(admin.id, uid);
        return { ok: true };
      case "rejectTrainer":
        await rejectTrainer(admin.id, uid);
        return { ok: true };
      case "deactivateTrainer":
        await deactivateTrainer(admin.id, uid);
        return { ok: true };
      case "activateTrainer":
        await activateTrainer(admin.id, uid);
        return { ok: true };
      case "deleteMember":
        await deleteMemberPermanently(admin.id, uid);
        return { ok: true };
      case "deleteTrainer":
        await deleteTrainerPermanently(admin.id, uid);
        return { ok: true };
      case "assignTrainer":
        await assignTrainer(admin.id, String(body.userUid ?? ""), String(body.trainerUid ?? ""));
        return { ok: true };
      case "updateMembership": {
        const m = (body.membership ?? {}) as Partial<MembershipInput>;
        if (!m.plan || !m.startDate) throw new ApiError(400, "Plan and start date are required.");
        await updateMembership(admin.id, String(body.userUid ?? ""), {
          plan: String(m.plan),
          startDate: String(m.startDate),
          durationMonths: Number(m.durationMonths ?? 1),
          totalAmount: Number(m.totalAmount ?? 0),
          paidAmount: Number(m.paidAmount ?? 0),
        });
        return { ok: true };
      }
      case "createHoliday":
        await createHoliday(admin.id, {
          name: String(body.name ?? ""),
          reason: String(body.reason ?? ""),
          date: String(body.date ?? ""),
        });
        return { ok: true };
      case "updateHoliday":
        await updateHoliday(admin.id, String(body.id ?? ""), {
          name: String(body.name ?? ""),
          reason: String(body.reason ?? ""),
          date: String(body.date ?? ""),
        });
        return { ok: true };
      case "deleteHoliday":
        await deleteHoliday(admin.id, String(body.id ?? ""));
        return { ok: true };
      case "updateReport": {
        const status = String(body.status ?? "") as "pending" | "open" | "resolved";
        if (!["pending", "open", "resolved"].includes(status)) throw new ApiError(400, "Invalid status.");
        await updateReportStatus(admin.id, String(body.id ?? ""), status);
        return { ok: true };
      }
      case "markTrainerAttendance": {
        const status = body.status === "absent" ? "absent" : "present";
        await markTrainerAttendance(admin.id, {
          trainerUid: String(body.trainerUid ?? ""),
          date: String(body.date ?? ""),
          status,
        });
        return { ok: true };
      }
      case "markPaymentReceived":
        await markPaymentReceived(admin.id, String(body.id ?? ""));
        return { ok: true };
      case "sendNotification": {
        const count = await sendNotification(admin.id, {
          audience: (body.audience as "all" | "users" | "trainers" | "single") ?? "users",
          userUid: body.userUid ? String(body.userUid) : undefined,
          title: String(body.title ?? ""),
          body: String(body.body ?? ""),
        });
        return { ok: true, count };
      }
      default:
        throw new ApiError(400, "Unknown action.");
    }
  });
}
