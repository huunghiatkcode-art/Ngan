import Link from "next/link";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as AssignmentService from "@/services/assignment.service";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";

export default async function ReportsIndexPage() {
  const teacher = await requireTeacher();
  const supabase = await createServerSupabase();
  const assignments = await AssignmentService.listAssignments(supabase, teacher.id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Báo cáo</h1>
        <p className="text-sm text-[var(--muted)]">Chọn một bài kiểm tra để xem báo cáo chi tiết.</p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState icon={<BarChart3 size={30} />} title="Chưa có bài kiểm tra nào" />
      ) : (
        <div className="space-y-3">
          {(assignments as unknown as { id: string; title: string; quizzes?: { title: string }; classes?: { name: string }; attempts?: { count: number }[] }[]).map((a) => (
            <Link key={a.id} href={`/teacher/assignments/${a.id}/reports`}>
              <Card className="p-4 flex items-center justify-between hover:border-[var(--color-primary)] transition-colors">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {a.quizzes?.title} {a.classes?.name && `· ${a.classes.name}`}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)]">{a.attempts?.[0]?.count ?? 0} lượt làm →</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
