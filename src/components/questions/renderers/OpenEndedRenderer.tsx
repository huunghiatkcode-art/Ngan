"use client";
import Textarea from "@/components/ui/Textarea";

export default function OpenEndedRenderer({ value, onChange, disabled, instructions, characterLimit }: { value: string; onChange: (v: string) => void; disabled?: boolean; instructions?: string; characterLimit?: number }) {
  return (
    <div className="space-y-2">
      {instructions && <p className="text-xs text-[var(--muted)]">{instructions}</p>}
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={6} maxLength={characterLimit} placeholder="Nhập câu trả lời của bạn..." />
      {characterLimit && <p className="text-xs text-[var(--muted)] text-right">{value.length}/{characterLimit}</p>}
    </div>
  );
}
