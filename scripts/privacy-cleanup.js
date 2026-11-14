/* Remove legacy persistent browser-fingerprint storage.
   This runs on every page so old local copies are discarded after deployment. */
(() => {
  try { window.localStorage?.removeItem('site-device-fingerprint'); } catch (_) {}
  try {
    if (window.indexedDB) {
      const request = window.indexedDB.deleteDatabase('site-fingerprint');
      request.onerror = () => {};
      request.onblocked = () => {};
    }
  } catch (_) {}
})();
