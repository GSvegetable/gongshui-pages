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
  const lockScreen = () => {
    document.body.classList.remove('admin-authorized');
    $('users-body').innerHTML = '<tr><td colspan="5" class="empty-cell">访问受限</td></tr>';
    ['stat-total', 'stat-today', 'stat-week', 'stat-risk'].forEach(id => { $(id).textContent = '—'; });
    $('result-count').textContent = '—';
    $('page-label').textContent = '—';
  };
  const fmtDate = value => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  async function rpc(searchValue) {
    const token = window.siteAuth.getToken();
    const response = await fetch(config.url + '/rest/v1/rpc/admin_user_overview', {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({p_search: searchValue || null, p_limit: PAGE_SIZE, p_offset: offset})
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
    $('page-label').textContent = filteredTotal ? (offset + 1) + '–' + Math.min(offset + PAGE_SIZE, filteredTotal) + ' / ' + filteredTotal : '0 位用户';
    $('prev').disabled = offset <= 0;
    $('next').disabled = offset + PAGE_SIZE >= filteredTotal;
    $('users-body').innerHTML = users.length ? users.map(user => {
      const email = escapeHtml(user.email || '—');
      const username = escapeHtml(user.username || '未设置用户名');
      const verified = !!user.email_confirmed_at;
      const risk = !!user.high_risk;
      return '<tr>' +
        '<td><div class="user-primary">' + username + '</div><div class="user-secondary">' + email + '</div></td>' +
        '<td>' + fmtDate(user.created_at) + '</td>' +
        '<td><span class="status ' + (verified ? 'ok' : 'pending') + '">' + (verified ? '已验证' : '待验证') + '</span></td>' +
        '<td>' + fmtDate(user.last_sign_in_at) + '</td>' +
        '<td><span class="status ' + (risk ? 'risk' : 'normal') + '">' + (risk ? '高风险' : '正常') + '</span></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="5" class="empty-cell">没有找到匹配的用户</td></tr>';
  }

  async function load() {
    if (busy) return;
    busy = true;
    $('refresh').disabled = true;
    $('refresh').innerHTML = '<span class="refresh-icon">↻</span> 正在刷新';
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
        showNotice('当前账号没有管理权限。管理后台仅对三个开发者白名单邮箱开放。', 'error');
      } else if (error.status === 404 || message.includes('admin_user_overview')) {
        showNotice('后台数据库权限函数尚未安装。请先在 Supabase → SQL Editor 中执行仓库文件：supabase/admin.sql，然后刷新本页。', 'error');
      } else {
        showNotice('读取注册数据失败：' + message + '。请检查网络或确认已执行 supabase/admin.sql。', 'error');
      }
    } finally {
      busy = false;
      $('refresh').disabled = false;
      $('refresh').innerHTML = '<span class="refresh-icon">↻</span> 刷新数据';
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
    } catch (error) {
      lockScreen();
      showNotice('验证登录状态失败：' + (error.message || '未知错误'), 'error');
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
