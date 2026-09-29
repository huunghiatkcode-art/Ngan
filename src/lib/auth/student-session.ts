import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/supabase/env";

const COOKIE_NAME = "qp_student_session";
const ALG = "HS256";

function secretKey() {
  return new TextEncoder().encode(requireEnv("STUDENT_SESSION_SECRET"));
}

export interface StudentSessionPayload {
  studentId: string;
  teacherId: string;
  username: string;
  fullName: string;
}

export async function createStudentSession(payload: StudentSessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h, matches JWT exp
  });
}

export async function getStudentSession(): Promise<StudentSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const { studentId, teacherId, username, fullName } = payload as Record<string, unknown>;
    if (
      typeof studentId !== "string" ||
      typeof teacherId !== "string" ||
      typeof username !== "string" ||
      typeof fullName !== "string"
    ) {
      return null;
    }
    return { studentId, teacherId, username, fullName };
  } catch {
    return null; // expired / tampered / missing — never trust it
  }
}

export async function destroyStudentSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME as STUDENT_SESSION_COOKIE };
