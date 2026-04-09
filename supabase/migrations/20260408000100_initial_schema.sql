create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Usuária vê seu próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuária cria seu próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Usuária atualiza seu próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.workspaces enable row level security;

create policy "Usuária vê seu workspace"
  on public.workspaces for select
  using (owner_user_id = auth.uid());

create policy "Usuária cria seu workspace"
  on public.workspaces for insert
  with check (owner_user_id = auth.uid());

create policy "Usuária atualiza seu workspace"
  on public.workspaces for update
  using (owner_user_id = auth.uid());

create table public.students (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  instagram text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.students enable row level security;

create policy "Acesso por workspace"
  on public.students for all
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

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  title text not null,
  course_name text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_name text,
  location_address text,
  capacity integer not null default 10,
  status text not null default 'open'
    check (status in ('draft','open','closed','completed','cancelled')),
  price_per_student numeric(10,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.classes enable row level security;

create policy "Acesso por workspace"
  on public.classes for all
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

create table public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  status text not null default 'interessada'
    check (
      status in (
        'interessada','aguardando_pagamento','confirmada',
        'lista_espera','cancelada','compareceu','faltou'
      )
    ),
  sale_price numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  balance_due numeric(10,2) not null default 0,
  payment_status text not null default 'nao_pago'
    check (payment_status in ('nao_pago','parcial','pago')),
  enrolled_at timestamptz default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  attendance_marked_at timestamptz,
  notes text,
  unique(class_id, student_id)
);

alter table public.class_enrollments enable row level security;

create policy "Acesso por workspace"
  on public.class_enrollments for all
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

create table public.class_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  class_enrollment_id uuid references public.class_enrollments(id) on delete cascade,
  class_id uuid references public.classes(id),
  student_id uuid references public.students(id),
  amount numeric(10,2) not null,
  payment_type text not null
    check (payment_type in ('deposito','parcela','saldo_final','ajuste','reembolso')),
  payment_method text not null
    check (payment_method in ('pix','dinheiro','cartao','transferencia','outro')),
  paid_at timestamptz default now(),
  status text not null default 'paid'
    check (status in ('paid','pending','cancelled')),
  notes text,
  created_at timestamptz default now()
);

alter table public.class_payments enable row level security;

create policy "Acesso por workspace"
  on public.class_payments for all
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

create table public.class_costs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  category text not null
    check (
      category in (
        'materiais','aluguel','coffee','certificado',
        'kit','transporte','marketing','outros'
      )
    ),
  description text,
  amount numeric(10,2) not null,
  incurred_at date default current_date,
  status text not null default 'previsto'
    check (status in ('previsto','realizado')),
  notes text,
  created_at timestamptz default now()
);

alter table public.class_costs enable row level security;

create policy "Acesso por workspace"
  on public.class_costs for all
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

create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  currency text default 'BRL',
  timezone text default 'America/Sao_Paulo',
  default_class_capacity integer default 10,
  default_deposit_percentage numeric(5,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.workspace_settings enable row level security;

create policy "Acesso por workspace"
  on public.workspace_settings for all
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

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_workspaces_updated_at
  before update on public.workspaces
  for each row execute procedure public.set_updated_at();

create trigger set_students_updated_at
  before update on public.students
  for each row execute procedure public.set_updated_at();

create trigger set_classes_updated_at
  before update on public.classes
  for each row execute procedure public.set_updated_at();

create trigger set_workspace_settings_updated_at
  before update on public.workspace_settings
  for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
declare
  workspace_id uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');

  insert into public.workspaces (name, owner_user_id)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', 'Meu Negócio'),
    new.id
  )
  returning id into workspace_id;

  insert into public.workspace_settings (workspace_id)
  values (workspace_id);

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
