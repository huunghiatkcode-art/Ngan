import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySecret } from "@/lib/auth/hash";
import type { Student } from "@/types/database";

export type StudentLoginResult =
  | { ok: true; student: Student }
  | { ok: false; reason: "not_found" | "disabled" | "wrong_pin" | "locked" };

// bcrypt hash of a random string. Compared against when the username does not
// exist so that "unknown user" and "wrong PIN" take the same time (no username enumeration by timing).
const DUMMY_HASH = "$2b$10$4Ou2Rd1zQ5WGqjU6CoPK4.K9hdzsb10ronHd.QBVaYBIOrJ.UOR2i";

/**
 * Verifies student username+PIN. Runs with the SERVICE ROLE client because
 * the caller has no Supabase Auth session yet — RLS would otherwise block
 * reading any student row at all.
 *
 * After 5 wrong PINs the account is locked for 15 minutes (see migration
 * 0006). While locked, even the correct PIN is refused.
 */
export async function verifyStudentLogin(username: string, pin: string): Promise<StudentLoginResult> {
  const admin = createAdminClient();
  const { data: student, error } = await admin
    .from("students")
    .select("*")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (error || !student) {
    await verifySecret(pin, DUMMY_HASH).catch(() => false);
    return { ok: false, reason: "not_found" };
  }
  if (!student.is_active) return { ok: false, reason: "disabled" };

  if (student.locked_until && new Date(student.locked_until).getTime() > Date.now()) {
    return { ok: false, reason: "locked" };
  }

  const valid = await verifySecret(pin, student.pin_hash);
  if (!valid) {
    await admin.rpc("record_student_login_failure", { p_id: student.id });
    return { ok: false, reason: "wrong_pin" };
  }

  if (student.failed_login_count > 0 || student.locked_until) {
    await admin.from("students").update({ failed_login_count: 0, locked_until: null }).eq("id", student.id);
  }
  return { ok: true, student: { ...student, failed_login_count: 0, locked_until: null } as Student };
}
