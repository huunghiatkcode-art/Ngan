"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Send } from "lucide-react";
import type { Quiz } from "@/types/database";
import type { QuestionData, QuestionType } from "@/types/question";
import { QUESTION_REGISTRY, QuestionEditorFor } from "@/components/questions/registry";
import { defaultQuestionData } from "@/lib/question-engine/factory";
import { debounce } from "@/lib/utils/debounce";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toaster";
import QuestionListPanel, { type EditorQuestion } from "./QuestionListPanel";
import TypePickerModal from "./TypePickerModal";
import {
  addQuestionAction, deleteQuestionAction, duplicateQuestionAction,
  publishQuizAction, reorderQuestionsAction, updateQuestionAction, updateQuizMetaAction,
} from "../actions";

export interface FullQuestion {
  id: string; type: QuestionType; title: string | null; content: string;
  data: QuestionData; points: number; timeLimit: number | null; explanation: string | null;
}

export default function QuizEditorClient({ quiz, questions: initialQuestions }: { quiz: Quiz; questions: FullQuestion[] }) {
  const [title, setTitle] = useState(quiz.title);
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedId, setSelectedId] = useState<string | null>(initialQuestions[0]?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const toast = useToast();

  const selected = questions.find((q) => q.id === selectedId) ?? null;

  const persistQuestion = useRef(
    debounce((q: FullQuestion) => {
      setSaveStatus("saving");
      updateQuestionAction(quiz.id, q.id, {
        title: q.title, content: q.content, data: q.data, points: q.points, timeLimit: q.timeLimit, explanation: q.explanation,
      }).then(() => setSaveStatus("saved")).catch(() => toast.show("Lưu thất bại", "error"));
    }, 600)
  ).current;

  const updateSelected = (patch: Partial<FullQuestion>) => {
    if (!selected) return;
    const updated = { ...selected, ...patch };
    setQuestions((qs) => qs.map((q) => (q.id === selected.id ? updated : q)));
    persistQuestion(updated);
  };

  const handleAddType = async (type: QuestionType) => {
    setPickerOpen(false);
    const row = await addQuestionAction(quiz.id, type);
    const newQ: FullQuestion = {
      id: row.id, type, title: row.title, content: row.content,
      data: row.data as unknown as QuestionData, points: row.points, timeLimit: row.time_limit, explanation: row.explanation,
    };
    setQuestions((qs) => [...qs, newQ]);
    setSelectedId(newQ.id);
  };

  const handleReorder = (ids: string[]) => {
    setQuestions((qs) => ids.map((id) => qs.find((q) => q.id === id)!));
    reorderQuestionsAction(quiz.id, ids);
  };

  const handleDuplicate = async (id: string) => {
    await duplicateQuestionAction(quiz.id, id);
    window.location.reload(); // simplest correct way to pick up the server-generated copy
  };

  const handleDelete = (id: string) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    if (selectedId === id) setSelectedId(null);
    deleteQuestionAction(quiz.id, id);
  };

  const listItems: EditorQuestion[] = useMemo(() => questions.map((q) => ({ id: q.id, type: q.type, title: q.title, content: q.content })), [questions]);

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 shrink-0 border-b border-[var(--border)] flex items-center gap-3 px-4">
        <Link href="/teacher/quizzes" className="p-1.5 rounded-lg hover:bg-black/5"><ArrowLeft size={17} /></Link>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            debounceTitleSave(quiz.id, e.target.value);
          }}
          className="!w-64 font-semibold"
        />
        <span className="text-xs text-[var(--muted)] w-16">{saveStatus === "saving" ? "Đang lưu..." : saveStatus === "saved" ? "Đã lưu" : ""}</span>
        <div className="ml-auto flex gap-2">
          <Link href={`/teacher/quizzes/${quiz.id}/preview`} className="btn btn-secondary"><Eye size={14} /> Xem trước</Link>
          <Button variant="primary" onClick={async () => { await publishQuizAction(quiz.id); toast.show("Đã publish bộ câu hỏi", "success"); }}>
            <Send size={14} /> Publish
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <div className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--border)] max-h-56 lg:max-h-none">
          <QuestionListPanel
            questions={listItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={handleReorder}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onAddClick={() => setPickerOpen(true)}
          />
        </div>

        <div className="flex-1 overflow-auto p-5 min-w-0">
          {!selected ? (
            <p className="text-sm text-[var(--muted)]">Chọn hoặc thêm một câu hỏi để bắt đầu chỉnh sửa.</p>
          ) : (
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs text-[var(--color-primary)] font-medium">
                {(() => { const Icon = QUESTION_REGISTRY[selected.type].icon; return <Icon size={14} />; })()}
                {QUESTION_REGISTRY[selected.type].label}
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted)]">Nội dung câu hỏi</label>
                <Textarea value={selected.content} onChange={(e) => updateSelected({ content: e.target.value })} rows={2} className="mt-1" placeholder="Nhập nội dung câu hỏi..." />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted)] mb-1.5 block">Cấu hình câu trả lời</label>
                <QuestionEditorFor data={selected.data} onChange={(d) => updateSelected({ data: d })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted)]">Giải thích (hiện sau khi nộp bài, nếu bật)</label>
                <Textarea value={selected.explanation ?? ""} onChange={(e) => updateSelected({ explanation: e.target.value })} rows={2} className="mt-1" />
              </div>
            </div>
          )}
        </div>

        {selected && (
          <div className="lg:w-64 shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Điểm</label>
              <Input type="number" min={0} value={selected.points} onChange={(e) => updateSelected({ points: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Thời gian (giây, để trống = không giới hạn)</label>
              <Input type="number" min={0} value={selected.timeLimit ?? ""} onChange={(e) => updateSelected({ timeLimit: e.target.value ? Number(e.target.value) : null })} className="mt-1" />
            </div>
          </div>
        )}
      </div>

      {pickerOpen && <TypePickerModal onPick={handleAddType} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

const debounceTitleSave = debounce((quizId: string, value: string) => {
  updateQuizMetaAction(quizId, { title: value });
}, 600);
