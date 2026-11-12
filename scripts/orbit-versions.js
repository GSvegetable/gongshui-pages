(() => {
  const panel = document.getElementById('orbit-detail-panel');
  const card = document.getElementById('pixel-orbit-card');
  const frame = card?.querySelector('.preview-mount iframe');
  if (!panel || !frame) return;

  const buttons = [...panel.querySelectorAll('[data-orbit-version]')];
  const storageKey = 'pixel-orbit-home-composition';
  const valid = new Set(['art', 'full']);
  let selected = 'art';
  try {
    const saved = localStorage.getItem(storageKey);
    if (valid.has(saved)) selected = saved;
  } catch (_) {}

  const sourceFor = version =>
    'https://gsvegetable.github.io/-pixel-orbit/showcase.html?composition=' + version;

  const apply = version => {
    if (!valid.has(version)) return;
    selected = version;
    const next = sourceFor(version);
    if (frame.src !== next) frame.src = next;
    buttons.forEach(button => {
      const active = button.dataset.orbitVersion === version;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    try { localStorage.setItem(storageKey, version); } catch (_) {}
  };

  buttons.forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    apply(button.dataset.orbitVersion);
  }));

  apply(selected);
})();