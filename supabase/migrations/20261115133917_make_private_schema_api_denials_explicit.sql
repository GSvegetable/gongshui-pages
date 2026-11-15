-- Make the private-schema lockout explicit for API roles.
-- SECURITY DEFINER functions owned by the database owner continue to work;
-- direct anon/authenticated table access remains denied.
do $block$
declare
  v_table text;
begin
  foreach v_table in array array['account_profiles','account_usernames','developer_allowlist','username_login_rate_limits']
  loop
    execute format('drop policy if exists deny_api_access on private.%I', v_table);
    execute format(
      'create policy deny_api_access on private.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      v_table
    );
  end loop;
end;
$block$;
