"use client";
import { useActionState } from "react";
import Link from "next/link";
import { studentLoginAction } from "./actions";
import type { ActionResult } from "../../(auth)/actions";
import FormError from "@/components/ui/FormError";

const initial: ActionResult = { ok: true };

export default function StudentLoginPage() {
  const [state, action, pending] = useActionState(studentLoginAction, initial);
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form action={action} className="card p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Đăng nhập học sinh</h1>
        <div><label htmlFor="username" className="text-xs font-medium">Tên đăng nhập</label><input id="username" name="username" autoComplete="username" required className="input mt-1" /></div>
        <div><label htmlFor="pin" className="text-xs font-medium">Mã PIN</label><input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="current-password" required className="input mt-1" /></div>
        {!state.ok && <FormError message={state.error} />}
        <button disabled={pending} className="btn btn-primary w-full">{pending ? "Đang đăng nhập..." : "Đăng nhập"}</button>
        <p className="text-xs text-[var(--muted)] text-center"><Link href="/login" className="text-[var(--color-primary)]">Tôi là giáo viên</Link></p>
      </form>
    </main>
  );
}
