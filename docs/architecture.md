# Kiến trúc tổng thể

```
Browser (giáo viên)              Browser (học sinh)
       │                                │
       │ Supabase Auth session         │ Signed JWT cookie
       │ (cookie, RLS-scoped)          │ (qp_student_session, HS256)
       ▼                                ▼
              Next.js App (App Router)
   ┌───────────────────────────────────────────────┐
   │ middleware.ts — chặn /teacher/* và /student/*  │
   │ theo đúng loại phiên đăng nhập                 │
   ├───────────────────────────────────────────────┤
   │ Server Components (đọc dữ liệu, RSC)           │
   │ Server Actions (ghi dữ liệu, "use server")     │
   ├───────────────────────────────────────────────┤
   │ Service layer (services/*.service.ts)          │
   │  - KHÔNG business logic nào nằm trong component │
   ├───────────────────────────────────────────────┤
   │ Question Engine (lib/question-engine/*)        │
   │  - factory / validation(Zod) / grading /        │
   │    publicize(ẩn đáp án) / shuffle(seeded)       │
   └───────────────────────────────────────────────┘
                        │
                        ▼
                   Supabase
        ┌─────────────┬─────────────┬─────────────┐
        │ PostgreSQL  │ Auth        │ Realtime    │
        │ (RLS)       │ (giáo viên) │ (Postgres   │
        │             │             │  Changes)   │
        └─────────────┴─────────────┴─────────────┘
```

## Vì sao học sinh KHÔNG dùng Supabase Auth

Supabase Auth được thiết kế quanh email/password hoặc OAuth. Yêu cầu của hệ
thống là "học sinh đăng nhập bằng username + PIN, giáo viên tạo tài khoản
trước" — không khớp tốt với luồng đăng ký tự phục vụ của Supabase Auth.

Quyết định kiến trúc: học sinh có phiên đăng nhập riêng, là một JWT
(ký bằng `STUDENT_SESSION_SECRET`, thư viện `jose`) lưu trong cookie
`httpOnly`. Vì Postgres/RLS không biết gì về phiên này, **học sinh không
bao giờ gọi thẳng Supabase từ trình duyệt** — mọi đọc/ghi của học sinh đi
qua Next.js Server Action, dùng Supabase **service role** (bypass RLS) sau
khi Server Action tự kiểm tra lại quyền trong TypeScript
(`requireStudent()` + so khớp `student_id` thủ công trong mỗi hàm service).

Ngược lại, giáo viên là Supabase Auth user thật, nên mọi bảng do giáo viên
sở hữu được bảo vệ bằng RLS thật dựa trên `auth.uid()` — kể cả khi subscribe
Realtime thẳng từ trình duyệt (xem `docs/realtime.md`).

## Vì sao Quiz và Assignment tách rời

`quizzes`/`quiz_questions` là ngân hàng câu hỏi tái sử dụng được. `assignments`
là **một lần giao** một quiz cho một lớp/nhóm học sinh, với cấu hình riêng
(thời gian, mật khẩu, số lần làm...). Giao cùng 1 quiz cho 2 lớp khác nhau
tạo ra 2 `assignments` trỏ về CÙNG 1 `quiz_id` — không copy câu hỏi.

## Question Engine — 1 kiến trúc dùng chung cho mọi loại câu hỏi

Xem chi tiết tại `docs/question-engine.md`. Tóm tắt: mỗi loại câu hỏi là một
nhánh của discriminated union `QuestionData`/`AnswerPayload`, có 1 hàm
`grade()` tương ứng trong `lib/question-engine/grading.ts` — không có 9 (hay
14) hệ thống chấm điểm riêng biệt.
