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
    .account-usernames{margin:0 0 18px;padding:14px;border:1px solid rgba(33,29,21,.18);border-radius:4px;background:rgba(255,255,255,.38)}
    .account-usernames h3{margin:0 0 10px;color:#51432e;font-size:12px}
    .account-username-list{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:11px}
    .account-username-chip{padding:6px 9px;border:1px solid #9b896b;border-radius:3px;background:#fffdf7;color:#211d15;font:700 12px ui-monospace,monospace}
    .account-username-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}
    .account-username-form input{min-width:0;height:38px;padding:0 9px;border:1px solid #8b795a;border-radius:3px;background:#fffdf7;color:#211d15}
    .account-username-form button{padding:0 12px;border:2px solid #211d15;border-radius:3px;background:#f4bd3c;color:#211d15;font-weight:800}
    .account-username-form button:disabled{opacity:.5}
    .account-username-help,.account-username-status{margin:8px 0 0;color:#76684f;font-size:11px;line-height:1.5}
  `;
  document.head.appendChild(style);

  const copy = () => {
    const lang = document.documentElement.lang;
    if (lang === 'en') return { title:'Account', signed:'Signed in as', logout:'Sign out', cancel:'Cancel', confirmTitle:'Sign out?', confirmText:'Are you sure you want to sign out of this account?', close:'Close', names:'Usernames', add:'Add', help:'4–9 characters. Letters, numbers, _ and - only. Up to 2 per account.', namePlaceholder:'New username', loading:'Loading…', failed:'Could not load usernames.', added:'Username added.', full:'This account already has 2 usernames.', invalid:'Use 4–9 valid characters.', error:'Could not add username.' };
    if (lang === 'ja') return { title:'アカウント', signed:'ログイン中', logout:'ログアウト', cancel:'キャンセル', confirmTitle:'ログアウトしますか？', confirmText:'このアカウントからログアウトしますか？', close:'閉じる', names:'ユーザー名', add:'追加', help:'4〜9文字。英字・数字・_・- が使えます。1アカウントにつき最大2つ。', namePlaceholder:'新しいユーザー名', loading:'読み込み中…', failed:'ユーザー名を読み込めません。', added:'ユーザー名を追加しました。', full:'このアカウントには既に2つのユーザー名があります。', invalid:'4〜9文字の有効な文字列を入力してください。', error:'ユーザー名を追加できませんでした。' };
    return { title:'我的账号', signed:'当前登录账号', logout:'退出登录', cancel:'取消', confirmTitle:'确认退出登录？', confirmText:'退出后，这台设备将不再同步此账号的收藏和偏好。', close:'关闭', names:'登录用户名', add:'添加', help:'4–9 位，只能使用字母、数字、下划线和短横线；每个账号最多 2 个。', namePlaceholder:'输入第二个用户名', loading:'正在加载…', failed:'用户名加载失败。', added:'用户名已添加。', full:'一个账号最多只能有两个用户名。', invalid:'请输入 4–9 位有效用户名。', error:'添加失败，请重试。' };
  };

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
          <section class="account-usernames">
            <h3>${t.names}</h3>
            <div class="account-username-list">${t.loading}</div>
            <form class="account-username-form">
              <input name="username" maxlength="9" minlength="4" pattern="[A-Za-z0-9][A-Za-z0-9_-]{3,8}" placeholder="${t.namePlaceholder}" autocomplete="off" required>
              <button type="submit">${t.add}</button>
            </form>
            <p class="account-username-help">${t.help}</p>
            <p class="account-username-status" aria-live="polite"></p>
          </section>
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
    const usernameList = dialog.querySelector('.account-username-list');
    const usernameForm = dialog.querySelector('.account-username-form');
    const usernameInput = usernameForm.querySelector('input');
    const usernameStatus = dialog.querySelector('.account-username-status');
    const loadUsernames = async () => {
      try {
        const items = await window.siteAuth.listUsernames();
        usernameList.replaceChildren();
        (Array.isArray(items) ? items : []).forEach(item => {
          const chip = document.createElement('span');
          chip.className = 'account-username-chip';
          chip.textContent = item.username;
          usernameList.appendChild(chip);
        });
        if (!items || !items.length) usernameList.textContent = t.failed;
        const full = items && items.length >= 2;
        usernameInput.disabled = !!full;
        usernameForm.querySelector('button').disabled = !!full;
        if (full) usernameStatus.textContent = t.full;
      } catch (_) { usernameList.textContent = t.failed; }
    };
    usernameForm.addEventListener('submit', async event => {
      event.preventDefault();
      const value = usernameInput.value.trim();
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$/.test(value)) { usernameStatus.textContent = t.invalid; return; }
      const button = usernameForm.querySelector('button');
      button.disabled = true;
      try {
        await window.siteAuth.addUsername(value);
        usernameStatus.textContent = t.added;
        usernameInput.value = '';
        await loadUsernames();
      } catch (error) {
        usernameStatus.textContent = error && error.message && /maximum two/i.test(error.message) ? t.full : (error && error.message || t.error);
      } finally { if (!usernameInput.disabled) button.disabled = false; }
    });
    loadUsernames();
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
      // 头像入口保持为纯方形图标，不在顶栏重复显示用户名。
      entry.classList.add('is-signed-in');
      entry.title = document.documentElement.lang === 'en' ? 'Open account options' : document.documentElement.lang === 'ja' ? 'アカウント設定を開く' : '查看账号选项';
      entry.setAttribute('aria-label', (document.documentElement.lang === 'en' ? 'Signed in as ' : document.documentElement.lang === 'ja' ? 'ログイン中：' : '当前登录账号：') + name);
    } else {
      closeDialog();
      entry.textContent = idleLabel;
      entry.classList.remove('is-signed-in');
      entry.title = '';
      entry.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Sign in / Sign up' : document.documentElement.lang === 'ja' ? 'ログイン / 新規登録' : '登录 / 注册');
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
      : document.documentElement.lang === 'ja'
        ? 'このアカウントではブックマークと設定の同期が一時停止されています。'
        : '这个账号的收藏和偏好同步已停用（同一设备注册过多）';
  };

  window.siteAuth.onChange(render);
  window.siteAuth.restore().then(render);
  if (window.siteRisk) {
    window.siteRisk.status().then(renderRisk);
    setInterval(() => window.siteRisk.status().then(renderRisk), 60000);
  }
})();
