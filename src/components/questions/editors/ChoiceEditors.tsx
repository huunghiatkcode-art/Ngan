"use client";
import { v4 as uuid } from "uuid";
import { Plus, Trash2 } from "lucide-react";
import type { MultipleChoiceData, MultiSelectData, QuestionOption } from "@/types/question";

function OptionRows({
  options, isCorrect, onToggle, onText, onRemove, onAdd, mode,
}: {
  options: QuestionOption[]; isCorrect: (id: string) => boolean; onToggle: (id: string) => void;
  onText: (id: string, t: string) => void; onRemove: (id: string) => void; onAdd: () => void; mode: "radio" | "checkbox";
}) {
  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          <input type={mode} name="correct" checked={isCorrect(o.id)} onChange={() => onToggle(o.id)} aria-label={`Đáp án ${i + 1} đúng`} className="h-4 w-4" />
          <input value={o.text} onChange={(e) => onText(o.id, e.target.value)} placeholder={`Đáp án ${i + 1}`} className="input" aria-label={`Nội dung đáp án ${i + 1}`} />
          <button type="button" disabled={options.length <= 2} onClick={() => onRemove(o.id)} className="p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)] disabled:opacity-30" aria-label="Xóa đáp án"><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" disabled={options.length >= 10} onClick={onAdd} className="text-sm text-[var(--color-primary)] font-medium flex items-center gap-1"><Plus size={14} /> Thêm đáp án</button>
    </div>
  );
}

export function MultipleChoiceEditor({ data, onChange }: { data: MultipleChoiceData; onChange: (d: MultipleChoiceData) => void }) {
  return (
    <div className="space-y-3">
      <OptionRows
        mode="radio" options={data.options} isCorrect={(id) => data.correctOptionId === id}
        onToggle={(id) => onChange({ ...data, correctOptionId: id })}
        onText={(id, t) => onChange({ ...data, options: data.options.map((o) => (o.id === id ? { ...o, text: t } : o)) })}
        onRemove={(id) => {
          const options = data.options.filter((o) => o.id !== id);
          onChange({ ...data, options, correctOptionId: data.correctOptionId === id ? options[0].id : data.correctOptionId });
        }}
        onAdd={() => onChange({ ...data, options: [...data.options, { id: uuid(), text: "" }] })}
      />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.shuffleOptions} onChange={(e) => onChange({ ...data, shuffleOptions: e.target.checked })} /> Xáo trộn thứ tự đáp án</label>
    </div>
  );
}

export function MultiSelectEditor({ data, onChange }: { data: MultiSelectData; onChange: (d: MultiSelectData) => void }) {
  return (
    <div className="space-y-3">
      <OptionRows
        mode="checkbox" options={data.options} isCorrect={(id) => data.correctOptionIds.includes(id)}
        onToggle={(id) => onChange({ ...data, correctOptionIds: data.correctOptionIds.includes(id) ? data.correctOptionIds.filter((x) => x !== id) : [...data.correctOptionIds, id] })}
        onText={(id, t) => onChange({ ...data, options: data.options.map((o) => (o.id === id ? { ...o, text: t } : o)) })}
        onRemove={(id) => onChange({ ...data, options: data.options.filter((o) => o.id !== id), correctOptionIds: data.correctOptionIds.filter((x) => x !== id) })}
        onAdd={() => onChange({ ...data, options: [...data.options, { id: uuid(), text: "" }] })}
      />
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={data.shuffleOptions} onChange={(e) => onChange({ ...data, shuffleOptions: e.target.checked })} /> Xáo trộn đáp án</label>
        <label className="flex items-center gap-2">Cách chấm:
          <select className="input !w-auto" value={data.scoringMode} onChange={(e) => onChange({ ...data, scoringMode: e.target.value as MultiSelectData["scoringMode"] })}>
            <option value="all_or_nothing">Đúng hết mới được điểm</option>
            <option value="partial">Tính điểm từng phần</option>
          </select>
        </label>
      </div>
    </div>
  );
}
