-- Username login throttling uses a keyed digest so raw usernames are not stored.
create table if not exists private.username_login_rate_limits (
  subject_hash text primary key check (subject_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists username_login_rate_limits_updated_idx
  on private.username_login_rate_limits(updated_at);
alter table private.username_login_rate_limits enable row level security;
revoke all on table private.username_login_rate_limits from public, anon, authenticated;

create or replace function public.consume_username_login_rate_limit(p_subject_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_row private.username_login_rate_limits%rowtype;
  v_now timestamptz := now();
  v_allowed boolean := true;
  v_retry integer := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid rate-limit subject' using errcode = '22023';
  end if;
  insert into private.username_login_rate_limits(subject_hash, window_started_at, attempt_count, updated_at)
  values (p_subject_hash, v_now, 1, v_now)
  on conflict (subject_hash) do nothing;
  select * into v_row from private.username_login_rate_limits
   where subject_hash = p_subject_hash for update;
  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    v_allowed := false;
    v_retry := greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer);
  elsif v_row.window_started_at <= v_now - interval '15 minutes' then
    update private.username_login_rate_limits
       set window_started_at = v_now, attempt_count = 1, blocked_until = null, updated_at = v_now
     where subject_hash = p_subject_hash;
  else
    update private.username_login_rate_limits
       set attempt_count = attempt_count + 1,
           blocked_until = case when attempt_count + 1 > 10 then v_now + interval '15 minutes' else null end,
           updated_at = v_now
     where subject_hash = p_subject_hash
     returning * into v_row;
    if v_row.attempt_count > 10 then
      v_allowed := false;
      v_retry := 900;
    end if;
  end if;
  delete from private.username_login_rate_limits
   where updated_at < v_now - interval '24 hours';
  return jsonb_build_object('allowed', v_allowed, 'retry_after_seconds', v_retry);
end;
$function$;
revoke all on function public.consume_username_login_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_username_login_rate_limit(text) to service_role;

-- Resolve directly to the account email in one privileged database lookup.
create or replace function public.resolve_username_email(p_username text)
returns text language sql security definer set search_path = ''
as $function$
  select u.email from private.account_usernames a
  join auth.users u on u.id = a.user_id
  where a.username_key = lower(trim(coalesce(p_username, '')))
    and u.deleted_at is null
  limit 1;
$function$;
revoke all on function public.resolve_username_email(text) from public, anon, authenticated;
grant execute on function public.resolve_username_email(text) to service_role;

do $block$
begin
  if exists (select 1 from cron.job where jobname = 'username-login-rate-limit-retention') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'username-login-rate-limit-retention';
  end if;
  perform cron.schedule(
    'username-login-rate-limit-retention',
    '15 * * * *',
    'DELETE FROM private.username_login_rate_limits WHERE updated_at < now() - interval ''24 hours'''
  );
end;
$block$;
