insert into public.families (
  id,
  name,
  slug,
  invite_code,
  timezone,
  motto,
  devotion_rhythm
)
values (
  '00000000-0000-4000-8000-000000000001',
  'The Okello Family',
  'the-okello-family',
  'OKEL-2684',
  'Africa/Nairobi',
  'Carry the home together, with warmth and consistency.',
  'Evening circle'
)
on conflict (id) do nothing;

insert into public.user_profiles (id, email, display_name, short_name, avatar_seed, avatar_tone)
values
  ('00000000-0000-4000-8000-000000000101', 'grace@famtastic.app', 'Grace Okello', 'GO', 'grace-okello-member-grace', '#274337'),
  ('00000000-0000-4000-8000-000000000102', 'daniel@famtastic.app', 'Daniel Okello', 'DO', 'daniel-okello-member-daniel', '#835440'),
  ('00000000-0000-4000-8000-000000000103', 'leah@famtastic.app', 'Leah Okello', 'LO', 'leah-okello-member-leah', '#bb7347'),
  ('00000000-0000-4000-8000-000000000104', 'micah@famtastic.app', 'Micah Okello', 'MO', 'micah-okello-member-micah', '#688d73')
on conflict (id) do nothing;

insert into public.family_members (id, family_id, profile_id, role, status)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'parent', 'active'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'co-admin', 'active'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', 'member', 'active'),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000104', 'member', 'active')
on conflict (id) do nothing;

insert into public.settings (id, family_id, meal_focus, devotion_time, devotion_skip_weekdays)
values (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000001',
  'Simple food, prepared with calm and shared responsibility.',
  '20:00',
  array[0]::smallint[]
)
on conflict (family_id) do nothing;

insert into public.duties (
  id,
  family_id,
  title,
  description,
  category,
  default_due_time,
  recurrence,
  urgency,
  assignment_mode,
  starts_on,
  interval_days,
  fixed_member_id,
  rotation_cursor,
  last_assigned_member_id,
  last_assigned_at
)
values
  (
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000001',
    'Dinner cooking',
    'Own dinner from prep through plating and leave the serving station tidy.',
    'cooking',
    '18:00',
    'daily',
    'high',
    'rotation',
    current_date,
    1,
    null,
    2,
    '00000000-0000-4000-8000-000000000202',
    date_trunc('day', now()) + interval '1 day 18 hours'
  ),
  (
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000001',
    'Dishwashing',
    'Clear dinner dishes, wipe counters, and reset the sink for the morning.',
    'dishes',
    '20:30',
    'daily',
    'high',
    'rotation',
    current_date - 1,
    1,
    null,
    3,
    '00000000-0000-4000-8000-000000000204',
    date_trunc('day', now()) + interval '1 day 20 hours 30 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000000403',
    '00000000-0000-4000-8000-000000000001',
    'Living room reset',
    'Straighten cushions, sweep the floor, and prepare the room for devotion.',
    'cleaning',
    '19:15',
    'daily',
    'medium',
    'rotation',
    current_date - 1,
    1,
    null,
    2,
    '00000000-0000-4000-8000-000000000204',
    date_trunc('day', now()) + interval '19 hours 15 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000000404',
    '00000000-0000-4000-8000-000000000001',
    'Laundry fold',
    'Fold washed clothes and return them to each room before bedtime.',
    'laundry',
    '16:30',
    'weekdays',
    'medium',
    'fixed',
    current_date,
    1,
    '00000000-0000-4000-8000-000000000201',
    0,
    '00000000-0000-4000-8000-000000000201',
    date_trunc('day', now()) + interval '16 hours 30 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000000405',
    '00000000-0000-4000-8000-000000000001',
    'Prayer corner reset',
    'Open the windows, set out Bibles, and light the room softly before devotion.',
    'general',
    '19:40',
    'daily',
    'medium',
    'rotation',
    current_date,
    1,
    null,
    1,
    '00000000-0000-4000-8000-000000000202',
    date_trunc('day', now()) + interval '19 hours 40 minutes'
  )
on conflict (id) do nothing;

insert into public.duty_rotation_members (family_id, duty_id, member_id, position)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000203', 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000202', 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000201', 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000204', 3),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000202', 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000201', 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000204', 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000203', 3),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000203', 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000204', 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000201', 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000202', 3),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000202', 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000203', 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000204', 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000201', 3)
on conflict (duty_id, member_id) do update
set
  position = excluded.position,
  is_paused = false;

insert into public.duty_assignments (
  id,
  family_id,
  duty_id,
  assigned_member_id,
  title,
  description,
  due_at,
  recurrence_snapshot,
  urgency,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000202',
    'Dishwashing duty',
    'Yesterday''s sink reset is still pending and needs to be finished before lunch.',
    date_trunc('day', now()) - interval '3 hours 30 minutes',
    'daily',
    'high',
    'pending'
  ),
  (
    '00000000-0000-4000-8000-000000000502',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000203',
    'Dinner cooking',
    'Cook rice and beans for tonight and start prep one hour before serving.',
    date_trunc('day', now()) + interval '18 hours',
    'daily',
    'high',
    'pending'
  ),
  (
    '00000000-0000-4000-8000-000000000503',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000403',
    '00000000-0000-4000-8000-000000000204',
    'Living room reset',
    'Prepare the room for the evening gathering and leave the cushions arranged.',
    date_trunc('day', now()) + interval '19 hours 15 minutes',
    'daily',
    'medium',
    'pending'
  ),
  (
    '00000000-0000-4000-8000-000000000504',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000404',
    '00000000-0000-4000-8000-000000000201',
    'Laundry fold',
    'Fold the clean basket and place outfits for tomorrow in each room.',
    date_trunc('day', now()) + interval '16 hours 30 minutes',
    'weekdays',
    'medium',
    'pending'
  )
