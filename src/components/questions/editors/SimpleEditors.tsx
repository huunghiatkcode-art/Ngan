"use client";
import { Plus, Trash2 } from "lucide-react";
import type { TrueFalseData, FillBlankData, OpenEndedData } from "@/types/question";

export function TrueFalseEditor({ data, onChange }: { data: TrueFalseData; onChange: (d: TrueFalseData) => void }) {
  return (
    <div className="flex gap-3">
      {[true, false].map((v) => (
        <button key={String(v)} type="button" onClick={() => onChange({ ...data, correctValue: v })}
          className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium ${data.correctValue === v ? "border-green-600 bg-green-50 text-green-700" : "border-[var(--border)]"}`}>
          {v ? "Đúng" : "Sai"}
        </button>
      ))}
    </div>
  );
}

export function FillBlankEditor({ data, onChange }: { data: FillBlankData; onChange: (d: FillBlankData) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted)]">Liệt kê tất cả đáp án được chấp nhận. Hệ thống tự bỏ khoảng trắng thừa.</p>
      {data.acceptedAnswers.map((a, i) => (
        <div key={i} className="flex gap-2">
          <input className="input" value={a} placeholder="Đáp án chấp nhận" aria-label={`Đáp án chấp nhận ${i + 1}`}
            onChange={(e) => onChange({ ...data, acceptedAnswers: data.acceptedAnswers.map((x, j) => (j === i ? e.target.value : x)) })} />
          <button type="button" disabled={data.acceptedAnswers.length <= 1} aria-label="Xóa đáp án"
            onClick={() => onChange({ ...data, acceptedAnswers: data.acceptedAnswers.filter((_, j) => j !== i) })}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--color-danger)] disabled:opacity-30"><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ ...data, acceptedAnswers: [...data.acceptedAnswers, ""] })} className="text-sm text-[var(--color-primary)] font-medium flex items-center gap-1"><Plus size={14} /> Thêm đáp án</button>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.caseSensitive} onChange={(e) => onChange({ ...data, caseSensitive: e.target.checked })} /> Phân biệt hoa/thường</label>
    </div>
  );
}

export function OpenEndedEditor({ data, onChange }: { data: OpenEndedData; onChange: (d: OpenEndedData) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--muted)]">Câu hỏi mở luôn được giáo viên chấm thủ công.</p>
      <div><label className="text-xs font-medium">Hướng dẫn trả lời</label>
        <textarea className="input mt-1" rows={2} value={data.instructions ?? ""} onChange={(e) => onChange({ ...data, instructions: e.target.value })} /></div>
      <div><label className="text-xs font-medium">Giới hạn ký tự</label>
        <input type="number" min={1} max={5000} className="input mt-1" value={data.characterLimit ?? 1000} onChange={(e) => onChange({ ...data, characterLimit: Number(e.target.value) || 1000 })} /></div>
      <div><label className="text-xs font-medium">Rubric chấm điểm (chỉ giáo viên thấy)</label>
        <textarea className="input mt-1" rows={2} value={data.rubric ?? ""} onChange={(e) => onChange({ ...data, rubric: e.target.value })} /></div>
    </div>
  );
}
