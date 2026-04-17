create or replace function app.ensure_user_profile(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_id uuid;
  user_email text;
  display_name text;
  short_name text;
begin
  select id
  into profile_id
  from public.user_profiles
  where user_id = target_user_id
  limit 1;

  if profile_id is not null then
    return profile_id;
  end if;

  select email
  into user_email
  from auth.users
  where id = target_user_id;

  if user_email is null then
    raise exception 'Unable to resolve an email for the authenticated account.';
  end if;

  display_name := initcap(replace(split_part(user_email, '@', 1), '.', ' '));
  short_name := upper(left(regexp_replace(display_name, '[^A-Za-z0-9]', '', 'g'), 2));

  if short_name = '' then
    short_name := 'FM';
  end if;

  insert into public.user_profiles (
    user_id,
    email,
    display_name,
    short_name,
    avatar_seed,
    avatar_tone
  )
  values (
    target_user_id,
    user_email,
    display_name,
    short_name,
    lower(regexp_replace(display_name, '[^A-Za-z0-9]+', '-', 'g')) || '-' || substring(gen_random_uuid()::text, 1, 8),
    '#274337'
  )
  returning id into profile_id;

  return profile_id;
end;
$$;

create or replace function public.create_family_workspace(family_name text)
returns table (family_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  actor_id uuid := auth.uid();
  profile_id uuid;
  normalized_name text := trim(family_name);
  base_slug text;
  resolved_slug text;
  generated_invite_code text;
begin
  if actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception 'Family name is required.';
  end if;

  profile_id := app.ensure_user_profile(actor_id);
  base_slug := lower(regexp_replace(normalized_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  if base_slug = '' then
    base_slug := 'family';
  end if;

  resolved_slug := base_slug;

  while exists (
    select 1
    from public.families
    where slug = resolved_slug
  ) loop
    resolved_slug := base_slug || '-' || substring(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end loop;

  generated_invite_code := upper(substring(regexp_replace(base_slug, '[^A-Za-z0-9]', '', 'g') || 'FAMT', 1, 4))
    || '-'
    || lpad((floor(random() * 10000))::int::text, 4, '0');

  while exists (
    select 1
    from public.families
    where invite_code = generated_invite_code
  ) loop
    generated_invite_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4))
      || '-'
      || lpad((floor(random() * 10000))::int::text, 4, '0');
  end loop;

  insert into public.families (
    name,
    slug,
    invite_code,
    timezone,
    motto,
    devotion_rhythm,
    created_by
  )
  values (
    normalized_name,
    resolved_slug,
    generated_invite_code,
    'Africa/Nairobi',
    'Carry the home together, with warmth and consistency.',
    'Evening circle',
    actor_id
  )
  returning id into family_id;

  insert into public.family_members (
    family_id,
    profile_id,
    role,
    status
  )
  values (
    family_id,
    profile_id,
    'parent',
    'active'
  )
  returning id into member_id;

  insert into public.settings (family_id)
  values (family_id)
  on conflict (family_id) do nothing;

  return next;
end;
$$;

create or replace function public.join_family_workspace(invite_code text)
returns table (family_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  actor_id uuid := auth.uid();
  profile_id uuid;
  normalized_invite_code text := upper(trim(invite_code));
begin
  if actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  if normalized_invite_code is null or normalized_invite_code = '' then
    raise exception 'Invite code is required.';
  end if;

  profile_id := app.ensure_user_profile(actor_id);

  select id
  into family_id
  from public.families
  where upper(public.families.invite_code) = normalized_invite_code
  limit 1;

  if family_id is null then
    raise exception 'Invite code was not found.';
  end if;

  insert into public.family_members (
    family_id,
    profile_id,
    role,
    status
  )
  values (
    family_id,
    profile_id,
    'member',
    'active'
  )
  on conflict (family_id, profile_id) do update
  set status = 'active'
  returning id into member_id;

  insert into public.settings (family_id)
  values (family_id)
  on conflict (family_id) do nothing;

  return next;
end;
$$;

grant execute on function public.create_family_workspace(text) to authenticated;
grant execute on function public.join_family_workspace(text) to authenticated;
