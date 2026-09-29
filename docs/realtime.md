# Realtime

## Cơ chế: Postgres Changes, không polling

`MonitorClient.tsx` (trang `/teacher/assignments/[id]/monitor`) mở 1 kênh
Supabase Realtime, subscribe `postgres_changes` trên bảng `attempts` lọc
theo `assignment_id=eq.<id>`. Mỗi lần học sinh trả lời/nộp bài, service layer
`UPDATE` dòng `attempts` tương ứng → Postgres phát sự kiện → mọi giáo viên
đang mở trang monitor của assignment đó nhận được cập nhật tức thì, không
cần reload, không cần setInterval gọi API.

```ts
supabase
  .channel(`assignment-monitor-${assignmentId}`)
  .on("postgres_changes", { event: "*", schema: "public", table: "attempts",
       filter: `assignment_id=eq.${assignmentId}` }, handler)
  .subscribe();
```

## Vì sao việc này an toàn dù browser giáo viên gọi thẳng Supabase

Kênh Realtime dùng client Supabase phía trình duyệt (`anon` key), và Realtime
**tôn trọng RLS**: policy `attempts_select_own_teacher` (xem `0002_rls.sql`)
chỉ cho phép giáo viên đọc các `attempts` thuộc `assignment` của chính họ.
Một giáo viên không thể subscribe để xem attempt của lớp giáo viên khác, kể
cả khi họ tự sửa `assignmentId` trong URL.

## Sự kiện `activity_events`

Ngoài việc theo dõi trực tiếp bảng `attempts`, mỗi hành động quan trọng
(`STUDENT_STARTED`, `STUDENT_ANSWERED`, `STUDENT_SUBMITTED`) còn được ghi vào
`activity_events` — bảng này cũng đã bật Realtime, dùng khi cần xây thêm một
luồng hoạt động dạng feed/log (hiện tại UI mới dùng bảng `attempts` là đủ
cho màn hình giám sát, `activity_events` là điểm mở rộng sẵn có).

## Online/offline của học sinh

Không có "presence channel" riêng — thay vào đó, `QuizTakingClient.tsx` gửi
`heartbeatAction()` mỗi 15 giây (cập nhật `attempts.last_seen_at`).
`MonitorClient.tsx` coi một học sinh là online nếu `last_seen_at` trong vòng
30 giây gần nhất, và tự re-render mỗi 10 giây để nhãn online/offline luôn
đúng ngay cả khi không có sự kiện Postgres Changes mới nào tới (ví dụ học
sinh mất mạng đột ngột — không còn heartbeat, nhưng UI vẫn phải kịp chuyển
sang "Offline" sau 30s).
