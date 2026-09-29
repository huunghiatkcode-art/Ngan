import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStudent } from "@/lib/auth/student";
import { getResultForStudent, ServiceException } from "@/services/attempt.service";
import { QUESTION_TYPE_LABELS, type QuestionType, type AnswerPayload } from "@/types/question";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { CheckCircle2, XCircle, HelpCircle, ArrowLeft } from "lucide-react";

function summarize(type: QuestionType, answer: Record<string, unknown>): string {
  const a = answer as AnswerPayload;
  if (!a || !a.type) return "(chưa trả lời)";
  switch (a.type) {
    case "multiple_choice": return a.selectedOptionId ?? "(chưa chọn)";
    case "multi_select": return a.selectedOptionIds.length ? a.selectedOptionIds.join(", ") : "(chưa chọn)";
    case "true_false": return a.value === null ? "(chưa chọn)" : a.value ? "Đúng" : "Sai";
    case "fill_blank": return a.value || "(để trống)";
    case "open_ended": return a.value || "(để trống)";
    case "reorder": return "Đã sắp xếp";
    case "match": return `${Object.keys(a.pairs).length} cặp đã ghép`;
    case "categorize": return `${Object.keys(a.categories).length} mục đã phân loại`;
    case "drag_drop": return `${Object.keys(a.placements).length} mục đã kéo`;
  }
}

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const student = await requireStudent();

  let result;
  try {
    result = await getResultForStudent(student.studentId, attemptId);
  } catch (e) {
    if (e instanceof ServiceException) notFound();
    throw e;
  }

  const { attempt, quizTitle, showResult, showCorrectAnswer, breakdown } = result;

  if (attempt.status === "in_progress") {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <p className="text-sm text-[var(--muted)]">Bạn chưa nộp bài này.</p>
        <Link href={`/student/quiz/${attemptId}`} className="btn btn-primary mt-3 inline-flex">Tiếp tục làm bài</Link>
      </div>
    );
  }

  const percent = attempt.max_score > 0 ? Math.round((Number(attempt.score) / Number(attempt.max_score)) * 100) : 0;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <Link href="/student/dashboard" className="text-sm text-[var(--muted)] flex items-center gap-1"><ArrowLeft size={14} /> Về trang chủ</Link>
      <div>
        <h1 className="text-xl font-semibold">{quizTitle}</h1>
        {attempt.status === "grading" && <Badge tone="warning">Có câu hỏi mở đang chờ giáo viên chấm</Badge>}
      </div>

      {!showResult ? (
        <Card className="p-6 text-center text-sm text-[var(--muted)]">
          Bạn đã nộp bài thành công. Giáo viên chưa cho phép xem kết quả ngay.
        </Card>
      ) : (
        <>
          <Card className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-[var(--color-primary)]">{Number(attempt.score)}/{Number(attempt.max_score)}</p>
              <p className="text-xs text-[var(--muted)]">Điểm ({percent}%)</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--color-success)]">{attempt.correct_count}</p>
              <p className="text-xs text-[var(--muted)]">Câu đúng</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--color-danger)]">{attempt.wrong_count}</p>
              <p className="text-xs text-[var(--muted)]">Câu sai</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--muted)]">{attempt.unanswered_count}</p>
              <p className="text-xs text-[var(--muted)]">Bỏ qua</p>
            </div>
          </Card>

          <div className="space-y-2">
            {breakdown.map((b, i) => (
              <Card key={b.questionId} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {b.isCorrect === true && <CheckCircle2 size={18} className="text-[var(--color-success)]" />}
                    {b.isCorrect === false && <XCircle size={18} className="text-[var(--color-danger)]" />}
                    {b.isCorrect === null && <HelpCircle size={18} className="text-[var(--muted)]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--muted)]">Câu {i + 1} · {QUESTION_TYPE_LABELS[b.type as QuestionType]} · {b.pointsEarned}/{b.points} điểm</p>
                    <p className="text-sm font-medium mt-0.5">{b.content}</p>
                    <p className="text-sm text-[var(--muted)] mt-1">Trả lời của bạn: {summarize(b.type as QuestionType, b.yourAnswer)}</p>
                    {b.gradingStatus === "manual_review" && <p className="text-xs text-amber-600 mt-1">Đang chờ giáo viên chấm tay</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {!showCorrectAnswer && (
            <p className="text-xs text-[var(--muted)] text-center">Giáo viên đã tắt hiển thị đáp án đúng cho bài này.</p>
          )}
        </>
      )}
    </div>
  );
}
