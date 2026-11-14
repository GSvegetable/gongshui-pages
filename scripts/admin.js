/* =========================================================
   站点管理后台 — 安全加固版
   所有来自数据库的值均通过 textContent 写入 DOM，不解析为 HTML。
   ========================================================= */
(() => {
  const $ = id => document.getElementById(id);
  const PAGE_SIZE = 20;
  let offset = 0;
  let filteredTotal = 0;
  let searchTimer = null;
  let busy = false;

  const config = window.SITE_AUTH || {};
  const showNotice = (message, type = '') => {
    const el = $('notice');
    el.textContent = message;
    el.className = 'notice' + (type ? ' ' + type : '');
    el.hidden = false;
  };
  const hideNotice = () => { $('notice').hidden = true; };

  const makeCell = (value, className) => {
    const td = document.createElement('td');
    if (className) td.className = className;
    td.textContent = value == null || value === '' ? '—' : String(value);
    return td;
  };

  const makeStatus = (label, state) => {
    const span = document.createElement('span');
    span.className = 'status ' + state;
    span.textContent = label;
    return span;
  };

  const lockScreen = () => {
    document.body.classList.remove('admin-authorized');
    const body = $('users-body');
    body.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'empty-cell';
    cell.textContent = '访问受限';
    row.appendChild(cell);
    body.appendChild(row);
    ['stat-total', 'stat-today', 'stat-week', 'stat-risk'].forEach(id => { $(id).textContent = '—'; });
    $('result-count').textContent = '—';
    $('page-label').textContent = '—';
  };

  const fmtDate = value => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(d);
  };

  async function rpc(searchValue) {
    const token = window.siteAuth.getToken();
    if (!token) {
      const error = new Error('登录状态已失效');
      error.status = 401;
      throw error;
    }
    const response = await fetch(config.url + '/rest/v1/rpc/admin_user_overview', {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_search: searchValue || null, p_limit: PAGE_SIZE, p_offset: offset })
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const message = payload && (payload.message || payload.msg || payload.details);
      const error = new Error(message || ('HTTP ' + response.status));
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function render(data) {
    $('stat-total').textContent = Number(data.stats?.total || 0).toLocaleString('zh-CN');
    $('stat-today').textContent = Number(data.stats?.today || 0).toLocaleString('zh-CN');
    $('stat-week').textContent = Number(data.stats?.last_7_days || 0).toLocaleString('zh-CN');
    $('stat-risk').textContent = Number(data.stats?.high_risk || 0).toLocaleString('zh-CN');

    filteredTotal = Number(data.filtered_total || 0);
    const users = Array.isArray(data.users) ? data.users : [];
    $('result-count').textContent = filteredTotal.toLocaleString('zh-CN') + ' 位用户';
    $('page-label').textContent = filteredTotal
      ? (offset + 1) + '–' + Math.min(offset + PAGE_SIZE, filteredTotal) + ' / ' + filteredTotal
      : '0 位用户';
    $('prev').disabled = offset <= 0;
    $('next').disabled = offset + PAGE_SIZE >= filteredTotal;

    const body = $('users-body');
    body.replaceChildren();
    if (!users.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'empty-cell';
      cell.textContent = '没有找到匹配的用户';
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    const fragment = document.createDocumentFragment();
    users.forEach(user => {
      const row = document.createElement('tr');

      const identity = document.createElement('td');
      const primary = document.createElement('div');
      primary.className = 'user-primary';
      primary.textContent = user.username || '未设置用户名';
      const secondary = document.createElement('div');
      secondary.className = 'user-secondary';
      secondary.textContent = user.email || '—';
      identity.append(primary, secondary);

      row.appendChild(identity);
      row.appendChild(makeCell(fmtDate(user.created_at)));
      const verifiedCell = document.createElement('td');
      verifiedCell.appendChild(makeStatus(user.email_confirmed_at ? '已验证' : '待验证',
        user.email_confirmed_at ? 'ok' : 'pending'));
      row.appendChild(verifiedCell);
      row.appendChild(makeCell(fmtDate(user.last_sign_in_at)));

      const riskCell = document.createElement('td');
      riskCell.appendChild(makeStatus(user.high_risk ? '高风险' : '正常',
        user.high_risk ? 'risk' : 'normal'));
      row.appendChild(riskCell);
      fragment.appendChild(row);
    });
    body.appendChild(fragment);
  }

  async function load() {
    if (busy) return;
    busy = true;
    $('refresh').disabled = true;
    $('refresh').textContent = '↻ 正在刷新';
    hideNotice();
    try {
      const data = await rpc($('search').value.trim());
      render(data);
      document.body.classList.add('admin-authorized');
    } catch (error) {
      lockScreen();
      console.error('Admin overview failed:', error);
      const message = String(error.message || '');
      if (error.status === 401) {
        showNotice('登录状态已失效。请重新登录后再进入管理后台。', 'error');
      } else if (error.status === 403 || message.includes('ADMIN_ACCESS_DENIED') || message.includes('42501')) {
        showNotice('当前账号没有管理权限。管理后台仅对开发者白名单账号开放。', 'error');
      } else if (error.status === 404 || message.includes('admin_user_overview')) {
        showNotice('后台数据库权限函数尚未安装。请先在 Supabase → SQL Editor 中执行仓库文件：supabase/admin.sql，然后刷新本页。', 'error');
      } else {
        // 不把数据库内部错误原文直接展示给浏览器用户。
        showNotice('读取注册数据失败。请检查网络或确认已执行 supabase/admin.sql。', 'error');
      }
    } finally {
      busy = false;
      $('refresh').disabled = false;
      $('refresh').textContent = '↻ 刷新数据';
    }
  }

  async function init() {
    lockScreen();
    if (!config.url || !config.anonKey) {
      showNotice('账号服务尚未配置，无法连接管理后台。', 'error');
      return;
    }
    try {
      const user = await window.siteAuth.restore();
      if (!user) {
        showNotice('请先登录开发者账号，再打开管理后台。', 'error');
        $('admin-email').textContent = '未登录';
        const link = document.createElement('a');
        link.href = './login.html?next=admin.html';
        link.textContent = '前往登录';
        link.className = 'quiet-button';
        $('sign-out').before(link);
        return;
      }
      $('admin-email').textContent = user.email || user.username || '已登录';
      $('sign-out').hidden = false;
      await load();
    } catch (_) {
      lockScreen();
      showNotice('验证登录状态失败，请重新登录后再试。', 'error');
    }
  }

  $('refresh').addEventListener('click', () => load());
  $('prev').addEventListener('click', () => { offset = Math.max(0, offset - PAGE_SIZE); load(); });
  $('next').addEventListener('click', () => { if (offset + PAGE_SIZE < filteredTotal) { offset += PAGE_SIZE; load(); } });
  $('search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { offset = 0; load(); }, 280);
  });
  $('sign-out').addEventListener('click', async () => {
    await window.siteAuth.signOut();
    location.href = './login.html';
  });
  init();
})();
