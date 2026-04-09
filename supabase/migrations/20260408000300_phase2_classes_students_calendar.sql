alter table public.students
  add column if not exists is_active boolean not null default true;

alter table public.classes
  add column if not exists course_type text not null default 'turma_pequena',
  add column if not exists materials_included boolean not null default false,
  add column if not exists materials_list text,
  add column if not exists certificate_enabled boolean not null default false,
  add column if not exists duration_hours integer;

alter table public.classes
  drop constraint if exists classes_course_type_check;

alter table public.classes
  add constraint classes_course_type_check
    check (
      course_type in (
        'vip',
        'turma_pequena',
        'workshop',
        'formacao_tecnica',
        'formacao_instrutora'
      )
    );

create table if not exists public.class_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  attendance_date date not null default current_date,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_active boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.class_attendance_checkins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_attendance_sessions(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  enrollment_id uuid not null references public.class_enrollments(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique(session_id, enrollment_id)
);

create index if not exists idx_classes_workspace_starts_at
  on public.classes(workspace_id, starts_at);

create index if not exists idx_students_workspace_full_name
  on public.students(workspace_id, full_name);

create index if not exists idx_class_enrollments_workspace_class
  on public.class_enrollments(workspace_id, class_id);

create index if not exists idx_class_payments_workspace_paid_at
  on public.class_payments(workspace_id, paid_at);

create index if not exists idx_class_costs_workspace_incurred_at
  on public.class_costs(workspace_id, incurred_at);

create index if not exists idx_attendance_sessions_class_date
  on public.class_attendance_sessions(class_id, attendance_date desc);

create index if not exists idx_attendance_checkins_session
  on public.class_attendance_checkins(session_id, checked_in_at desc);

alter table public.class_attendance_sessions enable row level security;
alter table public.class_attendance_checkins enable row level security;

drop policy if exists "Acesso por workspace" on public.class_attendance_sessions;

create policy "Acesso por workspace"
  on public.class_attendance_sessions for all
  using (
    workspace_id in (
      select id from public.workspaces where owner_user_id = auth.uid()
    )
  )
  with check (
    workspace_id in (
      select id from public.workspaces where owner_user_id = auth.uid()
    )
  );

drop policy if exists "Acesso por workspace" on public.class_attendance_checkins;

create policy "Acesso por workspace"
  on public.class_attendance_checkins for all
  using (
    class_id in (
      select id
      from public.classes
      where workspace_id in (
        select id from public.workspaces where owner_user_id = auth.uid()
      )
    )
  )
  with check (
    class_id in (
      select id
      from public.classes
      where workspace_id in (
        select id from public.workspaces where owner_user_id = auth.uid()
      )
    )
  );

create or replace function public.get_public_attendance_session(p_token text)
returns table (
  session_id uuid,
  class_id uuid,
  class_title text,
  attendance_date date,
  is_active boolean
)
language sql
security definer
set search_path = public
as $$
  select
    sessions.id,
    sessions.class_id,
    classes.title,
    sessions.attendance_date,
    sessions.is_active
  from public.class_attendance_sessions as sessions
  inner join public.classes on classes.id = sessions.class_id
  where sessions.token = p_token
  order by sessions.started_at desc
  limit 1;
$$;

create or replace function public.get_public_attendance_roster(p_token text)
returns table (
  enrollment_id uuid,
  student_id uuid,
  student_name text,
  checked_in_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    enrollments.id,
    students.id,
    students.full_name,
    checkins.checked_in_at
  from public.class_attendance_sessions as sessions
  inner join public.class_enrollments as enrollments on enrollments.class_id = sessions.class_id
  inner join public.students on students.id = enrollments.student_id
  left join public.class_attendance_checkins as checkins
    on checkins.session_id = sessions.id and checkins.enrollment_id = enrollments.id
  where sessions.token = p_token
    and sessions.is_active = true
    and enrollments.status in ('confirmada', 'aguardando_pagamento', 'compareceu', 'faltou')
  order by students.full_name asc;
$$;

create or replace function public.submit_public_attendance_checkin(
  p_token text,
  p_enrollment_id uuid
)
returns table (
  session_id uuid,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_class_id uuid;
  v_checked_in_at timestamptz;
begin
  select sessions.id, sessions.class_id
  into v_session_id, v_class_id
  from public.class_attendance_sessions as sessions
  where sessions.token = p_token
    and sessions.is_active = true
  order by sessions.started_at desc
  limit 1;

  if v_session_id is null then
    raise exception 'Sessão de chamada não encontrada.';
  end if;

  if not exists (
    select 1
    from public.class_enrollments
    where id = p_enrollment_id
      and class_id = v_class_id
  ) then
    raise exception 'Inscrição inválida para esta chamada.';
  end if;

  insert into public.class_attendance_checkins (session_id, class_id, enrollment_id)
  values (v_session_id, v_class_id, p_enrollment_id)
  on conflict (session_id, enrollment_id)
  do update set checked_in_at = now()
  returning class_attendance_checkins.checked_in_at into v_checked_in_at;

  update public.class_enrollments
  set attendance_marked_at = v_checked_in_at
  where id = p_enrollment_id;

  return query
  select v_session_id, v_checked_in_at;
end;
$$;

grant execute on function public.get_public_attendance_session(text) to anon, authenticated;
grant execute on function public.get_public_attendance_roster(text) to anon, authenticated;
grant execute on function public.submit_public_attendance_checkin(text, uuid) to anon, authenticated;
