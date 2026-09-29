-- Enable Postgres Changes realtime for the tables the teacher monitor
-- dashboard subscribes to. (Realtime respects the RLS policies from
-- 0002_rls.sql for any client subscribing with the anon/authenticated key.)
alter publication supabase_realtime add table attempts;
alter publication supabase_realtime add table answers;
alter publication supabase_realtime add table activity_events;
