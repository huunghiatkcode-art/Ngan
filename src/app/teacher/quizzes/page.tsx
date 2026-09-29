import Link from "next/link";
import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as QuizService from "@/services/quiz.service";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { FileQuestion } from "lucide-react";
import NewQuizForm from "./NewQuizForm";
import QuizCardActions from "./QuizCardActions";

export default async function QuizzesPage() {
  const teacher = await requireTeacher();
  const supabase = await createServerSupabase();
  const quizzes = await QuizService.listQuizzes(supabase, teacher.id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bộ câu hỏi</h1>
        <NewQuizForm />
      </div>

      {quizzes.length === 0 ? (
        <EmptyState icon={<FileQuestion size={30} />} title="Chưa có bộ câu hỏi nào" description="Tạo bộ câu hỏi đầu tiên để bắt đầu." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quizzes.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/teacher/quizzes/${q.id}`} className="min-w-0">
                  <p className="font-semibold truncate hover:underline">{q.title}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">{q.quiz_questions?.[0]?.count ?? 0} câu hỏi</p>
                </Link>
                <Badge tone={q.status === "published" ? "success" : "neutral"}>{q.status === "published" ? "Đã publish" : "Nháp"}</Badge>
              </div>
              <QuizCardActions quizId={q.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
