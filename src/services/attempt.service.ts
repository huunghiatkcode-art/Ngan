import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeAnswer } from "@/lib/question-engine/grading";
import { toPublicQuestion } from "@/lib/question-engine/publicize";
import { seededShuffle } from "@/lib/question-engine/shuffle";
import type {
  Assignment,
  AssignmentSettings,
  Attempt,
  AnswerRow,
  QuizQuestionRow,
} from "@/types/database";
import type { AnswerPayload, QuestionData, QuestionType } from "@/types/question";
import { verifySecret } from "@/lib/auth/hash";

export type ServiceError =
  | "ASSIGNMENT_NOT_FOUND"
  | "ASSIGNMENT_CLOSED"
  | "ASSIGNMENT_NOT_STARTED"
  | "ASSIGNMENT_EXPIRED"
  | "NOT_ENROLLED"
  | "WRONG_PASSWORD"
  | "NO_ATTEMPTS_LEFT"
  | "ATTEMPT_NOT_FOUND"
  | "ATTEMPT_NOT_ACTIVE"
  | "FORBIDDEN";

export class ServiceException extends Error {
  code: ServiceError;
  constructor(code: ServiceError, message: string) {
    super(message);
    this.code = code;
  }
}

const ERROR_MESSAGES: Record<ServiceError, string> = {
  ASSIGNMENT_NOT_FOUND: "Không tìm thấy bài kiểm tra với mã này.",
  ASSIGNMENT_CLOSED: "Bài kiểm tra đã đóng.",
  ASSIGNMENT_NOT_STARTED: "Bài kiểm tra chưa mở.",
  ASSIGNMENT_EXPIRED: "Bài kiểm tra đã hết hạn.",
  NOT_ENROLLED: "Bạn không được giao bài kiểm tra này.",
  WRONG_PASSWORD: "Mật khẩu không đúng.",
  NO_ATTEMPTS_LEFT: "Bạn đã dùng hết số lần làm bài cho phép.",
  ATTEMPT_NOT_FOUND: "Không tìm thấy lượt làm bài.",
  ATTEMPT_NOT_ACTIVE: "Lượt làm bài này đã kết thúc.",
  FORBIDDEN: "Bạn không có quyền truy cập.",
};

function fail(code: ServiceError): never {
  throw new ServiceException(code, ERROR_MESSAGES[code]);
}

function isWithinWindow(a: Assignment): boolean {
  const now = Date.now();
  if (a.start_at && now < new Date(a.start_at).getTime()) return false;
  if (a.due_at && now > new Date(a.due_at).getTime()) return false;
  return true;
}

function isAttemptTimeUp(attempt: Attempt, settings: AssignmentSettings): boolean {
  if (!settings.time_limit_seconds) return false;
  const deadline = new Date(attempt.started_at).getTime() + settings.time_limit_seconds * 1000;
  return Date.now() > deadline;
}

// ============================================================
// LIST — assignments visible to this student (dashboard)
// ============================================================
export async function listAssignmentsForStudent(studentId: string) {
  const admin = createAdminClient();
  const { data: roster } = await admin
    .from("assignment_students")
    .select("assignment_id, assignments(id, title, status, start_at, due_at, quiz_id, quizzes(title))")
    .eq("student_id", studentId);

  const rows = (roster ?? []) as unknown as {
    assignment_id: string;
    assignments: { id: string; title: string; status: string; start_at: string | null; due_at: string | null; quiz_id: string; quizzes: { title: string } } | null;
  }[];

  const { data: attempts } = await admin.from("attempts").select("*").eq("student_id", studentId);
  const attemptsByAssignment = new Map<string, Attempt[]>();
  ((attempts as Attempt[]) ?? []).forEach((a) => {
    const list = attemptsByAssignment.get(a.assignment_id) ?? [];
    list.push(a);
    attemptsByAssignment.set(a.assignment_id, list);
  });

  return rows
    .filter((r) => r.assignments)
    .map((r) => {
      const a = r.assignments!;
      const myAttempts = attemptsByAssignment.get(a.id) ?? [];
      const latest = myAttempts.sort((x, y) => y.attempt_number - x.attempt_number)[0] ?? null;
      return {
        assignmentId: a.id,
        title: a.title,
        quizTitle: a.quizzes.title,
        status: a.status,
        startAt: a.start_at,
        dueAt: a.due_at,
        latestAttempt: latest,
      };
    })
    .sort((a, b) => (a.dueAt && b.dueAt ? new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() : 0));
}

