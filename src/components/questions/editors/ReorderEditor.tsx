"use client";
import { v4 as uuid } from "uuid";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReorderData } from "@/types/question";
import Input from "@/components/ui/Input";

function Row({ id, text, onChange, onRemove, disableRemove }: { id: string; text: string; onChange: (v: string) => void; onRemove: () => void; disableRemove: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-2 bg-[var(--surface)]">
      <button {...attributes} {...listeners} className="cursor-grab text-[var(--muted)] touch-none" type="button"><GripVertical size={15} /></button>
      <Input value={text} onChange={(e) => onChange(e.target.value)} className="flex-1" />
      <button type="button" onClick={onRemove} disabled={disableRemove} className="p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)] disabled:opacity-30"><Trash2 size={14} /></button>
    </div>
  );
}

export default function ReorderEditor({ data, onChange }: { data: ReorderData; onChange: (d: ReorderData) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = data.items.findIndex((i) => i.id === e.active.id);
    const newIndex = data.items.findIndex((i) => i.id === e.over!.id);
    onChange({ ...data, items: arrayMove(data.items, oldIndex, newIndex) });
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted)]">Thứ tự hiện tại là thứ tự đúng. Kéo để sắp xếp lại.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={data.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {data.items.map((it) => (
              <Row key={it.id} id={it.id} text={it.text}
                onChange={(v) => onChange({ ...data, items: data.items.map((x) => (x.id === it.id ? { ...x, text: v } : x)) })}
                onRemove={() => onChange({ ...data, items: data.items.filter((x) => x.id !== it.id) })}
                disableRemove={data.items.length <= 2}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button type="button" onClick={() => onChange({ ...data, items: [...data.items, { id: uuid(), text: `Bước ${data.items.length + 1}` }] })} className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium">
        <Plus size={14} /> Thêm mục
      </button>
    </div>
  );
}
