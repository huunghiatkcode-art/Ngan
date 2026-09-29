import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as AssignmentService from "@/services/assignment.service";
import * as ReportService from "@/services/report.service";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";
import QuestionAccuracyChart from "./QuestionAccuracyChart";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTeacher();
  const supabase = await createServerSupabase();

  let assignment;
  try {
    assignment = await AssignmentService.getAssignment(supabase, id);
  } catch {
    notFound();
  }
  const report = await ReportService.getAssignmentReport(supabase, id);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <Link href={`/teacher/assignments/${id}`} className="text-sm text-[var(--muted)] flex items-center gap-1 hover:text-[var(--text)]">
        <ArrowLeft size={14} /> Quay lại
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Báo cáo — {assignment.title}</h1>
          <p className="text-sm text-[var(--muted)]">{report.attemptsCount} lượt làm bài</p>
        </div>
        <a href={`/teacher/assignments/${id}/reports/export`} className="btn btn-secondary">
          <Download size={14} /> Xuất CSV
        </a>
      </div>

      {report.attemptsCount === 0 ? (
        <EmptyState icon={<BarChart3 size={30} />} title="Chưa có dữ liệu" description="Chưa có học sinh nào nộp bài." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Trung bình", value: report.averageScore },
              { label: "Cao nhất", value: report.highestScore },
              { label: "Thấp nhất", value: report.lowestScore },
              { label: "Trung vị", value: report.medianScore },
              { label: "Hoàn thành", value: `${report.completionRate}%` },
            ].map((s) => (
              <Card key={s.label} className="p-3 text-center">
                <p className="text-2xl font-semibold">{s.value}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <h2 className="font-semibold text-sm mb-3">Độ chính xác theo từng câu</h2>
            <QuestionAccuracyChart data={report.questionStats} />
          </Card>

          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.03] text-left text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-2 font-medium">Học sinh</th>
                  <th className="px-4 py-2 font-medium">Trạng thái</th>
                  <th className="px-4 py-2 font-medium">Điểm</th>
                  <th className="px-4 py-2 font-medium">Đúng/Sai/Bỏ trống</th>
                  <th className="px-4 py-2 font-medium">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {report.studentRows.map((r) => (
                  <tr key={r.studentId}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{r.fullName}</p>
                      <p className="text-xs text-[var(--muted)]">{r.studentCode}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted)]">{r.status}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {r.score}/{r.maxScore} <span className="text-[var(--muted)] font-normal">({r.percent}%)</span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted)]">
                      {r.correct} / {r.wrong} / {r.unanswered}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted)]">{Math.round(r.timeSpent / 60)} phút</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
