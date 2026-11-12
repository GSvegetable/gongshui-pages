(() => {
  const card = document.getElementById('pixel-orbit-card');
  const panel = document.getElementById('orbit-detail-panel');
  const originalFrame = card?.querySelector('.preview-mount iframe[data-composition-frame]');
  if (!card || !panel || !originalFrame) return;

  const buttons = [...panel.querySelectorAll('[data-orbit-version]')];
  // New key resets the previous countryside default; future manual choices persist.
  const storageKey = 'pixel-orbit-home-scene-v2';
  const valid = new Set(['countryside', 'planet']);
  const sourceFor = (scene, composition = 'art') =>
    'https://gsvegetable.github.io/-pixel-orbit/showcase.html?scene=' + scene + '&composition=' + composition;

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
  stack.appendChild(originalFrame);

  let activeFrame = originalFrame;
  let incomingFrame = null;
  activeFrame.classList.add('is-visible');

  const updateButtons = scene => {
    buttons.forEach(button => {
      const active = button.dataset.orbitVersion === scene;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const apply = scene => {
    if (!valid.has(scene)) return;
    selected = scene;
    updateButtons(scene);
    try { localStorage.setItem(storageKey, scene); } catch (_) {}

    const activeScene = new URL(activeFrame.src, location.href).searchParams.get('scene') === 'planet'
      ? 'planet' : 'countryside';
    if (scene === activeScene) {
      if (incomingFrame) {
        incomingFrame.remove();
        incomingFrame = null;
      }
      return;
    }

    if (incomingFrame) {
      incomingFrame.remove();
      incomingFrame = null;
    }

    const next = document.createElement('iframe');
    next.title = scene === 'planet' ? 'Pixel Orbit 星球版' : 'Pixel Orbit 田园版';
    next.dataset.compositionFrame = '';
    next.loading = 'eager';
    next.allow = 'fullscreen';
    const composition = card.dataset.composition === 'full' ? 'full' : 'art';
    next.src = sourceFor(scene, composition);
    next.className = 'orbit-frame-next';
    incomingFrame = next;
    stack.appendChild(next);

    const onArtworkReady = event => {
      if (event.source !== next.contentWindow || !event.data || event.data.type !== 'pixel-orbit-ready') return;
      if (incomingFrame !== next) return;
      window.removeEventListener('message', onArtworkReady);

      const previous = activeFrame;
      activeFrame = next;
      incomingFrame = null;
      next.classList.add('is-visible');
      previous.classList.remove('is-visible');
      window.setTimeout(() => previous.remove(), 520);
    };

    // Keep the old scene visible until the new scene has actually painted.
    // iframe load alone only means its document loaded; canvas rendering may still be blank.
    window.addEventListener('message', onArtworkReady);
    next.addEventListener('error', () => {
      window.removeEventListener('message', onArtworkReady);
      if (incomingFrame === next) {
        next.remove();
        incomingFrame = null;
      }
    }, { once: true });
  };

  updateButtons(selected);
  buttons.forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    apply(button.dataset.orbitVersion);
  }));
})();