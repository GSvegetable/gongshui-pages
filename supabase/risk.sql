-- =========================================================
--  宫水.com 注册风控
--  在 Supabase 控制台 → SQL Editor → 新建查询 → 粘贴 → Run
--  （需要先跑过 supabase/schema.sql；本脚本可重复执行）
--
--  规则：同一台设备（浏览器指纹）或同一个 IP 在 24 小时内注册过多
--        → 账号照样注册成功、照样能登录能看作品，
--          但收藏和偏好同步被停用（数据库层面拦，前端只是提示一句）。
--
--  两个阈值故意不一样：
--    指纹 > 2：指纹就是"这一台设备"，同一台机器注册第三个号，多半不是本人。
--    IP   > 5：IP 只能粗略到"一个出口"。国内移动网络是 CGNAT，
--              咖啡厅、写字楼、基站背后都是一大堆真人共用一个 IP，
--              阈值压到 2 会把正常用户误伤，所以放宽到 5。
--              （阈值都在 risk_limits() 里，想改就改那两行）
-- =========================================================

-- -------------------------------------------------------------
-- 1. 风控表：每次注册留一条
--    指纹是客户端算的（设备识别），IP 是服务端从请求头取的（客户端填不了）
-- -------------------------------------------------------------
create table if not exists public.signup_risk (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  username    text,
  fingerprint text not null,
  ip          text,
  high_risk   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists signup_risk_fingerprint_idx on public.signup_risk (fingerprint, created_at desc);
create index if not exists signup_risk_ip_idx         on public.signup_risk (ip, created_at desc);
create index if not exists signup_risk_user_idx       on public.signup_risk (user_id);

alter table public.signup_risk enable row level security;

-- 权限：登录用户只能读自己的那一条、只能给自己登记一条；匿名一律不给。
-- 这一句别漏——漏了客户端插不进去，会报 42501 permission denied。
grant select, insert on public.signup_risk to authenticated;
revoke all on public.signup_risk from anon;

-- -------------------------------------------------------------
-- 2. 策略：本人只能看自己那一条；可以给自己登记一条；
--    不能改、不能删 —— 否则就能把"高风险"这个标记自己洗掉。
-- -------------------------------------------------------------
drop policy if exists "risk_read_own"   on public.signup_risk;
drop policy if exists "risk_insert_own" on public.signup_risk;

create policy "risk_read_own"   on public.signup_risk
  for select to authenticated using (auth.uid() = user_id);
create policy "risk_insert_own" on public.signup_risk
  for insert to authenticated with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 3. IP 由服务端填，高风险标记由服务端管
-- -------------------------------------------------------------
create or replace function public.signup_risk_fill_ip() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  h json;
begin
  h := coalesce(current_setting('request.headers', true)::json, '{}'::json);
  new.ip := nullif(split_part(coalesce(
      h->>'x-forwarded-for', h->>'X-Forwarded-For', h->>'cf-connecting-ip', ''), ',', 1), ' ');
  new.high_risk := false;      -- 注册时不能自己标高风险
  return new;
end $$;

drop trigger if exists trg_signup_risk_fill_ip on public.signup_risk;
create trigger trg_signup_risk_fill_ip before insert on public.signup_risk
  for each row execute function public.signup_risk_fill_ip();

-- 只有能绕过 RLS 的角色（表所有者 postgres）才能改 high_risk
create or replace function public.signup_risk_guard() returns trigger
language plpgsql as $$
begin
  if new.high_risk is distinct from old.high_risk
     and coalesce((select rolbypassrls from pg_roles where rolname = current_user), false) is not true then
    raise exception 'high_risk 只能由服务端修改';
  end if;
  return new;
end $$;

drop trigger if exists trg_signup_risk_guard on public.signup_risk;
create trigger trg_signup_risk_guard before update on public.signup_risk
  for each row execute function public.signup_risk_guard();

-- -------------------------------------------------------------
-- 4. 判定函数
--    两个阈值（想改严/改松就改这两行）
-- -------------------------------------------------------------
create or replace function public.risk_limits() returns jsonb
language sql immutable as $$
  select jsonb_build_object('fingerprint', 2, 'ip', 5);
$$;

--
-- -------------------------------------------------------------
-- 4a. 开发者白名单
--     邮箱名单存放在 private schema，不写入公开仓库，也不经 PostgREST 暴露。
--     在 Supabase SQL Editor 中单独录入开发者邮箱，见部署说明。
-- -------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.developer_allowlist (
  email text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now()
);
alter table private.developer_allowlist enable row level security;
revoke all on table private.developer_allowlist from public, anon, authenticated;

drop function if exists public.is_high_risk(uuid);
drop function if exists public.is_developer_whitelisted(uuid);

create or replace function public.is_developer_whitelisted(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, private
as $
  select exists (
    select 1
      from auth.users u
      join private.developer_allowlist a
        on a.email = lower(coalesce(u.email, ''))
     where u.id = uid
  );
$;
revoke all on function public.is_developer_whitelisted(uuid) from public, anon, authenticated;

-- 仅判断当前登录账号，避免客户端探测任意用户的风控状态。
create or replace function public.is_high_risk()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, private
as $$
  select
    not public.is_developer_whitelisted(v_uid)
    and exists (
      select 1 from public.signup_risk r
       where r.user_id = auth.uid() and r.high_risk
    );
$$;
revoke all on function public.is_high_risk() from public, anon;
grant execute on function public.is_high_risk() to authenticated;

-- 注册之后调一次：数一数 24 小时内同指纹、同 IP 各注册了多少个
create or replace function public.apply_signup_risk()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  h json;
  v_ip text;
  v_fp text;
  v_fp_count integer := 0;
  v_ip_count integer := 0;
  v_risk boolean := false;
begin
  if v_uid is null then
    raise exception '未登录';
  end if;

  if public.is_developer_whitelisted(v_uid) then
    update public.signup_risk set high_risk = false where user_id = v_uid;
    return jsonb_build_object(
      'fingerprint_count', 0,
      'ip_count', 0,
      'high_risk', false,
      'whitelisted', true
    );
  end if;

  h := coalesce(current_setting('request.headers', true)::json, '{}'::json);
  v_ip := nullif(split_part(coalesce(
      h->>'x-forwarded-for', h->>'X-Forwarded-For', h->>'cf-connecting-ip', ''), ',', 1), ' ');

  select fingerprint into v_fp
    from public.signup_risk where user_id = v_uid order by created_at desc limit 1;
  if v_fp is null then
    return jsonb_build_object('fingerprint_count', 0, 'ip_count', 0, 'high_risk', false);
  end if;

  select count(*) into v_fp_count from public.signup_risk
    where fingerprint = v_fp
      and created_at > now() - interval '24 hours'
      and not public.is_developer_whitelisted(user_id);
  select count(*) into v_ip_count from public.signup_risk
    where ip = v_ip
      and created_at > now() - interval '24 hours'
      and not public.is_developer_whitelisted(user_id);

  v_risk := (v_fp_count > (select (risk_limits->>'fingerprint')::int from risk_limits()))
         or (v_ip_count > (select (risk_limits->>'ip')::int from risk_limits()));
  if v_risk then
    update public.signup_risk set high_risk = true where user_id = v_uid;
  end if;

  return jsonb_build_object(
    'fingerprint_count', v_fp_count,
    'ip_count', v_ip_count,
    'high_risk', v_risk
  );
end;
$$;

revoke all on function public.apply_signup_risk() from public, anon;
grant execute on function public.apply_signup_risk() to authenticated;

-- -------------------------------------------------------------
-- 4b. 客户端只调这两个函数，表本身不开放给浏览器
--     登记：只传指纹和用户名，用户 id 和 IP 都由服务端取
-- -------------------------------------------------------------
create or replace function public.register_signup_risk(p_fingerprint text, p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fp_count integer := 0;
  v_ip_count integer := 0;
  v_risk boolean := false;
begin
  if v_uid is null then
    raise exception '未登录';
  end if;

  if public.is_developer_whitelisted(v_uid) then
    delete from public.signup_risk where user_id = v_uid;
    insert into public.signup_risk (user_id, username, fingerprint)
      values (v_uid, p_username, coalesce(nullif(p_fingerprint, ''), 'unknown'));
    update public.signup_risk set high_risk = false where user_id = v_uid;
    return jsonb_build_object(
      'fingerprint_count', 0,
      'ip_count', 0,
      'high_risk', false,
      'whitelisted', true
    );
  end if;

  -- 同一个人重复调用只留一条，别把计数刷上去
  delete from public.signup_risk where user_id = v_uid;
  insert into public.signup_risk (user_id, username, fingerprint)
    values (v_uid, p_username, coalesce(nullif(p_fingerprint, ''), 'unknown'));

  select count(*) into v_fp_count from public.signup_risk
    where fingerprint = coalesce(nullif(p_fingerprint, ''), 'unknown')
      and created_at > now() - interval '24 hours'
      and not public.is_developer_whitelisted(user_id);
  select count(*) into v_ip_count from public.signup_risk
    where ip = (select ip from public.signup_risk where user_id = v_uid limit 1)
      and created_at > now() - interval '24 hours'
      and not public.is_developer_whitelisted(user_id);

  v_risk := (v_fp_count > (select (risk_limits->>'fingerprint')::int from risk_limits()))
         or (v_ip_count > (select (risk_limits->>'ip')::int from risk_limits()));
  if v_risk then
    update public.signup_risk set high_risk = true where user_id = v_uid;
  end if;

  return jsonb_build_object(
    'fingerprint_count', v_fp_count,
    'ip_count', v_ip_count,
    'high_risk', v_risk
  );
end;
$$;

-- 查当前账号的风险状态（刷新页面后用）
create or replace function public.my_risk_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'high_risk', case
      when public.is_developer_whitelisted(auth.uid()) then false
      else coalesce((select r.high_risk from public.signup_risk r
                       where r.user_id = auth.uid()
                       order by r.created_at desc limit 1), false)
    end,
    'registered', exists (select 1 from public.signup_risk r where r.user_id = auth.uid()),
    'whitelisted', public.is_developer_whitelisted(auth.uid())
  );
$$;

revoke all on function public.register_signup_risk(text, text) from public, anon;
grant execute on function public.register_signup_risk(text, text) to authenticated;
revoke all on function public.my_risk_status() from public, anon;
grant execute on function public.my_risk_status() to authenticated;

-- -------------------------------------------------------------
-- 5. 高风险账号：收藏和偏好写入被拒（真正的拦截在这里）
--    读、删自己的数据不受影响。
-- -------------------------------------------------------------
drop policy if exists "bm_ins" on public.user_bookmarks;
create policy "bm_ins" on public.user_bookmarks
  for insert to authenticated
  with check (auth.uid() = user_id and not public.is_high_risk());

drop policy if exists "pf_ins" on public.user_preferences;
create policy "pf_ins" on public.user_preferences
  for insert to authenticated
  with check (auth.uid() = user_id and not public.is_high_risk());

drop policy if exists "pf_upd" on public.user_preferences;
create policy "pf_upd" on public.user_preferences
  for update to authenticated
  using (auth.uid() = user_id and not public.is_high_risk())
  with check (auth.uid() = user_id and not public.is_high_risk());

-- 清理测试数据（想从零开始测的时候跑一次）：
-- delete from public.signup_risk;

-- =========================================================
--  自检：跑完看这两条
--
--  表：public 下应该有 signup_risk / user_bookmarks / user_preferences 三张，
--      rowsecurity 全是 true。
--
--  策略：signup_risk 只有 risk_read_own(SELECT) 和 risk_insert_own(INSERT) 两条，
--        没有 UPDATE / DELETE；
--        user_bookmarks 的 bm_insert 策略里带 not is_high_risk()。
-- =========================================================
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public'
 order by tablename;

select tablename, policyname, cmd, roles::text, qual, with_check
  from pg_policies
 where schemaname = 'public'
 order by tablename, policyname;
