/* =========================================================
   滚动驱动的顶栏行为 — v1.0.0
   ---------------------------------------------------------
   ① 搜索栏：往下滚时向右缩回，只剩一个带放大镜的正方形方块；
      点放大镜、或者滑回页面顶部，就重新展开。
   ② 右上角「开发者与贡献者」「设置」：往下滚时躲到屏幕外，
      斜着露出大约一半，像在偷偷看；点一下它们就回到原位。

   两件事都由滚动位置驱动，没有额外的开关按钮。
   节奏读站点的 --dur / --ease，和卡片、详情面板保持同速。
   ========================================================= */
(() => {
  const root = document.documentElement;
  const searchWrapper = document.getElementById('search-wrapper');
  const searchInput = document.getElementById('search-input');
  const searchStatus = document.getElementById('search-status');
  const utility = document.getElementById('top-utility');
  if (!searchWrapper) return;

  // 滚过这个距离才开始收，避免页面轻微抖动就触发
  const THRESHOLD = 40;

  // 用户主动点过放大镜后，搜索栏先钉住展开状态，直到再次滚动
  let searchPinned = false;
  // 点过右上角按钮后，它们先留在原位，回到顶部才恢复"偷偷看"
  let utilityRestored = false;

  const sync = () => {
    const down = window.scrollY > THRESHOLD;
    if (!down) {
      searchPinned = false;
      utilityRestored = false;
    }
    root.classList.toggle('search-collapsed', down && !searchPinned);
    root.classList.toggle('utility-peeking', down && !utilityRestored);
  };

  const expandSearch = () => {
    if (!root.classList.contains('search-collapsed')) return;
    searchPinned = true;
    root.classList.remove('search-collapsed');
  };

  // 点放大镜（或点方块里的任何位置）→ 展开并聚焦
  searchWrapper.addEventListener('click', event => {
    if (event.target.closest('#search-clear')) return;
    expandSearch();
  });

  // 键盘快捷键（/ 或 Ctrl+K）把焦点送进输入框时，也要先把方块展开
  searchInput?.addEventListener('focus', expandSearch);

  // 点露出来的那一半 → 右上角这组按钮回到原位，
  // 用捕获阶段监听，保证在按钮自己的行为（跳转 / 展开面板）之前先复位
  utility?.addEventListener('click', () => {
    utilityRestored = true;
    root.classList.remove('utility-peeking');
  }, true);

  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  sync();
})();
