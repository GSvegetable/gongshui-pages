/* Work index — v1.0.0
   左侧导航中间的「指南针」方块自站点上线起就没有任何行为。
   这里给它一个真实功能：打开全站作品索引，点任意一行直接展开对应作品。

   索引里的文案全部从 DOM 现读（作品标题、标签、详情描述），
   语言切换后由 site:languagechange 事件驱动重绘，不会出现中英混排。 */
(() => {
  const trigger = document.getElementById('nav-index');
  const panel = document.getElementById('index-panel');
  if (!trigger || !panel) return;

  const list = panel.querySelector('[data-index-list]');
  const count = panel.querySelector('[data-index-count]');
  const closeBtn = panel.querySelector('[data-index-close]');
  const scrim = panel.querySelector('.index-scrim');
  if (!list || !count || !closeBtn) return;

  const works = [...document.querySelectorAll('.preview-card[data-id]')].map(card => ({
    id: card.dataset.id,
    card,
    detail: card.dataset.detail ? document.getElementById(card.dataset.detail) : null
  }));

  // 标题和标签都在渲染时现读，语言切换后重绘才不会残留中文
  const titleOf = work => work.card.querySelector('.card-title')?.textContent.trim() || work.id;
  const tagsOf = work => [...work.card.querySelectorAll('.work-tag')].map(t => t.textContent.trim());

  const describe = work => {
    const text = work.detail?.querySelector('.detail-description')?.textContent.trim();
    return text ? text.replace(/\s+/g, ' ') : '';
  };

  const render = () => {
    list.textContent = '';
    works.forEach((work, index) => {
      const item = document.createElement('li');

      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'index-row';
      row.dataset.indexId = work.id;

      const no = document.createElement('span');
      no.className = 'index-no';
      no.textContent = String(index + 1).padStart(2, '0');

      const body = document.createElement('span');
      body.className = 'index-body';

      const name = document.createElement('span');
      name.className = 'index-name';
      name.textContent = titleOf(work);

      const desc = document.createElement('span');
      desc.className = 'index-desc';
      desc.textContent = describe(work);

      body.append(name, desc);

      const go = document.createElement('span');
      go.className = 'index-go';
      go.setAttribute('aria-hidden', 'true');
      go.textContent = '↗';

      row.append(no, body, go);
      row.addEventListener('click', () => {
        close();
        document.dispatchEvent(new CustomEvent('site:openwork', { detail: { id: work.id } }));
      });

      item.appendChild(row);
      list.appendChild(item);
    });

    const total = works.length;
    const i18n = window.siteI18n;
    const zh = '共 ' + total + ' 件作品';
    const en = i18n && typeof i18n.t === 'function' ? i18n.t('index.count', { n: total }) : null;
    count.textContent = (i18n && i18n.lang === 'en' && en) ? en : zh;
  };

  const open = () => {
    render();
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('scroll-locked');
    closeBtn.focus({ preventScroll: true });
  };

  const close = () => {
    if (!panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('scroll-locked');
  };

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    if (panel.classList.contains('is-open')) close(); else open();
  });
  closeBtn.addEventListener('click', event => { event.stopPropagation(); close(); });
  scrim?.addEventListener('click', event => { event.stopPropagation(); close(); });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) {
      close();
      trigger.focus({ preventScroll: true });
    }
  });

  // 语言切换后重绘，索引里的标题/描述/标签跟着换语言
  document.addEventListener('site:languagechange', () => {
    if (panel.classList.contains('is-open')) render();
  });
})();
