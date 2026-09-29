"use client";
import { useState, useTransition } from "react";
import { removeStudentFromClassAction, resetStudentPinAction, toggleStudentActiveAction } from "../actions";
import type { Student } from "@/types/database";
import Badge from "@/components/ui/Badge";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { KeyRound } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";

export default function StudentRow({ classId, student }: { classId: string; student: Student }) {
  const [pending, startTransition] = useTransition();
  const [newPin, setNewPin] = useState<string | null>(null);
  const toast = useToast();

  return (
    <div className="flex items-center gap-3 py-2.5 text-sm">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{student.full_name}</p>
        <p className="text-xs text-[var(--muted)]">@{student.username} · {student.student_code}</p>
      </div>
      {!student.is_active && <Badge tone="warning">Đã khóa</Badge>}
      {newPin && <span className="text-xs">PIN mới: <strong>{newPin}</strong></span>}
      <button
        disabled={pending}
        onClick={() => startTransition(async () => {
          const pin = await resetStudentPinAction(classId, student.id);
          setNewPin(pin);
          toast.show("Đã đặt lại PIN", "success");
        })}
        className="p-1.5 text-[var(--muted)] hover:text-[var(--color-primary)]"
        title="Đặt lại PIN"
      >
        <KeyRound size={14} />
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(() => toggleStudentActiveAction(classId, student.id, !student.is_active))}
        className="text-xs text-[var(--muted)] underline"
      >
        {student.is_active ? "Khóa" : "Mở khóa"}
      </button>
      <ConfirmButton size="sm" onConfirm={() => startTransition(() => removeStudentFromClassAction(classId, student.id))}>
        Xóa
      </ConfirmButton>
    </div>
  );
}
