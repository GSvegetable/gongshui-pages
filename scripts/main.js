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
  bookmarks: [],            // 所有文件夹里作品的并集（老接口 / 云端同步仍用它）
  bookmarkFolders: [],      // [{ id, name, works: [workId] }]
  openFolderId: null,       // 收藏页当前打开的文件夹（null = 文件夹列表）
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
   0.6 收藏夹：文件夹模式
   ---------------------------------------------------------
   收藏从「平铺的一串 id」升级成「文件夹 → 作品 id 列表」：
   · 文件夹结构存 localStorage 'ui-archive-bookmark-folders'，
     并跟偏好一起同步到云端（sync.js 的 bookmarkFolders）。
   · 老版本只有一串收藏 id：第一次加载时自动迁移进「我的收藏」文件夹。
   ========================================================= */
const FOLDERS_KEY = 'ui-archive-bookmark-folders';
const folderUid = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const workIdSet = () => new Set(works.map(w => w.id));

const normalizeFolders = list => (Array.isArray(list) ? list : [])
  .filter(f => f && typeof f.id === 'string' && typeof f.name === 'string')
  .map(f => ({
    id: f.id,
    name: String(f.name).slice(0, 24),
    works: (Array.isArray(f.works) ? f.works : []).filter(id => workIdSet().has(id))
  }));

const deriveBookmarkIds = () => {
  const set = new Set();
  AppState.bookmarkFolders.forEach(folder => folder.works.forEach(id => set.add(id)));
  AppState.bookmarks = Array.from(set);
};

const loadFolders = () => {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]'); } catch (_) {}
  list = normalizeFolders(list);
  // 老数据迁移：没有文件夹但有收藏 → 装进一个「我的收藏」
  if (!list.length && AppState.bookmarks.length) {
    const works_ = AppState.bookmarks.filter(id => workIdSet().has(id));
    if (works_.length) list = [{ id: 'default', name: '我的收藏', works: works_ }];
  }
  AppState.bookmarkFolders = list;
  deriveBookmarkIds();
};

const saveFolders = ({ sync = true } = {}) => {
  deriveBookmarkIds();
  try { localStorage.setItem(FOLDERS_KEY, JSON.stringify(AppState.bookmarkFolders)); } catch (_) {}
  saveBookmarks();
  if (sync) {
    try { window.siteSync?.patchPrefs?.({ bookmarkFolders: JSON.stringify(AppState.bookmarkFolders) }); } catch (_) {}
  }
};

const folderById = id => AppState.bookmarkFolders.find(f => f.id === id) || null;
const folderOfWork = workId => AppState.bookmarkFolders.filter(f => f.works.includes(workId));

const workTitleOf = workId => {
  const w = works.find(item => item.id === workId);
  return w ? (w.card.querySelector('.card-title')?.textContent || '') : '';
};

/* 新建 / 重命名 / 删除 / 文件夹成员切换 */
const createFolder = (name, { workId = null } = {}) => {
  const folder = {
    id: folderUid(),
    name: (String(name || '').trim() || tr('folders.new', '新建文件夹')).slice(0, 24),
    works: workId ? [workId] : []
  };
  AppState.bookmarkFolders.push(folder);
  saveFolders();
  if (workId) window.siteSync?.setBookmark?.(workId, true);
  document.dispatchEvent(new CustomEvent('site:bookmarkchange'));
  return folder;
};

const toggleWorkInFolder = (workId, folderId) => {
  const folder = folderById(folderId);
  if (!folder || !workId) return;
  const had = AppState.bookmarks.includes(workId);
  if (folder.works.includes(workId)) folder.works = folder.works.filter(id => id !== workId);
  else folder.works.push(workId);
  const now = AppState.bookmarkFolders.some(f => f.works.includes(workId));
  saveFolders();
  if (had !== now) window.siteSync?.setBookmark?.(workId, now);
  document.dispatchEvent(new CustomEvent('site:bookmarkchange'));
  renderGallery();
};

const removeWorkFromFolder = (workId, folderId) => {
  const folder = folderById(folderId);
  if (!folder) return;
  folder.works = folder.works.filter(id => id !== workId);
  const still = AppState.bookmarkFolders.some(f => f.works.includes(workId));
  saveFolders();
  if (!still) window.siteSync?.setBookmark?.(workId, false);
  document.dispatchEvent(new CustomEvent('site:bookmarkchange'));
  renderGallery();
};

const renameFolder = (folderId, name) => {
  const folder = folderById(folderId);
  if (!folder) return;
  const next = String(name || '').trim().slice(0, 24);
  if (!next || next === folder.name) return;
  folder.name = next;
  saveFolders();
  renderGallery();
};

const deleteFolder = (folderId) => {
  const folder = folderById(folderId);
  if (!folder) return;
  if (!window.confirm('删除文件夹「' + folder.name + '」？')) return;
  const orphaned = folder.works.filter(id => !AppState.bookmarkFolders.some(f => f.id !== folderId && f.works.includes(id)));
  AppState.bookmarkFolders = AppState.bookmarkFolders.filter(f => f.id !== folderId);
  if (AppState.openFolderId === folderId) AppState.openFolderId = null;
  saveFolders();
  orphaned.forEach(id => window.siteSync?.setBookmark?.(id, false));
  document.dispatchEvent(new CustomEvent('site:bookmarkchange'));
  renderGallery();
};

const openFolder = (folderId) => {
  if (!folderById(folderId)) return;
  AppState.openFolderId = folderId;
  renderGallery();
  window.scrollTo(0, 0);
};

const closeFolder = () => {
  AppState.openFolderId = null;
  renderGallery();
};

/* =========================================================
   0.5 站点文案取词：中文回退写在调用处，英文走 index.html 的 siteI18n
   ---------------------------------------------------------
   语言切换后，搜索状态、空状态、放大按钮这些动态文案要跟着换，
   否则英文态里会残留中文。
   ========================================================= */
