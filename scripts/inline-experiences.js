/* Inline extended experiences — v1.1.4 */
(() => {
  document.querySelectorAll('.inline-experience-section').forEach(section => {
    const viewer = section.querySelector('.inline-experience-viewer');
    const frame = section.querySelector('[data-experience-frame]');
    const heading = section.querySelector('[data-experience-heading]');
    const fallback = section.querySelector('[data-experience-fallback]');
    const close = section.querySelector('[data-experience-close]');
    const choices = [...section.querySelectorAll('[data-experience-url]:not(.card-experience-toggle)')];
    const cardToggle = section.querySelector('.card-experience-toggle');
    if (!viewer || !frame || !heading || !fallback || !close) return;

    let viewerAnimation = null;
    const clearViewerStyles = () => {
      ['height', 'opacity', 'overflow', 'margin-top'].forEach(name => viewer.style.removeProperty(name));
    };
    const compactSection = () => {
      section.style.maxHeight = cardToggle?.closest('.preview-card.is-open') ? '56px' : '';
      section.style.overflow = 'visible';
    };

    const animateViewer = open => {
      // Capture the currently painted state before cancelling an in-flight transition,
      // so a quick reopen reverses smoothly instead of jumping.
      const currentStyle = getComputedStyle(viewer);
      const start = viewer.hidden
        ? { height: 0, opacity: 0, marginTop: '0px' }
        : {
            height: viewer.getBoundingClientRect().height,
            opacity: Number(currentStyle.opacity),
            marginTop: currentStyle.marginTop
          };
      if (viewerAnimation) {
        viewerAnimation.cancel();
        viewerAnimation = null;
      }

      viewer.hidden = false;
      const targetMargin = '12px';
      viewer.style.overflow = 'hidden';
      viewer.style.height = start.height + 'px';
      viewer.style.opacity = String(start.opacity);
      viewer.style.marginTop = start.marginTop;

      const targetHeight = viewer.scrollHeight;
      const keyframes = open
        ? [
            { height: start.height + 'px', opacity: start.opacity, marginTop: start.marginTop },
            { height: targetHeight + 'px', opacity: 1, marginTop: targetMargin }
          ]
        : [
            { height: start.height + 'px', opacity: start.opacity, marginTop: start.marginTop },
            { height: '0px', opacity: 0, marginTop: '0px' }
          ];
      const animation = viewer.animate(keyframes, {
        duration: open ? 300 : 250,
        easing: 'cubic-bezier(.22,.8,.2,1)',
        fill: 'both'
      });
      viewerAnimation = animation;
      animation.finished.then(() => {
        if (viewerAnimation !== animation) return;
        viewerAnimation = null;
        clearViewerStyles();
        if (!open) {
          viewer.hidden = true;
          frame.removeAttribute('src');
          compactSection();
        }
      }).catch(() => {});
    };

    const activate = button => {
      const url = button.dataset.experienceUrl;
      if (!url) return;
      if (cardToggle) cardToggle.setAttribute('aria-expanded', 'true');
      section.style.maxHeight = 'none';
      section.style.overflow = 'visible';
      choices.forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      heading.textContent = button.dataset.experienceTitle || button.textContent.trim();
      fallback.href = url;
      if (frame.src !== url) frame.src = url;
      animateViewer(true);
      viewer.scrollIntoView({behavior:'smooth', block:'nearest'});
    };

    const dismiss = () => {
      if (viewer.hidden) return;
      if (cardToggle) cardToggle.setAttribute('aria-expanded', 'false');
      choices.forEach(item => {
        item.classList.remove('is-active');
        item.setAttribute('aria-pressed', 'false');
      });
      animateViewer(false);
    };

    if (cardToggle) cardToggle.addEventListener('click', event => {
      event.stopPropagation();
      if (viewer.hidden) activate(cardToggle);
      else dismiss();
    });
    choices.forEach(button => {
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', event => { event.stopPropagation(); activate(button); });
    });
    close.addEventListener('click', event => { event.stopPropagation(); dismiss(); });
  });
})();
