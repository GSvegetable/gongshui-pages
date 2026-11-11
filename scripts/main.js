/* =========================================================
   数据与状态管理
   ========================================================= */
const AppState = {
  currentTab: 'home', // 'home' | 'bookmarks'
  searchQuery: '',
  bookmarks: [],
  works: [
    { id: 'pixel-daylight-switch', title: '海边灯塔' }
  ]
};

try {
  const savedBookmarks = localStorage.getItem('ui-archive-bookmarks');
  if (savedBookmarks) AppState.bookmarks = JSON.parse(savedBookmarks);
} catch (_) {}

const saveBookmarks = () => {
  try { localStorage.setItem('ui-archive-bookmarks', JSON.stringify(AppState.bookmarks)); } catch (_) {}
};

/* =========================================================
   第一部分：导航、搜索与列表渲染
   ========================================================= */
const navHome = document.getElementById('nav-home');
const navBookmark = document.getElementById('nav-bookmark');
const card = document.getElementById('lighthouse-card');
const emptyState = document.getElementById('empty-state');
const emptyDesc = document.getElementById('empty-desc');
const searchInput = document.getElementById('search-input');
const searchWrapper = document.getElementById('search-wrapper'); // 获取搜索框外层

const renderGallery = () => {
  const isBookmarked = AppState.bookmarks.includes(card.dataset.id);
  const searchMatch = card.querySelector('.card-title').textContent.toLowerCase().includes(AppState.searchQuery.toLowerCase());
  
  let shouldShow = false;
  
  if (AppState.currentTab === 'home') {
    shouldShow = searchMatch;
    if (!shouldShow) {
      emptyDesc.textContent = AppState.searchQuery ? '没有找到匹配的作品' : '还没有添加作品';
    }
  } else if (AppState.currentTab === 'bookmarks') {
    shouldShow = isBookmarked && searchMatch;
    if (!shouldShow) {
      emptyDesc.textContent = AppState.searchQuery ? '收藏中没有找到匹配的作品' : '你还没有收藏任何作品哦';
    }
  }

  if (shouldShow) {
    card.classList.remove('hidden');
    emptyState.classList.remove('visible');
  } else {
    card.classList.add('hidden');
    emptyState.classList.add('visible');
  }
};

navHome.addEventListener('click', () => {
  AppState.currentTab = 'home';
  navHome.classList.add('active');
  navBookmark.classList.remove('active');
  navHome.setAttribute('aria-pressed', 'true');
  navBookmark.setAttribute('aria-pressed', 'false');
  renderGallery();
});

navBookmark.addEventListener('click', () => {
  AppState.currentTab = 'bookmarks';
  navBookmark.classList.add('active');
  navHome.classList.remove('active');
  navBookmark.setAttribute('aria-pressed', 'true');
  navHome.setAttribute('aria-pressed', 'false');
  renderGallery();
});

const searchClear = document.getElementById('search-clear');
const searchStatus = document.getElementById('search-status');

const syncSearchUI = () => {
  const query = AppState.searchQuery;
  searchWrapper.classList.toggle('is-active', query.length > 0);
  searchClear.hidden = query.length === 0;
  searchInput.value = query;
  if (query) {
    const visible = !card.classList.contains('hidden');
    searchStatus.textContent = visible ? '找到 1 个作品' : '没有找到匹配的作品';
    searchStatus.classList.add('visible');
  } else {
    searchStatus.textContent = '';
    searchStatus.classList.remove('visible');
  }
};

const updateSearch = value => {
  AppState.searchQuery = value.trim();
  renderGallery();
  syncSearchUI();
};

searchInput.addEventListener('input', event => updateSearch(event.target.value));
searchClear.addEventListener('click', () => {
  updateSearch('');
  searchInput.focus();
});
searchWrapper.addEventListener('click', event => {
  if (event.target !== searchClear) searchInput.focus();
});

document.addEventListener('keydown', event => {
  const target = event.target;
  const isTyping = target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

  if ((event.key === '/' && !isTyping) ||
      ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
    return;
  }

  if (event.key === 'Escape' && document.activeElement === searchInput) {
    if (AppState.searchQuery) updateSearch('');
    else searchInput.blur();
  }
});

