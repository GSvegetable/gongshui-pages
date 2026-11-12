/* Pixel Orbit scene switcher — v1.2.0
   Keep both scenes mounted so switching never waits for a fresh iframe navigation. */
(() => {
  const card = document.getElementById('pixel-orbit-card');
  const panel = document.getElementById('orbit-detail-panel');
  const originalFrame = card?.querySelector('.preview-mount iframe[data-composition-frame]');
  if (!card || !panel || !originalFrame) return;

  const buttons = [...panel.querySelectorAll('[data-orbit-version]')];
  const storageKey = 'pixel-orbit-home-scene-v3';
  const valid = new Set(['countryside', 'planet']);
  const composition = card.dataset.composition === 'full' ? 'full' : 'art';
  const sourceFor = scene =>
    'https://gsvegetable.github.io/-pixel-orbit/showcase.html?v=1.3.6&scene=' +
    scene + '&composition=' + composition;

  let selected = 'planet';
  try {
    const saved = localStorage.getItem(storageKey);
    if (valid.has(saved)) selected = saved;
  } catch (_) {}

  const initialScene = new URL(originalFrame.src, location.href).searchParams.get('scene') === 'planet'
    ? 'planet' : 'countryside';
  if (selected !== initialScene) originalFrame.src = sourceFor(selected);

  const mount = originalFrame.parentElement;
  const stack = document.createElement('div');
  stack.className = 'orbit-frame-stack';
  mount.replaceChild(stack, originalFrame);

  const frames = new Map();
  const ready = new Set();
  let activeScene = selected;
  let pendingScene = null;

  const sceneOf = frame => frame.dataset.orbitScene;
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
  };

  const registerFrame = (frame, scene) => {
    frame.dataset.orbitScene = scene;
    frame.classList.toggle('is-visible', scene === activeScene);
    frames.set(scene, frame);
    stack.appendChild(frame);
  };

  // Reuse the already-running document as one half of the two-scene pair.
  registerFrame(originalFrame, initialScene);

  const otherScene = initialScene === 'planet' ? 'countryside' : 'planet';
  const preload = document.createElement('iframe');
  preload.title = otherScene === 'planet' ? 'Pixel Orbit 星球版' : 'Pixel Orbit 田园版';
  preload.dataset.compositionFrame = '';
  preload.loading = 'eager';
  preload.allow = 'fullscreen';
  preload.src = sourceFor(otherScene);
  preload.className = 'orbit-frame-preload';
  registerFrame(preload, otherScene);

  const frameScenes = new Map([...frames.entries()].map(([scene, frame]) => [frame.contentWindow, scene]));
  window.addEventListener('message', event => {
    if (!event.data || event.data.type !== 'pixel-orbit-ready') return;
    const scene = frameScenes.get(event.source);
    if (!scene) return;
    ready.add(scene);
    if (pendingScene === scene) activate(scene);
  });

  originalFrame.addEventListener('error', () => {
    ready.delete(initialScene);
  });
  preload.addEventListener('error', () => {
    ready.delete(otherScene);
    if (pendingScene === otherScene) pendingScene = null;
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

  // If the preferred scene differs from the original URL, wait for it to paint
  // and then reveal it. The previous scene remains visible during that wait.
  if (selected !== initialScene) {
    pendingScene = selected;
    if (ready.has(selected)) activate(selected);
  }
})();