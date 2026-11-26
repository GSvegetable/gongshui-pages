(() => {
  'use strict';

  const PROJECT_ROOT = 'https://gsvegetable.github.io/gongshui-open-source/';
  const PROJECTS = {
    globe: PROJECT_ROOT + 'contributors-globe/',
    corridor: PROJECT_ROOT + 'bookmark-hall/',
    navigation: PROJECT_ROOT + 'navigation-interaction/'
  };
  const instances = Object.create(null);
  let pendingGlobeWork = '';

  // Loading UI belongs to each artwork mount, not to the whole page.
  const loadingTimers = new WeakMap();
  const getLoader = mount => {
    let loader = mount.querySelector(':scope > .card-load-state');
    if (loader) return loader;
    loader = document.createElement('div');
    loader.className = 'card-load-state';
    loader.setAttribute('role', 'status');
    loader.setAttribute('aria-live', 'polite');
    loader.innerHTML = '<span class="card-load-pixels" aria-hidden="true"><i></i><i></i><i></i></span><span class="card-load-label">正在载入作品</span>';
    mount.appendChild(loader);
    mount.classList.add('is-loading');
    return loader;
  };
  const setMountState = (mount, state, message) => {
    if (!mount) return;
    const loader = getLoader(mount);
    const timer = loadingTimers.get(mount);
    if (timer) { clearTimeout(timer); loadingTimers.delete(mount); }
    mount.classList.remove('is-loading', 'is-load-error');
    if (state === 'ready') {
      mount.classList.add('is-loaded');
      loader.classList.remove('is-error');
      loader.innerHTML = '<span class="card-load-pixels" aria-hidden="true"><i></i><i></i><i></i></span><span class="card-load-label">正在载入作品</span>';
      const placeholder = mount.querySelector('.portfolio-live-placeholder');
      if (placeholder) placeholder.hidden = true;
      loader.classList.add('is-hidden');
      window.setTimeout(() => loader.remove(), 260);
      return;
    }
    if (state === 'error') {
      mount.classList.add('is-load-error');
      loader.classList.add('is-error');
      loader.innerHTML = '<span class="card-load-error-mark" aria-hidden="true">!</span><span class="card-load-label"></span>';
      loader.querySelector('.card-load-label').textContent = message || '暂时无法载入，请稍后重试';
    }
  };
  const watchVisibleMount = (mount, onTimeout) => {
    let started = false;
    const start = () => {
      if (started || mount.classList.contains('is-loaded')) return;
      started = true;
      loadingTimers.set(mount, window.setTimeout(onTimeout, 15000));
    };
    if (!('IntersectionObserver' in window)) { start(); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        start();
        observer.disconnect();
      }
    }, { rootMargin: '180px' });
    observer.observe(mount);
  };
  const PREVIEW_ORIGIN = 'https://gsvegetable.github.io';
  const previewFrames = [...document.querySelectorAll('.preview-card .preview-mount iframe')];
  window.addEventListener('message', event => {
    if (event.origin !== PREVIEW_ORIGIN || !event.data) return;
    const frame = previewFrames.find(item => item.contentWindow === event.source);
    if (!frame) return;
    const mount = frame.closest('.preview-mount');
    if (frame.matches('[data-pds-preview]') && event.data.type === 'pds-preview-ready') {
      setMountState(mount, 'ready');
    } else if (frame.matches('[data-composition-frame]') && event.data.type === 'pixel-orbit-ready') {
      setMountState(mount, 'ready');
    }
  });

  const pingPreview = frame => {
    if (!frame.contentWindow) return;
    const type = frame.matches('[data-pds-preview]') ? 'pds-ping'
      : frame.matches('[data-composition-frame]') ? 'pixel-orbit-ping' : '';
    if (type) frame.contentWindow.postMessage({ type }, PREVIEW_ORIGIN);
  };

  const initArtworkLoading = () => {
    document.querySelectorAll('.preview-card .preview-mount').forEach(mount => {
      const live = mount.querySelector('[data-live-preview]');
      const frame = mount.querySelector('iframe');
      getLoader(mount);
      if (live) {
        watchVisibleMount(mount, () => setMountState(mount, 'error', '作品初始化超时，请刷新页面重试'));
        return; // Live embeds report readiness through gongshui:embed:ready.
      }
      if (frame) {
        frame.addEventListener('load', () => {
          const label = mount.querySelector('.card-load-label');
          if (label && mount.classList.contains('is-loading')) label.textContent = '作品文档已载入，正在等待首帧';
          pingPreview(frame);
        }, { once: true });
        frame.addEventListener('error', () => setMountState(mount, 'error', '作品画面加载失败'), { once: true });
        watchVisibleMount(mount, () => setMountState(mount, 'error', '作品加载超时，请稍后重试'));
      } else {
        setMountState(mount, 'ready');
      }
    });
  };
  initArtworkLoading();
  // Re-ping in case an eager iframe finished before this script installed its listener.
  previewFrames.forEach(pingPreview);

  const readState = () => {
    try {
      return {
        bookmarks: typeof AppState !== 'undefined' && Array.isArray(AppState.bookmarks) ? AppState.bookmarks : [],
        folders: typeof AppState !== 'undefined' && Array.isArray(AppState.bookmarkFolders) ? AppState.bookmarkFolders : []
      };
    } catch (_) {
      return { bookmarks: [], folders: [] };
    }
  };

  const collectBookmarkItems = () => {
    const cards = [...document.querySelectorAll('.preview-card[data-id]')];
    const byId = new Map();
    cards.forEach(card => {
      const id = card.dataset.id;
      const panel = card.dataset.detail ? document.getElementById(card.dataset.detail) : null;
      const mount = card.querySelector('.preview-mount');
      const iframe = mount && mount.querySelector('iframe');
      const knownProject = id === 'contributors-globe' ? PROJECTS.globe
        : id === 'bookmarks-corridor' ? PROJECTS.corridor
        : id === 'navigation-system' ? PROJECTS.navigation : '';
      const src = knownProject || (iframe && iframe.getAttribute('src')) || '';
      byId.set(id, {
        id,
        title: (card.querySelector('.card-title') || {}).textContent || id,
        en: card.dataset.en || '',
        desc: ((panel && panel.querySelector('.detail-description')) || {}).textContent || '',
        github: (panel && panel.querySelector('.project-link') && panel.querySelector('.project-link').href) || '',
        src,
        ratio: mount ? (parseFloat(getComputedStyle(mount).getPropertyValue('--mount-ratio')) || 1.6439) : 1.6439,
        folder: ''
      });
    });

    const { bookmarks, folders } = readState();
    const ordered = [], seen = new Set(), folderNames = new Map();
    folders.forEach(folder => (Array.isArray(folder.works) ? folder.works : []).forEach(id => {
      if (byId.has(id) && !seen.has(id)) {
        seen.add(id); ordered.push(id); folderNames.set(id, String(folder.name || ''));
      }
    }));
    bookmarks.forEach(id => {
      if (byId.has(id) && !seen.has(id)) { seen.add(id); ordered.push(id); }
    });
    return ordered.map(id => ({ ...byId.get(id), folder: folderNames.get(id) || '' }));
  };

  const openWorkCard = workId => {
    if (typeof workId !== 'string' || !workId) return;
    const card = [...document.querySelectorAll('.preview-card[data-id]')].find(item => item.dataset.id === workId);
    if (card) card.click();
  };

  const sendBookmarkData = () => {
    const api = instances.corridor;
    if (api && typeof api.setItems === 'function') api.setItems(collectBookmarkItems());
  };

  const registerEmbed = detail => {
    if (!detail || !detail.api || !detail.element || !detail.iframe) return;
    const kind = ({
      'contributors-globe': 'globe',
      'bookmark-hall': 'corridor',
      'navigation-interaction': 'navigation'
    })[detail.kind];
    if (!kind || instances[kind] === detail.api) return;
    const mount = document.querySelector('[data-live-preview="' + kind + '"]');
    if (mount !== detail.element) return;

    instances[kind] = detail.api;
    setMountState(mount, 'ready');
    if (kind === 'globe') {
      detail.api.onOpenWork(message => openWorkCard(message.workId));
      if (pendingGlobeWork) detail.api.selectWork(pendingGlobeWork);
    } else if (kind === 'corridor') {
      detail.api.onOpen(message => openWorkCard(message.id));
      detail.api.setItems(collectBookmarkItems());
    }
  };

  window.addEventListener('gongshui:embed:ready', event => registerEmbed(event.detail));
  ['globe', 'corridor', 'navigation'].forEach(kind => {
    const mount = document.querySelector('[data-live-preview="' + kind + '"]');
    if (mount && mount.gongshuiEmbed) {
      registerEmbed({
        kind: kind === 'globe' ? 'contributors-globe' : kind === 'corridor' ? 'bookmark-hall' : 'navigation-interaction',
        element: mount,
        iframe: mount.gongshuiEmbed.iframe,
        api: mount.gongshuiEmbed
      });
    }
  });

  // Preserve the website's existing main.js integration point; it now delegates
  // to the independent component API rather than reaching into the artwork iframe.
  window.siteGlobe = {
    selectWork(workId) {
      pendingGlobeWork = String(workId || '');
      if (instances.globe) instances.globe.selectWork(pendingGlobeWork);
    }
  };

  ['site:bookmarkchange', 'site:folders', 'site:synced'].forEach(name => {
    document.addEventListener(name, sendBookmarkData);
  });
})();