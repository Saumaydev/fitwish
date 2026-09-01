import { ApiError, requireApiUser } from "@/lib/auth";
import { handle } from "@/lib/api-helpers";
import { maxUploadBytes, saveUpload } from "@/lib/services/upload";

export const dynamic = "force-dynamic";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/* POST /api/upload (multipart) — file + optional thumb, UID-scoped storage */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser(["user", "trainer"]);
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new ApiError(400, "Invalid upload.");
    }

    const scopeRaw = String(form.get("scope") ?? "progress");
    const scope = scopeRaw === "profile" ? "profile" : "progress";

    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Choose an image to upload.");
    if (!EXT[file.type]) throw new ApiError(400, "Only JPG, PNG or WEBP images are supported.");
    if (file.size > maxUploadBytes) throw new ApiError(400, "Image is too large — keep it under 6 MB.");

    const mainBuffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveUpload(user.id, scope, mainBuffer, EXT[file.type]);

    let thumbnailUrl: string | null = null;
    const thumb = form.get("thumb");
    if (thumb instanceof File && EXT[thumb.type]) {
      const thumbBuffer = Buffer.from(await thumb.arrayBuffer());
      const t = await saveUpload(user.id, scope, thumbBuffer, EXT[thumb.type]);
      thumbnailUrl = t.url;
    }

    return { ok: true, url: saved.url, thumbnailUrl, storagePath: saved.storagePath };
  });
}
