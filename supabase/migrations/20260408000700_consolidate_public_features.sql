alter table public.classes
  add column if not exists is_public boolean not null default false,
  add column if not exists slug text,
  add column if not exists sales_headline text,
  add column if not exists sales_description text,
  add column if not exists sales_highlights text[] default '{}'::text[],
  add column if not exists cover_image_url text,
  add column if not exists deposit_amount numeric(10,2) not null default 0,
  add column if not exists duration_days integer not null default 1,
  add column if not exists teacher_photo_url text,
  add column if not exists sales_video_url text,
  add column if not exists sales_gallery text[] default '{}'::text[],
  add column if not exists sales_testimonials jsonb default '[]'::jsonb,
  add column if not exists teacher_name text,
  add column if not exists teacher_bio text;

alter table public.workspace_settings
  add column if not exists school_name text,
  add column if not exists school_phone text,
  add column if not exists school_instagram text,
  add column if not exists whatsapp_number text,
  add column if not exists pix_key text,
  add column if not exists pix_key_type text,
  add column if not exists pix_holder_name text;

alter table public.workspace_settings
  drop constraint if exists workspace_settings_pix_key_type_check;

alter table public.workspace_settings
  add constraint workspace_settings_pix_key_type_check
    check (
      pix_key_type is null
      or pix_key_type in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')
    );

create table if not exists public.class_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  full_name text not null,
  phone text not null,
  instagram text,
  how_found text,
  status text not null default 'novo',
  pix_status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.class_leads
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists class_id uuid references public.classes(id) on delete cascade,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists instagram text,
  add column if not exists how_found text,
  add column if not exists status text not null default 'novo',
  add column if not exists pix_status text not null default 'pendente',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.class_leads
set pix_status = 'pendente'
where pix_status is null;

update public.class_leads
set status = 'novo'
where status is null;

alter table public.class_leads
  alter column workspace_id set not null,
  alter column class_id set not null,
  alter column full_name set not null,
  alter column phone set not null,
  alter column status set not null,
  alter column pix_status set not null;

alter table public.class_leads
  drop constraint if exists class_leads_status_check;

alter table public.class_leads
  add constraint class_leads_status_check
    check (status in ('novo', 'inscrito', 'rejeitado'));

alter table public.class_leads
  drop constraint if exists class_leads_pix_status_check;

alter table public.class_leads
  add constraint class_leads_pix_status_check
    check (pix_status in ('pendente', 'enviado', 'confirmado', 'rejeitado'));

create index if not exists idx_classes_slug on public.classes(slug);
create index if not exists idx_students_workspace_phone on public.students(workspace_id, phone);
create index if not exists idx_class_leads_workspace_created_at on public.class_leads(workspace_id, created_at desc);
create index if not exists idx_class_leads_class_created_at on public.class_leads(class_id, created_at desc);

alter table public.class_leads enable row level security;

revoke all on public.class_leads from public;
revoke all on public.class_leads from anon;
revoke all on public.class_leads from authenticated;

grant select, insert, update, delete on public.class_leads to authenticated;
grant insert on public.class_leads to anon;

drop policy if exists "Leads autenticados por workspace - select" on public.class_leads;
create policy "Leads autenticados por workspace - select"
  on public.class_leads for select
  to authenticated
  using (
    workspace_id in (
      select id
      from public.workspaces
      where owner_user_id = auth.uid()
    )
  );

drop policy if exists "Leads autenticados por workspace - insert" on public.class_leads;
create policy "Leads autenticados por workspace - insert"
  on public.class_leads for insert
  to authenticated
  with check (
    workspace_id in (
      select id
      from public.workspaces
      where owner_user_id = auth.uid()
    )
  );

drop policy if exists "Leads autenticados por workspace - update" on public.class_leads;
create policy "Leads autenticados por workspace - update"
  on public.class_leads for update
  to authenticated
  using (
    workspace_id in (
      select id
      from public.workspaces
      where owner_user_id = auth.uid()
    )
  )
  with check (
    workspace_id in (
      select id
      from public.workspaces
      where owner_user_id = auth.uid()
    )
  );

