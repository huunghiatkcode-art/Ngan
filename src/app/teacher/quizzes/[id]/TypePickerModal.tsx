"use client";
import { QUESTION_REGISTRY } from "@/components/questions/registry";
import type { QuestionType } from "@/types/question";
import { X } from "lucide-react";

export default function TypePickerModal({ onPick, onClose }: { onPick: (t: QuestionType) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Chọn loại câu hỏi</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(QUESTION_REGISTRY) as [QuestionType, typeof QUESTION_REGISTRY[QuestionType]][]).map(([type, meta]) => (
            <button key={type} onClick={() => onPick(type)} className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--color-primary)] text-sm text-left">
              <meta.icon size={16} className="text-[var(--color-primary)] shrink-0" />
              {meta.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
