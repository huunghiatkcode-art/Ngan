import Link from "next/link";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as ClassService from "@/services/class.service";
import { Users, Plus } from "lucide-react";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import NewClassForm from "./NewClassForm";

export default async function ClassesPage() {
  const teacher = await requireTeacher();
  const supabase = await createServerSupabase();
  const classes = await ClassService.listClasses(supabase, teacher.id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Lớp học</h1>
        <NewClassForm />
      </div>

      {classes.length === 0 ? (
        <EmptyState icon={<Users size={30} />} title="Chưa có lớp học nào" description="Tạo lớp đầu tiên để bắt đầu thêm học sinh." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classes.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`}>
              <Card className="p-4 hover:border-[var(--color-primary)] transition-colors">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-[var(--muted)] mt-1">Mã lớp: <code className="font-mono">{c.class_code}</code></p>
                <p className="text-sm text-[var(--muted)] mt-2">{c.class_members?.[0]?.count ?? 0} học sinh</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
