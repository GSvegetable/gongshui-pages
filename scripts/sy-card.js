/* 3_sy 双轨卡片空间 —— 首页大格子里的状态切换。
   第六个作品：作品画面嵌在格子里的 iframe，标题栏上三个按钮直接点名它的三种
   空间状态（EDGE / LEFT / RIGHT）。左右滑动那套交互已经收起来，改成按钮点选。
   协议：宿主发 { type: '3sy:preset', index }，作品切到第 index 个状态；
        作品每次切完回 { type: '3sy:state', index, label, peak, curve, tilt }，
        宿主据此高亮按钮并刷新读数。 */
(() => {
  'use strict';

  const card = document.getElementById('sy-card');
  const frame = document.getElementById('sy-frame');
  if (!card || !frame) return;

  const buttons = [...card.querySelectorAll('.sy-state-btn')];
  const codeEl = card.querySelector('.sy-code');
  const readouts = {
    peak: card.querySelector('[data-readout="peak"]'),
    curve: card.querySelector('[data-readout="curve"]'),
    tilt: card.querySelector('[data-readout="tilt"]'),
  };

  // 目标 origin 按 iframe 实际地址算，作品换托管位置时不用改这里。
  const ORIGIN = (() => {
    try { return new URL(frame.getAttribute('src'), location.href).origin; }
    catch (_) { return '*'; }
  })();

  const post = message => {
    try { frame.contentWindow?.postMessage(message, ORIGIN); }
    catch (_) { /* 作品还没加载好就算了 */ }
  };

  const applyState = data => {
    const index = Number(data.index);
    if (!Number.isFinite(index)) return;

    buttons.forEach(button => {
      const on = Number(button.dataset.index) === index;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    if (codeEl) {
      const label = data.label ? ` ${data.label}` : '';
      codeEl.textContent = `ST-0${index + 1}${label}`;
    }

    ['peak', 'curve', 'tilt'].forEach(key => {
      const el = readouts[key];
      if (el && data[key] !== undefined && data[key] !== null) el.textContent = String(data[key]);
    });
  };

  buttons.forEach(button => {
    button.setAttribute('aria-pressed', button.classList.contains('is-active') ? 'true' : 'false');
    button.addEventListener('click', () => {
      post({ type: '3sy:preset', index: Number(button.dataset.index) });
    });
  });

  // 只认自己那个 iframe 发来的消息
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.type !== '3sy:state') return;
    applyState(data);
  });

  // 问作品当前在哪个状态。
  // iframe 是懒加载的，可能在脚本注册监听之前就已经加载完 —— 所以除了 load 事件，
  // 还要补几次兜底询问，直到第一次收到状态为止。
  const askState = () => post({ type: '3sy:state' });
  frame.addEventListener('load', askState);
  [0, 400, 1200, 2600].forEach(delay => setTimeout(askState, delay));
})();
