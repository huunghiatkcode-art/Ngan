import Link from "next/link";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as AssignmentService from "@/services/assignment.service";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { Send, Plus } from "lucide-react";

const STATUS_TONE = { scheduled: "neutral", open: "success", closed: "neutral" } as const;
const STATUS_LABEL = { scheduled: "Đã lên lịch", open: "Đang mở", closed: "Đã đóng" } as const;

export default async function AssignmentsPage() {
  const teacher = await requireTeacher();
  const supabase = await createServerSupabase();
  const assignments = await AssignmentService.listAssignments(supabase, teacher.id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bài kiểm tra</h1>
        <Link href="/teacher/assignments/new" className="btn btn-primary"><Plus size={14} /> Giao bài mới</Link>
      </div>

      {assignments.length === 0 ? (
        <EmptyState icon={<Send size={30} />} title="Chưa giao bài kiểm tra nào" description="Chọn một bộ câu hỏi và giao cho lớp học để bắt đầu." />
      ) : (
        <div className="space-y-3">
          {(assignments as any[]).map((a) => (
            <Link key={a.id} href={`/teacher/assignments/${a.id}`}>
              <Card className="p-4 flex items-center justify-between hover:border-[var(--color-primary)] transition-colors">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.title}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {a.quizzes?.title} {a.classes?.name && `· ${a.classes.name}`} · Mã: <code className="font-mono">{a.join_code}</code>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[var(--muted)]">{a.attempts?.[0]?.count ?? 0} lượt làm</span>
                  <Badge tone={STATUS_TONE[a.status as keyof typeof STATUS_TONE]}>{STATUS_LABEL[a.status as keyof typeof STATUS_LABEL]}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
