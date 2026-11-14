/* 宫水.com · 管理台 v3
   纸页登记簿界面；数据仍只走开发者白名单可读的 Supabase RPC，
   账号操作仍走 admin-user-action 边缘函数。
   所有数据库文本一律用 textContent 写入，不拼接 HTML。 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const PAGE_SIZE = 20;
  const config = window.SITE_AUTH || {};
  const state = {
    offset: 0,
    filteredTotal: 0,
    busy: false,
    hasAccess: false,
    searchTimer: null,
    detailTrigger: null,
    confirmResolve: null,
    confirmTrigger: null,
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dateFormat = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const dayFormat = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeFormat = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

  /* ── 基础工具 ───────────────────────────────── */
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const asDate = value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const fmtDate = value => {
    const date = asDate(value);
    return date ? dateFormat.format(date) : '—';
  };
  const fmtDay = value => {
    const date = asDate(value);
    return date ? dayFormat.format(date) : '—';
  };
  const fmtTime = value => {
    const date = asDate(value);
    return date ? timeFormat.format(date) : '—';
  };
  const fmtNum = value => Number(value || 0).toLocaleString('zh-CN');
  const initialOf = source => String(source || '?').trim().charAt(0).toUpperCase() || '?';
  const tag = (label, variant) => el('span', 'tag ' + (variant || 'is-ok'), label);

  /* ── 提示条 ─────────────────────────────────── */
  const showNotice = (message, type = 'notice') => {
    const notice = $('notice');
    notice.textContent = message;
    notice.className = 'notice is-' + type;
    notice.hidden = false;
  };
  const hideNotice = () => { $('notice').hidden = true; };

  /* ── 数据接口 ───────────────────────────────── */
  const rpc = async (name, body) => {
    const token = window.siteAuth && window.siteAuth.getToken();
    if (!token) {
      const error = new Error('登录状态已失效');
      error.status = 401;
      throw error;
    }
    const response = await fetch(config.url + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: config.anonKey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) { /* 空响应 */ }
    if (!response.ok) {
      const error = new Error((payload && (payload.message || payload.msg)) || '请求失败');
      error.status = response.status;
      throw error;
    }
    return payload;
  };

  const adminAction = async (action, userId, extra = {}) => {
    const token = window.siteAuth && window.siteAuth.getToken();
    if (!token) throw new Error('登录状态已失效，请重新登录。');
    const response = await fetch(config.url + '/functions/v1/admin-user-action', {
      method: 'POST',
      headers: { apikey: config.anonKey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action, userId }, extra)),
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) { /* 空响应 */ }
    if (!response.ok) throw new Error((payload && payload.error) || '账号操作失败，请稍后重试。');
    return payload;
  };

  /* ── 受限 / 骨架 / 状态行 ────────────────────── */
  const ICON_EMPTY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>';
  const ICON_ALERT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 21 19.5H3z"/><path d="M12 9.5v4.5"/><path d="M12 17h.01"/></svg>';

  const lock = () => {
    state.hasAccess = false;
    ['stat-total', 'stat-today', 'stat-active', 'stat-unverified', 'stat-risk']
      .forEach(id => { $(id).textContent = '—'; });
    $('stat-risk-item').classList.remove('is-alert');
    $('analytics').hidden = true;
    $('result-count').textContent = '—';
    $('page-label').textContent = '—';
    $('prev').disabled = true;
    $('next').disabled = true;
    $('search').disabled = true;

    const body = $('users-body');
    body.replaceChildren();
    const row = el('tr', 'empty-row');
    const cell = el('td', 'restricted-cell');
    cell.colSpan = 7;
    cell.append(el('strong', null, '访问受限'), el('span', null, '没有读取用户数据的权限，或登录状态已失效。'));
    row.appendChild(cell);
    body.appendChild(row);
  };

  const stateRow = ({ title, desc, actionLabel, onAction }) => {
    const row = el('tr', 'empty-row');
    const cell = el('td', 'empty-cell');
    cell.colSpan = 7;
    const box = el('div', 'empty');
    box.setAttribute('aria-live', 'polite');
    const icon = el('span', 'empty-ico');
    icon.innerHTML = ICON_EMPTY;
    const button = el('button', 'btn btn-solid', actionLabel);
    button.type = 'button';
    button.addEventListener('click', onAction);
    box.append(icon, el('h3', 'empty-title', title), el('p', 'empty-desc', desc), button);
    cell.appendChild(box);
    row.appendChild(cell);
    return row;
  };

  const renderSkeleton = () => {
    $('table-wrap').setAttribute('aria-busy', 'true');
    const body = $('users-body');
    body.replaceChildren();
    const widths = [64, 92, 78, 104, 38, 54, 54];
    for (let index = 0; index < 5; index += 1) {
      const row = el('tr', 'skeleton-row');
      row.setAttribute('aria-hidden', 'true');
      widths.forEach((width, column) => {
        const cell = el('td');
        if (column === 0) {
          const wrap = el('div', 'user-cell');
          wrap.append(el('span', 'sk sk-avatar'));
          const lines = el('div', 'user-lines');
          const name = el('span', 'sk');
          name.style.width = width + 'px';
          const mail = el('span', 'sk sk-line');
          mail.style.width = (width + 30) + 'px';
          lines.append(name, mail);
          wrap.appendChild(lines);
          cell.appendChild(wrap);
        } else if (width) {
          const bar = el('span', 'sk');
          bar.style.width = width + 'px';
          cell.appendChild(bar);
        }
        row.appendChild(cell);
      });
      body.appendChild(row);
    }
  };

  /* ── 概览 ───────────────────────────────────── */
  const renderStats = stats => {
    $('stat-total').textContent = fmtNum(stats.total);
    $('stat-today').textContent = fmtNum(stats.today);
    $('stat-active').textContent = fmtNum(stats.active_7_days);
    $('stat-unverified').textContent = fmtNum(stats.unverified);
    $('stat-risk').textContent = fmtNum(stats.high_risk);
    $('stat-risk-item').classList.toggle('is-alert', Number(stats.high_risk || 0) > 0);
  };

  /* ── 近期数据 ───────────────────────────────── */
  const renderAnalytics = data => {
    const section = $('analytics');
    if (!data) { section.hidden = true; return; }

    const trend = Array.isArray(data.registration_trend) ? data.registration_trend : [];
    const account = data.account_status || null;
    const risk = data.risk_status || null;
    if (!trend.length && !account && !risk) { section.hidden = true; return; }
    section.hidden = false;

    const bars = $('signup-bars');
    bars.replaceChildren();
    if (!trend.length) {
      bars.appendChild(el('div', 'chart-empty', '暂无趋势数据'));
      $('signup-total').textContent = '—';
    } else {
      const max = Math.max(1, trend.map(item => Number(item.count || 0)).reduce((a, b) => Math.max(a, b), 0));
      let total = 0;
      trend.forEach((item, index) => {
        const count = Number(item.count || 0);
        total += count;
        const bar = el('span', 'bar' + (index === trend.length - 1 ? ' is-today' : ''));
        bar.style.height = Math.max(3, Math.round(count / max * 100)) + '%';
        bar.title = (item.date || '') + '：' + count + ' 位新用户';
        bar.setAttribute('aria-label', (item.date || '') + '：' + count + ' 位新用户');
        bars.appendChild(bar);
      });
      $('signup-total').textContent = fmtNum(total);
    }

    if (account) {
      const available = Number(account.available || 0);
      const banned = Number(account.banned || 0);
      const total = available + banned;
      $('account-available').textContent = fmtNum(available);
      $('account-banned').textContent = fmtNum(banned);
      $('account-banned-pct').textContent = total ? (banned / total * 100).toFixed(1) + '%' : '—';
      $('account-meter').style.width = (total ? banned / total * 100 : 0) + '%';
    } else {
      ['account-available', 'account-banned', 'account-banned-pct'].forEach(id => { $(id).textContent = '—'; });
      $('account-meter').style.width = '0%';
    }

    if (risk) {
      const normal = Number(risk.normal || 0);
      const highRisk = Number(risk.high_risk || 0);
      const total = normal + highRisk;
      $('risk-count').textContent = fmtNum(highRisk);
      $('risk-normal').textContent = fmtNum(normal);
      $('risk-percent').textContent = total ? (highRisk / total * 100).toFixed(1) + '%' : '—';
      $('risk-fill').style.width = (total ? highRisk / total * 100 : 0) + '%';
    } else {
      ['risk-count', 'risk-normal', 'risk-percent'].forEach(id => { $(id).textContent = '—'; });
      $('risk-fill').style.width = '0%';
    }
  };

  /* ── 名册 ───────────────────────────────────── */
  const userRow = user => {
    const row = el('tr');
    row.dataset.userId = user.id;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', '查看用户档案：' + (user.username || user.email || user.id));

    const identity = el('td');
    const wrap = el('div', 'user-cell');
    wrap.appendChild(el('span', 'avatar', initialOf(user.username || user.email)));
    const lines = el('div', 'user-lines');
    lines.append(
      el('span', 'user-primary', user.username || '未设置用户名'),
      el('span', 'user-secondary', user.email || '无邮箱'),
    );
    wrap.appendChild(lines);
    identity.appendChild(wrap);
    row.appendChild(identity);

    const joined = el('td');
    joined.append(el('div', 'date-main', fmtDay(user.created_at)), el('div', 'date-sub', fmtTime(user.created_at)));
    row.appendChild(joined);

    const last = el('td');
    last.append(
      el('div', 'date-main', user.last_sign_in_at ? fmtDay(user.last_sign_in_at) : '从未登录'),
      el('div', 'date-sub', user.last_sign_in_at ? fmtTime(user.last_sign_in_at) : '—'),
    );
    row.appendChild(last);

    row.appendChild(el('td', 'count-cell', fmtNum(user.bookmarks_count)));

    const banned = !!(user.banned_until && new Date(user.banned_until) > new Date());
    const account = el('td');
    account.appendChild(el('span', 'status ' + (banned ? 'is-risk' : 'is-ok'), banned ? '封禁中' : '正常'));
    row.appendChild(account);

    const risk = el('td');
    risk.appendChild(el('span', 'status ' + (user.high_risk ? 'is-risk' : 'is-ok'), user.high_risk ? '需留意' : '正常'));
    row.appendChild(risk);

    row.appendChild(el('td', 'row-arrow', '›'));
    return row;
  };

  const renderUsers = data => {
    const stats = data.stats || {};
    renderStats(stats);
    state.filteredTotal = Number(data.filtered_total || 0);
    renderAnalytics(data.analytics || null);

    state.hasAccess = true;
    $('search').disabled = false;
    $('result-count').textContent = fmtNum(state.filteredTotal) + ' 位';
    const start = state.filteredTotal ? state.offset + 1 : 0;
    const end = Math.min(state.offset + PAGE_SIZE, state.filteredTotal);
    $('page-label').textContent = state.filteredTotal ? start + '–' + end + ' / ' + state.filteredTotal : '0 位用户';
    $('prev').disabled = state.offset <= 0;
    $('next').disabled = state.offset + PAGE_SIZE >= state.filteredTotal;

    const body = $('users-body');
    body.replaceChildren();
    const users = Array.isArray(data.users) ? data.users : [];
    if (!users.length) {
      const query = $('search').value.trim();
      body.appendChild(stateRow({
        title: query ? '没有匹配的用户' : '还没有注册用户',
        desc: query
          ? '「' + query + '」没有命中任何账号，换个关键词或清空搜索再看。'
          : '注册用户会出现在这里，点刷新可以读取最新数据。',
        actionLabel: query ? '清空搜索' : '刷新数据',
        onAction: () => {
          if (query) { $('search').value = ''; state.offset = 0; load(); $('search').focus(); }
          else { load(); }
        },
      }));
      return;
    }
    const fragment = document.createDocumentFragment();
    users.forEach(user => fragment.appendChild(userRow(user)));
    body.appendChild(fragment);
  };

  async function load() {
    if (state.busy) return;
    state.busy = true;
    const refresh = $('refresh');
    const refreshLabel = $('refresh-label');
    refresh.disabled = true;
    refresh.setAttribute('aria-busy', 'true');
    if (refreshLabel) refreshLabel.textContent = '读取中…';
    hideNotice();
    if (!state.hasAccess) renderSkeleton();
    try {
      const data = await rpc('admin_user_overview', {
        p_search: $('search').value.trim() || null,
        p_limit: PAGE_SIZE,
        p_offset: state.offset,
      });
      renderUsers(data);
      $('data-stamp').textContent = '数据截至 ' + timeFormat.format(new Date());
    } catch (error) {
      console.error('Admin overview failed:', error);
      if (error.status === 401) {
        lock();
        showNotice('登录状态已失效，请重新登录后再进入管理后台。', 'error');
      } else if (error.status === 403 || error.status === 42501 || String(error.message).includes('ADMIN_ACCESS_DENIED')) {
        lock();
        showNotice('当前账号没有管理权限。这个页面只对开发者白名单账号开放。', 'error');
      } else {
        const body = $('users-body');
        body.replaceChildren(stateRow({
          title: '读取失败',
          desc: '没能连上账号服务，检查网络后重试。',
          actionLabel: '重新读取',
          onAction: () => load(),
        }));
        $('result-count').textContent = '—';
        $('page-label').textContent = '—';
        showNotice('读取用户数据失败，请检查网络连接后重试。', 'error');
      }
    } finally {
      state.busy = false;
      refresh.disabled = false;
      refresh.removeAttribute('aria-busy');
      if (refreshLabel) refreshLabel.textContent = '刷新数据';
      $('table-wrap').removeAttribute('aria-busy');
    }
  }

  /* ── 确认弹窗 ───────────────────────────────── */
  const openConfirm = options => new Promise(resolve => {
    state.confirmResolve = resolve;
    $('confirm-title').textContent = options.title || '确认操作';
    $('confirm-body').textContent = options.body || '';
    const ok = $('confirm-ok');
    const field = $('confirm-field');
    const input = $('confirm-input');
    ok.textContent = options.confirmLabel || '确认';
    ok.className = 'btn ' + (options.danger ? 'btn-danger' : 'btn-solid');
    if (options.requireText) {
      field.hidden = false;
      $('confirm-field-label').textContent = '输入 ' + options.requireText + ' 以确认';
      input.value = '';
      ok.disabled = true;
      input.oninput = () => { ok.disabled = input.value.trim() !== options.requireText; };
    } else {
      field.hidden = true;
      input.oninput = null;
      ok.disabled = false;
    }
    state.confirmTrigger = document.activeElement;
    $('confirm-backdrop').hidden = false;
    requestAnimationFrame(() => $('confirm-backdrop').classList.add('is-open'));
    window.setTimeout(() => {
      (options.requireText ? input : $('confirm-cancel')).focus({ preventScroll: true });
    }, reduceMotion ? 0 : 40);
  });

  const settleConfirm = result => {
    const resolve = state.confirmResolve;
    if (!resolve) return;
    state.confirmResolve = null;
    const backdrop = $('confirm-backdrop');
    backdrop.classList.remove('is-open');
    window.setTimeout(() => { backdrop.hidden = true; }, reduceMotion ? 0 : 190);
    const trigger = state.confirmTrigger;
    state.confirmTrigger = null;
    if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
    resolve(result);
  };

  /* ── 账号档案面板 ───────────────────────────── */
  const detailSection = title => {
    const section = el('section', 'd-section');
    section.appendChild(el('h3', null, title));
    return section;
  };
  const detailRows = pairs => {
    const list = el('dl', 'd-rows');
    pairs.forEach(([label, value, mono]) => {
      const row = el('div', 'd-row');
      const cell = el('dd', mono ? 'mono' : '', value === null || value === undefined || value === '' ? '—' : value);
      row.append(el('dt', null, label), cell);
      list.appendChild(row);
    });
    return list;
  };
  const providerName = value => {
    const map = { email: '邮箱注册', google: 'Google', github: 'GitHub', apple: 'Apple', phone: '手机号' };
    return map[value] || value || '未知';
  };
  const panelLoading = () => {
    const wrap = el('div', 'panel-loading');
    wrap.setAttribute('aria-hidden', 'true');
    [{ h: 52, w: '100%' }, { h: 11, w: '70%' }, { h: 11, w: '100%' }, { h: 64, w: '100%' }, { h: 11, w: '88%' }, { h: 64, w: '100%' }]
      .forEach(item => {
        const block = el('div', item.h > 20 ? 'sk sk-block' : 'sk');
        block.style.height = item.h + 'px';
        block.style.width = item.w;
        wrap.appendChild(block);
      });
    return wrap;
  };

  const renderDetail = data => {
    const profile = data.profile || {};
    const activity = data.activity || {};
    const risk = data.risk || {};
    const root = $('detail-content');
    root.replaceChildren();

    const banned = !!(profile.banned_until && new Date(profile.banned_until) > new Date());

    /* 档案头部 */
    const head = el('div', 'profile');
    head.appendChild(el('div', 'profile-avatar', initialOf(profile.username || profile.email)));
    const main = el('div', 'profile-main');
    main.append(
      el('div', 'profile-name', profile.username || '未设置用户名'),
      el('div', 'profile-email', profile.email || '无邮箱'),
    );
    const tags = el('div', 'profile-tags');
    tags.append(
      tag(profile.email_confirmed_at ? '邮箱已验证' : '邮箱待验证', profile.email_confirmed_at ? 'is-ok' : 'is-warn'),
      tag(risk.high_risk ? '风控标记' : '风险正常', risk.high_risk ? 'is-danger' : 'is-ok'),
      tag(banned ? '封禁中' : '可登录', banned ? 'is-danger' : 'is-ok'),
    );
    main.appendChild(tags);
    head.appendChild(main);
    const copy = el('button', 'btn btn-outline btn-sm', '复制 ID');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(String(profile.id || ''));
        copy.textContent = '已复制';
      } catch (_) {
        copy.textContent = '复制失败';
      }
      window.setTimeout(() => { copy.textContent = '复制 ID'; }, 1600);
    });
    head.appendChild(copy);
    root.appendChild(head);

    /* 账号信息 */
    const account = detailSection('账号信息');
    account.appendChild(detailRows([
      ['用户 ID', profile.id, true],
      ['登录方式', providerName(profile.provider)],
      ['注册时间', fmtDate(profile.created_at)],
      ['最近登录', fmtDate(profile.last_sign_in_at)],
      ['邮箱验证', fmtDate(profile.email_confirmed_at)],
      ['资料更新', fmtDate(profile.updated_at)],
      ['邀请时间', fmtDate(profile.invited_at)],
      ['封禁截止', profile.banned_until ? fmtDate(profile.banned_until) : '未封禁'],
      ['账号类型', profile.is_anonymous ? '匿名账号' : profile.is_sso_user ? 'SSO 账号' : '普通账号'],
      ['登录提供方', Array.isArray(profile.providers) && profile.providers.length ? profile.providers.map(providerName).join('、') : providerName(profile.provider)],
    ]));
    root.appendChild(account);

    /* 站内使用 */
    const usage = detailSection('站内使用');
    usage.appendChild(detailRows([
      ['收藏作品', fmtNum(activity.bookmark_count) + ' 个'],
      ['偏好保存', fmtDate(activity.preferences_updated_at)],
    ]));
    const bookmarks = Array.isArray(activity.bookmarks) ? activity.bookmarks : [];
    if (bookmarks.length) {
      const chips = el('div', 'chips');
      bookmarks.forEach(item => chips.appendChild(el('span', 'chip', item.work_id || '未知作品')));
      usage.appendChild(chips);
    } else {
      usage.appendChild(el('p', 'd-note', '这个用户还没有收藏任何作品。'));
    }
    root.appendChild(usage);

    /* 偏好设置 */
    const preferences = activity.preferences && typeof activity.preferences === 'object' ? activity.preferences : {};
    const prefKeys = Object.keys(preferences);
    const prefSection = detailSection('偏好设置');
    if (!prefKeys.length) {
      prefSection.appendChild(el('p', 'd-note', '这个用户还没有保存偏好设置。'));
    } else {
      const labels = { zoom: '画廊缩放', layout: '页面布局', pdsScene: '像素日光场景', orbitScene: '轨道场景', bookmarkFolders: '收藏夹' };
      const list = el('div', 'pref');
      prefKeys.forEach(key => {
        let value = preferences[key];
        if (typeof value === 'object') value = JSON.stringify(value, null, 2);
        const row = el('div', 'pref-row');
        row.append(el('span', 'pref-key', labels[key] || key), el('span', 'pref-val', String(value)));
        list.appendChild(row);
      });
      prefSection.appendChild(list);
    }
    root.appendChild(prefSection);

    /* 安全与风控 */
    const security = detailSection('安全与风控');
    security.appendChild(detailRows([
      ['风控状态', risk.high_risk ? '高风险标记' : '正常'],
      ['标记时间', fmtDate(risk.recorded_at)],
      ['邮箱验证', profile.email_confirmed_at ? '已完成' : '未完成'],
      ['账号状态', banned ? '封禁中' : '可用'],
    ]));
    security.appendChild(el('p', 'd-note', '出于隐私原则，这里不显示密码、会话令牌、IP 地址或原始设备标识。'));
    root.appendChild(security);

    /* 账号管理 */
    const actions = detailSection('账号管理');
    const box = el('div', 'action-box');
    const stateLine = el('div', 'action-state');
    stateLine.appendChild(el('span', 'status ' + (banned ? 'is-risk' : 'is-ok'), banned ? '封禁中' : '账号正常'));
    if (banned) stateLine.appendChild(el('span', 'action-expiry', '封禁截止 ' + fmtDate(profile.banned_until)));
    box.appendChild(stateLine);

    const durationLabel = el('label', 'field-label', '封禁期限');
    const duration = el('select');
    duration.setAttribute('aria-label', '封禁期限');
    [['3600', '1 小时'], ['86400', '24 小时'], ['604800', '7 天'], ['2592000', '30 天'], ['custom', '自定义截止时间']]
      .forEach(([value, label]) => {
        const option = el('option', null, label);
        option.value = value;
        duration.appendChild(option);
      });
    const custom = el('input');
    custom.type = 'datetime-local';
    custom.hidden = true;
    custom.setAttribute('aria-label', '自定义封禁截止时间');
    duration.addEventListener('change', () => { custom.hidden = duration.value !== 'custom'; });
    box.append(durationLabel, duration, custom);

    const buttons = el('div', 'action-buttons');
    const banButton = el('button', 'btn btn-solid', '封禁账号');
    banButton.type = 'button';
    const unbanButton = el('button', 'btn btn-outline', '立即解封');
    unbanButton.type = 'button';
    unbanButton.disabled = !banned;
    buttons.append(banButton, unbanButton);
    box.appendChild(buttons);
    box.appendChild(el('p', 'd-note', '封禁只限制登录，不删除账号数据。'));
    actions.appendChild(box);

    const danger = el('div', 'danger-zone');
    danger.appendChild(el('h4', null, '彻底删除账号'));
    danger.appendChild(el('p', null, '永久移除账号及关联的收藏、偏好和风控记录，无法恢复。'));
    const deleteButton = el('button', 'btn btn-danger', '删除这个账号');
    deleteButton.type = 'button';
    danger.appendChild(deleteButton);
    actions.appendChild(danger);
    root.appendChild(actions);

    banButton.addEventListener('click', async () => {
      let seconds = Number(duration.value);
      if (duration.value === 'custom') {
        const end = custom.value ? new Date(custom.value).getTime() : NaN;
        seconds = Math.floor((end - Date.now()) / 1000);
      }
      if (!Number.isFinite(seconds) || seconds < 60) {
        showNotice('请选择至少 1 分钟后的封禁截止时间。', 'error');
        return;
      }
      const until = fmtDate(new Date(Date.now() + seconds * 1000).toISOString());
      const who = profile.email || profile.username || profile.id;
      const confirmed = await openConfirm({
        title: '确认封禁',
        body: '封禁后 ' + who + ' 将无法登录，截止时间 ' + until + '。',
        confirmLabel: '确认封禁',
        danger: true,
      });
      if (!confirmed) return;
      banButton.disabled = true;
      try {
        await adminAction('ban', profile.id, { durationSeconds: seconds });
        closeDetail();
        await load();
        showNotice('账号已封禁，截止时间 ' + until + '。', 'success');
      } catch (error) {
        showNotice(error.message, 'error');
        banButton.disabled = false;
      }
    });

    unbanButton.addEventListener('click', async () => {
      const who = profile.email || profile.username || profile.id;
      const confirmed = await openConfirm({
        title: '解除封禁',
        body: '确认立即解除 ' + who + ' 的封禁？解除后可以马上登录。',
        confirmLabel: '立即解封',
      });
      if (!confirmed) return;
      unbanButton.disabled = true;
      try {
        await adminAction('unban', profile.id);
        closeDetail();
        await load();
        showNotice('账号已解封，可以重新登录。', 'success');
      } catch (error) {
        showNotice(error.message, 'error');
        unbanButton.disabled = false;
      }
    });

    deleteButton.addEventListener('click', async () => {
      const who = profile.email || profile.username || profile.id;
      const confirmed = await openConfirm({
        title: '删除账号',
        body: '这将永久删除 ' + who + ' 的账号和站内数据，无法恢复。请输入 DELETE 确认。',
        confirmLabel: '彻底删除',
        danger: true,
        requireText: 'DELETE',
      });
      if (!confirmed) return;
      deleteButton.disabled = true;
      try {
        await adminAction('delete', profile.id);
        closeDetail();
        state.offset = 0;
        await load();
        showNotice('账号已彻底删除，用户以后仍可以重新注册。', 'success');
      } catch (error) {
        showNotice(error.message, 'error');
        deleteButton.disabled = false;
      }
    });
  };

  const openDetail = async (userId, trigger) => {
    state.detailTrigger = trigger || null;
    const backdrop = $('detail-backdrop');
    const panel = $('detail-panel');
    panel.hidden = false;
    backdrop.hidden = false;
    $('detail-content').replaceChildren(panelLoading());
    document.body.classList.add('no-scroll', 'panel-open');
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      panel.classList.add('is-open');
    });
    panel.focus({ preventScroll: true });
    try {
      const data = await rpc('admin_user_detail', { p_user_id: userId });
      renderDetail(data);
    } catch (error) {
      const root = $('detail-content');
      root.replaceChildren();
      const box = el('div', 'panel-error');
      const icon = el('span', 'empty-ico');
      icon.innerHTML = ICON_ALERT;
      box.append(
        icon,
        el('strong', null, error.status === 404 ? '没有找到这个用户' : '读取档案失败'),
        el('span', null, error.status === 404 ? '账号可能已经被删除。' : '关闭面板后重试，或检查网络连接。'),
      );
      root.appendChild(box);
    }
  };

  const closeDetail = () => {
    const backdrop = $('detail-backdrop');
    const panel = $('detail-panel');
    if (!panel.classList.contains('is-open')) {
      backdrop.hidden = true;
      panel.hidden = true;
      document.body.classList.remove('no-scroll', 'panel-open');
      return;
    }
    backdrop.classList.remove('is-open');
    panel.classList.remove('is-open');
    document.body.classList.remove('no-scroll', 'panel-open');
    window.setTimeout(() => {
      backdrop.hidden = true;
      panel.hidden = true;
    }, reduceMotion ? 0 : 340);
    const trigger = state.detailTrigger;
    state.detailTrigger = null;
    if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
  };

  /* ── 焦点管理 ───────────────────────────────── */
  const trapFocus = event => {
    const container = state.confirmResolve
      ? $('confirm-dialog')
      : (document.body.classList.contains('panel-open') ? $('detail-panel') : null);
    if (!container) return;
    const focusable = Array.from(container.querySelectorAll(
      'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
    )).filter(node => !node.hidden && node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };

  /* ── 事件绑定 ───────────────────────────────── */
  $('refresh').addEventListener('click', () => load());
  $('prev').addEventListener('click', () => {
    if (state.offset <= 0) return;
    state.offset = Math.max(0, state.offset - PAGE_SIZE);
    load();
  });
  $('next').addEventListener('click', () => {
    if (state.offset + PAGE_SIZE >= state.filteredTotal) return;
    state.offset += PAGE_SIZE;
    load();
  });
  $('search').addEventListener('input', () => {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      state.offset = 0;
      load();
    }, 300);
  });

  $('users-body').addEventListener('click', event => {
    const row = event.target.closest('tr[data-user-id]');
    if (row) openDetail(row.dataset.userId, row);
  });
  $('users-body').addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('tr[data-user-id]');
    if (!row) return;
    event.preventDefault();
    openDetail(row.dataset.userId, row);
  });

  $('detail-close').addEventListener('click', closeDetail);
  $('detail-backdrop').addEventListener('click', closeDetail);

  $('confirm-cancel').addEventListener('click', () => settleConfirm(false));
  $('confirm-ok').addEventListener('click', () => settleConfirm(true));
  $('confirm-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !$('confirm-ok').disabled) settleConfirm(true);
  });
  $('confirm-backdrop').addEventListener('click', event => {
    if (event.target === $('confirm-backdrop')) settleConfirm(false);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (state.confirmResolve) { settleConfirm(false); return; }
      if (document.body.classList.contains('panel-open')) { closeDetail(); return; }
    }
    if (event.key === 'Tab') trapFocus(event);
  });

  $('sign-out').addEventListener('click', async () => {
    await window.siteAuth.signOut();
    location.href = './login.html';
  });

  /* ── 启动 ───────────────────────────────────── */
  async function init() {
    renderSkeleton();
    $('search').disabled = true;
    if (!config.url || !config.anonKey) {
      lock();
      showNotice('账号服务尚未配置，无法连接管理后台。', 'error');
      return;
    }
    try {
      const user = await window.siteAuth.restore();
      if (!user) {
        lock();
        $('admin-email').textContent = '未登录';
        const link = el('a', 'btn btn-ghost btn-sm', '前往登录');
        link.href = './login.html?next=admin.html';
        $('sign-out').before(link);
        showNotice('请先登录开发者账号，再打开管理后台。', 'error');
        return;
      }
      $('admin-email').textContent = user.email || user.username || '已登录';
      $('sign-out').hidden = false;
      await load();
    } catch (_) {
      lock();
      showNotice('验证登录状态失败，请重新登录后再试。', 'error');
    }
  }

  init();
})();