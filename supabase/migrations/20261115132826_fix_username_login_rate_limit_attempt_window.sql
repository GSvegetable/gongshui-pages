-- Correct the initial counter so exactly ten attempts are allowed per 15-minute window.
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
  values (p_subject_hash, v_now, 0, v_now)
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
