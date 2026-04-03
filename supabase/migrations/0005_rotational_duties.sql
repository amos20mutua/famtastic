do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'duties'
      and column_name = 'rotation_mode'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'duties'
      and column_name = 'assignment_mode'
  ) then
    alter table public.duties rename column rotation_mode to assignment_mode;
  end if;
end;
$$;

alter table public.duties
  drop constraint if exists duties_rotation_mode_check,
  drop constraint if exists duties_assignment_mode_check;

alter table public.duties
  alter column assignment_mode set default 'rotation';

alter table public.duties
  add constraint duties_assignment_mode_check check (assignment_mode in ('rotation', 'fixed'));

update public.duties
set assignment_mode = 'fixed'
where assignment_mode = 'manual';

alter table public.duties
  add column if not exists starts_on date not null default timezone('utc', now())::date,
  add column if not exists interval_days integer not null default 1 check (interval_days > 0),
  add column if not exists fixed_member_id uuid references public.family_members (id) on delete set null,
  add column if not exists rotation_cursor integer not null default 0 check (rotation_cursor >= 0),
  add column if not exists last_assigned_member_id uuid references public.family_members (id) on delete set null,
  add column if not exists last_assigned_at timestamptz;

update public.duties as duties
set starts_on = coalesce(
  (
    select min(date(assignments.due_at))
    from public.duty_assignments as assignments
    where assignments.duty_id = duties.id
  ),
  timezone('utc', now())::date
)
where duties.starts_on = timezone('utc', now())::date;

with latest_assignment as (
  select distinct on (duty_id)
    duty_id,
    assigned_member_id,
    due_at
  from public.duty_assignments
  order by duty_id, due_at desc
)
update public.duties as duties
set
  last_assigned_member_id = latest_assignment.assigned_member_id,
  last_assigned_at = latest_assignment.due_at
from latest_assignment
where latest_assignment.duty_id = duties.id
  and duties.last_assigned_member_id is null;

create table if not exists public.duty_rotation_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  duty_id uuid not null references public.duties (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  position integer not null check (position >= 0),
  is_paused boolean not null default false,
  pause_reason text not null default '',
  paused_until timestamptz,
  substitute_member_id uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (duty_id, member_id),
  unique (duty_id, position)
);

create index if not exists duty_rotation_members_family_id_idx on public.duty_rotation_members (family_id);
create index if not exists duty_rotation_members_duty_id_idx on public.duty_rotation_members (duty_id, position);

create or replace function app.guard_duty_rotation_configuration()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if new.fixed_member_id is not null and not exists (
    select 1
    from public.family_members
    where id = new.fixed_member_id
      and family_id = new.family_id
  ) then
    raise exception 'Fixed duty assignee must belong to the same family.';
  end if;

  if new.last_assigned_member_id is not null and not exists (
    select 1
    from public.family_members
    where id = new.last_assigned_member_id
      and family_id = new.family_id
  ) then
    raise exception 'Last assigned family member must belong to the same family.';
  end if;

  return new;
end;
$$;

create or replace function app.guard_duty_rotation_member_link()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if not exists (
    select 1
    from public.duties
    where id = new.duty_id
      and family_id = new.family_id
  ) then
    raise exception 'Rotation member must belong to the same family as the duty.';
  end if;

  if not exists (
    select 1
    from public.family_members
    where id = new.member_id
      and family_id = new.family_id
  ) then
    raise exception 'Rotation member must belong to the same family.';
  end if;

  if new.substitute_member_id is not null and not exists (
    select 1
    from public.family_members
    where id = new.substitute_member_id
      and family_id = new.family_id
  ) then
    raise exception 'Rotation substitute must belong to the same family.';
  end if;

  return new;
end;
$$;

drop trigger if exists duties_guard_rotation_configuration on public.duties;
create trigger duties_guard_rotation_configuration
before insert or update on public.duties
for each row execute procedure app.guard_duty_rotation_configuration();

drop trigger if exists duty_rotation_members_guard_family_links on public.duty_rotation_members;
create trigger duty_rotation_members_guard_family_links
before insert or update on public.duty_rotation_members
for each row execute procedure app.guard_duty_rotation_member_link();

drop trigger if exists duty_rotation_members_set_updated_at on public.duty_rotation_members;
create trigger duty_rotation_members_set_updated_at
before update on public.duty_rotation_members
for each row execute procedure app.set_updated_at();

insert into public.duty_rotation_members (family_id, duty_id, member_id, position)
select
  duties.family_id,
  duties.id,
  members.id,
  row_number() over (partition by duties.id order by members.created_at, members.id) - 1
from public.duties as duties
join public.family_members as members
  on members.family_id = duties.family_id
 and members.status = 'active'
where duties.assignment_mode = 'rotation'
on conflict (duty_id, member_id) do nothing;

alter table public.duty_rotation_members enable row level security;

drop policy if exists duty_rotation_members_select on public.duty_rotation_members;
create policy duty_rotation_members_select
on public.duty_rotation_members
for select
using (app.is_family_member(family_id));

drop policy if exists duty_rotation_members_modify on public.duty_rotation_members;
create policy duty_rotation_members_modify
on public.duty_rotation_members
for all
using (app.is_family_governor(family_id))
with check (app.is_family_governor(family_id));

drop trigger if exists audit_duty_rotation_members on public.duty_rotation_members;
create trigger audit_duty_rotation_members
after insert or update or delete on public.duty_rotation_members
for each row execute procedure app.capture_audit_log('schedule');
