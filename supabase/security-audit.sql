-- =========================================================
-- 宫水.com 线上数据库安全审计（只读）
-- 在 Supabase SQL Editor 执行；只查询元数据，不修改数据或权限。
-- 请把结果截图/复制回来，我会据此核对线上实际状态。
-- =========================================================

-- 1. public schema 中所有表的 RLS 状态
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  pg_get_userbyid(c.relowner) as owner
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'private')
  and c.relkind in ('r', 'p')
order by n.nspname, c.relname;

-- 2. 所有 public/private 表的 RLS 策略
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'private')
order by schemaname, tablename, policyname;

-- 3. anon / authenticated 对业务表的有效权限
select
  table_schema,
  table_name,
  has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'SELECT') as anon_select,
  has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'INSERT') as anon_insert,
  has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'UPDATE') as anon_update,
  has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'DELETE') as anon_delete,
  has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'SELECT') as auth_select,
  has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'INSERT') as auth_insert,
  has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'UPDATE') as auth_update,
  has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'DELETE') as auth_delete
from information_schema.tables
where table_schema in ('public', 'private')
  and table_type = 'BASE TABLE'
order by table_schema, table_name;

-- 4. public schema 中所有 SECURITY DEFINER 函数及 anon/authenticated 执行权限
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
order by n.nspname, p.proname;

-- 5. private schema 的访问权限（应仅由受信任数据库角色使用）
select
  has_schema_privilege('anon', 'private', 'USAGE') as anon_private_usage,
  has_schema_privilege('authenticated', 'private', 'USAGE') as authenticated_private_usage,
  has_schema_privilege('service_role', 'private', 'USAGE') as service_role_private_usage;

-- 6. Storage bucket 可见性（若项目启用了 Supabase Storage）
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

-- 7. Storage 对象策略
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;

-- 8. 默认权限（检查未来新建对象是否会意外开放给 anon/authenticated）
select
  pg_get_userbyid(d.defaclrole) as owner_role,
  n.nspname as schema_name,
  d.defaclobjtype as object_type,
  d.defaclacl as default_acl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname in ('public', 'private') or d.defaclnamespace = 0
order by owner_role, schema_name, object_type;
