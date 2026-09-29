# Deployment — miễn phí, phù hợp 1 lớp ~30 học sinh

## Tại sao gói Free/Hobby là đủ cho quy mô này

- **Vercel Hobby ($0)**: dành cho dự án cá nhân/phi thương mại — đúng với
  mục đích ở đây. Giới hạn băng thông/build minutes của Hobby dư sức cho
  vài chục người dùng đồng thời.
- **Supabase Free**: 500 MB database, 50.000 monthly active users, 1 GB file
  storage, 5 GB egress, 2 triệu Realtime messages/tháng, tối đa ~200 kết nối
  Realtime đồng thời. Với 1 lớp 30 học sinh + 1 giáo viên làm bài cùng lúc,
  bạn dùng chưa tới 35 kết nối Realtime (chỉ giáo viên mở trang Monitor mới
  giữ kết nối Realtime; học sinh làm bài không cần Realtime) — rất xa giới
  hạn.
- **Lưu ý duy nhất**: Supabase Free tự **pause project sau 7 ngày không có
  hoạt động**. Nếu nghỉ hè/nghỉ lễ dài, vào Dashboard bấm "Resume project"
  (mất khoảng 1-2 phút, không mất dữ liệu).

## Bước 1 — Tạo Supabase project

1. Vào https://supabase.com → **New project** → chọn region gần Việt Nam
   nhất (Singapore) → đặt mật khẩu database (lưu lại, dùng khi cần
   `psql` trực tiếp).
2. Đợi project khởi tạo xong (~2 phút).
3. Vào **Project Settings → API**, ghi lại:
   - `Project URL` → sẽ dùng làm `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (bấm "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`
     **TUYỆT ĐỐI không dán key này vào bất kỳ biến `NEXT_PUBLIC_*` nào.**

## Bước 2 — Chạy migration

Cách đơn giản nhất, không cần cài Supabase CLI: vào **SQL Editor** trong
Supabase Dashboard, dán và chạy lần lượt theo đúng thứ tự:

1. `supabase/migrations/0001_init.sql` — bảng, index, trigger
2. `supabase/migrations/0002_rls.sql` — Row Level Security
3. `supabase/migrations/0003_realtime.sql` — bật realtime cho trang Monitor
4. `supabase/migrations/0004_profile_role_guard.sql` — chặn giáo viên tự nâng quyền admin
5. `supabase/migrations/0005_attempt_integrity.sql` — chống nộp bài trùng
6. `supabase/migrations/0006_student_login_lockout.sql` — khóa đăng nhập học sinh khi đoán PIN sai

**Phải chạy đủ cả 6 file.** Thiếu 0006 thì đăng nhập học sinh sẽ báo lỗi.

(Nếu quen dùng Supabase CLI: `supabase link --project-ref <ref>` rồi
`supabase db push` sẽ áp dụng đủ 6 file theo đúng thứ tự tên file.)

### Tắt xác nhận email (khuyến nghị cho lớp học)
Supabase → **Authentication → Sign In / Providers → Email** → tắt
**Confirm email**. Trang `/register` của dự án đã tạo tài khoản đã xác nhận
sẵn nên không cần, nhưng tắt thì tài khoản tạo từ Dashboard cũng đăng nhập
được ngay.

## Bước 3 — Cấu hình môi trường local

```bash
cp .env.example .env.local
```

Điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` vừa lấy ở Bước 1.

Sinh `STUDENT_SESSION_SECRET` (một chuỗi ngẫu nhiên dài, KHÔNG dùng lại giá
trị ví dụ):

```bash
openssl rand -base64 32
```

`NEXT_PUBLIC_SITE_URL` để `http://localhost:3000` khi chạy local.

## Bước 4 — Cài đặt & chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000.

## Bước 5 — Tài khoản demo + dữ liệu mẫu (tuỳ chọn)

**Không dùng email dạng `example.com`/`test@test.com` khi đăng ký qua Supabase**:
Supabase từ chối các tên miền giả. Có 2 cách để có tài khoản thử nghiệm:

**Cách A — chạy seed (nhanh nhất).** Dán toàn bộ `supabase/seed.sql` vào SQL
Editor rồi Run. Seed tự tạo giáo viên demo:

