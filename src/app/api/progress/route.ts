import { ApiError, requireApiUser } from "@/lib/auth";
import { handle, readJson } from "@/lib/api-helpers";
import { addProgressPhoto, deleteProgressPhoto, getUserProgress, logWeight } from "@/lib/services/progress";

export const dynamic = "force-dynamic";

/* GET /api/progress — entries, photos, workout + attendance stats */
export async function GET() {
  return handle(async () => {
    const user = await requireApiUser(["user"]);
    return await getUserProgress(user.id);
  });
}

/* POST /api/progress — log weight | add photo */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser(["user"]);
    const body = await readJson<Record<string, unknown>>(req);
    const action = String(body.action ?? "");

    if (action === "logWeight") {
      await logWeight(user.id, {
        date: String(body.date ?? ""),
        weight: Number(body.weight ?? 0),
        bmi: body.bmi ? Number(body.bmi) : null,
        measurements: (body.measurements ?? null) as Record<string, number | null>,
      });
      return { ok: true };
    }

    if (action === "photo") {
      const url = String(body.url ?? "");
      const storagePath = String(body.storagePath ?? "");
      if (!url || !storagePath) throw new ApiError(400, "Photo upload failed — try again.");
      await addProgressPhoto(user.id, {
        url,
        thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl) : null,
        storagePath,
        date: String(body.date ?? ""),
        category: String(body.category ?? "general"),
      });
      return { ok: true };
    }

    throw new ApiError(400, "Unknown action.");
  });
}

/* DELETE /api/progress?photoId= — delete a photo */
export async function DELETE(req: Request) {
  return handle(async () => {
    const user = await requireApiUser(["user"]);
    const photoId = req.url ? new URL(req.url).searchParams.get("photoId") : null;
    if (!photoId) throw new ApiError(400, "Missing photo id.");
    await deleteProgressPhoto(user.id, photoId);
    return { ok: true };
  });
}
