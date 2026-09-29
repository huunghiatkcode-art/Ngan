import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as ClassService from "@/services/class.service";
import Card from "@/components/ui/Card";
import StudentRow from "./StudentRow";
import AddStudentForm from "./AddStudentForm";
import BulkImportForm from "./BulkImportForm";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireTeacher();
  const supabase = await createServerSupabase();
  let data;
  try {
    data = await ClassService.getClassWithStudents(supabase, id);
  } catch {
    notFound();
  }
  const { class: klass, members } = data!;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{klass.name}</h1>
        <p className="text-sm text-[var(--muted)]">Mã lớp để học sinh biết mình thuộc lớp nào: <code className="font-mono">{klass.class_code}</code></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AddStudentForm classId={klass.id} />
        <BulkImportForm classId={klass.id} />
      </div>

      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-3">Học sinh ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Lớp chưa có học sinh.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {members.map((m) => (
              <StudentRow key={m.id} classId={klass.id} student={m.students} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
