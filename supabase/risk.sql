-- =========================================================
--  宫水.com 注册风控
--  在 Supabase 控制台 → SQL Editor → 新建查询 → 粘贴 → Run
--  （需要先跑过 supabase/schema.sql；本脚本可重复执行）
--
--  规则：只用设备指纹判断同一设备短时间内的重复注册。
--        IP 仅作诊断统计，不单独触发限制，避免误伤共享网络中的正常用户。
--        登录不登记注册记录；每个账号最多保留一条。
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
create unique index if not exists signup_risk_one_row_per_user_idx on public.signup_risk (user_id);

alter table public.signup_risk enable row level security;

-- 权限：客户端只能读取自己的记录，不能直接插入、更新或删除。
-- 新记录必须经过 register_signup_risk()，由数据库函数绑定 auth.uid() 并执行登记。
grant select on public.signup_risk to authenticated;
revoke insert, update, delete on public.signup_risk from authenticated;
revoke all on public.signup_risk from anon;

-- -------------------------------------------------------------
-- 2. 策略：本人只能看自己那一条；可以给自己登记一条；
--    不能改、不能删 —— 否则就能把"高风险"这个标记自己洗掉。
-- -------------------------------------------------------------
drop policy if exists "risk_read_own"   on public.signup_risk;
drop policy if exists "risk_insert_own" on public.signup_risk;

create policy "risk_read_own" on public.signup_risk
  for select to authenticated using (auth.uid() = user_id);
-- 不创建客户端 INSERT 策略：登记只能通过受控的 SECURITY DEFINER RPC。

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

