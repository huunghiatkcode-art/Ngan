import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as AssignmentService from "@/services/assignment.service";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Radio, BarChart3, Users, Copy } from "lucide-react";
import { setAssignmentStatusAction, deleteAssignmentAction } from "../actions";
import CopyButton from "./CopyButton";

const STATUS_TONE = { scheduled: "neutral", open: "success", closed: "neutral" } as const;
const STATUS_LABEL = { scheduled: "Đã lên lịch", open: "Đang mở", closed: "Đã đóng" } as const;

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTeacher();
  const supabase = await createServerSupabase();

  let assignment;
  try {
    assignment = await AssignmentService.getAssignment(supabase, id);
  } catch {
    notFound();
  }
  const { roster, attempts } = await AssignmentService.getRosterProgress(supabase, id);

  const joined = roster.length;
  const started = attempts.filter((a) => a.status !== "not_started").length;
  const submitted = attempts.filter((a) => ["submitted", "grading", "graded"].includes(a.status)).length;
  const avgScore = attempts.length
    ? Math.round((attempts.reduce((s, a) => s + Number(a.score), 0) / attempts.length) * 10) / 10
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{assignment.title}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {assignment.quizzes?.title} {assignment.classes?.name && `· Lớp ${assignment.classes.name}`}
          </p>
        </div>
        <Badge tone={STATUS_TONE[assignment.status as keyof typeof STATUS_TONE]}>
          {STATUS_LABEL[assignment.status as keyof typeof STATUS_LABEL]}
        </Badge>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--muted)]">Mã tham gia (join code)</p>
          <p className="text-2xl font-mono font-bold tracking-widest">{assignment.join_code}</p>
        </div>
        <CopyButton text={assignment.join_code} />
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Đã tham gia", value: joined },
          { label: "Đã bắt đầu", value: started },
          { label: "Đã nộp bài", value: submitted },
          { label: "Điểm TB", value: avgScore },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Link href={`/teacher/assignments/${id}/monitor`} className="btn btn-secondary flex-1 justify-center">
          <Radio size={14} /> Theo dõi realtime
        </Link>
        <Link href={`/teacher/assignments/${id}/reports`} className="btn btn-secondary flex-1 justify-center">
          <BarChart3 size={14} /> Xem báo cáo
        </Link>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Users size={15} /> Danh sách học sinh được giao ({roster.length})
        </h2>
        {roster.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Chưa có học sinh nào trong danh sách.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {roster.map((r) => {
              const att = attempts.find((a) => a.student_id === r.student_id);
              return (
                <div key={r.student_id} className="py-2 flex items-center justify-between text-sm">
                  <span>
                    {(r as unknown as { students: { full_name: string } }).students?.full_name} 
                    <span className="text-[var(--muted)]"> · {(r as unknown as { students: { student_code: string } }).students?.student_code}</span>
                  </span>
                  <Badge tone={!att || att.status === "not_started" ? "neutral" : att.status === "in_progress" ? "warning" : "success"}>
                    {!att || att.status === "not_started" ? "Chưa làm" : att.status === "in_progress" ? "Đang làm" : "Đã nộp"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">Trạng thái bài kiểm tra</p>
          <p className="text-xs text-[var(--muted)]">Đóng bài sẽ ngăn học sinh bắt đầu lượt làm mới.</p>
        </div>
        <form action={async () => {
          "use server";
          await setAssignmentStatusAction(id, assignment.status === "closed" ? "open" : "closed");
        }}>
          <button className="btn btn-secondary" type="submit">
            {assignment.status === "closed" ? "Mở lại" : "Đóng bài"}
          </button>
        </form>
      </Card>

      <Card className="p-4 flex items-center justify-between border-red-200">
        <div>
          <p className="font-medium text-sm text-[var(--color-danger)]">Xóa bài kiểm tra</p>
          <p className="text-xs text-[var(--muted)]">Toàn bộ lượt làm bài liên quan sẽ bị xóa vĩnh viễn.</p>
        </div>
        <ConfirmButton onConfirm={async () => { "use server"; await deleteAssignmentAction(id); }}>
          Xóa
        </ConfirmButton>
      </Card>
    </div>
  );
}
