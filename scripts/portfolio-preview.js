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
      const src = id === 'contributors-globe' ? PROJECTS.globe
        : id === 'bookmarks-corridor' ? PROJECTS.corridor
        : id === 'navigation-system' ? PROJECTS.navigation : '';
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