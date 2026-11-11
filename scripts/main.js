/* =========================================================
   0. 核心配置区（以后加新作品只需改这里和 HTML）
   ========================================================= */
const WORKS_CONFIG = [
  { 
    id: 'pixel-daylight-switch', 
    cardId: 'lighthouse-card', 
    detailId: 'detail-panel'
  },
  { 
    id: 'pixel-orbit', 
    cardId: 'pixel-orbit-card', 
    detailId: 'orbit-detail-panel'
  }
];

const AppState = {
  currentTab: 'home', // 'home' | 'bookmarks'
  searchQuery: '',
  bookmarks: [],
  activeWorkId: WORKS_CONFIG[0].id
};

try {
  const savedBookmarks = localStorage.getItem('ui-archive-bookmarks');
  if (savedBookmarks) AppState.bookmarks = JSON.parse(savedBookmarks);
} catch (_) {}

const saveBookmarks = () => {
  try { localStorage.setItem('ui-archive-bookmarks', JSON.stringify(AppState.bookmarks)); } catch (_) {}
};

/* =========================================================
   1. 导航、搜索与列表渲染
   ========================================================= */
const navHome = document.getElementById('nav-home');
const navBookmark = document.getElementById('nav-bookmark');
const galleryCards = WORKS_CONFIG.map(work => document.getElementById(work.cardId)).filter(Boolean);
const emptyState = document.getElementById('empty-state');
const emptyDesc = document.getElementById('empty-desc');
const searchInput = document.getElementById('search-input');
const searchWrapper = document.getElementById('search-wrapper');
const searchClear = document.getElementById('search-clear');
const searchStatus = document.getElementById('search-status');

const renderGallery = () => {
  let visibleCount = 0;
  galleryCards.forEach(item => {
    const isBookmarked = AppState.bookmarks.includes(item.dataset.id);
    const title = item.querySelector('.card-title')?.textContent || '';
    const searchMatch = title.toLowerCase().includes(AppState.searchQuery.toLowerCase());
    const shouldShow = AppState.currentTab === 'home'
      ? searchMatch
      : isBookmarked && searchMatch;
    item.classList.toggle('hidden', !shouldShow);
    if (shouldShow) visibleCount++;
  });

  if (!visibleCount) {
    emptyDesc.textContent = AppState.currentTab === 'bookmarks'
      ? (AppState.searchQuery ? '收藏中没有找到匹配的作品' : '你还没有收藏任何作品哦')
      : (AppState.searchQuery ? '没有找到匹配的作品' : '还没有添加作品');
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
  }
};

