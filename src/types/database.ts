// Hand-written types mirroring supabase/migrations/0001_init.sql.
// (If you prefer generated types later: `supabase gen types typescript`.)

export type UserRole = "teacher" | "admin";
export type QuizStatus = "draft" | "published" | "archived";
export type AssignmentStatus = "scheduled" | "open" | "closed";
export type AttemptStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "grading"
  | "graded"
  | "abandoned";
export type GradingStatus = "auto" | "manual_review" | "manual_graded";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  teacher_id: string;
  username: string;
  student_code: string;
  pin_hash: string;
  failed_login_count: number;
  locked_until: string | null;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  class_code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassMember {
  id: string;
  class_id: string;
  student_id: string;
  status: string;
  joined_at: string;
}

export interface Quiz {
  id: string;
  teacher_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  status: QuizStatus;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  type: string;
  order_index: number;
  title: string | null;
  content: string;
  data: Record<string, unknown>;
  points: number;
  time_limit: number | null;
  explanation: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSettings {
  time_limit_seconds: number | null;
  attempts_allowed: number;
  randomize_questions: boolean;
  randomize_answers: boolean;
  allow_back_navigation: boolean;
  show_result: boolean;
  show_correct_answer: boolean;
  show_leaderboard: boolean;
}

export interface Assignment {
  id: string;
  quiz_id: string;
  teacher_id: string;
  title: string;
  class_id: string | null;
  start_at: string | null;
  due_at: string | null;
  join_code: string;
  password_hash: string | null;
  status: AssignmentStatus;
  settings: AssignmentSettings;
  created_at: string;
  updated_at: string;
}

export interface AssignmentStudent {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  assigned_at: string;
}

export interface Attempt {
  id: string;
  assignment_id: string;
  student_id: string;
  status: AttemptStatus;
  attempt_number: number;
  question_order: string[];
  started_at: string;
  submitted_at: string | null;
  score: number;
  max_score: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  completion_percent: number;
  time_spent: number;
  current_question_index: number;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface AnswerRow {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: Record<string, unknown>;
  is_answered: boolean;
  is_correct: boolean | null;
  points_earned: number;
  time_spent: number;
  answered_at: string | null;
  grading_status: GradingStatus;
  teacher_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  attempt_id: string | null;
  student_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Minimal Database generic to satisfy @supabase/ssr's typed client.
export type Database = Record<string, unknown>;
