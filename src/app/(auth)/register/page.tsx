"use client";
import { useActionState } from "react";
import Link from "next/link";
import { registerTeacherAction, type ActionResult } from "../actions";
import FormError from "@/components/ui/FormError";

const initial: ActionResult = { ok: true };

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerTeacherAction, initial);
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form action={action} className="card p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Tạo tài khoản giáo viên</h1>
        <div><label htmlFor="fullName" className="text-xs font-medium">Họ và tên</label><input id="fullName" name="fullName" required className="input mt-1" /></div>
        <div><label htmlFor="email" className="text-xs font-medium">Email</label><input id="email" name="email" type="email" required className="input mt-1" /></div>
        <div><label htmlFor="password" className="text-xs font-medium">Mật khẩu (tối thiểu 6 ký tự)</label><input id="password" name="password" type="password" minLength={6} required className="input mt-1" /></div>
        <div><label htmlFor="signupCode" className="text-xs font-medium">Mã đăng ký giáo viên (nếu quản trị viên yêu cầu)</label><input id="signupCode" name="signupCode" className="input mt-1" autoComplete="off" /></div>
        {!state.ok && <FormError message={state.error} />}
        <button disabled={pending} className="btn btn-primary w-full">{pending ? "Đang tạo..." : "Đăng ký"}</button>
        <p className="text-xs text-[var(--muted)] text-center">Đã có tài khoản? <Link href="/login" className="text-[var(--color-primary)]">Đăng nhập</Link></p>
      </form>
    </main>
  );
}
