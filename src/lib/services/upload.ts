import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { trainers, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ApiError } from "@/lib/auth";
import { SUPABASE_BUCKET, supabaseAdmin, supabaseEnabled } from "@/lib/supabase";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

/* ------------------------------------------------------------------ */
/* UID-scoped file storage (Firebase Storage equivalent)               */
/* users/{uid}/profile/{file}                                          */
/* users/{uid}/progress/{file}                                         */
/* ------------------------------------------------------------------ */

export async function saveUpload(
  uid: string,
  scope: "profile" | "progress",
  buffer: Buffer,
  ext: string
): Promise<{ storagePath: string; url: string }> {
  const safeScope = scope === "profile" ? "profile" : "progress";

  if (supabaseEnabled) {
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    const storagePath = `users/${uid}/${safeScope}/${filename}`;
    const { error } = await supabaseAdmin()
      .storage.from(SUPABASE_BUCKET)
      .upload(storagePath, buffer, { contentType: contentTypeFor(ext), upsert: false });
    if (error) throw new ApiError(500, "Could not store the image. Please try again.");
    return { storagePath, url: `/api/files?p=${encodeURIComponent(storagePath)}` };
  }

  const dir = path.join(UPLOAD_ROOT, "users", uid, safeScope);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  const storagePath = `users/${uid}/${safeScope}/${filename}`;
  return { storagePath, url: `/api/files?p=${encodeURIComponent(storagePath)}` };
}

export async function deleteUpload(storagePath: string): Promise<void> {
  // Storage paths are server-generated + UID-scoped; sanitize defensively.
  if (!storagePath || storagePath.includes("..")) return;

  if (supabaseEnabled) {
    await supabaseAdmin().storage.from(SUPABASE_BUCKET).remove([storagePath]);
    return;
  }

  const full = path.join(UPLOAD_ROOT, storagePath);
  try {
    await rm(full, { force: true });
  } catch {
    /* best effort */
  }
}

/* ------------------------------------------------------------------ */
/* File access authorization                                           */
/* users/{uid}/...                                                     */
/* owner can read; admin can read; a trainer can read a file of an     */
/* assigned client (progress photos); trainer profile photos are       */
/* visible to any signed-in member (shown on trainer cards).           */
/* ------------------------------------------------------------------ */

export async function canReadFile(requester: typeof users.$inferSelect | null, storagePath: string): Promise<boolean> {
  if (!requester) return false;
  const segments = storagePath.split("/");
  // users / {uid} / {scope} / {file}
  if (segments[0] !== "users" || segments.length < 4) return false;
  const ownerUid = segments[1];
  const scope = segments[2];

  if (requester.role === "admin") return true;
  if (requester.id === ownerUid) return true;

  if (requester.role === "trainer") {
    const [client] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, ownerUid), eq(users.assignedTrainerUid, requester.id)))
      .limit(1);
    if (client) return true;
  }

  if (scope === "profile") {
    // Trainer profile photos are visible to signed-in members.
    const [owner] = await db.select({ role: users.role }).from(users).where(eq(users.id, ownerUid)).limit(1);
    if (owner?.role === "trainer") return true;
  }
  return false;
}

export async function isValidTrainerUidPath(ownerUid: string): Promise<boolean> {
  const [t] = await db.select({ uid: trainers.uid }).from(trainers).where(eq(trainers.uid, ownerUid)).limit(1);
  return Boolean(t);
}

export const maxUploadBytes = 6 * 1024 * 1024;

/* ------------------------------------------------------------------ */
/* Reading a stored file (Supabase Storage or local ./uploads)         */
/* ------------------------------------------------------------------ */

export function contentTypeFor(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

export async function readStoredFile(storagePath: string): Promise<Buffer | null> {
  if (supabaseEnabled) {
    const { data, error } = await supabaseAdmin().storage.from(SUPABASE_BUCKET).download(storagePath);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  const { readFile } = await import("fs/promises");
  try {
    return await readFile(path.join(UPLOAD_ROOT, storagePath));
  } catch {
    return null;
  }
}
