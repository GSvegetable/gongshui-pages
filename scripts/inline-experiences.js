/* Inline extended experiences — v1.1.0 */
(() => {
  document.querySelectorAll('.inline-experience-section').forEach(section => {
    const viewer = section.querySelector('.inline-experience-viewer');
    const frame = section.querySelector('[data-experience-frame]');
    const heading = section.querySelector('[data-experience-heading]');
    const fallback = section.querySelector('[data-experience-fallback]');
    const close = section.querySelector('[data-experience-close]');
    const choices = [...section.querySelectorAll('[data-experience-url]')];
    const cardToggle = section.querySelector('.card-experience-toggle');
    if (!viewer || !frame || !heading || !fallback || !close) return;

    const activate = button => {
      const url = button.dataset.experienceUrl;
      if (!url) return;
      if (cardToggle) cardToggle.setAttribute('aria-expanded', 'true');
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
      if (cardToggle) cardToggle.setAttribute('aria-expanded', 'false');
      choices.forEach(item => {
        item.classList.remove('is-active');
        item.setAttribute('aria-pressed', 'false');
      });
    };

    if (cardToggle) cardToggle.addEventListener('click', event => {
      event.stopPropagation();
      if (viewer.hidden) {
        const lab = section.querySelector('[data-experience-url]');
        if (lab) activate(lab);
      } else dismiss();
    });
    choices.forEach(button => {
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', event => { event.stopPropagation(); activate(button); });
    });
    close.addEventListener('click', event => { event.stopPropagation(); dismiss(); });
  });
})();