create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  installed boolean not null default false,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_push_subscriptions_user_active
  on public.push_subscriptions (user_id, is_active);

create index if not exists idx_push_subscriptions_family_active
  on public.push_subscriptions (family_id, is_active);

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute procedure app.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select
on public.push_subscriptions
for select
using (
  auth.uid() = user_id
  or app.is_family_parent(family_id)
);

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert
on public.push_subscriptions
for insert
with check (
  auth.uid() = user_id
  and app.is_family_member(family_id)
);

drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update
on public.push_subscriptions
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and app.is_family_member(family_id)
);

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete
on public.push_subscriptions
for delete
using (auth.uid() = user_id);
