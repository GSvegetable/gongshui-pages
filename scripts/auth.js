/* =========================================================
   站点账号客户端 — v1.0.0
   ---------------------------------------------------------
   一层薄封装，页面上只认这几个方法：
     siteAuth.mode        'cloud' | 'local'
     siteAuth.signUp({email, password})
     siteAuth.signIn({email, password})
     siteAuth.signOut()
     siteAuth.getUser()    → {email} | null
     siteAuth.onChange(fn)

   云端模式走 Supabase 的 REST 接口（不用 SDK，省掉几十 KB）：
     POST {url}/auth/v1/signup
     POST {url}/auth/v1/token?grant_type=password
     POST {url}/auth/v1/token?grant_type=refresh_token
     POST {url}/auth/v1/logout
     GET  {url}/auth/v1/user

   会话：access_token 放内存，refresh_token 放 localStorage，
   过期了用 refresh_token 换新的 —— 这样刷新页面还能保持登录。
   ========================================================= */
(() => {
  const config = window.SITE_AUTH || {};
  const cloud = !!(config.url && config.anonKey);
  const mode = cloud ? 'cloud' : 'local';

  const SESSION_KEY = 'site-auth-session';
  const LOCAL_USERS_KEY = 'site-auth-local-users';

  // ---------- 用户名 ----------
  // 界面上的身份是「用户名」；Supabase 底层要的是邮箱，
  // 这里做一次转换。用户直接填完整邮箱的也照样认（兼容老账号）。
  const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,23}$/;

  const toEmail = input => {
    const value = String(input || '').trim();
    if (!value) return '';
    if (value.includes('@')) return value;
    return value.toLowerCase() + '@' + (config.emailDomain || 'gongshui.com');
  };

  const toUsername = (email, metadata) => (metadata && metadata.username) || String(email || '').split('@')[0] || '';

  let session = null;          // { accessToken, refreshToken, email }
  let user = null;             // { id, email }  id 就是 auth.uid()，RLS 策略靠它匹配
  const listeners = new Set();

  const notify = () => listeners.forEach(fn => {
    try { fn(user); } catch (_) {}
  });

  const storeSession = value => {
    session = value;
    try {
      if (value) localStorage.setItem(SESSION_KEY, JSON.stringify({
        refreshToken: value.refreshToken, email: value.email
      }));
      else localStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  };

  const readSession = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; }
  };

  /* ---------- 云端：Supabase REST ---------- */

  const api = async (path, options = {}) => {
    const headers = Object.assign({
      apikey: config.anonKey,
      'Content-Type': 'application/json'
    }, options.headers || {});
    if (options.token) headers.Authorization = 'Bearer ' + options.token;

    const res = await fetch(config.url + '/auth/v1' + path, {
      method: options.method || 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    let payload = null;
    try { payload = await res.json(); } catch (_) {}

    if (!res.ok) {
      const message = payload && (payload.msg || payload.message || payload.error_description);
      const error = new Error(translate(message) || ('请求失败（' + res.status + '）'));
      error.status = res.status;
      error.raw = payload;
      throw error;
    }
    return payload || {};
  };

  // Supabase 的报错是英文的，翻译成给用户看的话
  const translate = message => {
    if (!message) return '';
    const text = String(message).toLowerCase();
    if (text.includes('user already registered')) return '这个邮箱已注册，或已有尚未完成验证的账号。请尝试登录，或重新发送确认邮件。';
    if (text.includes('invalid login credentials')) return '用户名或密码不对';
    if (text.includes('email not confirmed')) return '这个账号还没完成验证';
    if (text.includes('password should be at least')) return '密码至少要 6 位';
    if (text.includes('unable to validate email')) return '用户名格式不对';
    if (text.includes('rate limit') || text.includes('too many')) return '试太频繁了，等一会儿再来';
    if (text.includes('failed to fetch')) return '连不上账号服务，检查一下网络';
    if (text.includes('error sending')) return '邮件暂时发不出去，等一会儿再试';
    if (text.includes('otp_expired') || text.includes('invalid or has expired')) return '这个链接已经过期了，重新发一封吧';
    return String(message);
  };

  const cloudSignUp = async ({ email, password, username }) => {
    const mail = toEmail(email);
    const cleanUsername = String(username || toUsername(mail)).trim();
    const data = await api('/signup', { body: { email: mail, password, data: { username: cleanUsername } } });
    // 开启邮箱确认时，Supabase 会按邮件模板发送验证码；关闭时直接建立会话。
    if (data.access_token) {
      const account = { id: data.user && data.user.id, email: mail, username: toUsername(mail, data.user && data.user.user_metadata) || cleanUsername };
      storeSession({ accessToken: data.access_token, refreshToken: data.refresh_token, email: mail, id: account.id, username: account.username });
      user = account;
      notify();
      return { email: mail, username: account.username, userId: account.id, needConfirm: false };
    }
    return { email: mail, username: cleanUsername, needConfirm: true };
  };

  const cloudVerifySignupOtp = async ({ email, token }) => {
    const mail = toEmail(email);
    const data = await api('/verify', { body: { email: mail, token: String(token || '').trim(), type: 'signup' } });
    const account = { id: data.user && data.user.id, email: mail, username: toUsername(mail, data.user && data.user.user_metadata) };
    storeSession({ accessToken: data.access_token, refreshToken: data.refresh_token, email: mail, id: account.id, username: account.username });
    user = account;
    notify();
    return { email: mail, username: account.username, userId: account.id, needConfirm: false };
  };

  const cloudSignIn = async ({ email, password }) => {
    const mail = toEmail(email);
    const data = await api('/token?grant_type=password', { body: { email: mail, password } });
    const account = { id: data.user && data.user.id, email: mail, username: toUsername(mail, data.user && data.user.user_metadata) };
    storeSession({ accessToken: data.access_token, refreshToken: data.refresh_token, email: mail, id: account.id, username: account.username });
    user = account;
    notify();
    return { email: mail, username: account.username, userId: account.id, needConfirm: false };
  };

  const refresh = async () => {
    const saved = readSession();
    if (!saved || !saved.refreshToken) return null;
    try {
      const data = await api('/token?grant_type=refresh_token', { body: { refresh_token: saved.refreshToken } });
      session = { accessToken: data.access_token, refreshToken: data.refresh_token, email: saved.email };
      storeSession(session);
      const me = await api('/user', { method: 'GET', token: session.accessToken });
      const mail = (me && me.email) || saved.email;
      user = { id: (me && me.id) || saved.id, email: mail, username: toUsername(mail, me && me.user_metadata) };
      notify();
      return user;
    } catch (_) {
      storeSession(null);
      user = null;
      notify();
      return null;
    }
  };

  const cloudSignOut = async () => {
    try { await api('/logout', { token: session && session.accessToken }); } catch (_) {}
    storeSession(null);
    user = null;
    notify();
  };

  /* ---------- 本地：只存在这台设备上的演示模式 ---------- */

  const localUsers = () => {
    try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}'); } catch (_) { return {}; }
  };
  const saveLocalUsers = map => {
    try { localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(map)); } catch (_) {}
  };

  const hash = async text => {
    if (!window.crypto?.subtle || !window.TextEncoder) {
      throw new Error('当前浏览器不支持安全密码存储，请使用 HTTPS 或更新浏览器');
    }
    const bytes = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const localSignUp = async ({ email, password, username }) => {
    const map = localUsers();
    const key = email.trim().toLowerCase();
    if (map[key]) throw new Error('这个用户名已经被注册过了');
    map[key] = await hash(password);
    saveLocalUsers(map);
    storeSession({ accessToken: 'local', refreshToken: 'local', email: key, id: 'local:' + key, username: key });
    user = { id: 'local:' + key, email: key, username: String(username || key).trim() };
    notify();
    return { email: key, username: user.username, needConfirm: false };
  };

  const localSignIn = async ({ email, password }) => {
    const map = localUsers();
    const key = email.trim().toLowerCase();
    if (!map[key]) throw new Error('用户名或密码不对');
    if (map[key] !== await hash(password)) throw new Error('用户名或密码不对');
    storeSession({ accessToken: 'local', refreshToken: 'local', email: key, id: 'local:' + key, username: key });
    user = { id: 'local:' + key, email: key, username: key };
    notify();
    return { email: key, username: key, needConfirm: false };
  };

  const localRestore = () => {
    const saved = readSession();
    if (!saved) return null;
    const map = localUsers();
    const key = String(saved.email || '').toLowerCase();
    if (!map[key]) return null;
    user = { id: 'local:' + key, email: key, username: key };
    storeSession({ accessToken: 'local', refreshToken: 'local', email: key, id: 'local:' + key, username: key });
    notify();
    return user;
  };

  /* ---------- 对外的接口 ---------- */

  /* ---------- 邮件链接回来的令牌 ---------- */

  // 确认邮件和重置密码邮件点开后，浏览器会带着令牌回到站点：
  //   老式隐式流：#access_token=...&refresh_token=...&type=signup
  //   新式令牌哈希：/auth/confirm?token=...&type=signup
  // 两种都要接住，否则用户点了邮件链接还是登不进来。
  const redirect = { type: null, user: null };

  const cleanUrl = () => {
    const url = new URL(location.href);
    ['token', 'token_hash', 'access_token', 'refresh_token', 'type', 'error', 'error_description', 'code']
      .forEach(key => url.searchParams.delete(key));
    url.hash = '';
    history.replaceState(null, '', url.pathname + (url.search || ''));
  };

  const handleUrl = async () => {
    if (!cloud) return null;
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(location.search);

    let type = hashParams.get('type') || query.get('type');
    let accessToken = hashParams.get('access_token');
    let refreshToken = hashParams.get('refresh_token');

    // 新式：拿 token_hash 去换一个会话
    const tokenHash = query.get('token_hash') || hashParams.get('token_hash') ||
                      query.get('token') || hashParams.get('token');
    try {
      if (!accessToken && tokenHash) {
        const data = await api('/verify', { body: { token_hash: tokenHash, type: type || 'signup' } });
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
      }

      if (!accessToken) { cleanUrl(); return null; }

      const me = await api('/user', { method: 'GET', token: accessToken });
      storeSession({ accessToken, refreshToken, email: me.email, id: me.id, username: toUsername(me.email) });
      user = { id: me.id, email: me.email, username: toUsername(me.email, me.user_metadata) };
      redirect.type = type || 'signup';
      redirect.user = user;
      // 落地页和账号页可能不是同一个页面，把类型记下来传过去
      try { sessionStorage.setItem('site-auth-redirect', redirect.type); } catch (_) {}
      notify();
      cleanUrl();
      return redirect;
    } catch (error) {
      cleanUrl();          // 令牌作废了，别留在地址栏和历史记录里
      throw error;
    }
  };

  // 重新发一封确认邮件（SMTP 限流恢复了就能再试）
  const resendConfirmation = async email => {
    await api('/resend', { body: { type: 'signup', email: toEmail(email) } });
  };

  // 找回密码：发重置邮件
  const requestReset = async email => {
    await api('/recover', { body: { email: toEmail(email) } });
  };

  // 拿着邮件链接换来的会话，把新密码写回去
  const updatePassword = async password => {
    const token = session && session.accessToken;
    if (!token) throw new Error('会话过期了，请重新点一次邮件链接');
    await api('/user', { method: 'PUT', token, body: { password } });
  };

  const signUp = payload => cloud ? cloudSignUp(payload) : localSignUp(payload);
  const verifySignupOtp = payload => cloud ? cloudVerifySignupOtp(payload) : Promise.reject(new Error('本地模式不支持邮箱验证码'));
  const signIn = payload => cloud ? cloudSignIn(payload) : localSignIn(payload);
  const signOut = () => cloud ? cloudSignOut() : (storeSession(null), user = null, notify(), Promise.resolve());

  const restore = async () => {
    if (!cloud) return localRestore();
    // 邮件链接里带回来的令牌优先处理
    try {
      const result = await handleUrl();
      if (result && result.user) return result.user;
    } catch (_) {}
    const saved = readSession();
    if (!saved) return null;
    // 用 refresh_token 换新 access_token，再取一次用户信息
    return refresh();
  };

  window.siteAuth = {
    mode,
    isConfigured: cloud,
    signUp,
    verifySignupOtp,
    signIn,
    signOut,
    getUser: () => user,
    usernamePattern: USERNAME_RE,
    toEmail,
    getToken: () => (session && session.accessToken) || '',
    redirect,
    resendConfirmation,
    requestReset,
    updatePassword,
    // access_token 过期时用它换新的（数据库请求 401 时会用到）
    refreshSession: () => (cloud ? refresh() : Promise.resolve(user)),
    restore,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
})();
