import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth/student";
import { getAttemptForStudent, ServiceException } from "@/services/attempt.service";
import QuizTakingClient from "./QuizTakingClient";

export default async function QuizTakingPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const student = await requireStudent();

  let view;
  try {
    view = await getAttemptForStudent(student.studentId, attemptId);
  } catch (e) {
    if (e instanceof ServiceException && e.code === "FORBIDDEN") notFound();
    if (e instanceof ServiceException && e.code === "ATTEMPT_NOT_FOUND") notFound();
    throw e;
  }

  if (view.attempt.status !== "in_progress") {
    redirect(`/student/result/${attemptId}`);
  }

  return <QuizTakingClient attemptId={attemptId} initial={view} />;
}
