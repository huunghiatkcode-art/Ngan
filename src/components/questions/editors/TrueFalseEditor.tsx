"use client";
import type { TrueFalseData } from "@/types/question";

export default function TrueFalseEditor({ data, onChange }: { data: TrueFalseData; onChange: (d: TrueFalseData) => void }) {
  return (
    <div className="flex gap-3">
      {[{ v: true, label: "Đúng" }, { v: false, label: "Sai" }].map((opt) => (
        <button
          key={String(opt.v)}
          type="button"
          onClick={() => onChange({ type: "true_false", correctValue: opt.v })}
          className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm ${
            data.correctValue === opt.v ? "border-[var(--color-success)] bg-green-50 text-green-700" : "border-[var(--border)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
