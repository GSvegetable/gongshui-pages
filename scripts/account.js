/* =========================================================
   顶栏里的账号入口 — v1.0.0
   ---------------------------------------------------------
   没登录：显示「登录 / 注册」，点一下跳到登录页。
   登录了：显示用户名，点一下就退出登录。
   账号服务没配好时（本地模式）也一样能用。
   ========================================================= */
(() => {
  const entry = document.getElementById('account-entry');
  if (!entry || !window.siteAuth) return;

  const idleLabel = entry.textContent.trim();

  const render = user => {
    if (user && (user.username || user.email)) {
      const name = user.username || user.email;
      entry.textContent = name;
      entry.classList.add('is-signed-in');
      entry.title = '点击退出登录';
      entry.setAttribute('aria-label', '退出登录：' + name);
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

  // 账号被风控标记了：说一句，别让人以为同步坏了
  const note = document.createElement('div');
  note.className = 'account-note';
  note.hidden = true;
  entry.parentElement.insertBefore(note, entry.nextSibling);

  const renderRisk = risk => {
    note.hidden = !risk;
    if (risk) note.textContent = '这个账号的收藏和偏好同步已停用（同一设备注册过多）';
  };

  window.siteAuth.onChange(render);
  window.siteAuth.restore().then(render);

  if (window.siteRisk) {
    window.siteRisk.status().then(renderRisk);
    setInterval(() => window.siteRisk.status().then(renderRisk), 60000);
  }
})();
