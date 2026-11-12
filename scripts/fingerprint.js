/* =========================================================
   设备指纹 — v1.0.0
   ---------------------------------------------------------
   给"同一个设备反复注册"这件事一个稳定的标识。

   三层保障：
   ① FingerprintJS（开源版，已内置在 scripts/vendor/fingerprintjs.min.js，
      MIT 协议）：根据浏览器一堆特征算出一个 visitorId，同一台机器
      刷新、换浏览器会话都是同一个值。完全在本地算，不往任何服务器发。
   ② localStorage：存一份，换浏览器会话也认。
   ③ IndexedDB：再存一份。localStorage 被清掉时还能从它恢复，
      反过来也一样 —— 单点清除清不干净。

   取值优先级：已存下来的 > 现算的。
   所以就算两处存储都被清了，只要浏览器特征没变，算出来的还是同一个。
   ========================================================= */
(() => {
  const LS_KEY = 'site-device-fingerprint';
  const IDB_NAME = 'site-fingerprint';
  const IDB_STORE = 'device';
  const IDB_KEY = 'id';

  /* ---------- 存储层 ---------- */

  const readLocal = () => {
    try { return localStorage.getItem(LS_KEY) || ''; } catch (_) { return ''; }
  };
  const writeLocal = value => {
    try { localStorage.setItem(LS_KEY, value); } catch (_) {}
  };

  const idb = () => new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let request;
    try { request = indexedDB.open(IDB_NAME, 1); } catch (_) { return resolve(null); }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });

  const idbRead = async () => {
    const db = await idb();
    if (!db) return '';
    return new Promise(resolve => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || '');
        req.onerror = () => resolve('');
      } catch (_) { resolve(''); }
    });
  };

  const idbWrite = async value => {
    const db = await idb();
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, IDB_KEY);
    } catch (_) {}
  };

  /* ---------- 兜底指纹（算不出 FingerprintJS 时用） ---------- */

  const fallbackFingerprint = async () => {
    const parts = [];
    try {
      parts.push(navigator.userAgent || '');
      parts.push(navigator.language || '');
      parts.push((navigator.languages || []).join(','));
      parts.push(String(screen.width) + 'x' + String(screen.height) + 'x' + String(screen.colorDepth));
      parts.push(String(navigator.hardwareConcurrency || ''));
      parts.push(String(navigator.maxTouchPoints || ''));
      parts.push(String(new Date().getTimezoneOffset()));
      parts.push(String(navigator.platform || ''));
      // 画一小块画布，取它的像素特征
      const canvas = document.createElement('canvas');
      canvas.width = 220; canvas.height = 40;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '15px "Arial"';
        ctx.fillStyle = '#f60'; ctx.fillRect(12, 4, 76, 18);
        ctx.fillStyle = '#069'; ctx.fillText('宫水 gsw', 2, 6);
        ctx.fillStyle = 'rgba(120,180,60,.7)'; ctx.fillText('pixel-2026', 4, 20);
        parts.push(canvas.toDataURL().slice(-160));
      }
    } catch (_) {}
    const text = parts.join('|');
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      try {
        const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return 'fb-' + [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
      } catch (_) {}
    }
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return 'fb-' + Math.abs(hash).toString(16);
  };

  /* ---------- 对外接口 ---------- */

  let pending = null;

  const compute = async () => {
    // FingerprintJS 是异步的，最多等它 3 秒
    // v3 的用法：load() 拿到 agent，再 agent.get() 拿 visitorId
    if (window.FingerprintJS && typeof window.FingerprintJS.load === 'function') {
      try {
        const agent = await Promise.race([
          window.FingerprintJS.load(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        // v3.4 的 agent.get() 返回 { visitorId, confidence, components, version }
        const result = agent && typeof agent.get === 'function' ? await agent.get() : agent;
        const visitorId = typeof result === 'string'
          ? result
          : (result && result.visitorId) || (agent && agent.visitorId);
        if (visitorId) return 'fp-' + visitorId;
      } catch (_) {}
    }
    return fallbackFingerprint();
  };

  const get = async () => {
    if (pending) return pending;
    pending = (async () => {
      // 已存下来的优先：清缓存换浏览器也不换号
      const stored = readLocal() || await idbRead();
      const value = stored || await compute();
      // 两处都写：任何一处被清，另一处能补回来
      writeLocal(value);
      await idbWrite(value);
      return value;
    })();
    return pending;
  };

  // 页面刚加载就先算好，等用户点注册时就不用等
  const warmup = () => { get().catch(() => {}); };

  window.siteFingerprint = {
    get,
    warmup,
    // 调试用：看看当前认定成哪台设备
    current: () => readLocal() || '(还没算)'
  };
})();
