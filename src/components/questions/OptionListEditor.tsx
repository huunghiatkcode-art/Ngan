"use client";
import { v4 as uuid } from "uuid";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { QuestionOption } from "@/types/question";

interface Props {
  options: QuestionOption[];
  correctIds: string[];
  mode: "single" | "multi";
  onChangeOptions: (options: QuestionOption[]) => void;
  onChangeCorrect: (ids: string[]) => void;
}

export default function OptionListEditor({ options, correctIds, mode, onChangeOptions, onChangeCorrect }: Props) {
  const update = (id: string, text: string) => onChangeOptions(options.map((o) => (o.id === id ? { ...o, text } : o)));
  const remove = (id: string) => {
    onChangeOptions(options.filter((o) => o.id !== id));
    onChangeCorrect(correctIds.filter((c) => c !== id));
  };
  const add = () => {
    if (options.length >= 10) return;
    onChangeOptions([...options, { id: uuid(), text: "" }]);
  };
  const toggleCorrect = (id: string) => {
    if (mode === "single") onChangeCorrect([id]);
    else onChangeCorrect(correctIds.includes(id) ? correctIds.filter((c) => c !== id) : [...correctIds, id]);
  };

  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          <GripVertical size={14} className="text-[var(--muted)] shrink-0" />
          <button
            type="button"
            onClick={() => toggleCorrect(o.id)}
            className={`shrink-0 w-5 h-5 flex items-center justify-center border-2 ${mode === "single" ? "rounded-full" : "rounded"} ${
              correctIds.includes(o.id) ? "bg-[var(--color-success)] border-[var(--color-success)] text-white" : "border-[var(--border)]"
            }`}
            aria-label="Đánh dấu đáp án đúng"
          >
            {correctIds.includes(o.id) && "✓"}
          </button>
          <input
            value={o.text}
            onChange={(e) => update(o.id, e.target.value)}
            placeholder={`Đáp án ${i + 1}`}
            className="input flex-1"
          />
          <button type="button" onClick={() => remove(o.id)} disabled={options.length <= 2} className="p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)] disabled:opacity-30" aria-label="Xóa đáp án">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} disabled={options.length >= 10} className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium disabled:opacity-40">
        <Plus size={15} /> Thêm đáp án
      </button>
    </div>
  );
}
