create or replace function app.current_family_member_id(target_family_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_member.id
  from public.family_members family_member
  join public.user_profiles profile on profile.id = family_member.profile_id
  where profile.user_id = auth.uid()
    and family_member.family_id = target_family_id
    and family_member.status = 'active'
  limit 1;
$$;

create or replace function app.current_family_role(target_family_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select family_member.role
  from public.family_members family_member
  join public.user_profiles profile on profile.id = family_member.profile_id
  where profile.user_id = auth.uid()
    and family_member.family_id = target_family_id
    and family_member.status = 'active'
  limit 1;
$$;

create or replace function app.is_self_family_member(target_member_id uuid)
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
    where family_member.id = target_member_id
      and profile.user_id = auth.uid()
      and family_member.status = 'active'
  );
$$;

create or replace function app.guard_duty_assignment_member_update()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if app.is_family_governor(coalesce(new.family_id, old.family_id)) then
    return new;
  end if;

  if not app.is_self_family_member(coalesce(new.assigned_member_id, old.assigned_member_id)) then
    raise exception 'Only the assigned family member can update this duty.';
  end if;

  if
    new.family_id is distinct from old.family_id
    or new.duty_id is distinct from old.duty_id
    or new.assigned_member_id is distinct from old.assigned_member_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.due_at is distinct from old.due_at
    or new.recurrence_snapshot is distinct from old.recurrence_snapshot
    or new.urgency is distinct from old.urgency
  then
    raise exception 'Family members cannot change assignments or schedules directly.';
  end if;

  if new.status not in ('pending', 'done') then
    raise exception 'Family members may only mark duties done or pending.';
  end if;

  return new;
end;
$$;

create or replace function app.guard_shopping_item_member_update()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if app.is_family_governor(coalesce(new.family_id, old.family_id)) then
    return new;
  end if;

  if
    new.family_id is distinct from old.family_id
    or new.name is distinct from old.name
    or new.category is distinct from old.category
    or new.urgency is distinct from old.urgency
    or new.added_by_member_id is distinct from old.added_by_member_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Family members may only mark shopping items checked or unchecked.';
  end if;

  return new;
end;
$$;

create or replace function app.guard_completion_log_insert()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if app.is_family_governor(new.family_id) then
    return new;
  end if;

  if not app.is_self_family_member(new.member_id) then
    raise exception 'Family members may only create completion history for themselves.';
  end if;

  return new;
end;
$$;

create or replace function app.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  target_family_id uuid;
  target_entity_id uuid;
  actor_member_id uuid;
  actor_role text;
  entity_type text := tg_argv[0];
  action_name text;
begin
  target_family_id := coalesce(
    nullif(to_jsonb(new) ->> 'family_id', '')::uuid,
    nullif(to_jsonb(old) ->> 'family_id', '')::uuid
  );

  if target_family_id is null then
    return coalesce(new, old);
  end if;

  target_entity_id := coalesce(
    nullif(to_jsonb(new) ->> 'id', '')::uuid,
    nullif(to_jsonb(old) ->> 'id', '')::uuid
  );

  actor_member_id := app.current_family_member_id(target_family_id);
  actor_role := coalesce(app.current_family_role(target_family_id), 'system');

  if tg_op = 'INSERT' then
    action_name := case when entity_type = 'change-request' then 'request' else 'create' end;
  elsif tg_op = 'DELETE' then
    action_name := 'delete';
  else
    action_name := 'edit';

    if entity_type = 'duty-template' and old.is_active = true and new.is_active = false then
      action_name := 'archive';
    elsif entity_type = 'duty-assignment' and old.assigned_member_id is distinct from new.assigned_member_id then
      action_name := 'reassign';
    elsif entity_type = 'duty-assignment' and old.status is distinct from new.status then
      action_name := case
        when new.status = 'done' then 'complete'
        when old.status = 'done' and new.status = 'pending' then 'reopen'
        else 'edit'
      end;
    elsif entity_type = 'devotion' and old.leader_member_id is distinct from new.leader_member_id then
      action_name := 'reassign';
    elsif entity_type = 'meal' and old.cook_member_id is distinct from new.cook_member_id then
      action_name := 'reassign';
    elsif entity_type = 'member' and old.role is distinct from new.role then
      action_name := 'role-change';
    elsif entity_type = 'settings' then
      action_name := 'settings-update';
    elsif entity_type = 'change-request' and old.status is distinct from new.status then
      action_name := case
        when new.status = 'approved' then 'approve'
        when new.status = 'rejected' then 'reject'
        else 'edit'
      end;
    end if;
  end if;

  insert into public.audit_logs (
    family_id,
    actor_member_id,
    actor_role,
    entity_type,
    entity_id,
    action,
    summary,
    old_value,
    new_value
  )
  values (
    target_family_id,
    actor_member_id,
    actor_role,
    entity_type,
    target_entity_id,
    action_name,
    initcap(replace(entity_type, '-', ' ')) || ' ' || replace(action_name, '-', ' '),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

drop policy if exists duties_modify on public.duties;
create policy duties_modify
on public.duties
for all
using (app.is_family_governor(family_id))
with check (app.is_family_governor(family_id));

drop policy if exists duty_assignments_insert on public.duty_assignments;
create policy duty_assignments_insert
on public.duty_assignments
for insert
with check (app.is_family_governor(family_id));

drop policy if exists duty_assignments_update on public.duty_assignments;
create policy duty_assignments_update
on public.duty_assignments
for update
using (
  app.is_family_governor(family_id)
  or app.is_self_family_member(assigned_member_id)
)
with check (
  app.is_family_governor(family_id)
  or app.is_self_family_member(assigned_member_id)
);

drop policy if exists duty_assignments_delete on public.duty_assignments;
create policy duty_assignments_delete
on public.duty_assignments
for delete
using (app.is_family_governor(family_id));

drop policy if exists devotion_schedule_modify on public.devotion_schedule;
create policy devotion_schedule_modify
on public.devotion_schedule
for all
using (app.is_family_governor(family_id))
with check (app.is_family_governor(family_id));

drop policy if exists meals_modify on public.meals;
create policy meals_modify
on public.meals
for all
using (app.is_family_governor(family_id))
with check (app.is_family_governor(family_id));

drop policy if exists notifications_modify on public.notifications;
create policy notifications_modify
on public.notifications
for all
using (app.is_family_governor(family_id))
with check (app.is_family_governor(family_id));

drop policy if exists completion_logs_insert on public.completion_logs;
create policy completion_logs_insert
on public.completion_logs
for insert
with check (
  app.is_family_governor(family_id)
  or app.is_self_family_member(member_id)
);

drop policy if exists change_requests_insert on public.change_requests;
create policy change_requests_insert
on public.change_requests
for insert
with check (
  app.is_family_member(family_id)
  and app.is_self_family_member(requested_by_member_id)
);

drop policy if exists audit_logs_insert on public.audit_logs;

drop trigger if exists duty_assignments_guard_member_updates on public.duty_assignments;
create trigger duty_assignments_guard_member_updates
before update on public.duty_assignments
for each row execute procedure app.guard_duty_assignment_member_update();

drop trigger if exists shopping_items_guard_member_updates on public.shopping_items;
create trigger shopping_items_guard_member_updates
before update on public.shopping_items
for each row execute procedure app.guard_shopping_item_member_update();

drop trigger if exists completion_logs_guard_insert on public.completion_logs;
create trigger completion_logs_guard_insert
before insert on public.completion_logs
for each row execute procedure app.guard_completion_log_insert();

drop trigger if exists duties_capture_audit on public.duties;
create trigger duties_capture_audit
after insert or update or delete on public.duties
for each row execute procedure app.capture_audit_log('duty-template');

drop trigger if exists duty_assignments_capture_audit on public.duty_assignments;
create trigger duty_assignments_capture_audit
after insert or update or delete on public.duty_assignments
for each row execute procedure app.capture_audit_log('duty-assignment');

drop trigger if exists devotion_schedule_capture_audit on public.devotion_schedule;
create trigger devotion_schedule_capture_audit
after insert or update or delete on public.devotion_schedule
for each row execute procedure app.capture_audit_log('devotion');

drop trigger if exists meals_capture_audit on public.meals;
create trigger meals_capture_audit
after insert or update or delete on public.meals
for each row execute procedure app.capture_audit_log('meal');

drop trigger if exists shopping_items_capture_audit on public.shopping_items;
create trigger shopping_items_capture_audit
after insert or update or delete on public.shopping_items
for each row execute procedure app.capture_audit_log('shopping-item');

drop trigger if exists family_members_capture_audit on public.family_members;
create trigger family_members_capture_audit
after insert or update or delete on public.family_members
for each row execute procedure app.capture_audit_log('member');

drop trigger if exists settings_capture_audit on public.settings;
create trigger settings_capture_audit
after insert or update or delete on public.settings
for each row execute procedure app.capture_audit_log('settings');

drop trigger if exists change_requests_capture_audit on public.change_requests;
create trigger change_requests_capture_audit
after insert or update or delete on public.change_requests
for each row execute procedure app.capture_audit_log('change-request');
