"use client";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginTeacherAction, type ActionResult } from "../actions";
import FormError from "@/components/ui/FormError";

const initial: ActionResult = { ok: true };

function LoginForm() {
  const [state, action, pending] = useActionState(loginTeacherAction, initial);
  const next = useSearchParams().get("next") ?? "";
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form action={action} className="card p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Đăng nhập giáo viên</h1>
        <input type="hidden" name="next" value={next} />
        <div><label htmlFor="email" className="text-xs font-medium">Email</label><input id="email" name="email" type="email" required className="input mt-1" /></div>
        <div><label htmlFor="password" className="text-xs font-medium">Mật khẩu</label><input id="password" name="password" type="password" required className="input mt-1" /></div>
        {!state.ok && <FormError message={state.error} />}
        <button disabled={pending} className="btn btn-primary w-full">{pending ? "Đang đăng nhập..." : "Đăng nhập"}</button>
        <p className="text-xs text-[var(--muted)] text-center">Chưa có tài khoản? <Link href="/register" className="text-[var(--color-primary)]">Đăng ký</Link> · <Link href="/student/login" className="text-[var(--color-primary)]">Tôi là học sinh</Link></p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
