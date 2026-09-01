import { requireApiUser } from "@/lib/auth";
import { handle, readJson } from "@/lib/api-helpers";
import { getUserBundle, updateProfile, updateSettings } from "@/lib/services/users";
import type { EmergencyContact } from "@/lib/types";

export const dynamic = "force-dynamic";

/* GET /api/user — Home bundle (membership, trainer, session, notifications) */
export async function GET() {
  return handle(async () => {
    const user = await requireApiUser(["user"]);
    return await getUserBundle(user.id);
  });
}

/* PATCH /api/user — profile or settings */
export async function PATCH(req: Request) {
  return handle(async () => {
    const user = await requireApiUser(["user", "trainer"]);
    const body = await readJson<Record<string, unknown>>(req);
    const action = String(body.action ?? "");

    if (action === "profile") {
      await updateProfile(user.id, {
        name: body.name !== undefined ? String(body.name) : undefined,
        phone: body.phone !== undefined ? String(body.phone) : undefined,
        photoUrl: body.photoUrl !== undefined ? (body.photoUrl as string | null) : undefined,
        heightCm: body.heightCm !== undefined ? (body.heightCm ? Number(body.heightCm) : null) : undefined,
        emergencyContact: body.emergencyContact !== undefined ? (body.emergencyContact as EmergencyContact) : undefined,
      });
      return { ok: true };
    }

    if (action === "settings") {
      await updateSettings(user.id, {
        theme: body.theme !== undefined ? String(body.theme) : undefined,
        notificationPrefs: body.notificationPrefs as never,
      });
      return { ok: true };
    }

    return { ok: false, error: "Unknown action." };
  });
}
