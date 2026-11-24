-- كلمة في سرك: شغّل الملف ده كله في Supabase > SQL Editor
create extension if not exists pgcrypto;

create table public.links (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code text not null unique default lower(substr(translate(encode(gen_random_bytes(9),'base64'),'+/=','xyz'),1,10)),
  name text not null check (char_length(name) between 1 and 40),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.messages (link_id, created_at desc);

alter table public.links enable row level security;
alter table public.messages enable row level security;

create policy links_owner on public.links for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy msg_select on public.messages for select to authenticated
  using (exists (select 1 from public.links l where l.id = link_id and l.owner = auth.uid()));
create policy msg_update on public.messages for update to authenticated
  using (exists (select 1 from public.links l where l.id = link_id and l.owner = auth.uid()))
  with check (exists (select 1 from public.links l where l.id = link_id and l.owner = auth.uid()));
create policy msg_delete on public.messages for delete to authenticated
  using (exists (select 1 from public.links l where l.id = link_id and l.owner = auth.uid()));
-- مفيش سياسة insert: الزائر مايكتبش إلا من خلال الدالة send_message

revoke all on public.links, public.messages from anon;
revoke insert, update on public.messages from authenticated;
grant select, insert, update, delete on public.links to authenticated;
grant select, delete on public.messages to authenticated;
grant update (read) on public.messages to authenticated;

create function public.link_status(p_code text) returns boolean
language sql security definer set search_path = public stable as
$$ select active from public.links where code = p_code $$;

create function public.send_message(p_code text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare v_link public.links%rowtype; v_body text := btrim(p_body);
begin
  select * into v_link from public.links where code = p_code;
  if not found or not v_link.active then raise exception 'not_found'; end if;
  if v_body is null or char_length(v_body) < 1 or char_length(v_body) > 1000 then raise exception 'invalid'; end if;
  if (select count(*) from public.messages where link_id = v_link.id and created_at > now() - interval '1 hour') >= 30
    then raise exception 'rate_limited'; end if;
  insert into public.messages (link_id, body) values (v_link.id, v_body);
end $$;

revoke all on function public.link_status(text), public.send_message(text, text) from public;
grant execute on function public.link_status(text), public.send_message(text, text) to anon, authenticated;
