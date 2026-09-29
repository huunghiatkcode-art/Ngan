import type { Metadata } from "next";
import "./globals.css";
import Toaster from "@/components/ui/Toaster";

export const metadata: Metadata = {
  title: { default: "Quiz Platform — Bài kiểm tra cho giáo viên và học sinh", template: "%s | Quiz Platform" },
  description: "Tạo bộ câu hỏi, giao bài cho lớp, theo dõi học sinh làm bài theo thời gian thực và xem báo cáo kết quả.",
  openGraph: { title: "Quiz Platform", description: "Nền tảng tạo và làm bài kiểm tra trực tuyến", type: "website", locale: "vi_VN" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
