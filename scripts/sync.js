/* =========================================================
   账号数据同步 — v1.0.0
   ---------------------------------------------------------
   登录之后，收藏和偏好跟着账号走：换台设备登录也还在。

   走的全是 PostgREST（Supabase 自动生成的 REST 接口），
   不引 SDK。每次请求都带用户自己的 access_token，
   数据库那边靠行级安全策略（RLS）判断"这条记录是不是你的"，
   所以前端不需要（也没有能力）越权读别人的数据。

   表结构在 supabase/schema.sql。
   ========================================================= */
(() => {
  const config = window.SITE_AUTH || {};
  const cloud = !!(config.url && config.anonKey);

  // 本地偏好 → 远端 jsonb 字段 的对应关系
  const PREF_KEYS = {
    zoom: 'ui-archive-gallery-zoom',
    pdsScene: 'pds-gallery-scene',
    orbitScene: 'pixel-orbit-home-scene-v2'
  };

  const state = {
    active: false,      // 已登录且云端可用
    userId: null,
    error: null
  };

  const rest = async (path, options = {}) => {
    const send = async () => {
      const res = await fetch(config.url + '/rest/v1/' + path, {
        method: options.method || 'GET',
        headers: Object.assign({
          apikey: config.anonKey,
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + window.siteAuth.getToken()
        }, options.headers || {}),
        body: options.body ? JSON.stringify(options.body) : undefined
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

    try {
      return await send();
    } catch (error) {
      // access_token 过期了：换一个新的再来一次
      if (error.status === 401 && window.siteAuth.refreshSession) {
        await window.siteAuth.refreshSession();
        return send();
      }
      throw error;
    }
  };

  /* ---------- 收藏 ---------- */

  const pullBookmarks = async () => {
    const rows = await rest('user_bookmarks?select=work_id');
    return (rows || []).map(row => row.work_id);
  };

  const pushBookmarks = async ids => {
    if (!ids.length) return;
    await rest('user_bookmarks', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: ids.map(work_id => ({ user_id: state.userId, work_id }))
    });
  };

  const removeBookmark = async workId => {
    await rest('user_bookmarks?work_id=eq.' + encodeURIComponent(workId), { method: 'DELETE' });
  };

  /* ---------- 偏好 ---------- */

  const readLocalPrefs = () => {
    const out = {};
    for (const [name, key] of Object.entries(PREF_KEYS)) {
      try {
        const value = localStorage.getItem(key);
        if (value != null) out[name] = value;
      } catch (_) {}
    }
    return out;
  };

  const applyLocalPrefs = prefs => {
    if (!prefs) return;
    if (prefs.zoom != null && window.siteGalleryZoom) {
      try { window.siteGalleryZoom.set(Number(prefs.zoom)); } catch (_) {}
    }
    if (prefs.pdsScene != null && window.sitePdsScene) {
      try { window.sitePdsScene.set(prefs.pdsScene); } catch (_) {}
    }
    if (prefs.orbitScene != null && window.siteOrbitScene) {
      try { window.siteOrbitScene.set(prefs.orbitScene); } catch (_) {}
    }
  };

  const pullPrefs = async () => {
    const rows = await rest('user_preferences?select=data&limit=1');
    return (rows && rows[0] && rows[0].data) || {};
  };

  const savePrefs = async prefs => {
    await rest('user_preferences', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: { user_id: state.userId, data: prefs }
    });
  };

  /* ---------- 对外接口 ---------- */

  const api = {
    get active() { return state.active; },
    get error() { return state.error; },

    // 收藏：本地先改，再同步到云端
    async setBookmark(workId, on) {
      if (!state.active) return;
      try {
        if (on) await pushBookmarks([workId]);
        else await removeBookmark(workId);
        state.error = null;
      } catch (error) {
        state.error = error.message;
      }
    },

    // 偏好：把本地当前值整份写上去（jsonb 覆盖写）
    async patchPrefs(patch) {
      if (!state.active) return;
      try {
        const merged = Object.assign(readLocalPrefs(), patch || {});
        await savePrefs(merged);
        state.error = null;
      } catch (error) {
        state.error = error.message;
      }
    },

    // 登录后拉一次：远端为准，本地多出来的补上去
    async start() {
      if (!cloud || !window.siteAuth) return;
      const user = window.siteAuth.getUser();
      if (!user || !user.id || user.id === 'local:' + user.email) return;

      state.userId = user.id;
      state.active = true;
      try {
        const remote = await pullBookmarks();
        const local = (typeof AppState !== 'undefined' && AppState.bookmarks) ? AppState.bookmarks.slice() : [];
        const localOnly = local.filter(id => remote.indexOf(id) === -1);
        if (localOnly.length) await pushBookmarks(localOnly);

        const merged = remote.concat(localOnly);
        if (typeof AppState !== 'undefined') AppState.bookmarks = merged;
        if (typeof saveBookmarks === 'function') saveBookmarks();

        const remotePrefs = await pullPrefs();
        applyLocalPrefs(remotePrefs);

        // 本地有、远端没有的偏好，补上去
        const localPrefs = readLocalPrefs();
        const missing = {};
        Object.keys(PREF_KEYS).forEach(name => {
          if (localPrefs[name] != null && remotePrefs[name] == null) missing[name] = localPrefs[name];
        });
        if (Object.keys(missing).length) await savePrefs(Object.assign({}, remotePrefs, missing));

        state.error = null;
        window.dispatchEvent(new CustomEvent('site:synced', { detail: { bookmarks: merged } }));
      } catch (error) {
        state.error = error.message;
        state.active = false;
      }
    },

    stop() {
      state.active = false;
      state.userId = null;
    }
  };

  window.siteSync = api;

  if (!cloud) return;

  // 登录状态一变就跟着变：登录 → 开始同步；退出 → 停止
  window.siteAuth.onChange(user => {
    if (user && user.id) api.start();
    else api.stop();
  });

  window.siteAuth.restore().then(user => {
    if (user && user.id) api.start();
  });
})();
