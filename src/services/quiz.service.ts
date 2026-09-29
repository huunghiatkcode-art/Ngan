import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { slugify } from "@/lib/utils/codes";
import { defaultQuestionData } from "@/lib/question-engine/factory";
import type { Quiz, QuizQuestionRow, QuizStatus } from "@/types/database";
import type { QuestionData, QuestionType } from "@/types/question";

export async function listQuizzes(supabase: SupabaseClient, teacherId: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*, quiz_questions(count)")
    .eq("teacher_id", teacherId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as (Quiz & { quiz_questions: { count: number }[] })[];
}

export async function createQuiz(supabase: SupabaseClient, teacherId: string, title: string, description?: string) {
  const baseSlug = slugify(title) || "quiz";
  let slug = `${baseSlug}-${uuid().slice(0, 6)}`;
  const { data, error } = await supabase
    .from("quizzes")
    .insert({ teacher_id: teacherId, title, description, slug })
    .select()
    .single();
  if (error) throw error;
  return data as Quiz;
}

export async function getQuizWithQuestions(supabase: SupabaseClient, quizId: string) {
  const { data: quiz, error } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
  if (error) throw error;
  const { data: questions, error: qErr } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index");
  if (qErr) throw qErr;
  return { quiz: quiz as Quiz, questions: questions as QuizQuestionRow[] };
}

export async function updateQuizMeta(
  supabase: SupabaseClient,
  quizId: string,
  patch: Partial<Pick<Quiz, "title" | "description" | "status">>
) {
  const { data, error } = await supabase.from("quizzes").update(patch).eq("id", quizId).select().single();
  if (error) throw error;
  return data as Quiz;
}

export async function setQuizStatus(supabase: SupabaseClient, quizId: string, status: QuizStatus) {
  return updateQuizMeta(supabase, quizId, { status });
}

export async function deleteQuiz(supabase: SupabaseClient, quizId: string) {
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) throw error;
}

export async function duplicateQuiz(supabase: SupabaseClient, teacherId: string, quizId: string) {
  const { quiz, questions } = await getQuizWithQuestions(supabase, quizId);
  const newQuiz = await createQuiz(supabase, teacherId, `${quiz.title} (bản sao)`, quiz.description ?? undefined);
  if (questions.length) {
    const rows = questions.map((q) => ({
      quiz_id: newQuiz.id,
      type: q.type,
      order_index: q.order_index,
      title: q.title,
      content: q.content,
      data: q.data,
      points: q.points,
      time_limit: q.time_limit,
      explanation: q.explanation,
      settings: q.settings,
    }));
    const { error } = await supabase.from("quiz_questions").insert(rows);
    if (error) throw error;
  }
  return newQuiz;
}

export async function addQuestion(supabase: SupabaseClient, quizId: string, type: QuestionType) {
  const { data: existing, error: countErr } = await supabase
    .from("quiz_questions")
    .select("order_index")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: false })
    .limit(1);
  if (countErr) throw countErr;
  const nextIndex = existing?.[0] ? existing[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from("quiz_questions")
    .insert({
      quiz_id: quizId,
      type,
      order_index: nextIndex,
      content: "",
      data: defaultQuestionData(type) as unknown as Record<string, unknown>,
      points: 100,
      time_limit: 30,
    })
    .select()
    .single();
  if (error) throw error;
  return data as QuizQuestionRow;
}

export async function updateQuestion(
  supabase: SupabaseClient,
  questionId: string,
  patch: Partial<{
    title: string | null;
    content: string;
    data: QuestionData;
    points: number;
    time_limit: number | null;
    explanation: string | null;
  }>
) {
  const { data, error } = await supabase
    .from("quiz_questions")
    .update(patch as Record<string, unknown>)
    .eq("id", questionId)
    .select()
    .single();
  if (error) throw error;
  return data as QuizQuestionRow;
}

export async function deleteQuestion(supabase: SupabaseClient, questionId: string) {
  const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
  if (error) throw error;
}

export async function duplicateQuestion(supabase: SupabaseClient, quizId: string, questionId: string) {
  const { data: q, error } = await supabase.from("quiz_questions").select("*").eq("id", questionId).single();
  if (error) throw error;
  const row = q as QuizQuestionRow;
  const copy = await addQuestion(supabase, quizId, row.type as QuestionType);
  return updateQuestion(supabase, copy.id, {
    title: row.title,
    content: row.content,
    data: row.data as unknown as QuestionData,
    points: row.points,
    time_limit: row.time_limit,
    explanation: row.explanation,
  });
}

export async function reorderQuestions(supabase: SupabaseClient, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) => supabase.from("quiz_questions").update({ order_index: index }).eq("id", id))
  );
}
