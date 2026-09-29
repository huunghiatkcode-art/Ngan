# Database

Toàn bộ schema nằm ở `supabase/migrations/0001_init.sql` (bảng + index +
trigger), `0002_rls.sql` (Row Level Security) và `0003_realtime.sql` (bật
Realtime Postgres Changes cho 3 bảng teacher-monitor cần theo dõi).

## Bảng chính và quan hệ

```
profiles (giáo viên/admin, id = auth.users.id)
  └─< classes
        └─< class_members >─┐
students <──────────────────┘
  └─< assignment_students
quizzes
  └─< quiz_questions
        └─< question_media
assignments (quiz_id, class_id, teacher_id)
  └─< assignment_students
  └─< attempts (assignment_id, student_id)
        └─< answers (attempt_id, question_id)
        └─< activity_events (nguồn cho realtime monitor)
audit_logs (độc lập, chỉ service role đọc/ghi)
```

## Vì sao `answers` được pre-tạo khi bắt đầu attempt

`startAttempt()` insert sẵn 1 dòng `answers` rỗng cho mỗi câu hỏi (xem
`services/attempt.service.ts`). Nhờ vậy autosave luôn là một `UPDATE ...
WHERE attempt_id = ? AND question_id = ?` — không cần logic
insert-or-update, và tận dụng được unique constraint
`(attempt_id, question_id)` để tránh trùng lặp khi client gọi lại (idempotent
theo thiết kế, không cần bảng idempotency-key riêng).

## Index bắt buộc

Đã tạo đủ theo yêu cầu: `teacher_id`, `class_id`, `student_id`, `quiz_id`,
`assignment_id`, `attempt_id` (qua `question_id`/`attempt_id` trên
`answers`), `join_code`, `class_code`, `username` — xem `create index` trong
`0001_init.sql`.

## Khi cần đổi schema

Thêm file mới `supabase/migrations/000N_<mô_tả>.sql` — không sửa lại các
file migration đã áp dụng. Chạy bằng `supabase db push` hoặc dán vào SQL
Editor của Supabase Dashboard.
