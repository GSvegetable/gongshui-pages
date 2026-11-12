/* =========================================================
   注册风控 — v1.0.0
   ---------------------------------------------------------
   目的不是"拦住"批量注册，而是**软限制**：
   同一台设备（指纹）或同一个 IP 在 24 小时内注册超过 2 个账号，
   账号照样能注册、能登录、能看作品，
   但收藏和偏好同步会被停掉（服务端 RLS 真正拦，前端只是提示）。

   每次注册都会在 signup_risk 表里留一条：
     指纹（客户端算，存了指纹的机器认得出）、IP（服务端从请求头取，
     客户端填不了）、用户名、用户 id、时间。

   真正的判定在数据库里（supabase/risk.sql 的 apply_signup_risk），
   前端调一下就行，判定逻辑不放在浏览器里，免得被人改前端绕过去。
   ========================================================= */
(() => {
  const config = window.SITE_AUTH || {};
  const cloud = !!(config.url && config.anonKey);

  const state = {
    highRisk: false,
    counts: { fingerprint: 0, ip: 0 },
    registered: false
  };

  const headers = (token, extra) => Object.assign({
    apikey: config.anonKey,
    'Content-Type': 'application/json'
  }, token ? { Authorization: 'Bearer ' + token } : {}, extra || {});

  const request = async (method, path, body, token, extra) => {
    const res = await fetch(config.url + '/rest/v1/' + path, {
      method,
      headers: headers(token, extra),
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 204) return null;
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const error = new Error((data && (data.message || data.msg)) || ('HTTP ' + res.status));
      error.status = res.status;
      throw error;
    }
    return data;
  };

  const api = {
    get highRisk() { return state.highRisk; },
    get counts() { return state.counts; },
    get registered() { return state.registered; },

    // 注册成功后登记一条风控记录
    async record(userId, username) {
      if (!cloud) return false;
      const token = window.siteAuth.getToken();
      if (!token || !userId) return false;
      if (!window.siteFingerprint) return false;
      try {
        const fingerprint = await window.siteFingerprint.get();
        await request('POST', 'signup_risk', {
          user_id: userId,
          username: username || null,
          fingerprint
        }, token, { Prefer: 'resolution=ignore-duplicates,return=minimal' });
        state.registered = true;
        return true;
      } catch (error) {
        // 风控登记失败不该挡住注册本身
        console.warn('风控登记失败：', error && error.message);
        return false;
      }
    },

    // 让服务端判一次：这个账号算不算高风险
    async evaluate() {
      if (!cloud) return state.counts;
      const token = window.siteAuth.getToken();
      if (!token) return state.counts;
      try {
        const data = await request('POST', 'rpc/apply_signup_risk', {}, token);
        state.counts = {
          fingerprint: (data && data.fingerprint_count) || 0,
          ip: (data && data.ip_count) || 0
        };
        state.highRisk = !!(data && data.high_risk);
      } catch (error) {
        console.warn('风控判定失败：', error && error.message);
      }
      return state.counts;
    },

    // 任意时候查一下当前账号的状态（刷新页面后用）
    async status() {
      if (!cloud) return false;
      const token = window.siteAuth.getToken();
      const user = window.siteAuth.getUser();
      if (!token || !user || !user.id) return false;
      try {
        const rows = await request('GET', 'signup_risk?select=high_risk&user_id=eq.' + encodeURIComponent(user.id) + '&limit=1', null, token);
        state.highRisk = !!(rows && rows[0] && rows[0].high_risk);
        state.registered = !!(rows && rows[0]);
      } catch (error) {
        console.warn('风控状态查询失败：', error && error.message);
      }
      return state.highRisk;
    }
  };

  window.siteRisk = api;
})();
