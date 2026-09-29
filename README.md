# Quiz Platform

Nền tảng tạo bài kiểm tra trực tuyến cho giáo viên và học sinh — Next.js +
Supabase, chạy được miễn phí (Vercel Hobby + Supabase Free), phù hợp quy mô
1-vài lớp học (~30 học sinh/lớp).

**→ Hướng dẫn cài đặt & deploy chi tiết từng bước: [`docs/deployment.md`](docs/deployment.md).**

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
Supabase (Postgres + Auth + Realtime + Storage) · Zod · React Hook Form ·
dnd-kit · Recharts · Vitest · Playwright.

*(Component UI dùng Tailwind thuần, hand-rolled theo phong cách shadcn/ui,
thay vì cài `shadcn/ui` CLI — xem "Giới hạn hiện tại" bên dưới.)*

## Tính năng

**Giáo viên**: đăng ký/đăng nhập, tạo lớp + học sinh (thêm tay hoặc import
CSV), tạo bộ câu hỏi (9 loại câu hỏi, editor trực quan, autosave, kéo-thả sắp
xếp câu hỏi), giao bài (đặt mật khẩu, thời gian, số lần làm, random câu
hỏi/đáp án), theo dõi tiến độ học sinh **realtime**, xem báo cáo (điểm trung
bình, độ khó từng câu, breakdown từng học sinh), export CSV (UTF-8, mở được
bằng Excel).

**Học sinh**: đăng nhập username + PIN, nhập mã bài kiểm tra (+ mật khẩu nếu
có), làm bài với autosave (không mất đáp án khi reload/mất mạng), đồng hồ
đếm ngược server-authoritative, nộp bài, xem kết quả.

## Cài đặt nhanh (local)

```bash
npm install
cp .env.example .env.local   # rồi điền theo docs/deployment.md
npm run dev
```

Mở http://localhost:3000. Chi tiết đầy đủ (tạo Supabase project, chạy
migration, seed dữ liệu mẫu, deploy Vercel): **[`docs/deployment.md`](docs/deployment.md)**.

## Các lệnh

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # chạy bản build production
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit (strict mode)
npm run test        # unit test (Vitest) — KHÔNG cần Supabase, chạy offline
npm run test:e2e    # Playwright E2E — CẦN Supabase sống + seed data
```

## Biến môi trường (`.env.example`)

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project URL, an toàn để lộ ra client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key, an toàn để lộ ra client (bị giới hạn bởi RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **CHỈ dùng server-side** — không bao giờ thêm tiền tố `NEXT_PUBLIC_` |
| `STUDENT_SESSION_SECRET` | ✅ | Chuỗi ngẫu nhiên ≥32 byte ký JWT phiên học sinh — `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | URL gốc của app (local hoặc domain Vercel) |

## Đã kiểm tra trong quá trình phát triển

- `npm install` ✅
- `npm run lint` ✅ (0 lỗi)
- `npm run typecheck` ✅ (TypeScript strict, 0 lỗi)
- `npm run test` ✅ (121/121 test pass). Gồm unit test (chấm điểm 9 loại câu
  hỏi, validation, xáo trộn ổn định, lỗi đăng nhập) và **integration test chạy
  trên Postgres thật (PGlite)**: chạy đủ 6 migration + seed, RLS (giáo viên A
  không đọc/sửa được dữ liệu giáo viên B, anon không đọc được gì), luồng
  vào bài → lưu đáp án → nộp → chấm điểm, khóa đăng nhập học sinh sau 5 lần sai.
- `npm run build` ✅ (build production thành công, đủ 25 route, **không cần
  biến môi trường Supabase thật lúc build** — mọi truy cập DB chỉ xảy ra lúc
  runtime)
- `npm run test:e2e` — **chưa chạy được trong môi trường phát triển** vì cần
  một Supabase project sống + đăng ký tài khoản demo thật (xem
  `docs/deployment.md` Bước 5). Test đã được viết đầy đủ, hãy tự chạy sau
  khi hoàn tất setup.

## Tài liệu

- [`docs/architecture.md`](docs/architecture.md) — sơ đồ tổng thể, vì sao
  học sinh không dùng Supabase Auth
- [`docs/database.md`](docs/database.md) — schema, quan hệ giữa các bảng
- [`docs/question-engine.md`](docs/question-engine.md) — cách chấm điểm
  hoạt động, cách thêm 1 loại câu hỏi mới
- [`docs/realtime.md`](docs/realtime.md) — cơ chế Postgres Changes, vì sao
  không polling
- [`docs/security.md`](docs/security.md) — bảng threat model, cách từng
  nguy cơ được chặn
- [`docs/deployment.md`](docs/deployment.md) — **cài đặt & deploy miễn phí,
  từng bước**

## Giới hạn hiện tại (thành thật, không che giấu)

- **9/14 loại câu hỏi** đã triển khai đầy đủ (Multiple Choice, Multi-select,
  True/False, Fill-blank, Open-ended, Reorder, Match, Categorize,
  Drag-and-drop). 5 loại còn lại (Passage, Table, Dropdown, Hot Text, Match
  Table) là điểm mở rộng đã được tài liệu hoá chi tiết ở
  `docs/question-engine.md` — kiến trúc hỗ trợ sẵn, chỉ cần lặp lại đúng 9
  bước đã ghi, không cần sửa phần lõi.
- **Chưa tích hợp Supabase Storage** cho media (ảnh/audio/video) trong câu
  hỏi — bảng `question_media` đã có trong schema nhưng chưa có UI upload.
  9 loại câu hỏi hiện tại không bắt buộc media nên không chặn luồng chính.
- **UI dùng Tailwind thuần** thay vì `shadcn/ui` CLI thật (do giới hạn thời
  gian phát triển) — về mặt hình thức tương tự nhưng không phải cùng
  codebase gốc của shadcn.
- **Chưa có rate-limiting** ở tầng ứng dụng cho đăng nhập học sinh/giáo
  viên — nên bật ở tầng edge (Vercel/Cloudflare) trước khi dùng thật với
  nhiều lớp học sinh lạ có thể đoán PIN.
- **E2E test (Playwright) chưa được chạy thực tế** trong môi trường phát
  triển (sandbox không có quyền truy cập mạng tới Supabase) — đã viết đầy
  đủ, cần bạn tự chạy sau khi có Supabase project + seed data thật.
- Admin role (mục 63 trong yêu cầu gốc) chưa có UI riêng — `user_role` đã hỗ
  trợ giá trị `admin` trong schema, nhưng chưa có trang quản trị.
