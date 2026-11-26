-- Trigger-only helpers do not need to be callable by API roles.
-- PostgreSQL checks trigger-function EXECUTE privilege when CREATE TRIGGER
-- is issued; existing triggers continue to execute after these grants are revoked.
revoke all on function private.generate_public_account_id() from public, anon, authenticated;
revoke all on function private.handle_new_auth_user_profile() from public, anon, authenticated;
revoke all on function private.handle_new_auth_user_username() from public, anon, authenticated;
