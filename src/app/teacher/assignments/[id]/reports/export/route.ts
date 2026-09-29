import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as AssignmentService from "@/services/assignment.service";
import * as ReportService from "@/services/report.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const supabase = await createServerSupabase();

  // getAssignment is RLS-scoped to the caller's own teacher_id, so this also
  // acts as the authorization check — a teacher can never export someone
  // else's assignment report even by guessing the id.
  try {
    await AssignmentService.getAssignment(supabase, id);
  } catch {
    return NextResponse.json({ error: "Không tìm thấy bài kiểm tra." }, { status: 404 });
  }

  const report = await ReportService.getAssignmentReport(supabase, id);
  const csv = ReportService.reportToCsv(report);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bao-cao-${id.slice(0, 8)}.csv"`,
      "Cache-Control": "no-store",
      "X-Exported-By": teacher.id,
    },
  });
}