create or replace function public.is_developer_whitelisted(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, private
as $$
  select exists (
    select 1
      from auth.users u
      join private.developer_allowlist a
        on a.email = lower(coalesce(u.email, ''))
     where u.id = uid
  );
$$;
revoke all on function public.is_developer_whitelisted(uuid) from public, anon, authenticated;

-- uid 参数保留以兼容现有 RLS 策略；函数刻意只判断 auth.uid()，忽略调用者传入的其他 ID。
create or replace function public.is_high_risk(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, private
as $$
  select
    not public.is_developer_whitelisted(auth.uid())
    and exists (
      select 1 from public.signup_risk r
       where r.user_id = auth.uid() and r.high_risk
    );
$$;
revoke all on function public.is_high_risk(uuid) from public, anon;
grant execute on function public.is_high_risk(uuid) to authenticated;

-- 注册之后调一次：数一数 24 小时内同指纹、同 IP 各注册了多少个
create or replace function public.apply_signup_risk()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_fp text; v_ip text;
  v_fp_count integer := 0; v_ip_count integer := 0; v_risk boolean := false;
begin
  if v_uid is null then raise exception '未登录'; end if;
  if public.is_developer_whitelisted(v_uid) then
    update public.signup_risk set high_risk = false where user_id = v_uid;
    return jsonb_build_object('fingerprint_count',0,'ip_count',0,'high_risk',false,'whitelisted',true);
  end if;
  select fingerprint, ip into v_fp, v_ip from public.signup_risk where user_id = v_uid order by created_at desc limit 1;
  if v_fp is null then return jsonb_build_object('fingerprint_count',0,'ip_count',0,'high_risk',false); end if;
  if v_fp <> 'unknown' then
    select count(*) into v_fp_count from public.signup_risk where fingerprint = v_fp
      and created_at > now() - interval '24 hours' and not public.is_developer_whitelisted(user_id);
  end if;
  if v_ip is not null then
    select count(*) into v_ip_count from public.signup_risk where ip = v_ip
      and created_at > now() - interval '24 hours' and not public.is_developer_whitelisted(user_id);
  end if;
  -- 共享 IP 只统计、不拦截；只有同一设备指纹的重复注册才触发限制。
  v_risk := v_fp <> 'unknown' and v_fp_count > (select (risk_limits->>'fingerprint')::int from risk_limits());
  update public.signup_risk set high_risk = v_risk where user_id = v_uid;
  return jsonb_build_object('fingerprint_count',v_fp_count,'ip_count',v_ip_count,'high_risk',v_risk);
end;
$$;

-- 注册登记与风险判定分开：判定函数绝不重新插入注册记录。
create or replace function public.register_signup_risk(p_fingerprint text, p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_fp text; v_ip text;
  v_fp_count integer := 0; v_ip_count integer := 0; v_risk boolean := false;
begin
  if v_uid is null then raise exception '未登录'; end if;
  if public.is_developer_whitelisted(v_uid) then
    update public.signup_risk set high_risk = false where user_id = v_uid;
    return jsonb_build_object('fingerprint_count',0,'ip_count',0,'high_risk',false,'whitelisted',true);
  end if;
  -- 每个账号只登记一次；重复请求不会覆盖真实指纹，也不会刷新注册时间。
  insert into public.signup_risk (user_id, username, fingerprint)
  values (v_uid, p_username, coalesce(nullif(p_fingerprint, ''), 'unknown'))
  on conflict (user_id) do nothing;
  select fingerprint, ip into v_fp, v_ip from public.signup_risk where user_id = v_uid order by created_at desc limit 1;
  if v_fp <> 'unknown' then
    select count(*) into v_fp_count from public.signup_risk where fingerprint = v_fp
      and created_at > now() - interval '24 hours' and not public.is_developer_whitelisted(user_id);
  end if;
  if v_ip is not null then
    select count(*) into v_ip_count from public.signup_risk where ip = v_ip
      and created_at > now() - interval '24 hours' and not public.is_developer_whitelisted(user_id);
  end if;
  v_risk := v_fp <> 'unknown' and v_fp_count > (select (risk_limits->>'fingerprint')::int from risk_limits());
  update public.signup_risk set high_risk = v_risk where user_id = v_uid;
  return jsonb_build_object('fingerprint_count',v_fp_count,'ip_count',v_ip_count,'high_risk',v_risk);
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

revoke all on function public.apply_signup_risk() from public, anon;
grant execute on function public.apply_signup_risk() to authenticated;
revoke all on function public.register_signup_risk(text, text) from public, anon;
grant execute on function public.register_signup_risk(text, text) to authenticated;
revoke all on function public.my_risk_status() from public, anon;
grant execute on function public.my_risk_status() to authenticated;

-- 迁移旧规则：清除仅因共享 IP 触发的历史误判，再按设备指纹重新标记。
update public.signup_risk set high_risk = false where high_risk;
update public.signup_risk r
   set high_risk = true
 where r.fingerprint <> 'unknown'
   and r.created_at > now() - interval '24 hours'
   and (select count(*) from public.signup_risk x
         where x.fingerprint = r.fingerprint and x.created_at > now() - interval '24 hours'
           and not public.is_developer_whitelisted(x.user_id))
       > (select (risk_limits->>'fingerprint')::int from risk_limits());

-- -------------------------------------------------------------
-- 5. 高风险账号：收藏和偏好写入被拒（真正的拦截在这里）
--    读、删自己的数据不受影响。
-- -------------------------------------------------------------
-- 注意：PostgreSQL 的 PERMISSIVE 策略彼此是 OR 关系。
-- schema.sql 中已有的“本人可写”策略不能被另一条普通策略收紧，
-- 因此这里必须使用 RESTRICTIVE 策略，与原有本人权限做 AND。
drop policy if exists "bm_risk_guard" on public.user_bookmarks;
create policy "bm_risk_guard" on public.user_bookmarks
  as restrictive for insert to authenticated
  with check (auth.uid() = user_id and not public.is_high_risk(auth.uid()));

drop policy if exists "pf_insert_risk_guard" on public.user_preferences;
create policy "pf_insert_risk_guard" on public.user_preferences
  as restrictive for insert to authenticated
  with check (auth.uid() = user_id and not public.is_high_risk(auth.uid()));

drop policy if exists "pf_update_risk_guard" on public.user_preferences;
create policy "pf_update_risk_guard" on public.user_preferences
  as restrictive for update to authenticated
  using (auth.uid() = user_id and not public.is_high_risk(auth.uid()))
  with check (auth.uid() = user_id and not public.is_high_risk(auth.uid()));

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
