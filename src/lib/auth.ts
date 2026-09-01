import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { authSessions, trainers, users } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "./constants";
import type { Role } from "./types";

export type SessionUser = typeof users.$inferSelect;

/* ------------------------------------------------------------------ */
/* Password hashing (scrypt)                                           */
/* ------------------------------------------------------------------ */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const test = scryptSync(password, salt, 64);
    const real = Buffer.from(hash, "hex");
    return test.length === real.length && timingSafeEqual(test, real);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await db.insert(authSessions).values({
    id: randomUUID(),
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86400000),
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86400,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}

/* ------------------------------------------------------------------ */
/* Routing helpers                                                     */
/* ------------------------------------------------------------------ */

export function roleHome(role: Role): string {
  if (role === "admin") return "/app/admin/dashboard";
  if (role === "trainer") return "/app/trainer/home";
  return "/app/user/home";
}

/** Server-component guard for role layouts. Redirects when unauthorized. */
export async function requireRole(allowed: Role[], pendingPath = "/pending") {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const role = user.role as Role;
  if (!allowed.includes(role)) redirect(roleHome(role));
  if (role === "user" && user.approvalStatus !== "approved") redirect(pendingPath);
  if (role === "trainer") {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.uid, user.id)).limit(1);
    if (!trainer || trainer.approvalStatus !== "approved" || trainer.adminApproval !== "approved" || !trainer.isActive) {
      redirect(pendingPath);
    }
  }
  return user;
}

/* ------------------------------------------------------------------ */
/* API error helper                                                    */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** API-route guard. Throws ApiError (401/403) when unauthorized. */
export async function requireApiUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  const role = user.role as Role;
  if (roles && !roles.includes(role)) throw new ApiError(403, "You don't have permission to do that.");
  if (role === "user" && user.approvalStatus !== "approved") {
    throw new ApiError(403, "Your account is awaiting admin approval.");
  }
  if (role === "trainer") {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.uid, user.id)).limit(1);
    if (!trainer || trainer.approvalStatus !== "approved" || trainer.adminApproval !== "approved" || !trainer.isActive) {
      throw new ApiError(403, "Your trainer account is not active yet.");
    }
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireApiUser(["admin"]);
}
