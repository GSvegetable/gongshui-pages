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
  let originMountRect = null;
  let originInfoRect = null;
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

  // Keep the renderer at its original backing dimensions. Only scale its
  // wrapper during view transitions: changing root layout size triggers its
  // ResizeObserver and recreates WebGL/Canvas buffers.
  const syncEmbedVisualLoop = animation => {
    const tick = () => {
      if (activeAnimation !== animation || !embedVisualState) return;
      syncEmbedScale(getEmbedWrapper());
      embedFrame = requestAnimationFrame(tick);
    };
    if (embedFrame) cancelAnimationFrame(embedFrame);
    embedFrame = requestAnimationFrame(tick);
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
    if (embedVisualState && previewMount && embedWrapper) syncEmbedVisualLoop(animation);

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
    ['position', 'left', 'top', 'width', 'height', 'padding', 'margin', 'transition', 'opacity', 'box-shadow']
      .forEach(prop => card.style.removeProperty(prop));
    card.classList.remove('is-open', 'details-ready', 'is-title-expanded', 'is-closing');
    document.body.classList.remove('viewing', 'view-closing', 'closing-from-artwork');
    mode = 'closed';
    // Keep the canvas backing dimensions unchanged after returning home.
    card.focus({ preventScroll: true });
  };

  const open = () => {
    if (mode !== 'closed') return;
    origin = card.getBoundingClientRect();
    originMountRect = previewMount.getBoundingClientRect();
    const cardInfo = card.querySelector('.card-info');
    originInfoRect = cardInfo ? cardInfo.getBoundingClientRect() : null;
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
      }
    );
    close.focus({ preventScroll: true });
  };

  const shut = () => {
    if (mode !== 'open' && mode !== 'opening') return;
    const wasArtworkExpanded = artworkExpanded;
    const currentRect = card.getBoundingClientRect();
    const mount = previewMount, cardInfo = card.querySelector('.card-info');
    const visibleMountRect = mount.getBoundingClientRect();
    const visibleInfoRect = cardInfo ? cardInfo.getBoundingClientRect() : null;
    const visibleInfoOpacity = cardInfo ? Number.parseFloat(getComputedStyle(cardInfo).opacity) : 1;
    const detailStart = !wasArtworkExpanded ? {
      transform: getComputedStyle(detailPanel).transform,
      opacity: Number(getComputedStyle(detailPanel).opacity)
    } : null;
    const originalInfoTransition = cardInfo ? cardInfo.style.transition : '';
    if (activeAnimation) { activeAnimation.cancel(); activeAnimation = null; }
    if (embedFrame) cancelAnimationFrame(embedFrame);
    embedFrame = 0;

    Object.assign(card.style, {
      position:'fixed',left:currentRect.left+'px',top:currentRect.top+'px',
      width:currentRect.width+'px',height:currentRect.height+'px',
      padding:'12px',margin:'0',transition:'none'
    });
    const dx=origin.left-currentRect.left,dy=origin.top-currentRect.top;
    const psx=origin.width/Math.max(1,currentRect.width),psy=origin.height/Math.max(1,currentRect.height);
    const easing='cubic-bezier(.22,.8,.2,1)',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?1:460;
    mode='closing';
    document.body.classList.add('view-closing');
    document.body.classList.remove('artwork-only');
    if(wasArtworkExpanded)document.body.classList.add('closing-from-artwork');
    card.classList.add('is-closing');
    if (cardInfo) cardInfo.style.transition = 'none';
    card.classList.remove('is-artwork-expanded','is-title-expanded');
    setExpandControl(false);

    const baseMountRect=mount.getBoundingClientRect();
    const baseInfoRect=cardInfo?cardInfo.getBoundingClientRect():null;
    const childFrames=(visible,base,home)=>{
      if(!visible||!base||!home||!base.width||!base.height)return null;
      const start={x:visible.left-base.left,y:visible.top-base.top,sx:visible.width/base.width,sy:visible.height/base.height};
      const end={
        x:(home.left-origin.left)/psx-(base.left-currentRect.left),
        y:(home.top-origin.top)/psy-(base.top-currentRect.top),
        sx:home.width/(base.width*psx),sy:home.height/(base.height*psy)
      };
      const frame=v=>({transform:'translate3d('+v.x+'px,'+v.y+'px,0) scale('+v.sx+','+v.sy+')',transformOrigin:'top left'});
      return [frame(start),frame(end)];
    };
    const mf=childFrames(visibleMountRect,baseMountRect,originMountRect);
    const inf=childFrames(visibleInfoRect,baseInfoRect,originInfoRect);
    const mt=mount.style.transform,mo=mount.style.transformOrigin;
    const it=cardInfo?cardInfo.style.transform:'',io=cardInfo?cardInfo.style.transformOrigin:'';

    const ca=card.animate([
      {transform:'translate3d(0,0,0) scale(1,1)',transformOrigin:'top left',boxShadow:getComputedStyle(card).boxShadow},
      {transform:'translate3d('+dx+'px,'+dy+'px,0) scale('+psx+','+psy+')',transformOrigin:'top left',boxShadow:'8px 8px 0 rgba(0,0,0,.68), 0 18px 42px rgba(0,0,0,.18)'}
    ],{duration,easing,fill:'both'});
    const ma=mf?mount.animate(mf,{duration,easing,fill:'both'}):null;
    const ia=cardInfo&&inf?cardInfo.animate([{...inf[0],opacity:visibleInfoOpacity},{...inf[1],opacity:1}],{duration,easing,fill:'both'}):null;
    let da=null;
    if(detailStart)da=detailPanel.animate([
      detailStart,
      {transform:'translateY(100%)',opacity:0}
    ],{duration:reduced?1:280,easing,fill:'both'});

    activeAnimation=ca;
    syncEmbedVisualLoop(ca);
    const pending=[ca.finished];if(ma)pending.push(ma.finished);if(ia)pending.push(ia.finished);if(da)pending.push(da.finished);
    Promise.all(pending).then(()=>{
      if(activeAnimation!==ca)return;
      if(embedFrame)cancelAnimationFrame(embedFrame);
      embedFrame=0;syncEmbedScale(getEmbedWrapper());activeAnimation=null;
      card.style.boxShadow='8px 8px 0 rgba(0,0,0,.68), 0 18px 42px rgba(0,0,0,.18)';
      ca.cancel();if(ma)ma.cancel();if(ia)ia.cancel();if(da)da.cancel();
      mount.style.transform=mt;mount.style.transformOrigin=mo;
      if(cardInfo){
        cardInfo.style.transform=it;
        cardInfo.style.transformOrigin=io;
        cardInfo.style.transition=originalInfoTransition;
      }
      cleanUp();document.body.classList.remove('closing-from-artwork');
    }).catch(()=>{});
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
      syncEmbedScale(getEmbedWrapper());
    } else if (mode === 'closed' && embedVisualState) {
      syncEmbedScale(getEmbedWrapper());
    }
  });
})();
