/* =========================================================
   滚动驱动的顶栏行为 — v2.1.0
   ---------------------------------------------------------
   ① 搜索栏：往下滚时缩成一个 58×58 的方块（只剩放大镜），
      并滑到左侧导航那一列，和左边三个马里奥方块同尺寸、同左缘；
      点放大镜、或者滑回页面顶部，就重新展开。
      注意：手动展开之后只要再往下滚，它还是会收起来——
      之前用「钉住」标志导致它一直保持展开，是不对的。

   ② 右上角工具方块：往下滚时整组向上滑出视口，
      不再从屏幕边缘探出半个身子。半截方块挂在边上既挡视线又容易误触，
      整组让开最干净；往上滚一点就还回来。
   ③ 返回顶部：滚过阈值后从屏幕底部滑入，回到顶部时滑出；点击平滑回顶。

   节奏读站点的 --dur / --ease，和卡片、详情面板保持同速。
   ========================================================= */
(() => {
  const root = document.documentElement;
  const searchWrapper = document.getElementById('search-wrapper');
  const searchInput = document.getElementById('search-input');
  const utility = document.getElementById('top-utility');
  if (!searchWrapper) return;

  // 滚过这个距离才算「往下看」，避免页面轻微抖动就触发
  const THRESHOLD = 40;
  // 往上滚多少像素就把右上角那组按钮还回来
  const UP_REVEAL = 8;

  let lastY = window.scrollY;
  // 用户手动点开过搜索栏：下一次滚动就重新收回去
  let manualExpand = false;
  // 手动展开后的短暂冷却：聚焦输入框会让浏览器顺手滚一下页面，
  // 这一下滚动不能再把搜索栏收回去（否则就是「展开一下又立刻缩回」的抽搐）。
  let lastManualExpand = 0;
  const MANUAL_HOLD = 600;

  const setSearch = collapsed => {
    if (root.classList.contains('search-collapsed') === collapsed) return;
    root.classList.toggle('search-collapsed', collapsed);
    // 收起来的时候输入框还在里面，不让它继续接收看不见的输入
    if (collapsed && searchInput && document.activeElement === searchInput) searchInput.blur();
  };
  const setUtility = hidden => root.classList.toggle('top-utility-hidden', hidden);
  const setBackToTop = visible => root.classList.toggle('back-to-top-visible', visible);
  const backToTop = document.getElementById('back-to-top');
  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const sync = () => {
    const y = window.scrollY;
    const delta = y - lastY;
    lastY = y;

    setBackToTop(y > THRESHOLD);
    if (y <= THRESHOLD) {
      // 回到顶部：顶栏全部回来
      manualExpand = false;
      setSearch(false);
      setUtility(false);
      return;
    }
    if (performance.now() - lastManualExpand < MANUAL_HOLD) {
      // 刚手动展开，紧跟其后的这次滚动多半是聚焦输入框引起的，忽略掉
      manualExpand = false;
      return;
    }
    if (manualExpand) {
      // 刚才是手动点开的，这次滚动就把它收回去（之前用「钉住」标志，
      // 结果点开之后怎么滚都一直展开）
      manualExpand = false;
      setSearch(true);
      setUtility(true);
      return;
    }
    if (delta > 0) {
      // 往下滚 → 收起来
      setSearch(true);
      setUtility(true);
    } else if (delta < -UP_REVEAL) {
      // 往上滚一点 → 右上角那组按钮先还回来
      setUtility(false);
    }
  };

  // 点放大镜（或点方块里的任何位置）→ 展开并聚焦
  searchWrapper.addEventListener('click', event => {
    if (event.target.closest('#search-clear')) return;
    if (!root.classList.contains('search-collapsed')) return;
    manualExpand = true;
    lastManualExpand = performance.now();
    setSearch(false);
    searchInput?.focus({ preventScroll: true });
  });

  // 键盘快捷键（/ 或 Ctrl+K）把焦点送进输入框时，也要先把方块展开
  searchInput?.addEventListener('focus', () => {
    if (root.classList.contains('search-collapsed')) {
      manualExpand = true;
      lastManualExpand = performance.now();
    }
    setSearch(false);
  });

  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  sync();
})();
