-- =========================================================
-- 宫水.com 默认权限加固（低风险迁移）
-- 在 Supabase Dashboard → SQL Editor 中以 postgres 管理员身份执行。
--
-- 背景：2026-11-14 的 default_acl 检查显示，supabase_admin 创建的
-- public 表/序列/函数默认会向 anon、authenticated 授权；postgres 创建的
-- public 表默认也包含不必要的 TRUNCATE / REFERENCES / TRIGGER / MAINTAIN
-- 等权限。默认权限只影响之后创建的对象，不代表现有表已被公开。
--
-- 本脚本只收紧 public schema 的未来默认权限，不修改现有表、数据、
-- RLS 策略或现有 RPC 的授权。应用需要的现有权限仍由 schema.sql、
-- risk.sql、admin.sql 明确授予。
-- =========================================================

begin;

-- 浏览器角色只需要使用 public schema，不应在其中创建对象。
revoke create on schema public from anon, authenticated;

-- postgres 作为对象所有者时：未来新表不给浏览器角色任何默认权限。
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- supabase_admin 作为对象所有者时：同样采用默认拒绝。
alter default privileges for role supabase_admin in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke execute on functions from public, anon, authenticated;

commit;

-- =========================================================
-- 执行后验证：anon/authenticated 的 CREATE 应为 false；
-- 上述两种 owner 的默认 ACL 不应再包含 anon/authenticated 的表/序列权限，
-- 也不应包含它们的函数 EXECUTE 权限。
-- =========================================================

select
  role_name,
  has_schema_privilege(role_name, 'public', 'USAGE') as can_use_public,
  has_schema_privilege(role_name, 'public', 'CREATE') as can_create_in_public
from (values ('anon'), ('authenticated')) as roles(role_name)
order by role_name;

select
  pg_get_userbyid(d.defaclrole) as owner_role,
  n.nspname as schema_name,
  d.defaclobjtype as object_type,
  d.defaclacl as default_acl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname = 'public'
  and pg_get_userbyid(d.defaclrole) in ('postgres', 'supabase_admin')
order by owner_role, object_type;
