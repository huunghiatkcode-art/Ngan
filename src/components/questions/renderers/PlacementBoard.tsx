"use client";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";

interface Item { id: string; label: string }
interface Target { id: string; label: string }

function Chip({ item, targets, current, onSelect, disabled }: { item: Item; targets: Target[]; current?: string; onSelect: (t: string | null) => void; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id, disabled });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-1 rounded-lg border-2 border-[var(--color-primary)] bg-white pl-2 ${isDragging ? "opacity-80 shadow-lg" : ""}`}>
      <span {...listeners} {...attributes} className="cursor-grab touch-none py-1.5 text-sm font-medium select-none" aria-label={`Kéo ${item.label}`}>{item.label}</span>
      {/* Touch / keyboard alternative to dragging */}
      <select aria-label={`Chọn nhóm cho ${item.label}`} disabled={disabled} className="text-xs bg-transparent border-l border-[var(--border)] py-1.5 pr-1 outline-none max-w-[7rem]"
        value={current ?? ""} onChange={(e) => onSelect(e.target.value || null)}>
        <option value="">— chọn —</option>
        {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
    </div>
  );
}

function Zone({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`min-h-[84px] rounded-xl border-2 border-dashed p-3 transition-colors ${isOver ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--border)]"}`}>
      <p className="text-xs font-semibold text-[var(--muted)] mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function PlacementBoard({ items, targets, value, onChange, disabled }: { items: Item[]; targets: Target[]; value: Record<string, string>; onChange: (v: Record<string, string>) => void; disabled?: boolean }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));
  const place = (itemId: string, targetId: string | null) => {
    const next = { ...value };
    if (targetId) next[itemId] = targetId; else delete next[itemId];
    onChange(next);
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    place(String(e.active.id), e.over.id === "__pool__" ? null : String(e.over.id));
  };
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <Zone id="__pool__" label="Chưa phân loại">
          {items.filter((i) => !value[i.id]).map((i) => <Chip key={i.id} item={i} targets={targets} onSelect={(t) => place(i.id, t)} disabled={disabled} />)}
        </Zone>
        <div className="grid gap-3 sm:grid-cols-2">
          {targets.map((t) => (
            <Zone key={t.id} id={t.id} label={t.label}>
              {items.filter((i) => value[i.id] === t.id).map((i) => <Chip key={i.id} item={i} targets={targets} current={t.id} onSelect={(x) => place(i.id, x)} disabled={disabled} />)}
            </Zone>
          ))}
        </div>
      </div>
    </DndContext>
  );
}
