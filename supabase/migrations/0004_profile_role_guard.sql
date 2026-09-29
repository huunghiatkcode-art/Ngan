-- SECURITY FIX (found by tests/integration/database.test.ts):
-- The profiles UPDATE policy lets a user update their own row, which included
-- the `role` column — so any teacher could run
--     update profiles set role = 'admin' where id = auth.uid();
-- This trigger blocks role changes made by signed-in users. Changes made
-- without a user JWT (Supabase SQL Editor, service role) are still allowed,
-- which is how you promote someone to admin on purpose.
create or replace function prevent_role_escalation()
returns trigger as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Không được phép thay đổi vai trò tài khoản.' using errcode = '42501';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_role_guard on profiles;
create trigger trg_profiles_role_guard
  before update on profiles
  for each row execute function prevent_role_escalation();
