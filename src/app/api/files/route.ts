import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canReadFile, contentTypeFor, readStoredFile } from "@/lib/services/upload";

export const dynamic = "force-dynamic";

/* GET /api/files?p=users/{uid}/{scope}/{file} — authorized file access */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const storagePath = decodeURIComponent(req.nextUrl.searchParams.get("p") ?? "");
    if (!storagePath || storagePath.includes("..") || storagePath.startsWith("/")) {
      return new Response("Forbidden", { status: 403 });
    }

    const allowed = await canReadFile(user, storagePath);
    if (!allowed) return new Response("Forbidden", { status: 403 });

    const ext = storagePath.split(".").pop()?.toLowerCase() ?? "";
    const buffer = await readStoredFile(storagePath);
    if (!buffer) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(ext),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
