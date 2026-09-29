# Security

## Threat model tóm tắt và cách hệ thống chặn từng loại

| Nguy cơ | Cách chặn |
|---|---|
| IDOR (đổi id trên URL để xem dữ liệu người khác) | RLS cho giáo viên (`auth.uid()`); Server Action tự so khớp `student_id`/`teacher_id` thủ công cho học sinh |
| Lộ đáp án đúng cho học sinh | `toPublicQuestion()` là điểm nghẽn DUY NHẤT giữa `QuestionData` và client học sinh (xem `docs/question-engine.md`) |
| Client tự chấm điểm / gửi `score` giả | `answerPayloadSchema` (Zod) không có field điểm; `gradeAnswer()` chỉ chạy server-side với dữ liệu tải lại từ DB |
| Lộ `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` có `import "server-only"` — build sẽ LỖI nếu file này vô tình bị import từ Client Component |
| Đăng nhập học sinh brute-force PIN | PIN hash bằng `bcryptjs` (10 rounds); nên thêm rate-limit ở tầng Vercel/Cloudflare cho production thật (xem "Giới hạn còn lại") |
| Session cookie giả mạo | JWT ký HS256 bằng `STUDENT_SESSION_SECRET`, `jwtVerify()` từ chối token hết hạn/sai chữ ký, không tin bất kỳ payload nào chưa qua verify |
| Mật khẩu bài kiểm tra bị lộ | `assignments.password_hash` hash bằng bcrypt, không bao giờ trả về client, so sánh bằng `verifySecret()` server-side |
| SQL injection | Không có raw SQL string nào ghép từ input người dùng — toàn bộ qua Supabase query builder (`supabase-js`), tham số hoá tự động |
| XSS trong nội dung câu hỏi | Nội dung câu hỏi render dưới dạng text thuần (`whitespace-pre-wrap`), không dùng `dangerouslySetInnerHTML` |
| 2 tab cùng nộp bài / double submit | `finalizeAttempt()` kiểm tra `status !== "in_progress"` trước khi tính điểm — gọi lần 2 là no-op, trả lại attempt đã chấm |

## 2 client Supabase, 2 mức tin cậy

- `lib/supabase/server.ts` — dùng cookie phiên giáo viên, **tôn trọng RLS**.
  Dùng cho MỌI thao tác giáo viên.
- `lib/supabase/admin.ts` — service role, **bỏ qua RLS hoàn toàn**. Chỉ dùng
  trong `services/attempt.service.ts` và `services/student-auth.service.ts`
  (vì học sinh không có `auth.uid()` để RLS dựa vào) — và mọi hàm ở đó tự
  kiểm tra quyền thủ công trước khi chạm database.

## Giới hạn bảo mật còn lại (thành thật, không che giấu)

- **Chưa có rate limiting** cho `/student/login` và join-by-code — nên thêm
  ở tầng edge (Vercel WAF/Cloudflare) trước khi dùng cho lớp học thật có
  nhiều học sinh.
- **CSRF**: Server Actions của Next.js đã có bảo vệ Origin-check tích hợp
  sẵn từ framework; không cần thêm CSRF token thủ công.
- Chưa có 2FA cho giáo viên (Supabase Auth hỗ trợ sẵn nếu cần bật sau).