const siteLang = () => (document.documentElement.lang === 'en' ? 'en' : 'zh');
const tr = (key, fallback, vars) => {
  // 中文就是页面上的原文，只有切到英文才查字典
  if (siteLang() !== 'en') return fallback;
  const i18n = window.siteI18n;
  if (i18n && typeof i18n.t === 'function') {
    const value = i18n.t(key, vars);
    if (value != null) return value;
  }
  return fallback;
};

/* =========================================================
   1. 导航、搜索与列表渲染
   ========================================================= */
const navHome = document.getElementById('nav-home');
const navBookmark = document.getElementById('nav-bookmark');
const navIndex = document.getElementById('nav-index');
const compassView = document.getElementById('compass-view');
const galleryCards = works.map(work => work.card);
const emptyState = document.getElementById('empty-state');
const emptyDesc = document.getElementById('empty-desc');
const searchInput = document.getElementById('search-input');
const searchWrapper = document.getElementById('search-wrapper');
const searchClear = document.getElementById('search-clear');

/* ---------- 模糊搜索 ----------
   整段包含算命中；再往前一步，查询的字符按顺序散落在标题里也算命中
   （搜「像素环」能命中「像素圆环」）。标题、英文名、标签、编号一起参与匹配；
   详情描述只做整段包含，否则长句会让模糊匹配变得毫无意义。 */
const norm = value => (value || '').toLowerCase().replace(/\s+/g, '');
const fuzzyMatch = (text, query) => {
  if (!query) return true;
  const t = norm(text);
  const q = norm(query);
  if (!q) return true;
  if (t.includes(q)) return true;
  let at = 0;
  for (const ch of q) {
    at = t.indexOf(ch, at);
    if (at === -1) return false;
    at += 1;
  }
  return true;
};

const searchTextOf = card => {
  const title = card.querySelector('.card-title')?.textContent || '';
  const tags = [...card.querySelectorAll('.work-tag')].map(t => t.textContent).join(' ');
  return [title, card.dataset.en || '', tags, card.dataset.id || ''].join(' ');
};

const searchDescOf = card => {
  const panel = card.dataset.detail ? document.getElementById(card.dataset.detail) : null;
  return panel?.querySelector('.detail-description')?.textContent || '';
};

const renderFolderCard = folder => {
  const card = document.createElement('div');
  card.className = 'folder-card';
  card.tabIndex = 0;
  card.dataset.folderId = folder.id;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', folder.name);

  const thumbs = document.createElement('span');
  thumbs.className = 'folder-thumbs';
  const ids = folder.works.slice(0, 3);
  if (!ids.length) {
    const empty = document.createElement('span');
    empty.className = 'folder-thumb is-empty';
    thumbs.appendChild(empty);
  } else {
    ids.forEach(id => {
      const thumb = document.createElement('span');
      thumb.className = 'folder-thumb';
      thumb.dataset.work = id;
      thumbs.appendChild(thumb);
    });
  }
  card.appendChild(thumbs);

  const name = document.createElement('span');
  name.className = 'folder-name';
  name.textContent = folder.name;
  card.appendChild(name);

  card.addEventListener('click', event => {
    if (event.target.closest('.folder-name-input')) return;
    openFolder(folder.id);
  });
  card.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.closest('.folder-name-input')) return;
    event.preventDefault();
    openFolder(folder.id);
  });
  return card;
};

const startFolderRename = (folder, card) => {
  const nameEl = card.querySelector('.folder-name');
  if (!nameEl) return;
  const input = document.createElement('input');
  input.className = 'folder-name-input';
  input.type = 'text';
  input.maxLength = 24;
  input.value = folder.name;
  input.setAttribute('aria-label', tr('folders.rename', '重命名文件夹'));
  nameEl.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const commit = save => {
    if (done) return;
    done = true;
    const value = input.value.trim();
    if (save && value) {
      renameFolder(folder.id, value);
    } else {
      renderGallery();
    }
  };
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); commit(true); }
    else if (event.key === 'Escape') { event.preventDefault(); commit(false); }
  });
  input.addEventListener('blur', () => commit(true));
};

const renderFolderGrid = () => {
  const grid = document.getElementById('folder-grid');
  const hint = document.getElementById('folder-hint');
  if (!grid) return;
  grid.replaceChildren();
  const query = norm(AppState.searchQuery);
  const matches = AppState.bookmarkFolders.filter(folder => {
    if (!query) return true;
    if (norm(folder.name).includes(query)) return true;
    return folder.works.some(id => norm(workTitleOf(id)).includes(query));
  });
  matches.forEach(folder => grid.appendChild(renderFolderCard(folder)));
  if (hint) {
    const noneAtAll = AppState.bookmarkFolders.length === 0;
    hint.hidden = !noneAtAll && matches.length > 0;
    hint.textContent = noneAtAll
      ? tr('folders.empty', '还没有文件夹，点右上角「新建文件夹」开始整理收藏')
      : tr('empty.folderNoMatch', '没有匹配的文件夹');
  }
};

