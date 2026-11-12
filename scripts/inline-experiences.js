/* Inline extended experiences — v1.0.0 */
(() => {
  document.querySelectorAll('.inline-experience-section').forEach(section => {
    const viewer = section.querySelector('.inline-experience-viewer');
    const frame = section.querySelector('[data-experience-frame]');
    const heading = section.querySelector('[data-experience-heading]');
    const fallback = section.querySelector('[data-experience-fallback]');
    const close = section.querySelector('[data-experience-close]');
    const choices = [...section.querySelectorAll('[data-experience-url]')];
    if (!viewer || !frame || !heading || !fallback || !close) return;

    const activate = button => {
      const url = button.dataset.experienceUrl;
      if (!url) return;
      choices.forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      heading.textContent = button.dataset.experienceTitle || button.textContent.trim();
      fallback.href = url;
      if (frame.src !== url) frame.src = url;
      viewer.hidden = false;
      viewer.scrollIntoView({behavior:'smooth', block:'nearest'});
    };

    const dismiss = () => {
      viewer.hidden = true;
      frame.removeAttribute('src');
      choices.forEach(item => {
        item.classList.remove('is-active');
        item.setAttribute('aria-pressed', 'false');
      });
    };

    choices.forEach(button => {
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => activate(button));
    });
    close.addEventListener('click', dismiss);
  });
})();