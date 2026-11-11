/* =========================================================
   0. 核心配置区（以后加新作品只需改这里和 HTML）
   ========================================================= */
const WORKS_CONFIG = [
  { 
    id: 'pixel-daylight-switch', 
    cardId: 'lighthouse-card', 
    detailId: 'detail-panel',
    // 指定内容容器选择器：比如灯塔是 WebGL 注入的 class，圆环是 iframe
    contentSelector: '.pds-embed',
    // 灯塔专属的体感宽高比（如果加载慢，用作保底）
    fallbackRatio: 1.6439
  },
  { 
    id: 'pixel-orbit', 
    cardId: 'pixel-orbit-card', 
    detailId: 'orbit-detail-panel',
    contentSelector: 'iframe',
    fallbackRatio: 1.6439
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
  
  let activeWork = null; // 当前激活的作品配置
  let activeCard = null; // 当前激活的 DOM
  let mode = 'closed';   // 'closed' | 'opening' | 'open' | 'closing'
  let placeholder = null; // 占位符，防止网格塌陷
  let originRect = null;  // 记录初始位置
  let targetBox = null;   // 正常展开时的目标尺寸
  let artworkReturnHeight = 0; // 放大模式下记录返回高度
  let expanded = false;   // 是否处于放大模式
  
  // 动画与渲染帧状态
  let activeAnimation = null;
  let syncFrame = 0;
  let contentState = null; // 冻结内部元素的宽高状态

  // 监听动态注入的内容（如 Lighthouse 的 canvas）
  const waitForEl = (selector, root, timeout = 8000) => new Promise((resolve, reject) => {
    if (!root) return reject();
    const existing = root.querySelector(selector);
    if (existing) return resolve(existing);
    const observer = new MutationObserver(() => {
      const found = root.querySelector(selector);
      if (found) { observer.disconnect(); clearTimeout(timer); resolve(found); }
    });
    observer.observe(root, { childList: true, subtree: true });
    const timer = setTimeout(() => { observer.disconnect(); reject(); }, timeout);
  });

  const getContentNode = (card, work) => card.querySelector(work.contentSelector);
  const previewMount = (card) => card.querySelector('.preview-mount');

  // --- 几何计算与尺寸设定 ---
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

  const calculateArtworkGeometry = (work, mountWidth = 0, mountHeight = 0) => {
    const ratio = mountWidth > 0 && mountHeight > 0 ? mountWidth / mountHeight : work.fallbackRatio;
    const availW = Math.max(220, window.innerWidth - 36);
    const availH = Math.max(180, window.innerHeight - 36);
    const controlRail = 56; // 底部操作条
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

  // --- 内容缩放与视觉同步 (核心防抖机制) ---
  const freezeContent = (card, work) => {
    if (contentState) return;
    const node = getContentNode(card, work);
    if (!node) return;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    if (width <= 0 || height <= 0) return;

    // 冻结原始宽高，剥离 CSS 的控制权
    contentState = {
      node,
      width,
      height,
      styles: ['width', 'height', 'aspect-ratio', 'transform', 'transform-origin'].map(name => [
        name, node.style.getPropertyValue(name), node.style.getPropertyPriority(name)
      ])
    };
    node.style.setProperty('width', width + 'px', 'important');
    node.style.setProperty('height', height + 'px', 'important');
    node.style.setProperty('aspect-ratio', 'auto', 'important');
    node.style.setProperty('transform-origin', 'top left', 'important');
  };

  const restoreContent = () => {
    if (!contentState) return;
    contentState.styles.forEach(([name, value, priority]) => {
      if (value) contentState.node.style.setProperty(name, value, priority);
      else contentState.node.style.removeProperty(name);
    });
    contentState = null;
  };

  const syncContentScale = (card) => {
    if (!contentState) return;
    const mount = previewMount(card);
    if (!mount) return;
    const rect = mount.getBoundingClientRect();
    const scale = Math.min(rect.width / contentState.width, rect.height / contentState.height);
    contentState.node.style.setProperty('transform', `scale(${scale})`, 'important');
  };

  const startContentSync = (animation, card) => {
    if (syncFrame) cancelAnimationFrame(syncFrame);
    const tick = () => {
      if (activeAnimation !== animation || !contentState) return;
      syncContentScale(card);
      syncFrame = requestAnimationFrame(tick);
    };
    syncFrame = requestAnimationFrame(tick);
  };

  const stopContentSync = () => {
    if (syncFrame) cancelAnimationFrame(syncFrame);
    syncFrame = 0;
  };

  // --- 通用动画执行器 ---
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

    freezeContent(card, activeWork);
    startContentSync(animation, card);

    animation.finished.then(() => {
      if (activeAnimation !== animation) return;
      
      // 动画结束：瞬间落地，强制重排并撤除缩放，消除亚像素抖动
      animation.cancel();
      setGeometry(card, to);
      card.getBoundingClientRect();
      
      stopContentSync();
      activeAnimation = null;
      onFinish?.();
    }).catch(() => {});
  };

  // --- 动作 1：打开卡片 ---
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
    
    // UI 状态
    document.body.classList.remove('artwork-only');
    card.classList.remove('is-artwork-expanded');
    setExpandControl(false);
    document.body.classList.add('viewing');
    card.classList.add('is-open', 'is-title-expanded');

    // 插入占位符，完美锁定网格位置
    placeholder = document.createElement('div');
    placeholder.className = 'preview-card-placeholder';
    placeholder.style.width = '100%';
    placeholder.style.height = originRect.height + 'px';
    card.parentNode.insertBefore(placeholder, card);

    // 初始固定定位
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
        restoreContent();
      }
    );
  };

  // --- 动作 2：关闭卡片 ---
  const closeWork = () => {
    if (mode === 'closed' || mode === 'closing') return;
    const currentRect = activeCard.getBoundingClientRect();
    
    if (activeAnimation) activeAnimation.cancel();
    if (syncFrame) cancelAnimationFrame(syncFrame);
    
    mode = 'closing';
    expanded = false;
    document.body.classList.remove('artwork-only');
    document.body.classList.add('view-closing');
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
        
        // 恢复原样
        ['position', 'left', 'top', 'width', 'height', 'padding', 'margin', 'transition'].forEach(prop => activeCard.style.removeProperty(prop));
        document.body.classList.remove('viewing', 'view-closing');
        if (placeholder) { placeholder.remove(); placeholder = null; }
        
        mode = 'closed';
        AppState.activeWorkId = WORKS_CONFIG[0].id;
        if (AppState.currentTab === 'bookmarks') renderGallery();
        updateBookmarkBtn();
        activeCard.focus({ preventScroll: true });
        
        restoreContent();
        activeCard = null;
        activeWork = null;
      }
    );
  };

  // --- 动作 3：切换放大/正常模式 ---
  const toggleExpand = () => {
    if (mode !== 'open' || activeAnimation) return;
    const rect = activeCard.getBoundingClientRect();
    const from = { left: rect.left, top: rect.top, width: rect.width, height: rect.height, padding: 12 };

    if (!expanded) {
      // 进入放大模式
      artworkReturnHeight = rect.height;
      expanded = true;
      document.body.classList.add('artwork-only');
      activeCard.classList.add('is-artwork-expanded');
      setExpandControl(true);
      
      const mount = previewMount(activeCard);
      const mRect = mount.getBoundingClientRect();
      const target = calculateArtworkGeometry(activeWork, mRect.width, mRect.height);
      
      animateGeometry(activeCard, from, target, () => {
        setGeometry(activeCard, target);
        mode = 'open';
        restoreContent();
      });
    } else {
      // 退出放大模式
      expanded = false;
      document.body.classList.remove('artwork-only');
      activeCard.classList.remove('is-artwork-expanded');
      
      const target = { ...targetBox, height: artworkReturnHeight };
      animateGeometry(activeCard, from, target, () => {
        setGeometry(activeCard, targetBox);
        setExpandControl(false);
        mode = 'open';
        restoreContent();
      });
    }
  };

  // --- 辅助 UI 操作 ---
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

  // --- 事件绑定 ---
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
      stopContentSync();
      
      if (expanded) {
        const mount = previewMount(activeCard);
        const mRect = mount.getBoundingClientRect();
        const box = calculateArtworkGeometry(activeWork, mRect.width, mRect.height);
        setGeometry(activeCard, box);
        activeCard.style.height = box.height + 'px';
      } else {
        targetBox = measureTarget();
        setGeometry(activeCard, targetBox);
      }
      syncContentScale(activeCard);
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
