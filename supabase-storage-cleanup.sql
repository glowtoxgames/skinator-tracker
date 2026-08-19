-- Run once in the Supabase SQL Editor for the Skinator Tracker project.
-- The app deletes objects through the Storage API; never delete rows directly
-- from storage.objects because doing so can leave the actual files orphaned.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Skinator team can read tracker assets'
  ) then
    create policy "Skinator team can read tracker assets"
      on storage.objects for select
      to authenticated
      using (
        bucket_id = 'skinator-assets'
        and exists (
          select 1
          from public.skinator_team_members member
          where member.user_id = (select auth.uid())
            and member.role in ('owner', 'editor')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Skinator editors can delete tracker assets'
  ) then
    create policy "Skinator editors can delete tracker assets"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'skinator-assets'
        and exists (
          select 1
          from public.skinator_team_members member
          where member.user_id = (select auth.uid())
            and member.role in ('owner', 'editor')
        )
      );
  end if;
end
$$;