| | |
|---|---|
| Email | `demo.teacher@quizplatform.test` |
| Mật khẩu | `Demo@12345` |

cùng 2 lớp, 10 học sinh (`hs001`..`hs010`, PIN `1234`), 3 bộ câu hỏi và bài
giao mã tham gia **`DEMO01`**. Chỉ chạy **một lần**.

**Cách B — đăng ký ở `/register`** bằng email thật (Gmail...). Nếu bạn đặt
`TEACHER_SIGNUP_CODE` trong env thì phải nhập đúng mã đó ở ô "Mã đăng ký".

### Mật khẩu nằm ở đâu? (đừng tìm trong bảng `public`)
Mật khẩu giáo viên **không** nằm trong bảng của dự án. Supabase Auth giữ ở
`auth.users.encrypted_password` (đã băm bcrypt, không đọc ngược được). Để
xem tài khoản: Dashboard → **Authentication → Users**. Bảng `profiles` chỉ
có tên/vai trò. Mật khẩu học sinh (PIN) nằm ở `students.pin_hash`, cũng đã
băm. Quên mật khẩu giáo viên: Authentication → Users → ⋯ → Send password
recovery, hoặc đặt lại trực tiếp bằng cách xóa user rồi đăng ký lại.

### Nếu đăng nhập báo lỗi
Trang đăng nhập giờ hiện đúng nguyên nhân: sai mật khẩu, email chưa xác nhận,
email bị Supabase từ chối, sai `SUPABASE_URL`/key, hay bị giới hạn tốc độ.

## Bước 6 — Deploy lên Vercel (miễn phí)

1. Đẩy code lên GitHub (repo có thể để **private**, Vercel Hobby vẫn deploy
   được từ repo private của tài khoản cá nhân).
2. Vào https://vercel.com/new → **Import** repo vừa đẩy.
3. Ở bước cấu hình project, mở **Environment Variables**, thêm đúng 4 biến
   như trong `.env.local` của bạn — **NEXT_PUBLIC_SITE_URL đổi thành domain
   Vercel sẽ cấp** (dạng `https://ten-du-an.vercel.app`, bạn có thể điền sau
   khi deploy lần đầu rồi redeploy).
4. Bấm **Deploy**. Vercel tự chạy `npm run build` — nếu bạn đã làm đúng Bước
   3-4 ở local, bước này sẽ pass (đã được xác nhận build thành công trong
   quá trình phát triển, xem README mục "Đã kiểm tra").
5. Sau khi có domain, vào **Project Settings → Environment Variables**, sửa
   lại `NEXT_PUBLIC_SITE_URL` cho đúng domain thật, rồi **Redeploy**.

## Bước 7 — Kiểm tra production

- Vào domain Vercel → `/register` tạo giáo viên thật bằng email thật (hoặc
  dùng tài khoản demo nếu bạn đã seed; nhớ đổi/xóa tài khoản demo trước khi dùng thật).
- Test toàn bộ luồng: tạo lớp → thêm học sinh → tạo quiz → tạo assignment →
  đăng nhập bằng tài khoản học sinh (trình duyệt ẩn danh khác) → làm bài →
  quay lại tab giáo viên xem trang Monitor cập nhật realtime.

## Custom domain (tuỳ chọn, vẫn miễn phí)

Vercel Hobby cho gắn domain riêng miễn phí (bạn tự mua domain ở nơi khác,
DNS trỏ về Vercel theo hướng dẫn trong Project Settings → Domains).

## Giới hạn cần biết khi dùng lâu dài

- Nếu vượt 50.000 MAU hoặc 500 MB database (rất khó xảy ra với vài lớp học),
  cần nâng cấp Supabase lên gói Pro trả phí.
- Vercel Hobby giới hạn số lần build/tháng và không cho mục đích thương mại
  — đúng như bạn đã nêu, dự án này là cá nhân/phi thương mại nên hợp lệ.
- Media (ảnh/audio/video câu hỏi) dùng Supabase Storage — gói Free có 1GB,
  đủ cho vài chục câu hỏi có hình ảnh/audio ngắn; video dài nên tránh hoặc
  nén nhỏ.
