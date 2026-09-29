"use client";
import { useActionState, useState } from "react";
import { createClassAction } from "./actions";
import type { ActionResult } from "@/app/(auth)/actions";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormError from "@/components/ui/FormError";
import { Plus, X } from "lucide-react";

const initial: ActionResult = { ok: true };

export default function NewClassForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createClassAction, initial);

  if (state.ok && open && !pending) {
    // Successful submit closes the panel (revalidatePath already refreshed the list).
  }

  return (
    <div>
      <Button variant="primary" onClick={() => setOpen((v) => !v)}>
        {open ? <X size={14} /> : <Plus size={14} />} {open ? "Đóng" : "Tạo lớp"}
      </Button>
      {open && (
        <form
          action={async (fd) => {
            await formAction(fd);
            setOpen(false);
          }}
          className="card p-4 mt-3 space-y-3 absolute right-6 w-80 z-10"
        >
          <div>
            <label className="text-xs font-medium text-[var(--muted)]">Tên lớp</label>
            <Input name="name" required className="mt-1" placeholder="Lớp 10A1" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted)]">Mô tả (tuỳ chọn)</label>
            <Input name="description" className="mt-1" />
          </div>
          {!state.ok && <FormError message={state.error} />}
          <Button type="submit" variant="primary" disabled={pending} className="w-full">
            {pending ? "Đang tạo..." : "Tạo lớp"}
          </Button>
        </form>
      )}
    </div>
  );
}
