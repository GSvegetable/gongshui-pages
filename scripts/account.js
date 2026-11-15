/* =========================================================
   顶栏账号入口 — v1.2.0
   未登录显示登录入口；已登录显示头像、账号名称及账号管理弹窗。
   ========================================================= */
(() => {
  const entry = document.getElementById('account-entry');
  if (!entry || !window.siteAuth) return;

  const idleLabel = entry.textContent.trim();
  let dialog = null;
  const style = document.createElement('style');
  style.textContent = `
    .account-entry.is-signed-in{display:inline-flex;align-items:center;gap:8px;max-width:220px;vertical-align:middle}
    .account-avatar{width:27px;height:27px;flex:0 0 27px;display:inline-grid;place-items:center;overflow:hidden;border:1px solid rgba(244,189,60,.65);border-radius:50%;background:#29251d;color:#f4bd3c;font:700 11px/1 system-ui,sans-serif}
    .account-avatar img{width:100%;height:100%;display:block;object-fit:cover}
    .account-entry-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .account-modal-profile{display:flex;align-items:center;gap:14px;margin:4px 0 18px}
    .account-modal-profile .account-avatar{width:52px;height:52px;flex-basis:52px;font-size:16px}
    .account-modal-profile strong{min-width:0;overflow-wrap:anywhere}
  `;
  document.head.appendChild(style);

  const copy = () => document.documentElement.lang === 'en'
    ? { title:'Account', signed:'Signed in as', logout:'Sign out', cancel:'Cancel',
        confirmTitle:'Sign out?', confirmText:'Are you sure you want to sign out of this account?',
        close:'Close' }
    : { title:'我的账号', signed:'当前登录账号', logout:'退出登录', cancel:'取消',
        confirmTitle:'确认退出登录？', confirmText:'退出后，这台设备将不再同步此账号的收藏和偏好。',
        close:'关闭' };

  const makeAvatar = (user, large = false) => {
    const avatar = document.createElement('span');
    avatar.className = 'account-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    const label = String(user.username || user.email || 'U').trim();
    const fallback = label.slice(0, 1).toUpperCase() || 'U';
    if (user.avatarUrl && /^https:\/\//i.test(user.avatarUrl)) {
      const img = document.createElement('img');
      img.src = user.avatarUrl;
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => { avatar.textContent = fallback; }, { once:true });
      avatar.appendChild(img);
    } else {
      avatar.textContent = fallback;
    }
    return avatar;
  };

  const closeDialog = () => {
    if (!dialog) return;
    dialog.remove();
    dialog = null;
  };

  const openDialog = user => {
    if (dialog) return;
    const t = copy();
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
          <div class="account-modal-profile"></div>
          <div class="account-modal-actions">
            <button class="account-modal-logout" type="button">${t.logout}</button>
            <button class="account-modal-cancel" type="button">${t.cancel}</button>
          </div>
        </div>
      </section>`;
    const profile = dialog.querySelector('.account-modal-profile');
    profile.appendChild(makeAvatar(user, true));
    const name = document.createElement('strong');
    name.textContent = user.username || user.email || 'Account';
    profile.appendChild(name);
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
      entry.replaceChildren(makeAvatar(user));
      const label = document.createElement('span');
      label.className = 'account-entry-name';
      label.textContent = name;
      entry.appendChild(label);
      entry.classList.add('is-signed-in');
      entry.title = document.documentElement.lang === 'en' ? 'Open account options' : '查看账号选项';
      entry.setAttribute('aria-label', (document.documentElement.lang === 'en' ? 'Signed in as ' : '当前登录账号：') + name);
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
