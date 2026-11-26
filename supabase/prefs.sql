-- تفضيلات الإشعارات: شغّل الملف ده في Supabase > SQL Editor
create table if not exists public.user_prefs (
  owner uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  notify text not null default 'push' check (notify in ('push','email','both')),
  updated_at timestamptz not null default now()
);
alter table public.user_prefs enable row level security;
drop policy if exists prefs_owner on public.user_prefs;
create policy prefs_owner on public.user_prefs for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update on public.user_prefs to authenticated;
grant select on public.user_prefs to service_role;
