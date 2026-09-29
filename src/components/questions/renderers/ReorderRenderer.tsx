"use client";
import { useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReorderItem } from "@/types/question";

function Row({ item, index }: { item: ReorderItem; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)]">
      <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-xs font-semibold shrink-0">{index + 1}</span>
      <span className="flex-1 text-sm">{item.text}</span>
      <button {...attributes} {...listeners} type="button" className="cursor-grab text-[var(--muted)] touch-none"><GripVertical size={16} /></button>
    </div>
  );
}

export default function ReorderRenderer({ items, onChange, disabled }: { items: ReorderItem[]; onChange: (orderedIds: string[]) => void; disabled?: boolean }) {
  const [order, setOrder] = useState(items);
  useEffect(() => onChange(order.map((i) => i.id)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragEnd = (e: DragEndEvent) => {
    if (disabled || !e.over || e.active.id === e.over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === e.active.id);
      const newIndex = prev.findIndex((i) => i.id === e.over!.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      onChange(next.map((i) => i.id));
      return next;
    });
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">{order.map((it, i) => <Row key={it.id} item={it} index={i} />)}</div>
      </SortableContext>
    </DndContext>
  );
}