// ============================================================
// JOIN
// ============================================================
export async function joinAssignmentByCode(studentId: string, teacherId: string, joinCode: string, password?: string) {
  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from("assignments")
    .select("*")
    .eq("join_code", joinCode.trim().toUpperCase())
    .maybeSingle();

  if (!assignment) fail("ASSIGNMENT_NOT_FOUND");
  const a = assignment as Assignment;
  if (a.teacher_id !== teacherId) fail("ASSIGNMENT_NOT_FOUND");
  if (a.status === "closed") fail("ASSIGNMENT_CLOSED");
  if (!isWithinWindow(a)) {
    fail(a.start_at && Date.now() < new Date(a.start_at).getTime() ? "ASSIGNMENT_NOT_STARTED" : "ASSIGNMENT_EXPIRED");
  }
  if (a.password_hash) {
    if (!password || !(await verifySecret(password, a.password_hash))) fail("WRONG_PASSWORD");
  }

  // Auto-enroll on successful code+password entry if not already rostered.
  const { data: existingRoster } = await admin
    .from("assignment_students")
    .select("id")
    .eq("assignment_id", a.id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!existingRoster) {
    await admin.from("assignment_students").insert({ assignment_id: a.id, student_id: studentId });
  }

  return a;
}

// ============================================================
// START ATTEMPT
// ============================================================
export async function startAttempt(studentId: string, assignmentId: string) {
  const admin = createAdminClient();
  const { data: assignment, error: aErr } = await admin.from("assignments").select("*").eq("id", assignmentId).single();
  if (aErr || !assignment) fail("ASSIGNMENT_NOT_FOUND");
  const a = assignment as Assignment;
  if (a.status === "closed") fail("ASSIGNMENT_CLOSED");
  if (!isWithinWindow(a)) fail("ASSIGNMENT_EXPIRED");

  const { data: roster } = await admin
    .from("assignment_students")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!roster) fail("NOT_ENROLLED");

  // Idempotent: if an in-progress attempt already exists, resume it instead
  // of creating a duplicate (handles double-submits / two open tabs).
  const { data: existing } = await admin
    .from("attempts")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .eq("status", "in_progress")
    .maybeSingle();
  if (existing) return existing as Attempt;

  const { count } = await admin
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId);
  const attemptNumber = (count ?? 0) + 1;
  if (attemptNumber > a.settings.attempts_allowed) fail("NO_ATTEMPTS_LEFT");

  const { data: questions, error: qErr } = await admin
    .from("quiz_questions")
    .select("id, points")
    .eq("quiz_id", a.quiz_id)
    .order("order_index");
  if (qErr) throw qErr;

  const attemptId = crypto.randomUUID();
  let questionOrder = (questions as { id: string }[]).map((q) => q.id);
  if (a.settings.randomize_questions) questionOrder = seededShuffle(questionOrder, attemptId);

  const maxScore = (questions as { points: number }[]).reduce((sum, q) => sum + q.points, 0);

  const { data: attempt, error } = await admin
    .from("attempts")
    .insert({
      id: attemptId,
      assignment_id: assignmentId,
      student_id: studentId,
      attempt_number: attemptNumber,
      question_order: questionOrder,
      max_score: maxScore,
      unanswered_count: questionOrder.length,
    })
    .select()
    .single();
  if (error) {
    // 23505 = unique_violation: another request (second tab / double click)
    // created the attempt first. Resume that one instead of failing.
    if ((error as { code?: string }).code === "23505") {
      const { data: winner } = await admin
        .from("attempts")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", studentId)
        .eq("status", "in_progress")
        .maybeSingle();
      if (winner) return winner as Attempt;
      fail("NO_ATTEMPTS_LEFT");
    }
    throw error;
  }

  // Pre-create one answer row per question so autosave is a plain UPDATE.
  await admin.from("answers").insert(
    questionOrder.map((qid) => ({ attempt_id: attemptId, question_id: qid, answer: {} }))
  );

  await admin.from("activity_events").insert({
    attempt_id: attemptId,
    student_id: studentId,
    event_type: "STUDENT_STARTED",
  });

  return attempt as Attempt;
}