on conflict (id) do nothing;

insert into public.devotion_schedule (
  id,
  family_id,
  leader_member_id,
  scheduled_for,
  start_time,
  bible_reading,
  topic,
  notes,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000202',
    current_date,
    '20:00',
    'Psalm 121',
    'God keeps our going out and our coming in',
    'Keep space for a short prayer round after the reading.',
    'planned'
  ),
  (
    '00000000-0000-4000-8000-000000000602',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000203',
    current_date + 1,
    '20:00',
    'Matthew 5:14-16',
    'Let your light shine',
    'Leah will choose one family gratitude prompt.',
    'planned'
  )
on conflict (id) do nothing;

insert into public.meals (
  id,
  family_id,
  scheduled_for,
  title,
  cook_member_id,
  ingredients,
  notes,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000001',
    current_date,
    'Rice and beans',
    '00000000-0000-4000-8000-000000000203',
    '["Rice","Beans","Tomatoes","Carrots","Onions"]'::jsonb,
    'Set the beans to boil by 4:30 PM.',
    'planned'
  ),
  (
    '00000000-0000-4000-8000-000000000702',
    '00000000-0000-4000-8000-000000000001',
    current_date + 1,
    'Chicken stir-fry',
    '00000000-0000-4000-8000-000000000202',
    '["Chicken","Bell peppers","Soy sauce","Rice","Garlic"]'::jsonb,
    'Prep the vegetables during the afternoon break.',
    'planned'
  )
on conflict (id) do nothing;

insert into public.shopping_items (
  id,
  family_id,
  name,
  category,
  urgency,
  added_by_member_id
)
values
  ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000001', 'Milk', 'Breakfast', 'high', '00000000-0000-4000-8000-000000000204'),
  ('00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000001', 'Laundry detergent', 'Cleaning', 'critical', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-000000000001', 'Tomatoes', 'Produce', 'medium', '00000000-0000-4000-8000-000000000203')
on conflict (id) do nothing;

insert into public.notifications (
  id,
  family_id,
  related_type,
  title,
  body,
  severity,
  channel,
  state,
  scheduled_for
)
values
  (
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000001',
    'devotion',
    'Tonight''s devotion has a leader',
    'Daniel is leading devotion this evening. Notes and Bible reading are already set.',
    'gentle',
    'in-app',
    'upcoming',
    date_trunc('day', now()) + interval '20 hours'
  ),
  (
    '00000000-0000-4000-8000-000000000902',
    '00000000-0000-4000-8000-000000000001',
    'shopping',
    'Shopping list needs attention',
    'Laundry detergent and milk are both marked urgent for the next restock run.',
    'important',
    'in-app',
    'due-soon',
    date_trunc('day', now()) + interval '17 hours'
  )
on conflict (id) do nothing;

insert into public.completion_logs (
  id,
  family_id,
  member_id,
  assignment_type,
  assignment_id,
  outcome,
  notes
)
values
  (
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000203',
    'duty',
    '00000000-0000-4000-8000-000000000503',
    'completed',
    'Living room was reset before devotion.'
  ),
  (
    '00000000-0000-4000-8000-000000001002',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201',
    'meal',
    '00000000-0000-4000-8000-000000000701',
    'completed',
    'Dinner was ready on time.'
  )
on conflict (id) do nothing;

insert into public.change_requests (
  id,
  family_id,
  requested_by_member_id,
  requested_for_member_id,
  request_type,
  target_type,
  target_id,
  title,
  details,
  proposed_changes,
  status
)
values
  (
    '00000000-0000-4000-8000-000000001101',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000204',
    'duty-swap',
    'duty-assignment',
    '00000000-0000-4000-8000-000000000502',
    'Swap dinner cooking with Micah',
    'Leah has an evening school commitment and is requesting a swap for tonight''s cooking assignment.',
    '{"assignedTo":"00000000-0000-4000-8000-000000000204"}'::jsonb,
    'pending'
  )
on conflict (id) do nothing;

insert into public.audit_logs (
  id,
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
values
  (
    '00000000-0000-4000-8000-000000001201',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000101',
    'parent',
    'settings',
    '00000000-0000-4000-8000-000000000301',
    'settings-update',
    'Reminder settings updated by Grace',
    '{"dueSoonMinutes":45,"escalationMinutes":20}'::jsonb,
    '{"dueSoonMinutes":60,"escalationMinutes":30}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000001202',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000202',
    'co-admin',
    'meal',
    '00000000-0000-4000-8000-000000000701',
    'reassign',
    'Daniel reassigned tonight''s meal to Leah',
    '{"cook_member_id":"00000000-0000-4000-8000-000000000201"}'::jsonb,
    '{"cook_member_id":"00000000-0000-4000-8000-000000000203"}'::jsonb
  )
on conflict (id) do nothing;
