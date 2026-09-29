import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/** Returns the logged-in teacher's profile, or null if not authenticated. */
export async function getCurrentTeacher(): Promise<Profile | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (profile as Profile) ?? null;
}

/** Use at the top of any teacher-only Server Component / layout. */
export async function requireTeacher(): Promise<Profile> {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  return teacher;
}
