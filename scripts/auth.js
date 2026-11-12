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
    if (text.includes('user already registered')) return '这个邮箱已经注册过了';
    if (text.includes('invalid login credentials')) return '邮箱或密码不对';
    if (text.includes('email not confirmed')) return '邮箱还没确认，去收一下验证邮件';
    if (text.includes('password should be at least')) return '密码至少要 6 位';
    if (text.includes('unable to validate email')) return '邮箱格式不对';
    if (text.includes('rate limit') || text.includes('too many')) return '试太频繁了，等一会儿再来';
    if (text.includes('failed to fetch')) return '连不上账号服务，检查一下网络';
    return String(message);
  };

  const cloudSignUp = async ({ email, password }) => {
    const data = await api('/signup', { body: { email, password } });
    // 没开"确认邮箱"的话，signup 会直接返回会话
    if (data.access_token) {
      storeSession({ accessToken: data.access_token, refreshToken: data.refresh_token, email, id: data.user && data.user.id });
      user = { id: data.user && data.user.id, email };
      notify();
      return { email, needConfirm: false };
    }
    return { email, needConfirm: true };
  };

  const cloudSignIn = async ({ email, password }) => {
    const data = await api('/token?grant_type=password', { body: { email, password } });
    storeSession({ accessToken: data.access_token, refreshToken: data.refresh_token, email, id: data.user && data.user.id });
    user = { id: data.user && data.user.id, email };
    notify();
    return { email, needConfirm: false };
  };

  const refresh = async () => {
    const saved = readSession();
    if (!saved || !saved.refreshToken) return null;
    try {
      const data = await api('/token?grant_type=refresh_token', { body: { refresh_token: saved.refreshToken } });
      session = { accessToken: data.access_token, refreshToken: data.refresh_token, email: saved.email };
      storeSession(session);
      const me = await api('/user', { method: 'GET', token: session.accessToken });
      user = { id: (me && me.id) || saved.id, email: (me && me.email) || saved.email };
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
    if (window.crypto && crypto.subtle) {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return String(text);   // 老浏览器兜底
  };

  const localSignUp = async ({ email, password }) => {
    const map = localUsers();
    const key = email.trim().toLowerCase();
    if (map[key]) throw new Error('这个邮箱已经注册过了');
    map[key] = await hash(password);
    saveLocalUsers(map);
    storeSession({ accessToken: 'local', refreshToken: 'local', email: key, id: 'local:' + key });
    user = { id: 'local:' + key, email: key };
    notify();
    return { email: key, needConfirm: false };
  };

  const localSignIn = async ({ email, password }) => {
    const map = localUsers();
    const key = email.trim().toLowerCase();
    if (!map[key]) throw new Error('邮箱或密码不对');
    if (map[key] !== await hash(password)) throw new Error('邮箱或密码不对');
    storeSession({ accessToken: 'local', refreshToken: 'local', email: key, id: 'local:' + key });
    user = { id: 'local:' + key, email: key };
    notify();
    return { email: key, needConfirm: false };
  };

  const localRestore = () => {
    const saved = readSession();
    if (!saved) return null;
    const map = localUsers();
    const key = String(saved.email || '').toLowerCase();
    if (!map[key]) return null;
    user = { id: 'local:' + key, email: key };
    storeSession({ accessToken: 'local', refreshToken: 'local', email: key, id: 'local:' + key });
    notify();
    return user;
  };

  /* ---------- 对外的接口 ---------- */

  const signUp = payload => cloud ? cloudSignUp(payload) : localSignUp(payload);
  const signIn = payload => cloud ? cloudSignIn(payload) : localSignIn(payload);
  const signOut = () => cloud ? cloudSignOut() : (storeSession(null), user = null, notify(), Promise.resolve());

  const restore = () => {
    if (!cloud) return Promise.resolve(localRestore());
    const saved = readSession();
    if (!saved) return Promise.resolve(null);
    // 先用 refresh_token 换新 access_token，再取一次用户信息
    return refresh();
  };

  window.siteAuth = {
    mode,
    isConfigured: cloud,
    signUp,
    signIn,
    signOut,
    getUser: () => user,
    getToken: () => (session && session.accessToken) || '',
    // access_token 过期时用它换新的（数据库请求 401 时会用到）
    refreshSession: () => (cloud ? refresh() : Promise.resolve(user)),
    restore,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
})();
