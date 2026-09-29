"use client";
import { v4 as uuid } from "uuid";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { ReorderData, MatchData, CategorizeData, DragDropData } from "@/types/question";

const iconBtn = "p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)] disabled:opacity-30";
const addBtn = "text-sm text-[var(--color-primary)] font-medium flex items-center gap-1";

export function ReorderEditor({ data, onChange }: { data: ReorderData; onChange: (d: ReorderData) => void }) {
  const move = (i: number, d: -1 | 1) => {
    const items = [...data.items];
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    onChange({ ...data, items });
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted)]">Thứ tự hiện tại là thứ tự ĐÚNG. Học sinh sẽ thấy các mục đã bị xáo trộn.</p>
      {data.items.map((it, i) => (
        <div key={it.id} className="flex items-center gap-2">
          <span className="w-6 text-xs text-[var(--muted)]">{i + 1}.</span>
          <input className="input" value={it.text} aria-label={`Mục ${i + 1}`} onChange={(e) => onChange({ ...data, items: data.items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)) })} />
          <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Lên"><ArrowUp size={14} /></button>
          <button type="button" className={iconBtn} disabled={i === data.items.length - 1} onClick={() => move(i, 1)} aria-label="Xuống"><ArrowDown size={14} /></button>
          <button type="button" className={iconBtn} disabled={data.items.length <= 2} onClick={() => onChange({ ...data, items: data.items.filter((x) => x.id !== it.id) })} aria-label="Xóa"><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" className={addBtn} onClick={() => onChange({ ...data, items: [...data.items, { id: uuid(), text: "" }] })}><Plus size={14} /> Thêm mục</button>
    </div>
  );
}

export function MatchEditor({ data, onChange }: { data: MatchData; onChange: (d: MatchData) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs font-medium text-[var(--muted)]"><span className="flex-1">Cột trái</span><span className="flex-1">Cột phải (đáp án ghép)</span><span className="w-8" /></div>
      {data.pairs.map((p) => (
        <div key={p.id} className="flex gap-2">
          <input className="input" value={p.left} aria-label="Cột trái" onChange={(e) => onChange({ ...data, pairs: data.pairs.map((x) => (x.id === p.id ? { ...x, left: e.target.value } : x)) })} />
          <input className="input" value={p.right} aria-label="Cột phải" onChange={(e) => onChange({ ...data, pairs: data.pairs.map((x) => (x.id === p.id ? { ...x, right: e.target.value } : x)) })} />
          <button type="button" className={iconBtn} disabled={data.pairs.length <= 1} onClick={() => onChange({ ...data, pairs: data.pairs.filter((x) => x.id !== p.id) })} aria-label="Xóa cặp"><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" className={addBtn} onClick={() => onChange({ ...data, pairs: [...data.pairs, { id: uuid(), left: "", right: "" }] })}><Plus size={14} /> Thêm cặp</button>
    </div>
  );
}

export function CategorizeEditor({ data, onChange }: { data: CategorizeData; onChange: (d: CategorizeData) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">Nhóm phân loại</p>
        {data.categories.map((c) => (
          <div key={c.id} className="flex gap-2">
            <input className="input" value={c.name} aria-label="Tên nhóm" onChange={(e) => onChange({ ...data, categories: data.categories.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })} />
            <button type="button" className={iconBtn} disabled={data.categories.length <= 2}
              onClick={() => onChange({ categories: data.categories.filter((x) => x.id !== c.id), items: data.items.filter((it) => it.categoryId !== c.id), type: "categorize" })} aria-label="Xóa nhóm"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className={addBtn} disabled={data.categories.length >= 6} onClick={() => onChange({ ...data, categories: [...data.categories, { id: uuid(), name: "" }] })}><Plus size={14} /> Thêm nhóm</button>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">Mục cần phân loại</p>
        {data.items.map((it) => (
          <div key={it.id} className="flex gap-2">
            <input className="input" value={it.text} aria-label="Nội dung mục" onChange={(e) => onChange({ ...data, items: data.items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)) })} />
            <select className="input !w-auto" value={it.categoryId} aria-label="Nhóm đúng" onChange={(e) => onChange({ ...data, items: data.items.map((x) => (x.id === it.id ? { ...x, categoryId: e.target.value } : x)) })}>
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name || "(chưa đặt tên)"}</option>)}
            </select>
            <button type="button" className={iconBtn} onClick={() => onChange({ ...data, items: data.items.filter((x) => x.id !== it.id) })} aria-label="Xóa mục"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className={addBtn} onClick={() => onChange({ ...data, items: [...data.items, { id: uuid(), text: "", categoryId: data.categories[0]?.id ?? "" }] })}><Plus size={14} /> Thêm mục</button>
      </div>
    </div>
  );
}

export function DragDropEditor({ data, onChange }: { data: DragDropData; onChange: (d: DragDropData) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">Vùng đích</p>
        {data.zones.map((z) => (
          <div key={z.id} className="flex gap-2">
            <input className="input" value={z.label} aria-label="Tên vùng" onChange={(e) => onChange({ ...data, zones: data.zones.map((x) => (x.id === z.id ? { ...x, label: e.target.value } : x)) })} />
            <button type="button" className={iconBtn} disabled={data.zones.length <= 2}
              onClick={() => onChange({ type: "drag_drop", zones: data.zones.filter((x) => x.id !== z.id), items: data.items.filter((it) => it.zoneId !== z.id) })} aria-label="Xóa vùng"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className={addBtn} onClick={() => onChange({ ...data, zones: [...data.zones, { id: uuid(), label: "" }] })}><Plus size={14} /> Thêm vùng</button>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]">Đối tượng kéo</p>
        {data.items.map((it) => (
          <div key={it.id} className="flex gap-2">
            <input className="input" value={it.label} aria-label="Nội dung đối tượng" onChange={(e) => onChange({ ...data, items: data.items.map((x) => (x.id === it.id ? { ...x, label: e.target.value } : x)) })} />
            <select className="input !w-auto" value={it.zoneId} aria-label="Vùng đúng" onChange={(e) => onChange({ ...data, items: data.items.map((x) => (x.id === it.id ? { ...x, zoneId: e.target.value } : x)) })}>
              {data.zones.map((z) => <option key={z.id} value={z.id}>{z.label || "(chưa đặt tên)"}</option>)}
            </select>
            <button type="button" className={iconBtn} onClick={() => onChange({ ...data, items: data.items.filter((x) => x.id !== it.id) })} aria-label="Xóa đối tượng"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className={addBtn} onClick={() => onChange({ ...data, items: [...data.items, { id: uuid(), label: "", zoneId: data.zones[0]?.id ?? "" }] })}><Plus size={14} /> Thêm đối tượng</button>
      </div>
    </div>
  );
}
