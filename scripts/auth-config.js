/* =========================================================
   账号服务配置 — v1.0.1
   ---------------------------------------------------------
   站点是纯静态的（GitHub Pages），没有自己的服务器，
   所以账号交给托管服务，浏览器直接和它说话。

   现在接的是 Supabase（东京区）：
     url     → Project URL
     anonKey → Publishable key（旧的 anon key 的新版替代）

   注意：publishable key 本来就是设计给前端用的，可以公开写在这里；
   sb_secret_ / service_role 密钥绝对不要进前端，也不要提交到仓库。
   安全性不在于藏住这个 key，而在于数据库里的行级安全策略（RLS）。

   表结构见仓库里的 supabase/schema.sql。
   ========================================================= */
window.SITE_AUTH = {
  provider: 'supabase',
  url: 'https://izvdwjqixnhsxskjsolq.supabase.co',
  anonKey: 'sb_publishable_gK_lQFliNXz0gPgMM4e35A_gjENvwgk',

  // 两个值都没填 → 自动退回「本地模式」：
  // 账号只存在这台设备的 localStorage 里，纯粹是个能跑通的流程演示。
  // 填上 url + anonKey 后自动切到真正的云端账号。
};
