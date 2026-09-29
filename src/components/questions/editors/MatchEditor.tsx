"use client";
import { v4 as uuid } from "uuid";
import { Plus, Trash2 } from "lucide-react";
import type { MatchData } from "@/types/question";
import Input from "@/components/ui/Input";

export default function MatchEditor({ data, onChange }: { data: MatchData; onChange: (d: MatchData) => void }) {
  const update = (id: string, patch: Partial<{ left: string; right: string }>) =>
    onChange({ ...data, pairs: data.pairs.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs font-medium text-[var(--muted)] px-1">
        <span className="flex-1">Cột trái</span>
        <span className="flex-1">Cột phải</span>
        <span className="w-7" />
      </div>
      {data.pairs.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <Input value={p.left} onChange={(e) => update(p.id, { left: e.target.value })} className="flex-1" />
          <Input value={p.right} onChange={(e) => update(p.id, { right: e.target.value })} className="flex-1" />
          <button type="button" onClick={() => onChange({ ...data, pairs: data.pairs.filter((x) => x.id !== p.id) })} disabled={data.pairs.length <= 1} className="p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)] disabled:opacity-30">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ ...data, pairs: [...data.pairs, { id: uuid(), left: "", right: "" }] })} className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium">
        <Plus size={14} /> Thêm cặp
      </button>
    </div>
  );
}
