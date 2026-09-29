"use client";
import { useActionState } from "react";
import { createStudentAction } from "../actions";
import type { ActionResult } from "@/app/(auth)/actions";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Card from "@/components/ui/Card";

const initial: ActionResult = { ok: true };

export default function AddStudentForm({ classId }: { classId: string }) {
  const action = createStudentAction.bind(null, classId);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <Card className="p-4">
      <h2 className="font-semibold text-sm mb-3">Thêm học sinh</h2>
      <form action={formAction} className="space-y-2">
        <Input name="fullName" placeholder="Họ tên" required />
        <Input name="username" placeholder="Tên đăng nhập (vd: nguyenvana)" required />
        <Input name="studentCode" placeholder="Mã học sinh (vd: HS001)" required />
        <Input name="pin" placeholder="Mã PIN (4-8 số)" inputMode="numeric" required />
        {!state.ok && <FormError message={state.error} />}
        <Button type="submit" variant="primary" disabled={pending} className="w-full">
          {pending ? "Đang thêm..." : "Thêm học sinh"}
        </Button>
      </form>
    </Card>
  );
}
