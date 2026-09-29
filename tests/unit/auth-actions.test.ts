import { describe, it, expect, vi, beforeEach } from "vitest";

const signInWithPassword = vi.fn();
const createUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: async () => ({ auth: { signInWithPassword, signOut: vi.fn() } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ auth: { admin: { createUser } } }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); },
}));

import { loginTeacherAction, registerTeacherAction } from "@/app/(auth)/actions";
import { mapAuthError, safeNextPath } from "@/lib/auth/auth-errors";

const fd = (o: Record<string, string>) => { const f = new FormData(); Object.entries(o).forEach(([k, v]) => f.set(k, v)); return f; };
const init = { ok: true } as const;

beforeEach(() => { vi.clearAllMocks(); delete process.env.TEACHER_SIGNUP_CODE; });

describe("mapAuthError", () => {
  it("does not hide 'email not confirmed' behind a generic wrong-password message", () => {
    expect(mapAuthError({ code: "email_not_confirmed", message: "Email not confirmed" })).toMatch(/chưa được xác nhận/);
  });
  it("wrong credentials", () => expect(mapAuthError({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe("Email hoặc mật khẩu không đúng."));
  it("rejected fake domains", () => expect(mapAuthError({ code: "email_address_invalid", message: 'Email address "a@example.com" is invalid' })).toMatch(/email thật/));
  it("duplicates, weak password, rate limit", () => {
    expect(mapAuthError({ code: "email_exists" })).toMatch(/đã được đăng ký/);
    expect(mapAuthError({ code: "weak_password" })).toMatch(/quá yếu/);
    expect(mapAuthError({ status: 429 })).toMatch(/quá nhanh/);
  });
  it("unknown errors surface the real message", () => expect(mapAuthError({ message: "boom" })).toContain("boom"));
});

describe("safeNextPath", () => {
  it("allows teacher paths only", () => {
    expect(safeNextPath("/teacher/quizzes")).toBe("/teacher/quizzes");
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil", "/student/dashboard", "", null, undefined]) expect(safeNextPath(bad as string)).toBe("/teacher/dashboard");
  });
});

describe("loginTeacherAction", () => {
  it("redirects to the dashboard on success", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await expect(loginTeacherAction(init, fd({ email: "T@School.VN", password: "secret1" }))).rejects.toThrow("NEXT_REDIRECT:/teacher/dashboard");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "t@school.vn", password: "secret1" });
  });
  it("honours a safe ?next", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await expect(loginTeacherAction(init, fd({ email: "t@school.vn", password: "x", next: "/teacher/quizzes" }))).rejects.toThrow("NEXT_REDIRECT:/teacher/quizzes");
  });
  it("shows the REAL reason when the email is unconfirmed", async () => {
    signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed", message: "Email not confirmed" } });
    const r = await loginTeacherAction(init, fd({ email: "t@school.vn", password: "secret1" }));
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/chưa được xác nhận/) });
  });
  it("validates input before calling Supabase", async () => {
    const r = await loginTeacherAction(init, fd({ email: "not-an-email", password: "x" }));
    expect(r.ok).toBe(false);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("registerTeacherAction", () => {
  const valid = { fullName: "Cô Lan", email: "lan@gmail.com", password: "abcdef" };
  it("creates a pre-confirmed user via the admin API, signs in and redirects", async () => {
    createUser.mockResolvedValue({ error: null });
    signInWithPassword.mockResolvedValue({ error: null });
    await expect(registerTeacherAction(init, fd(valid))).rejects.toThrow("NEXT_REDIRECT:/teacher/dashboard");
    expect(createUser).toHaveBeenCalledWith({ email: "lan@gmail.com", password: "abcdef", email_confirm: true, user_metadata: { full_name: "Cô Lan" } });
    expect(signInWithPassword).toHaveBeenCalled();
  });
  it("reports a rejected e-mail domain clearly and does not try to sign in", async () => {
    createUser.mockResolvedValue({ error: { code: "email_address_invalid", message: 'Email address "a@example.com" is invalid' } });
    const r = await registerTeacherAction(init, fd({ ...valid, email: "a@example.com" }));
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/email thật/) });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
  it("reports duplicate accounts", async () => {
    createUser.mockResolvedValue({ error: { code: "email_exists", message: "exists" } });
    expect(await registerTeacherAction(init, fd(valid))).toEqual({ ok: false, error: expect.stringMatching(/đã được đăng ký/) });
  });
  it("enforces TEACHER_SIGNUP_CODE when configured", async () => {
    process.env.TEACHER_SIGNUP_CODE = "lop10";
    expect(await registerTeacherAction(init, fd(valid))).toEqual({ ok: false, error: expect.stringMatching(/Mã đăng ký/) });
    expect(await registerTeacherAction(init, fd({ ...valid, signupCode: "sai" }))).toMatchObject({ ok: false });
    expect(createUser).not.toHaveBeenCalled();
    createUser.mockResolvedValue({ error: null });
    signInWithPassword.mockResolvedValue({ error: null });
    await expect(registerTeacherAction(init, fd({ ...valid, signupCode: "lop10" }))).rejects.toThrow("NEXT_REDIRECT");
  });
  it("rejects short passwords without hitting Supabase", async () => {
    expect((await registerTeacherAction(init, fd({ ...valid, password: "123" }))).ok).toBe(false);
    expect(createUser).not.toHaveBeenCalled();
  });
});
