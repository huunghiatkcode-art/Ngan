"use client";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import type { ReorderItem } from "@/types/question";

function Row({ item, index, total, onMove, disabled }: { item: ReorderItem; index: number; total: number; onMove: (d: -1 | 1) => void; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id, disabled });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-white">
      <span className="w-6 h-6 rounded-full bg-black/5 text-xs font-semibold flex items-center justify-center shrink-0">{index + 1}</span>
      <span className="flex-1 text-sm">{item.text}</span>
      <button type="button" disabled={disabled || index === 0} onClick={() => onMove(-1)} aria-label="Lên" className="p-1 disabled:opacity-30"><ArrowUp size={15} /></button>
      <button type="button" disabled={disabled || index === total - 1} onClick={() => onMove(1)} aria-label="Xuống" className="p-1 disabled:opacity-30"><ArrowDown size={15} /></button>
      <button type="button" {...attributes} {...listeners} aria-label="Kéo để sắp xếp" className="cursor-grab touch-none p-1 text-[var(--muted)]"><GripVertical size={16} /></button>
    </div>
  );
}

export function ReorderRenderer({ items, orderedIds, onChange, disabled }: { items: ReorderItem[]; orderedIds: string[] | undefined; onChange: (ids: string[]) => void; disabled?: boolean }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const ids = orderedIds && orderedIds.length === items.length ? orderedIds : items.map((i) => i.id);
  const list = ids.map((id) => byId.get(id)).filter((x): x is ReorderItem => !!x);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onChange(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {list.map((it, i) => (
            <Row key={it.id} item={it} index={i} total={list.length} disabled={disabled}
              onMove={(d) => onChange(arrayMove(ids, i, i + d))} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function MatchRenderer({ left, right, pairs, onChange, disabled }: { left: { id: string; text: string }[]; right: { id: string; text: string }[]; pairs: Record<string, string>; onChange: (p: Record<string, string>) => void; disabled?: boolean }) {
  const used = new Set(Object.values(pairs));
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted)]">Chọn mục ở cột phải tương ứng với mỗi mục ở cột trái.</p>
      {left.map((l) => (
        <div key={l.id} className="flex items-center gap-3">
          <span className="flex-1 px-3 py-2.5 rounded-lg border-2 border-[var(--border)] text-sm bg-white">{l.text}</span>
          <span aria-hidden>→</span>
          <select aria-label={`Ghép với ${l.text}`} disabled={disabled} className="input flex-1" value={pairs[l.id] ?? ""}
            onChange={(e) => { const next = { ...pairs }; if (e.target.value) next[l.id] = e.target.value; else delete next[l.id]; onChange(next); }}>
            <option value="">— chọn —</option>
            {right.map((r) => <option key={r.id} value={r.id} disabled={used.has(r.id) && pairs[l.id] !== r.id}>{r.text}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