const renderGallery = () => {
  const inBookmarks = AppState.currentTab === 'bookmarks';
  document.body.classList.toggle('is-bookmarks', inBookmarks);

  let folder = inBookmarks && AppState.openFolderId ? folderById(AppState.openFolderId) : null;
  if (inBookmarks && AppState.openFolderId && !folder) AppState.openFolderId = null;
  if (!inBookmarks) folder = null;

  document.body.classList.toggle('folders-root', inBookmarks && !folder);
  document.body.classList.toggle('folder-open', inBookmarks && !!folder);

  const bookmarksView = document.getElementById('bookmarks-view');
  if (bookmarksView) bookmarksView.hidden = !inBookmarks;
  if (inBookmarks) {
    const backBtn = document.getElementById('bookmarks-back');
    const newBtn = document.getElementById('folder-new');
    const titleEl = document.getElementById('bookmarks-title');
    if (backBtn) backBtn.hidden = !folder;
    if (newBtn) newBtn.hidden = !!folder;
    if (titleEl) titleEl.textContent = folder ? folder.name : tr('bookmarks.title', '收藏夹');
    renderFolderGrid();
  }

  const query = norm(AppState.searchQuery);
  let visibleWorks = 0;
  galleryCards.forEach(item => {
    const id = item.dataset.id;
    const searchMatch = query
      ? (fuzzyMatch(searchTextOf(item), query) || norm(searchDescOf(item)).includes(query))
      : true;
    let show;
    if (!inBookmarks) show = searchMatch;
    else if (folder) show = folder.works.includes(id) && searchMatch;
    else show = false; // 文件夹列表页不显示作品卡片
    item.classList.toggle('hidden', !show);
    if (show) visibleWorks++;
  });

  if (inBookmarks && !folder) {
    emptyState.classList.remove('visible');
    return;
  }
  if (!visibleWorks) {
    emptyDesc.textContent = inBookmarks
      ? (query
          ? tr('empty.bookmarkNoMatch', '文件夹中没有找到匹配的作品')
          : tr('empty.folderEmpty', '这个文件夹还是空的，去作品页把喜欢的收进来'))
      : (query
          ? tr('empty.noMatch', '没有找到匹配的作品')
          : tr('empty.noWorks', '还没有添加作品'));
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
};

const updateSearch = value => {
  AppState.searchQuery = value.trim();
  renderGallery();
  syncSearchUI();
};

/* ---------- 指南针视图：首页里的另一个视图，不是新页面 ----------
   点中间那个方块，作品列表收起、指南针内容出现；
   左侧三个马里奥方块始终留在原位可见。 */
const setCompassView = on => {
  if (!navIndex || !compassView) return;
  document.body.classList.toggle('compass-mode', on);
  compassView.setAttribute('aria-hidden', String(!on));
  navIndex.classList.toggle('active', on);
  navIndex.setAttribute('aria-expanded', String(on));
  navHome.classList.toggle('active', !on);
  navHome.setAttribute('aria-pressed', String(!on));
  if (on) {
    window.siteNav?.open('globe', () => setCompassView(false));
    AppState.currentTab = 'home';
    navBookmark.classList.remove('active');
    navBookmark.setAttribute('aria-pressed', 'false');
    renderGallery();
    // 指南针视图里的投稿地球：开
    if (window.siteGlobe && typeof window.siteGlobe.open === 'function') window.siteGlobe.open();
  } else {
    window.siteNav?.close('globe');
    if (window.siteGlobe && typeof window.siteGlobe.close === 'function') {
      // 关
      window.siteGlobe.close();
    }
  }
};

navHome.addEventListener('click', () => {
  setCompassView(false);
  AppState.currentTab = 'home';
  navHome.classList.add('active'); navBookmark.classList.remove('active');
  navHome.setAttribute('aria-pressed', 'true'); navBookmark.setAttribute('aria-pressed', 'false');
  renderGallery();
});

navBookmark.addEventListener('click', () => {
  setCompassView(false);
  const wasBookmarks = AppState.currentTab === 'bookmarks';
  AppState.currentTab = 'bookmarks';
  // 已经在收藏页：再点一次就在「文件夹列表」和「打开的文件夹」之间切换
  AppState.openFolderId = wasBookmarks ? (AppState.openFolderId ? null : AppState.openFolderId) : null;
  navBookmark.classList.add('active'); navHome.classList.remove('active');
  navBookmark.setAttribute('aria-pressed', 'true'); navHome.setAttribute('aria-pressed', 'false');
  renderGallery();
});

navIndex?.addEventListener('click', () => {
  setCompassView(!document.body.classList.contains('compass-mode'));
});

searchInput.addEventListener('input', event => updateSearch(event.target.value));
searchClear.addEventListener('click', () => { updateSearch(''); searchInput.focus(); });
searchWrapper.addEventListener('click', event => { if (event.target !== searchClear) searchInput.focus({ preventScroll: true }); });

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

loadFolders();
renderGallery();
syncSearchUI();

/* ---------- 文件夹内作品：右上角「移出文件夹」按钮 ---------- */
(() => {
  works.forEach(work => {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'bookmark-remove';
    remove.textContent = '✕';
    remove.addEventListener('click', event => {
      event.stopPropagation();
      if (!AppState.openFolderId) return;
      removeWorkFromFolder(work.id, AppState.openFolderId);
    });
    work.card.appendChild(remove);
  });

  const syncMeta = () => {
    const label = tr('folders.remove', '移出文件夹');
    works.forEach(work => {
      const remove = work.card.querySelector('.bookmark-remove');
      if (remove) {
        remove.setAttribute('aria-label', label);
        remove.title = label;
      }
    });
  };
  syncMeta();
  document.addEventListener('site:languagechange', syncMeta);
})();

/* =========================================================
   0.7 收藏夹 UI：工具栏 / 新建 / 返回 / 「收藏到文件夹」弹层
   ========================================================= */
(() => {
  const backBtn = document.getElementById('bookmarks-back');
  const newBtn = document.getElementById('folder-new');
  if (backBtn) backBtn.addEventListener('click', () => closeFolder());
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      const folder = createFolder(tr('folders.new', '新建文件夹'));
      renderGallery();
      const card = document.querySelector('.folder-card[data-folder-id="' + folder.id + '"]');
      if (card) startFolderRename(folder, card);
    });
  }

  // 云端偏好 / 其他设备把文件夹结构同步回来
  document.addEventListener('site:folders', () => {
    loadFolders();
    renderGallery();
    document.dispatchEvent(new CustomEvent('site:bookmarkchange'));
  });

  // 登录同步完成：把云端收藏并进文件夹（不在任何文件夹里的收进默认文件夹）
  document.addEventListener('site:synced', () => {
    const merged = new Set(Array.isArray(AppState.bookmarks) ? AppState.bookmarks : []);
    const known = new Set();
    AppState.bookmarkFolders.forEach(folder => {
      folder.works = folder.works.filter(id => merged.has(id));
      folder.works.forEach(id => known.add(id));
    });
    const orphan = Array.from(merged).filter(id => !known.has(id));
    if (orphan.length) {
      let def = AppState.bookmarkFolders.find(f => f.id === 'default') || AppState.bookmarkFolders[0];
      if (!def) {
        def = { id: 'default', name: '我的收藏', works: [] };
        AppState.bookmarkFolders.push(def);
      }
      def.works.push(...orphan);
    }
    saveFolders({ sync: false });
    renderGallery();
    document.dispatchEvent(new CustomEvent('site:bookmarkchange'));
  });

  /* ---------- 「收藏到文件夹」弹层 ---------- */
  let picker = null;
  let outsideHandler = null;
  const isMobileUI = () => window.matchMedia('(max-width: 600px)').matches;

  const build = () => {
    picker = document.createElement('div');
    picker.className = 'folder-picker';
    picker.id = 'folder-picker';
    picker.hidden = true;
    picker.setAttribute('role', 'dialog');
    picker.innerHTML =
      '<div class="fp-head"><span class="fp-title"></span>' +
      '<button class="fp-close" type="button" aria-label="关闭">×</button></div>' +
      '<div class="fp-list"></div>' +
      '<form class="fp-new"><input type="text" maxlength="24" autocomplete="off" />' +
      '<button type="submit" aria-label="新建文件夹">＋</button></form>';
    document.body.appendChild(picker);
    picker.querySelector('.fp-close').addEventListener('click', close);
    picker.addEventListener('click', event => event.stopPropagation());
    picker.querySelector('.fp-new').addEventListener('submit', event => {
      event.preventDefault();
      const input = picker.querySelector('.fp-new input');
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      createFolder(name, { workId: AppState.activeWorkId });
      input.value = '';
      renderList();
      position();
    });
  };

  const renderList = () => {
    if (!picker) return;
    picker.querySelector('.fp-title').textContent = tr('folders.picker.title', '收藏到文件夹');
    picker.querySelector('.fp-new input').placeholder = tr('folders.picker.new', '新建文件夹名…');
    const list = picker.querySelector('.fp-list');
    list.replaceChildren();
    const workId = AppState.activeWorkId;
    if (!AppState.bookmarkFolders.length) {
      const empty = document.createElement('p');
      empty.className = 'fp-empty';
      empty.textContent = tr('folders.empty', '还没有文件夹，下面新建一个');
      list.appendChild(empty);
    }
    AppState.bookmarkFolders.forEach(folder => {
      const inFolder = folder.works.includes(workId);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'fp-row' + (inFolder ? ' is-in' : '');
      row.setAttribute('aria-pressed', String(inFolder));
      const check = document.createElement('span');
      check.className = 'fp-check';
      check.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'fp-name';
      name.textContent = folder.name;
      const count = document.createElement('span');
      count.className = 'fp-count';
      count.textContent = folder.works.length
        ? tr('folders.count', folder.works.length + ' 件', { n: folder.works.length })
        : '';
      row.append(check, name, count);
      row.addEventListener('click', () => {
        toggleWorkInFolder(workId, folder.id);
        renderList();
      });
      list.appendChild(row);
    });
  };

  const position = () => {
    if (!picker || picker.hidden) return;
    if (isMobileUI()) {
      picker.style.left = '';
      picker.style.top = '';
      return;
    }
    const btn = document.getElementById('bookmark-card');
    const rect = btn ? btn.getBoundingClientRect() : { right: window.innerWidth - 28, bottom: 84, top: 40 };
    const width = picker.offsetWidth || 264;
    const height = picker.offsetHeight || 300;
    let left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    let top = rect.bottom + 12;
    if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 12);
    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
  };

  const open = () => {
    if (picker && !picker.hidden) { close(); return; }
    if (!picker) build();
    renderList();
    picker.hidden = false;
    position();
    setTimeout(() => {
      if (outsideHandler) document.removeEventListener('click', outsideHandler, true);
      outsideHandler = event => {
        if (picker.contains(event.target)) return;
        if (event.target.closest && event.target.closest('#bookmark-card')) return;
        close();
      };
      document.addEventListener('click', outsideHandler, true);
    }, 0);
  };

  const close = () => {
    if (!picker) return;
    picker.hidden = true;
    if (outsideHandler) {
      document.removeEventListener('click', outsideHandler, true);
      outsideHandler = null;
    }
  };

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && picker && !picker.hidden) close();
  });
  window.addEventListener('resize', position);

  window.siteFolderPicker = { open, close };
})();

