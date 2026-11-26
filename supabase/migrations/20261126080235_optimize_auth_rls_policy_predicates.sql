-- Cache auth identity and risk predicates once per statement instead of per row.
drop policy if exists bm_read on public.user_bookmarks;
create policy bm_read on public.user_bookmarks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists bm_del on public.user_bookmarks;
create policy bm_del on public.user_bookmarks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists bm_ins on public.user_bookmarks;
create policy bm_ins on public.user_bookmarks
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and not private.is_high_risk((select auth.uid()))
  );

drop policy if exists pf_read on public.user_preferences;
create policy pf_read on public.user_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists pf_del on public.user_preferences;
create policy pf_del on public.user_preferences
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists pf_ins on public.user_preferences;
create policy pf_ins on public.user_preferences
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and not private.is_high_risk((select auth.uid()))
  );

drop policy if exists pf_upd on public.user_preferences;
create policy pf_upd on public.user_preferences
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    and not private.is_high_risk((select auth.uid()))
  )
  with check (
    (select auth.uid()) = user_id
    and not private.is_high_risk((select auth.uid()))
  );

drop policy if exists risk_read_own on public.signup_risk;
create policy risk_read_own on public.signup_risk
  for select to authenticated
  using ((select auth.uid()) = user_id);
