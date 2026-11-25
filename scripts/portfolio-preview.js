(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const mode = params.get('portfolio-preview');

  const createFrame = kind => {
    const mount = document.querySelector('[data-live-preview="' + kind + '"]');
    if (!mount) return;
    const frame = document.createElement('iframe');
    frame.className = 'portfolio-live-frame';
    frame.title = kind === 'globe' ? '投稿者地球交互预览' : '收藏长廊空间预览';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'same-origin';
    frame.allow = 'fullscreen';
    frame.src = './index.html?portfolio-preview=' + kind;
    mount.appendChild(frame);
  };

  if (mode === 'globe' || mode === 'corridor') {
    document.documentElement.classList.add('portfolio-embed');

    const openPreview = () => {
      if (mode === 'globe') {
        // 不依赖被隐藏的导航按钮：直接启动原有地球组件。
        document.body.classList.add('compass-mode');
        const compass = document.getElementById('compass-view');
        compass?.setAttribute('aria-hidden', 'false');
        window.siteGlobe?.open?.();
        return;
      }

      // 收藏长廊沿用原来的收藏数据与渲染器，只切到收藏视图。
      document.getElementById('nav-bookmark')?.click();
      document.body.classList.add('is-bookmarks');
      const hall = document.getElementById('bookmarks-view');
      if (hall) hall.hidden = false;
    };

    if (document.readyState === 'complete') {
      requestAnimationFrame(openPreview);
    } else {
      window.addEventListener('load', () => requestAnimationFrame(openPreview), { once: true });
    }
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
