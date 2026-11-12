(() => {
  const card = document.getElementById('pixel-orbit-card');
  const panel = document.getElementById('orbit-detail-panel');
  const frame = card?.querySelector('.preview-mount iframe');
  if (!card || !panel || !frame) return;

  const buttons = [...panel.querySelectorAll('[data-orbit-version]')];
  const storageKey = 'pixel-orbit-home-scene';
  const valid = new Set(['countryside', 'planet']);
  let selected = 'countryside';
  try {
    const saved = localStorage.getItem(storageKey);
    if (valid.has(saved)) selected = saved;
  } catch (_) {}

  const sourceFor = scene =>
    'https://gsvegetable.github.io/-pixel-orbit/showcase.html?scene=' + scene + '&composition=art';

  const apply = scene => {
    if (!valid.has(scene)) return;
    const next = sourceFor(scene);
    if (frame.src !== next) frame.src = next;
    buttons.forEach(button => {
      const active = button.dataset.orbitVersion === scene;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    try { localStorage.setItem(storageKey, scene); } catch (_) {}
  };

  buttons.forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    apply(button.dataset.orbitVersion);
  }));

  apply(selected);
})();