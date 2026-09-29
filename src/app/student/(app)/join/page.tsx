"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { joinAssignmentAction } from "../quiz/actions";
import type { ActionResult } from "@/app/(auth)/actions";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";

const initial: ActionResult = { ok: true };

export default function JoinPage() {
  const [state, formAction, pending] = useActionState(joinAssignmentAction, initial);
  return (
    <div className="p-6 max-w-sm mx-auto">
      <Link href="/student/dashboard" className="text-sm text-[var(--muted)] flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Quay lại
      </Link>
      <div className="card p-6">
        <h1 className="text-lg font-semibold">Vào bài kiểm tra</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Nhập mã bài kiểm tra giáo viên cung cấp.</p>
        <form action={formAction} className="mt-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--muted)]">Mã bài kiểm tra</label>
            <Input name="joinCode" required maxLength={12} className="mt-1 uppercase tracking-widest text-center text-lg font-mono" placeholder="CAF123" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted)]">Mật khẩu (nếu có)</label>
            <Input name="password" type="password" className="mt-1" />
          </div>
          {!state.ok && <FormError message={state.error} />}
          <Button type="submit" variant="primary" disabled={pending} className="w-full">
            {pending ? "Đang vào..." : "Bắt đầu làm bài"}
          </Button>
        </form>
      </div>
    </div>
  );
}
