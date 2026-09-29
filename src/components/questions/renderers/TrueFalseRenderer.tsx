"use client";
export default function TrueFalseRenderer({
  value, onChange, disabled, correctValue,
}: { value: boolean | null; onChange: (v: boolean) => void; disabled?: boolean; correctValue?: boolean }) {
  return (
    <div className="flex gap-3">
      {[{ v: true, label: "Đúng" }, { v: false, label: "Sai" }].map((opt) => {
        const isSelected = value === opt.v;
        const isCorrect = correctValue === opt.v;
        const showWrong = correctValue !== undefined && isSelected && !isCorrect;
        return (
          <button key={String(opt.v)} type="button" disabled={disabled} onClick={() => onChange(opt.v)}
            className={`flex-1 py-4 rounded-xl border-2 font-medium disabled:cursor-default ${
              correctValue !== undefined
                ? isCorrect ? "border-[var(--color-success)] bg-green-50" : showWrong ? "border-[var(--color-danger)] bg-red-50" : "border-[var(--border)]"
                : isSelected ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--border)] hover:border-[var(--color-primary)]/50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
