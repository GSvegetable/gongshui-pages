/* =========================================================
   站点账号客户端 — v1.0.0
   ---------------------------------------------------------
   一层薄封装，页面上只认这几个方法：
     siteAuth.mode        'cloud' | 'unavailable'
     siteAuth.signUp({email, password})
     siteAuth.signIn({email, password})
     siteAuth.signOut()
     siteAuth.getUser()    → {email} | null
     siteAuth.onChange(fn)

   云端模式走 Supabase 的 REST 接口（不用 SDK，省掉几十 KB）：
     POST {url}/auth/v1/signup
     POST {url}/functions/v1/username-login（邮箱和用户名统一限流）
     POST {url}/auth/v1/token?grant_type=refresh_token
     POST {url}/auth/v1/logout
     GET  {url}/auth/v1/user

   会话：access_token 放内存，refresh_token 放 localStorage，
   过期了用 refresh_token 换新的 —— 这样刷新页面还能保持登录。
   ========================================================= */
(() => {
  const config = window.SITE_AUTH || {};
  const cloud = !!(config.url && config.anonKey);
  const mode = cloud ? 'cloud' : 'unavailable';

  const SESSION_KEY = 'site-auth-session';
  // Remove credentials created by the retired browser-only demo auth mode.
  try {
    localStorage.removeItem('site-auth-local-users');
    const legacySession = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (legacySession && legacySession.refreshToken === 'local') localStorage.removeItem(SESSION_KEY);
  } catch (_) {}


  // ---------- 用户名 ----------
  // 界面上的身份是「用户名」；Supabase 底层要的是邮箱，
  // 这里做一次转换。用户直接填完整邮箱的也照样认（兼容老账号）。
  const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{3,8}$/;
  const MIN_PASSWORD_LENGTH = 12;

  const toEmail = input => {
    const value = String(input || '').trim();
    if (!value) return '';
    if (value.includes('@')) return value;
    return value.toLowerCase() + '@' + (config.emailDomain || 'gongshui.com');
  };

  const toUsername = (email, metadata) => (metadata && (metadata.username || metadata.user_name || metadata.preferred_username)) || String(email || '').split('@')[0] || '';

  let session = null;          // { accessToken, refreshToken, email }
  let user = null;             // { id, email }  id 就是 auth.uid()，RLS 策略靠它匹配
  const listeners = new Set();

  const notify = () => listeners.forEach(fn => {
    try { fn(user); } catch (_) {}
  });

  const storeSession = value => {
    session = value;
    try {
      if (value) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          refreshToken: value.refreshToken, email: value.email, id: value.id
        }));
        if (value.id && value.refreshToken && value.refreshToken !== 'local') saveAccountToken(value.id, value.refreshToken);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (_) {}
  };

  const readSession = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; }
  };
  const ACCOUNT_TOKENS_KEY = 'site-linked-account-tokens';
  const readAccountTokens = () => { try { return JSON.parse(localStorage.getItem(ACCOUNT_TOKENS_KEY) || '{}'); } catch (_) { return {}; } };
  const saveAccountToken = (id, token) => {
    if (!id || !token) return;
    const map = readAccountTokens(); map[id] = token;
    try { localStorage.setItem(ACCOUNT_TOKENS_KEY, JSON.stringify(map)); } catch (_) {}
  };
  const removeAccountToken = id => {
    if (!id) return;
    const map = readAccountTokens();
    if (!Object.prototype.hasOwnProperty.call(map, id)) return;
    delete map[id];
    try {
      if (Object.keys(map).length) localStorage.setItem(ACCOUNT_TOKENS_KEY, JSON.stringify(map));
      else localStorage.removeItem(ACCOUNT_TOKENS_KEY);
    } catch (_) {}
  };
  const clearAccountTokens = () => {
    try { localStorage.removeItem(ACCOUNT_TOKENS_KEY); } catch (_) {}
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
      const message = payload && (payload.msg || payload.message || payload.error_description || payload.error);
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
    if (text.includes('username already taken') || text.includes('duplicate key value')) return '这个用户名已被使用，请换一个。';
    if (text.includes('invalid login credentials')) return '用户名或密码不对';
    if (text.includes('email not confirmed')) return '这个账号还没完成验证';
    if (text.includes('password should be at least')) return '新密码至少需要 12 位';
    if (text.includes('unable to validate email')) return '用户名格式不对';
    if (text.includes('rate limit') || text.includes('too many')) return '试太频繁了，等一会儿再来';
    if (text.includes('failed to fetch')) return '连不上账号服务，检查一下网络';
    if (text.includes('error sending')) return '邮件暂时发不出去，等一会儿再试';
    if (text.includes('otp_expired') || text.includes('invalid or has expired')) return '这个链接已经过期了，重新发一封吧';
    if (text.includes('access_denied') || text.includes('user denied')) return '你取消了第三方授权，没有登录。可以重新选择 Google 或 GitHub。';
    if (text.includes('provider is not enabled') || text.includes('provider_disabled')) return '这个第三方登录方式尚未在账号服务中启用，请稍后再试。';
    if (text.includes('redirect_uri_mismatch') || text.includes('redirect url')) return '第三方登录回调地址配置不匹配，请检查 OAuth 应用的回调地址。';
    if (text.includes('invalid_client') || text.includes('bad_verification_code')) return '第三方应用凭据无效，请检查 OAuth 应用配置。';
    return String(message);
  };

  const checkPasswordPolicy = async password => {
    const response = await fetch(config.url + '/functions/v1/password-policy', {
      method: 'POST',
      headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(translate(payload.error) || '暂时无法完成密码安全检查，请稍后再试');
    return payload;
  };

  const cloudSignUp = async ({ email, password, username }) => {
    if (String(password || '').length < MIN_PASSWORD_LENGTH) throw new Error('新密码至少需要 12 位');
    await checkPasswordPolicy(password);
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
    const identifier = String(email || '').trim();
    const response = await fetch(config.url + '/functions/v1/username-login', {
      method: 'POST',
      headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier, password })
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(translate(payload.error) || '用户名或密码不正确');
    const data = payload;
    const mail = data.user && data.user.email || (identifier.includes('@') ? identifier : toEmail(identifier));
    const account = { id: data.user && data.user.id, email: mail, username: toUsername(mail, data.user && data.user.user_metadata) };
    storeSession({ accessToken: data.access_token, refreshToken: data.refresh_token, email: mail, id: account.id, username: account.username });
    user = account;
    notify();
    return { email: mail, username: account.username, userId: account.id, needConfirm: false };
  };

  const rpc = async (name, body = {}) => {
    const token = session && session.accessToken;
    if (!token || token === 'local') throw new Error('请先登录');
    const response = await fetch(config.url + '/rest/v1/rpc/' + encodeURIComponent(name), {
      method: 'POST',
      headers: { apikey: config.anonKey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(translate(payload && (payload.message || payload.details || payload.hint)) || '操作失败，请稍后再试');
    return payload;
  };

  const listUsernames = async () => rpc('list_my_usernames');
  const addUsername = async username => rpc('add_my_username', { p_username: String(username || '').trim() });
  const updateUsername = async (oldUsername, newUsername) => rpc('update_my_username', {
    p_old_username: String(oldUsername || '').trim(), p_new_username: String(newUsername || '').trim()
  });
  const listLinkedAccounts = async () => rpc('list_my_linked_accounts');
  const linkAccount = async ({ identifier, password }) => {
    if (!cloud || !session?.accessToken) throw new Error('请先登录');
    const response = await fetch(config.url + '/functions/v1/link-account', {
      method: 'POST',
      headers: { apikey: config.anonKey, Authorization: 'Bearer ' + session.accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(translate(payload.error) || payload.error || '添加账号失败');
    saveAccountToken(payload.user?.id, payload.refresh_token);
    return payload.user;
  };
  const switchAccount = async userId => {
    const refreshToken = readAccountTokens()[userId];
    if (!refreshToken) throw new Error('这台设备没有保存该账号的登录凭据，请先用该账号登录一次');
    try {
      const data = await api('/token?grant_type=refresh_token', { body: { refresh_token: refreshToken } });
      const mail = data.user?.email || '';
      const id = data.user?.id || userId;
      session = { accessToken: data.access_token, refreshToken: data.refresh_token, email: mail, id };
      storeSession(session);
      const me = await api('/user', { method: 'GET', token: session.accessToken });
      user = { id, email: me.email || mail, username: toUsername(me.email || mail, me.user_metadata), avatarUrl: me.user_metadata?.avatar_url || me.user_metadata?.picture || '' };
      notify();
      return user;
    } catch (error) {
      if ([400, 401, 403].includes(error && error.status)) {
        removeAccountToken(userId);
        if (session && session.id === userId) {
          storeSession(null);
          user = null;
          notify();
        }
      }
      throw error;
    }
  };

  /* ---------- 第三方登录：OAuth 2.0 Authorization Code + PKCE ---------- */
  const OAUTH_FLOW_KEY = 'site-auth-oauth-flow';
  const base64Url = bytes => {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };
  const randomUrlSafe = size => {
    const bytes = new Uint8Array(size);
    window.crypto.getRandomValues(bytes);
    return base64Url(bytes);
  };
  const createCodeChallenge = async verifier => {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return base64Url(new Uint8Array(digest));
  };
  const cloudOAuthSignIn = async (provider, intent) => {
    if (!cloud) throw new Error('账号服务尚未配置，暂时不能使用第三方登录');
    provider = String(provider || '').toLowerCase();
    if (!['google', 'github'].includes(provider)) throw new Error('暂不支持这个登录方式');
    if (!window.crypto || !window.crypto.subtle || !window.crypto.getRandomValues) {
      throw new Error('当前浏览器无法启动安全登录，请使用最新版浏览器并通过 HTTPS 访问');
    }

    const verifier = randomUrlSafe(64);
    const challenge = await createCodeChallenge(verifier);
    // 固定回到站点根目录的登录页，避免从首页、子目录或带查询参数的入口
    // 发起登录时产生不同的回调路径。
    const redirectUrl = new URL('/login.html', location.origin);
    if (redirectUrl.protocol !== 'https:' && redirectUrl.hostname !== 'localhost' && redirectUrl.hostname !== '127.0.0.1') {
      throw new Error('第三方登录必须通过 HTTPS 访问');
    }
    const redirectTo = redirectUrl.href;
    const flow = { verifier, intent: intent === 'signup' ? 'signup' : 'signin', provider, startedAt: Date.now(), redirectTo };
    try {
      sessionStorage.setItem(OAUTH_FLOW_KEY, JSON.stringify(flow));
    } catch (_) {
      throw new Error('浏览器未允许临时会话存储，无法安全完成第三方登录');
    }

    const authorize = new URL(config.url + '/auth/v1/authorize');
    authorize.searchParams.set('provider', provider);
    authorize.searchParams.set('redirect_to', redirectTo);
    authorize.searchParams.set('code_challenge', challenge);
    authorize.searchParams.set('code_challenge_method', 's256');
    location.assign(authorize.toString());
  };

  // Refresh tokens are single-use/rotating. Serialize refreshes both within
  // this tab and across tabs where the Web Locks API is available. Each tab
  // re-reads localStorage only after acquiring the lock, so it never races
  // another tab with the same one-time refresh token.
  const withSessionLock = (userId, task) => {
    const locks = window.navigator && window.navigator.locks;
    if (!locks || typeof locks.request !== 'function') return task();
    const lockName = 'site-auth-session:' + String(userId || 'current');
    return locks.request(lockName, { mode: 'exclusive' }, task);
  };

  let refreshPromise = null;
  const refresh = () => {
    if (refreshPromise) return refreshPromise;
    const initial = readSession();
    if (!initial || !initial.refreshToken) return Promise.resolve(null);
    const current = withSessionLock(initial.id, async () => {
      const saved = readSession();
      if (!saved || !saved.refreshToken) return null;
      try {
        const data = await api('/token?grant_type=refresh_token', { body: { refresh_token: saved.refreshToken } });
        session = { accessToken: data.access_token, refreshToken: data.refresh_token, email: saved.email, id: saved.id };
        storeSession(session);
        const me = await api('/user', { method: 'GET', token: session.accessToken });
        const mail = (me && me.email) || saved.email;
        user = { id: (me && me.id) || saved.id, email: mail, username: toUsername(mail, me && me.user_metadata), avatarUrl: (me && me.user_metadata && (me.user_metadata.avatar_url || me.user_metadata.picture)) || '' };
        session.id = user.id;
        storeSession(session);
        notify();
        return user;
      } catch (error) {
        if (saved.id && [400, 401, 403].includes(error && error.status)) removeAccountToken(saved.id);
        storeSession(null);
        user = null;
        notify();
        return null;
      }
    });
    refreshPromise = current;
    return current.finally(() => { if (refreshPromise === current) refreshPromise = null; });
  };

  const cloudSignOut = async () => {
    const accountId = (session && session.id) || (user && user.id);
    try { await api('/logout', { token: session && session.accessToken }); } catch (_) {}
    if (accountId) removeAccountToken(accountId);
    clearAccountTokens();
    storeSession(null);
    user = null;
    notify();
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
    ['token', 'token_hash', 'access_token', 'refresh_token', 'provider_token', 'provider_refresh_token', 'type', 'error', 'error_description', 'code', 'state']
      .forEach(key => url.searchParams.delete(key));
    url.hash = '';
    history.replaceState(null, '', url.pathname + (url.search || ''));
  };

  const handleUrl = async () => {
    if (!cloud) return null;
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(location.search);

    // OAuth 回调先处理授权码；授权码在交换前立即从地址栏清除。
    const oauthCode = query.get('code') || hashParams.get('code');
    const oauthError = query.get('error_description') || query.get('error') || hashParams.get('error_description') || hashParams.get('error');
    if (oauthError) {
      cleanUrl();
      try { sessionStorage.removeItem(OAUTH_FLOW_KEY); } catch (_) {}
      redirect.error = translate(oauthError) || '第三方登录未完成，请重试';
      return null;
    }
    if (oauthCode) {
      cleanUrl();
      let flow = null;
      try { flow = JSON.parse(sessionStorage.getItem(OAUTH_FLOW_KEY) || 'null'); } catch (_) {}
      try { sessionStorage.removeItem(OAUTH_FLOW_KEY); } catch (_) {}
      if (!flow || !flow.verifier) {
        redirect.error = '登录验证信息已失效，请重新发起登录';
        return null;
      }
      if (!Number.isFinite(Number(flow.startedAt)) || Date.now() - Number(flow.startedAt) > 10 * 60 * 1000) {
        redirect.error = '登录请求已超时，请重新选择登录方式';
        return null;
      }
      let expectedRedirect;
      try { expectedRedirect = new URL(flow.redirectTo || ''); } catch (_) { expectedRedirect = null; }
      if (!expectedRedirect || expectedRedirect.origin !== location.origin || expectedRedirect.pathname !== location.pathname || location.pathname !== '/login.html') {
        redirect.error = '登录返回地址不匹配，请重新发起登录';
        return null;
      }
      try {
        const data = await api('/token?grant_type=pkce', { body: { auth_code: oauthCode, code_verifier: flow.verifier } });
        if (!data.access_token || !data.refresh_token || !data.user || !data.user.id) {
          throw new Error('账号服务没有返回完整的登录会话');
        }
        const accountEmail = data.user.email || '';
        const metadata = data.user.user_metadata || {};
        const username = toUsername(accountEmail, metadata) || ('user_' + String(data.user.id).slice(0, 8));
        const account = { id: data.user.id, email: accountEmail, username, avatarUrl: metadata.avatar_url || metadata.picture || '' };
        storeSession({ accessToken: data.access_token, refreshToken: data.refresh_token, email: accountEmail, id: account.id, username });
        user = account;
        notify();
        const createdAt = Date.parse(data.user.created_at || '');
        redirect.type = 'oauth';
        redirect.user = account;
        redirect.intent = flow.intent === 'signup' ? 'signup' : 'signin';
        redirect.isNewUser = Number.isFinite(createdAt) && createdAt >= Number(flow.startedAt || 0) - 120000 && createdAt <= Date.now() + 120000;
        return account;
      } catch (error) {
        redirect.error = error && error.message ? error.message : '第三方登录失败，请重新尝试';
        throw error;
      }
    }

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
      user = { id: me.id, email: me.email, username: toUsername(me.email, me.user_metadata), avatarUrl: (me.user_metadata && (me.user_metadata.avatar_url || me.user_metadata.picture)) || '' };
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
    if (String(password || '').length < MIN_PASSWORD_LENGTH) throw new Error('新密码至少需要 12 位');
    await checkPasswordPolicy(password);
    const token = session && session.accessToken;
    if (!token) throw new Error('会话过期了，请重新点一次邮件链接');
    await api('/user', { method: 'PUT', token, body: { password } });
  };

  const signUp = payload => cloud ? cloudSignUp(payload) : Promise.reject(new Error('账号服务尚未配置，暂时不能注册或登录。请稍后再试。'));
  const verifySignupOtp = payload => cloud ? cloudVerifySignupOtp(payload) : Promise.reject(new Error('账号服务尚未配置，暂时不能验证邮箱。请稍后再试。'));
  const signIn = payload => cloud ? cloudSignIn(payload) : Promise.reject(new Error('账号服务尚未配置，暂时不能注册或登录。请稍后再试。'));
  const signInWithOAuth = (provider, intent) => cloudOAuthSignIn(provider, intent);
  const signOut = () => cloud ? cloudSignOut() : (clearAccountTokens(), storeSession(null), user = null, notify(), Promise.resolve());

  // Multiple page modules call restore during startup; serialize it to avoid
  // concurrent refresh-token rotation and accidental session invalidation.
  let restorePromise = null;
  const restore = () => {
    if (restorePromise) return restorePromise;
    const current = (async () => {
      if (!cloud) return null;
      try {
        const result = await handleUrl();
        if (result && (result.user || result.id)) return result.user || result;
      } catch (error) {
        if (!redirect.error) redirect.error = error && error.message ? error.message : '登录失败，请重试';
      }
      // 用户主动取消授权或 OAuth 回调失败时，留在登录页显示错误；
      // 不要因为浏览器里恰好有旧会话，就立即跳回首页吞掉错误提示。
      if (redirect.error) return null;
      const saved = readSession();
      if (!saved) return null;
      return refresh();
    })();
    restorePromise = current;
    return current.finally(() => { if (restorePromise === current) restorePromise = null; });
  };

  window.siteAuth = {
    mode,
    isConfigured: cloud,
    signUp,
    verifySignupOtp,
    signIn,
    signInWithOAuth,
    signOut,
    getUser: () => user,
    usernamePattern: USERNAME_RE,
    minimumPasswordLength: MIN_PASSWORD_LENGTH,
    listUsernames,
    addUsername,
    updateUsername,
    listLinkedAccounts,
    linkAccount,
    switchAccount,
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
