import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY.
 *
 * `import "server-only"` makes any accidental client-side import fail the
 * build instead of leaking the key into a browser bundle.
 *
 * Used exclusively by:
 *  - student-facing server actions (students are not Supabase Auth users,
 *    so RLS's auth.uid() cannot protect their rows — authorization for
 *    every one of these actions is re-checked manually in TypeScript
 *    against the verified student session before any query runs), and
 *  - a small number of teacher operations that must cross RLS on purpose
 *    (e.g. hashing/storing a new student PIN).
 */
export function createAdminClient() {
  return createSupabaseClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
