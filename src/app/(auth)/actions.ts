"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapAuthError, safeNextPath } from "@/lib/auth/auth-errors";

export type ActionResult = { ok: true } | { ok: false; error: string };

const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên"),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  signupCode: z.string().optional(),
});

/**
 * Registers a teacher.
 *
 * Uses the Admin API with `email_confirm: true` instead of `auth.signUp`:
 *  - no confirmation e-mail is needed (Supabase's built-in SMTP is limited to
 *    a handful of e-mails per hour, which breaks sign-up on the free tier);
 *  - the account can sign in immediately.
 * If TEACHER_SIGNUP_CODE is set, the sign-up form must supply it, so strangers
 * who find the public URL cannot create teacher accounts.
 */
export async function registerTeacherAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    signupCode: formData.get("signupCode") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const requiredCode = process.env.TEACHER_SIGNUP_CODE;
  if (requiredCode && parsed.data.signupCode !== requiredCode) {
    return { ok: false, error: "Mã đăng ký giáo viên không đúng." };
  }

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (createError) return { ok: false, error: mapAuthError(createError) };

  const supabase = await createServerSupabase();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) return { ok: false, error: mapAuthError(signInError) };

  redirect("/teacher/dashboard");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export async function loginTeacherAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: mapAuthError(error) };

  redirect(safeNextPath(formData.get("next")));
}

export async function logoutTeacherAction() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
