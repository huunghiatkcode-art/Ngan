"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileQuestion, Send, BarChart3 } from "lucide-react";

const items = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/classes", label: "Lớp học", icon: Users },
  { href: "/teacher/quizzes", label: "Bộ câu hỏi", icon: FileQuestion },
  { href: "/teacher/assignments", label: "Bài kiểm tra", icon: Send },
  { href: "/teacher/reports", label: "Báo cáo", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 h-full border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-[var(--border)] font-semibold">Quiz Platform</div>
      <nav className="flex-1 p-2 space-y-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${active ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--text)]"}`}>
              <Icon size={17} /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
