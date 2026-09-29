import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateCode } from "@/lib/utils/codes";
import { hashSecret } from "@/lib/auth/hash";
import type { Assignment, AssignmentSettings } from "@/types/database";

export interface CreateAssignmentInput {
  title: string;
  quizId: string;
  classId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  password?: string;
  timeLimitSeconds?: number | null;
  attemptsAllowed: number;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  allowBackNavigation: boolean;
  showResult: boolean;
  showCorrectAnswer: boolean;
  showLeaderboard: boolean;
}

export async function listAssignments(supabase: SupabaseClient, teacherId: string) {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, quizzes(title), classes(name), attempts(count)")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAssignment(supabase: SupabaseClient, teacherId: string, input: CreateAssignmentInput) {
  let joinCode = generateCode(6);
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase.from("assignments").select("id").eq("join_code", joinCode).maybeSingle();
    if (!existing) break;
    joinCode = generateCode(6);
  }

  const settings: AssignmentSettings = {
    time_limit_seconds: input.timeLimitSeconds ?? null,
    attempts_allowed: input.attemptsAllowed,
    randomize_questions: input.randomizeQuestions,
    randomize_answers: input.randomizeAnswers,
    allow_back_navigation: input.allowBackNavigation,
    show_result: input.showResult,
    show_correct_answer: input.showCorrectAnswer,
    show_leaderboard: input.showLeaderboard,
  };

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      teacher_id: teacherId,
      quiz_id: input.quizId,
      class_id: input.classId ?? null,
      title: input.title,
      start_at: input.startAt ?? null,
      due_at: input.dueAt ?? null,
      join_code: joinCode,
      password_hash: input.password ? await hashSecret(input.password) : null,
      settings,
    })
    .select()
    .single();
  if (error) throw error;
  const assignment = data as Assignment;

  // If tied to a class, auto-roster every current class member.
  if (input.classId) {
    const { data: members } = await supabase.from("class_members").select("student_id").eq("class_id", input.classId);
    if (members?.length) {
      await supabase
        .from("assignment_students")
        .insert(members.map((m) => ({ assignment_id: assignment.id, student_id: m.student_id })));
    }
  }

  return assignment;
}

export async function getAssignment(supabase: SupabaseClient, assignmentId: string) {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, quizzes(title, id), classes(name)")
    .eq("id", assignmentId)
    .single();
  if (error) throw error;
  return data;
}

export async function setAssignmentStatus(
  supabase: SupabaseClient,
  assignmentId: string,
  status: Assignment["status"]
) {
  const { error } = await supabase.from("assignments").update({ status }).eq("id", assignmentId);
  if (error) throw error;
}

export async function deleteAssignment(supabase: SupabaseClient, assignmentId: string) {
  const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
  if (error) throw error;
}

export async function getRosterProgress(supabase: SupabaseClient, assignmentId: string) {
  const { data: roster, error } = await supabase
    .from("assignment_students")
    .select("student_id, students(full_name, student_code, username)")
    .eq("assignment_id", assignmentId);
  if (error) throw error;

  const { data: attempts, error: aErr } = await supabase
    .from("attempts")
    .select("*")
    .eq("assignment_id", assignmentId);
  if (aErr) throw aErr;

  return { roster, attempts };
}
