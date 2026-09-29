"use client";
import type { MultiSelectData } from "@/types/question";
import OptionListEditor from "../OptionListEditor";

export default function MultiSelectEditor({ data, onChange }: { data: MultiSelectData; onChange: (d: MultiSelectData) => void }) {
  return (
    <div className="space-y-3">
      <OptionListEditor
        options={data.options}
        correctIds={data.correctOptionIds}
        mode="multi"
        onChangeOptions={(options) => onChange({ ...data, options })}
        onChangeCorrect={(ids) => onChange({ ...data, correctOptionIds: ids })}
      />
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={data.shuffleOptions} onChange={(e) => onChange({ ...data, shuffleOptions: e.target.checked })} />
          Xáo trộn đáp án
        </label>
        <label className="flex items-center gap-2">
          Chấm điểm:
          <select
            value={data.scoringMode}
            onChange={(e) => onChange({ ...data, scoringMode: e.target.value as MultiSelectData["scoringMode"] })}
            className="input !w-auto py-1"
          >
            <option value="all_or_nothing">Đúng toàn bộ mới có điểm</option>
            <option value="partial">Điểm từng phần</option>
          </select>
        </label>
      </div>
    </div>
  );
}
