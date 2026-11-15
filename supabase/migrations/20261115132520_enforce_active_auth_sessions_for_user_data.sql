-- Immediate session revocation for user data access.
-- A signed JWT remains cryptographically valid until expiry, so RLS also
-- verifies that its session_id still exists and that the account is active.

create or replace function private.is_session_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    auth.uid() is not null
    and nullif(auth.jwt() ->> 'session_id', '') is not null
    and exists (
      select 1
      from auth.sessions s
      join auth.users u on u.id = s.user_id
      where s.id = (auth.jwt() ->> 'session_id')::uuid
        and s.user_id = auth.uid()
        and (s.not_after is null or s.not_after > now())
        and u.deleted_at is null
        and (u.banned_until is null or u.banned_until <= now())
    ),
    false
  );
$function$;

revoke all on function private.is_session_active() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_session_active() to authenticated, service_role;

-- Restrictive policies are ANDed with existing ownership/risk policies.
-- They do not broaden access and immediately block revoked/banned sessions.
drop policy if exists session_guard on public.user_bookmarks;
create policy session_guard on public.user_bookmarks
  as restrictive for all to authenticated
  using (private.is_session_active())
  with check (private.is_session_active());

drop policy if exists session_guard on public.user_preferences;
create policy session_guard on public.user_preferences
  as restrictive for all to authenticated
  using (private.is_session_active())
  with check (private.is_session_active());

drop policy if exists session_guard on public.signup_risk;
create policy session_guard on public.signup_risk
  as restrictive for all to authenticated
  using (private.is_session_active())
  with check (private.is_session_active());

-- Service-role-only RPC to remove all refreshable sessions for an account.
create or replace function public.revoke_user_sessions(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'user id required' using errcode = '22023';
  end if;

  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
