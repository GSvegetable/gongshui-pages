/* =========================================================
   0. 作品自动发现 + 全局状态
   ---------------------------------------------------------
   页面里每个 <article class="preview-card" data-id="..." data-detail="详情面板的id">
   就是一个作品。不需要在这里登记任何东西，新作品复制卡片进 index.html 就自动生效。
   ========================================================= */
const works = [...document.querySelectorAll('.preview-card[data-id]')].map(card => ({
  id: card.dataset.id,
  card,
  mount: card.querySelector('.preview-mount'),
  panel: card.dataset.detail ? document.getElementById(card.dataset.detail) : null,
  ghost: null,   // 展开期间留在原位的占位卡片
  stageW: 0      // 作品内容(舞台)的固定像素宽度
}));

const AppState = {
  currentTab: 'home', // 'home' | 'bookmarks'
  searchQuery: '',
  bookmarks: [],
  activeWorkId: works.length ? works[0].id : null
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
const galleryCards = works.map(work => work.card);
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
    const searchableText = `${title} ${item.dataset.tags || ''}`.toLowerCase();
    const searchMatch = searchableText.includes(AppState.searchQuery.toLowerCase());
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
   1.5 主页画廊双指缩放：只改变卡片网格密度，不缩放导航和搜索栏
   ========================================================= */
(() => {
  const gallery = document.querySelector('main .grid');
  const main = document.querySelector('main');
  if (!gallery || !main) return;
  const MIN = 150, MAX = 520, DEFAULT = 260;
  let cardMin = DEFAULT;
  let pinchStart = null;
  const applyZoom = (next, focalX = window.innerWidth / 2, focalY = window.innerHeight / 2) => {
    const before = gallery.getBoundingClientRect();
    const ratio = Math.max(.1, (focalY - before.top) / Math.max(1, before.height));
    const oldScroll = window.scrollY;
    cardMin = Math.max(MIN, Math.min(MAX, next));
    main.style.setProperty('--gallery-card-min', cardMin + 'px');
    requestAnimationFrame(() => {
      const after = gallery.getBoundingClientRect();
      const delta = (after.height - before.height) * ratio;
      window.scrollTo({top: Math.max(0, oldScroll + delta), behavior:'instant'});
    });
  };
  try {
    const stored = Number(localStorage.getItem('ui-archive-gallery-zoom'));
    if (Number.isFinite(stored) && stored >= MIN && stored <= MAX) cardMin = stored;
  } catch (_) {}
  main.style.setProperty('--gallery-card-min', cardMin + 'px');
  const distance = (a,b) => Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  document.addEventListener('touchstart', event => {
    if (!event.touches || event.touches.length !== 2) return;
    if (!event.target.closest('main')) return;
    pinchStart = {distance:distance(event.touches[0],event.touches[1]), zoom:cardMin,
      x:(event.touches[0].clientX+event.touches[1].clientX)/2,
      y:(event.touches[0].clientY+event.touches[1].clientY)/2};
  }, {passive:true,capture:true});
  document.addEventListener('touchmove', event => {
    if (!pinchStart || !event.touches || event.touches.length !== 2) return;
    event.preventDefault();
    const currentDistance = distance(event.touches[0],event.touches[1]);
    const midpointX=(event.touches[0].clientX+event.touches[1].clientX)/2;
    const midpointY=(event.touches[0].clientY+event.touches[1].clientY)/2;
    applyZoom(pinchStart.zoom * currentDistance / Math.max(1,pinchStart.distance),midpointX,midpointY);
  }, {passive:false,capture:true});
  const clearPinch = () => {
    if (!pinchStart) return;
    pinchStart = null;
    try { localStorage.setItem('ui-archive-gallery-zoom',String(cardMin)); } catch (_) {}
  };
  document.addEventListener('touchend', clearPinch, {passive:true,capture:true});
  document.addEventListener('touchcancel', clearPinch, {passive:true,capture:true});
  main.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    applyZoom(cardMin * Math.exp(-event.deltaY * .003),event.clientX,event.clientY);
    try { localStorage.setItem('ui-archive-gallery-zoom',String(cardMin)); } catch (_) {}
  }, {passive:false});
})();


