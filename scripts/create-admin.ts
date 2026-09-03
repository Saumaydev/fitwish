/* ------------------------------------------------------------------ */
/* Fitwish — create the first ADMIN account.                           */
/*                                                                     */
/*   npx tsx scripts/create-admin.ts "you@gym.com" "StrongPass@123" "Your Name"
/*                                                                     */
/* If Supabase is configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)*/
/* the login credential is created in Supabase Auth. Otherwise a local */
/* scrypt password hash is stored. Safe to re-run: it upgrades an      */
/* existing account with that email to the admin role.                 */
/* ------------------------------------------------------------------ */

import "dotenv/config";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
import { supabaseAdmin, supabaseEnabled } from "../src/lib/supabase";
import { SUPABASE_MANAGED } from "../src/lib/services/auth";

async function main() {
  const [emailArg, passwordArg, ...nameParts] = process.argv.slice(2);
  const email = (emailArg ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = passwordArg ?? process.env.ADMIN_PASSWORD ?? "";
  const name = (nameParts.join(" ") || process.env.ADMIN_NAME || "Administrator").trim();

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/create-admin.ts "email" "password" "Full Name"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    await db
      .update(users)
      .set({ role: "admin", approvalStatus: "approved", updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    console.log(`Existing account ${email} is now an ADMIN.`);
    return;
  }

  let uid: string = randomUUID();
  let passwordHash = hashPassword(password);

  if (supabaseEnabled) {
    const { data, error } = await supabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "admin" },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Supabase user creation failed");
    uid = data.user.id;
    passwordHash = SUPABASE_MANAGED;
  }

  await db.insert(users).values({
    id: uid,
    role: "admin",
    name,
    email,
    phone: process.env.ADMIN_PHONE ?? "",
    passwordHash,
    approvalStatus: "approved",
  });

  console.log(`Admin account created: ${email}`);
  console.log(supabaseEnabled ? "Credential stored in Supabase Auth." : "Credential stored locally (scrypt).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