// ============================================================
// LOAD ATTEMPT (questions + settings) FOR THE STUDENT
// ============================================================
export async function getAttemptForStudent(studentId: string, attemptId: string) {
  const admin = createAdminClient();
  const { data: attempt, error } = await admin.from("attempts").select("*").eq("id", attemptId).single();
  if (error || !attempt) fail("ATTEMPT_NOT_FOUND");
  const att = attempt as Attempt;
  if (att.student_id !== studentId) fail("FORBIDDEN");

  const { data: assignment } = await admin.from("assignments").select("*").eq("id", att.assignment_id).single();
  const a = assignment as Assignment;

  if (att.status === "in_progress" && isAttemptTimeUp(att, a.settings)) {
    await finalizeAttempt(att.id);
    const { data: fresh } = await admin.from("attempts").select("*").eq("id", att.id).single();
    return buildAttemptView(fresh as Attempt, a);
  }

  return buildAttemptView(att, a);
}

async function buildAttemptView(att: Attempt, assignment: Assignment) {
  const admin = createAdminClient();
  const { data: questionRows } = await admin
    .from("quiz_questions")
    .select("*")
    .in("id", att.question_order.length ? att.question_order : ["00000000-0000-0000-0000-000000000000"]);
  const byId = new Map((questionRows as QuizQuestionRow[]).map((q) => [q.id, q]));

  const publicQuestions = att.question_order
    .map((qid) => byId.get(qid))
    .filter((q): q is QuizQuestionRow => !!q)
    .map((row) =>
      toPublicQuestion(
        {
          id: row.id,
          quizId: row.quiz_id,
          type: row.type as QuestionType,
          orderIndex: row.order_index,
          title: row.title,
          content: row.content,
          data: row.data as unknown as QuestionData,
          points: row.points,
          timeLimit: row.time_limit,
          explanation: row.explanation,
          settings: row.settings,
        },
        att.id
      )
    );

  const { data: existingAnswers } = await admin.from("answers").select("*").eq("attempt_id", att.id);

  return {
    attempt: att,
    settings: assignment.settings,
    questions: publicQuestions,
    answers: (existingAnswers as AnswerRow[]).map((a) => ({
      questionId: a.question_id,
      answer: a.answer,
      isAnswered: a.is_answered,
    })),
  };
}

