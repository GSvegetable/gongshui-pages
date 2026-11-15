-- Apply the active-session check inside SECURITY DEFINER RPCs too.
-- RLS alone cannot protect functions that intentionally bypass RLS.

create or replace function public.is_developer_whitelisted(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, private
as $function$
  select exists (
    select 1
    from auth.users u
    join private.developer_allowlist a
      on a.email = lower(coalesce(u.email, ''))
    where u.id = uid
      and (uid is distinct from auth.uid() or private.is_session_active())
  );
$function$;

create or replace function public.is_high_risk(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, private
as $function$
  select private.is_session_active()
    and not public.is_developer_whitelisted(auth.uid())
    and exists (
      select 1 from public.signup_risk r
      where r.user_id = auth.uid() and r.high_risk
    );
$function$;

create or replace function public.list_my_linked_accounts()
returns table(user_id uuid, public_id character varying, username text, is_current boolean)
language sql
security definer
set search_path = ''
as $function$
  select p.user_id, p.public_id,
    coalesce(
      (select a.username from private.account_usernames a where a.user_id=p.user_id order by a.created_at limit 1),
      split_part(u.email,'@',1)
    ) as username,
    p.user_id=(select auth.uid()) as is_current
  from private.account_profiles p
  join auth.users u on u.id=p.user_id
  where private.is_session_active()
    and p.group_id=(select mine.group_id from private.account_profiles mine where mine.user_id=(select auth.uid()))
  order by p.created_at;
$function$;

create or replace function public.list_my_usernames()
returns table(username text, created_at timestamptz)
language sql
security definer
set search_path = ''
as $function$
  select a.username, a.created_at
  from private.account_usernames a
  where private.is_session_active()
    and a.user_id = (select auth.uid())
  order by a.created_at;
$function$;

create or replace function public.add_my_username(p_username text)
returns table(username text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_username text := trim(coalesce(p_username, ''));
  v_count integer;
begin
  if v_uid is null or not private.is_session_active() then
    raise exception 'active session required' using errcode = '28000';
  end if;
  if v_username !~ '^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$' then
    raise exception 'username must be 4-9 characters: letters, numbers, underscore or hyphen' using errcode = '22023';
  end if;

  perform 1 from auth.users where id = v_uid for update;
  select count(*) into v_count from private.account_usernames where user_id = v_uid;
  if v_count >= 2 then raise exception 'maximum two usernames per account' using errcode = '22023'; end if;

  insert into private.account_usernames(username_key, username, user_id)
  values (lower(v_username), v_username, v_uid);
  return query select v_username;
exception
  when unique_violation then
    raise exception 'username already taken' using errcode = '23505';
end;
$function$;

create or replace function public.update_my_username(p_old_username text, p_new_username text)
returns table(username text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_old text := trim(coalesce(p_old_username,''));
  v_new text := trim(coalesce(p_new_username,''));
begin
  if v_uid is null or not private.is_session_active() then
    raise exception 'active session required' using errcode='28000';
  end if;
  if v_new !~ '^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$' then
    raise exception 'invalid username' using errcode='22023';
  end if;
  update private.account_usernames set username=v_new, username_key=lower(v_new)
   where user_id=v_uid and username_key=lower(v_old);
  if not found then raise exception 'username not found' using errcode='P0002'; end if;
  return query select v_new;
exception when unique_violation then raise exception 'username already taken' using errcode='23505';
end;
$function$;

create or replace function public.apply_signup_risk()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, private
as $function$
declare
  v_uid uuid := auth.uid();
  v_fp text;
  v_fp_count integer := 0;
  v_risk boolean := false;
begin
  if v_uid is null or not private.is_session_active() then
    raise exception 'active session required' using errcode = '28000';
  end if;
  if public.is_developer_whitelisted(v_uid) then
    update public.signup_risk set high_risk = false where user_id = v_uid;
    return jsonb_build_object('fingerprint_count',0,'ip_count',0,'high_risk',false,'whitelisted',true);
  end if;
  select fingerprint into v_fp from public.signup_risk
   where user_id = v_uid order by created_at desc limit 1;
  if v_fp is null then
    return jsonb_build_object('fingerprint_count',0,'ip_count',0,'high_risk',false);
  end if;
  if v_fp <> 'unknown' then
    select count(*) into v_fp_count from public.signup_risk
     where fingerprint = v_fp
       and created_at > now() - interval '24 hours'
       and not public.is_developer_whitelisted(user_id);
  end if;
  v_risk := v_fp <> 'unknown'
    and v_fp_count > (select (risk_limits->>'fingerprint')::int from public.risk_limits());
  update public.signup_risk set high_risk = v_risk where user_id = v_uid;
  return jsonb_build_object('fingerprint_count',v_fp_count,'ip_count',0,'high_risk',v_risk);
end;
$function$;

create or replace function public.register_signup_risk(p_fingerprint text, p_username text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, private
as $function$
declare
  v_uid uuid := auth.uid();
  v_fp text;
  v_fp_count integer := 0;
  v_risk boolean := false;
begin
  if v_uid is null or not private.is_session_active() then
    raise exception 'active session required' using errcode = '28000';
  end if;
  if public.is_developer_whitelisted(v_uid) then
    update public.signup_risk set high_risk = false where user_id = v_uid;
    return jsonb_build_object('fingerprint_count',0,'ip_count',0,'high_risk',false,'whitelisted',true);
  end if;
  insert into public.signup_risk (user_id, username, fingerprint)
    values (v_uid, p_username, coalesce(nullif(p_fingerprint, ''), 'unknown'))
    on conflict (user_id) do nothing;
  select fingerprint into v_fp from public.signup_risk
    where user_id = v_uid order by created_at desc limit 1;
  if v_fp <> 'unknown' then
    select count(*) into v_fp_count from public.signup_risk
      where fingerprint = v_fp
        and created_at > now() - interval '24 hours'
        and not public.is_developer_whitelisted(user_id);
  end if;
  v_risk := v_fp <> 'unknown'
    and v_fp_count > (select (risk_limits->>'fingerprint')::int from public.risk_limits());
  update public.signup_risk set high_risk = v_risk where user_id = v_uid;
  return jsonb_build_object('fingerprint_count',v_fp_count,'ip_count',0,'high_risk',v_risk);
end;
$function$;

create or replace function public.my_risk_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, private
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not private.is_session_active() then
    raise exception 'active session required' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'high_risk', case
      when public.is_developer_whitelisted(v_uid) then false
      else coalesce((select r.high_risk from public.signup_risk r where r.user_id = v_uid order by r.created_at desc limit 1), false)
    end,
    'registered', exists (select 1 from public.signup_risk r where r.user_id = v_uid),
    'whitelisted', public.is_developer_whitelisted(v_uid)
  );
end;
$function$;
