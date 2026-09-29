"use server";

import { redirect } from "next/navigation";
import { studentLoginSchema } from "@/lib/question-engine/validation";
import { verifyStudentLogin } from "@/services/student-auth.service";
import { createStudentSession } from "@/lib/auth/student-session";
import type { ActionResult } from "@/app/(auth)/actions";

export async function studentLoginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = studentLoginSchema.safeParse({
    username: formData.get("username"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const result = await verifyStudentLogin(parsed.data.username, parsed.data.pin);
  if (!result.ok) {
    const error =
      result.reason === "disabled"
        ? "Tài khoản của bạn đã bị khóa. Liên hệ giáo viên."
        : result.reason === "locked"
        ? "Bạn đã nhập sai PIN quá nhiều lần. Tài khoản tạm khóa 15 phút, hoặc nhờ giáo viên đặt lại PIN."
        : "Tên đăng nhập hoặc mã PIN không đúng.";
    return { ok: false, error };
  }

  await createStudentSession({
    studentId: result.student.id,
    teacherId: result.student.teacher_id,
    username: result.student.username,
    fullName: result.student.full_name,
  });

  redirect("/student/dashboard");
}
