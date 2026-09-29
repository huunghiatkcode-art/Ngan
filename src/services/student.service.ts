import "server-only";
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hashSecret } from "@/lib/auth/hash";
import type { Student } from "@/types/database";

export async function listStudents(supabase: SupabaseClient, teacherId: string) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("full_name");
  if (error) throw error;
  return data as Student[];
}

export async function createStudent(
  supabase: SupabaseClient,
  teacherId: string,
  input: { fullName: string; username: string; studentCode: string; pin: string }
) {
  const pinHash = await hashSecret(input.pin);
  const { data, error } = await supabase
    .from("students")
    .insert({
      teacher_id: teacherId,
      full_name: input.fullName,
      username: input.username.toLowerCase(),
      student_code: input.studentCode,
      pin_hash: pinHash,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Student;
}

export interface BulkImportRow {
  full_name: string;
  username: string;
  student_code: string;
}
export interface BulkImportResult {
  created: number;
  errors: { row: number; message: string }[];
}

/** Each imported student gets a random 4-digit PIN, returned so the teacher can share it. */
export async function bulkImportStudents(
  supabase: SupabaseClient,
  teacherId: string,
  rows: BulkImportRow[]
): Promise<{ result: BulkImportResult; createdPins: { username: string; pin: string }[] }> {
  const result: BulkImportResult = { created: 0, errors: [] };
  const createdPins: { username: string; pin: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.full_name?.trim() || !row.username?.trim() || !row.student_code?.trim()) {
      result.errors.push({ row: i + 1, message: "Thiếu dữ liệu bắt buộc (full_name/username/student_code)" });
      continue;
    }
    const pin = String(randomInt(1000, 10000));
    const pinHash = await hashSecret(pin);
    const { error } = await supabase.from("students").insert({
      teacher_id: teacherId,
      full_name: row.full_name.trim(),
      username: row.username.trim().toLowerCase(),
      student_code: row.student_code.trim(),
      pin_hash: pinHash,
    });
    if (error) {
      result.errors.push({ row: i + 1, message: error.message.includes("duplicate") ? "Username hoặc mã học sinh đã tồn tại" : error.message });
      continue;
    }
    result.created++;
    createdPins.push({ username: row.username.trim().toLowerCase(), pin });
  }

  return { result, createdPins };
}

export async function updateStudent(
  supabase: SupabaseClient,
  studentId: string,
  patch: Partial<Pick<Student, "full_name" | "student_code" | "is_active">>
) {
  const { data, error } = await supabase.from("students").update(patch).eq("id", studentId).select().single();
  if (error) throw error;
  return data as Student;
}

export async function resetStudentPin(supabase: SupabaseClient, studentId: string): Promise<string> {
  const pin = String(randomInt(1000, 10000));
  const pinHash = await hashSecret(pin);
  const { error } = await supabase.from("students").update({ pin_hash: pinHash, failed_login_count: 0, locked_until: null }).eq("id", studentId);
  if (error) throw error;
  return pin;
}

export async function deleteStudent(supabase: SupabaseClient, studentId: string) {
  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) throw error;
}