drop policy if exists "Leads autenticados por workspace - delete" on public.class_leads;
create policy "Leads autenticados por workspace - delete"
  on public.class_leads for delete
  to authenticated
  using (
    workspace_id in (
      select id
      from public.workspaces
      where owner_user_id = auth.uid()
    )
  );

drop policy if exists "Leads publicos podem inserir" on public.class_leads;
create policy "Leads publicos podem inserir"
  on public.class_leads for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.classes
      where classes.id = class_leads.class_id
        and classes.workspace_id = class_leads.workspace_id
        and classes.is_public = true
    )
  );

create or replace function public.get_public_class_lead(p_lead_id uuid)
returns table (
  id uuid,
  class_id uuid,
  full_name text,
  phone text,
  instagram text,
  status text,
  pix_status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    leads.id,
    leads.class_id,
    leads.full_name,
    leads.phone,
    leads.instagram,
    leads.status,
    leads.pix_status,
    leads.created_at
  from public.class_leads as leads
  inner join public.classes on classes.id = leads.class_id
  where leads.id = p_lead_id
    and classes.is_public = true
  limit 1;
$$;

create or replace function public.create_public_class_lead(
  p_class_slug text,
  p_full_name text,
  p_phone text,
  p_instagram text default null,
  p_how_found text default null
)
returns table (
  id uuid,
  workspace_id uuid,
  class_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_workspace_id uuid;
  v_class_id uuid;
begin
  select classes.workspace_id, classes.id
  into v_workspace_id, v_class_id
  from public.classes
  where classes.slug = p_class_slug
    and classes.is_public = true
  limit 1;

  if v_class_id is null then
    raise exception 'Turma pública não encontrada.';
  end if;

  insert into public.class_leads (
    workspace_id,
    class_id,
    full_name,
    phone,
    instagram,
    how_found,
    status,
    pix_status
  )
  values (
    v_workspace_id,
    v_class_id,
    trim(p_full_name),
    trim(p_phone),
    nullif(trim(coalesce(p_instagram, '')), ''),
    nullif(trim(coalesce(p_how_found, '')), ''),
    'novo',
    'pendente'
  )
  returning class_leads.id into v_id;

  return query
  select v_id, v_workspace_id, v_class_id;
end;
$$;

create or replace function public.update_public_lead_pix_status(
  p_lead_id uuid,
  p_pix_status text
)
returns table (
  id uuid,
  pix_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_pix_status text;
begin
  if p_pix_status not in ('pendente', 'enviado', 'confirmado', 'rejeitado') then
    raise exception 'Pix status inválido.';
  end if;

  update public.class_leads as leads
  set
    pix_status = p_pix_status,
    updated_at = now()
  from public.classes
  where leads.id = p_lead_id
    and classes.id = leads.class_id
    and classes.is_public = true
  returning leads.id, leads.pix_status
  into v_id, v_pix_status;

  if v_id is null then
    raise exception 'Lead não encontrado.';
  end if;

  return query
  select v_id, v_pix_status;
end;
$$;

grant execute on function public.get_public_class_lead(uuid) to anon, authenticated;
grant execute on function public.create_public_class_lead(text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_public_lead_pix_status(uuid, text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  workspace_id uuid;
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone);

  select id
  into workspace_id
  from public.workspaces
  where owner_user_id = new.id
  limit 1;

  if workspace_id is null then
    insert into public.workspaces (name, owner_user_id)
    values (
      coalesce(new.raw_user_meta_data->>'full_name', 'Meu Negócio'),
      new.id
    )
    returning id into workspace_id;
  end if;

  if workspace_id is not null then
    insert into public.workspace_settings (workspace_id)
    values (workspace_id)
    on conflict (workspace_id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists set_class_leads_updated_at on public.class_leads;
create trigger set_class_leads_updated_at
  before update on public.class_leads
  for each row execute procedure public.set_updated_at();
