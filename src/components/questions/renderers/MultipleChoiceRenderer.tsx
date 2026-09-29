"use client";
import type { QuestionOption } from "@/types/question";

export default function MultipleChoiceRenderer({
  options,
  value,
  onChange,
  disabled,
  correctOptionId,
}: {
  options: QuestionOption[];
  value: string | null;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** only present in review mode (result page, show_correct_answer=true) */
  correctOptionId?: string;
}) {
  return (
    <div className="space-y-2">
      {options.map((o, i) => {
        const isSelected = value === o.id;
        const isCorrect = correctOptionId === o.id;
        const showWrong = correctOptionId !== undefined && isSelected && !isCorrect;
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors disabled:cursor-default ${
              correctOptionId !== undefined
                ? isCorrect
                  ? "border-[var(--color-success)] bg-green-50"
                  : showWrong
                  ? "border-[var(--color-danger)] bg-red-50"
                  : "border-[var(--border)]"
                : isSelected
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-[var(--border)] hover:border-[var(--color-primary)]/50"
            }`}
          >
            <span className="w-6 h-6 rounded-full border-2 border-[var(--border)] flex items-center justify-center text-xs font-semibold shrink-0">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="text-sm">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}
