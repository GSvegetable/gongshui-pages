/* =========================================================
   场景比较 — v1.1.0
   ---------------------------------------------------------
   挂在左侧主预览图正下方的 #compare-dock 里，左右两栏各选一个
   场景/版本实时并排对照；宽屏下双栏更舒展。
   · 像素昼夜开关：预览页用 postMessage 切换场景（pds-set-scene）
   · 像素圆环：showcase 页用 ?scene= 切版本；composition=full
     直接渲染「上浮 / 完整圆环」状态，不是首页那种下沉裁切。
   只在作品打开、主站调用 siteCompare.open(scope) 时才加载 iframe。
   ========================================================= */
(() => {
  const PDS_PREVIEW = 'https://gsvegetable.github.io/1_pixel-daylight-switch/preview.html';
  const ORBIT_SHOWCASE = 'https://gsvegetable.github.io/2_pixel-dusk/showcase.html?v=1.4.0&composition=full';

  const CONFIG = {
    pds: { base: PDS_PREVIEW, mode: 'post', scenes: ['countryside', 'japanese-street', 'apartment', 'seaside', 'mountain-cabin'] },
    orbit: { base: ORBIT_SHOWCASE, mode: 'url', scenes: ['planet', 'countryside', 'world'] }
  };

  // 昼夜预览页就绪后，把它的场景告诉它
  const pdsFrames = new Map(); // WindowProxy -> iframe
  window.addEventListener('message', event => {
    const frame = pdsFrames.get(event.source);
    if (!frame || event.data?.type !== 'pds-preview-ready') return;
    frame.contentWindow?.postMessage({ type: 'pds-set-scene', scene: frame.dataset.scene || 'seaside' }, '*');
  });

  const sections = [...document.querySelectorAll('.compare-dock .scene-compare')];
  if (!sections.length) return;

  const labelReaderFor = section => {
    const src = document.getElementById(section.dataset.source || '');
    const scope = section.dataset.compare;
    const sel = scope === 'orbit' ? '[data-orbit-version]' : '[data-scene-choice]';
    return id => {
      if (!src) return id;
      const btn = [...src.querySelectorAll('.scene-picker ' + sel)]
        .find(b => (b.dataset.orbitVersion || b.dataset.sceneChoice) === id);
      return btn?.querySelector('strong')?.textContent?.trim() || id;
    };
  };

  const buildSection = section => {
    const scope = section.dataset.compare;
    const cfg = CONFIG[scope];
    if (!cfg) return null;

    const labelOf = labelReaderFor(section);
    const panes = [...section.querySelectorAll('.compare-pane')];
    let initialized = false;

    const buildChips = pane => {
      const picks = pane.querySelector('.compare-picks');
      if (!picks || picks.dataset.built) return;
      picks.dataset.built = '1';
      cfg.scenes.forEach(id => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'compare-pick';
        b.dataset.scene = id;
        b.textContent = labelOf(id);
        b.addEventListener('click', () => setScene(pane, id));
        picks.appendChild(b);
      });
    };

    const markActive = (pane, id) => {
      pane.dataset.scene = id;
      pane.querySelectorAll('.compare-pick').forEach(b => b.classList.toggle('is-active', b.dataset.scene === id));
      const strong = pane.querySelector('.compare-caption strong');
      if (strong) strong.textContent = labelOf(id);
    };

    const ensureFrame = pane => {
      let frame = pane.querySelector('iframe');
      if (frame) return frame;
      const holder = pane.querySelector('.compare-frame');
      if (!holder) return null;
      frame = document.createElement('iframe');
      frame.loading = 'lazy';
      frame.allow = 'fullscreen';
      frame.setAttribute('title', '场景比较');
      holder.appendChild(frame);
      if (cfg.mode === 'post') {
        pdsFrames.set(frame.contentWindow, frame);
        frame.addEventListener('load', () => {
          frame.contentWindow?.postMessage({ type: 'pds-set-scene', scene: frame.dataset.scene || 'seaside' }, '*');
        });
      }
      return frame;
    };

    const syncFrame = (pane, id) => {
      const frame = ensureFrame(pane);
      if (!frame) return;
      frame.dataset.scene = id;
      if (cfg.mode === 'url') {
        frame.src = cfg.base + '&scene=' + encodeURIComponent(id);
      } else {
        if (!frame.dataset.started) {
          frame.dataset.started = '1';
          frame.src = cfg.base;
        }
        frame.contentWindow?.postMessage({ type: 'pds-set-scene', scene: id }, '*');
      }
    };

    const setScene = (pane, id) => {
      markActive(pane, id);
      syncFrame(pane, id);
    };

    panes.forEach(pane => {
      buildChips(pane);
      markActive(pane, pane.dataset.scene || cfg.scenes[0]);
    });

    const open = () => {
      if (initialized) return;
      initialized = true;
      panes.forEach(pane => syncFrame(pane, pane.dataset.scene || cfg.scenes[0]));
    };

    // 详情关闭后卸掉 iframe，避免隐藏作品在后台一直跑动画
    const close = () => {
      initialized = false;
      panes.forEach(pane => {
        const frame = pane.querySelector('iframe');
        if (!frame) return;
        if (cfg.mode === 'post') pdsFrames.delete(frame.contentWindow);
        frame.remove();
      });
    };

    const refreshLabels = () => {
      panes.forEach(pane => {
        pane.querySelectorAll('.compare-pick').forEach(b => { b.textContent = labelOf(b.dataset.scene); });
        const strong = pane.querySelector('.compare-caption strong');
        if (strong) strong.textContent = labelOf(pane.dataset.scene);
      });
    };

    return { scope, open, close, refreshLabels };
  };

  const built = sections.map(buildSection).filter(Boolean);

  // 主站（main.js 作品控制器）在作品打开时调用
  window.siteCompare = {
    open(scope) {
      const rec = built.find(b => b.scope === scope);
      if (rec) rec.open();
    },
    close(scope) {
      const rec = built.find(b => b.scope === scope);
      if (rec) rec.close();
    }
  };

  // 中英切换后，比较区的场景按钮文字跟着同步
  document.addEventListener('site:languagechange', () => {
    built.forEach(rec => rec.refreshLabels());
  });
})();
