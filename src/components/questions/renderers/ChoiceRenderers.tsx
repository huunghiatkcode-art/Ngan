"use client";
import type { QuestionOption } from "@/types/question";

export function MultipleChoiceRenderer({ options, selected, onSelect, disabled }: { options: QuestionOption[]; selected: string | null; onSelect: (id: string) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" className="space-y-2">
      {options.map((o, i) => (
        <button key={o.id} type="button" role="radio" aria-checked={selected === o.id} disabled={disabled} onClick={() => onSelect(o.id)}
          className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${selected === o.id ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--border)] hover:border-[var(--color-primary)]/50"}`}>
          <span className="w-6 h-6 shrink-0 rounded-full border-2 border-[var(--border)] flex items-center justify-center text-xs font-semibold">{String.fromCharCode(65 + i)}</span>
          <span className="text-sm">{o.text}</span>
        </button>
      ))}
    </div>
  );
}

export function MultiSelectRenderer({ options, selected, onToggle, disabled }: { options: QuestionOption[]; selected: string[]; onToggle: (id: string) => void; disabled?: boolean }) {
  return (
    <div role="group" className="space-y-2">
      <p className="text-xs text-[var(--muted)]">Chọn tất cả đáp án đúng.</p>
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button key={o.id} type="button" role="checkbox" aria-checked={on} disabled={disabled} onClick={() => onToggle(o.id)}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${on ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--border)] hover:border-[var(--color-primary)]/50"}`}>
            <span className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center text-xs ${on ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white" : "border-[var(--border)]"}`}>{on && "✓"}</span>
            <span className="text-sm">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}
