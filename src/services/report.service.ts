import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attempt, Student, QuizQuestionRow, AnswerRow } from "@/types/database";

export interface AssignmentReport {
  attemptsCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  completionRate: number;
  questionStats: {
    questionId: string;
    title: string | null;
    content: string;
    correct: number;
    wrong: number;
    total: number;
    accuracy: number;
  }[];
  studentRows: {
    studentId: string;
    fullName: string;
    studentCode: string;
    status: Attempt["status"];
    score: number;
    maxScore: number;
    percent: number;
    correct: number;
    wrong: number;
    unanswered: number;
    timeSpent: number;
    submittedAt: string | null;
  }[];
}

export async function getAssignmentReport(
  supabase: SupabaseClient,
  assignmentId: string
): Promise<AssignmentReport> {
  const { data: attempts } = await supabase.from("attempts").select("*").eq("assignment_id", assignmentId);
  const rows = (attempts as Attempt[]) ?? [];

  const { data: assignment } = await supabase.from("assignments").select("quiz_id").eq("id", assignmentId).single();
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, title, content")
    .eq("quiz_id", assignment!.quiz_id)
    .order("order_index");

  const studentIds = rows.map((r) => r.student_id);
  const { data: students } = studentIds.length
    ? await supabase.from("students").select("*").in("id", studentIds)
    : { data: [] as Student[] };
  const studentById = new Map(((students as Student[]) ?? []).map((s) => [s.id, s]));

  const graded = rows.filter((r) => r.status === "graded" || r.status === "grading");
  const scores = graded.map((r) => Number(r.score));
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length
    ? sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[(sorted.length - 1) / 2]
    : 0;

  // Per-question accuracy across all submitted attempts.
  const attemptIds = rows.map((r) => r.id);
  const { data: answers } = attemptIds.length
    ? await supabase.from("answers").select("*").in("attempt_id", attemptIds)
    : { data: [] as AnswerRow[] };
  const answerRows = (answers as AnswerRow[]) ?? [];

  const questionStats = ((questions as Pick<QuizQuestionRow, "id" | "title" | "content">[]) ?? []).map((q) => {
    const relevant = answerRows.filter((a) => a.question_id === q.id && a.is_answered);
    const correct = relevant.filter((a) => a.is_correct === true).length;
    const wrong = relevant.filter((a) => a.is_correct === false).length;
    const total = relevant.length;
    return {
      questionId: q.id,
      title: q.title,
      content: q.content,
      correct,
      wrong,
      total,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
    };
  });

  return {
    attemptsCount: rows.length,
    averageScore: Math.round(average * 10) / 10,
    highestScore: scores.length ? Math.max(...scores) : 0,
    lowestScore: scores.length ? Math.min(...scores) : 0,
    medianScore: Math.round(median * 10) / 10,
    completionRate: rows.length ? Math.round((graded.length / rows.length) * 100) : 0,
    questionStats,
    studentRows: rows.map((r) => {
      const s = studentById.get(r.student_id);
      return {
        studentId: r.student_id,
        fullName: s?.full_name ?? "(đã xóa)",
        studentCode: s?.student_code ?? "-",
        status: r.status,
        score: Number(r.score),
        maxScore: Number(r.max_score),
        percent: r.max_score ? Math.round((Number(r.score) / Number(r.max_score)) * 100) : 0,
        correct: r.correct_count,
        wrong: r.wrong_count,
        unanswered: r.unanswered_count,
        timeSpent: r.time_spent,
        submittedAt: r.submitted_at,
      };
    }),
  };
}

export function reportToCsv(report: AssignmentReport): string {
  const header = [
    "student_code",
    "student_name",
    "score",
    "max_score",
    "percentage",
    "correct",
    "wrong",
    "unanswered",
    "time_spent_seconds",
    "submitted_at",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const r of report.studentRows) {
    lines.push(
      [
        escape(r.studentCode),
        escape(r.fullName),
        r.score,
        r.maxScore,
        r.percent,
        r.correct,
        r.wrong,
        r.unanswered,
        r.timeSpent,
        r.submittedAt ?? "",
      ].join(",")
    );
  }
  // UTF-8 BOM so Excel opens Vietnamese text correctly.
  return "\uFEFF" + lines.join("\r\n");
}