// ============================================================
// SAVE ANSWER (autosave)
// ============================================================
export async function saveAnswer(
  studentId: string,
  attemptId: string,
  questionId: string,
  payload: AnswerPayload,
  currentQuestionIndex: number
) {
  const admin = createAdminClient();
  const { data: attempt, error } = await admin.from("attempts").select("*").eq("id", attemptId).single();
  if (error || !attempt) fail("ATTEMPT_NOT_FOUND");
  const att = attempt as Attempt;
  if (att.student_id !== studentId) fail("FORBIDDEN");
  if (att.status !== "in_progress") fail("ATTEMPT_NOT_ACTIVE");

  if (!att.question_order.includes(questionId)) fail("FORBIDDEN");

  const { data: assignment } = await admin.from("assignments").select("*").eq("id", att.assignment_id).single();
  const a = assignment as Assignment;
  if (isAttemptTimeUp(att, a.settings)) {
    await finalizeAttempt(att.id);
    fail("ATTEMPT_NOT_ACTIVE");
  }

  const { data: questionRow } = await admin.from("quiz_questions").select("*").eq("id", questionId).single();
  const q = questionRow as QuizQuestionRow;
  const grade = gradeAnswer(q.data as unknown as QuestionData, payload, q.points);

  await admin
    .from("answers")
    .update({
      answer: payload,
      is_answered: true,
      is_correct: grade.isCorrect,
      points_earned: grade.pointsEarned,
      grading_status: grade.gradingStatus,
      answered_at: new Date().toISOString(),
    })
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId);

  await admin
    .from("attempts")
    .update({
      current_question_index: currentQuestionIndex,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  await admin.from("activity_events").insert({
    attempt_id: attemptId,
    student_id: studentId,
    event_type: "STUDENT_ANSWERED",
    metadata: { questionId, currentQuestionIndex },
  });

  return { saved: true };
}

export async function heartbeat(studentId: string, attemptId: string, currentQuestionIndex: number) {
  const admin = createAdminClient();
  const { data: attempt } = await admin.from("attempts").select("student_id, status").eq("id", attemptId).single();
  if (!attempt || attempt.student_id !== studentId || attempt.status !== "in_progress") return;
  await admin
    .from("attempts")
    .update({ last_seen_at: new Date().toISOString(), current_question_index: currentQuestionIndex })
    .eq("id", attemptId);
}

// ============================================================
// SUBMIT
// ============================================================
export async function finalizeAttempt(attemptId: string) {
  const admin = createAdminClient();
  const { data: attempt } = await admin.from("attempts").select("*").eq("id", attemptId).single();
  if (!attempt) fail("ATTEMPT_NOT_FOUND");
  const att = attempt as Attempt;
  if (att.status !== "in_progress") return att;

  const { data: answers } = await admin.from("answers").select("*").eq("attempt_id", attemptId);
  const rows = (answers as AnswerRow[]) ?? [];

  const score = rows.reduce((sum, a) => sum + Number(a.points_earned), 0);
  const correct = rows.filter((a) => a.is_correct === true).length;
  const wrong = rows.filter((a) => a.is_correct === false).length;
  const unanswered = rows.filter((a) => !a.is_answered).length;
  const hasManualReview = rows.some((a) => a.grading_status === "manual_review");
  const timeSpent = Math.round((Date.now() - new Date(att.started_at).getTime()) / 1000);

  const { data: updated, error } = await admin
    .from("attempts")
    .update({
      status: hasManualReview ? "grading" : "graded",
      submitted_at: new Date().toISOString(),
      score,
      correct_count: correct,
      wrong_count: wrong,
      unanswered_count: unanswered,
      completion_percent: rows.length ? Math.round(((rows.length - unanswered) / rows.length) * 100) : 0,
      time_spent: timeSpent,
    })
    .eq("id", attemptId)
    .eq("status", "in_progress") // compare-and-set: a concurrent submit loses here
    .select()
    .maybeSingle();
  if (error) throw error;

  if (!updated) {
    // Someone else (double click / timer) already finalised it — return that result, no duplicate event.
    const { data: current } = await admin.from("attempts").select("*").eq("id", attemptId).single();
    return current as Attempt;
  }

  await admin.from("activity_events").insert({
    attempt_id: attemptId,
    student_id: att.student_id,
    event_type: "STUDENT_SUBMITTED",
  });

  return updated as Attempt;
}

export async function submitAttempt(studentId: string, attemptId: string) {
  const admin = createAdminClient();
  const { data: attempt } = await admin.from("attempts").select("*").eq("id", attemptId).single();
  if (!attempt) fail("ATTEMPT_NOT_FOUND");
  const att = attempt as Attempt;
  if (att.student_id !== studentId) fail("FORBIDDEN");
  if (att.status !== "in_progress") fail("ATTEMPT_NOT_ACTIVE");
  return finalizeAttempt(attemptId);
}

// ============================================================
// RESULT
// ============================================================
export async function getResultForStudent(studentId: string, attemptId: string) {
  const admin = createAdminClient();
  const { data: attempt } = await admin.from("attempts").select("*").eq("id", attemptId).single();
  if (!attempt) fail("ATTEMPT_NOT_FOUND");
  let att = attempt as Attempt;
  if (att.student_id !== studentId) fail("FORBIDDEN");

  const { data: assignment } = await admin
    .from("assignments")
    .select("*, quizzes(title)")
    .eq("id", att.assignment_id)
    .single();
  const a = assignment as Assignment & { quizzes: { title: string } };

  if (att.status === "in_progress" && isAttemptTimeUp(att, a.settings)) {
    att = await finalizeAttempt(att.id);
  }
  if (att.status === "in_progress") {
    // SECURITY: an unfinished attempt must never see correct answers or a
    // per-question breakdown (otherwise: start a test, open the result page, copy answers).
    return {
      attempt: att,
      quizTitle: a.quizzes.title,
      showResult: false,
      showCorrectAnswer: false,
      breakdown: [] as never[],
    };
  }

  const { data: answers } = await admin.from("answers").select("*").eq("attempt_id", attemptId);
  const { data: questionRows } = await admin
    .from("quiz_questions")
    .select("*")
    .in("id", att.question_order.length ? att.question_order : ["00000000-0000-0000-0000-000000000000"]);
  const byId = new Map((questionRows as QuizQuestionRow[]).map((q) => [q.id, q]));

  const breakdown = ((answers as AnswerRow[]) ?? []).map((ans) => {
    const q = byId.get(ans.question_id);
    return {
      questionId: ans.question_id,
      title: q?.title ?? null,
      content: q?.content ?? "",
      type: q?.type,
      points: q?.points ?? 0,
      pointsEarned: ans.points_earned,
      isAnswered: ans.is_answered,
      isCorrect: a.settings.show_correct_answer ? ans.is_correct : null,
      correctData: a.settings.show_correct_answer ? q?.data : undefined,
      yourAnswer: ans.answer,
      gradingStatus: ans.grading_status,
    };
  });

  return {
    attempt: att,
    quizTitle: a.quizzes.title,
    showResult: a.settings.show_result,
    showCorrectAnswer: a.settings.show_correct_answer,
    breakdown: a.settings.show_result ? breakdown : [],
  };
}
