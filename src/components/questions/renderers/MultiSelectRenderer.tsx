"use client";
import type { QuestionOption } from "@/types/question";

export default function MultiSelectRenderer({
  options,
  value,
  onChange,
  disabled,
  correctOptionIds,
}: {
  options: QuestionOption[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  correctOptionIds?: string[];
}) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="space-y-2">
      {options.map((o) => {
        const isSelected = value.includes(o.id);
        const isCorrect = correctOptionIds?.includes(o.id);
        const showWrong = correctOptionIds !== undefined && isSelected && !isCorrect;
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(o.id)}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors disabled:cursor-default ${
              correctOptionIds !== undefined
                ? isCorrect ? "border-[var(--color-success)] bg-green-50" : showWrong ? "border-[var(--color-danger)] bg-red-50" : "border-[var(--border)]"
                : isSelected ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--border)] hover:border-[var(--color-primary)]/50"
            }`}
          >
            <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs shrink-0 ${isSelected ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white" : "border-[var(--border)]"}`}>
              {isSelected && "✓"}
            </span>
            <span className="text-sm">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}
