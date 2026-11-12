-- =========================================================
--  宫水.com 账号数据表
--  在 Supabase 控制台 → SQL Editor → New query → 粘贴 → Run
--  （可重复执行：全部是 IF NOT EXISTS / DROP IF EXISTS）
-- =========================================================

-- -------------------------------------------------------------
-- 1. 收藏：每个用户收藏了哪些作品
-- -------------------------------------------------------------
create table if not exists public.user_bookmarks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  work_id    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

-- -------------------------------------------------------------
-- 2. 偏好设置：画廊缩放、灯塔场景、环形世界版场景
-- -------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 3. 打开行级安全（RLS）
--    这一步不能省。
--    Supabase 用 SQL 建表默认是不开 RLS 的，不开的话，
--    任何拿到 publishable key 的人都能读走全部用户的数据
--    （官方安全回顾点名过 16000 多个这种公开库）。
--    表一旦建好就默认锁死，比"数据已经漏出去了"强。
-- -------------------------------------------------------------
alter table public.user_bookmarks   enable row level security;
alter table public.user_preferences enable row level security;

-- -------------------------------------------------------------
-- 4. 策略：只认自己的行
--    auth.uid() 是当前登录用户的 id（前端拿不到别人的），
--    和行里的 user_id 比对，对不上就看不见、也改不了。
-- -------------------------------------------------------------
drop policy if exists "bookmarks_read_own"   on public.user_bookmarks;
drop policy if exists "bookmarks_write_own"  on public.user_bookmarks;
drop policy if exists "bookmarks_delete_own" on public.user_bookmarks;

create policy "bookmarks_read_own"   on public.user_bookmarks
  for select to authenticated using (auth.uid() = user_id);
create policy "bookmarks_write_own"  on public.user_bookmarks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "bookmarks_delete_own" on public.user_bookmarks
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "prefs_read_own"   on public.user_preferences;
drop policy if exists "prefs_write_own"  on public.user_preferences;
drop policy if exists "prefs_update_own" on public.user_preferences;
drop policy if exists "prefs_delete_own" on public.user_preferences;

create policy "prefs_read_own"   on public.user_preferences
  for select to authenticated using (auth.uid() = user_id);
create policy "prefs_write_own"  on public.user_preferences
  for insert to authenticated with check (auth.uid() = user_id);
create policy "prefs_update_own" on public.user_preferences
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prefs_delete_own" on public.user_preferences
  for delete to authenticated using (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 5. 权限：只给登录用户读写，匿名访客一律不给
--    （即使以后有人再建新表，RLS 也兜着底）
-- -------------------------------------------------------------
grant select, insert, delete          on public.user_bookmarks   to authenticated;
grant select, insert, update, delete  on public.user_preferences to authenticated;
revoke all on public.user_bookmarks   from anon;
revoke all on public.user_preferences from anon;

-- =========================================================
--  跑完看一眼这两条结果，应该符合下面这样：
--
--  表          rowsecurity
--  user_bookmarks    true
--  user_preferences  true
--
--  每张表 3~4 条策略，cmd 分别是 select / insert / update / delete，
--  qual 里是 (auth.uid() = user_id)，没有 USING (true) 这种敞开策略。
-- =========================================================
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public'
 order by tablename;

select tablename, policyname, cmd, roles::text, qual, with_check
  from pg_policies
 where schemaname = 'public'
 order by tablename, policyname;
