(() => {
  'use strict';

  const PROJECT_ROOT = 'https://gsvegetable.github.io/gongshui-open-source/';
  const PROJECTS = {
    globe: PROJECT_ROOT + 'contributors-globe/?v=1.0.0',
    corridor: PROJECT_ROOT + 'bookmark-hall/?v=1.0.0',
    navigation: PROJECT_ROOT + 'navigation-interaction/?v=1.0.0'
  };
  const frames = Object.create(null);
  let pendingGlobeWork = '';

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
      const iframe = card.querySelector('.preview-mount iframe');
      const knownProject = id === 'contributors-globe' ? PROJECTS.globe
        : id === 'bookmarks-corridor' ? PROJECTS.corridor
        : id === 'navigation-system' ? PROJECTS.navigation : '';
      const mount = card.querySelector('.preview-mount');
      byId.set(id, {
        id,
        title: (card.querySelector('.card-title') || {}).textContent || id,
        en: card.dataset.en || '',
        desc: ((panel && panel.querySelector('.detail-description')) || {}).textContent || '',
        github: (panel && panel.querySelector('.project-link') && panel.querySelector('.project-link').href) || '',
        src: knownProject || (iframe && iframe.getAttribute('src')) || '',
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

  const sendBookmarkData = frame => {
    if (!frame || !frame.contentWindow) return;
    const origin = new URL(frame.src).origin;
    frame.contentWindow.postMessage({
      type: 'gongshui:bookmark-hall:data',
      items: collectBookmarkItems()
    }, origin);
  };

  const createFrame = kind => {
    const mount = document.querySelector('[data-live-preview="' + kind + '"]');
    if (!mount || frames[kind]) return;
    const frame = document.createElement('iframe');
    frame.className = 'portfolio-live-frame';
    frame.title = ({
      globe: '投稿者地球交互预览',
      corridor: '收藏长廊空间预览',
      navigation: '导航交互系统按钮样本'
    })[kind];
    frame.loading = 'lazy';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'fullscreen';
    frame.src = PROJECTS[kind];
    frames[kind] = frame;
    frame.addEventListener('load', () => {
      if (kind === 'corridor') sendBookmarkData(frame);
      if (kind === 'globe' && pendingGlobeWork) {
        frame.contentWindow.postMessage({
          type: 'gongshui:contributors-globe:select-work',
          workId: pendingGlobeWork
        }, new URL(frame.src).origin);
      }
    });
    mount.appendChild(frame);
  };

  createFrame('globe');
  createFrame('corridor');
  createFrame('navigation');

  window.siteGlobe = {
    selectWork(workId) {
      pendingGlobeWork = String(workId || '');
      const frame = frames.globe;
      if (frame && frame.contentWindow && frame.contentDocument && frame.contentDocument.readyState === 'complete') {
        frame.contentWindow.postMessage({
          type: 'gongshui:contributors-globe:select-work',
          workId: pendingGlobeWork
        }, new URL(frame.src).origin);
      }
    }
  };

  document.addEventListener('message', () => {});
  window.addEventListener('message', event => {
    const frame = frames.corridor;
    if (!frame || event.source !== frame.contentWindow || event.origin !== new URL(frame.src).origin) return;
    const message = event.data;
    if (!message || message.type !== 'gongshui:bookmark-hall:open' || typeof message.id !== 'string') return;
    const card = [...document.querySelectorAll('.preview-card[data-id]')].find(item => item.dataset.id === message.id);
    if (card) card.click();
  });

  ['site:bookmarkchange', 'site:folders', 'site:synced'].forEach(name => {
    document.addEventListener(name, () => sendBookmarkData(frames.corridor));
  });
})();