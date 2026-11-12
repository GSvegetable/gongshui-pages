/* =========================================================
   邮件链接的落地页 — v1.0.0
   ---------------------------------------------------------
   确认邮件 / 重置密码邮件点开后落在这里。
   链接可能带三种东西：
     ?token_hash=...&type=email   新式（自定义邮件模板）
     ?token=...&type=signup       令牌哈希
     #access_token=...&type=...   老式隐式流（默认模板）
   都能接住：换成会话 → 存起来 → 跳回主页（重置密码的跳账号页）。
   ========================================================= */
(() => {
  const finish = () => {
    window.siteAuth.restore().then(account => {
      const kind = window.siteAuth.redirect && window.siteAuth.redirect.type;
      if (kind === 'recovery') { location.replace('/login.html'); return; }
      if (account && account.email) { location.replace('/index.html'); return; }
      location.replace('/login.html');
    }).catch(() => {
      location.replace('/login.html');
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', finish);
  else finish();
})();
