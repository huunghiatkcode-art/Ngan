/**
 * Runs the REAL student-side service code (join → start → autosave → submit →
 * result) against a real Postgres with every migration and the seed applied.
 * Only the network hop to Supabase is replaced (see pg-supabase-adapter.ts).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import bcrypt from "bcryptjs";
import { createTestDb } from "./db-setup";
import { createPgSupabase } from "./pg-supabase-adapter";
import type { AnswerPayload, QuestionData } from "@/types/question";

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => holder.client }));

import * as Attempts from "@/services/attempt.service";

let db: PGlite;
let teacherId = "", assignmentId = "", quizId = "";
const students: Record<string, string> = {};
const q = async <T = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows;

async function code(fn: () => Promise<unknown>) {
  try { await fn(); return "OK"; } catch (e) { return (e as { code?: string }).code ?? (e as Error).message; }
}
function correctPayload(d: QuestionData): AnswerPayload {
  switch (d.type) {
    case "multiple_choice": return { type: d.type, selectedOptionId: d.correctOptionId };
    case "multi_select": return { type: d.type, selectedOptionIds: d.correctOptionIds };
    case "true_false": return { type: d.type, value: d.correctValue };
    case "fill_blank": return { type: d.type, value: d.acceptedAnswers[0] };
    case "open_ended": return { type: d.type, value: "Ý kiến của em" };
    case "reorder": return { type: d.type, orderedItemIds: d.items.map((i) => i.id) };
    case "match": return { type: d.type, pairs: Object.fromEntries(d.pairs.map((p) => [p.id, p.id])) };
    case "categorize": return { type: d.type, categories: Object.fromEntries(d.items.map((i) => [i.id, i.categoryId])) };
    case "drag_drop": return { type: d.type, placements: Object.fromEntries(d.items.map((i) => [i.id, i.zoneId])) };
  }
}
async function newAssignment(over: Record<string, unknown> = {}, settings: Record<string, unknown> = {}) {
  const base = JSON.parse((await q<{ s: string }>("select settings::text s from assignments where id = $1", [assignmentId]))[0].s);
  const row = (await q<{ id: string }>(
    `insert into assignments (quiz_id, teacher_id, title, join_code, status, settings, password_hash, start_at, due_at)
     values ($1, $2, 'Test', $3, $4, $5::jsonb, $6, $7, $8) returning id`,
    [quizId, teacherId, (over.join_code as string) ?? Math.random().toString(36).slice(2, 8).toUpperCase(), (over.status as string) ?? "open",
      JSON.stringify({ ...base, ...settings }), (over.password_hash as string) ?? null, (over.start_at as string) ?? null, (over.due_at as string) ?? null]))[0];
  return row.id;
}
const enroll = (aid: string, sid: string) => db.query("insert into assignment_students (assignment_id, student_id) values ($1, $2) on conflict do nothing", [aid, sid]);

beforeAll(async () => {
  db = await createTestDb();
  holder.client = createPgSupabase(db);
  teacherId = (await q<{ id: string }>("select id from profiles limit 1"))[0].id;
  assignmentId = (await q<{ id: string }>("select id from assignments where join_code = 'DEMO01'"))[0].id;
  quizId = (await q<{ quiz_id: string }>("select quiz_id from assignments where id = $1", [assignmentId]))[0].quiz_id;
  for (const s of await q<{ id: string; username: string }>("select id, username from students")) students[s.username] = s.id;
});
afterAll(async () => { await db.close(); });

describe("joining with a code", () => {
  it("accepts the code in any letter case and returns the assignment", async () => {
    const a = await Attempts.joinAssignmentByCode(students.hs004, teacherId, "  demo01 ");
    expect(a.id).toBe(assignmentId);
  });
  it("hides assignments from students of a different teacher", async () => {
    expect(await code(() => Attempts.joinAssignmentByCode(students.hs004, crypto.randomUUID(), "DEMO01"))).toBe("ASSIGNMENT_NOT_FOUND");
    expect(await code(() => Attempts.joinAssignmentByCode(students.hs004, teacherId, "NOPE99"))).toBe("ASSIGNMENT_NOT_FOUND");
  });
  it("enforces the assignment password (hashed), never revealing it", async () => {
    const aid = await newAssignment({ join_code: "PASS01", password_hash: await bcrypt.hash("matkhau", 10) });
    expect(await code(() => Attempts.joinAssignmentByCode(students.hs006, teacherId, "PASS01"))).toBe("WRONG_PASSWORD");
    expect(await code(() => Attempts.joinAssignmentByCode(students.hs006, teacherId, "PASS01", "sai"))).toBe("WRONG_PASSWORD");
    expect(await code(() => Attempts.joinAssignmentByCode(students.hs006, teacherId, "PASS01", "matkhau"))).toBe("OK");
    expect((await q("select 1 from assignment_students where assignment_id = $1 and student_id = $2", [aid, students.hs006])).length).toBe(1); // auto-enrolled
  });
  it("refuses closed, not-yet-open and expired assignments", async () => {
    await newAssignment({ join_code: "CLOSED", status: "closed" });
    await newAssignment({ join_code: "FUTURE", start_at: new Date(Date.now() + 3600e3).toISOString() });
    await newAssignment({ join_code: "PAST00", due_at: new Date(Date.now() - 3600e3).toISOString() });
    expect(await code(() => Attempts.joinAssignmentByCode(students.hs004, teacherId, "CLOSED"))).toBe("ASSIGNMENT_CLOSED");
    expect(await code(() => Attempts.joinAssignmentByCode(students.hs004, teacherId, "FUTURE"))).toBe("ASSIGNMENT_NOT_STARTED");
    expect(await code(() => Attempts.joinAssignmentByCode(students.hs004, teacherId, "PAST00"))).toBe("ASSIGNMENT_EXPIRED");
  });
});

describe("starting an attempt", () => {
  it("rejects a student who is not on the roster", async () => {
    const aid = await newAssignment();
    expect(await code(() => Attempts.startAttempt(students.hs009, aid))).toBe("NOT_ENROLLED");
  });
  it("creates one attempt with a full question order, an answer row per question and max score", async () => {
    const att = await Attempts.startAttempt(students.hs004, assignmentId);
    const qs = await q<{ points: number }>("select points from quiz_questions where quiz_id = $1", [quizId]);
    expect(att.status).toBe("in_progress");
    expect(att.question_order).toHaveLength(qs.length);
    expect(Number(att.max_score)).toBe(qs.reduce((s, r) => s + r.points, 0));
    expect((await q("select 1 from answers where attempt_id = $1", [att.id])).length).toBe(qs.length);
  });
  it("is idempotent — calling again resumes the same attempt", async () => {
    const a = await Attempts.startAttempt(students.hs004, assignmentId);
    const b = await Attempts.startAttempt(students.hs004, assignmentId);
    expect(b.id).toBe(a.id);
    expect((await q("select 1 from attempts where student_id = $1 and assignment_id = $2", [students.hs004, assignmentId])).length).toBe(1);
  });
  it("respects attempts_allowed (hs001 already has a graded attempt)", async () => {
    expect(await code(() => Attempts.startAttempt(students.hs001, assignmentId))).toBe("NO_ATTEMPTS_LEFT");
  });
  it("two simultaneous requests (double click / two tabs) still create exactly ONE attempt", async () => {
    const results = await Promise.allSettled([Attempts.startAttempt(students.hs005, assignmentId), Attempts.startAttempt(students.hs005, assignmentId), Attempts.startAttempt(students.hs005, assignmentId)]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    const ids = new Set(results.map((r) => (r as PromiseFulfilledResult<{ id: string }>).value.id));
    expect(ids.size).toBe(1);
    expect((await q("select 1 from attempts where student_id = $1 and assignment_id = $2", [students.hs005, assignmentId])).length).toBe(1);
  });
});

describe("what the student receives", () => {
  it("never contains the answer key", async () => {
    const att = await Attempts.startAttempt(students.hs004, assignmentId);
    const view = await Attempts.getAttemptForStudent(students.hs004, att.id);
    expect(view.questions.length).toBeGreaterThan(0);
    const json = JSON.stringify(view);
    for (const k of ["correctOptionId", "correctOptionIds", "correctValue", "acceptedAnswers", "categoryId", "zoneId", "rubric", "explanation\":\"", "is_correct", "points_earned"]) expect(json, k).not.toContain(k);
  });
  it("is private to its owner", async () => {
    const att = await Attempts.startAttempt(students.hs004, assignmentId);
    expect(await code(() => Attempts.getAttemptForStudent(students.hs005, att.id))).toBe("FORBIDDEN");
    expect(await code(() => Attempts.getAttemptForStudent(students.hs004, crypto.randomUUID()))).toBe("ATTEMPT_NOT_FOUND");
  });
  it("does not let anyone read the result (with correct answers) before submitting", async () => {
    const att = await Attempts.startAttempt(students.hs004, assignmentId);
    const res = await Attempts.getResultForStudent(students.hs004, att.id);
    expect(res.attempt.status).toBe("in_progress");
    expect(res.breakdown).toEqual([]);
    expect(res.showCorrectAnswer).toBe(false);
    expect(JSON.stringify(res)).not.toContain("correctOptionId");
  });
});

describe("autosave", () => {
  it("stores the answer and grades it on the SERVER", async () => {
    const att = await Attempts.startAttempt(students.hs004, assignmentId);
    const mc = (await q<{ id: string; data: QuestionData; points: number }>("select id, data, points from quiz_questions where quiz_id = $1 and type = 'multiple_choice'", [quizId]))[0];
    await Attempts.saveAnswer(students.hs004, att.id, mc.id, correctPayload(mc.data), 0);
    const row = (await q<{ is_correct: boolean; points_earned: string; is_answered: boolean }>("select * from answers where attempt_id = $1 and question_id = $2", [att.id, mc.id]))[0];
    expect(row).toMatchObject({ is_correct: true, is_answered: true });
    expect(Number(row.points_earned)).toBe(mc.points);
    expect((await q("select 1 from activity_events where attempt_id = $1 and event_type = 'STUDENT_ANSWERED'", [att.id])).length).toBeGreaterThan(0);
  });
  it("overwrites on re-answer (changing your mind) instead of duplicating", async () => {
    const att = await Attempts.startAttempt(students.hs004, assignmentId);
    const tf = (await q<{ id: string; data: QuestionData }>("select id, data from quiz_questions where quiz_id = $1 and type = 'true_false'", [quizId]))[0];
    const right = (tf.data as { correctValue: boolean }).correctValue;
    await Attempts.saveAnswer(students.hs004, att.id, tf.id, { type: "true_false", value: right }, 1);
    await Attempts.saveAnswer(students.hs004, att.id, tf.id, { type: "true_false", value: !right }, 1);
    const rows = await q<{ is_correct: boolean }>("select is_correct from answers where attempt_id = $1 and question_id = $2", [att.id, tf.id]);
    expect(rows).toEqual([{ is_correct: false }]);
  });
  it("refuses another student's attempt", async () => {
    const att = await Attempts.startAttempt(students.hs004, assignmentId);
    const any = (await q<{ id: string }>("select id from quiz_questions where quiz_id = $1 limit 1", [quizId]))[0].id;
    expect(await code(() => Attempts.saveAnswer(students.hs005, att.id, any, { type: "true_false", value: true }, 0))).toBe("FORBIDDEN");
  });
  it("refuses a question that is not part of this attempt", async () => {
    const att = await Attempts.startAttempt(students.hs004, assignmentId);
    const foreign = (await q<{ id: string }>("select id from quiz_questions where quiz_id <> $1 limit 1", [quizId]))[0].id;
    expect(await code(() => Attempts.saveAnswer(students.hs004, att.id, foreign, { type: "true_false", value: true }, 0))).toBe("FORBIDDEN");
    expect((await q("select 1 from activity_events where attempt_id = $1 and metadata->>'questionId' = $2", [att.id, foreign])).length).toBe(0);
  });
  it("a payload of the wrong type for the question scores zero", async () => {
    const att = await Attempts.startAttempt(students.hs004, assignmentId);
    const mc = (await q<{ id: string }>("select id from quiz_questions where quiz_id = $1 and type = 'multiple_choice'", [quizId]))[0].id;
    await Attempts.saveAnswer(students.hs004, att.id, mc, { type: "true_false", value: true }, 0);
    expect(Number((await q<{ p: string }>("select points_earned p from answers where attempt_id = $1 and question_id = $2", [att.id, mc]))[0].p)).toBe(0);
  });
});

describe("submitting", () => {
  it("scores server-side; open-ended answers wait for manual review; double submit does not double count", async () => {
    await enroll(assignmentId, students.hs007);
    const attempt = await Attempts.startAttempt(students.hs007, assignmentId);
    const questions = await q<{ id: string; type: string; data: QuestionData; points: number }>("select id, type, data, points from quiz_questions where quiz_id = $1", [quizId]);
    for (const [i, qu] of questions.entries()) await Attempts.saveAnswer(students.hs007, attempt.id, qu.id, correctPayload(qu.data), i);
    const expected = questions.filter((x) => x.type !== "open_ended").reduce((s, x) => s + x.points, 0);

    const done = await Attempts.submitAttempt(students.hs007, attempt.id);
    expect(done.status).toBe("grading"); // open-ended present
    expect(Number(done.score)).toBe(expected);
    expect(done.wrong_count).toBe(0);
    expect(done.unanswered_count).toBe(0);

    expect(await code(() => Attempts.submitAttempt(students.hs007, attempt.id))).toBe("ATTEMPT_NOT_ACTIVE");
    const after = (await q<{ score: string }>("select score from attempts where id = $1", [attempt.id]))[0];
    expect(Number(after.score)).toBe(expected);
    expect((await q("select 1 from activity_events where attempt_id = $1 and event_type = 'STUDENT_SUBMITTED'", [attempt.id])).length).toBe(1);
  });
  it("cannot save answers after submitting", async () => {
    await enroll(assignmentId, students.hs008);
    const attempt = await Attempts.startAttempt(students.hs008, assignmentId);
    await Attempts.submitAttempt(students.hs008, attempt.id);
    const any = (await q<{ id: string }>("select id from quiz_questions where quiz_id = $1 limit 1", [quizId]))[0].id;
    expect(await code(() => Attempts.saveAnswer(students.hs008, attempt.id, any, { type: "true_false", value: true }, 0))).toBe("ATTEMPT_NOT_ACTIVE");
  });
  it("two simultaneous submits produce one result and one SUBMITTED event", async () => {
    await enroll(assignmentId, students.hs010);
    const attempt = await Attempts.startAttempt(students.hs010, assignmentId);
    await Promise.allSettled([Attempts.submitAttempt(students.hs010, attempt.id), Attempts.submitAttempt(students.hs010, attempt.id)]);
    expect((await q("select 1 from activity_events where attempt_id = $1 and event_type = 'STUDENT_SUBMITTED'", [attempt.id])).length).toBe(1);
  });
  it("counts unanswered questions and leaves score at 0 for a blank submit", async () => {
    const aid = await newAssignment({ join_code: "BLANK1" }, { attempts_allowed: 1 });
    await enroll(aid, students.hs009);
    const attempt = await Attempts.startAttempt(students.hs009, aid);
    const done = await Attempts.submitAttempt(students.hs009, attempt.id);
    expect(Number(done.score)).toBe(0);
    expect(done.unanswered_count).toBe(attempt.question_order.length);
    expect(done.completion_percent).toBe(0);
  });
});

describe("timer (server-authoritative)", () => {
  it("auto-submits an attempt whose time limit has passed, on the next read", async () => {
    const aid = await newAssignment({ join_code: "TIMER1" }, { time_limit_seconds: 60, attempts_allowed: 1 });
    await enroll(aid, students.hs002);
    const attempt = await Attempts.startAttempt(students.hs002, aid);
    await db.query("update attempts set started_at = now() - interval '10 minutes' where id = $1", [attempt.id]);
    const view = await Attempts.getAttemptForStudent(students.hs002, attempt.id);
    expect(["graded", "grading"]).toContain(view.attempt.status);
  });
  it("rejects autosave after the deadline and finalises the attempt", async () => {
    const aid = await newAssignment({ join_code: "TIMER2" }, { time_limit_seconds: 60, attempts_allowed: 1 });
    await enroll(aid, students.hs003);
    const attempt = await Attempts.startAttempt(students.hs003, aid);
    await db.query("update attempts set started_at = now() - interval '10 minutes' where id = $1", [attempt.id]);
    const any = (await q<{ id: string }>("select id from quiz_questions where quiz_id = $1 limit 1", [quizId]))[0].id;
    expect(await code(() => Attempts.saveAnswer(students.hs003, attempt.id, any, { type: "true_false", value: true }, 0))).toBe("ATTEMPT_NOT_ACTIVE");
    expect((await q<{ status: string }>("select status from attempts where id = $1", [attempt.id]))[0].status).not.toBe("in_progress");
  });
});

describe("result page", () => {
  it("is private to the student who owns it", async () => {
    const seeded = (await q<{ id: string }>("select id from attempts where student_id = $1", [students.hs001]))[0].id;
    expect(await code(() => Attempts.getResultForStudent(students.hs002, seeded))).toBe("FORBIDDEN");
    const own = await Attempts.getResultForStudent(students.hs001, seeded);
    expect(own.quizTitle).toBeTruthy();
    expect(own.breakdown.length).toBeGreaterThan(0);
  });
  it("hides correctness and answer keys when the teacher turned them off", async () => {
    const aid = await newAssignment({ join_code: "HIDE01" }, { show_correct_answer: false, show_result: true, attempts_allowed: 1 });
    await enroll(aid, students.hs006);
    const attempt = await Attempts.startAttempt(students.hs006, aid);
    await Attempts.submitAttempt(students.hs006, attempt.id);
    const res = await Attempts.getResultForStudent(students.hs006, attempt.id);
    const json = JSON.stringify(res.breakdown);
    expect(json).not.toContain("correctOptionId");
    expect(res.breakdown.every((b) => b.isCorrect === null)).toBe(true);
  });
  it("shows nothing when show_result is off", async () => {
    const aid = await newAssignment({ join_code: "HIDE02" }, { show_result: false, attempts_allowed: 1 });
    await enroll(aid, students.hs007);
    const attempt = await Attempts.startAttempt(students.hs007, aid);
    await Attempts.submitAttempt(students.hs007, attempt.id);
    expect((await Attempts.getResultForStudent(students.hs007, attempt.id)).breakdown).toEqual([]);
  });
});
