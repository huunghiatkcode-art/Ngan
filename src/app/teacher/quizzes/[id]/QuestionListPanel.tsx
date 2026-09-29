"use client";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Copy, Trash2, Plus } from "lucide-react";
import { QUESTION_REGISTRY } from "@/components/questions/registry";
import type { QuestionType } from "@/types/question";
import ConfirmButton from "@/components/ui/ConfirmButton";

export interface EditorQuestion {
  id: string; type: QuestionType; title: string | null; content: string;
}

function Row({ q, index, selected, onSelect, onDuplicate, onDelete }: {
  q: EditorQuestion; index: number; selected: boolean;
  onSelect: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: q.id });
  const meta = QUESTION_REGISTRY[q.type];
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-sm ${selected ? "bg-[var(--color-primary)]/10" : "hover:bg-black/[0.03]"}`}
    >
      <button {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} className="cursor-grab text-[var(--muted)] touch-none shrink-0"><GripVertical size={14} /></button>
      <span className="w-5 text-xs text-[var(--muted)] shrink-0">{index + 1}</span>
      <meta.icon size={14} className="text-[var(--color-primary)] shrink-0" />
      <span className="flex-1 truncate">{q.title?.trim() || q.content.replace(/<[^>]*>/g, "").trim() || meta.label}</span>
      <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted)] hover:text-[var(--color-primary)]"><Copy size={13} /></button>
      <span onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100">
        <ConfirmButton size="sm" onConfirm={onDelete}><Trash2 size={13} /></ConfirmButton>
      </span>
    </div>
  );
}

export default function QuestionListPanel({
  questions, selectedId, onSelect, onReorder, onDuplicate, onDelete, onAddClick,
}: {
  questions: EditorQuestion[]; selectedId: string | null;
  onSelect: (id: string) => void; onReorder: (ids: string[]) => void;
  onDuplicate: (id: string) => void; onDelete: (id: string) => void; onAddClick: () => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = questions.findIndex((q) => q.id === e.active.id);
    const newIndex = questions.findIndex((q) => q.id === e.over!.id);
    onReorder(arrayMove(questions, oldIndex, newIndex).map((q) => q.id));
  };
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            {questions.map((q, i) => (
              <Row key={q.id} q={q} index={i} selected={q.id === selectedId} onSelect={() => onSelect(q.id)} onDuplicate={() => onDuplicate(q.id)} onDelete={() => onDelete(q.id)} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <div className="p-2 border-t border-[var(--border)]">
        <button onClick={onAddClick} className="w-full btn btn-secondary justify-center"><Plus size={14} /> Thêm câu hỏi</button>
      </div>
    </div>
  );
}
