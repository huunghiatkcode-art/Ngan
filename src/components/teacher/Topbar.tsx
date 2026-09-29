import { logoutTeacherAction } from "@/app/(auth)/actions";
import type { Profile } from "@/types/database";
import { LogOut } from "lucide-react";

export default function Topbar({ teacher }: { teacher: Profile }) {
  return (
    <header className="h-14 shrink-0 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-4">
      <span className="text-sm text-[var(--muted)]">Xin chào, <strong className="text-[var(--text)]">{teacher.full_name}</strong></span>
      <form action={logoutTeacherAction}>
        <button className="btn btn-secondary text-xs" type="submit"><LogOut size={13} /> Đăng xuất</button>
      </form>
    </header>
  );
}
