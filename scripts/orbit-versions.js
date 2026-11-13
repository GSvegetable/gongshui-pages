/* Pixel Orbit scene switcher — v1.3.9
   Keep all three scenes mounted so switching never waits for a fresh iframe navigation. */
(() => {
  const card = document.getElementById('pixel-orbit-card');
  const panel = document.getElementById('orbit-detail-panel');
  const originalFrame = card?.querySelector('.preview-mount iframe[data-composition-frame]');
  if (!card || !panel || !originalFrame) return;

  // showcase 缓存版本号只在这里定义一次，index.html 的 iframe src 必须与它一致。
  // 之前 index.html 写 v1.3.6、这里校验 v1.3.8，
  // 每次进站都会判定"版本不符"并改写 src，白白多加载一次 iframe。
  const SCENE_VERSION = '1.3.9';

  const buttons = [...panel.querySelectorAll('[data-orbit-version]')];
  const storageKey = 'pixel-orbit-home-scene-v2';
  const valid = new Set(['countryside', 'planet', 'world']);
  const composition = card.dataset.composition === 'full' ? 'full' : 'art';
  const sourceFor = scene =>
    'https://gsvegetable.github.io/2_pixel-dusk/showcase.html?v=' + SCENE_VERSION +
    '&scene=' + scene + '&composition=' + composition;

  let selected = 'planet';
  try {
    const saved = localStorage.getItem(storageKey);
    if (valid.has(saved)) selected = saved;
  } catch (_) {}

  const initialScene = selected;
  // 先摘掉 src 再入栈：iframe 在 DOM 里被搬动会整个重新加载，
  // 先摘 src 作废 HTML 里那一次请求，入栈后只加载一次。
  const initialSrc = originalFrame.getAttribute('src') || '';
  originalFrame.removeAttribute('src');
  const currentUrl = new URL(initialSrc, location.href);
  const needsSwap = currentUrl.searchParams.get('scene') !== selected ||
                    currentUrl.searchParams.get('v') !== SCENE_VERSION;

  const mount = originalFrame.parentElement;
  const stack = document.createElement('div');
  stack.className = 'orbit-frame-stack';
  mount.replaceChild(stack, originalFrame);

  const frames = new Map();
  const ready = new Set();
  const frameScenes = new Map();
  window.addEventListener('message', event => {
    if (!event.data || event.data.type !== 'pixel-orbit-ready') return;
    const scene = frameScenes.get(event.source);
    if (!scene) return;
    ready.add(scene);
    if (pendingScene === scene) activate(scene);
  });
  let activeScene = selected;
  let pendingScene = null;

  const updateButtons = scene => {
    buttons.forEach(button => {
      const active = button.dataset.orbitVersion === scene;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const activate = scene => {
    if (!valid.has(scene)) return;
    const next = frames.get(scene);
    if (!next) return;
    if (!ready.has(scene)) {
      pendingScene = scene;
      return;
    }
    pendingScene = null;
    if (scene === activeScene) return;

    const previous = frames.get(activeScene);
    activeScene = scene;
    next.classList.add('is-visible');
    if (previous) previous.classList.remove('is-visible');
    updateButtons(scene);
    try { localStorage.setItem(storageKey, scene); } catch (_) {}
    window.siteSync?.patchPrefs({ orbitScene: scene });
  };

  const registerFrame = (frame, scene) => {
    frame.dataset.orbitScene = scene;
    frame.classList.toggle('is-visible', scene === activeScene);
    frames.set(scene, frame);
    const ping = () => {
      // Register the WindowProxy only after the iframe is attached to the document.
      // A detached iframe may not yet expose the same contentWindow used by message events.
      if (frame.contentWindow) frameScenes.set(frame.contentWindow, scene);
      frame.contentWindow?.postMessage({ type: 'pixel-orbit-ping' }, '*');
    };
    frame.addEventListener('load', ping);
    stack.appendChild(frame);
    // Attach first, then register and ping; this makes the ready handshake reliable.
    ping();
  };

  // Keep all three editions mounted so every choice is an immediate cross-fade.
  registerFrame(originalFrame, initialScene);
  // 入栈之后才给 src，避免搬动 iframe 触发的第二次加载。
  originalFrame.src = needsSwap ? sourceFor(selected) : initialSrc;
  originalFrame.addEventListener('error', () => ready.delete(initialScene));

  [...valid].filter(scene => scene !== initialScene).forEach(scene => {
    const preload = document.createElement('iframe');
    preload.title = scene === 'planet' ? 'Pixel Orbit 星球版' : scene === 'world' ? 'Pixel Orbit 环形世界版' : 'Pixel Orbit 田园版';
    preload.dataset.compositionFrame = '';
    preload.loading = 'eager';
    preload.allow = 'fullscreen';
    preload.className = 'orbit-frame-preload';
    registerFrame(preload, scene);
    preload.addEventListener('error', () => {
      ready.delete(scene);
      if (pendingScene === scene) pendingScene = null;
    });
    preload.src = sourceFor(scene);
  });

  updateButtons(selected);
  buttons.forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    const scene = button.dataset.orbitVersion;
    updateButtons(scene);
    selected = scene;
    try { localStorage.setItem(storageKey, scene); } catch (_) {}
    activate(scene);
  }));

})();