"use client";
import Input from "@/components/ui/Input";

export default function FillBlankRenderer({ value, onChange, disabled, correctAnswers }: { value: string; onChange: (v: string) => void; disabled?: boolean; correctAnswers?: string[] }) {
  return (
    <div className="space-y-2">
      <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder="Nhập câu trả lời của bạn..." className="text-sm py-3" />
      {correctAnswers && <p className="text-xs text-[var(--color-success)]">Đáp án đúng: {correctAnswers.join(" / ")}</p>}
    </div>
  );
}
