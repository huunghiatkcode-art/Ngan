"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAssignmentAction } from "../actions";
import type { ActionResult } from "@/app/(auth)/actions";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Card from "@/components/ui/Card";

const initial: ActionResult = { ok: true };

export default function AssignmentForm({
  quizzes,
  classes,
  defaultQuizId,
}: {
  quizzes: { id: string; title: string }[];
  classes: { id: string; name: string }[];
  defaultQuizId?: string;
}) {
  const [state, formAction, pending] = useActionState(createAssignmentAction, initial);
  const [usePassword, setUsePassword] = useState(false);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <Link href="/teacher/assignments" className="text-sm text-[var(--muted)] flex items-center gap-1"><ArrowLeft size={14} /> Quay lại</Link>
      <h1 className="text-xl font-semibold">Giao bài kiểm tra mới</h1>

      <form action={formAction} className="space-y-5">
        <Card className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--muted)]">Tiêu đề bài kiểm tra</label>
            <Input name="title" required className="mt-1" placeholder="Kiểm tra 15 phút - Chương 1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Bộ câu hỏi</label>
              <select name="quizId" required defaultValue={defaultQuizId} className="input mt-1">
                <option value="" disabled>Chọn bộ câu hỏi...</option>
                {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Lớp (tuỳ chọn — tự động thêm cả lớp vào danh sách)</label>
              <select name="classId" defaultValue="" className="input mt-1">
                <option value="">Không gắn với lớp nào</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Thời gian & bảo mật</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Mở lúc (tuỳ chọn)</label>
              <Input type="datetime-local" name="startAt" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Hạn nộp (tuỳ chọn)</label>
              <Input type="datetime-local" name="dueAt" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Giới hạn thời gian làm bài (phút, để trống = không giới hạn)</label>
              <Input type="number" min={1} name="timeLimitMinutes" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Số lần làm tối đa</label>
              <Input type="number" min={1} max={10} defaultValue={1} name="attemptsAllowed" className="mt-1" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} /> Đặt mật khẩu cho bài kiểm tra
          </label>
          {usePassword && (
            <Input name="password" placeholder="Mật khẩu tối thiểu 4 ký tự" minLength={4} required={usePassword} />
          )}
        </Card>

        <Card className="p-4 space-y-2">
          <h2 className="text-sm font-semibold">Tuỳ chọn làm bài</h2>
          {[
            ["randomizeQuestions", "Xáo trộn thứ tự câu hỏi cho mỗi học sinh"],
            ["randomizeAnswers", "Xáo trộn thứ tự đáp án (áp dụng cho từng loại câu hỏi hỗ trợ)"],
            ["allowBackNavigation", "Cho phép quay lại câu trước", true],
            ["showResult", "Hiển thị kết quả cho học sinh sau khi nộp bài", true],
            ["showCorrectAnswer", "Hiển thị đáp án đúng trong kết quả", true],
            ["showLeaderboard", "Hiển thị bảng xếp hạng"],
          ].map(([name, label, def]) => (
            <label key={name as string} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={name as string} defaultChecked={!!def} /> {label}
            </label>
          ))}
        </Card>

        {!state.ok && <FormError message={state.error} />}
        <Button type="submit" variant="primary" disabled={pending} className="w-full">
          {pending ? "Đang tạo..." : "Giao bài kiểm tra"}
        </Button>
      </form>
    </div>
  );
}
