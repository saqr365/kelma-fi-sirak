-- إشعارات كلمة في سرك: شغّل الملف ده في Supabase > SQL Editor
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy push_owner on public.push_subscriptions for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, delete on public.push_subscriptions to service_role;
grant select on public.links to service_role;
