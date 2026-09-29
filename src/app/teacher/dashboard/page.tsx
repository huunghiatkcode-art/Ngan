import Link from "next/link";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import { Users, FileQuestion, Send, Plus } from "lucide-react";
import Card from "@/components/ui/Card";

export default async function TeacherDashboard() {
  const teacher = await requireTeacher();
  const supabase = await createServerSupabase();

  const [{ count: classCount }, { count: quizCount }, { data: assignments }] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("teacher_id", teacher.id),
    supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("teacher_id", teacher.id),
    supabase
      .from("assignments")
      .select("id, title, status, due_at, quizzes(title)")
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const openCount = (assignments ?? []).filter((a) => a.status === "open").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/teacher/quizzes" className="btn btn-secondary"><Plus size={14} /> Tạo quiz</Link>
          <Link href="/teacher/classes" className="btn btn-secondary"><Plus size={14} /> Tạo lớp</Link>
          <Link href="/teacher/assignments/new" className="btn btn-primary"><Send size={14} /> Giao bài</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <Users className="text-[var(--color-primary)] mb-2" size={20} />
          <p className="text-2xl font-semibold">{classCount ?? 0}</p>
          <p className="text-sm text-[var(--muted)]">Lớp học</p>
        </Card>
        <Card className="p-4">
          <FileQuestion className="text-[var(--color-primary)] mb-2" size={20} />
          <p className="text-2xl font-semibold">{quizCount ?? 0}</p>
          <p className="text-sm text-[var(--muted)]">Bộ câu hỏi</p>
        </Card>
        <Card className="p-4">
          <Send className="text-[var(--color-primary)] mb-2" size={20} />
          <p className="text-2xl font-semibold">{openCount}</p>
          <p className="text-sm text-[var(--muted)]">Bài đang mở</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-3">Bài kiểm tra gần đây</h2>
        {!assignments?.length ? (
          <p className="text-sm text-[var(--muted)]">Chưa có bài kiểm tra nào.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {assignments.map((a) => (
              <Link key={a.id} href={`/teacher/assignments/${a.id}`} className="flex items-center justify-between py-2.5 text-sm hover:bg-black/[0.02] -mx-2 px-2 rounded-lg">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-[var(--muted)]">{(a.quizzes as unknown as { title: string } | null)?.title}</p>
                </div>
                <span className={`badge ${a.status === "open" ? "bg-green-100 text-green-700" : "bg-black/5"}`}>{a.status}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
