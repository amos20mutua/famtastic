alter table public.settings
  add column if not exists devotion_skip_weekdays smallint[] not null default array[0]::smallint[];

comment on column public.settings.devotion_skip_weekdays is
  'Weekdays when family devotion does not occur. Skipped days do not consume the devotion leadership rotation. 0 = Sunday.';
