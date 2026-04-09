alter table public.profiles
  add column if not exists phone text;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  workspace_id uuid;
begin
  begin
    insert into public.profiles (id, full_name, phone)
    values (
      new.id,
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'phone'), '')
    )
    on conflict (id) do update
    set
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      phone = coalesce(excluded.phone, public.profiles.phone);
  exception
    when others then
      raise warning 'handle_new_user: falha ao criar/atualizar profile para %: %', new.id, sqlerrm;
  end;

  begin
    select id
    into workspace_id
    from public.workspaces
    where owner_user_id = new.id
    limit 1;

    if workspace_id is null then
      insert into public.workspaces (name, owner_user_id)
      values (
        coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Meu Negócio'),
        new.id
      )
      returning id into workspace_id;
    end if;
  exception
    when others then
      workspace_id := null;
      raise warning 'handle_new_user: falha ao criar/obter workspace para %: %', new.id, sqlerrm;
  end;

  if workspace_id is not null then
    begin
      insert into public.workspace_settings (workspace_id)
      values (workspace_id)
      on conflict (workspace_id) do nothing;
    exception
      when others then
        raise warning 'handle_new_user: falha ao criar workspace_settings para %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, full_name, phone)
select
  users.id,
  nullif(trim(users.raw_user_meta_data->>'full_name'), ''),
  nullif(trim(users.raw_user_meta_data->>'phone'), '')
from auth.users as users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
);

insert into public.workspaces (name, owner_user_id)
select
  coalesce(nullif(trim(users.raw_user_meta_data->>'full_name'), ''), 'Meu Negócio'),
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
