import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import fs from "node:fs";
import path from "node:path";

export const readSql = (f: string) => fs.readFileSync(path.join(import.meta.dirname, "../../supabase", f), "utf8");

// Minimal stand-in for what Supabase provides before our migrations run.
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    instance_id uuid, id uuid primary key, aud text, role text, email text unique, encrypted_password text,
    email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
    created_at timestamptz, updated_at timestamptz,
    confirmation_token text, recovery_token text, email_change_token_new text, email_change text
  );
  create table auth.identities (
    id uuid primary key, user_id uuid references auth.users(id) on delete cascade, provider_id text,
    identity_data jsonb, provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create publication supabase_realtime;
  -- Supabase grants new tables/functions to these roles by default (RLS and
  -- explicit REVOKEs in the migrations are what actually restrict access).
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;
export const MIGRATIONS = [
  "migrations/0001_init.sql",
  "migrations/0002_rls.sql",
  "migrations/0003_realtime.sql",
  "migrations/0004_profile_role_guard.sql",
  "migrations/0005_attempt_integrity.sql",
  "migrations/0006_student_login_lockout.sql",
];

/** Fresh in-process Postgres with every migration applied (and optionally the seed). */
export async function createTestDb({ seed = true } = {}) {
  // numeric -> JS number, like PostgREST returns it
  const db = new PGlite({ extensions: { pgcrypto }, parsers: { 1700: (v: string) => parseFloat(v) } });
  await db.exec(SUPABASE_STUBS);
  for (const m of MIGRATIONS) await db.exec(readSql(m));
  if (seed) await db.exec(readSql("seed.sql"));
  return db;
}
