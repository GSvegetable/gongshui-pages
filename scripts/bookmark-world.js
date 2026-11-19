/* =========================================================
   G / ARCHIVE — immersive collection corridor
   Native CSS 3D scene. No external runtime or CDN dependency.
   ========================================================= */
(() => {
  const root = document.getElementById('bookmark-world');
  const viewport = document.getElementById('bookmark-world-viewport');
  const shell = document.getElementById('bookmark-world-shell');
  if (!root || !viewport || !shell) return;

  const $ = id => document.getElementById(id);
  const state = {
    data: null, filter: 'all', cameraZ: 0, yaw: 0, turn: 0,
    segmentDepth: 1120, segmentCount: 0, cards: [], touch: null,
    moving: false, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const safe = value => String(value ?? '');
  const lang = () => document.documentElement.lang || 'zh-CN';

  function workFor(id) {
    return state.data?.works.find(work => work.id === id);
  }
  function visibleEntries() {
    const folders = state.data?.folders || [];
    const byId = new Map();
    folders.forEach(folder => {
      if (state.filter !== 'all' && folder.id !== state.filter) return;
      folder.works.forEach(id => {
        const work = workFor(id);
        if (work && !byId.has(id)) byId.set(id, { ...work, folder: folder.name, folderId: folder.id });
      });
    });
    return [...byId.values()];
  }
  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function makeArtwork(entry, side, index) {
    const frame = make('button', 'bw-artwork bw-artwork--' + side);
    frame.type = 'button';
    frame.dataset.workId = entry.id;
    frame.setAttribute('aria-label', '打开收藏作品：' + entry.title);
    frame.style.setProperty('--art-index', index);
    frame.style.setProperty('--art-tone', index % 4);
    const image = make('div', 'bw-artwork-image');
    const glow = make('span', 'bw-artwork-glow');
    image.appendChild(glow);
    if (entry.previewSrc) {
      const iframe = make('iframe', 'bw-artwork-preview');
      iframe.src = entry.previewSrc;
      iframe.title = entry.title + ' 作品预览';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer';
      iframe.tabIndex = -1;
      iframe.setAttribute('aria-hidden', 'true');
      image.appendChild(iframe);
    } else {
      image.appendChild(make('span', 'bw-artwork-monogram', safe(entry.title).slice(0, 2)));
    }
    const plaque = make('span', 'bw-artwork-plaque');
    plaque.append(make('span', 'bw-artwork-number', String(index + 1).padStart(2, '0')));
    plaque.append(make('strong', 'bw-artwork-title', entry.title));
    plaque.append(make('small', 'bw-artwork-folder', entry.folder));
    frame.append(image, plaque);
    frame.addEventListener('click', event => {
      event.stopPropagation();
      const original = document.querySelector('.preview-card[data-id="' + CSS.escape(entry.id) + '"]');
      if (original) original.click();
    });
    return frame;
  }
  function makeSegment(index, entries) {
    const segment = make('section', 'bw-segment');
    segment.dataset.segment = index;
    segment.style.setProperty('--segment-z', -index * state.segmentDepth + 'px');
    const left = make('div', 'bw-wall bw-wall--left');
    const right = make('div', 'bw-wall bw-wall--right');
    const floor = make('div', 'bw-floor');
    const ceiling = make('div', 'bw-ceiling');
    const start = index * 2;
    if (entries[start]) left.appendChild(makeArtwork(entries[start], 'left', start));
    if (entries[start + 1]) right.appendChild(makeArtwork(entries[start + 1], 'right', start + 1));
    // A few quiet architectural light bars make the corridor feel continuous.
    for (let i = 0; i < 3; i++) {
      const seamL = make('i', 'bw-wall-seam');
      const seamR = make('i', 'bw-wall-seam');
      seamL.style.left = (12 + i * 35) + '%';
      seamR.style.left = (12 + i * 35) + '%';
      left.appendChild(seamL); right.appendChild(seamR);
    }
    segment.append(left, right, floor, ceiling);
    return segment;
  }
  function setCamera() {
    root.style.transform = 'translate3d(0,0,' + state.cameraZ + 'px) rotateY(' + state.yaw + 'deg)';
    $('bookmark-world-position').textContent = 'SECTOR ' + String(Math.floor(state.cameraZ / state.segmentDepth) + 1).padStart(3, '0');
    const progress = $('bookmark-world-progress');
    if (progress) progress.style.width = (12 + (state.cameraZ / state.segmentDepth % 8) * 10) + '%';
  }
  function appendSegments() {
    const entries = visibleEntries();
    const needed = Math.max(8, Math.ceil(entries.length / 2) + 5);
    while (state.segmentCount < needed) {
      root.appendChild(makeSegment(state.segmentCount, entries));
      state.segmentCount++;
    }
  }
  function render(data) {
    if (!data) return;
    state.data = data;
    const shellVisible = !!data.visible;
    shell.hidden = !shellVisible;
    if (!shellVisible) return;
    const entries = visibleEntries();
    root.replaceChildren();
    state.segmentCount = 0;
    state.cameraZ = 0;
    state.yaw = 0;
    state.turn = 0;
    state.cards = entries;
    appendSegments();
    $('bookmark-world-empty').hidden = entries.length > 0;
    $('bookmark-world-count').textContent = entries.length + ' OBJECTS';
    $('bookmark-work-count').textContent = String(data.bookmarks.length);
    $('bookmark-folder-count').textContent = String(data.folders.length);
    $('bookmark-world-current').textContent = entries.length ? '沿着中央光轨，寻找下一件作品' : '等待第一件收藏进入展厅';
    $('bookmark-world-title');
    setCamera();
    renderFolderFilters();
  }
  function renderFolderFilters() {
    const toolbar = document.querySelector('.bookmarks-toolbar');
    if (!toolbar) return;
    let filters = $('bookmark-world-filters');
    if (!filters) {
      filters = make('div', 'bookmark-world-filters');
      filters.id = 'bookmark-world-filters';
      toolbar.insertBefore(filters, $('folder-new'));
    }
    filters.replaceChildren();
    const all = make('button', 'bw-filter' + (state.filter === 'all' ? ' is-active' : ''), '全部');
    all.type = 'button';
    all.addEventListener('click', () => setFilter('all'));
    filters.appendChild(all);
    (state.data?.folders || []).forEach(folder => {
      const button = make('button', 'bw-filter' + (state.filter === folder.id ? ' is-active' : ''), folder.name);
      button.type = 'button';
      button.addEventListener('click', () => setFilter(folder.id));
      filters.appendChild(button);
    });
  }
  function setFilter(id) {
    state.filter = id;
    render(state.data);
  }
  function advance() {
    if (state.moving || !state.cards.length) return;
    state.moving = true;
    const distance = state.segmentDepth * .72;
    state.cameraZ += distance;
    // The corridor makes a deliberate hard corner every few sectors.
    const sector = Math.floor(state.cameraZ / state.segmentDepth);
    if (sector > 0 && sector % 3 === 0) {
      state.yaw += (sector % 2 ? 1 : -1) * 13;
    }
    appendSegments();
    setCamera();
    $('bookmark-world-current').textContent = state.cards[Math.min(state.cards.length - 1, sector * 2)]?.title || '继续向前';
    window.setTimeout(() => { state.moving = false; }, state.reduced ? 40 : 760);
  }
  function turn(direction) {
    state.yaw = clamp(state.yaw + direction * 27, -54, 54);
    state.turn = direction;
    root.classList.add('is-turning');
    setCamera();
    window.setTimeout(() => root.classList.remove('is-turning'), state.reduced ? 0 : 540);
  }
  $('bookmark-world-forward')?.addEventListener('click', advance);
  $('bookmark-world-left')?.addEventListener('click', () => turn(-1));
  $('bookmark-world-right')?.addEventListener('click', () => turn(1));
  viewport.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    advance();
  });
  viewport.addEventListener('touchstart', event => {
    const touch = event.changedTouches[0];
    state.touch = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, { passive: true });
  viewport.addEventListener('touchend', event => {
    if (!state.touch) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - state.touch.x;
    const dy = touch.clientY - state.touch.y;
    state.touch = null;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? -1 : 1);
    else if (dy < -28) advance();
  }, { passive: true });
  viewport.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) > 8) { event.preventDefault(); event.deltaY > 0 ? advance() : turn(-1); }
  }, { passive: false });
  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('is-bookmarks')) return;
    if (['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)) return;
    if (event.key === 'ArrowUp' || event.key === ' ') { event.preventDefault(); advance(); }
    if (event.key === 'ArrowLeft') turn(-1);
    if (event.key === 'ArrowRight') turn(1);
  });
  document.addEventListener('site:languagechange', () => {
    const forward = $('bookmark-world-forward');
    if (forward) forward.querySelector('span').textContent = lang().startsWith('en') ? 'EXPLORE FORWARD' : '向前探索';
  });
  window.siteBookmarkWorld = { render };
  if (window.siteBookmarkWorldData) render(window.siteBookmarkWorldData);
})();