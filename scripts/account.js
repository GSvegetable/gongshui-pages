/* =========================================================
   顶栏账号入口 — v1.1.0
   未登录：进入登录页。
   已登录：打开账号弹窗；退出必须经过二次确认。
   ========================================================= */
(() => {
  const entry = document.getElementById('account-entry');
  if (!entry || !window.siteAuth) return;

  const idleLabel = entry.textContent.trim();
  let dialog = null;

  const copy = () => document.documentElement.lang === 'en'
    ? { title:'Account', signed:'Signed in as', logout:'Sign out', cancel:'Cancel',
        confirmTitle:'Sign out?', confirmText:'Are you sure you want to sign out of this account?',
        close:'Close', done:'You have signed out.' }
    : { title:'我的账号', signed:'当前登录账号', logout:'退出登录', cancel:'取消',
        confirmTitle:'确认退出登录？', confirmText:'退出后，这台设备将不再同步此账号的收藏和偏好。',
        close:'关闭', done:'已退出登录。' };

  const closeDialog = () => {
    if (!dialog) return;
    dialog.remove();
    dialog = null;
  };

  const openDialog = user => {
    if (dialog) return;
    const t = copy();
    const name = user.username || user.email || 'Account';
    dialog = document.createElement('div');
    dialog.className = 'account-modal-backdrop';
    dialog.innerHTML = `
      <section class="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
        <header class="account-modal-head">
          <div><p class="account-modal-kicker">GONGSHUI ACCOUNT</p><h2 id="account-modal-title">${t.title}</h2></div>
          <button class="account-modal-close" type="button" aria-label="${t.close}">×</button>
        </header>
        <div class="account-modal-body">
          <span class="account-modal-label">${t.signed}</span>
          <strong class="account-modal-username"></strong>
          <div class="account-modal-actions">
            <button class="account-modal-logout" type="button">${t.logout}</button>
            <button class="account-modal-cancel" type="button">${t.cancel}</button>
          </div>
        </div>
      </section>`;
    dialog.querySelector('.account-modal-username').textContent = name;
    document.body.appendChild(dialog);
    const dismiss = () => closeDialog();
    dialog.querySelector('.account-modal-close').addEventListener('click', dismiss);
    dialog.querySelector('.account-modal-cancel').addEventListener('click', dismiss);
    dialog.addEventListener('click', event => { if (event.target === dialog) dismiss(); });
    dialog.querySelector('.account-modal-logout').addEventListener('click', () => {
      const body = dialog.querySelector('.account-modal-body');
      body.innerHTML = `
        <p class="account-modal-confirm-title">${t.confirmTitle}</p>
        <p class="account-modal-confirm-text">${t.confirmText}</p>
        <div class="account-modal-actions">
          <button class="account-modal-confirm" type="button">${t.logout}</button>
          <button class="account-modal-cancel" type="button">${t.cancel}</button>
        </div>`;
      body.querySelector('.account-modal-cancel').addEventListener('click', dismiss);
      body.querySelector('.account-modal-confirm').addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = document.documentElement.lang === 'en' ? 'Signing out…' : '正在退出…';
        try {
          await window.siteAuth.signOut();
          closeDialog();
        } catch (_) {
          button.disabled = false;
          button.textContent = t.logout;
        }
      });
    });
    const onKey = event => {
      if (event.key === 'Escape') { dismiss(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
    dialog.querySelector('.account-modal-close').focus();
  };

  const render = user => {
    if (user && (user.username || user.email)) {
      const name = user.username || user.email;
      entry.textContent = name;
      entry.classList.add('is-signed-in');
      entry.title = document.documentElement.lang === 'en' ? 'Open account options' : '查看账号选项';
      entry.setAttribute('aria-label', (document.documentElement.lang === 'en' ? 'Account: ' : '我的账号：') + name);
    } else {
      closeDialog();
      entry.textContent = idleLabel;
      entry.classList.remove('is-signed-in');
      entry.title = '';
      entry.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Sign in / Sign up' : '登录 / 注册');
    }
  };

  entry.addEventListener('click', event => {
    if (!entry.classList.contains('is-signed-in')) return;
    event.preventDefault();
    openDialog(window.siteAuth.getUser() || {});
  });

  const note = document.createElement('div');
  note.className = 'account-note';
  note.hidden = true;
  entry.parentElement.insertBefore(note, entry.nextSibling);
  const renderRisk = risk => {
    note.hidden = !risk;
    if (risk) note.textContent = document.documentElement.lang === 'en'
      ? 'Bookmark and preference sync is disabled for this account.'
      : '这个账号的收藏和偏好同步已停用（同一设备注册过多）';
  };

  window.siteAuth.onChange(render);
  window.siteAuth.restore().then(render);
  if (window.siteRisk) {
    window.siteRisk.status().then(renderRisk);
    setInterval(() => window.siteRisk.status().then(renderRisk), 60000);
  }
})();
