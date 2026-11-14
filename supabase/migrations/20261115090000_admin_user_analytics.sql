-- Admin analytics and ban status in user directory
create or replace function public.admin_user_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_total bigint;
  v_banned bigint;
  v_risk bigint;
  v_registrations jsonb;
begin
  if not public.is_developer_whitelisted(auth.uid()) then
    raise exception 'ADMIN_ACCESS_DENIED' using errcode = '42501';
  end if;

  select count(*) into v_total from auth.users where deleted_at is null;
  select count(*) into v_banned from auth.users
   where deleted_at is null and banned_until > now();
  select count(*) into v_risk
    from auth.users u
   where u.deleted_at is null
     and exists (select 1 from public.signup_risk r where r.user_id = u.id and r.high_risk);

  with days as (
    select generate_series(
      (now() at time zone 'UTC')::date - 29,
      (now() at time zone 'UTC')::date,
      interval '1 day'
    )::date as day
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('date', to_char(days.day, 'MM-DD'), 'count', counts.total) order by days.day),
    '[]'::jsonb
  )
  into v_registrations
  from days
  left join lateral (
    select count(*)::bigint as total
      from auth.users u
     where u.deleted_at is null
       and u.created_at >= (days.day::timestamp at time zone 'UTC')
       and u.created_at < ((days.day + 1)::timestamp at time zone 'UTC')
  ) counts on true;

  return jsonb_build_object(
    'total', v_total,
    'registration_trend', v_registrations,
    'account_status', jsonb_build_object('available', greatest(v_total - v_banned, 0), 'banned', v_banned),
    'risk_status', jsonb_build_object('normal', greatest(v_total - v_risk, 0), 'high_risk', v_risk)
  );
end;
$$;
revoke all on function public.admin_user_analytics() from public, anon;
grant execute on function public.admin_user_analytics() to authenticated;
