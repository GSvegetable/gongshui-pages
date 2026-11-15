-- Evaluate the session predicate once per statement rather than once per row.
drop policy if exists session_guard on public.user_bookmarks;
create policy session_guard on public.user_bookmarks
  as restrictive for all to authenticated
  using ((select private.is_session_active()))
  with check ((select private.is_session_active()));

drop policy if exists session_guard on public.user_preferences;
create policy session_guard on public.user_preferences
  as restrictive for all to authenticated
  using ((select private.is_session_active()))
  with check ((select private.is_session_active()));

drop policy if exists session_guard on public.signup_risk;
create policy session_guard on public.signup_risk
  as restrictive for all to authenticated
  using ((select private.is_session_active()))
  with check ((select private.is_session_active()));
