"use client";
import type { AnswerPayload, PublicQuizQuestion } from "@/types/question";
import MultipleChoiceRenderer from "@/components/questions/renderers/MultipleChoiceRenderer";
import MultiSelectRenderer from "@/components/questions/renderers/MultiSelectRenderer";
import TrueFalseRenderer from "@/components/questions/renderers/TrueFalseRenderer";
import FillBlankRenderer from "@/components/questions/renderers/FillBlankRenderer";
import OpenEndedRenderer from "@/components/questions/renderers/OpenEndedRenderer";
import ReorderRenderer from "@/components/questions/renderers/ReorderRenderer";
import MatchRenderer from "@/components/questions/renderers/MatchRenderer";
import CategorizeRenderer from "@/components/questions/renderers/CategorizeRenderer";
import DragDropRenderer from "@/components/questions/renderers/DragDropRenderer";

/** Builds a blank AnswerPayload matching the question's type. */
export function emptyAnswerFor(q: PublicQuizQuestion): AnswerPayload {
  switch (q.data.type) {
    case "multiple_choice": return { type: "multiple_choice", selectedOptionId: null };
    case "multi_select": return { type: "multi_select", selectedOptionIds: [] };
    case "true_false": return { type: "true_false", value: null };
    case "fill_blank": return { type: "fill_blank", value: "" };
    case "open_ended": return { type: "open_ended", value: "" };
    case "reorder": return { type: "reorder", orderedItemIds: q.data.items.map((i) => i.id) };
    case "match": return { type: "match", pairs: {} };
    case "categorize": return { type: "categorize", categories: {} };
    case "drag_drop": return { type: "drag_drop", placements: {} };
  }
}

export default function QuestionPlayer({
  question, value, onChange, disabled,
}: { question: PublicQuizQuestion; value: AnswerPayload; onChange: (a: AnswerPayload) => void; disabled?: boolean }) {
  const d = question.data;
  switch (d.type) {
    case "multiple_choice":
      return <MultipleChoiceRenderer options={d.options} value={value.type === "multiple_choice" ? value.selectedOptionId : null} onChange={(v) => onChange({ type: "multiple_choice", selectedOptionId: v })} disabled={disabled} />;
    case "multi_select":
      return <MultiSelectRenderer options={d.options} value={value.type === "multi_select" ? value.selectedOptionIds : []} onChange={(v) => onChange({ type: "multi_select", selectedOptionIds: v })} disabled={disabled} />;
    case "true_false":
      return <TrueFalseRenderer value={value.type === "true_false" ? value.value : null} onChange={(v) => onChange({ type: "true_false", value: v })} disabled={disabled} />;
    case "fill_blank":
      return <FillBlankRenderer value={value.type === "fill_blank" ? value.value : ""} onChange={(v) => onChange({ type: "fill_blank", value: v })} disabled={disabled} />;
    case "open_ended":
      return <OpenEndedRenderer value={value.type === "open_ended" ? value.value : ""} onChange={(v) => onChange({ type: "open_ended", value: v })} disabled={disabled} instructions={d.instructions} characterLimit={d.characterLimit} />;
    case "reorder":
      return <ReorderRenderer items={d.items} onChange={(ids) => onChange({ type: "reorder", orderedItemIds: ids })} disabled={disabled} />;
    case "match":
      return <MatchRenderer left={d.left} right={d.right} value={value.type === "match" ? value.pairs : {}} onChange={(p) => onChange({ type: "match", pairs: p })} disabled={disabled} />;
    case "categorize":
      return <CategorizeRenderer categories={d.categories} items={d.items} value={value.type === "categorize" ? value.categories : {}} onChange={(c) => onChange({ type: "categorize", categories: c })} disabled={disabled} />;
    case "drag_drop":
      return <DragDropRenderer zones={d.zones} items={d.items} value={value.type === "drag_drop" ? value.placements : {}} onChange={(p) => onChange({ type: "drag_drop", placements: p })} disabled={disabled} />;
  }
}
