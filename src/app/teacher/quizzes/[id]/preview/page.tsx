import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as QuizService from "@/services/quiz.service";
import { toPublicQuestion } from "@/lib/question-engine/publicize";
import type { QuestionData, QuestionType } from "@/types/question";
import PreviewClient from "./PreviewClient";

export default async function QuizPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTeacher();
  const supabase = await createServerSupabase();
  let data;
  try {
    data = await QuizService.getQuizWithQuestions(supabase, id);
  } catch {
    notFound();
  }
  const { quiz, questions } = data!;

  const publicQuestions = questions.map((row) =>
    toPublicQuestion(
      {
        id: row.id, quizId: row.quiz_id, type: row.type as QuestionType, orderIndex: row.order_index,
        title: row.title, content: row.content, data: row.data as unknown as QuestionData,
        points: row.points, timeLimit: row.time_limit, explanation: row.explanation, settings: row.settings,
      },
      `preview:${row.id}`
    )
  );

  return <PreviewClient quizId={quiz.id} title={quiz.title} questions={publicQuestions} />;
}
