"use client";
import type { AnswerPayload, PublicQuestionData } from "@/types/question";
import { MultipleChoiceRenderer, MultiSelectRenderer } from "./ChoiceRenderers";
import { ReorderRenderer, MatchRenderer } from "./StructuredRenderers";
import PlacementBoard from "./PlacementBoard";

interface Props {
  data: PublicQuestionData;
  value: AnswerPayload | undefined;
  onChange: (a: AnswerPayload) => void;
  disabled?: boolean;
}

/** Student-facing renderer. Receives ONLY answer-key-free data. */
export default function QuestionRenderer({ data, value, onChange, disabled }: Props) {
  switch (data.type) {
    case "multiple_choice": {
      const v = value?.type === "multiple_choice" ? value.selectedOptionId : null;
      return <MultipleChoiceRenderer options={data.options} selected={v} disabled={disabled} onSelect={(id) => onChange({ type: "multiple_choice", selectedOptionId: id })} />;
    }
    case "multi_select": {
      const v = value?.type === "multi_select" ? value.selectedOptionIds : [];
      return <MultiSelectRenderer options={data.options} selected={v} disabled={disabled}
        onToggle={(id) => onChange({ type: "multi_select", selectedOptionIds: v.includes(id) ? v.filter((x) => x !== id) : [...v, id] })} />;
    }
    case "true_false": {
      const v = value?.type === "true_false" ? value.value : null;
      return (
        <div className="flex gap-3" role="radiogroup">
          {[true, false].map((b) => (
            <button key={String(b)} type="button" role="radio" aria-checked={v === b} disabled={disabled} onClick={() => onChange({ type: "true_false", value: b })}
              className={`flex-1 py-4 rounded-xl border-2 font-medium ${v === b ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--border)]"}`}>{b ? "Đúng" : "Sai"}</button>
          ))}
        </div>
      );
    }
    case "fill_blank": {
      const v = value?.type === "fill_blank" ? value.value : "";
      return <input className="input !py-3" aria-label="Câu trả lời" disabled={disabled} value={v} placeholder="Nhập câu trả lời..." onChange={(e) => onChange({ type: "fill_blank", value: e.target.value })} />;
    }
    case "open_ended": {
      const v = value?.type === "open_ended" ? value.value : "";
      const limit = data.characterLimit ?? 1000;
      return (
        <div className="space-y-1">
          {data.instructions && <p className="text-xs text-[var(--muted)]">{data.instructions}</p>}
          <textarea className="input" rows={6} aria-label="Câu trả lời" disabled={disabled} maxLength={limit} value={v} onChange={(e) => onChange({ type: "open_ended", value: e.target.value })} />
          <p className="text-xs text-[var(--muted)] text-right">{v.length}/{limit}</p>
        </div>
      );
    }
    case "reorder": {
      const v = value?.type === "reorder" ? value.orderedItemIds : undefined;
      return <ReorderRenderer items={data.items} orderedIds={v} disabled={disabled} onChange={(ids) => onChange({ type: "reorder", orderedItemIds: ids })} />;
    }
    case "match": {
      const v = value?.type === "match" ? value.pairs : {};
      return <MatchRenderer left={data.left} right={data.right} pairs={v} disabled={disabled} onChange={(p) => onChange({ type: "match", pairs: p })} />;
    }
    case "categorize": {
      const v = value?.type === "categorize" ? value.categories : {};
      return <PlacementBoard items={data.items.map((i) => ({ id: i.id, label: i.text }))} targets={data.categories.map((c) => ({ id: c.id, label: c.name }))} value={v} disabled={disabled} onChange={(c) => onChange({ type: "categorize", categories: c })} />;
    }
    case "drag_drop": {
      const v = value?.type === "drag_drop" ? value.placements : {};
      return <PlacementBoard items={data.items} targets={data.zones} value={v} disabled={disabled} onChange={(p) => onChange({ type: "drag_drop", placements: p })} />;
    }
  }
}
