-- ============================================================
-- Quiz Platform — Initial schema
-- Run via: supabase db push  (or paste into Supabase SQL editor)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- updated_at trigger helper ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- PROFILES (teachers / admins — backed by Supabase Auth)
-- ============================================================
create type user_role as enum ('teacher', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'teacher',
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Giáo viên'), 'teacher');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- STUDENTS (independent lightweight auth — username + PIN)
-- ============================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  username text not null,
  student_code text not null,
  pin_hash text not null,
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (username),
  unique (teacher_id, student_code)
);
create index idx_students_teacher on students(teacher_id);
create index idx_students_username on students(username);
create trigger trg_students_updated_at before update on students
  for each row execute function set_updated_at();

-- ============================================================
-- CLASSES
-- ============================================================
create table classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  class_code text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_classes_teacher on classes(teacher_id);
create index idx_classes_code on classes(class_code);
create trigger trg_classes_updated_at before update on classes
  for each row execute function set_updated_at();

create table class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  unique (class_id, student_id)
);
create index idx_class_members_class on class_members(class_id);
create index idx_class_members_student on class_members(student_id);

-- ============================================================
-- QUIZZES (reusable question banks)
-- ============================================================
create type quiz_status as enum ('draft', 'published', 'archived');

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  cover_image text,
  status quiz_status not null default 'draft',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, slug)
);
create index idx_quizzes_teacher on quizzes(teacher_id);
create trigger trg_quizzes_updated_at before update on quizzes
  for each row execute function set_updated_at();

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  type text not null,
  order_index integer not null default 0,
  title text,
  content text not null default '',
  data jsonb not null default '{}'::jsonb,
  points integer not null default 100 check (points >= 0),
  time_limit integer,
  explanation text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_quiz_questions_quiz on quiz_questions(quiz_id, order_index);
create trigger trg_quiz_questions_updated_at before update on quiz_questions
  for each row execute function set_updated_at();

create table question_media (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image','audio','video')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_question_media_question on question_media(question_id);

-- ============================================================
-- ASSIGNMENTS (a delivery of a quiz to a class/students)
-- ============================================================
create type assignment_status as enum ('scheduled', 'open', 'closed');

create table assignments (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete restrict,
  teacher_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  class_id uuid references classes(id) on delete set null,
  start_at timestamptz,
  due_at timestamptz,
  join_code text not null unique,
  password_hash text,
  status assignment_status not null default 'open',
  settings jsonb not null default '{
    "time_limit_seconds": null,
    "attempts_allowed": 1,
    "randomize_questions": false,
    "randomize_answers": false,
    "allow_back_navigation": true,
    "show_result": true,
    "show_correct_answer": true,
    "show_leaderboard": false
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_assignments_teacher on assignments(teacher_id);
create index idx_assignments_class on assignments(class_id);
create index idx_assignments_join_code on assignments(join_code);
create trigger trg_assignments_updated_at before update on assignments
  for each row execute function set_updated_at();

create table assignment_students (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'assigned',
  assigned_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index idx_assignment_students_assignment on assignment_students(assignment_id);
create index idx_assignment_students_student on assignment_students(student_id);

-- ============================================================
-- ATTEMPTS (one student's run at an assignment)
-- ============================================================
create type attempt_status as enum ('not_started','in_progress','submitted','grading','graded','abandoned');

create table attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status attempt_status not null default 'in_progress',
  attempt_number integer not null default 1,
  question_order uuid[] not null default '{}',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric not null default 0,
  max_score numeric not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  unanswered_count integer not null default 0,
  completion_percent numeric not null default 0,
  time_spent integer not null default 0,
  current_question_index integer not null default 0,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id, attempt_number)
);
create index idx_attempts_assignment on attempts(assignment_id);
create index idx_attempts_student on attempts(student_id);
create trigger trg_attempts_updated_at before update on attempts
  for each row execute function set_updated_at();

-- ============================================================
-- ANSWERS
-- ============================================================
create table answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  question_id uuid not null references quiz_questions(id) on delete cascade,
  answer jsonb not null default '{}'::jsonb,
  is_answered boolean not null default false,
  is_correct boolean,
  points_earned numeric not null default 0,
  time_spent integer not null default 0,
  answered_at timestamptz,
  grading_status text not null default 'auto' check (grading_status in ('auto','manual_review','manual_graded')),
  teacher_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);
create index idx_answers_attempt on answers(attempt_id);
create index idx_answers_question on answers(question_id);
create trigger trg_answers_updated_at before update on answers
  for each row execute function set_updated_at();

-- ============================================================
-- ACTIVITY EVENTS (feeds the realtime teacher monitor)
-- ============================================================
create table activity_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_events_attempt on activity_events(attempt_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_actor on audit_logs(actor_id);
