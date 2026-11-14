/* =========================================================
   First-party device token — privacy-minimized
   ---------------------------------------------------------
   Generate a random browser-installation token only when signup
   risk registration explicitly requests it. No browser fingerprint,
   canvas, hardware, screen, language, or timezone inspection.
   One localStorage entry only; clearing site data resets it.
   ========================================================= */
(() => {
  const KEY = 'site-device-token';
  let memoryToken = '';

  const makeToken = () => {
    const c = window.crypto;
    if (!c) return 'unknown';
    if (typeof c.randomUUID === 'function') return 'dev-' + c.randomUUID();
    if (typeof c.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      return 'dev-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'unknown';
  };

  const read = () => {
    try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; }
  };

  const get = async () => {
    if (memoryToken) return memoryToken;
    memoryToken = read() || makeToken();
    try {
      if (memoryToken !== 'unknown') localStorage.setItem(KEY, memoryToken);
    } catch (_) {}
    return memoryToken;
  };

  const reset = () => {
    memoryToken = '';
    try { localStorage.removeItem(KEY); } catch (_) {}
  };

  window.siteFingerprint = {
    get,
    reset,
    current: () => memoryToken || read() || '(尚未生成)'
  };
})();
