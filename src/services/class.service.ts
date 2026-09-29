import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateCode } from "@/lib/utils/codes";
import type { Class, ClassMember, Student } from "@/types/database";

export async function listClasses(supabase: SupabaseClient, teacherId: string) {
  const { data, error } = await supabase
    .from("classes")
    .select("*, class_members(count)")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as (Class & { class_members: { count: number }[] })[];
}

export async function getClassWithStudents(supabase: SupabaseClient, classId: string) {
  const { data: klass, error } = await supabase.from("classes").select("*").eq("id", classId).single();
  if (error) throw error;

  const { data: members, error: mErr } = await supabase
    .from("class_members")
    .select("*, students(*)")
    .eq("class_id", classId);
  if (mErr) throw mErr;

  return { class: klass as Class, members: members as (ClassMember & { students: Student })[] };
}

export async function createClass(supabase: SupabaseClient, teacherId: string, name: string, description?: string) {
  let code = generateCode(6);
  // Extremely unlikely to collide, but guard anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase.from("classes").select("id").eq("class_code", code).maybeSingle();
    if (!existing) break;
    code = generateCode(6);
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({ teacher_id: teacherId, name, description, class_code: code })
    .select()
    .single();
  if (error) throw error;
  return data as Class;
}

export async function updateClass(supabase: SupabaseClient, classId: string, patch: Partial<Pick<Class, "name" | "description">>) {
  const { data, error } = await supabase.from("classes").update(patch).eq("id", classId).select().single();
  if (error) throw error;
  return data as Class;
}

export async function deleteClass(supabase: SupabaseClient, classId: string) {
  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) throw error;
}

export async function addStudentToClass(supabase: SupabaseClient, classId: string, studentId: string) {
  const { error } = await supabase.from("class_members").insert({ class_id: classId, student_id: studentId });
  if (error) throw error;
}

export async function removeStudentFromClass(supabase: SupabaseClient, classId: string, studentId: string) {
  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", studentId);
  if (error) throw error;
}
