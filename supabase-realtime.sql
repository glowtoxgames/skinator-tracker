-- Run once in the Supabase SQL Editor for the Skinator Tracker project.
-- This enables instant cross-user updates; the app keeps a low-frequency
-- visible-tab fallback if a Realtime connection is temporarily unavailable.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'skinator_records'
  ) then
    alter publication supabase_realtime add table public.skinator_records;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'skinator_planner'
  ) then
    alter publication supabase_realtime add table public.skinator_planner;
  end if;
end
$$;

-- Include complete old rows in UPDATE/DELETE events so targeted client-side
-- synchronization remains reliable even if the table keys change later.
alter table public.skinator_records replica identity full;
alter table public.skinator_planner replica identity full;
