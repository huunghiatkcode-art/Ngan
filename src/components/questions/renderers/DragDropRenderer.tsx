"use client";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { DragDropZone } from "@/types/question";

function DraggableItem({ id, label, placed }: { id: string; label: string; placed: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  if (placed) return null;
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes} type="button" className="px-3 py-2 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-sm font-medium cursor-grab touch-none">
      {label}
    </button>
  );
}
function DropZone({ id, label, items }: { id: string; label: string; items: { id: string; label: string }[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`min-h-[90px] rounded-xl border-2 border-dashed p-3 ${isOver ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--border)]"}`}>
      <p className="text-xs font-semibold text-[var(--muted)] mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">{items.map((it) => <span key={it.id} className="px-2.5 py-1 rounded-lg bg-black/5 text-sm">{it.label}</span>)}</div>
    </div>
  );
}

export default function DragDropRenderer({
  zones, items, value, onChange, disabled,
}: {
  zones: DragDropZone[];
  items: { id: string; label: string }[];
  value: Record<string, string>;
  onChange: (placements: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragEnd = (e: DragEndEvent) => {
    if (disabled || !e.over) return;
    onChange({ ...value, [e.active.id as string]: e.over.id as string });
  };
  const unplaced = items.filter((it) => !value[it.id]);
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 min-h-[44px] p-2 rounded-xl bg-black/[0.03]">
          {unplaced.length === 0 && <span className="text-xs text-[var(--muted)] py-2">Đã kéo hết các mục</span>}
          {items.map((it) => <DraggableItem key={it.id} id={it.id} label={it.label} placed={!!value[it.id]} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {zones.map((z) => <DropZone key={z.id} id={z.id} label={z.label} items={items.filter((it) => value[it.id] === z.id)} />)}
        </div>
      </div>
    </DndContext>
  );
}
