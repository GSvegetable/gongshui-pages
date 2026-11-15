-- Account profiles and linked account groups.
create schema if not exists private;
-- Every auth user receives a random 11-digit public ID at creation.
create table if not exists private.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_id varchar(11) not null unique check (public_id ~ '^[0-9]{11}$'),
  group_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index if not exists account_profiles_group_id_idx on private.account_profiles(group_id);
alter table private.account_profiles enable row level security;
revoke all on private.account_profiles from public, anon, authenticated;

create or replace function private.generate_public_account_id()
returns varchar language plpgsql volatile set search_path = ''
as $$
declare v_id varchar(11);
begin
  loop
    v_id := translate(substr(replace(gen_random_uuid()::text, '-', ''), 1, 11), 'abcdef', '456789');
    exit when not exists (select 1 from private.account_profiles where public_id = v_id);
  end loop;
  return v_id;
end;
$$;

create or replace function private.handle_new_auth_user_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into private.account_profiles(user_id, public_id, group_id)
  values (new.id, private.generate_public_account_id(), gen_random_uuid())
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute function private.handle_new_auth_user_profile();

insert into private.account_profiles(user_id, public_id, group_id)
select u.id, private.generate_public_account_id(), gen_random_uuid()
from auth.users u left join private.account_profiles p on p.user_id=u.id
where p.user_id is null;

create or replace function public.update_my_username(p_old_username text, p_new_username text)
returns table(username text)
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_old text := trim(coalesce(p_old_username,'')); v_new text := trim(coalesce(p_new_username,''));
begin
  if v_uid is null then raise exception 'authentication required' using errcode='28000'; end if;
  if v_new !~ '^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$' then raise exception 'invalid username' using errcode='22023'; end if;
  update private.account_usernames set username=v_new, username_key=lower(v_new)
   where user_id=v_uid and username_key=lower(v_old);
  if not found then raise exception 'username not found' using errcode='P0002'; end if;
  return query select v_new;
exception when unique_violation then raise exception 'username already taken' using errcode='23505';
end;
$$;
revoke all on function public.update_my_username(text,text) from public, anon;
grant execute on function public.update_my_username(text,text) to authenticated;

create or replace function public.list_my_linked_accounts()
returns table(user_id uuid, public_id varchar, username text, is_current boolean)
language sql security definer set search_path = ''
as $$
  select p.user_id, p.public_id,
    coalesce((select a.username from private.account_usernames a where a.user_id=p.user_id order by a.created_at limit 1),
             split_part(u.email,'@',1)) as username,
    p.user_id=(select auth.uid()) as is_current
  from private.account_profiles p join auth.users u on u.id=p.user_id
  where p.group_id=(select mine.group_id from private.account_profiles mine where mine.user_id=(select auth.uid()))
  order by p.created_at;
$$;
revoke all on function public.list_my_linked_accounts() from public, anon;
grant execute on function public.list_my_linked_accounts() to authenticated;

create or replace function public.attach_accounts_to_group(p_current_user_id uuid, p_target_user_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_group uuid; v_target_group uuid; v_count integer;
begin
  if p_current_user_id is null or p_target_user_id is null or p_current_user_id=p_target_user_id then
    raise exception 'invalid account' using errcode='22023';
  end if;
  select group_id into v_group from private.account_profiles where user_id=p_current_user_id;
  if v_group is null then raise exception 'account profile missing' using errcode='P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_group::text, 0));
  select group_id into v_target_group from private.account_profiles where user_id=p_target_user_id for update;
  if v_target_group is null then raise exception 'account profile missing' using errcode='P0002'; end if;
  if v_group=v_target_group then return v_group; end if;
  select count(*) into v_count from private.account_profiles where group_id=v_group;
  if v_count >= 9 then raise exception 'maximum nine accounts' using errcode='22023'; end if;
  update private.account_profiles set group_id=v_group where user_id=p_target_user_id;
  return v_group;
end;
$$;
revoke all on function public.attach_accounts_to_group(uuid,uuid) from public, anon, authenticated;
grant execute on function public.attach_accounts_to_group(uuid,uuid) to service_role;
