"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as AssignmentService from "@/services/assignment.service";
import { assignmentInputSchema } from "@/lib/question-engine/validation";
import type { ActionResult } from "@/app/(auth)/actions";

export async function createAssignmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const teacher = await requireTeacher();

  const raw = {
    title: formData.get("title") as string,
    quizId: formData.get("quizId") as string,
    classId: (formData.get("classId") as string) || null,
    startAt: (formData.get("startAt") as string) || null,
    dueAt: (formData.get("dueAt") as string) || null,
    password: (formData.get("password") as string) || undefined,
    timeLimitSeconds: formData.get("timeLimitMinutes")
      ? Number(formData.get("timeLimitMinutes")) * 60
      : null,
    attemptsAllowed: Number(formData.get("attemptsAllowed") || 1),
    randomizeQuestions: formData.get("randomizeQuestions") === "on",
    randomizeAnswers: formData.get("randomizeAnswers") === "on",
    allowBackNavigation: formData.get("allowBackNavigation") === "on",
    showResult: formData.get("showResult") === "on",
    showCorrectAnswer: formData.get("showCorrectAnswer") === "on",
    showLeaderboard: formData.get("showLeaderboard") === "on",
  };

  const parsed = assignmentInputSchema.safeParse({
    ...raw,
    startAt: raw.startAt ? new Date(raw.startAt).toISOString() : null,
    dueAt: raw.dueAt ? new Date(raw.dueAt).toISOString() : null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createServerSupabase();
  const assignment = await AssignmentService.createAssignment(supabase, teacher.id, parsed.data);
  revalidatePath("/teacher/assignments");
  redirect(`/teacher/assignments/${assignment.id}`);
}

export async function setAssignmentStatusAction(assignmentId: string, status: "open" | "closed") {
  await requireTeacher();
  const supabase = await createServerSupabase();
  await AssignmentService.setAssignmentStatus(supabase, assignmentId, status);
  revalidatePath(`/teacher/assignments/${assignmentId}`);
}

export async function deleteAssignmentAction(assignmentId: string) {
  await requireTeacher();
  const supabase = await createServerSupabase();
  await AssignmentService.deleteAssignment(supabase, assignmentId);
  revalidatePath("/teacher/assignments");
}
