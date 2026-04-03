alter table public.duties
  add column if not exists skip_weekdays smallint[] not null default '{}'::smallint[],
  add column if not exists skip_dates date[] not null default '{}'::date[];

alter table public.duty_assignments
  add column if not exists scheduled_member_id uuid references public.family_members (id) on delete set null,
  add column if not exists assignment_source text not null default 'rotation',
  add column if not exists override_note text not null default '';

update public.duty_assignments
set scheduled_member_id = coalesce(scheduled_member_id, assigned_member_id);

alter table public.duty_assignments
  alter column scheduled_member_id set not null;

alter table public.duty_assignments
  drop constraint if exists duty_assignments_assignment_source_check;

alter table public.duty_assignments
  add constraint duty_assignments_assignment_source_check
  check (assignment_source in ('rotation', 'fixed', 'temporary-cover', 'rotation-shift'));

create or replace function app.guard_duty_assignment_family_links()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if not exists (
    select 1
    from public.family_members
    where id = new.assigned_member_id
      and family_id = new.family_id
  ) then
    raise exception 'Assigned family member must belong to the same family.';
  end if;

  if not exists (
    select 1
    from public.family_members
    where id = new.scheduled_member_id
      and family_id = new.family_id
  ) then
    raise exception 'Scheduled family member must belong to the same family.';
  end if;

  return new;
end;
$$;

drop trigger if exists duty_assignments_guard_family_links on public.duty_assignments;
create trigger duty_assignments_guard_family_links
before insert or update on public.duty_assignments
for each row execute procedure app.guard_duty_assignment_family_links();

comment on column public.duties.skip_weekdays is 'Weekdays to skip when generating queue-owned duty occurrences. 0 = Sunday.';
comment on column public.duties.skip_dates is 'Specific family rest days or non-duty dates that should not consume the rotation queue.';
comment on column public.duty_assignments.assignment_source is 'Distinguishes normal rotation/fixed assignments from one-off temporary covers and true rotation shifts.';
comment on table public.duty_rotation_members is 'Subset membership in this table defines duty-specific participant groups; families are not limited to one universal rotation.';
