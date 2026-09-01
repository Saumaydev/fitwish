import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/* Supabase (server-side only)                                         */
/*                                                                     */
/* Two features are backed by Supabase when the env vars are present:  */
/*   • Email authentication  (Supabase Auth — email + password)        */
/*   • File storage          (Supabase Storage — private bucket)       */
/*                                                                     */
/* If the env vars are missing the app silently falls back to the      */
/* built-in local mode (scrypt passwords + ./uploads folder), so the   */
/* project still runs on a plain machine without any keys.             */
/* ------------------------------------------------------------------ */

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "fitwish-uploads";

/** True when Supabase is configured (auth + storage take the Supabase path). */
export const supabaseEnabled = Boolean(url && serviceKey);

let client: SupabaseClient | null = null;

/** Service-role client. Server-side only — never import this in a client component. */
export function supabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}
