import Link from "next/link";
import { LogOut, LayoutDashboard, User } from "lucide-react";
import { logoutStudentAction } from "@/app/student/(app)/actions";
import type { StudentSessionPayload } from "@/lib/auth/student-session";

export default function StudentTopbar({ student }: { student: StudentSessionPayload }) {
  return (
    <header className="h-14 shrink-0 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-4">
      <Link href="/student/dashboard" className="flex items-center gap-2 font-semibold text-sm">
        <LayoutDashboard size={16} className="text-[var(--color-primary)]" /> Quiz Platform
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--muted)] flex items-center gap-1.5">
          <User size={14} /> {student.fullName}
        </span>
        <form action={logoutStudentAction}>
          <button className="btn btn-secondary text-xs" type="submit"><LogOut size={13} /> Đăng xuất</button>
        </form>
      </div>
    </header>
  );
}
