/* Reveal the home page after its synchronous setup and first paint.
   Live artwork frames continue loading behind their own in-card placeholders. */
(() => {
  const loader = document.getElementById('site-loader');
  if (!loader) return;
  let finished = false;
  const startedAt = performance.now();
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minimumVisible = reduceMotion ? 120 : 520;
  const finish = () => {
    if (finished) return;
    finished = true;
    const wait = Math.max(0, minimumVisible - (performance.now() - startedAt));
    window.setTimeout(() => {
      loader.classList.add('is-done');
      loader.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => loader.remove(), 420);
    }, wait);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      requestAnimationFrame(() => requestAnimationFrame(finish));
    }, { once: true });
  } else {
    requestAnimationFrame(() => requestAnimationFrame(finish));
  }
  // Never let a slow third-party embed keep the entire site covered.
  window.setTimeout(finish, 1750);
})();
