drop function if exists public.admin_user_analytics();

create or replace function public.admin_user_overview(
  p_search text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_total bigint;
  v_today bigint;
  v_week bigint;
  v_active bigint;
  v_unverified bigint;
  v_high_risk bigint;
  v_banned bigint;
  v_registrations jsonb;
  v_filtered bigint;
  v_users jsonb;
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_developer_whitelisted(auth.uid()) then
    raise exception 'ADMIN_ACCESS_DENIED' using errcode = '42501';
  end if;

  select count(*) into v_total from auth.users;
  select count(*) into v_today
    from auth.users
   where created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  select count(*) into v_week from auth.users where created_at >= now() - interval '7 days';
  select count(*) into v_active from auth.users where last_sign_in_at >= now() - interval '7 days';
  select count(*) into v_unverified from auth.users where email_confirmed_at is null;
  select count(*) into v_high_risk
    from auth.users u
   where exists (select 1 from public.signup_risk r where r.user_id = u.id and r.high_risk = true);
  select count(*) into v_banned from auth.users where deleted_at is null and banned_until > now();

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

  select count(*) into v_filtered
    from auth.users u
   where v_search is null
      or coalesce(u.email, '') ilike '%' || v_search || '%'
      or coalesce(u.raw_user_meta_data->>'username', '') ilike '%' || v_search || '%'
      or u.id::text ilike '%' || v_search || '%';

  select coalesce(jsonb_agg(to_jsonb(page_rows)), '[]'::jsonb)
    into v_users
    from (
      select
        u.id,
        u.email,
        coalesce(nullif(u.raw_user_meta_data->>'username', ''), split_part(coalesce(u.email, ''), '@', 1)) as username,
        u.created_at,
        u.updated_at,
        u.email_confirmed_at,
        u.last_sign_in_at,
        u.banned_until,
        coalesce(u.raw_app_meta_data->>'provider', 'email') as provider,
        (select count(*) from public.user_bookmarks b where b.user_id = u.id) as bookmarks_count,
        (select p.updated_at from public.user_preferences p where p.user_id = u.id) as preferences_updated_at,
        exists (select 1 from public.signup_risk r where r.user_id = u.id and r.high_risk) as high_risk
      from auth.users u
      where v_search is null
         or coalesce(u.email, '') ilike '%' || v_search || '%'
         or coalesce(u.raw_user_meta_data->>'username', '') ilike '%' || v_search || '%'
         or u.id::text ilike '%' || v_search || '%'
      order by u.created_at desc
      limit v_limit offset v_offset
    ) as page_rows;

  return jsonb_build_object(
    'stats', jsonb_build_object(
      'total', v_total,
      'today', v_today,
      'last_7_days', v_week,
      'active_7_days', v_active,
      'unverified', v_unverified,
      'high_risk', v_high_risk
    ),
    'analytics', jsonb_build_object(
      'total', v_total,
      'registration_trend', v_registrations,
      'account_status', jsonb_build_object('available', greatest(v_total - v_banned, 0), 'banned', v_banned),
      'risk_status', jsonb_build_object('normal', greatest(v_total - v_high_risk, 0), 'high_risk', v_high_risk)
    ),
    'filtered_total', v_filtered,
    'limit', v_limit,
    'offset', v_offset,
    'users', v_users
  );
end;
$$;

revoke all on function public.admin_user_overview(text, integer, integer) from public, anon;
grant execute on function public.admin_user_overview(text, integer, integer) to authenticated;

