-- BRUTE-FORCE PROTECTION for student PINs (4 digits = only 10,000 guesses).
-- After 5 wrong PINs the account is locked for 15 minutes. The counter is
-- updated atomically inside the database (row lock) so parallel guesses
-- cannot slip past the limit.
alter table students
  add column if not exists failed_login_count int not null default 0,
  add column if not exists locked_until timestamptz;

create or replace function record_student_login_failure(
  p_id uuid, p_max int default 5, p_lock_minutes int default 15
) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_locked timestamptz;
begin
  select failed_login_count, locked_until into v_count, v_locked
    from students where id = p_id for update;
  if not found then return null; end if;

  -- a previous lock has expired: start counting again
  if v_locked is not null and v_locked <= now() then
    v_count := 0;
    v_locked := null;
  end if;

  v_count := v_count + 1;
  if v_count >= p_max then
    v_locked := now() + make_interval(mins => p_lock_minutes);
  end if;

  update students set failed_login_count = v_count, locked_until = v_locked where id = p_id;
  return v_locked;
end;
$$;

-- Only the server (service role) may call this — never the public API.
revoke all on function record_student_login_failure(uuid, int, int) from public, anon, authenticated;
grant execute on function record_student_login_failure(uuid, int, int) to service_role;
