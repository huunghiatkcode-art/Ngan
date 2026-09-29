"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as QuizService from "@/services/quiz.service";
import { quizInputSchema, quizQuestionInputSchema } from "@/lib/question-engine/validation";
import type { ActionResult } from "@/app/(auth)/actions";
import type { QuestionData, QuestionType } from "@/types/question";

export async function createQuizAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const parsed = quizInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createServerSupabase();
  const quiz = await QuizService.createQuiz(supabase, teacher.id, parsed.data.title, parsed.data.description);
  revalidatePath("/teacher/quizzes");
  redirect(`/teacher/quizzes/${quiz.id}`);
}

export async function deleteQuizAction(quizId: string) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  await QuizService.deleteQuiz(supabase, quizId);
  revalidatePath("/teacher/quizzes");
}

export async function duplicateQuizAction(quizId: string) {
  const teacher = await requireTeacher();
  const supabase = await createServerSupabase();
  await QuizService.duplicateQuiz(supabase, teacher.id, quizId);
  revalidatePath("/teacher/quizzes");
}

export async function updateQuizMetaAction(quizId: string, patch: { title?: string; description?: string }) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  await QuizService.updateQuizMeta(supabase, quizId, patch);
  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function publishQuizAction(quizId: string) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  await QuizService.setQuizStatus(supabase, quizId, "published");
  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function addQuestionAction(quizId: string, type: QuestionType) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  const q = await QuizService.addQuestion(supabase, quizId, type);
  revalidatePath(`/teacher/quizzes/${quizId}`);
  return q;
}

export async function updateQuestionAction(
  quizId: string,
  questionId: string,
  patch: { title?: string | null; content?: string; data?: QuestionData; points?: number; timeLimit?: number | null; explanation?: string | null }
) {
  await requireTeacher();
  const parsed = quizQuestionInputSchema.partial().safeParse({
    title: patch.title,
    content: patch.content,
    data: patch.data,
    points: patch.points,
    timeLimit: patch.timeLimit,
    explanation: patch.explanation,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createServerSupabase();
  await QuizService.updateQuestion(supabase, questionId, {
    title: patch.title,
    content: patch.content,
    data: patch.data,
    points: patch.points,
    time_limit: patch.timeLimit,
    explanation: patch.explanation,
  });
  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function deleteQuestionAction(quizId: string, questionId: string) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  await QuizService.deleteQuestion(supabase, questionId);
  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function duplicateQuestionAction(quizId: string, questionId: string) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  const row = await QuizService.duplicateQuestion(supabase, quizId, questionId);
  revalidatePath(`/teacher/quizzes/${quizId}`);
  return row;
}

export async function reorderQuestionsAction(quizId: string, orderedIds: string[]) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  await QuizService.reorderQuestions(supabase, orderedIds);
  revalidatePath(`/teacher/quizzes/${quizId}`);
}
