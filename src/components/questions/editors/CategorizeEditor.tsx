"use client";
import { v4 as uuid } from "uuid";
import { Plus, Trash2 } from "lucide-react";
import type { CategorizeData } from "@/types/question";
import Input from "@/components/ui/Input";

export default function CategorizeEditor({ data, onChange }: { data: CategorizeData; onChange: (d: CategorizeData) => void }) {
  const addCategory = () => onChange({ ...data, categories: [...data.categories, { id: uuid(), name: `Nhóm ${data.categories.length + 1}` }] });
  const removeCategory = (id: string) => onChange({ categories: data.categories.filter((c) => c.id !== id), items: data.items.filter((it) => it.categoryId !== id) } as CategorizeData);
  const addItem = () => onChange({ ...data, items: [...data.items, { id: uuid(), text: `Mục ${data.items.length + 1}`, categoryId: data.categories[0]?.id ?? "" }] });

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-[var(--muted)]">Nhóm phân loại</label>
          <button type="button" onClick={addCategory} className="text-xs text-[var(--color-primary)] font-medium flex items-center gap-1"><Plus size={13} /> Thêm nhóm</button>
        </div>
        <div className="space-y-2">
          {data.categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <Input value={c.name} onChange={(e) => onChange({ ...data, categories: data.categories.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })} className="flex-1" />
              <button type="button" onClick={() => removeCategory(c.id)} disabled={data.categories.length <= 2} className="p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)] disabled:opacity-30"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-[var(--muted)]">Mục cần phân loại</label>
          <button type="button" onClick={addItem} disabled={!data.categories.length} className="text-xs text-[var(--color-primary)] font-medium flex items-center gap-1 disabled:opacity-40"><Plus size={13} /> Thêm mục</button>
        </div>
        <div className="space-y-2">
          {data.items.map((it) => (
            <div key={it.id} className="flex items-center gap-2">
              <Input value={it.text} onChange={(e) => onChange({ ...data, items: data.items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)) })} className="flex-1" />
              <select value={it.categoryId} onChange={(e) => onChange({ ...data, items: data.items.map((x) => (x.id === it.id ? { ...x, categoryId: e.target.value } : x)) })} className="input !w-auto py-1.5">
                {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" onClick={() => onChange({ ...data, items: data.items.filter((x) => x.id !== it.id) })} className="p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