const syncSearchUI = () => {
  const query = AppState.searchQuery;
  searchWrapper.classList.toggle('is-active', query.length > 0);
  searchClear.hidden = query.length === 0;
  searchInput.value = query;
  if (query) {
    const visible = galleryCards.filter(item => !item.classList.contains('hidden')).length;
    searchStatus.textContent = visible ? '找到 ' + visible + ' 个作品' : '没有找到匹配的作品';
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

navHome.addEventListener('click', () => {
  AppState.currentTab = 'home';
  navHome.classList.add('active'); navBookmark.classList.remove('active');
  navHome.setAttribute('aria-pressed', 'true'); navBookmark.setAttribute('aria-pressed', 'false');
  renderGallery();
});

navBookmark.addEventListener('click', () => {
  AppState.currentTab = 'bookmarks';
  navBookmark.classList.add('active'); navHome.classList.remove('active');
  navBookmark.setAttribute('aria-pressed', 'true'); navHome.setAttribute('aria-pressed', 'false');
  renderGallery();
});

searchInput.addEventListener('input', event => updateSearch(event.target.value));
searchClear.addEventListener('click', () => { updateSearch(''); searchInput.focus(); });
searchWrapper.addEventListener('click', event => { if (event.target !== searchClear) searchInput.focus(); });

document.addEventListener('keydown', event => {
  const target = event.target;
  const isTyping = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  if ((event.key === '/' && !isTyping) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
    event.preventDefault(); searchInput.focus(); searchInput.select(); return;
  }
  if (event.key === 'Escape' && document.activeElement === searchInput) {
    if (AppState.searchQuery) updateSearch(''); else searchInput.blur();
  }
});

renderGallery();
syncSearchUI();

/* =========================================================
   2. 万能作品展示框架 (Work Controller)
   ========================================================= */
(() => {
  const closeBtn = document.getElementById('close-card');
  const expandBtn = document.getElementById('expand-artwork');
  const bookmarkBtn = document.getElementById('bookmark-card');
  
  let activeWork = null;
  let activeCard = null;
  let mode = 'closed';
  let placeholder = null;
  let originRect = null;
  let targetBox = null;
  let artworkReturnHeight = 0;
  let expanded = false;
  let activeAnimation = null;

  const measureTarget = () => {
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    if (isMobile) return { left: 14, top: 18, width: Math.max(220, window.innerWidth - 28), padding: 12 };
    const detailWidth = Math.min(520, Math.max(300, window.innerWidth * 0.38 - 36));
    const width = Math.min(860, window.innerWidth - 36 - detailWidth - 24);
    return { left: 18, top: 18, width: Math.max(320, width), padding: 12 };
  };

  const setGeometry = (card, box) => {
    card.style.left = box.left + 'px';
    card.style.top = box.top + 'px';
    card.style.width = box.width + 'px';
    card.style.padding = box.padding + 'px';
    if (box.height == null) card.style.removeProperty('height');
    else card.style.height = box.height + 'px';
  };

  const calculateArtworkGeometry = () => {
    const mount = activeCard.querySelector('.preview-mount');
    const mRect = mount.getBoundingClientRect();
    const ratio = mRect.width > 0 && mRect.height > 0 ? mRect.width / mRect.height : 1.6439;
    
    const availW = Math.max(220, window.innerWidth - 36);
    const availH = Math.max(180, window.innerHeight - 36);
    const controlRail = 56;
    const bottomInset = 15;
    const innerWidth = Math.max(180, Math.min(availW - 30, (availH - controlRail - bottomInset) * ratio));
    const innerHeight = innerWidth / ratio;
    const width = innerWidth + 30;
    const height = innerHeight + controlRail + bottomInset;
    return {
      left: Math.round((window.innerWidth - width) / 2),
      top: Math.round((window.innerHeight - height) / 2),
      width, height, padding: 12
    };
  };

  const animateGeometry = (card, from, to, onFinish) => {
    if (activeAnimation) activeAnimation.cancel();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    const fromFrame = { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', padding: from.padding + 'px' };
    const toFrame = { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', padding: to.padding + 'px' };
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

    animation.finished.then(() => {
      if (activeAnimation !== animation) return;
      
      animation.cancel();
      setGeometry(card, to);
      card.getBoundingClientRect();
      
      activeAnimation = null;
      onFinish?.();
    }).catch(() => {});
  };

  const openWork = (card, work) => {
    if (mode !== 'closed') return;
    activeCard = card;
    activeWork = work;
    AppState.activeWorkId = work.id;
    updateBookmarkBtn();
    
    originRect = card.getBoundingClientRect();
    targetBox = measureTarget();
    expanded = false;
    mode = 'opening';
    
    document.body.classList.remove('artwork-only');
    card.classList.remove('is-artwork-expanded');
    setExpandControl(false);
    document.body.classList.add('viewing');
    card.classList.add('is-open', 'is-title-expanded');

    placeholder = document.createElement('div');
    placeholder.className = 'preview-card-placeholder';
    placeholder.style.width = '100%';
    placeholder.style.height = originRect.height + 'px';
    card.parentNode.insertBefore(placeholder, card);

    card.style.position = 'fixed';
    card.style.margin = '0';
    card.style.transition = 'none';
    setGeometry(card, { left: originRect.left, top: originRect.top, width: originRect.width, padding: 8 });

    card.getBoundingClientRect();
    
    animateGeometry(
      card,
      { left: originRect.left, top: originRect.top, width: originRect.width, padding: 8 },
      targetBox,
      () => {
        mode = 'open';
        card.style.transition = '';
        closeBtn.focus({ preventScroll: true });
      }
    );
  };

  const closeWork = () => {
    if (mode === 'closed' || mode === 'closing') return;
    const currentRect = activeCard.getBoundingClientRect();
    
    if (activeAnimation) activeAnimation.cancel();
    
    mode = 'closing';
    expanded = false;
    
    // ★ 核心修改：一开始就移出 viewing 解除导航隐藏，依靠遮罩层的淡出自然显露导航栏
    document.body.classList.remove('artwork-only', 'viewing');
    document.body.classList.add('view-closing');
    
    // 确保详情面板能感知到是哪个作品在关闭
    if (activeWork.id === 'pixel-daylight-switch') {
      document.body.classList.add('lighthouse-closing');
    } else if (activeWork.id === 'pixel-orbit') {
      document.body.classList.add('orbit-view-closing');
    }

    activeCard.classList.add('is-closing');
    activeCard.classList.remove('is-artwork-expanded');
    setExpandControl(false);
    
    const title = activeCard.querySelector('.card-title');
    const titleAnim = title ? title.animate(
      [{ fontSize: getComputedStyle(title).fontSize }, { fontSize: '13px' }],
      { duration: 460, easing: 'cubic-bezier(.22,.8,.2,1)', fill: 'both' }
    ) : null;

    animateGeometry(
      activeCard,
      { left: currentRect.left, top: currentRect.top, width: currentRect.width, height: currentRect.height, padding: 12 },
      { left: originRect.left, top: originRect.top, width: originRect.width, height: originRect.height, padding: 8 },
      () => {
        activeCard.classList.remove('is-title-expanded', 'is-open', 'is-closing');
        if (titleAnim) titleAnim.cancel();
        
        ['position', 'left', 'top', 'width', 'height', 'padding', 'margin', 'transition'].forEach(prop => activeCard.style.removeProperty(prop));
        document.body.classList.remove('viewing', 'view-closing', 'lighthouse-closing', 'orbit-view-closing');
        if (placeholder) { placeholder.remove(); placeholder = null; }
        
        mode = 'closed';
        AppState.activeWorkId = WORKS_CONFIG[0].id;
        if (AppState.currentTab === 'bookmarks') renderGallery();
        updateBookmarkBtn();
        activeCard.focus({ preventScroll: true });
        
        activeCard = null;
        activeWork = null;
      }
    );
  };

  const toggleExpand = () => {
    if (mode !== 'open' || activeAnimation) return;
    const rect = activeCard.getBoundingClientRect();
    const from = { left: rect.left, top: rect.top, width: rect.width, height: rect.height, padding: 12 };

    if (!expanded) {
      artworkReturnHeight = rect.height;
      expanded = true;
      document.body.classList.add('artwork-only');
      activeCard.classList.add('is-artwork-expanded');
      setExpandControl(true);
      
      const target = calculateArtworkGeometry();
      
      animateGeometry(activeCard, from, target, () => {
        setGeometry(activeCard, target);
        mode = 'open';
      });
    } else {
      expanded = false;
      document.body.classList.remove('artwork-only');
      activeCard.classList.remove('is-artwork-expanded');
      
      const target = { ...targetBox, height: artworkReturnHeight };
      animateGeometry(activeCard, from, target, () => {
        setGeometry(activeCard, targetBox);
        setExpandControl(false);
        mode = 'open';
      });
    }
  };

  const setExpandControl = (isExpanded) => {
    expandBtn.innerHTML = isExpanded
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v5H3M16 3v5h5M3 16h5v5M21 16h-5v5" /></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></svg>';
    expandBtn.setAttribute('aria-label', isExpanded ? '返回作品介绍' : '放大作品展示区域');
    expandBtn.setAttribute('aria-pressed', String(isExpanded));
  };

  const updateBookmarkBtn = () => {
    bookmarkBtn.setAttribute('aria-pressed', String(AppState.bookmarks.includes(AppState.activeWorkId)));
  };

  WORKS_CONFIG.forEach(work => {
    const card = document.getElementById(work.cardId);
    if (!card) return;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.preview-mount, button, a, input, select, textarea, [role="button"]')) return;
      if (mode === 'closed') openWork(card, work);
    });

    card.addEventListener('keydown', (e) => {
      if (e.target !== card || !['Enter', ' '].includes(e.key)) return;
      e.preventDefault();
      if (mode === 'closed') openWork(card, work);
    });
  });

  closeBtn.addEventListener('click', closeWork);
  expandBtn.addEventListener('click', toggleExpand);
  
  bookmarkBtn.addEventListener('click', () => {
    const id = AppState.activeWorkId;
    const index = AppState.bookmarks.indexOf(id);
    if (index > -1) AppState.bookmarks.splice(index, 1);
    else AppState.bookmarks.push(id);
    saveBookmarks();
    updateBookmarkBtn();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mode === 'open') {
      if (expanded) toggleExpand(); else closeWork();
    }
  });

  window.addEventListener('resize', () => {
    if (mode === 'open') {
      if (activeAnimation) { activeAnimation.cancel(); activeAnimation = null; }
      
      if (expanded) {
        const box = calculateArtworkGeometry();
        setGeometry(activeCard, box);
        activeCard.style.height = box.height + 'px';
      } else {
        targetBox = measureTarget();
        setGeometry(activeCard, targetBox);
      }
    }
  });

  /* =========================================================
     专属业务逻辑：海边灯塔的场景切换（不影响通用框架）
     ========================================================= */
  const detailPanel = document.getElementById('detail-panel');
  if (detailPanel) {
    const sceneChoices = [...detailPanel.querySelectorAll('[data-scene-choice]')];
    const validScenes = new Set(sceneChoices.map(b => b.dataset.sceneChoice));
    let selectedScene = 'seaside';
    try {
      const saved = localStorage.getItem('pds-gallery-scene');
      if (saved && validScenes.has(saved)) selectedScene = saved;
    } catch (_) {}

    const updateScenes = () => {
      sceneChoices.forEach(btn => {
        const active = btn.dataset.sceneChoice === selectedScene;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    };

    sceneChoices.forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        selectedScene = btn.dataset.sceneChoice;
        try { localStorage.setItem('pds-gallery-scene', selectedScene); } catch (_) {}
        updateScenes();
        
        const mount = document.querySelector('#lighthouse-card .preview-mount');
        const root = mount?.querySelector('[data-ld-part="toggle-daylight"]');
        if (root) {
          root.dataset.scene = selectedScene;
          const api = window.PixelDaylightSwitch;
          if (api && typeof api.unmount === 'function' && typeof api.mount === 'function') {
            api.unmount(root); api.mount(root);
          }
        }
      });
    });
    updateScenes();
  }
})();
