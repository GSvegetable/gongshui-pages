-- Linking an account must merge its existing linked group, not silently split it.
-- Lock both groups in deterministic order and enforce the nine-account cap atomically.
create or replace function public.attach_accounts_to_group(p_current_user_id uuid, p_target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_current_group uuid;
  v_target_group uuid;
  v_current_locked uuid;
  v_target_locked uuid;
  v_current_count integer;
  v_target_count integer;
begin
  if p_current_user_id is null or p_target_user_id is null or p_current_user_id = p_target_user_id then
    raise exception 'invalid account' using errcode = '22023';
  end if;

  select group_id into v_current_group
    from private.account_profiles where user_id = p_current_user_id;
  select group_id into v_target_group
    from private.account_profiles where user_id = p_target_user_id;

  if v_current_group is null or v_target_group is null then
    raise exception 'account profile missing' using errcode = 'P0002';
  end if;
  if v_current_group = v_target_group then
    return v_current_group;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(least(v_current_group::text, v_target_group::text), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_current_group::text, v_target_group::text), 0));

  select group_id into v_current_locked
    from private.account_profiles where user_id = p_current_user_id for update;
  select group_id into v_target_locked
    from private.account_profiles where user_id = p_target_user_id for update;

  if v_current_locked is distinct from v_current_group
     or v_target_locked is distinct from v_target_group then
    raise exception 'account groups changed; retry the operation' using errcode = '40001';
  end if;

  select count(*) into v_current_count
    from private.account_profiles where group_id = v_current_group;
  select count(*) into v_target_count
    from private.account_profiles where group_id = v_target_group;

  if v_current_count + v_target_count > 9 then
    raise exception 'maximum nine accounts' using errcode = '22023';
  end if;

  update private.account_profiles
     set group_id = v_current_group
   where group_id = v_target_group;

  return v_current_group;
end;
$function$;
revoke all on function public.attach_accounts_to_group(uuid, uuid) from public, anon, authenticated;
grant execute on function public.attach_accounts_to_group(uuid, uuid) to service_role;
