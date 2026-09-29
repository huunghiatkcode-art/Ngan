import { requireTeacher } from "@/lib/auth/teacher";
import Sidebar from "@/components/teacher/Sidebar";
import Topbar from "@/components/teacher/Topbar";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();
  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar teacher={teacher} />
        <main className="flex-1 min-h-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
