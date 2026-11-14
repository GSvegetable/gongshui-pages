/* =========================================================
   First-party device token — privacy-minimized
   ---------------------------------------------------------
   Generate a random browser-installation token only when signup
   risk registration explicitly requests it. No browser fingerprint,
   canvas, hardware, screen, language, or timezone inspection.
   Store the random token locally; send only its SHA-256 digest.
   One localStorage entry only; clearing site data resets it.
   ========================================================= */
(() => {
  const KEY = 'site-device-token';
  let memoryToken = '';
  let memoryDigest = '';

  const makeToken = () => {
    const c = window.crypto;
    if (!c) return 'unknown';
    if (typeof c.randomUUID === 'function') return c.randomUUID();
    if (typeof c.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'unknown';
  };

  const read = () => {
    try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; }
  };

  const get = async () => {
    if (memoryDigest) return memoryDigest;
    memoryToken = memoryToken || read() || makeToken();
    if (memoryToken === 'unknown' || !window.crypto?.subtle || !window.TextEncoder) return 'unknown';
    try {
      const bytes = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(memoryToken));
      memoryDigest = 'devh-' + Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
      try { localStorage.setItem(KEY, memoryToken); } catch (_) {}
      return memoryDigest;
    } catch (_) {
      return 'unknown';
    }
  };

  const reset = () => {
    memoryToken = '';
    memoryDigest = '';
    try { localStorage.removeItem(KEY); } catch (_) {}
  };

  window.siteFingerprint = {
    get,
    reset,
    current: () => (memoryToken || read()) ? '(已生成)' : '(尚未生成)'
  };
})();
