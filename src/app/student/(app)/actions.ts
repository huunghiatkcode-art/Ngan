"use server";

import { redirect } from "next/navigation";
import { destroyStudentSession } from "@/lib/auth/student-session";

export async function logoutStudentAction() {
  await destroyStudentSession();
  redirect("/student/login");
}
