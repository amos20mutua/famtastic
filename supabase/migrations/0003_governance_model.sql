create or replace function app.is_family_governor(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members family_member
    join public.user_profiles profile on profile.id = family_member.profile_id
    where profile.user_id = auth.uid()
      and family_member.family_id = target_family_id
      and family_member.status = 'active'
      and family_member.role in ('parent', 'co-admin')
  );
$$;

alter table public.family_members drop constraint if exists family_members_role_check;
alter table public.family_members
  add constraint family_members_role_check
  check (role in ('parent', 'co-admin', 'member'));

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  requested_by_member_id uuid not null references public.family_members (id) on delete cascade,
  requested_for_member_id uuid references public.family_members (id) on delete set null,
  request_type text not null check (request_type in ('duty-swap', 'meal-reassign', 'devotion-reassign', 'schedule-change')),
  target_type text not null check (target_type in ('duty-assignment', 'meal', 'devotion', 'schedule', 'settings', 'member')),
  target_id uuid,
  title text not null,
  details text not null default '',
  proposed_changes jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by_member_id uuid references public.family_members (id) on delete set null,
  reviewed_at timestamptz,
  resolution_note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  actor_member_id uuid references public.family_members (id) on delete set null,
  actor_role text not null check (actor_role in ('parent', 'co-admin', 'member', 'system')),
  entity_type text not null check (entity_type in ('duty-template', 'duty-assignment', 'devotion', 'meal', 'shopping-item', 'member', 'settings', 'change-request', 'schedule')),
  entity_id uuid,
  action text not null check (action in ('create', 'edit', 'delete', 'archive', 'reassign', 'complete', 'reopen', 'approve', 'reject', 'role-change', 'settings-update', 'generate', 'request')),
  summary text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_change_requests_family_status
  on public.change_requests (family_id, status, created_at desc);

create index if not exists idx_change_requests_requested_by
  on public.change_requests (requested_by_member_id, created_at desc);

create index if not exists idx_audit_logs_family_created
  on public.audit_logs (family_id, created_at desc);

drop trigger if exists change_requests_set_updated_at on public.change_requests;
create trigger change_requests_set_updated_at
before update on public.change_requests
for each row execute procedure app.set_updated_at();

alter table public.change_requests enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists change_requests_select on public.change_requests;
create policy change_requests_select
on public.change_requests
for select
using (app.is_family_member(family_id));

drop policy if exists change_requests_insert on public.change_requests;
create policy change_requests_insert
on public.change_requests
for insert
with check (app.is_family_member(family_id));

drop policy if exists change_requests_update on public.change_requests;
create policy change_requests_update
on public.change_requests
for update
using (app.is_family_governor(family_id))
with check (app.is_family_governor(family_id));

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select
on public.audit_logs
for select
using (app.is_family_governor(family_id));

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert
on public.audit_logs
for insert
with check (app.is_family_member(family_id));
