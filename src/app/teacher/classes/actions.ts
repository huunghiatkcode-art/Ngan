"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as ClassService from "@/services/class.service";
import * as StudentService from "@/services/student.service";
import { classInputSchema, studentInputSchema } from "@/lib/question-engine/validation";
import type { ActionResult } from "@/app/(auth)/actions";

export async function createClassAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const parsed = classInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createServerSupabase();
  await ClassService.createClass(supabase, teacher.id, parsed.data.name, parsed.data.description);
  revalidatePath("/teacher/classes");
  return { ok: true };
}

export async function deleteClassAction(classId: string) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  await ClassService.deleteClass(supabase, classId);
  revalidatePath("/teacher/classes");
}

export async function createStudentAction(classId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const parsed = studentInputSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    studentCode: formData.get("studentCode"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createServerSupabase();
  try {
    const student = await StudentService.createStudent(supabase, teacher.id, parsed.data);
    await ClassService.addStudentToClass(supabase, classId, student.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message.includes("duplicate") ? "Username hoặc mã học sinh đã tồn tại." : "Không thể tạo học sinh." };
  }
  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true };
}

export async function removeStudentFromClassAction(classId: string, studentId: string) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  await ClassService.removeStudentFromClass(supabase, classId, studentId);
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function resetStudentPinAction(classId: string, studentId: string): Promise<string> {
  await requireTeacher();
  const supabase = await createServerSupabase();
  const pin = await StudentService.resetStudentPin(supabase, studentId);
  revalidatePath(`/teacher/classes/${classId}`);
  return pin;
}

export async function toggleStudentActiveAction(classId: string, studentId: string, isActive: boolean) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  await StudentService.updateStudent(supabase, studentId, { is_active: isActive });
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function bulkImportStudentsAction(classId: string, rows: { full_name: string; username: string; student_code: string }[]) {
  const teacher = await requireTeacher();
  const supabase = await createServerSupabase();
  const { result, createdPins } = await StudentService.bulkImportStudents(supabase, teacher.id, rows);
  // Enroll every newly created student into the class.
  const { data: created } = await supabase
    .from("students")
    .select("id, username")
    .eq("teacher_id", teacher.id)
    .in("username", createdPins.map((p) => p.username));
  if (created?.length) {
    await Promise.all(created.map((s) => ClassService.addStudentToClass(supabase, classId, s.id)));
  }
  revalidatePath(`/teacher/classes/${classId}`);
  return { result, createdPins };
}