renderGallery();
syncSearchUI();

/* =========================================================
   第二部分：作品详情展开与交互
   ========================================================= */
(() => {
  const close = document.getElementById('close-card');
  const expandArtwork = document.getElementById('expand-artwork');
  const bookmarkCard = document.getElementById('bookmark-card');
  const detailPanel = document.getElementById('detail-panel');
  if (!card || !close || !expandArtwork || !detailPanel) return;

  let origin = null;
  let target = null;
  let mode = 'closed';
  let activeAnimation = null;
  let artworkExpanded = false;
  let artworkReturnHeight = 0;
  let embedFrame = 0;
  let embedVisualState = null;

  const previewMount = card.querySelector('.preview-mount');
  const getEmbedWrapper = () => previewMount ? previewMount.querySelector('.pds-embed') : null;

  const updateBookmarkBtn = () => {
    const isBookmarked = AppState.bookmarks.includes(card.dataset.id);
    bookmarkCard.setAttribute('aria-pressed', String(isBookmarked));
  };
  updateBookmarkBtn();

  bookmarkCard.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = card.dataset.id;
    const index = AppState.bookmarks.indexOf(id);
    
    if (index > -1) {
      AppState.bookmarks.splice(index, 1);
      if (AppState.currentTab === 'bookmarks') {
        setTimeout(() => renderGallery(), 300); 
      }
    } else {
      AppState.bookmarks.push(id);
      navBookmark.classList.add('active');
      navHome.classList.remove('active');
    }
    
    saveBookmarks();
    updateBookmarkBtn();
  });

  const waitForEl = (selector, root, timeout = 8000) =>
    new Promise((resolve, reject) => {
      if (!root) return reject(new Error('no root for ' + selector));
      const existing = root.querySelector(selector);
      if (existing) return resolve(existing);
      const observer = new MutationObserver(() => {
        const found = root.querySelector(selector);
        if (found) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(found);
        }
      });
      observer.observe(root, { childList: true, subtree: true });
      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error('waitForEl timeout: ' + selector));
      }, timeout);
    });

  const sceneChoices = [...detailPanel.querySelectorAll('[data-scene-choice]')];
  const validScenes = new Set(sceneChoices.map(button => button.dataset.sceneChoice));
  let selectedScene = 'seaside';

  try {
    const savedScene = localStorage.getItem('pds-gallery-scene');
    if (savedScene && validScenes.has(savedScene)) selectedScene = savedScene;
  } catch (_) {}

  let sceneRoot = null;

  const updateSceneChoices = () => {
    sceneChoices.forEach(button => {
      const active = button.dataset.sceneChoice === selectedScene;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const chooseScene = scene => {
    if (!validScenes.has(scene)) return;
    selectedScene = scene;
    try { localStorage.setItem('pds-gallery-scene', scene); } catch (_) {}
    updateSceneChoices();
    if (sceneRoot) sceneRoot.dataset.scene = scene;
    const api = window.PixelDaylightSwitch;
    if (sceneRoot && api && typeof api.unmount === 'function' && typeof api.mount === 'function') {
      api.unmount(sceneRoot);
      api.mount(sceneRoot);
    }
  };

  sceneChoices.forEach(button => {
    button.disabled = true;
    button.addEventListener('click', event => {
      event.stopPropagation();
      chooseScene(button.dataset.sceneChoice);
    });
  });
  updateSceneChoices();

  waitForEl('[data-ld-part="toggle-daylight"]', previewMount)
    .then(el => {
      sceneRoot = el;
      sceneRoot.dataset.scene = selectedScene;
      sceneChoices.forEach(button => { button.disabled = false; });
      updateSceneChoices();
    })
    .catch(() => {});

  const measureTarget = () => {
    const compact = window.matchMedia('(max-width: 600px)').matches;
    if (compact) {
      return { left: 14, top: 18, width: Math.max(220, window.innerWidth - 28), padding: 12 };
    }
    const gap = 24;
    const detailWidth = Math.min(520, Math.max(300, window.innerWidth * 0.38 - 36));
    const width = Math.min(860, window.innerWidth - 36 - detailWidth - gap);
    return { left: 18, top: 18, width: Math.max(320, width), padding: 12 };
  };

  const refreshEmbeddedSwitch = () => {
    if (previewMount) void previewMount.offsetWidth;
  };

  const setGeometry = geometry => {
    card.style.left = geometry.left + 'px';
    card.style.top = geometry.top + 'px';
    card.style.width = geometry.width + 'px';
    card.style.padding = geometry.padding + 'px';
    if (geometry.height == null) card.style.removeProperty('height');
    else card.style.height = geometry.height + 'px';
  };

  const ensureEmbedVisualState = embedWrapper => {
    if (embedVisualState) return embedVisualState;
    const width = embedWrapper.offsetWidth;
    const height = embedWrapper.offsetHeight;
    if (width <= 0 || height <= 0) return null;
    embedVisualState = {
      width,
      height,
      styles: ['width', 'height', 'aspect-ratio', 'transform', 'transform-origin']
        .map(name => [name, embedWrapper.style.getPropertyValue(name), embedWrapper.style.getPropertyPriority(name)])
    };
    embedWrapper.style.setProperty('width', width + 'px', 'important');
    embedWrapper.style.setProperty('height', height + 'px', 'important');
    embedWrapper.style.setProperty('aspect-ratio', 'auto', 'important');
    embedWrapper.style.setProperty('transform-origin', 'top left', 'important');
    return embedVisualState;
  };

  const syncEmbedScale = embedWrapper => {
    if (!embedVisualState || !previewMount || !embedWrapper) return;
    const mountBox = previewMount.getBoundingClientRect();
    embedWrapper.style.setProperty(
      'transform',
      'scale(' + Math.min(mountBox.width / embedVisualState.width, mountBox.height / embedVisualState.height) + ')',
      'important'
    );
  };

  // Restore the embed's exact pre-animation inline styles when returning home.
  // Leaving the forced pixel dimensions/scale behind can distort the yellow
  // scene on the next layout pass.
  const restoreEmbedVisualState = () => {
    if (!embedVisualState) return;
    const embedWrapper = getEmbedWrapper();
    if (embedWrapper) {
      for (const [name, value, priority] of embedVisualState.styles) {
        if (value) embedWrapper.style.setProperty(name, value, priority);
        else embedWrapper.style.removeProperty(name);
      }
    }
    embedVisualState = null;
  };

  const runGeometryAnimation = (from, to, onFinish) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const fromFrame = {
      left: from.left + 'px', top: from.top + 'px',
      width: from.width + 'px', padding: from.padding + 'px'
    };
    const toFrame = {
      left: to.left + 'px', top: to.top + 'px',
      width: to.width + 'px', padding: to.padding + 'px'
    };
    if (from.height != null && to.height != null) {
      fromFrame.height = from.height + 'px';
      toFrame.height = to.height + 'px';
    }

    const animation = card.animate([fromFrame, toFrame], {
      duration: reduced ? 1 : 460,
      easing: 'cubic-bezier(.22,.8,.2,1)',
      fill: 'both'
    });
    activeAnimation = animation;

    const embedWrapper = getEmbedWrapper();
    if (embedWrapper) ensureEmbedVisualState(embedWrapper);

    if (embedVisualState && previewMount && embedWrapper) {
      const syncEmbedVisual = () => {
        if (activeAnimation !== animation || !embedVisualState) return;
        syncEmbedScale(embedWrapper);
        embedFrame = requestAnimationFrame(syncEmbedVisual);
      };
      embedFrame = requestAnimationFrame(syncEmbedVisual);
    }

    const stopEmbedVisualSync = () => {
      if (embedFrame) cancelAnimationFrame(embedFrame);
      embedFrame = 0;
      syncEmbedScale(embedWrapper);
    };

    animation.finished.then(() => {
      if (activeAnimation !== animation) return;
      setGeometry(to);
      animation.cancel();
      activeAnimation = null;
      stopEmbedVisualSync();
      onFinish();
    }).catch(() => {});
  };

  const cleanUp = () => {
    artworkExpanded = false;
    document.body.classList.remove('artwork-only');
    card.classList.remove('is-artwork-expanded');
    expandArtwork.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></svg>';
    expandArtwork.setAttribute('aria-label', '放大作品展示区域');
    expandArtwork.setAttribute('aria-pressed', 'false');
    if (activeAnimation) {
      activeAnimation.cancel();
      activeAnimation = null;
    }
    ['position', 'left', 'top', 'width', 'height', 'padding', 'margin', 'transition', 'opacity']
      .forEach(prop => card.style.removeProperty(prop));
    card.classList.remove('is-open', 'details-ready', 'is-title-expanded');
    document.body.classList.remove('viewing', 'view-closing');
    mode = 'closed';
    // Restore the embed's original styles without forcing an extra layout read.
    // That read can make canvas-based embeds repaint like a page refresh.
    restoreEmbedVisualState();
    card.focus({ preventScroll: true });
  };

  const open = () => {
    if (mode !== 'closed') return;
    origin = card.getBoundingClientRect();
    target = measureTarget();
    artworkExpanded = false;
    document.body.classList.remove('artwork-only');
    card.classList.remove('is-artwork-expanded');
    setExpandControl(false);
    mode = 'opening';

    card.style.position = 'fixed';
    card.style.left = origin.left + 'px';
    card.style.top = origin.top + 'px';
    card.style.width = origin.width + 'px';
    card.style.padding = '8px';
    card.style.margin = '0';
    card.style.transition = 'none';

    document.body.classList.add('viewing');
    card.classList.add('is-open', 'is-title-expanded');
    card.getBoundingClientRect();

    runGeometryAnimation(
      { left: origin.left, top: origin.top, width: origin.width, padding: 8 },
      target,
      () => {
        card.classList.add('details-ready');
        mode = 'open';
        card.style.transition = '';
        refreshEmbeddedSwitch();
      }
    );
    close.focus({ preventScroll: true });
  };

  const shut = () => {
    if (mode !== 'open' && mode !== 'opening') return;

    // Use a compositor-only FLIP transform for the return. Resizing the card
    // also resizes/repaints the embedded canvas and can produce a black flash;
    // scaling the already-rendered card keeps the artwork's pixels stable.
    const currentRect = card.getBoundingClientRect();
    if (activeAnimation) {
      activeAnimation.cancel();
      activeAnimation = null;
    }
    if (embedFrame) cancelAnimationFrame(embedFrame);
    embedFrame = 0;

    // Freeze the exact visible rectangle before reversing. This also prevents
    // a snap if close is pressed while the opening animation is still running.
    card.style.position = 'fixed';
    card.style.left = currentRect.left + 'px';
    card.style.top = currentRect.top + 'px';
    card.style.width = currentRect.width + 'px';
    card.style.height = currentRect.height + 'px';
    card.style.padding = '12px';
    card.style.margin = '0';
    card.style.transition = 'none';

    const dx = origin.left - currentRect.left;
    const dy = origin.top - currentRect.top;
    const sx = origin.width / Math.max(1, currentRect.width);
    const sy = origin.height / Math.max(1, currentRect.height);

    mode = 'closing';
    artworkExpanded = false;
    document.body.classList.remove('artwork-only');
    document.body.classList.add('view-closing');
    setExpandControl(false);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const closeAnimation = card.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale(1, 1)', transformOrigin: 'top left' },
        { transform: 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale(' + sx + ', ' + sy + ')', transformOrigin: 'top left' }
      ],
      {
        duration: reduced ? 1 : 460,
        easing: 'cubic-bezier(.22,.8,.2,1)',
        fill: 'forwards'
      }
    );
    // Animate the information panel explicitly as well. This avoids relying on
    // overlapping body-state CSS transitions during the close sequence.
    const detailAnimation = detailPanel.animate(
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(100%)', opacity: 0 }
      ],
      {
        duration: reduced ? 1 : 280,
        easing: 'cubic-bezier(.22,.8,.2,1)',
        fill: 'forwards'
      }
    );
    activeAnimation = closeAnimation;
    Promise.all([closeAnimation.finished, detailAnimation.finished]).then(() => {
      if (activeAnimation !== closeAnimation) return;
      activeAnimation = null;
      closeAnimation.cancel();
      detailAnimation.cancel();
      cleanUp();
    }).catch(() => {});
  };

  card.addEventListener('click', event => {
    if (event.target.closest('.preview-mount, button, a, input, select, textarea, [role="button"]')) return;
    if (mode === 'closed') open();
  });

  card.addEventListener('keydown', event => {
    if (event.target !== card || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (mode === 'closed') open();
  });

  const artworkGeometry = () => {
    const ratio = embedVisualState && embedVisualState.width > 0 && embedVisualState.height > 0
      ? embedVisualState.width / embedVisualState.height
      : 1.6439;
    const availableWidth = Math.max(220, window.innerWidth - 36);
    const availableHeight = Math.max(180, window.innerHeight - 36);
    const controlRail = 56;
    const bottomInset = 15;
    const innerWidth = Math.max(180, Math.min(availableWidth - 30, (availableHeight - controlRail - bottomInset) * ratio));
    const innerHeight = innerWidth / ratio;
    const width = innerWidth + 30;
    const height = innerHeight + controlRail + bottomInset;
    return {
      left: Math.round((window.innerWidth - width) / 2),
      top: Math.round((window.innerHeight - height) / 2),
      width,
      height,
      padding: 12
    };
  };

  const setExpandControl = expanded => {
    expandArtwork.innerHTML = expanded
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v5H3M16 3v5h5M3 16h5v5M21 16h-5v5" /></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></svg>';
    expandArtwork.setAttribute('aria-label', expanded ? '返回作品介绍' : '放大作品展示区域');
    expandArtwork.setAttribute('aria-pressed', String(expanded));
  };

  const toggleArtworkView = () => {
    if (mode !== 'open' || activeAnimation) return;
    const fromRect = card.getBoundingClientRect();
    const from = { left: fromRect.left, top: fromRect.top, width: fromRect.width, height: fromRect.height, padding: 12 };
    
    if (!artworkExpanded) {
      artworkReturnHeight = fromRect.height;
      artworkExpanded = true;
      document.body.classList.add('artwork-only');
      card.classList.add('is-artwork-expanded');
      setExpandControl(true);
      const to = artworkGeometry();
      runGeometryAnimation(from, to, () => {
        mode = 'open';
        card.style.transition = '';
      });
    } else {
      artworkExpanded = false;
      document.body.classList.remove('artwork-only');
      card.classList.remove('is-artwork-expanded');
      
      const to = { ...target, height: artworkReturnHeight };
      runGeometryAnimation(from, to, () => {
        card.style.removeProperty('height');
        setExpandControl(false);
        mode = 'open';
        card.style.transition = '';
        refreshEmbeddedSwitch();
      });
    }
  };

  expandArtwork.addEventListener('click', event => {
    event.stopPropagation();
    toggleArtworkView();
  });

  close.addEventListener('click', event => {
    event.stopPropagation();
    shut();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mode === 'open') {
      if (artworkExpanded) toggleArtworkView();
      else shut();
    }
  });

  window.addEventListener('resize', () => {
    if (mode === 'open' && artworkExpanded) {
      target = measureTarget();
      if (activeAnimation) {
        activeAnimation.cancel();
        activeAnimation = null;
      }
      if (embedFrame) cancelAnimationFrame(embedFrame);
      embedFrame = 0;
      const rect = artworkGeometry();
      setGeometry(rect);
      syncEmbedScale(getEmbedWrapper());
    } else if (mode === 'open') {
      target = measureTarget();
      setGeometry(target);
      refreshEmbeddedSwitch();
    } else if (mode === 'closed' && embedVisualState) {
      if (embedFrame) cancelAnimationFrame(embedFrame);
      embedFrame = 0;
      const embedWrapper = getEmbedWrapper();
      if (embedWrapper) {
        for (const [name, value, priority] of embedVisualState.styles) {
          if (value) embedWrapper.style.setProperty(name, value, priority);
          else embedWrapper.style.removeProperty(name);
        }
      }
      embedVisualState = null;
    }
  });
})();
