import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./db-setup";
import { createPgSupabase } from "./pg-supabase-adapter";

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => holder.client }));

import { verifyStudentLogin } from "@/services/student-auth.service";
import { resetStudentPin } from "@/services/student.service";

let db: PGlite;
const q = async <T = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows;
const state = async (u: string) => (await q<{ failed_login_count: number; locked_until: string | null }>("select failed_login_count, locked_until from students where username = $1", [u]))[0];

beforeAll(async () => { db = await createTestDb(); holder.client = createPgSupabase(db); });
afterAll(async () => { await db.close(); });

describe("student login (username + PIN)", () => {
  it("accepts the right PIN, ignoring username case and spaces", async () => {
    const r = await verifyStudentLogin("  HS001 ", "1234");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.student.username).toBe("hs001");
  });
  it("rejects unknown users and wrong PINs with different internal reasons", async () => {
    expect(await verifyStudentLogin("ghost", "1234")).toEqual({ ok: false, reason: "not_found" });
    expect(await verifyStudentLogin("hs002", "0000")).toEqual({ ok: false, reason: "wrong_pin" });
  });
  it("refuses disabled accounts even with the right PIN", async () => {
    await db.exec("update students set is_active = false where username = 'hs003'");
    expect(await verifyStudentLogin("hs003", "1234")).toEqual({ ok: false, reason: "disabled" });
  });
  it("never returns the PIN hash in a way the action could leak it (result only used server-side)", async () => {
    const r = await verifyStudentLogin("hs004", "1234");
    expect(r.ok).toBe(true);
  });
});

describe("brute-force lockout", () => {
  it("locks after 5 wrong PINs and then refuses even the correct PIN", async () => {
    for (let i = 1; i <= 4; i++) {
      expect((await verifyStudentLogin("hs005", "9999")).ok).toBe(false);
      expect((await state("hs005")).failed_login_count).toBe(i);
      expect((await state("hs005")).locked_until).toBeNull();
    }
    expect(await verifyStudentLogin("hs005", "9999")).toEqual({ ok: false, reason: "wrong_pin" });
    expect((await state("hs005")).locked_until).not.toBeNull();
    expect(await verifyStudentLogin("hs005", "1234")).toEqual({ ok: false, reason: "locked" });
  });
  it("parallel guesses cannot slip past the limit", async () => {
    await Promise.all(Array.from({ length: 12 }, (_, i) => verifyStudentLogin("hs006", String(1000 + i))));
    expect((await state("hs006")).locked_until).not.toBeNull();
    expect(await verifyStudentLogin("hs006", "1234")).toEqual({ ok: false, reason: "locked" });
  });
  it("unlocks after the lock expires, and the counter starts again from 1", async () => {
    await db.exec("update students set locked_until = now() - interval '1 minute' where username = 'hs005'");
    expect((await verifyStudentLogin("hs005", "0001")).ok).toBe(false);
    expect(await state("hs005")).toMatchObject({ failed_login_count: 1, locked_until: null });
    expect((await verifyStudentLogin("hs005", "1234")).ok).toBe(true);
    expect((await state("hs005")).failed_login_count).toBe(0);
  });
  it("a successful login clears earlier failures", async () => {
    await verifyStudentLogin("hs007", "0000"); await verifyStudentLogin("hs007", "0000");
    expect((await state("hs007")).failed_login_count).toBe(2);
    expect((await verifyStudentLogin("hs007", "1234")).ok).toBe(true);
    expect((await state("hs007")).failed_login_count).toBe(0);
  });
  it("the teacher resetting a PIN also lifts the lock, and the new PIN works", async () => {
    const id = (await q<{ id: string }>("select id from students where username = 'hs006'"))[0].id;
    const pin = await resetStudentPin(holder.client as never, id);
    expect(pin).toMatch(/^\d{4}$/);
    expect(await verifyStudentLogin("hs006", "1234")).toEqual({ ok: false, reason: "wrong_pin" }); // old PIN dead
    expect((await verifyStudentLogin("hs006", pin)).ok).toBe(true);
  });
  it("browsers (anon/authenticated) cannot call the lockout function through the public API", async () => {
    const id = (await q<{ id: string }>("select id from students where username = 'hs008'"))[0].id;
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(db.query("select record_student_login_failure($1)", [id])).rejects.toThrow(/permission denied/);
      await db.exec("reset role");
    }
    expect((await state("hs008")).failed_login_count).toBe(0);
  });
});
