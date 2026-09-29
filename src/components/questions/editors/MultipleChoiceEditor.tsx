"use client";
import type { MultipleChoiceData } from "@/types/question";
import OptionListEditor from "../OptionListEditor";

export default function MultipleChoiceEditor({ data, onChange }: { data: MultipleChoiceData; onChange: (d: MultipleChoiceData) => void }) {
  return (
    <div className="space-y-3">
      <OptionListEditor
        options={data.options}
        correctIds={[data.correctOptionId]}
        mode="single"
        onChangeOptions={(options) => onChange({ ...data, options })}
        onChangeCorrect={(ids) => onChange({ ...data, correctOptionId: ids[0] ?? data.correctOptionId })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={data.shuffleOptions} onChange={(e) => onChange({ ...data, shuffleOptions: e.target.checked })} />
        Xáo trộn thứ tự đáp án cho mỗi học sinh
      </label>
    </div>
  );
}
