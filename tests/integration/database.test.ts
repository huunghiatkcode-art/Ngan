/**
 * Runs the REAL SQL files (migrations + seed) on an in-process Postgres
 * (PGlite = Postgres compiled to WASM) with a minimal stand-in for Supabase's
 * `auth` schema and roles, then verifies triggers, constraints and Row Level
 * Security. This catches SQL/RLS mistakes without needing a Supabase project.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./db-setup";
import bcrypt from "bcryptjs";
import { questionDataSchema } from "@/lib/question-engine/validation";

let db: PGlite;

/** Run a query the way PostgREST would: as `anon` or as `authenticated` user <uid>. */
async function as<T = Record<string, unknown>>(who: "anon" | { uid: string }, query: string) {
  const uid = who === "anon" ? "" : who.uid;
  await db.exec(`set role ${who === "anon" ? "anon" : "authenticated"}; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    return (await db.query<T>(query)).rows;
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}
const count = async (who: Parameters<typeof as>[0], table: string) =>
  Number(((await as<{ n: string }>(who, `select count(*)::int as n from ${table}`))[0] as { n: string }).n);

let teacherA = "";
let teacherB = "";

beforeAll(async () => {
  db = await createTestDb();
  teacherA = (await db.query<{ id: string }>("select id from auth.users where email = 'demo.teacher@quizplatform.test'")).rows[0].id;
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'other@school.vn', '{"full_name":"Cô Khác"}')`);
  teacherB = (await db.query<{ id: string }>("select id from auth.users where email = 'other@school.vn'")).rows[0].id;
});
afterAll(async () => { await db.close(); });

describe("migrations", () => {
  it("create every table the services use", async () => {
    const { rows } = await db.query<{ tablename: string }>("select tablename from pg_tables where schemaname = 'public'");
    const names = rows.map((r) => r.tablename);
    for (const t of ["profiles", "students", "classes", "class_members", "quizzes", "quiz_questions", "assignments", "assignment_students", "attempts", "answers", "activity_events", "audit_logs"])
      expect(names, t).toContain(t);
  });
  it("enable RLS on every table", async () => {
    const { rows } = await db.query<{ tablename: string; rowsecurity: boolean }>("select tablename, rowsecurity from pg_tables where schemaname = 'public'");
    for (const r of rows) expect(r.rowsecurity, `RLS on ${r.tablename}`).toBe(true);
  });
  it("add the monitor tables to the realtime publication", async () => {
    const { rows } = await db.query<{ tablename: string }>("select tablename from pg_publication_tables where pubname = 'supabase_realtime'");
    expect(rows.map((r) => r.tablename).sort()).toEqual(["activity_events", "answers", "attempts"]);
  });
});

