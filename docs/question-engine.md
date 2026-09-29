# Question Engine

## Trạng thái hiện tại: 9/14 loại đã triển khai đầy đủ

Đã có full-stack (editor + student renderer + validate + grade + shuffle
seed) cho: **Multiple Choice, Multi-select, True/False, Fill in the Blank,
Open-ended, Reorder, Match, Categorize, Drag-and-Drop**.

**5 loại chưa triển khai**: Passage, Table, Dropdown, Hot Text, Match Table.
Đây là quyết định phạm vi có chủ đích (không phải placeholder che giấu) —
kiến trúc đã sẵn sàng mở rộng, các bước dưới đây là tất cả những gì cần làm
để thêm 1 loại mới, không cần sửa bất kỳ phần nào khác của hệ thống.

## Các "điểm chạm" bắt buộc khi thêm 1 loại câu hỏi mới

Lấy ví dụ thêm `dropdown`:

1. **`src/types/question.ts`** — thêm `"dropdown"` vào `QuestionType`, định
   nghĩa `DropdownData` (teacher, có đáp án đúng), thêm nhánh tương ứng vào
   `PublicQuestionData` (KHÔNG chứa đáp án đúng) và `AnswerPayload`.
2. **`src/lib/question-engine/factory.ts`** — case `dropdown` trả về dữ liệu
   mặc định khi tạo câu hỏi mới.
3. **`src/lib/question-engine/validation.ts`** — thêm nhánh Zod tương ứng
   vào `questionDataSchema` và `answerPayloadSchema`.
4. **`src/lib/question-engine/publicize.ts`** — case `dropdown` trong
   `toPublicQuestionData()`: trả về dữ liệu KHÔNG có đáp án đúng.
5. **`src/lib/question-engine/grading.ts`** — case `dropdown` trong
   `gradeAnswer()`: logic chấm điểm server-side.
6. **`src/components/questions/editors/DropdownEditor.tsx`** — UI giáo viên
   soạn câu hỏi.
7. **`src/components/questions/renderers/DropdownRenderer.tsx`** — UI học
   sinh làm bài, nhận `PublicQuestionData`, trả về `AnswerPayload` qua
   `onChange`.
8. **`src/components/questions/registry.tsx`** — đăng ký icon + Editor.
9. **`src/components/quiz/QuestionPlayer.tsx`** — thêm case `dropdown` vào
   switch renderer + `emptyAnswerFor()`.

Sau bước 9, toàn bộ phần còn lại của hệ thống (Quiz Builder, Quiz Taking,
Autosave, Scoring, Report) tự động hỗ trợ loại câu hỏi mới — không có bảng
riêng, không có API riêng.

## Ranh giới bảo mật quan trọng nhất: `QuestionData` vs `PublicQuestionData`

`QuestionData` (teacher-side, có đáp án đúng) và `PublicQuestionData`
(student-side, KHÔNG có đáp án đúng) là hai type khác nhau một cách cố ý.
`toPublicQuestion()` trong `publicize.ts` là **hàm DUY NHẤT** được phép biến
cái này thành cái kia. Không có Server Action nào trong `src/app/student/`
được phép trả thẳng một `QuestionData` hay một hàng `quiz_questions` thô về
client — luôn phải đi qua `toPublicQuestion()`.

## Chấm điểm luôn ở server

`gradeAnswer()` chỉ được gọi trong `services/attempt.service.ts`, sau khi
tải lại `QuestionData` (có đáp án đúng) từ database bằng service-role
client. Client không bao giờ gửi `score`/`isCorrect`/`pointsEarned` —
`answerPayloadSchema` (Zod) chỉ chấp nhận đúng field của `AnswerPayload`,
field lạ bị loại bỏ khi `safeParse`.
