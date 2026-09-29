import "server-only";
import { redirect } from "next/navigation";
import { getStudentSession, type StudentSessionPayload } from "./student-session";

export async function requireStudent(): Promise<StudentSessionPayload> {
  const session = await getStudentSession();
  if (!session) redirect("/student/login");
  return session;
}