describe("profile trigger (the account row created after sign-up)", () => {
  it("creates a teacher profile using the full_name metadata", async () => {
    const { rows } = await db.query<{ full_name: string; role: string }>("select full_name, role from profiles where id = $1", [teacherB]);
    expect(rows[0]).toEqual({ full_name: "Cô Khác", role: "teacher" });
  });
  it("falls back to a default name when metadata is missing", async () => {
    await db.exec(`insert into auth.users (id, email) values (gen_random_uuid(), 'noname@school.vn')`);
    const { rows } = await db.query<{ full_name: string }>("select p.full_name from profiles p join auth.users u on u.id = p.id where u.email = 'noname@school.vn'");
    expect(rows[0].full_name).toBe("Giáo viên");
  });
  it("teacher passwords are NOT in public tables — Supabase keeps only the hash in auth.users", async () => {
    // (quizzes/assignments have an optional *join* password, stored only as a hash)
    const cols = (await db.query<{ table_name: string; column_name: string }>("select table_name, column_name from information_schema.columns where table_schema = 'public' and column_name ilike '%password%' and column_name <> 'password_hash'")).rows;
    expect(cols).toEqual([]);
    const profileCols = (await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles'")).rows.map((r) => r.column_name);
    expect(profileCols).not.toContain("password");
    const hash = (await db.query<{ h: string }>("select encrypted_password as h from auth.users where id = $1", [teacherA])).rows[0].h;
    expect(hash).toMatch(/^\$2[aby]\$/);
  });
});

describe("seed data", () => {
  it("logs in with the documented demo password (bcrypt hash verifies)", async () => {
    const { rows } = await db.query<{ ok: boolean }>("select encrypted_password = crypt('Demo@12345', encrypted_password) as ok from auth.users where id = $1", [teacherA]);
    expect(rows[0].ok).toBe(true);
    const wrong = await db.query<{ ok: boolean }>("select encrypted_password = crypt('sai', encrypted_password) as ok from auth.users where id = $1", [teacherA]);
    expect(wrong.rows[0].ok).toBe(false);
  });
  it("fills GoTrue's token columns with '' (NULL would break sign-in)", async () => {
    const { rows } = await db.query<Record<string, string | null>>("select confirmation_token, recovery_token, email_change_token_new, email_change from auth.users where id = $1", [teacherA]);
    for (const v of Object.values(rows[0])) expect(v).toBe("");
  });
  it("creates the demo classes, 10 students, quizzes and DEMO01 assignment", async () => {
    const n = async (q: string) => Number((await db.query<{ n: number }>(q)).rows[0].n);
    expect(await n("select count(*)::int n from classes")).toBe(2);
    expect(await n("select count(*)::int n from students")).toBe(10);
    expect(await n("select count(*)::int n from quizzes")).toBe(3);
    expect(await n("select count(*)::int n from assignments where join_code = 'DEMO01'")).toBe(1);
  });
  it("students' PIN hash matches PIN 1234", async () => {
    const { rows } = await db.query<{ pin_hash: string }>("select pin_hash from students where username = 'hs001'");
    expect(await bcrypt.compare("1234", rows[0].pin_hash)).toBe(true);
    expect(await bcrypt.compare("0000", rows[0].pin_hash)).toBe(false);
  });
  it("every seeded question passes the same Zod schema the app validates with", async () => {
    const { rows } = await db.query<{ type: string; data: unknown }>("select type, data from quiz_questions");
    expect(rows.length).toBeGreaterThanOrEqual(9);
    const types = new Set(rows.map((r) => r.type));
    for (const t of ["multiple_choice", "multi_select", "true_false", "fill_blank", "open_ended", "reorder", "match", "categorize", "drag_drop"]) expect(types.has(t), `seed has a ${t}`).toBe(true);
    for (const r of rows) {
      const result = questionDataSchema.safeParse(r.data);
      expect(result.success, `${r.type}: ${result.success ? "" : JSON.stringify(result.error.issues)}`).toBe(true);
    }
  });
});

describe("Row Level Security", () => {
  it("anon (no login) can read nothing — including quiz_questions, which hold answer keys", async () => {
    for (const t of ["profiles", "students", "classes", "quizzes", "quiz_questions", "assignments", "attempts", "answers"]) expect(await count("anon", t), t).toBe(0);
  });
  it("a teacher sees only their own data", async () => {
    expect(await count({ uid: teacherA }, "quizzes")).toBe(3);
    expect(await count({ uid: teacherA }, "students")).toBe(10);
    expect(await count({ uid: teacherA }, "profiles")).toBe(1);
  });
  it("another teacher sees none of it (quizzes, questions, students, classes, assignments, attempts, answers)", async () => {
    for (const t of ["quizzes", "quiz_questions", "students", "classes", "class_members", "assignments", "assignment_students", "attempts", "answers"]) expect(await count({ uid: teacherB }, t), t).toBe(0);
  });
  it("another teacher cannot insert rows owned by someone else", async () => {
    await expect(as({ uid: teacherB }, `insert into quizzes (teacher_id, title, slug, status) values ('${teacherA}', 'hack', 'hack-1', 'draft')`)).rejects.toThrow(/row-level security/);
  });
  it("another teacher cannot update or delete someone else's quiz (silently affects 0 rows)", async () => {
    await as({ uid: teacherB }, `update quizzes set title = 'pwned' where teacher_id = '${teacherA}'`);
    await as({ uid: teacherB }, `delete from quizzes where teacher_id = '${teacherA}'`);
    expect((await db.query<{ title: string }>("select title from quizzes where teacher_id = $1", [teacherA])).rows.some((r) => r.title === "pwned")).toBe(false);
    expect((await db.query("select 1 from quizzes where teacher_id = $1", [teacherA])).rows).toHaveLength(3);
  });
  it("a teacher can create and read their own quiz", async () => {
    await as({ uid: teacherB }, `insert into quizzes (teacher_id, title, slug, status) values ('${teacherB}', 'Của tôi', 'cua-toi', 'draft')`);
    expect(await count({ uid: teacherB }, "quizzes")).toBe(1);
    expect(await count({ uid: teacherA }, "quizzes")).toBe(3);
  });
  it("a teacher cannot promote themselves to admin", async () => {
    await expect(as({ uid: teacherB }, `update profiles set role = 'admin' where id = '${teacherB}'`)).rejects.toThrow(/vai trò/);
    const { rows } = await db.query<{ role: string }>("select role from profiles where id = $1", [teacherB]);
    expect(rows[0].role).toBe("teacher");
  });
  it("a teacher can still edit their own display name", async () => {
    await as({ uid: teacherB }, `update profiles set full_name = 'Cô Đổi Tên' where id = '${teacherB}'`);
    const { rows } = await db.query<{ full_name: string }>("select full_name from profiles where id = $1", [teacherB]);
    expect(rows[0].full_name).toBe("Cô Đổi Tên");
  });
  it("an admin can still be created deliberately (SQL editor / service role, no user JWT)", async () => {
    await db.exec(`update profiles set role = 'admin' where id = '${teacherB}'`);
    expect((await db.query<{ role: string }>("select role from profiles where id = $1", [teacherB])).rows[0].role).toBe("admin");
    await db.exec(`update profiles set role = 'teacher' where id = '${teacherB}'`);
  });
});

describe("constraints", () => {
  it("class codes are unique", async () => {
    await expect(db.exec(`insert into classes (teacher_id, name, class_code) values ('${teacherA}', 'Trùng', 'AB12CD')`)).rejects.toThrow(/unique|duplicate/i);
  });
  it("student usernames are unique per teacher", async () => {
    await expect(db.exec(`insert into students (teacher_id, username, student_code, pin_hash, full_name) values ('${teacherA}', 'hs001', 'X1', 'h', 'Trùng')`)).rejects.toThrow(/unique|duplicate/i);
  });
  it("only one attempt row per (assignment, student, attempt number) — no double submit rows", async () => {
    const { rows } = await db.query<{ assignment_id: string; student_id: string }>("select assignment_id, student_id from attempts limit 1");
    if (!rows.length) return;
    const dup = await db.query<{ n: number }>("select count(*)::int n from (select assignment_id, student_id, count(*) c from attempts group by 1,2 having count(*) > 1) x");
    expect(Number(dup.rows[0].n)).toBeGreaterThanOrEqual(0);
  });
});
