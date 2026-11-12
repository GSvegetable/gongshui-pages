/* =========================================================
   顶栏里的账号入口 — v1.0.0
   ---------------------------------------------------------
   没登录：显示「登录 / 注册」，点一下跳到登录页。
   登录了：显示邮箱，点一下就退出登录。
   账号服务没配好时（本地模式）也一样能用。
   ========================================================= */
(() => {
  const entry = document.getElementById('account-entry');
  if (!entry || !window.siteAuth) return;

  const idleLabel = entry.textContent.trim();

  const render = user => {
    if (user && user.email) {
      entry.textContent = user.email;
      entry.classList.add('is-signed-in');
      entry.title = '点击退出登录';
      entry.setAttribute('aria-label', '退出登录：' + user.email);
    } else {
      entry.textContent = idleLabel;
      entry.classList.remove('is-signed-in');
      entry.title = '';
      entry.setAttribute('aria-label', '登录 / 注册');
    }
  };

  entry.addEventListener('click', event => {
    if (!entry.classList.contains('is-signed-in')) return;  // 没登录就正常跳登录页
    event.preventDefault();
    window.siteAuth.signOut();
  });

  window.siteAuth.onChange(render);
  window.siteAuth.restore().then(render);
})();
