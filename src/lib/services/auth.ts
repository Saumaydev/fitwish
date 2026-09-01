import { randomUUID } from "crypto";
import { db } from "@/db";
import { trainers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { supabaseAdmin, supabaseEnabled } from "@/lib/supabase";
import { APPROVAL, ROLES } from "@/lib/constants";
import type { Role } from "@/lib/types";

/** Marker stored in users.password_hash when Supabase Auth owns the credential. */
export const SUPABASE_MANAGED = "supabase-auth";

/* ------------------------------------------------------------------ */
/* Registration (member + trainer) — accounts start PENDING            */
/* ------------------------------------------------------------------ */

export interface RegisterInput {
  role: "user" | "trainer";
  name: string;
  email: string;
  phone: string;
  password: string;
  photoUrl?: string | null;
  qualification?: string;
  experience?: string;
  bio?: string;
  availability?: string;
}

export async function registerAccount(input: RegisterInput): Promise<{ uid: string; role: Role }> {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw new ApiError(409, "An account with this email already exists.");

  let uid: string = randomUUID();
  const passwordHash = supabaseEnabled ? SUPABASE_MANAGED : hashPassword(input.password);

  if (supabaseEnabled) {
    // Supabase Auth owns the email + password credential.
    const { data, error } = await supabaseAdmin().auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name.trim(), role: input.role },
    });
    if (error || !data.user) {
      throw new ApiError(400, error?.message ?? "Could not create the account.");
    }
    uid = data.user.id;
  }

  await db.insert(users).values({
    id: uid,
    role: input.role,
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    passwordHash,
    photoUrl: input.photoUrl ?? null,
    approvalStatus: APPROVAL.PENDING,
  });

  if (input.role === ROLES.TRAINER) {
    await db.insert(trainers).values({
      uid,
      name: input.name.trim(),
      qualification: input.qualification?.trim() || null,
      experience: input.experience?.trim() || null,
      bio: input.bio?.trim() || null,
      availability: input.availability?.trim() || null,
      photoUrl: input.photoUrl ?? null,
      approvalStatus: APPROVAL.PENDING,
      adminApproval: APPROVAL.PENDING,
      isActive: false,
    });
  }

  await createSession(uid);
  return { uid, role: input.role };
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

export async function loginAccount(emailRaw: string, password: string): Promise<string> {
  const email = emailRaw.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new ApiError(401, "Invalid email or password.");

  if (supabaseEnabled && user.passwordHash === SUPABASE_MANAGED) {
    const { error } = await supabaseAdmin().auth.signInWithPassword({ email, password });
    if (error) throw new ApiError(401, "Invalid email or password.");
  } else if (!verifyPassword(password, user.passwordHash)) {
    throw new ApiError(401, "Invalid email or password.");
  }
  await createSession(user.id);
  return user.id;
}

export async function changePassword(userId: string, current: string, next: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new ApiError(404, "Account not found.");
  if (next.length < 8) throw new ApiError(400, "New password must be at least 8 characters.");

  if (supabaseEnabled && user.passwordHash === SUPABASE_MANAGED) {
    const { error: signInError } = await supabaseAdmin().auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signInError) throw new ApiError(400, "Your current password is incorrect.");
    const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { password: next });
    if (error) throw new ApiError(400, error.message);
    await db.update(users).set({ updatedAt: new Date() }).where(eq(users.id, userId));
    return;
  }

  if (!verifyPassword(current, user.passwordHash)) {
    throw new ApiError(400, "Your current password is incorrect.");
  }
  await db
    .update(users)
    .set({ passwordHash: hashPassword(next), updatedAt: new Date() })
    .where(eq(users.id, userId));
}
