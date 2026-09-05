-- Run this once in Supabase: Dashboard → SQL Editor → New query → Run.
-- It creates one private JSON workspace per signed-in user.

create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_workspaces enable row level security;

drop policy if exists "Users can read their own workspace" on public.user_workspaces;
create policy "Users can read their own workspace"
  on public.user_workspaces for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own workspace" on public.user_workspaces;
create policy "Users can create their own workspace"
  on public.user_workspaces for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workspace" on public.user_workspaces;
create policy "Users can update their own workspace"
  on public.user_workspaces for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Share links store a snapshot of one item. Recipients only need the unguessable
-- link ID; the RPC below returns that one snapshot without exposing the table.
create table if not exists public.shared_items (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('note', 'pdf', 'deck', 'subject')),
  title text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.shared_items enable row level security;

drop policy if exists "Users can create their own share links" on public.shared_items;
create policy "Users can create their own share links"
  on public.shared_items for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users can manage their own share links" on public.shared_items;
create policy "Users can manage their own share links"
  on public.shared_items for delete
  to authenticated
  using (auth.uid() = owner_id);

create or replace function public.get_shared_item(share_id uuid)
returns table (item_type text, title text, payload jsonb)
language sql
security definer
set search_path = public
as $$
  select item_type, title, payload
  from public.shared_items
  where id = share_id;
$$;

revoke all on public.shared_items from anon, authenticated;
grant insert, delete on public.shared_items to authenticated;
grant execute on function public.get_shared_item(uuid) to anon, authenticated;
