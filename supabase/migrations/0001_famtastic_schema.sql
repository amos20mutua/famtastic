create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function app.is_family_member(target_family_id uuid)
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
  );
$$;

create or replace function app.is_family_parent(target_family_id uuid)
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
      and family_member.role = 'parent'
  );
$$;

create or replace function app.can_view_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles target_profile
    where target_profile.id = target_profile_id
      and target_profile.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.family_members mine
    join public.user_profiles my_profile on my_profile.id = mine.profile_id
    join public.family_members target_member on target_member.family_id = mine.family_id
    where my_profile.user_id = auth.uid()
      and mine.status = 'active'
      and target_member.profile_id = target_profile_id
  );
$$;

grant usage on schema app to authenticated;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  invite_code text not null unique,
  timezone text not null default 'Africa/Nairobi',
  motto text not null default '',
  devotion_rhythm text not null default 'Evening circle',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  email citext not null unique,
  display_name text not null,
  short_name text not null,
  avatar_seed text not null,
  avatar_tone text not null default '#244236',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  profile_id uuid not null references public.user_profiles (id) on delete cascade,
  role text not null check (role in ('parent', 'member')),
  status text not null default 'active' check (status in ('active', 'invited', 'inactive')),
  notification_preferences jsonb not null default jsonb_build_object(
    'browser', true,
    'stickyCards', true,
    'devotionAlerts', true,
    'mealAlerts', true,
    'dutyAlerts', true,
    'quietHoursEnabled', true,
    'quietHoursStart', '22:00',
    'quietHoursEnd', '06:00'
  ),
  joined_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (family_id, profile_id)
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null unique references public.families (id) on delete cascade,
  reminder_settings jsonb not null default jsonb_build_object(
    'dueSoonMinutes', 60,
    'upcomingWindowHours', 18,
    'escalationMinutes', 30,
    'browserNotifications', true,
    'stickyOverdue', true,
    'badgeCounts', true
  ),
  shopping_categories text[] not null default array['Pantry', 'Produce', 'Cleaning', 'Toiletries', 'Breakfast'],
  meal_focus text not null default 'Simple food, prepared with calm and shared responsibility.',
  devotion_time time not null default '20:00',
  devotion_skip_weekdays smallint[] not null default array[0]::smallint[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.duties (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null check (category in ('cooking', 'dishes', 'cleaning', 'laundry', 'general')),
  default_due_time time not null,
  recurrence text not null check (recurrence in ('daily', 'weekdays', 'weekly', 'custom')),
  urgency text not null check (urgency in ('low', 'medium', 'high', 'critical')),
  rotation_mode text not null default 'rotation' check (rotation_mode in ('rotation', 'manual')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.duty_assignments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  duty_id uuid not null references public.duties (id) on delete cascade,
  assigned_member_id uuid not null references public.family_members (id) on delete restrict,
  title text not null,
  description text not null default '',
  due_at timestamptz not null,
  recurrence_snapshot text not null check (recurrence_snapshot in ('daily', 'weekdays', 'weekly', 'custom')),
  urgency text not null check (urgency in ('low', 'medium', 'high', 'critical')),
  status text not null default 'pending' check (status in ('pending', 'done', 'missed', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.devotion_schedule (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  leader_member_id uuid not null references public.family_members (id) on delete restrict,
  scheduled_for date not null,
  start_time time not null default '20:00',
  bible_reading text not null default '',
  topic text not null default '',
  notes text not null default '',
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  scheduled_for date not null,
  title text not null,
  cook_member_id uuid not null references public.family_members (id) on delete restrict,
  ingredients jsonb not null default '[]'::jsonb,
  notes text not null default '',
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  category text not null,
  urgency text not null check (urgency in ('low', 'medium', 'high', 'critical')),
  added_by_member_id uuid not null references public.family_members (id) on delete restrict,
  checked boolean not null default false,
  checked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  related_type text check (related_type in ('duty', 'devotion', 'meal', 'shopping', 'system')),
  related_id uuid,
  title text not null,
  body text not null,
  severity text not null check (severity in ('gentle', 'important', 'urgent')),
  channel text not null default 'in-app' check (channel in ('in-app', 'browser', 'push')),
  state text not null default 'upcoming' check (state in ('upcoming', 'due-soon', 'overdue', 'sent', 'read')),
  scheduled_for timestamptz,
  delivered_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  primary key (notification_id, member_id)
);

create table if not exists public.completion_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete restrict,
  assignment_type text not null check (assignment_type in ('duty', 'devotion', 'meal')),
  assignment_id uuid not null,
  outcome text not null check (outcome in ('completed', 'missed', 'reopened')),
  notes text not null default '',
  completed_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_family_members_family on public.family_members (family_id);
create index if not exists idx_duties_family on public.duties (family_id);
create index if not exists idx_duty_assignments_family_due on public.duty_assignments (family_id, due_at);
create index if not exists idx_devotion_schedule_family_date on public.devotion_schedule (family_id, scheduled_for);
create index if not exists idx_meals_family_date on public.meals (family_id, scheduled_for);
create index if not exists idx_shopping_items_family_checked on public.shopping_items (family_id, checked);
create index if not exists idx_notifications_family_scheduled on public.notifications (family_id, scheduled_for);
create index if not exists idx_completion_logs_family_completed on public.completion_logs (family_id, completed_at desc);

drop trigger if exists families_set_updated_at on public.families;
create trigger families_set_updated_at before update on public.families for each row execute procedure app.set_updated_at();

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at before update on public.user_profiles for each row execute procedure app.set_updated_at();

drop trigger if exists family_members_set_updated_at on public.family_members;
create trigger family_members_set_updated_at before update on public.family_members for each row execute procedure app.set_updated_at();

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings for each row execute procedure app.set_updated_at();

drop trigger if exists duties_set_updated_at on public.duties;
create trigger duties_set_updated_at before update on public.duties for each row execute procedure app.set_updated_at();

drop trigger if exists duty_assignments_set_updated_at on public.duty_assignments;
create trigger duty_assignments_set_updated_at before update on public.duty_assignments for each row execute procedure app.set_updated_at();

drop trigger if exists devotion_schedule_set_updated_at on public.devotion_schedule;
create trigger devotion_schedule_set_updated_at before update on public.devotion_schedule for each row execute procedure app.set_updated_at();

drop trigger if exists meals_set_updated_at on public.meals;
create trigger meals_set_updated_at before update on public.meals for each row execute procedure app.set_updated_at();

drop trigger if exists shopping_items_set_updated_at on public.shopping_items;
create trigger shopping_items_set_updated_at before update on public.shopping_items for each row execute procedure app.set_updated_at();

alter table public.families enable row level security;
alter table public.user_profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.settings enable row level security;
alter table public.duties enable row level security;
alter table public.duty_assignments enable row level security;
alter table public.devotion_schedule enable row level security;
alter table public.meals enable row level security;
alter table public.shopping_items enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.completion_logs enable row level security;

drop policy if exists families_select on public.families;
create policy families_select on public.families for select using (app.is_family_member(id));

drop policy if exists families_insert on public.families;
create policy families_insert on public.families for insert with check (auth.uid() is not null);

drop policy if exists families_update on public.families;
create policy families_update on public.families for update using (app.is_family_parent(id)) with check (app.is_family_parent(id));

drop policy if exists user_profiles_select on public.user_profiles;
create policy user_profiles_select on public.user_profiles for select using (app.can_view_profile(id));

drop policy if exists user_profiles_insert on public.user_profiles;
create policy user_profiles_insert on public.user_profiles for insert with check (auth.uid() is not null);

drop policy if exists user_profiles_update on public.user_profiles;
create policy user_profiles_update on public.user_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members for select using (app.is_family_member(family_id));

drop policy if exists family_members_insert on public.family_members;
create policy family_members_insert on public.family_members for insert with check (app.is_family_parent(family_id));

drop policy if exists family_members_update on public.family_members;
create policy family_members_update on public.family_members for update using (app.is_family_parent(family_id)) with check (app.is_family_parent(family_id));

drop policy if exists family_members_delete on public.family_members;
create policy family_members_delete on public.family_members for delete using (app.is_family_parent(family_id));

drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select using (app.is_family_member(family_id));

drop policy if exists settings_modify on public.settings;
create policy settings_modify on public.settings for all using (app.is_family_parent(family_id)) with check (app.is_family_parent(family_id));

drop policy if exists duties_select on public.duties;
create policy duties_select on public.duties for select using (app.is_family_member(family_id));

drop policy if exists duties_modify on public.duties;
create policy duties_modify on public.duties for all using (app.is_family_parent(family_id)) with check (app.is_family_parent(family_id));

drop policy if exists duty_assignments_select on public.duty_assignments;
create policy duty_assignments_select on public.duty_assignments for select using (app.is_family_member(family_id));

drop policy if exists duty_assignments_insert on public.duty_assignments;
create policy duty_assignments_insert on public.duty_assignments for insert with check (app.is_family_parent(family_id));

drop policy if exists duty_assignments_update on public.duty_assignments;
create policy duty_assignments_update on public.duty_assignments
for update
using (
  app.is_family_parent(family_id)
  or exists (
    select 1
    from public.family_members family_member
    join public.user_profiles profile on profile.id = family_member.profile_id
    where family_member.id = assigned_member_id
      and profile.user_id = auth.uid()
      and family_member.status = 'active'
  )
)
with check (
  app.is_family_parent(family_id)
  or exists (
    select 1
    from public.family_members family_member
    join public.user_profiles profile on profile.id = family_member.profile_id
    where family_member.id = assigned_member_id
      and profile.user_id = auth.uid()
      and family_member.status = 'active'
  )
);

drop policy if exists duty_assignments_delete on public.duty_assignments;
create policy duty_assignments_delete on public.duty_assignments for delete using (app.is_family_parent(family_id));

drop policy if exists devotion_schedule_select on public.devotion_schedule;
create policy devotion_schedule_select on public.devotion_schedule for select using (app.is_family_member(family_id));

drop policy if exists devotion_schedule_modify on public.devotion_schedule;
create policy devotion_schedule_modify on public.devotion_schedule for all using (app.is_family_parent(family_id)) with check (app.is_family_parent(family_id));

drop policy if exists meals_select on public.meals;
create policy meals_select on public.meals for select using (app.is_family_member(family_id));

drop policy if exists meals_modify on public.meals;
create policy meals_modify on public.meals for all using (app.is_family_parent(family_id)) with check (app.is_family_parent(family_id));

drop policy if exists shopping_items_select on public.shopping_items;
create policy shopping_items_select on public.shopping_items for select using (app.is_family_member(family_id));

drop policy if exists shopping_items_insert on public.shopping_items;
create policy shopping_items_insert on public.shopping_items for insert with check (app.is_family_member(family_id));

drop policy if exists shopping_items_update on public.shopping_items;
create policy shopping_items_update on public.shopping_items for update using (app.is_family_member(family_id)) with check (app.is_family_member(family_id));

drop policy if exists shopping_items_delete on public.shopping_items;
create policy shopping_items_delete on public.shopping_items for delete using (app.is_family_parent(family_id));

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (app.is_family_member(family_id));

drop policy if exists notifications_modify on public.notifications;
create policy notifications_modify on public.notifications for all using (app.is_family_parent(family_id)) with check (app.is_family_parent(family_id));

drop policy if exists notification_reads_select on public.notification_reads;
create policy notification_reads_select on public.notification_reads
for select
using (
  exists (
    select 1
    from public.family_members family_member
    join public.user_profiles profile on profile.id = family_member.profile_id
    where family_member.id = member_id
      and profile.user_id = auth.uid()
  )
);

drop policy if exists notification_reads_insert on public.notification_reads;
create policy notification_reads_insert on public.notification_reads
for insert
with check (
  exists (
    select 1
    from public.family_members family_member
    join public.user_profiles profile on profile.id = family_member.profile_id
    where family_member.id = member_id
      and profile.user_id = auth.uid()
  )
);

drop policy if exists completion_logs_select on public.completion_logs;
create policy completion_logs_select on public.completion_logs for select using (app.is_family_member(family_id));

drop policy if exists completion_logs_insert on public.completion_logs;
create policy completion_logs_insert on public.completion_logs for insert with check (app.is_family_member(family_id));

drop policy if exists completion_logs_delete on public.completion_logs;
create policy completion_logs_delete on public.completion_logs for delete using (app.is_family_parent(family_id));
