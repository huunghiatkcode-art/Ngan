"use client";
import type { OpenEndedData } from "@/types/question";
import Textarea from "@/components/ui/Textarea";
import Input from "@/components/ui/Input";

export default function OpenEndedEditor({ data, onChange }: { data: OpenEndedData; onChange: (d: OpenEndedData) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-[var(--muted)]">Hướng dẫn trả lời</label>
        <Textarea value={data.instructions ?? ""} onChange={(e) => onChange({ ...data, instructions: e.target.value })} rows={2} className="mt-1" />
      </div>
      <div>
        <label className="text-xs font-medium text-[var(--muted)]">Giới hạn ký tự</label>
        <Input type="number" min={1} value={data.characterLimit ?? 1000} onChange={(e) => onChange({ ...data, characterLimit: Number(e.target.value) })} className="mt-1" />
      </div>
      <div>
        <label className="text-xs font-medium text-[var(--muted)]">Rubric chấm điểm (chỉ giáo viên thấy)</label>
        <Textarea value={data.rubric ?? ""} onChange={(e) => onChange({ ...data, rubric: e.target.value })} rows={2} className="mt-1" />
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Câu hỏi mở luôn cần giáo viên chấm thủ công (Manual Review).</p>
    </div>
  );
}
