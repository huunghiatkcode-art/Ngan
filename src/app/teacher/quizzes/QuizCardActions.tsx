"use client";
import { useTransition } from "react";
import { deleteQuizAction, duplicateQuizAction } from "./actions";
import ConfirmButton from "@/components/ui/ConfirmButton";
import Button from "@/components/ui/Button";
import { Copy } from "lucide-react";

export default function QuizCardActions({ quizId }: { quizId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2 mt-3">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(() => duplicateQuizAction(quizId))}>
        <Copy size={13} /> Nhân bản
      </Button>
      <ConfirmButton onConfirm={() => startTransition(() => deleteQuizAction(quizId))}>Xóa</ConfirmButton>
    </div>
  );
}
