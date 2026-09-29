import { requireStudent } from "@/lib/auth/student";
import StudentTopbar from "@/components/student/Topbar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const student = await requireStudent();
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <StudentTopbar student={student} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
