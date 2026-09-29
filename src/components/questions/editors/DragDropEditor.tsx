"use client";
import { v4 as uuid } from "uuid";
import { Plus, Trash2 } from "lucide-react";
import type { DragDropData } from "@/types/question";
import Input from "@/components/ui/Input";

export default function DragDropEditor({ data, onChange }: { data: DragDropData; onChange: (d: DragDropData) => void }) {
  const addZone = () => onChange({ ...data, zones: [...data.zones, { id: uuid(), label: `Nhóm ${data.zones.length + 1}` }] });
  const removeZone = (id: string) => onChange({ zones: data.zones.filter((z) => z.id !== id), items: data.items.filter((it) => it.zoneId !== id) } as DragDropData);
  const addItem = () => onChange({ ...data, items: [...data.items, { id: uuid(), label: `Mục ${data.items.length + 1}`, zoneId: data.zones[0]?.id ?? "" }] });

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-[var(--muted)]">Vùng đích</label>
          <button type="button" onClick={addZone} className="text-xs text-[var(--color-primary)] font-medium flex items-center gap-1"><Plus size={13} /> Thêm vùng</button>
        </div>
        <div className="space-y-2">
          {data.zones.map((z) => (
            <div key={z.id} className="flex items-center gap-2">
              <Input value={z.label} onChange={(e) => onChange({ ...data, zones: data.zones.map((x) => (x.id === z.id ? { ...x, label: e.target.value } : x)) })} className="flex-1" />
              <button type="button" onClick={() => removeZone(z.id)} disabled={data.zones.length <= 2} className="p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)] disabled:opacity-30"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-[var(--muted)]">Đối tượng kéo</label>
          <button type="button" onClick={addItem} disabled={!data.zones.length} className="text-xs text-[var(--color-primary)] font-medium flex items-center gap-1 disabled:opacity-40"><Plus size={13} /> Thêm mục</button>
        </div>
        <div className="space-y-2">
          {data.items.map((it) => (
            <div key={it.id} className="flex items-center gap-2">
              <Input value={it.label} onChange={(e) => onChange({ ...data, items: data.items.map((x) => (x.id === it.id ? { ...x, label: e.target.value } : x)) })} className="flex-1" />
              <select value={it.zoneId} onChange={(e) => onChange({ ...data, items: data.items.map((x) => (x.id === it.id ? { ...x, zoneId: e.target.value } : x)) })} className="input !w-auto py-1.5">
                {data.zones.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
              <button type="button" onClick={() => onChange({ ...data, items: data.items.filter((x) => x.id !== it.id) })} className="p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
