/* 宫水.com 管理控制台 v2
   仅展示开发者白名单可读取的数据；所有数据库文本均以 textContent 写入。 */
(() => {
  const $ = id => document.getElementById(id);
  const PAGE_SIZE = 20;
  let offset = 0, filteredTotal = 0, searchTimer = null, busy = false;
  const config = window.SITE_AUTH || {};

  const showNotice = (message, type = '') => {
    const el = $('notice'); el.textContent = message;
    el.className = 'notice' + (type ? ' ' + type : ''); el.hidden = false;
  };
  const hideNotice = () => { $('notice').hidden = true; };
  const fmtDate = value => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  };
  const fmtDay = value => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  };
  const fmtNum = value => Number(value || 0).toLocaleString('zh-CN');
  const node = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined && value !== null) el.textContent = String(value);
    return el;
  };
  const makeStatus = (label, state) => node('span', 'status ' + state, label);

  const rpc = async (name, body) => {
    const token = window.siteAuth && window.siteAuth.getToken();
    if (!token) { const e = new Error('登录状态已失效'); e.status = 401; throw e; }
    const response = await fetch(config.url + '/rest/v1/rpc/' + name, {
      method:'POST',
      headers:{apikey:config.anonKey,Authorization:'Bearer ' + token,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const e = new Error(payload && (payload.message || payload.msg) || 'Request failed');
      e.status = response.status; throw e;
    }
    return payload;
  };

  const lockScreen = () => {
    document.body.classList.remove('admin-authorized');
    $('users-body').replaceChildren();
    const row = document.createElement('tr'), cell = node('td','empty-cell','访问受限');
    cell.colSpan = 7; row.appendChild(cell); $('users-body').appendChild(row);
    ['stat-total','stat-today','stat-active','stat-unverified','stat-risk'].forEach(id => { $(id).textContent = '—'; });
    $('result-count').textContent = '—'; $('page-label').textContent = '—';
  };

  const renderStats = stats => {
    $('stat-total').textContent = fmtNum(stats.total);
    $('stat-today').textContent = fmtNum(stats.today);
    $('stat-active').textContent = fmtNum(stats.active_7_days);
    $('stat-unverified').textContent = fmtNum(stats.unverified);
    $('stat-risk').textContent = fmtNum(stats.high_risk);
  };

  const renderUsers = data => {
    renderStats(data.stats || {});
    filteredTotal = Number(data.filtered_total || 0);
    const users = Array.isArray(data.users) ? data.users : [];
    $('result-count').textContent = fmtNum(filteredTotal) + ' 位用户';
    $('page-label').textContent = filteredTotal
      ? (offset + 1) + '–' + Math.min(offset + PAGE_SIZE, filteredTotal) + ' / ' + filteredTotal
      : '0 位用户';
    $('prev').disabled = offset <= 0;
    $('next').disabled = offset + PAGE_SIZE >= filteredTotal;

    const body = $('users-body'); body.replaceChildren();
    if (!users.length) {
      const row = document.createElement('tr'), cell = node('td','empty-cell','没有找到匹配的用户');
      cell.colSpan = 7; row.appendChild(cell); body.appendChild(row); return;
    }
    const fragment = document.createDocumentFragment();
    users.forEach(user => {
      const row = node('tr','user-row');
      row.dataset.userId = user.id;
      row.tabIndex = 0; row.setAttribute('role','button');
      row.setAttribute('aria-label','查看用户 ' + (user.username || user.email || user.id));

      const identity = node('td');
      const wrap = node('div','user-cell');
      const avatar = node('span','avatar',String(user.username || user.email || '?').trim().charAt(0).toUpperCase());
      const labels = node('div');
      labels.append(node('div','user-primary',user.username || '未设置用户名'));
      labels.append(node('div','user-secondary',user.email || '无邮箱'));
      wrap.append(avatar,labels); identity.appendChild(wrap); row.appendChild(identity);

      const joined = node('td');
      joined.append(node('div','date-main',fmtDay(user.created_at)));
      joined.append(node('div','date-sub',fmtDate(user.created_at).split(' ').slice(-1)[0] || ''));
      row.appendChild(joined);

      const last = node('td');
      last.append(node('div','date-main',user.last_sign_in_at ? fmtDay(user.last_sign_in_at) : '从未登录'));
      last.append(node('div','date-sub',user.last_sign_in_at ? fmtDate(user.last_sign_in_at).split(' ').slice(-1)[0] || '' : '—'));
      row.appendChild(last);

      row.appendChild(node('td','count-cell',fmtNum(user.bookmarks_count)));
      const account = node('td');
      account.appendChild(makeStatus(user.email_confirmed_at ? '邮箱已验证' : '待验证', user.email_confirmed_at ? 'ok' : 'pending'));
      row.appendChild(account);
      const risk = node('td');
      risk.appendChild(makeStatus(user.high_risk ? '需留意' : '正常', user.high_risk ? 'risk' : 'normal'));
      row.appendChild(risk);
      row.appendChild(node('td','row-arrow','›'));
      fragment.appendChild(row);
    });
    body.appendChild(fragment);
  };

  async function load() {
    if (busy) return;
    busy = true; $('refresh').disabled = true; $('refresh').textContent = '正在刷新…'; hideNotice();
    try {
      const data = await rpc('admin_user_overview', {
        p_search:$('search').value.trim() || null, p_limit:PAGE_SIZE, p_offset:offset
      });
      renderUsers(data); document.body.classList.add('admin-authorized');
    } catch (error) {
      lockScreen(); console.error('Admin overview failed:', error);
      if (error.status === 401) showNotice('登录状态已失效，请重新登录后再进入管理后台。','error');
      else if (error.status === 403 || String(error.message).includes('ADMIN_ACCESS_DENIED') || error.status === 42501)
        showNotice('当前账号没有管理权限。此页面仅对开发者白名单账号开放。','error');
      else if (error.status === 404) showNotice('用户详情接口尚未部署完成，请稍后重试。','error');
      else showNotice('读取用户数据失败，请检查网络连接后重试。','error');
    } finally {
      busy = false; $('refresh').disabled = false; $('refresh').textContent = '↻ 刷新数据';
    }
  }

  const field = (label, value, mono = false) => {
    const wrap = node('div','detail-field');
    wrap.append(node('span','field-label',label));
    wrap.append(node('span','field-value' + (mono ? ' mono' : ''), value === null || value === undefined || value === '' ? '—' : value));
    return wrap;
  };
  const section = (title, note) => {
    const wrap = node('section','detail-section');
    const head = node('div','detail-section-head');
    head.append(node('h3','',title));
    if (note) head.append(node('span','detail-section-note',note));
    wrap.appendChild(head); return wrap;
  };
  const providerName = value => {
    const map = {email:'邮箱注册',google:'Google',github:'GitHub',apple:'Apple',phone:'手机号'};
    return map[value] || value || '未知';
  };
  const renderDetail = data => {
    const profile = data.profile || {}, activity = data.activity || {}, risk = data.risk || {};
    const root = $('detail-content'); root.replaceChildren();

    const head = node('div','profile-head');
    head.append(node('div','profile-avatar',String(profile.username || profile.email || '?').trim().charAt(0).toUpperCase()));
    const who = node('div'); who.style.minWidth = '0'; who.style.flex = '1';
    who.append(node('div','profile-name',profile.username || '未设置用户名'));
    who.append(node('div','profile-email',profile.email || '无邮箱'));
    const badges = node('div','profile-meta');
    badges.appendChild(makeStatus(profile.email_confirmed_at ? '邮箱已验证' : '邮箱待验证', profile.email_confirmed_at ? 'ok' : 'pending'));
    badges.appendChild(makeStatus(risk.high_risk ? '风控标记' : '风险正常', risk.high_risk ? 'risk' : 'normal'));
    who.appendChild(badges); head.appendChild(who);
    const copy = node('button','copy-button','复制 ID'); copy.type = 'button';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(String(profile.id || '')); copy.textContent = '已复制'; }
      catch (_) { copy.textContent = '复制失败'; }
    });
    head.appendChild(copy); root.appendChild(head);

    const account = section('账号信息','ACCOUNT');
    const grid = node('div','detail-grid');
    grid.append(
      field('用户 ID',profile.id,true),
      field('登录方式',providerName(profile.provider)),
      field('注册时间',fmtDate(profile.created_at)),
      field('资料更新时间',fmtDate(profile.updated_at)),
      field('最近登录',fmtDate(profile.last_sign_in_at)),
      field('邮箱验证时间',fmtDate(profile.email_confirmed_at)),
      field('邀请时间',fmtDate(profile.invited_at)),
      field('账号封禁截止',profile.banned_until ? fmtDate(profile.banned_until) : '未封禁'),
      field('账号类型',profile.is_anonymous ? '匿名账号' : profile.is_sso_user ? 'SSO 账号' : '普通账号'),
      field('登录提供方',Array.isArray(profile.providers) && profile.providers.length ? profile.providers.map(providerName).join('、') : providerName(profile.provider))
    );
    account.appendChild(grid); root.appendChild(account);

    const usage = section('站内使用情况','ACTIVITY');
    const usageGrid = node('div','detail-grid');
    usageGrid.append(field('收藏作品数',fmtNum(activity.bookmark_count)),field('偏好最后保存',fmtDate(activity.preferences_updated_at)));
    usage.appendChild(usageGrid);
    const bookmarks = Array.isArray(activity.bookmarks) ? activity.bookmarks : [];
    const bookmarkList = node('div','bookmark-list');
    if (!bookmarks.length) bookmarkList.append(node('div','empty-note','该用户目前没有收藏作品。'));
    else bookmarks.forEach(item => {
      const line = node('div','bookmark-item');
      line.append(node('span','bookmark-id',item.work_id || '未知作品'));
      line.append(node('span','bookmark-date',fmtDate(item.created_at)));
      bookmarkList.appendChild(line);
    });
    const bookmarkWrap = node('div'); bookmarkWrap.style.marginTop = '17px';
    bookmarkWrap.append(node('span','field-label','收藏记录'),bookmarkList);
    usage.appendChild(bookmarkWrap); root.appendChild(usage);

    const pref = section('偏好设置','PREFERENCES');
    const values = activity.preferences && typeof activity.preferences === 'object' ? activity.preferences : {};
    const prefList = node('div','preference-list');
    const prefLabels = {zoom:'画廊缩放',layout:'页面布局',pdsScene:'像素日光场景',orbitScene:'轨道场景',bookmarkFolders:'收藏夹'};
    const keys = Object.keys(values);
    if (!keys.length) prefList.append(node('div','empty-note','该用户尚未保存偏好设置。'));
    keys.forEach(key => {
      const item = node('div','preference-row');
      item.append(node('span','preference-key',prefLabels[key] || key));
      let value = values[key];
      if (typeof value === 'object') value = JSON.stringify(value,null,2);
      item.append(node('span','preference-value',String(value)));
      prefList.appendChild(item);
    });
    pref.appendChild(prefList); root.appendChild(pref);

    const security = section('安全与风控','SECURITY');
    const securityGrid = node('div','detail-grid');
    securityGrid.append(
      field('当前风控状态',risk.high_risk ? '高风险标记' : '正常'),
      field('风控记录时间',fmtDate(risk.recorded_at)),
      field('邮箱验证',profile.email_confirmed_at ? '已完成' : '未完成'),
      field('账号状态',profile.banned_until && new Date(profile.banned_until) > new Date() ? '封禁中' : '可用')
    );
    security.appendChild(securityGrid);
    const privacyNote = node('p','empty-note','出于隐私与安全原则，此处不显示密码、会话令牌、IP 地址或原始设备标识。');
    privacyNote.style.lineHeight = '1.7'; privacyNote.style.marginTop = '14px';
    security.appendChild(privacyNote); root.appendChild(security);
  };

  let detailBusy = false;
  async function openDetail(userId) {
    if (detailBusy) return;
    detailBusy = true;
    $('detail-backdrop').hidden = false;
    $('detail-content').replaceChildren(node('div','detail-loading','正在读取用户档案…'));
    document.body.style.overflow = 'hidden';
    try {
      const data = await rpc('admin_user_detail',{p_user_id:userId});
      renderDetail(data);
    } catch (error) {
      const root = $('detail-content'); root.replaceChildren();
      root.append(node('div','detail-loading',error.status === 404 ? '未找到该用户。' : '读取用户档案失败，请关闭面板后重试。'));
    } finally { detailBusy = false; }
  }
  const closeDetail = () => { $('detail-backdrop').hidden = true; document.body.style.overflow = ''; };
  $('detail-close').addEventListener('click',closeDetail);
  $('detail-backdrop').addEventListener('click',event => { if (event.target === $('detail-backdrop')) closeDetail(); });
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && !$('detail-backdrop').hidden) closeDetail(); });
  $('users-body').addEventListener('click',event => {
    const row = event.target.closest('tr[data-user-id]');
    if (row) openDetail(row.dataset.userId);
  });
  $('users-body').addEventListener('keydown',event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('tr[data-user-id]');
    if (row) { event.preventDefault(); openDetail(row.dataset.userId); }
  });

  async function init() {
    lockScreen();
    if (!config.url || !config.anonKey) { showNotice('账号服务尚未配置，无法连接管理后台。','error'); return; }
    try {
      const user = await window.siteAuth.restore();
      if (!user) {
        showNotice('请先登录开发者账号，再打开管理后台。','error');
        $('admin-email').textContent = '未登录';
        const link = node('a','text-button','前往登录'); link.href = './login.html?next=admin.html';
        $('sign-out').before(link); return;
      }
      $('admin-email').textContent = user.email || user.username || '已登录';
      $('sign-out').hidden = false;
      await load();
    } catch (_) { lockScreen(); showNotice('验证登录状态失败，请重新登录后再试。','error'); }
  }

  $('refresh').addEventListener('click',() => load());
  $('prev').addEventListener('click',() => { offset = Math.max(0,offset-PAGE_SIZE); load(); });
  $('next').addEventListener('click',() => { if (offset+PAGE_SIZE<filteredTotal) { offset += PAGE_SIZE; load(); } });
  $('search').addEventListener('input',() => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { offset = 0; load(); },300);
  });
  $('sign-out').addEventListener('click',async () => {
    await window.siteAuth.signOut(); location.href = './login.html';
  });
  init();
})();