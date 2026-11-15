-- Username aliases: 4–9 characters, unique case-insensitively, max two per account.
create schema if not exists private;

create table if not exists private.account_usernames (
  username_key text primary key,
  username text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint account_usernames_length check (char_length(username) between 4 and 9),
  constraint account_usernames_format check (username ~ '^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$')
);
create index if not exists account_usernames_user_id_idx on private.account_usernames(user_id);
alter table private.account_usernames enable row level security;

create or replace function private.handle_new_auth_user_username()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_username text;
begin
  v_username := trim(coalesce(new.raw_user_meta_data->>'username', ''));
  if v_username <> '' then
    if v_username !~ '^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$' then
      raise exception 'username must be 4-9 characters: letters, numbers, underscore or hyphen' using errcode = '22023';
    end if;
    insert into private.account_usernames(username_key, username, user_id)
    values (lower(v_username), v_username, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_username on auth.users;
create trigger on_auth_user_created_username after insert on auth.users
for each row execute function private.handle_new_auth_user_username();

create or replace function public.list_my_usernames()
returns table(username text, created_at timestamptz)
language sql security definer set search_path = ''
as $$
  select a.username, a.created_at from private.account_usernames a
  where a.user_id = (select auth.uid()) order by a.created_at;
$$;

create or replace function public.add_my_username(p_username text)
returns table(username text)
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_username text := trim(coalesce(p_username, '')); v_count integer;
begin
  if v_uid is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if v_username !~ '^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$' then
    raise exception 'username must be 4-9 characters: letters, numbers, underscore or hyphen' using errcode = '22023';
  end if;
  perform 1 from auth.users where id = v_uid for update;
  select count(*) into v_count from private.account_usernames where user_id = v_uid;
  if v_count >= 2 then raise exception 'maximum two usernames per account' using errcode = '22023'; end if;
  insert into private.account_usernames(username_key, username, user_id) values (lower(v_username), v_username, v_uid);
  return query select v_username;
exception when unique_violation then
  raise exception 'username already taken' using errcode = '23505';
end;
$$;

create or replace function public.resolve_username_user_id(p_username text)
returns uuid language sql security definer set search_path = ''
as $$
  select user_id from private.account_usernames where username_key = lower(trim(coalesce(p_username, ''))) limit 1;
$$;

revoke all on schema private from public, anon, authenticated;
revoke all on private.account_usernames from public, anon, authenticated;
revoke all on function public.resolve_username_user_id(text) from public, anon, authenticated;
grant execute on function public.resolve_username_user_id(text) to service_role;
revoke all on function public.list_my_usernames() from public, anon;
grant execute on function public.list_my_usernames() to authenticated;
revoke all on function public.add_my_username(text) from public, anon;
grant execute on function public.add_my_username(text) to authenticated;
