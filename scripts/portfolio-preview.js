(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const mode = params.get('portfolio-preview');
  const createFrame = (kind) => {
    const mount = document.querySelector('[data-live-preview="' + kind + '"]');
    if (!mount) return;
    const frame = document.createElement('iframe');
    frame.className = 'portfolio-live-frame';
    frame.title = kind === 'globe' ? '真实投稿者地球，可旋转和探索' : '真实收藏长廊，可点击前进和查看收藏作品';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'same-origin';
    frame.allow = 'fullscreen';
    frame.src = './index.html?portfolio-preview=' + kind;
    mount.appendChild(frame);
  };
  if (mode === 'globe' || mode === 'corridor') {
    document.documentElement.classList.add('portfolio-embed');
    const open = () => {
      const button = document.getElementById(mode === 'globe' ? 'nav-index' : 'nav-bookmark');
      if (button) button.click();
    };
    if (document.readyState === 'complete') setTimeout(open, 80);
    else window.addEventListener('load', () => setTimeout(open, 80), { once: true });
    return;
  }
  createFrame('globe');
  createFrame('corridor');
  document.addEventListener('click', event => {
    const button = event.target.closest('.nav-showcase-button');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const grid = button.closest('.nav-showcase-grid');
    grid?.querySelectorAll('.nav-showcase-button').forEach(item => {
      item.classList.remove('active', 'is-sample-active');
      item.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('active', 'is-sample-active');
    button.setAttribute('aria-pressed', 'true');
  }, true);
})();