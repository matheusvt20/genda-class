alter table public.classes
  add column if not exists duration_days integer not null default 1;

alter table public.classes
  drop constraint if exists classes_duration_days_check;

alter table public.classes
  add constraint classes_duration_days_check
    check (duration_days >= 1);
