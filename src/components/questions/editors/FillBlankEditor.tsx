"use client";
import { Plus, Trash2 } from "lucide-react";
import type { FillBlankData } from "@/types/question";
import Input from "@/components/ui/Input";

export default function FillBlankEditor({ data, onChange }: { data: FillBlankData; onChange: (d: FillBlankData) => void }) {
  const update = (i: number, v: string) => {
    const next = [...data.acceptedAnswers];
    next[i] = v;
    onChange({ ...data, acceptedAnswers: next });
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted)]">Liệt kê tất cả đáp án được chấp nhận (mỗi biến thể một dòng).</p>
      {data.acceptedAnswers.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={a} onChange={(e) => update(i, e.target.value)} placeholder="Đáp án được chấp nhận" className="flex-1" />
          <button type="button" onClick={() => onChange({ ...data, acceptedAnswers: data.acceptedAnswers.filter((_, idx) => idx !== i) })} disabled={data.acceptedAnswers.length <= 1} className="p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)] disabled:opacity-30">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ ...data, acceptedAnswers: [...data.acceptedAnswers, ""] })} className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium">
        <Plus size={14} /> Thêm đáp án
      </button>
      <label className="flex items-center gap-2 text-sm pt-1">
        <input type="checkbox" checked={data.caseSensitive} onChange={(e) => onChange({ ...data, caseSensitive: e.target.checked })} />
        Phân biệt chữ hoa/thường
      </label>
    </div>
  );
}
