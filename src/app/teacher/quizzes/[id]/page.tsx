import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as QuizService from "@/services/quiz.service";
import QuizEditorClient from "./QuizEditorClient";
import type { QuestionData, QuestionType } from "@/types/question";

export default async function QuizEditorPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <QuizEditorClient
      quiz={quiz}
      questions={questions.map((q) => ({
        id: q.id,
        type: q.type as QuestionType,
        title: q.title,
        content: q.content,
        data: q.data as unknown as QuestionData,
        points: q.points,
        timeLimit: q.time_limit,
        explanation: q.explanation,
      }))}
    />
  );
}
