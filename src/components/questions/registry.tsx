"use client";
import { CheckCircle2, ListChecks, ToggleLeft, TextCursorInput, MessageSquareText, ArrowDownUp, Link2, FolderTree, MoveRight } from "lucide-react";
import type { ComponentType } from "react";
import type { QuestionData, QuestionType } from "@/types/question";
import { MultipleChoiceEditor, MultiSelectEditor } from "./editors/ChoiceEditors";
import { TrueFalseEditor, FillBlankEditor, OpenEndedEditor } from "./editors/SimpleEditors";
import { ReorderEditor, MatchEditor, CategorizeEditor, DragDropEditor } from "./editors/StructuredEditors";

interface Entry {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  // Editors are typed per-type; the registry erases that to a common signature
  // and the builder guarantees data.type always matches the registry key.
  Editor: ComponentType<{ data: QuestionData; onChange: (d: QuestionData) => void }>;
}

function entry<T extends QuestionData>(label: string, icon: Entry["icon"], Editor: ComponentType<{ data: T; onChange: (d: T) => void }>): Entry {
  return { label, icon, Editor: Editor as unknown as Entry["Editor"] };
}

export const QUESTION_REGISTRY: Record<QuestionType, Entry> = {
  multiple_choice: entry("Trắc nghiệm", CheckCircle2, MultipleChoiceEditor),
  multi_select: entry("Chọn nhiều", ListChecks, MultiSelectEditor),
  true_false: entry("Đúng / Sai", ToggleLeft, TrueFalseEditor),
  fill_blank: entry("Điền vào chỗ trống", TextCursorInput, FillBlankEditor),
  open_ended: entry("Câu hỏi mở", MessageSquareText, OpenEndedEditor),
  reorder: entry("Sắp xếp", ArrowDownUp, ReorderEditor),
  match: entry("Ghép đôi", Link2, MatchEditor),
  categorize: entry("Phân loại", FolderTree, CategorizeEditor),
  drag_drop: entry("Kéo thả", MoveRight, DragDropEditor),
};

/** Renders the type-specific editor for whatever `data.type` is. */
export function QuestionEditorFor({ data, onChange }: { data: QuestionData; onChange: (d: QuestionData) => void }) {
  const { Editor } = QUESTION_REGISTRY[data.type];
  return <Editor data={data} onChange={onChange} />;
}
