/* =========================================================
   账号数据同步 — v1.1.0
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
    layout: 'ui-archive-gallery-layout',
    pdsScene: 'pds-gallery-scene',
    orbitScene: 'pixel-orbit-home-scene-v2',
    // v2.8.6：收藏夹的文件夹结构（JSON 字符串），跟偏好一起跨设备同步
    bookmarkFolders: 'ui-archive-bookmark-folders'
  };

  const state = {
    active: false,      // 已登录且云端可用
    synced: false,      // 这一轮同步已经跑完
    limited: false,     // 被风控标记：这个账号不参与云端同步
    userId: null,
    error: null
  };

  // 上一次同步完成时的收藏快照。
  // 三方对比（本地 / 云端 / 上次快照）才能分清
  // 「本地新增」和「云端已删」——只比两方的话，
  // 云端删掉的东西会被本地当成新增再传回去，删除就永远传不过来。
  const baselineKey = () => 'site-sync-baseline:' + (state.userId || 'anonymous');
  const readBaseline = () => {
    try { return JSON.parse(localStorage.getItem(baselineKey()) || '[]'); } catch (_) { return []; }
  };
  const writeBaseline = list => {
    try { localStorage.setItem(baselineKey(), JSON.stringify(list)); } catch (_) {}
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
    if (prefs.layout != null && window.siteGalleryLayout) {
      try { window.siteGalleryLayout.set(prefs.layout, { persist: true, sync: false }); } catch (_) {}
    }
    if (prefs.pdsScene != null && window.sitePdsScene) {
      try { window.sitePdsScene.set(prefs.pdsScene); } catch (_) {}
    }
    if (prefs.orbitScene != null && window.siteOrbitScene) {
      try { window.siteOrbitScene.set(prefs.orbitScene); } catch (_) {}
    }
    if (prefs.bookmarkFolders != null) {
      try {
        const list = typeof prefs.bookmarkFolders === 'string'
          ? JSON.parse(prefs.bookmarkFolders)
          : prefs.bookmarkFolders;
        if (Array.isArray(list)) {
          localStorage.setItem(PREF_KEYS.bookmarkFolders, JSON.stringify(list));
          document.dispatchEvent(new CustomEvent('site:folders'));
        }
      } catch (_) {}
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
    get synced() { return state.synced; },
    get limited() { return state.limited; },
    get error() { return state.error; },

    // 收藏：本地先改，再同步到云端
    async setBookmark(workId, on) {
      if (!state.active || state.limited) return;
      try {
        if (on) await pushBookmarks([workId]);
        else await removeBookmark(workId);
        // 基线跟着一起改，否则下一次同步会把它当成"本地新增"再传一遍
        const base = readBaseline();
        const next = on
          ? base.concat(base.indexOf(workId) === -1 ? [workId] : [])
          : base.filter(id => id !== workId);
        writeBaseline(next);
        state.error = null;
      } catch (error) {
        state.error = error.message;
      }
    },

    // 偏好：把本地当前值整份写上去（jsonb 覆盖写）
    async patchPrefs(patch) {
      if (!state.active || state.limited) return;
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

      // 被风控标记的账号：不碰云端（数据库那边也会拦，这里只是别白费力气）
      if (window.siteRisk && typeof window.siteRisk.status === 'function') {
        const risky = await window.siteRisk.status();
        if (risky) {
          state.limited = true;
          state.active = false;
          return;
        }
      }

      try {
        const remote = await pullBookmarks();
        const local = (typeof AppState !== 'undefined' && AppState.bookmarks) ? AppState.bookmarks.slice() : [];
        const base = readBaseline();

        // 本地有、云端没有的，分两类：
        //   快照里有 → 别人那边把它删了，跟着删（删除得以跨设备传播）
        //   快照里没有 → 本地新增，往云端补传
        const localOnly = local.filter(id => remote.indexOf(id) === -1);
        const fresh = localOnly.filter(id => base.indexOf(id) === -1);
        const deletedRemotely = localOnly.filter(id => base.indexOf(id) !== -1);
        if (fresh.length) await pushBookmarks(fresh);

        const merged = remote.concat(fresh);
        if (typeof AppState !== 'undefined') AppState.bookmarks = merged;
        if (typeof saveBookmarks === 'function') saveBookmarks();
        writeBaseline(merged);

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
        state.synced = true;
        window.dispatchEvent(new CustomEvent('site:synced', { detail: { bookmarks: merged, deletedRemotely } }));
      } catch (error) {
        state.error = error.message;
        state.active = false;
      }
    },

    stop() {
      state.active = false;
      state.synced = false;
      state.limited = false;
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
