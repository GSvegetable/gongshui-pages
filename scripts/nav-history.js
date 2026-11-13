/* =========================================================
   分层返回（浏览器返回键 / 手势）— v1.0.0
   ---------------------------------------------------------
   打开作品详情、地球页、设置面板时往历史里压一层；
   用户按返回键 / 滑动返回时只关掉最上面这一层，不会直接退出整个网页。
   同一时间只保留一层（这些界面本来也互斥）。
   ========================================================= */
(() => {
  let active = null; // { name, close }

  const onPop = () => {
    // 没有活动层：说明这次 back 是 UI 主动关闭时调用的，不用再关一次
    if (!active) return;
    const layer = active;
    active = null;
    try { layer.close(); } catch (_) {}
  };
  window.addEventListener('popstate', onPop);

  window.siteNav = {
    // 打开一层：history 压一条记录，返回键会触发 close
    open(name, close) {
      if (active) return; // 同一时间只保留一层
      active = { name, close };
      try { history.pushState({ siteNav: name }, ''); } catch (_) {}
    },
    // UI 主动关闭：把刚压的历史记录退掉（不会重复触发 close）
    close(name) {
      if (!active || active.name !== name) return;
      active = null;
      try { history.back(); } catch (_) {}
    },
    isOpen(name) { return !!active && active.name === name; },
    top() { return active ? active.name : null; }
  };
})();
