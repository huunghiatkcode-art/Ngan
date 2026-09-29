-- DATA INTEGRITY (found by tests/integration/attempt-flow.test.ts):
-- Two browser tabs (or a double click) could each pass the "no attempt yet"
-- check and insert an attempt, giving a student two live attempts.
-- This partial unique index makes the DATABASE guarantee at most one
-- in-progress attempt per student per assignment; the service catches the
-- unique violation and resumes the existing attempt.
-- (unique (assignment_id, student_id, attempt_number) already exists in 0001.)
create unique index if not exists uq_attempts_one_in_progress
  on attempts (assignment_id, student_id)
  where status = 'in_progress';