/* =========================================================
   1.5 主页画廊双指缩放：只改变卡片网格密度，不缩放导航和搜索栏
   ========================================================= */
(() => {
  const gallery = document.querySelector('main .grid');
  const main = document.querySelector('main');
  if (!gallery || !main) return;
  const MIN = 230, MAX = 560, DEFAULT = 300;
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
    window.siteSync?.patchPrefs({ zoom: cardMin });
  };
  document.addEventListener('touchend', clearPinch, {passive:true,capture:true});
  document.addEventListener('touchcancel', clearPinch, {passive:true,capture:true});
  main.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    applyZoom(cardMin * Math.exp(-event.deltaY * .003),event.clientX,event.clientY);
    try { localStorage.setItem('ui-archive-gallery-zoom',String(cardMin)); } catch (_) {}
    window.siteSync?.patchPrefs({ zoom: cardMin });
  }, {passive:false});
})();


/* =========================================================
   1.6 主页画廊布局切换：自适应 / 两列，使用 FLIP 保持画布连续
   ========================================================= */
(() => {
  const main = document.querySelector('main');
  const gallery = main?.querySelector('.grid');
  const button = document.getElementById('layout-toggle');
  if (!main || !gallery || !button) return;

  const KEY = 'ui-archive-gallery-layout';
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let mode = 'auto';

  const syncButton = () => {
    const twoColumns = mode === 'two';
    button.setAttribute('aria-pressed', String(twoColumns));
    const label = window.siteI18n?.t(twoColumns ? 'layout.toggle.auto' : 'layout.toggle.two')
      || (twoColumns ? '切换为自适应布局' : '切换为两列布局');
    button.setAttribute('aria-label', label);
    button.title = label;
  };

  const setLayout = (next, options = {}) => {
    const normalized = next === 'two' ? 'two' : 'auto';
    if (normalized === mode) { syncButton(); return; }

    const cards = [...gallery.querySelectorAll(':scope > .preview-card:not(.hidden)')];
    const firstRects = new Map(cards.map(card => [card, card.getBoundingClientRect()]));
    mode = normalized;
    main.classList.toggle('gallery-layout-two', mode === 'two');
    syncButton();

    requestAnimationFrame(() => {
      for (const card of cards) {
        const first = firstRects.get(card);
        if (!first || !card.isConnected) continue;
        const last = card.getBoundingClientRect();
        if (!first.width || !first.height || !last.width || !last.height) continue;
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        const sx = first.width / last.width;
        const sy = first.height / last.height;
        if (reducedMotion() || (!dx && !dy && sx === 1 && sy === 1)) continue;
        card.animate([
          { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: 'top left', transform: 'none' }
        ], { duration: 560, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'both' });
      }
    });

    if (options.persist !== false) {
      try { localStorage.setItem(KEY, mode); } catch (_) {}
    }
    if (options.sync !== false) {
      try { window.siteSync?.patchPrefs({ layout: mode }); } catch (_) {}
    }
  };

  try { if (localStorage.getItem(KEY) === 'two') mode = 'two'; } catch (_) {}
  main.classList.toggle('gallery-layout-two', mode === 'two');
  syncButton();
  document.addEventListener('site:languagechange', syncButton);
  button.addEventListener('click', () => setLayout(mode === 'two' ? 'auto' : 'two'));
  window.siteGalleryLayout = {
    get: () => mode,
    set: (next, options = {}) => setLayout(next, options)
  };
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

  /* ---------- 作品视图：左侧随页面滚动（取消吸顶），右侧面板独立滚动 ---------- */
  let settled = false;
  let compareOn = false;
  let selectedView = null; // 'main' | 'sub' | null
  let scrollY0 = 0;

  const scopeOf = workId => (workId === 'pixel-orbit' ? 'orbit' : 'pds');
  const workSpacer = document.getElementById('work-spacer');
  const workExtras = document.getElementById('work-extras');
  const compareToggle = document.getElementById('compare-toggle');
  const compareView = document.getElementById('compare-view');

  const mainVersion = () => {
    try {
      if (current && scopeOf(current.id) === 'orbit') return localStorage.getItem('pixel-orbit-home-scene-v2') || 'planet';
      return window.sitePdsScene?.get?.() || 'seaside';
    } catch (_) { return 'seaside'; }
  };

  const positionWorkExtras = () => {
    if (!workExtras || !current || !current.mount) return;
    const mr = current.mount.getBoundingClientRect();
    const cr = current.card.getBoundingClientRect();
    workExtras.style.left = Math.round(mr.left) + 'px';
    workExtras.style.width = Math.round(mr.width) + 'px';
    // v2.8.4：用整张卡片的底部定位，而不是作品框（mount）的底部。
    // mount 下面还有卡片的标题栏，之前 mount.bottom + 14 会让开关
    // 正好压在标题栏上，被卡片（z-index 21）整个盖住，点不到也看不见。
    workExtras.style.top = Math.round(cr.bottom + window.scrollY + 14) + 'px';
    // v2.8.5：手机上作品和详情面板（底部抽屉）上下分屏，
    // 对比副视图改为放在主视图右侧、同一水平线上，两边各占一半宽度。
    if (isMobile() && compareOn) {
      workExtras.style.left = Math.round(cr.left + cr.width + 12) + 'px';
      workExtras.style.width = Math.round(mr.width) + 'px';
      workExtras.style.top = Math.round(mr.top + window.scrollY) + 'px';
    }
  };

  const updateWorkSpacer = () => {
    if (!workSpacer) return;
    if (!settled || !current) { workSpacer.style.height = ''; return; }
    const gridEl = document.querySelector('main .grid');
    const gridBottom = gridEl ? gridEl.getBoundingClientRect().bottom + window.scrollY : 0;
    let contentBottom = current.card.getBoundingClientRect().bottom + window.scrollY;
    if (workExtras && !workExtras.hidden) {
      contentBottom = Math.max(contentBottom, workExtras.getBoundingClientRect().bottom + window.scrollY);
    }
    workSpacer.style.height = Math.max(0, Math.round(contentBottom + 40 - gridBottom)) + 'px';
  };

  const clearSelection = () => {
    selectedView = null;
    current?.card.classList.remove('is-compare-selected');
    compareView?.classList.remove('is-selected');
  };
  const selectView = view => {
    if (!compareOn) return;
    selectedView = view;
    current?.card.classList.toggle('is-compare-selected', view === 'main');
    compareView?.classList.toggle('is-selected', view === 'sub');
  };

  const syncCompareUI = () => {
    if (compareToggle) compareToggle.setAttribute('aria-pressed', String(compareOn));
    if (compareView) compareView.hidden = !(compareOn && !!current);
    document.body.classList.toggle('compare-mode', compareOn && !!current);
    if (!compareOn) clearSelection();
  };

  const setCompareOn = on => {
    if (!current) return;
    compareOn = on;
    if (on) {
      window.siteCompare?.show?.(scopeOf(current.id), mainVersion());
      // 默认选中主视图，场景选择马上就有明确的作用对象
      selectView('main');
    } else {
      window.siteCompare?.hide?.();
      clearSelection();
    }
    syncCompareUI();
    if (settled) {
      if (isMobile()) applyMobileWorkBox(on ? mobileCompareBox() : openBox());
      positionWorkExtras();
      updateWorkSpacer();
    }
  };

  /* 打开动画结束后：卡片转成文档坐标绝对定位，随页面上下自然滚动（取消吸顶） */
  const settle = () => {
    if (!current) return;
    const card = current.card;
    const r = card.getBoundingClientRect();
    card.style.position = 'absolute';
    card.style.top = Math.round(r.top + window.scrollY) + 'px';
    card.style.left = Math.round(r.left) + 'px';
    card.style.width = Math.round(r.width) + 'px';
    card.classList.add('is-settled');
    settled = true;
    unlockScroll();
    if (workExtras) workExtras.hidden = false;
    // 手机上如果对比是开着的（极少见：动画途中点的开关），落地时直接按并排版式收好
    if (isMobile() && compareOn) applyMobileWorkBox(mobileCompareBox());
    syncCompareUI();
    positionWorkExtras();
    updateWorkSpacer();
  };

  /* 关闭 / 放大前：转回视口固定坐标 */
  const unsettle = () => {
    if (!settled || !current) return;
    const card = current.card;
    const r = card.getBoundingClientRect();
    card.classList.remove('is-settled');
    card.style.position = 'fixed';
    card.style.top = Math.round(r.top) + 'px';
    card.style.left = Math.round(r.left) + 'px';
    card.style.width = Math.round(r.width) + 'px';
    settled = false;
    lockScroll();
    if (workExtras) workExtras.hidden = true;
    if (workSpacer) workSpacer.style.height = '';
  };

  /* ---------- 几何：展开后卡片 / 放大作品后卡片应该在哪 ---------- */
  const isMobile = () => window.matchMedia('(max-width: 600px)').matches;

  const openBox = () => {
    if (isMobile()) return { left: 14, top: 18, width: Math.max(220, window.innerWidth - 28) };
    const detailWidth = Math.min(520, Math.max(300, window.innerWidth * 0.38 - 36));
    const width = Math.min(860, window.innerWidth - 36 - detailWidth - 24);
    return { left: 18, top: 18, width: Math.max(320, width) };
  };

  /* v2.8.5 — 手机上打开「版本对比」时，主视图缩到左半屏，副视图并排右半屏。
     详情面板是底部抽屉，场景选择仍在抽屉里，两个视图都完整可见。 */
  const mobileCompareBox = () => {
    const width = Math.max(150, Math.floor((window.innerWidth - 28 - 12) / 2));
    // 往下让开顶部那排浮动按钮（收藏 / 放大 / 关闭），
    // 否则副视图顶边的外框热区会被按钮压住点不到。
    return { left: 14, top: 62, width };
  };

  const applyMobileWorkBox = box => {
    if (!current) return;
    const card = current.card;
    card.style.left = box.left + 'px';
    if (box.top != null) card.style.top = box.top + 'px';
    card.style.width = box.width + 'px';
    card.style.removeProperty('height');
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
          if (work && !work.card.classList.contains('is-animating')) setScale(work, entry.contentRect.width);
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
    // v2.8.5：「版本对比」开关搬进右侧详情面板，放在「嵌进你的网页」标题上方。
    // 面板是互斥的，所以只要把这一个节点挪进当前面板即可。
    const control = document.getElementById('compare-control');
    if (work?.panel && control) {
      const embed = work.panel.querySelector('.embed-snippet');
      if (embed) work.panel.insertBefore(control, embed);
      else work.panel.appendChild(control);
    }
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
  const animateCard = (work, first, last, done) => {
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

    const title = card.querySelector('.card-title');
    if (title && first.titleSize && last.titleSize && first.titleSize !== last.titleSize) {
      animations.push(title.animate(
        [{ fontSize: first.titleSize }, { fontSize: last.titleSize }],
        { duration, easing, fill: 'backwards' }
      ));
    }

    const token = { animations, cancelled: false, scaleFrame: 0 };
    anim = token;

    // ResizeObserver callbacks can arrive between compositor frames and produce
    // tiny scale oscillations. Read the animated mount in the same rAF timeline.
    const syncAnimatedScale = () => {
      if (token.cancelled || !card.classList.contains('is-animating')) return;
      setScale(work, work.mount.getBoundingClientRect().width - 4);
      token.scaleFrame = requestAnimationFrame(syncAnimatedScale);
    };
    token.scaleFrame = requestAnimationFrame(syncAnimatedScale);

    Promise.all(animations.map(a => a.finished)).then(() => {
      if (token.cancelled) return;
      anim = null;
      cancelAnimationFrame(token.scaleFrame);
      setScale(work, work.mount.getBoundingClientRect().width - 4);
      card.classList.remove('is-animating');
      if (done) done();
    }).catch(() => {});
  };

  const stopAnim = () => {
    if (!anim) return;
    anim.cancelled = true;
    anim.animations.forEach(a => a.cancel());
    cancelAnimationFrame(anim.scaleFrame);
    anim = null;
    if (current) current.card.classList.remove('is-animating');
  };

  /* ---------- 展开 ---------- */
  const openWork = work => {
    if (mode !== 'closed') return;
    const card = work.card;
    scrollY0 = window.scrollY;

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
    // 详情面板不记滚动位置：每次打开都从最上面开始
    if (work.panel) work.panel.scrollTop = 0;

    body.classList.remove('artwork-only');
    body.classList.add('viewing');
    card.classList.add('is-open');
    applyBox(card, openBox());                    // ② 直接切到最终状态
    const last = snapshot(card);                  //    量出 Last

    window.siteNav?.open('work', () => closeWork());
    animateCard(work, first, last, () => {
      mode = 'open';
      closeBtn.focus({ preventScroll: true });
      settle();
    });
  };

  /* ---------- 关闭 ---------- */
  const finishClose = work => {
    const card = work.card;
    // v2.8.5：position 必须一起清掉。unsettle() 会把 position: fixed 写成行内样式，
    // 只清 left/top/width/height 的话，卡片关完还残留 fixed + width:100% →
    // 直接铺满整个视口，把页面撑爆（用户报的「点 X 关闭后作品放大铺满全屏」）。
    ['position', 'left', 'top', 'width', 'height'].forEach(p => card.style.removeProperty(p));
    card.classList.remove('is-closing', 'is-animating');
    if (work.ghost) { work.ghost.remove(); work.ghost = null; }
    body.classList.remove('view-closing');
    unlockScroll();
    setActivePanel(null);

    mode = 'closed';
    current = null;
    expanded = false;
    settled = false;
    compareOn = false;
    selectedView = null;
    if (workExtras) workExtras.hidden = true;
    if (workSpacer) workSpacer.style.height = '';
    document.body.classList.remove('compare-mode');
    if (compareView) compareView.hidden = true;
    window.siteCompare?.hide?.();
    AppState.activeWorkId = works[0].id;
    if (AppState.currentTab === 'bookmarks') renderGallery();
    updateBookmarkBtn();
    refreshStages();
    card.focus({ preventScroll: true });
  };

  const doCloseWork = () => {
    if (mode === 'closed' || mode === 'closing' || !current) return;
    const work = current;
    const card = work.card;
    if (settled) unsettle();

    const first = snapshot(card);                 // 中途点关闭，也从当前画面接着走
    stopAnim();

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

  const closeWork = () => {
    if (mode === 'closed' || mode === 'closing' || !current) return;
    window.siteFolderPicker?.close?.();
    window.siteNav?.close('work');
    if (compareOn) setCompareOn(false);
    // 页面向下滚过时，先回到顶部再关闭，避免卡片从屏幕外飞回
    if (settled && window.scrollY > 0) {
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (_) { window.scrollTo(0, 0); }
    }
    doCloseWork();
  };

  /* ---------- 放大 / 还原作品展示区域 ---------- */
  const toggleExpand = () => {
    if (mode !== 'open') return;
    const work = current;
    const card = work.card;
    if (settled) unsettle();

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
    animateCard(work, first, last, () => {
      mode = 'open';
      if (!expanded) settle();
    });
  };

  const setExpandControl = isExpanded => {
    expandBtn.innerHTML = isExpanded
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v5H3M16 3v5h5M3 16h5v5M21 16h-5v5" /></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></svg>';
    expandBtn.setAttribute('aria-label', isExpanded
      ? tr('action.restore', '返回作品介绍')
      : tr('action.expand', '放大作品展示区域'));
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

  /* ---------- 版本对比：开关 / 选中 / 换版本路由 ---------- */
  compareToggle?.addEventListener('click', () => setCompareOn(!compareOn));

  /* ---------- v2.8.5：选中交互重做：点外框选中，点中间照常玩 ----------
     旧做法：对比模式下一律把作品内容的 pointer-events 关掉，点画面任意位置＝选中。
     结果只要开了对比，作品就玩不了了，必须再关掉对比才能继续体验。
     新做法：画面中间永远保持可交互；选中只认「四周 16px 的外框」——
     每个视图盖一圈边缘热区 + 虚线描边，点外框才选中，点中间照常操作作品。
     黄框 + 「已选中」角标表示「场景选择」当前作用在哪个视图。 */
  const RING_SIDES = ['top', 'right', 'bottom', 'left'];
  const ringLabel = view => (view === 'sub'
    ? tr('compare.selectSub', '选中副视图')
    : tr('compare.selectMain', '选中主视图'));
  const makeViewRing = (host, view) => {
    if (!host) return null;
    const ring = document.createElement('div');
    ring.className = 'cmp-ring';
    ring.dataset.view = view;
    RING_SIDES.forEach(side => {
      const edge = document.createElement('button');
      edge.type = 'button';
      edge.className = 'cmp-edge cmp-edge--' + side;
      edge.setAttribute('aria-label', ringLabel(view));
      ring.appendChild(edge);
    });
    const border = document.createElement('span');
    border.className = 'cmp-ring-border';
    border.setAttribute('aria-hidden', 'true');
    ring.appendChild(border);
    const badge = document.createElement('span');
    badge.className = 'cmp-ring-badge';
    badge.textContent = tr('compare.selected', '已选中');
    badge.setAttribute('aria-hidden', 'true');
    ring.appendChild(badge);
    ring.addEventListener('click', event => {
      event.stopPropagation();
      if (!compareOn || !settled) return;
      selectView(view);
    });
    host.appendChild(ring);
    return ring;
  };

  works.forEach(work => makeViewRing(work.mount, 'main'));
  makeViewRing(document.getElementById('compare-frame'), 'sub');

  const refreshRingLabels = () => {
    document.querySelectorAll('.cmp-ring').forEach(ring => {
      const view = ring.dataset.view;
      ring.querySelectorAll('.cmp-edge').forEach(edge => edge.setAttribute('aria-label', ringLabel(view)));
      const badge = ring.querySelector('.cmp-ring-badge');
      if (badge) badge.textContent = tr('compare.selected', '已选中');
    });
  };

  // 点页面空白处 → 取消黄框
  document.addEventListener('click', event => {
    if (!compareOn || !selectedView) return;
    if (event.target.closest('.preview-mount, .compare-view, .compare-toggle, .work-detail, .preview-actions, .top-utility-actions, #mario-nav')) return;
    clearSelection();
  });

  // 对比模式下选中副视图时，「场景选择 / 视觉版本」只换副视图
  [document.getElementById('detail-panel'), document.getElementById('orbit-detail-panel')].forEach(panel => {
    if (!panel) return;
    panel.addEventListener('click', event => {
      const btn = event.target.closest('[data-scene-choice], [data-orbit-version]');
      if (!btn) return;
      if (!compareOn || !settled || selectedView !== 'sub') return;
      event.stopPropagation();
      event.preventDefault();
      const v = btn.dataset.sceneChoice || btn.dataset.orbitVersion;
      window.siteCompare?.setVersion?.(v);
    }, true);
  });

  /* ---------- 详情页「开发者与贡献者」：跳去地球页并自动选中对应作者 ---------- */
  document.querySelectorAll('.creator-link[data-creator-work]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const workId = link.dataset.creatorWork;
      closeWork();
      // 等卡片收回动画结束再打开地球，避免画面打架
      setTimeout(() => {
        setCompassView(true);
        window.siteGlobe?.selectWork?.(workId);
      }, getDuration() + 80);
    });
  });

  bookmarkBtn.addEventListener('click', event => {
    event.stopPropagation();
    if (window.siteFolderPicker) window.siteFolderPicker.open();
  });

  // 文件夹归属变了，刷新收藏按钮的按下态
  document.addEventListener('site:bookmarkchange', () => updateBookmarkBtn());

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mode === 'open') {
      if (expanded) toggleExpand(); else closeWork();
    }
  });

  // 登录后从云端拉回收藏，刷新一次列表
  document.addEventListener('site:synced', () => {
    renderGallery();
    updateBookmarkBtn();
  });

  // 语言切换后刷新动态文案：搜索状态、空状态、放大按钮标签
  document.addEventListener('site:languagechange', () => {
    renderGallery();
    syncSearchUI();
    setExpandControl(expanded);
    refreshRingLabels();
  });

  window.addEventListener('resize', () => {
    if (current && anim) stopAnim();

    if (mode === 'closing' && current) {
      finishClose(current);
      return;
    }

    refreshStages();

    if (current && ['opening', 'expanding', 'open'].includes(mode)) {
      if (settled && !expanded) {
        const box = isMobile() && compareOn ? mobileCompareBox() : openBox();
        current.card.style.left = box.left + 'px';
        if (box.top != null) current.card.style.top = box.top + 'px';
        current.card.style.width = box.width + 'px';
        positionWorkExtras();
        updateWorkSpacer();
      } else {
        applyBox(current.card, expanded ? expandedBox(current) : openBox());
      }
      mode = 'open';
    }
  });

  /* =========================================================
     专属业务逻辑：海边灯塔的场景切换（不影响通用框架）
     预览统一运行在 iframe 内，通过消息同步场景，避免跨文档直接操作。
     ========================================================= */
  const pdsPreviewFrame = document.querySelector('#lighthouse-card iframe[data-pds-preview]');
  const syncPdsPreviewScene = scene => {
    pdsPreviewFrame?.contentWindow?.postMessage({ type: 'pds-set-scene', scene }, '*');
  };
  if (pdsPreviewFrame) {
    pdsPreviewFrame.addEventListener('load', () => syncPdsPreviewScene(window.sitePdsScene?.get?.() || 'seaside'));
    window.addEventListener('message', event => {
      if (event.source !== pdsPreviewFrame.contentWindow || event.data?.type !== 'pds-preview-ready') return;
      syncPdsPreviewScene(window.sitePdsScene?.get?.() || 'seaside');
    });
  }
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
        applyScene(btn.dataset.sceneChoice);
      });
    });

    const applyScene = value => {
      if (!validScenes.has(value)) return;
      selectedScene = value;
      try { localStorage.setItem('pds-gallery-scene', selectedScene); } catch (_) {}
      updateScenes();

      syncPdsPreviewScene(selectedScene);
      window.siteSync?.patchPrefs({ pdsScene: selectedScene });
    };

    // 给账号同步用：读/写灯塔场景
    window.sitePdsScene = {
      get: () => selectedScene,
      set: value => applyScene(value)
    };

    updateScenes();
    syncPdsPreviewScene(selectedScene);
  }


})();

/* =========================================================
   详情页里的代码块：一键复制
   ---------------------------------------------------------
   剪贴板权限拿不到时（http、非用户手势等）退回到「选中代码」，
   让用户自己按 Ctrl/⌘+C，而不是什么都不发生。
   ========================================================= */
(() => {
  document.querySelectorAll('[data-copy-code]').forEach(button => {
    button.addEventListener('click', async () => {
      const block = button.closest('.code-block');
      const code = block?.querySelector('code')?.textContent || '';
      const i18nText = (key, fallback) => {
        const i18n = window.siteI18n;
        if (i18n && typeof i18n.t === 'function') {
          const value = i18n.t(key);
          if (value != null) return value;
        }
        return fallback;
      };
      const flash = text => {
        const original = button.textContent;
        button.textContent = text;
        button.classList.add('is-done');
        setTimeout(() => { button.textContent = original; button.classList.remove('is-done'); }, 1600);
      };
      try {
        await navigator.clipboard.writeText(code);
        flash(i18nText('embed.copied', '已复制'));
      } catch (_) {
        const target = block?.querySelector('code');
        if (!target) return;
        const range = document.createRange();
        range.selectNodeContents(target);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  });
})();
