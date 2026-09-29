"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicQuizQuestion } from "@/types/question";
import QuestionPlayer, { emptyAnswerFor } from "@/components/quiz/QuestionPlayer";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { FileQuestion } from "lucide-react";

export default function PreviewClient({ quizId, title, questions }: { quizId: string; title: string; questions: PublicQuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ReturnType<typeof emptyAnswerFor>>>({});
  const q = questions[index];

  return (
    <div className="h-screen flex flex-col">
      <div className="h-14 shrink-0 border-b border-[var(--border)] flex items-center gap-3 px-4">
        <Link href={`/teacher/quizzes/${quizId}`} className="p-1.5 rounded-lg hover:bg-black/5"><ArrowLeft size={17} /></Link>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-[11px] text-[var(--muted)]">Xem trước — trả lời ở đây không được lưu</p>
        </div>
        {questions.length > 0 && <span className="ml-auto text-xs text-[var(--muted)]">Câu {index + 1}/{questions.length}</span>}
      </div>

      {questions.length === 0 ? (
        <EmptyState icon={<FileQuestion size={28} />} title="Bộ câu hỏi chưa có câu hỏi nào" />
      ) : (
        <div className="flex-1 overflow-auto p-6 max-w-2xl mx-auto w-full">
          <p className="text-lg font-medium mb-4" dangerouslySetInnerHTML={{ __html: q.content || "(chưa có nội dung)" }} />
          <QuestionPlayer
            question={q}
            value={answers[q.id] ?? emptyAnswerFor(q)}
            onChange={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))}
          />
        </div>
      )}

      {questions.length > 0 && (
        <div className="shrink-0 border-t border-[var(--border)] p-3 flex items-center justify-between">
          <Button variant="secondary" icon={<ChevronLeft size={15} />} disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Trước</Button>
          <Button variant="secondary" icon={<ChevronRight size={15} />} disabled={index === questions.length - 1} onClick={() => setIndex((i) => i + 1)}>Sau</Button>
        </div>
      )}
    </div>
  );
}
