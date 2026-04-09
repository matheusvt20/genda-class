drop policy if exists "Usuária cria seu próprio perfil" on public.profiles;

create policy "Usuária cria seu próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Usuária cria seu workspace" on public.workspaces;

create policy "Usuária cria seu workspace"
  on public.workspaces for insert
  with check (owner_user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger as $$
declare
  workspace_id uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, full_name)
select
  users.id,
  users.raw_user_meta_data->>'full_name'
from auth.users as users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
);

insert into public.workspaces (name, owner_user_id)
select
  coalesce(users.raw_user_meta_data->>'full_name', 'Meu Negócio'),
  users.id
from auth.users as users
where not exists (
  select 1
  from public.workspaces
  where workspaces.owner_user_id = users.id
);

insert into public.workspace_settings (workspace_id)
select workspaces.id
from public.workspaces
where not exists (
  select 1
  from public.workspace_settings
  where workspace_settings.workspace_id = workspaces.id
);
