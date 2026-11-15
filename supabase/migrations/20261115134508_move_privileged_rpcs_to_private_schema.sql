-- Keep the public RPC contract, but move privileged implementations into
-- the non-exposed private schema. Public wrappers run as SECURITY INVOKER.
alter function public.add_my_username(text) set schema private;
alter function public.update_my_username(text, text) set schema private;
alter function public.list_my_usernames() set schema private;
alter function public.list_my_linked_accounts() set schema private;
alter function public.apply_signup_risk() set schema private;
alter function public.is_high_risk(uuid) set schema private;
alter function public.my_risk_status() set schema private;
alter function public.register_signup_risk(text, text) set schema private;
alter function public.admin_user_detail(uuid) set schema private;
alter function public.admin_user_overview(text, integer, integer) set schema private;

grant usage on schema private to authenticated, service_role;

create function public.add_my_username(p_username text)
returns table(username text)
language sql
security invoker
set search_path = ''
as $function$
  select * from private.add_my_username(p_username);
$function$;

create function public.update_my_username(p_old_username text, p_new_username text)
returns table(username text)
language sql
security invoker
set search_path = ''
as $function$
  select * from private.update_my_username(p_old_username, p_new_username);
$function$;

create function public.list_my_usernames()
returns table(username text, created_at timestamptz)
language sql
security invoker
set search_path = ''
as $function$
  select * from private.list_my_usernames();
$function$;

create function public.list_my_linked_accounts()
returns table(user_id uuid, public_id character varying, username text, is_current boolean)
language sql
security invoker
set search_path = ''
as $function$
  select * from private.list_my_linked_accounts();
$function$;

create function public.apply_signup_risk()
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.apply_signup_risk();
$function$;

create function public.is_high_risk(uid uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.is_high_risk(uid);
$function$;

create function public.my_risk_status()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.my_risk_status();
$function$;

create function public.register_signup_risk(p_fingerprint text, p_username text)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.register_signup_risk(p_fingerprint, p_username);
$function$;

create function public.admin_user_detail(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.admin_user_detail(p_user_id);
$function$;

create function public.admin_user_overview(
  p_search text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.admin_user_overview(p_search, p_limit, p_offset);
$function$;

revoke all on function public.add_my_username(text) from public, anon;
revoke all on function public.update_my_username(text, text) from public, anon;
revoke all on function public.list_my_usernames() from public, anon;
revoke all on function public.list_my_linked_accounts() from public, anon;
revoke all on function public.apply_signup_risk() from public, anon;
revoke all on function public.is_high_risk(uuid) from public, anon;
revoke all on function public.my_risk_status() from public, anon;
revoke all on function public.register_signup_risk(text, text) from public, anon;
revoke all on function public.admin_user_detail(uuid) from public, anon;
revoke all on function public.admin_user_overview(text, integer, integer) from public, anon;

grant execute on function public.add_my_username(text) to authenticated, service_role;
grant execute on function public.update_my_username(text, text) to authenticated, service_role;
grant execute on function public.list_my_usernames() to authenticated, service_role;
grant execute on function public.list_my_linked_accounts() to authenticated, service_role;
grant execute on function public.apply_signup_risk() to authenticated, service_role;
grant execute on function public.is_high_risk(uuid) to authenticated, service_role;
grant execute on function public.my_risk_status() to authenticated, service_role;
grant execute on function public.register_signup_risk(text, text) to authenticated, service_role;
grant execute on function public.admin_user_detail(uuid) to authenticated, service_role;
grant execute on function public.admin_user_overview(text, integer, integer) to authenticated, service_role;

notify pgrst, 'reload schema';
