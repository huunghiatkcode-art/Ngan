"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — uses the public anon key only. Every table it
 * can touch is protected by the RLS policies in supabase/migrations, so it
 * is safe to use directly from client components (e.g. realtime
 * subscriptions on the teacher monitoring dashboard).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
