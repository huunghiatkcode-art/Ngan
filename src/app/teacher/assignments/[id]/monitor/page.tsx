import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as AssignmentService from "@/services/assignment.service";
import MonitorClient, { type RosterRow } from "./MonitorClient";

export default async function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <Link href={`/teacher/assignments/${id}`} className="text-sm text-[var(--muted)] flex items-center gap-1 hover:text-[var(--text)]">
        <ArrowLeft size={14} /> Quay lại
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Theo dõi realtime — {assignment.title}</h1>
        <p className="text-sm text-[var(--muted)]">Cập nhật tự động khi học sinh tham gia, trả lời hoặc nộp bài.</p>
      </div>
      <MonitorClient
        assignmentId={id}
        initialRoster={roster as unknown as RosterRow[]}
        initialAttempts={attempts}
      />
    </div>
  );
}
