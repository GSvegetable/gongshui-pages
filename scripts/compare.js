/* =========================================================
   场景比较 — v1.0.0
   ---------------------------------------------------------
   作品详情页里左右两栏各选一个场景/版本，实时并排对照。
   · 像素昼夜开关：预览页用 postMessage 切换场景（pds-set-scene）
   · 像素圆环：showcase 页用 ?scene= 切换版本
   iframe 只在对应作品详情打开（面板 is-active）时才创建，
   首页不会因为比较功能一起变慢。
   ========================================================= */
(() => {
  const PDS_PREVIEW = 'https://gsvegetable.github.io/1_pixel-daylight-switch/preview.html';
  const ORBIT_SHOWCASE = 'https://gsvegetable.github.io/2_pixel-dusk/showcase.html?v=1.4.0&composition=art';

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

  const sections = [...document.querySelectorAll('.scene-compare')];
  if (!sections.length) return;

  const sourceSelectorFor = scope => (scope === 'orbit' ? '[data-orbit-version]' : '[data-scene-choice]');
  const idOf = button => button.dataset.orbitVersion || button.dataset.sceneChoice;

  const makeLabelReader = panel => {
    const cache = new Map();
    return scope => id => {
      if (!cache.has(scope)) {
        const sources = [...panel.querySelectorAll('.scene-picker ' + sourceSelectorFor(scope))];
        cache.set(scope, sources);
      }
      const btn = cache.get(scope).find(b => idOf(b) === id);
      return btn?.querySelector('strong')?.textContent?.trim() || id;
    };
  };

  sections.forEach(section => {
    const scope = section.dataset.compare;
    const cfg = CONFIG[scope];
    const panel = section.closest('.work-detail');
    if (!cfg || !panel) return;

    const labelOf = makeLabelReader(panel)(scope);
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

    // 先把选择按钮摆好（不加载 iframe），面板打开时再真正载入
    panes.forEach(pane => {
      buildChips(pane);
      markActive(pane, pane.dataset.scene || cfg.scenes[0]);
    });

    const init = () => {
      if (initialized) return;
      initialized = true;
      panes.forEach(pane => syncFrame(pane, pane.dataset.scene || cfg.scenes[0]));
    };

    // 作品面板的 is-active 由 main.js 的作品控制器切换
    new MutationObserver(() => {
      if (panel.classList.contains('is-active')) init();
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
    if (panel.classList.contains('is-active')) init();
  });

  // 中英切换后，比较区的场景按钮文字跟着同步
  document.addEventListener('site:languagechange', () => {
    sections.forEach(section => {
      const scope = section.dataset.compare;
      const cfg = CONFIG[scope];
      const panel = section.closest('.work-detail');
      if (!cfg || !panel) return;
      const labelOf = makeLabelReader(panel)(scope);
      section.querySelectorAll('.compare-pane').forEach(pane => {
        pane.querySelectorAll('.compare-pick').forEach(b => { b.textContent = labelOf(b.dataset.scene); });
        const strong = pane.querySelector('.compare-caption strong');
        if (strong) strong.textContent = labelOf(pane.dataset.scene);
      });
    });
  });
})();
