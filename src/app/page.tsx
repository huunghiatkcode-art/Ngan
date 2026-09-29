import Link from "next/link";
import { ClipboardList, Radio, BarChart3, ShieldCheck, Layers, KeyRound } from "lucide-react";

const features = [
  { icon: ClipboardList, title: "Tạo bộ câu hỏi", desc: "Soạn nhiều loại câu hỏi, sắp xếp, nhân bản và xem trước ngay." },
  { icon: Layers, title: "Nhiều loại câu hỏi", desc: "Trắc nghiệm, chọn nhiều, đúng/sai, điền trống, tự luận, sắp xếp, ghép đôi, phân loại, kéo thả." },
  { icon: Radio, title: "Theo dõi realtime", desc: "Xem học sinh đang ở câu nào, đã nộp chưa, online hay offline." },
  { icon: BarChart3, title: "Báo cáo kết quả", desc: "Điểm trung bình, độ khó từng câu, xuất CSV mở được bằng Excel." },
  { icon: KeyRound, title: "Mật khẩu bài kiểm tra", desc: "Mỗi bài có mã tham gia và mật khẩu riêng do giáo viên đặt." },
  { icon: ShieldCheck, title: "Chấm điểm phía máy chủ", desc: "Đáp án đúng không bao giờ được gửi xuống trình duyệt học sinh." },
];

export default function Home() {
  return (
    <div>
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <span className="font-bold text-lg text-[var(--color-primary)]">Quiz Platform</span>
        <nav className="flex gap-2 text-sm">
          <Link href="/student/login" className="btn btn-secondary">Học sinh</Link>
          <Link href="/login" className="btn btn-primary">Giáo viên</Link>
        </nav>
      </header>
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Quiz Platform cho giáo viên và học sinh</h1>
        <p className="mt-4 text-[var(--muted)] text-lg">Tạo bài kiểm tra, giao cho lớp và theo dõi tiến độ làm bài ngay khi học sinh đang làm.</p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link href="/register" className="btn btn-primary">Tạo tài khoản giáo viên</Link>
          <Link href="/student/login" className="btn btn-secondary">Tham gia bài kiểm tra</Link>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-4 pb-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card p-5">
            <Icon className="text-[var(--color-primary)] mb-3" size={22} />
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-[var(--muted)] mt-1">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
