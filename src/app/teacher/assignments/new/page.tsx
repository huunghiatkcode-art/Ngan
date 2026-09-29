import { requireTeacher } from "@/lib/auth/teacher";
import { createServerSupabase } from "@/lib/supabase/server";
import * as QuizService from "@/services/quiz.service";
import * as ClassService from "@/services/class.service";
import AssignmentForm from "./AssignmentForm";

export default async function NewAssignmentPage({ searchParams }: { searchParams: Promise<{ quizId?: string }> }) {
  const { quizId } = await searchParams;
  const teacher = await requireTeacher();
  const supabase = await createServerSupabase();
  const [quizzes, classes] = await Promise.all([
    QuizService.listQuizzes(supabase, teacher.id),
    ClassService.listClasses(supabase, teacher.id),
  ]);

  return (
    <AssignmentForm
      quizzes={quizzes.map((q) => ({ id: q.id, title: q.title }))}
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      defaultQuizId={quizId}
    />
  );
}
