/* =========================================================
   投稿者地球 —— 挂在首页「指南针」视图里
   ---------------------------------------------------------
   · 地球用 globe.gl（three.js），第一次打开指南针时才加载，不拖慢首页
   · 库、贴图、国旗、边界数据全部内置在仓库里，不依赖任何外部 CDN
   · 数据在 data/contributors.json：加一条就多一面旗，不用改代码
   · 没有 WebGL / 加载失败时，会降级成一份普通的投稿者名单
   · 投稿者的名字、备注全部用 textContent 写入，不会被注入 HTML
   · 开关由主站的指南针视图驱动（main.js → setCompassView），这里只管地球自己
   ========================================================= */
(() => {
  'use strict';

  const REPO = 'GSvegetable/gongshui-pages';
  // 资源全部内置在仓库里：不依赖 unpkg / flagcdn，国内网络打开也能正常显示
  const GLOBE_LIB = './scripts/vendor/globe.gl.min.js';
  const IMG = './assets/earth/';
  const COUNTRY_GEOJSON = './data/ne_110m_admin_0_countries.geojson';
  const DATA_URL = './data/contributors.json';
  const FLAG_DIR = './assets/flags/';
  const GLOBE_R = 100; // globe.gl 里地球半径固定是 100

  /* 国家代码 → [纬度, 经度, 中文名]。只填国家时，旗子插在这个"国家中心"。
     不在表里的国家：请在 contributors.json 里同时写 lat / lng。 */
  const COUNTRIES = {
    CN: [35.0, 103.0, '中国'], HK: [22.32, 114.17, '香港'], TW: [23.7, 121.0, '台湾'], MO: [22.2, 113.55, '澳门'],
    JP: [36.0, 138.0, '日本'], KR: [36.5, 127.8, '韩国'], MN: [46.8, 103.8, '蒙古'],
    SG: [1.35, 103.82, '新加坡'], MY: [4.2, 102.0, '马来西亚'], TH: [15.0, 101.0, '泰国'], VN: [16.0, 107.8, '越南'],
    ID: [-2.5, 118.0, '印度尼西亚'], PH: [12.9, 122.0, '菲律宾'], IN: [22.0, 79.0, '印度'], PK: [30.0, 69.5, '巴基斯坦'],
    BD: [23.7, 90.4, '孟加拉国'], NP: [28.4, 84.1, '尼泊尔'], KZ: [48.0, 67.0, '哈萨克斯坦'],
    RU: [60.0, 95.0, '俄罗斯'], TR: [39.0, 35.0, '土耳其'], IL: [31.4, 35.0, '以色列'], SA: [24.0, 45.0, '沙特阿拉伯'],
    AE: [24.3, 54.3, '阿联酋'], IR: [32.5, 54.0, '伊朗'],
    EG: [26.5, 30.0, '埃及'], ZA: [-29.0, 24.0, '南非'], NG: [9.1, 8.7, '尼日利亚'], KE: [0.2, 37.9, '肯尼亚'], MA: [31.8, -7.1, '摩洛哥'],
    GB: [54.0, -2.5, '英国'], IE: [53.2, -8.0, '爱尔兰'], FR: [46.6, 2.4, '法国'], DE: [51.1, 10.4, '德国'], NL: [52.2, 5.5, '荷兰'],
    BE: [50.6, 4.6, '比利时'], CH: [46.8, 8.2, '瑞士'], AT: [47.6, 14.1, '奥地利'], IT: [42.8, 12.5, '意大利'], ES: [40.2, -3.7, '西班牙'],
    PT: [39.6, -8.0, '葡萄牙'], SE: [62.0, 15.0, '瑞典'], NO: [61.5, 9.0, '挪威'], FI: [64.0, 26.0, '芬兰'], DK: [56.0, 10.0, '丹麦'],
    IS: [64.9, -18.6, '冰岛'], PL: [52.0, 19.4, '波兰'], CZ: [49.8, 15.5, '捷克'], HU: [47.2, 19.4, '匈牙利'], RO: [45.9, 25.0, '罗马尼亚'],
    GR: [39.0, 22.0, '希腊'], UA: [49.0, 31.4, '乌克兰'],
    US: [39.5, -98.5, '美国'], CA: [56.0, -100.0, '加拿大'], MX: [23.6, -102.5, '墨西哥'], BR: [-10.0, -52.0, '巴西'],
    AR: [-35.0, -65.0, '阿根廷'], CL: [-30.0, -71.0, '智利'], CO: [4.6, -74.1, '哥伦比亚'], PE: [-9.2, -75.0, '秘鲁'],
    AU: [-25.0, 134.0, '澳大利亚'], NZ: [-40.9, 174.0, '新西兰']
  };

  /* ---------- 纯函数（不碰 DOM，方便单独测试） ---------- */
  const num = v => (typeof v === 'number' && Number.isFinite(v)) ? v : null;
  const isSafeUrl = u => typeof u === 'string' && /^(https:\/\/|\.\/|\/(?!\/))/.test(u);
  const flagUrl = code => FLAG_DIR + String(code || '').toUpperCase() + '.svg';
  const round2 = v => Math.round(v * 100) / 100; // 约 1 公里：保护投稿者隐私，不会暴露到门牌

  /* 国家名：英文态用系统自带的国家名，中文态用内置表 */
  const countryLabel = code => {
    const i18n = window.siteI18n;
    const lang = i18n && i18n.lang === 'en' ? 'en' : 'zh-CN';
    const info = COUNTRIES[code];
    try {
      const name = new Intl.DisplayNames([lang], { type: 'region' }).of(code);
      if (name) return name;
    } catch (_) { /* 老浏览器没有 Intl.DisplayNames */ }
    return info ? info[2] : code;
  };

  function normalize(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const github = /^[A-Za-z0-9-]{1,39}$/.test(raw.github || '') ? raw.github : '';
    const name = String(raw.name || github || '').trim().slice(0, 40);
    const country = String(raw.country || '').trim().toUpperCase();
    if (!name || !/^[A-Z]{2}$/.test(country)) return null;

    const info = COUNTRIES[country];
    let lat = num(raw.lat);
    let lng = num(raw.lng);
    const precise = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    if (precise) { lat = round2(lat); lng = round2(lng); }
    else if (info) { lat = info[0]; lng = info[1]; }
    else return null; // 不在表里又没写坐标：放不到地球上

    let avatar = isSafeUrl(raw.avatar) ? raw.avatar : '';
    if (!avatar && github) avatar = 'https://github.com/' + github + '.png?size=96';

    return {
      id: String(raw.id || ('c' + index)),
      name, github, country,
      countryName: countryLabel(country),
      city: String(raw.city || '').trim().slice(0, 40),
      lat, lng, precise,
      plotLat: lat, plotLng: lng,
      pin: (raw.pin === 'flag' || !avatar) ? 'flag' : 'avatar',
      avatar,
      note: String(raw.note || '').trim().slice(0, 120),
      works: Array.isArray(raw.works) ? raw.works.filter(w => typeof w === 'string').slice(0, 8) : []
    };
  }

  // 同一地点挤了好几面旗：绕着中心摆成一圈，谁也不压谁
  function spreadOverlaps(list) {
    const groups = new Map();
    list.forEach(c => {
      const key = Math.round(c.lat) + ',' + Math.round(c.lng);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    });
    groups.forEach(group => {
      if (group.length < 2) return;
      const r = Math.min(4, 1.4 + group.length * 0.35);
      group.forEach((c, i) => {
        const a = (i / group.length) * Math.PI * 2 - Math.PI / 2;
        c.plotLat = Math.max(-85, Math.min(85, c.lat + Math.sin(a) * r));
        c.plotLng = c.lng + Math.cos(a) * r / Math.max(0.3, Math.cos(c.lat * Math.PI / 180));
      });
    });
  }

  // 和 three-globe 一致的经纬度 → 三维坐标
  function toXYZ(lat, lng, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (90 - lng) * Math.PI / 180;
    return { x: r * Math.sin(phi) * Math.cos(theta), y: r * Math.cos(phi), z: r * Math.sin(phi) * Math.sin(theta) };
  }

  // 这个点是不是在地球"朝着镜头"的这一面（超过地平线就藏起来）
  function facing(p, cam) {
    const pl = Math.hypot(p.x, p.y, p.z);
    const cl = Math.hypot(cam.x, cam.y, cam.z);
    if (!pl || !cl) return true;
    const cos = (p.x * cam.x + p.y * cam.y + p.z * cam.z) / (pl * cl);
    return cos > pl / cl + 0.015;
  }

  const helpers = { normalize, spreadOverlaps, toXYZ, facing, COUNTRIES, flagUrl };
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = helpers;
    return;
  }

  /* ---------- 页面接入 ---------- */
  const navHome = document.getElementById('nav-home');
  // 指南针视图只存在于首页；别的页面直接不启动
  if (!document.getElementById('compass-view')) return;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  /* 取词：跟着站点的中英切换走（英文走 index.html 的 siteI18n，中文回退写在调用处） */
  const tr = (key, fallback, vars) => {
    const i18n = window.siteI18n;
    const isEn = i18n && i18n.lang === 'en';
    let value = fallback;
    if (isEn && i18n && typeof i18n.t === 'function') {
      const en = i18n.t(key, vars);
      if (en) value = en;
    }
    if (!vars) return value;
    return Object.keys(vars).reduce((s, name) => s.split('{' + name + '}').join(vars[name]), value);
  };

  const readDuration = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--dur').trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 460;
    return /ms$/.test(raw) ? n : /s$/.test(raw) ? n * 1000 : n;
  };

  const hasWebGL = () => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (_) { return false; }
  };

  const loadedScripts = {};
  const loadScript = src => loadedScripts[src] || (loadedScripts[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = resolve;
    s.onerror = () => { delete loadedScripts[src]; reject(new Error('脚本加载失败：' + src)); };
    document.head.appendChild(s);
  }));

  const issueUrl = () => {
    const text = [
      '## 我想在「投稿者地球」上插旗',
      '',
      '- 显示名：',
      '- GitHub 用户名（可选，用来自动取头像）：',
      '- 国家代码（如 CN / JP / US / NZ）：',
      '- 精确位置（可选，经纬度；建议只填到城市级别，我们会取整到约 1 公里）：',
      '- 显示方式：头像 / 国旗',
      '- 对应的作品：',
      '- 一句话（可选）：'
    ].join('\n');
    return 'https://github.com/' + REPO + '/issues/new?title=' + encodeURIComponent('投稿插旗：') + '&body=' + encodeURIComponent(text);
  };

  /* ---------- 状态 ---------- */
  let view = null, stage = null, statusBox = null, card = null, roster = null, statsLine = null, dayBtn = null;
  let g = null;                 // globe.gl 实例
  let contributors = [];
  let selected = null;
  let isOpen = false;
  let night = false;
  let rafId = 0;
  let resumeTimer = 0;
  let readyPromise = null;

  /* ---------- 小零件：头像 / 国旗（加载失败有后备） ---------- */
  const flagImg = code => {
    const img = el('img');
    img.src = flagUrl(code); img.alt = code; img.loading = 'lazy'; img.decoding = 'async';
    img.addEventListener('error', () => { img.replaceWith(el('span', 'gpin-initial', code)); });
    return img;
  };
  const avatarImg = c => {
    const img = el('img');
    img.src = c.avatar; img.alt = c.name; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    // 加载不出来就把图撤掉，底下那层首字母露出来，不留白方块
    img.addEventListener('error', () => img.remove());
    return img;
  };
  /* 头像/国旗底下垫一层首字母：图还在转圈的时候也不是空的 */
  const faceContent = c => {
    const frag = document.createDocumentFragment();
    frag.appendChild(el('span', 'gpin-initial', c.name.charAt(0).toUpperCase()));
    frag.appendChild(c.pin === 'avatar' ? avatarImg(c) : flagImg(c.country));
    return frag;
  };
  const whereText = c => c.countryName + (c.city ? ' · ' + c.city : '');

  const buildPin = c => {
    const wrap = el('div', 'gpin-wrap');
    const btn = el('button', 'gpin gpin--' + c.pin);
    btn.type = 'button';
    btn.setAttribute('aria-label', c.name + '，' + whereText(c));
    const face = el('span', 'gpin-face');
    face.appendChild(faceContent(c));
    btn.appendChild(face);
    if (c.pin === 'avatar') {
      const badge = el('span', 'gpin-flag');
      badge.appendChild(flagImg(c.country));
      btn.appendChild(badge);
    }
    btn.appendChild(el('span', 'gpin-tail'));
    btn.addEventListener('click', e => { e.stopPropagation(); select(c, true); });
    wrap.appendChild(btn);
    c.el = wrap; c.btn = btn; c.hidden = false;
    return wrap;
  };

  const buildChip = c => {
    const chip = el('button', 'globe-chip');
    chip.type = 'button';
    const face = el('span', 'chip-face');
    face.appendChild(faceContent(c));
    chip.appendChild(face);
    chip.appendChild(el('span', 'chip-name', c.name));
    chip.title = c.name + ' · ' + whereText(c);
    chip.addEventListener('click', () => select(c, true));
    c.chip = chip;
    return chip;
  };

  /* ---------- 信息卡 ---------- */
  const workTitle = id => {
    const t = document.querySelector('.preview-card[data-id="' + CSS.escape(id) + '"] .card-title');
    return t ? t.textContent : '';
  };

  const goToWork = id => {
    const target = document.querySelector('.preview-card[data-id="' + CSS.escape(id) + '"]');
    closeGlobe();
    if (!target) return;
    if (navHome) navHome.click();
    setTimeout(() => { if (!target.classList.contains('hidden')) target.click(); }, 80);
  };

  const renderCard = c => {
    card.replaceChildren();
    const close = el('button', 'gc-close', '×');
    close.type = 'button'; close.setAttribute('aria-label', tr('globe.close', '关闭'));
    close.addEventListener('click', deselect);
    card.appendChild(close);

    const head = el('div', 'gc-head');
    const av = el('span', 'gc-avatar' + (c.pin === 'flag' ? ' is-flag' : ''));
    av.appendChild(faceContent(c));
    head.appendChild(av);
    const who = el('div');
    who.appendChild(el('h3', 'gc-name', c.name));
    if (c.github) {
      const a = el('a', 'gc-github', '@' + c.github + ' ↗');
      a.href = 'https://github.com/' + c.github; a.target = '_blank'; a.rel = 'noopener noreferrer';
      who.appendChild(a);
    }
    head.appendChild(who);
    card.appendChild(head);

    const where = el('p', 'gc-where');
    where.appendChild(flagImg(c.country));
    where.appendChild(el('span', null, whereText(c)));
    card.appendChild(where);

    if (c.note) card.appendChild(el('p', 'gc-note', c.note));

    if (c.works.length) {
      const list = el('div', 'gc-works');
      c.works.forEach(id => {
        const title = workTitle(id);
        const b = el('button', 'gc-work' + (title ? '' : ' is-static'), title ? tr('globe.work', '看作品 · {title}', { title }) : id);
        b.type = 'button';
        if (title) b.addEventListener('click', () => goToWork(id));
        list.appendChild(b);
      });
      card.appendChild(list);
    }
  };

  /* ---------- 选中 / 取消 ---------- */
  function select(c, fly) {
    selected = c;
    contributors.forEach(x => {
      x.btn && x.btn.classList.toggle('is-selected', x === c);
      x.chip && x.chip.classList.toggle('is-selected', x === c);
    });
    renderCard(c);
    card.classList.add('is-open');
    clearTimeout(resumeTimer);
    if (g) {
      g.controls().autoRotate = false;
      if (fly) g.pointOfView({ lat: c.plotLat, lng: c.plotLng, altitude: 1.5 }, 1100);
    }
  }

  function deselect() {
    selected = null;
    contributors.forEach(x => {
      x.btn && x.btn.classList.remove('is-selected');
      x.chip && x.chip.classList.remove('is-selected');
    });
    card.classList.remove('is-open');
    scheduleAutoRotate(1500);
  }

  function scheduleAutoRotate(ms) {
    clearTimeout(resumeTimer);
    if (!g) return;
    resumeTimer = setTimeout(() => { if (isOpen && !selected) g.controls().autoRotate = true; }, ms);
  }

  /* ---------- 背面的旗子藏起来 ---------- */
  function tick() {
    rafId = 0;
    if (!isOpen || !g) return;
    const cam = g.camera().position;
    contributors.forEach(c => {
      const hide = !facing(c.xyz, cam);
      if (hide !== c.hidden) { c.hidden = hide; c.btn.classList.toggle('is-behind', hide); }
    });
    rafId = requestAnimationFrame(tick);
  }
  const startTick = () => { if (!rafId) rafId = requestAnimationFrame(tick); };

  /* 线条图标：和站点其它图标同一套（24 网格 / 2.4 描边 / 圆头） */
  const icon = parts => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.4');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('globe-icon');
    parts.forEach(part => {
      if (part[0] === 'circle') {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', part[1]); c.setAttribute('cy', part[2]); c.setAttribute('r', part[3]);
        svg.appendChild(c);
      } else {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', part[1]);
        svg.appendChild(p);
      }
    });
    return svg;
  };

  const ICON_MOON = [['path', 'M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z']];
  const ICON_SUN = [
    ['circle', '12', '12', '4'],
    ['path', 'M12 2.6v2.2M12 19.2v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6'],
  ];

  /* ---------- 页面骨架 ---------- */
  function buildDom() {
    if (view) return;
    const host = document.getElementById('compass-view');
    if (!host) return;

    view = el('section', 'globe-view');
    view.id = 'globe-view';
    view.setAttribute('aria-label', tr('globe.view.title', '投稿者地球'));
    view.setAttribute('aria-hidden', 'true');

    stage = el('div', 'globe-stage');
    view.appendChild(stage);

    const title = el('div', 'globe-title');
    title.appendChild(el('p', 'globe-kicker', 'CONTRIBUTORS GLOBE'));
    title.appendChild(el('h2', null, tr('globe.view.title', '投稿者地球')));
    statsLine = el('p', 'globe-stats', '');
    title.appendChild(statsLine);
    view.appendChild(title);

    statusBox = el('div', 'globe-status', tr('globe.loading', '正在展开地球…'));
    view.appendChild(statusBox);

    card = el('aside', 'globe-card');
    card.setAttribute('aria-live', 'polite');
    view.appendChild(card);

    const dock = el('div', 'globe-dock');
    roster = el('div', 'globe-roster');
    roster.setAttribute('role', 'list');
    dock.appendChild(roster);

    const tools = el('div', 'globe-tools');
    dayBtn = el('button', 'globe-btn');
    dayBtn.type = 'button';
    dayBtn.setAttribute('aria-pressed', 'false');
    dayBtn.appendChild(icon(ICON_MOON));
    dayBtn.appendChild(el('span', null, tr('globe.night', '看夜晚')));
    dayBtn.addEventListener('click', toggleNight);
    tools.appendChild(dayBtn);
    const cta = el('a', 'globe-btn globe-btn--cta');
    cta.appendChild(el('span', null, tr('globe.cta', '＋ 我要插旗')));
    cta.href = issueUrl(); cta.target = '_blank'; cta.rel = 'noopener noreferrer';
    cta.title = tr('globe.cta.title', '在 GitHub 上提交一个投稿，作者会把你的旗子插上去');
    tools.appendChild(cta);
    dock.appendChild(tools);
    view.appendChild(dock);

    host.appendChild(view);
    host.classList.add('globe-mounted');
  }

  function toggleNight() {
    night = !night;
    dayBtn.replaceChildren(
      icon(night ? ICON_SUN : ICON_MOON),
      el('span', null, night ? tr('globe.day', '看白天') : tr('globe.night', '看夜晚'))
    );
    dayBtn.setAttribute('aria-pressed', String(night));
    if (g) g.globeImageUrl(IMG + (night ? 'earth-night.jpg' : 'earth-blue-marble.jpg'));
  }

  function showStatus(message, isError, retry) {
    statusBox.hidden = false;
    statusBox.classList.toggle('is-error', !!isError);
    statusBox.replaceChildren(document.createTextNode(message));
    if (retry) {
      const b = el('button', null, tr('globe.retry', '重试'));
      b.type = 'button';
      b.addEventListener('click', retry);
      statusBox.appendChild(el('br'));
      statusBox.appendChild(b);
    }
  }

  /* ---------- 数据 ---------- */
  async function loadData() {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('投稿者数据加载失败（' + res.status + '）');
    const json = await res.json();
    const rows = Array.isArray(json) ? json : (json && json.contributors) || [];
    const list = rows.map(normalize).filter(Boolean);
    if (list.length < rows.length) console.warn('[globe] 有 ' + (rows.length - list.length) + ' 条投稿数据格式不对，已跳过（要有 name 和 country；国家不在内置表里时还要写 lat / lng）');
    spreadOverlaps(list);
    return list;
  }

  /* ---------- 初始化地球 ---------- */
  function initGlobe(list) {
    const getXYZ = (lat, lng) => toXYZ(lat, lng, GLOBE_R * 1.01);

    g = window.Globe({ animateIn: true })(stage)
      .width(stage.clientWidth).height(stage.clientHeight)
      .backgroundColor('#04060b')
      .backgroundImageUrl(IMG + 'night-sky.png')
      .globeImageUrl(IMG + 'earth-blue-marble.jpg')
      .bumpImageUrl(IMG + 'earth-topology.png')
      .showAtmosphere(true).atmosphereColor('#8fb8ff').atmosphereAltitude(0.18)
      .htmlElementsData(list)
      .htmlLat(d => d.plotLat).htmlLng(d => d.plotLng).htmlAltitude(0.012)
      .htmlElement(d => d.el);
    if (typeof g.htmlTransitionDuration === 'function') g.htmlTransitionDuration(0);

    list.forEach(c => { c.xyz = getXYZ(c.plotLat, c.plotLng); });

    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.minDistance = 160;
    controls.maxDistance = 600;
    controls.addEventListener('start', () => { clearTimeout(resumeTimer); controls.autoRotate = false; });
    controls.addEventListener('end', () => { if (!selected) scheduleAutoRotate(5000); });

    // 一开场从远处飞近，落在投稿者们大致所在的经度
    const midLng = list.length ? list.reduce((s, c) => s + c.plotLng, 0) / list.length : 105;
    g.pointOfView({ lat: 22, lng: midLng, altitude: 4 }, 0);
    setTimeout(() => g.pointOfView({ lat: 22, lng: midLng, altitude: 2.3 }, 2200), 80);

    new ResizeObserver(() => {
      if (stage.clientWidth && stage.clientHeight) g.width(stage.clientWidth).height(stage.clientHeight);
    }).observe(stage);

    // 有投稿者的国家描一圈金边（拿不到边界数据就算了，不影响主体）
    fetch(COUNTRY_GEOJSON).then(r => r.json()).then(geo => {
      const lit = new Set(list.map(c => c.country));
      const code = f => (f.properties && (f.properties.ISO_A2_EH || f.properties.ISO_A2)) || '';
      const features = (geo.features || []).filter(f => lit.has(code(f)));
      if (typeof g.polygonsData !== 'function') return;
      g.polygonsData(features)
        .polygonCapColor(() => 'rgba(244,189,60,0.28)')
        .polygonSideColor(() => 'rgba(244,189,60,0.12)')
        .polygonStrokeColor(() => '#f4bd3c')
        .polygonAltitude(0.006);
      if (typeof g.polygonsTransitionDuration === 'function') g.polygonsTransitionDuration(0);
    }).catch(() => {});
  }

  function buildRoster(list) {
    roster.replaceChildren();
    list.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
      const chip = buildChip(c);
      chip.setAttribute('role', 'listitem');
      roster.appendChild(chip);
    });
    const countries = new Set(list.map(c => c.country)).size;
    statsLine.textContent = list.length
      ? (list.length === 1 && countries === 1
        ? tr('globe.stats.one', '1 位投稿者 · 点亮 1 个国家/地区')
        : tr('globe.stats', '{count} 位投稿者 · 点亮 {countries} 个国家/地区', { count: list.length, countries }))
      : tr('globe.empty', '还没有投稿者，来插第一面旗吧');
  }

  function ensureReady() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      showStatus(tr('globe.loading', '正在展开地球…'));
      const webgl = hasWebGL();
      const [list] = await Promise.all([loadData(), webgl ? loadScript(GLOBE_LIB) : Promise.resolve()]);
      contributors = list;
      list.forEach(buildPin);
      buildRoster(list);
      if (webgl && window.Globe) {
        initGlobe(list);
      } else {
        view.classList.add('is-list'); // 没有 WebGL：只显示名单
        if (!webgl) showStatus(tr('globe.nowebgl', '这台设备不支持 3D 地球，先看看投稿者名单吧。'));
      }
      if (statusBox && !(view.classList.contains('is-list') && !webgl)) statusBox.hidden = true;
    })().catch(err => {
      readyPromise = null;
      console.error('[globe]', err);
      showStatus(tr('globe.error', '地球没能加载出来：{msg}', { msg: err && err.message ? err.message : tr('globe.network', '网络错误') }), true, () => { if (isOpen) openGlobe(); });
      throw err;
    });
    return readyPromise;
  }

  /* ---------- 打开 / 关闭 ----------
     指南针是首页里的一个视图，开关由主站的 main.js（setCompassView）负责，
     它来调这里的 open() / close()。这里不再自己动导航按钮，免得两边打架。 */
  async function openGlobe() {
    buildDom();
    if (!view) return;
    if (isOpen && readyPromise) return;
    isOpen = true;
    view.setAttribute('aria-hidden', 'false');
    try { await ensureReady(); } catch (_) { return; }
    if (!isOpen) return;
    if (g) { g.resumeAnimation(); g.width(stage.clientWidth).height(stage.clientHeight); }
    startTick();
    refreshText();
  }

  function closeGlobe() {
    if (!isOpen) return;
    isOpen = false;
    if (view) view.setAttribute('aria-hidden', 'true');
    if (selected) deselect();
    clearTimeout(resumeTimer);
    if (g) setTimeout(() => { if (!isOpen) g.pauseAnimation(); }, readDuration() + 60);
  }

  /* 中英切换后把地球里的文案重新刷一遍 */
  function refreshText() {
    if (!view) return;
    // 国名跟着语言走：中文用内置表，英文用系统自带的国家名
    contributors.forEach(c => { c.countryName = countryLabel(c.country); });
    view.setAttribute('aria-label', tr('globe.view.title', '投稿者地球'));
    const h2 = view.querySelector('.globe-title h2');
    if (h2) h2.textContent = tr('globe.view.title', '投稿者地球');
    if (dayBtn) {
      dayBtn.replaceChildren(
        icon(night ? ICON_SUN : ICON_MOON),
        el('span', null, night ? tr('globe.day', '看白天') : tr('globe.night', '看夜晚'))
      );
    }
    const cta = view.querySelector('.globe-btn--cta span');
    if (cta) cta.textContent = tr('globe.cta', '＋ 我要插旗');
    if (contributors.length) buildRoster(contributors);
    if (selected) renderCard(selected);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen && selected) deselect();
  });
  document.addEventListener('site:languagechange', () => { refreshText(); });

  /* 暴露给主站：main.js 的 setCompassView(true / false) 会调这里 */
  window.siteGlobe = {
    open: openGlobe,
    close: closeGlobe,
    refresh: refreshText,
    isOpen: () => isOpen,
  };
})();
