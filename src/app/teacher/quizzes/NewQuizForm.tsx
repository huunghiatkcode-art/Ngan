"use client";
import { useActionState, useState } from "react";
import { createQuizAction } from "./actions";
import type { ActionResult } from "@/app/(auth)/actions";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import { Plus, X } from "lucide-react";

const initial: ActionResult = { ok: true };

export default function NewQuizForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createQuizAction, initial);
  return (
    <div className="relative">
      <Button variant="primary" onClick={() => setOpen((v) => !v)}>{open ? <X size={14} /> : <Plus size={14} />} {open ? "Đóng" : "Tạo bộ câu hỏi"}</Button>
      {open && (
        <form action={formAction} className="card p-4 mt-2 space-y-3 absolute right-0 w-80 z-10">
          <div>
            <label className="text-xs font-medium text-[var(--muted)]">Tiêu đề</label>
            <Input name="title" required className="mt-1" placeholder="Kiểm tra 15 phút - Chương 1" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted)]">Mô tả (tuỳ chọn)</label>
            <Input name="description" className="mt-1" />
          </div>
          {!state.ok && <FormError message={state.error} />}
          <Button type="submit" variant="primary" disabled={pending} className="w-full">{pending ? "Đang tạo..." : "Tạo & mở soạn thảo"}</Button>
        </form>
      )}
    </div>
  );
}
