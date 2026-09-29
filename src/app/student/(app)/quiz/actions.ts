"use server";

import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth/student";
import { answerPayloadSchema, joinAssignmentSchema } from "@/lib/question-engine/validation";
import * as AttemptService from "@/services/attempt.service";
import { ServiceException } from "@/services/attempt.service";
import type { ActionResult } from "@/app/(auth)/actions";
import type { AnswerPayload } from "@/types/question";

export async function joinAssignmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const student = await requireStudent();
  const parsed = joinAssignmentSchema.safeParse({
    joinCode: formData.get("joinCode"),
    password: (formData.get("password") as string) || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    const assignment = await AttemptService.joinAssignmentByCode(
      student.studentId,
      student.teacherId,
      parsed.data.joinCode,
      parsed.data.password
    );
    const attempt = await AttemptService.startAttempt(student.studentId, assignment.id);
    redirect(`/student/quiz/${attempt.id}`);
  } catch (e) {
    if (e instanceof ServiceException) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveAnswerAction(
  attemptId: string,
  questionId: string,
  payload: AnswerPayload,
  currentQuestionIndex: number
) {
  const student = await requireStudent();
  const parsed = answerPayloadSchema.safeParse(payload);
  if (!parsed.success) throw new Error("Dữ liệu câu trả lời không hợp lệ.");
  return AttemptService.saveAnswer(student.studentId, attemptId, questionId, parsed.data, currentQuestionIndex);
}

export async function heartbeatAction(attemptId: string, currentQuestionIndex: number) {
  const student = await requireStudent();
  await AttemptService.heartbeat(student.studentId, attemptId, currentQuestionIndex);
}

export async function submitAttemptAction(attemptId: string) {
  const student = await requireStudent();
  await AttemptService.submitAttempt(student.studentId, attemptId);
  redirect(`/student/result/${attemptId}`);
}
