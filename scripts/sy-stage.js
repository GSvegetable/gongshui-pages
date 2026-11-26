/* 3_sy 双轨卡片空间 —— 首页作品网格底下的那一层。
   作品铺在网格下面，被五个作品卡片盖住，拿不到自己的指针事件；
   所以横向拖动由首页捕获，再转发给作品，作品照常左右切换空间状态。 */
(() => {
  const stage = document.getElementById('sy-stage');
  const frame = document.getElementById('sy-frame');
  const grid = document.getElementById('works');
  if (!stage || !frame || !grid) return;

  // 目标 origin 按 iframe 实际地址算，作品换托管位置时不用改这里。
  const ORIGIN = (() => {
    try { return new URL(frame.getAttribute('src'), location.href).origin; }
    catch (_) { return '*'; }
  })();
  const SWIPE_SLOP = 16;      // 超过这个横向位移才判定为"左右切换"
  const SWIPE_KEY = 260;      // 键盘切换用的位移量

  let gesture = null;
  let swallowUntil = 0;

  const post = (phase, dx) => {
    try {
      frame.contentWindow?.postMessage({ type: '3sy:swipe', phase, dx: Math.round(dx) }, ORIGIN);
    } catch (_) { /* 作品还没加载好就算了 */ }
  };

  // 指针监听挂在整个文档上：作品被作品卡片盖住时，卡片之间的缝隙、
  // 卡片标题栏、作品下方那一段都是作品露出来的地方，拖哪儿都能切。
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, swiping: false };
  }, { passive: true });

  document.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.swiping) {
      // 只有明显的横向拖动才接管；纵向留给页面滚动
      if (Math.abs(dx) < SWIPE_SLOP || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      gesture.swiping = true;
      post('start', 0);
    }
    post('move', dx);
  }, { passive: true });

  const end = event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (gesture.swiping) {
      post('end', event.clientX - gesture.x);
      // 这次松手别变成"点开作品"：只在紧随其后的那一次点击里生效
      swallowUntil = performance.now() + 400;
      setTimeout(() => { swallowUntil = 0; }, 420);
    }
    gesture = null;
  };
  document.addEventListener('pointerup', end, { passive: true });
  document.addEventListener('pointercancel', end, { passive: true });

  grid.addEventListener('click', event => {
    if (performance.now() > swallowUntil) return;
    swallowUntil = 0;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // 键盘：左右方向键同样能切换作品的空间状态
  grid.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    post('end', event.key === 'ArrowLeft' ? -SWIPE_KEY : SWIPE_KEY);
  });
})();
