import Link from "next/link";
import { requireStudent } from "@/lib/auth/student";
import { listAssignmentsForStudent } from "@/services/attempt.service";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { ClipboardList, LogIn } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "primary" | "success" | "warning" }> = {
  not_started: { label: "Chưa làm", tone: "neutral" },
  in_progress: { label: "Đang làm dở", tone: "warning" },
  submitted: { label: "Đã nộp", tone: "primary" },
  grading: { label: "Đang chờ chấm", tone: "warning" },
  graded: { label: "Đã có điểm", tone: "success" },
  abandoned: { label: "Đã huỷ", tone: "neutral" },
};

export default async function StudentDashboard() {
  const student = await requireStudent();
  const assignments = await listAssignmentsForStudent(student.studentId);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Xin chào, {student.fullName}</h1>
          <p className="text-sm text-[var(--muted)]">Danh sách bài kiểm tra được giao cho bạn.</p>
        </div>
        <Link href="/student/join" className="btn btn-primary"><LogIn size={14} /> Nhập mã bài kiểm tra</Link>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={30} />}
          title="Chưa có bài kiểm tra nào"
          description="Nhập mã bài kiểm tra do giáo viên cung cấp để bắt đầu."
          action={<Link href="/student/join" className="btn btn-primary">Nhập mã bài kiểm tra</Link>}
        />
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const status = a.latestAttempt ? STATUS_LABEL[a.latestAttempt.status] : STATUS_LABEL.not_started;
            const canResume = a.latestAttempt?.status === "in_progress";
            const canViewResult = a.latestAttempt && ["graded", "grading", "submitted"].includes(a.latestAttempt.status);
            return (
              <Card key={a.assignmentId} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.title}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{a.quizTitle}</p>
                  {a.dueAt && <p className="text-xs text-[var(--muted)] mt-0.5">Hạn nộp: {new Date(a.dueAt).toLocaleString("vi-VN")}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  {canResume && <Link href={`/student/quiz/${a.latestAttempt!.id}`} className="btn btn-primary text-xs">Tiếp tục làm bài</Link>}
                  {canViewResult && !canResume && <Link href={`/student/result/${a.latestAttempt!.id}`} className="btn btn-secondary text-xs">Xem kết quả</Link>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
