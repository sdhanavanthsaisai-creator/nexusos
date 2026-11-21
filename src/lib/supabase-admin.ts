/**
 * Service-role Supabase client. Server-only.
 *
 * The service-role key bypasses row-level security, so this module must never be
 * imported from a client component. It exists for two jobs that cannot be done
 * safely with the browser session: creating a user's own profile row during
 * sign-up, and probing schema health.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (admin) return admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return admin;
}
