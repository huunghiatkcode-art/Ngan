-- ============================================================
-- Row Level Security
--
-- Architecture note:
-- Teachers are real Supabase Auth users -> RLS below uses auth.uid()
-- and protects every teacher-owned row, including for realtime
-- subscriptions made directly from the browser with the anon key.
--
-- Students are NOT Supabase Auth users (custom username+PIN session,
-- see lib/auth/student.ts). Because Postgres/RLS has no notion of that
-- custom session, every student-facing read/write is performed by
-- Next.js Server Actions using the SERVICE ROLE key on the server,
-- after the action verifies the student's signed session cookie and
-- manually re-checks ownership/authorization in TypeScript before
-- touching the database. The tables below therefore grant NOTHING to
-- the anonymous/public role — students never talk to Supabase directly.
-- ============================================================

alter table profiles enable row level security;
alter table students enable row level security;
alter table classes enable row level security;
alter table class_members enable row level security;
alter table quizzes enable row level security;
alter table quiz_questions enable row level security;
alter table question_media enable row level security;
alter table assignments enable row level security;
alter table assignment_students enable row level security;
alter table attempts enable row level security;
alter table answers enable row level security;
alter table activity_events enable row level security;
alter table audit_logs enable row level security;

-- ---------- profiles ----------
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- ---------- students (owned by teacher) ----------
create policy "students_all_own_teacher" on students
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ---------- classes ----------
create policy "classes_all_own_teacher" on classes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ---------- class_members (via parent class ownership) ----------
create policy "class_members_all_own_teacher" on class_members
  for all using (
    exists (select 1 from classes c where c.id = class_members.class_id and c.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from classes c where c.id = class_members.class_id and c.teacher_id = auth.uid())
  );

-- ---------- quizzes ----------
create policy "quizzes_all_own_teacher" on quizzes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ---------- quiz_questions (via parent quiz ownership) ----------
create policy "quiz_questions_all_own_teacher" on quiz_questions
  for all using (
    exists (select 1 from quizzes q where q.id = quiz_questions.quiz_id and q.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from quizzes q where q.id = quiz_questions.quiz_id and q.teacher_id = auth.uid())
  );

-- ---------- question_media ----------
create policy "question_media_all_own_teacher" on question_media
  for all using (
    exists (
      select 1 from quiz_questions qq
      join quizzes q on q.id = qq.quiz_id
      where qq.id = question_media.question_id and q.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from quiz_questions qq
      join quizzes q on q.id = qq.quiz_id
      where qq.id = question_media.question_id and q.teacher_id = auth.uid()
    )
  );

-- ---------- assignments ----------
create policy "assignments_all_own_teacher" on assignments
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ---------- assignment_students ----------
create policy "assignment_students_all_own_teacher" on assignment_students
  for all using (
    exists (select 1 from assignments a where a.id = assignment_students.assignment_id and a.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from assignments a where a.id = assignment_students.assignment_id and a.teacher_id = auth.uid())
  );

-- ---------- attempts (teacher: read-only monitoring of own assignments) ----------
create policy "attempts_select_own_teacher" on attempts
  for select using (
    exists (select 1 from assignments a where a.id = attempts.assignment_id and a.teacher_id = auth.uid())
  );

-- ---------- answers (teacher: read-only, e.g. manual grading view) ----------
create policy "answers_select_own_teacher" on answers
  for select using (
    exists (
      select 1 from attempts att
      join assignments a on a.id = att.assignment_id
      where att.id = answers.attempt_id and a.teacher_id = auth.uid()
    )
  );
-- Teachers may update manual-review fields (feedback / manual grade) only.
create policy "answers_update_manual_grade_own_teacher" on answers
  for update using (
    exists (
      select 1 from attempts att
      join assignments a on a.id = att.assignment_id
      where att.id = answers.attempt_id and a.teacher_id = auth.uid()
    )
  );

-- ---------- activity_events (teacher: read-only realtime monitoring) ----------
create policy "activity_events_select_own_teacher" on activity_events
  for select using (
    exists (
      select 1 from attempts att
      join assignments a on a.id = att.assignment_id
      where att.id = activity_events.attempt_id and a.teacher_id = auth.uid()
    )
  );

-- audit_logs: no policies -> nobody can access via anon/authenticated roles.
-- Only the service role (which bypasses RLS) reads/writes audit_logs.