/* =========================================================
   2. 万能作品展示框架 (Work Controller)
   ---------------------------------------------------------
   做法（FLIP）：
   ① 先拍下卡片现在的位置/大小（First）
   ② 直接把卡片切到最终状态，量出最终的位置/大小（Last）
   ③ 用 Web Animations 从 First 走到 Last
   动画结束时，最终状态本来就已经是真实样式，所以落地时没有任何"收尾替换"，不会抖，不会回弹。

   作品内容不跟着卡片重新布局：它是固定像素尺寸的"舞台"，只用 scale 贴合作品框。
   ========================================================= */
(() => {
  if (!works.length) return;

  const root = document.documentElement;
  const body = document.body;
  const closeBtn = document.getElementById('close-card');
  const expandBtn = document.getElementById('expand-artwork');
  const bookmarkBtn = document.getElementById('bookmark-card');

  /* ---------- 节奏：和 CSS 共用 :root 里的 --dur / --ease ---------- */
  const readCss = name => getComputedStyle(root).getPropertyValue(name).trim();
  const getDuration = () => {
    const raw = readCss('--dur');
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 460;
    return /ms$/.test(raw) ? n : /s$/.test(raw) ? n * 1000 : n;
  };
  const getEasing = () => readCss('--ease') || 'cubic-bezier(.22,.8,.2,1)';

  /* ---------- 尺寸常量（和 style.css 对应） ---------- */
  const DEFAULT_RATIO = 1.6439;
  const CLOSED_CHROME = 26; // 缩略卡：边框 3×2 + 内边距 8×2 + 作品框边框 2×2
  const OPEN_CHROME = 34;   // 展开卡：边框 3×2 + 内边距 12×2 + 作品框边框 2×2

  let mode = 'closed';      // closed | opening | open | expanding | closing
  let current = null;       // 当前作品
  let expanded = false;     // 是否处于"放大作品展示区域"
  let anim = null;          // 正在跑的动画

  /* ---------- 几何：展开后卡片 / 放大作品后卡片应该在哪 ---------- */
  const isMobile = () => window.matchMedia('(max-width: 600px)').matches;

  const openBox = () => {
    if (isMobile()) return { left: 14, top: 18, width: Math.max(220, window.innerWidth - 28) };
    const detailWidth = Math.min(520, Math.max(300, window.innerWidth * 0.38 - 36));
    const width = Math.min(860, window.innerWidth - 36 - detailWidth - 24);
    return { left: 18, top: 18, width: Math.max(320, width) };
  };

  const ratioOf = work => parseFloat(getComputedStyle(work.mount).getPropertyValue('--mount-ratio')) || DEFAULT_RATIO;

  const expandedBox = work => {
    const ratio = ratioOf(work);
    const availW = window.innerWidth - 36;
    const availH = window.innerHeight - 36;
    // 托盘四边对称：左右/上下均为边框3 + 内边距15 + 作品框边框2
    const chrome = 40;
    const contentW = Math.max(160, Math.floor(Math.min(availW - chrome, (availH - chrome) * ratio)));
    const width = contentW + chrome;
    const height = Math.round(contentW / ratio + chrome);
    return {
      left: Math.round((window.innerWidth - width) / 2),
      top: Math.round((window.innerHeight - height) / 2),
      width, height
    };
  };

  const applyBox = (card, box) => {
    card.style.left = box.left + 'px';
    card.style.top = box.top + 'px';
    card.style.width = box.width + 'px';
    if (box.height == null) card.style.removeProperty('height');
    else card.style.height = box.height + 'px';
  };

  /* ---------- 拍快照（First / Last） ---------- */
  const snapshot = el => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const title = el.querySelector('.card-title');
    return {
      left: rect.left, top: rect.top, width: rect.width, height: rect.height,
      padding: cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft,
      titleSize: title ? getComputedStyle(title).fontSize : null
    };
  };

  /* ---------- 作品内容"舞台"：固定像素尺寸 + scale ---------- */
  const setScale = (work, contentWidth) => {
    if (!work.stageW || !(contentWidth > 0)) return;
    const k = contentWidth / work.stageW;
    work.mount.style.setProperty('--k', Math.abs(k - 1) < 0.002 ? '1' : String(k));
  };

  // 舞台宽度 = 展开态作品内容的宽度（这样详情页里内容是原生 1:1 渲染），
  // 如果缩略卡反而更宽（比如手机单列），就取更大的，保证缩略图永远只缩小、不放大变糊。
  const refreshStages = () => {
    const openInner = openBox().width - OPEN_CHROME;
    works.forEach(work => {
      if (!work.mount) return;
      const base = work.ghost || work.card;
      const closedInner = base.getBoundingClientRect().width - CLOSED_CHROME;
      work.stageW = Math.max(openInner, closedInner);
      work.mount.style.setProperty('--stage-w', work.stageW + 'px');
      work.mount.style.setProperty('--stage-h', (work.stageW / ratioOf(work)) + 'px');
      setScale(work, work.mount.getBoundingClientRect().width - 4);
    });
  };

  const byMount = new Map(works.filter(w => w.mount).map(w => [w.mount, w]));
  const resizeObserver = 'ResizeObserver' in window
    ? new ResizeObserver(entries => {
        // 卡片在动画里每一帧改变大小，这里同一帧内就把内容的 scale 跟上，不会错一帧
        entries.forEach(entry => {
          const work = byMount.get(entry.target);
          if (work) setScale(work, entry.contentRect.width);
        });
      })
    : null;

  refreshStages();
  if (resizeObserver) works.forEach(work => work.mount && resizeObserver.observe(work.mount));

  /* ---------- 占位：展开期间原位置留一张看不见的"影子卡片" ---------- */
  // 它是真卡片的克隆（去掉 iframe / 脚本），布局和真卡片一模一样，
  // 所以周围作品绝不会移位；关闭时它的实时位置就是动画的终点。
  const makeGhost = card => {
    const ghost = card.cloneNode(true);
    ['id', 'tabindex', 'aria-label', 'data-id', 'data-detail'].forEach(a => ghost.removeAttribute(a));
    ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    const mount = ghost.querySelector('.preview-mount');
    if (mount) mount.replaceChildren();
    ghost.classList.add('preview-card-placeholder');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    return ghost;
  };

  /* ---------- 滚动锁定（补上滚动条宽度，页面宽度不变） ---------- */
  const lockScroll = () => {
    root.style.setProperty('--sbw', Math.max(0, window.innerWidth - root.clientWidth) + 'px');
    body.classList.add('scroll-locked');
  };
  const unlockScroll = () => {
    body.classList.remove('scroll-locked');
    root.style.removeProperty('--sbw');
  };

  /* ---------- 详情面板：谁是当前作品，谁的面板就 is-active ---------- */
  const setActivePanel = work => {
    works.forEach(w => {
      if (!w.panel) return;
      const on = w === work;
      w.panel.classList.toggle('is-active', on);
      w.panel.setAttribute('aria-hidden', String(!on));
    });
  };

  /* ---------- 可切换展示构图的作品：打开时完整显示，关闭时回到首页裁切 ---------- */
  const setComposition = (work, composition) => {
    if (!work || (composition !== 'art' && composition !== 'full')) return;
    work.card.dataset.composition = composition;
    const frames = work.mount?.querySelectorAll('iframe[data-composition-frame]');
    frames?.forEach(frame => {
      // The outer showcase iframe may still be loading when the card changes state.
      // A postMessage sent before its listener exists is silently lost, leaving the
      // artwork in its cropped home-preview composition. Replay the latest state
      // once the iframe document is ready; the showcase page then relays it to the
      // nested artwork iframe as soon as that document loads.
      if (!frame.dataset.compositionSyncBound) {
        frame.dataset.compositionSyncBound = 'true';
        frame.addEventListener('load', () => {
          const latest = work.card.dataset.composition;
          frame.contentWindow?.postMessage(
            { type: 'pixel-orbit-composition', composition: latest },
            '*'
          );
        });
      }
      frame.contentWindow?.postMessage({ type: 'pixel-orbit-composition', composition }, '*');
    });
  };

  /* ---------- 动画 ---------- */
  const animateCard = (work, first, last, done, revealLab = false) => {
    const card = work.card;
    // Match the detail panel's CSS --dur / --ease exactly, in both directions.
    // The card and side panel must arrive and leave together.
    const duration = getDuration();
    const easing = getEasing();

    card.classList.add('is-animating');

    const frames = [
      { left: first.left + 'px', top: first.top + 'px', width: first.width + 'px', height: first.height + 'px', padding: first.padding },
      { left: last.left + 'px', top: last.top + 'px', width: last.width + 'px', height: last.height + 'px', padding: last.padding }
    ];
    const animations = [card.animate(frames, { duration, easing, fill: 'backwards' })];

    // Reveal the lab row on the exact same timeline as the card rise.
    const labRow = revealLab ? card.querySelector('.card-inline-experience') : null;
    if (labRow) {
      labRow.style.visibility = 'visible';
      labRow.style.overflow = 'hidden';
      labRow.style.maxHeight = '0px';
      labRow.style.opacity = '0';
      labRow.style.transform = 'translateY(-12px)';
      animations.push(labRow.animate(
        [
          { maxHeight: '0px', opacity: 0, transform: 'translateY(-12px)' },
          { maxHeight: '56px', opacity: 1, transform: 'translateY(0)' }
        ],
        { duration, easing, fill: 'forwards' }
      ));
      work.labRevealAnimation = animations[animations.length - 1];
    }

    const title = card.querySelector('.card-title');
    if (title && first.titleSize && last.titleSize && first.titleSize !== last.titleSize) {
      animations.push(title.animate(
        [{ fontSize: first.titleSize }, { fontSize: last.titleSize }],
        { duration, easing, fill: 'backwards' }
      ));
    }

    const token = { animations, cancelled: false };
    anim = token;

    Promise.all(animations.map(a => a.finished)).then(() => {
      if (token.cancelled) return;
      anim = null;
      card.classList.remove('is-animating');
      if (done) done();
    }).catch(() => {});
  };

  const stopAnim = () => {
    if (!anim) return;
    anim.cancelled = true;
    anim.animations.forEach(a => a.cancel());
    anim = null;
    if (current) current.card.classList.remove('is-animating');
  };

  /* ---------- 展开 ---------- */
  const openWork = work => {
    if (mode !== 'closed') return;
    const card = work.card;

    current = work;
    mode = 'opening';
    expanded = false;
    AppState.activeWorkId = work.id;
    updateBookmarkBtn();
    setExpandControl(false);

    const first = snapshot(card);                 // ① First：现在的样子

    work.ghost = makeGhost(card);                 // 原位放占位，周围不动
    card.parentNode.insertBefore(work.ghost, card);
    lockScroll();
    setActivePanel(work);
    setComposition(work, 'full');

    body.classList.remove('artwork-only');
    body.classList.add('viewing');
    card.classList.add('is-open');
    applyBox(card, openBox());                    // ② 直接切到最终状态
    const last = snapshot(card);                  //    量出 Last

    animateCard(work, first, last, () => {
      mode = 'open';
      const labRow = card.querySelector('.card-inline-experience');
      if (labRow) {
        if (work.labRevealAnimation) work.labRevealAnimation.cancel();
        labRow.style.maxHeight = '56px';
        labRow.style.opacity = '1';
        labRow.style.transform = 'none';
        labRow.style.visibility = 'visible';
      }
      work.labRevealAnimation = null;
      closeBtn.focus({ preventScroll: true });
    }, true);
  };

  /* ---------- 关闭 ---------- */
  const finishClose = work => {
    const card = work.card;
    ['left', 'top', 'width', 'height'].forEach(p => card.style.removeProperty(p));
    card.classList.remove('is-closing', 'is-animating');
    if (work.ghost) { work.ghost.remove(); work.ghost = null; }
    body.classList.remove('view-closing');
    unlockScroll();
    setActivePanel(null);

    mode = 'closed';
    current = null;
    expanded = false;
    AppState.activeWorkId = works[0].id;
    if (AppState.currentTab === 'bookmarks') renderGallery();
    updateBookmarkBtn();
    refreshStages();
    card.focus({ preventScroll: true });
  };

  const closeWork = () => {
    if (mode === 'closed' || mode === 'closing' || !current) return;
    const work = current;
    const card = work.card;

    const first = snapshot(card);                 // 中途点关闭，也从当前画面接着走
    stopAnim();
    if (work.labRevealAnimation) {
      work.labRevealAnimation.cancel();
      work.labRevealAnimation = null;
    }
    const labRow = card.querySelector('.card-inline-experience');
    if (labRow) {
      labRow.style.maxHeight = '0px';
      labRow.style.opacity = '0';
      labRow.style.transform = 'translateY(-12px)';
      labRow.style.visibility = 'hidden';
    }

    const ghost = snapshot(work.ghost);           // 终点 = 占位卡片的实时位置
    const last = { left: ghost.left, top: ghost.top, width: ghost.width, height: ghost.height, padding: ghost.padding, titleSize: ghost.titleSize };

    mode = 'closing';
    expanded = false;
    setExpandControl(false);
    setComposition(work, 'art');

    // 导航、搜索框不在这里动：它们本来就站在遮罩下面，遮罩淡出时自然显露
    body.classList.remove('viewing', 'artwork-only');
    body.classList.add('view-closing');
    card.classList.remove('is-open', 'is-artwork-expanded');
    card.classList.add('is-closing');
    applyBox(card, last);

    animateCard(work, first, last, () => finishClose(work));
  };

  /* ---------- 放大 / 还原作品展示区域 ---------- */
  const toggleExpand = () => {
    if (mode !== 'open') return;
    const work = current;
    const card = work.card;

    mode = 'expanding';
    const first = snapshot(card);
    expanded = !expanded;

    if (expanded) {
      body.classList.add('artwork-only');
      card.classList.add('is-artwork-expanded');
      applyBox(card, expandedBox(work));
    } else {
      body.classList.remove('artwork-only');
      card.classList.remove('is-artwork-expanded');
      applyBox(card, openBox());
    }
    setExpandControl(expanded);

    const last = snapshot(card);
    animateCard(work, first, last, () => { mode = 'open'; });
  };

  const setExpandControl = isExpanded => {
    expandBtn.innerHTML = isExpanded
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v5H3M16 3v5h5M3 16h5v5M21 16h-5v5" /></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></svg>';
    expandBtn.setAttribute('aria-label', isExpanded ? '返回作品介绍' : '放大作品展示区域');
    expandBtn.setAttribute('aria-pressed', String(isExpanded));
  };

  const updateBookmarkBtn = () => {
    bookmarkBtn.setAttribute('aria-pressed', String(AppState.bookmarks.includes(AppState.activeWorkId)));
  };

  /* ---------- 事件 ---------- */
  works.forEach(work => {
    const card = work.card;

    card.addEventListener('click', e => {
      if (e.target.closest('.preview-mount, button, a, input, select, textarea, [role="button"]')) return;
      if (mode === 'closed') openWork(work);
    });

    card.addEventListener('keydown', e => {
      if (e.target !== card || !['Enter', ' '].includes(e.key)) return;
      e.preventDefault();
      if (mode === 'closed') openWork(work);
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

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mode === 'open') {
      if (expanded) toggleExpand(); else closeWork();
    }
  });

  window.addEventListener('resize', () => {
    if (current && anim) stopAnim();

    if (mode === 'closing' && current) {
      finishClose(current);
      return;
    }

    refreshStages();

    if (current && ['opening', 'expanding', 'open'].includes(mode)) {
      applyBox(current.card, expanded ? expandedBox(current) : openBox());
      mode = 'open';
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
        const rootEl = mount?.querySelector('[data-ld-part="toggle-daylight"]');
        if (rootEl) {
          rootEl.dataset.scene = selectedScene;
          const api = window.PixelDaylightSwitch;
          if (api && typeof api.unmount === 'function' && typeof api.mount === 'function') {
            api.unmount(rootEl); api.mount(rootEl);
          }
        }
      });
    });
    updateScenes();
  }


})();
