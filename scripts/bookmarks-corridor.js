/* =========================================================
   收藏长廊（收藏页） — v1.3.0
   ---------------------------------------------------------
   一根金色的引导线，穿过一座巨大的宫殿长廊。
   两侧是高耸的墙，收藏的作品挂在每个拐角正对你的那面墙上。
   点一下，线就带着你冲向下一件作品，到墙前急转弯。

   · 画面是一个小型的「射线投射」3D 渲染器（Canvas 2D，无依赖），
     内部分辨率只有屏幕的 1/2 ~ 1/3，放大后正好是像素风，和全站一致。
   · 墙上的画框是程序画出来的像素画；走到作品面前，点画框才会打开
     真正的实时作品（iframe）和详情。
   · 数据直接读 main.js 维护的收藏夹（localStorage + AppState），
     不需要改动 main.js；新作品照旧「复制卡片」就会自动出现在长廊里。
   · 路线由固定种子生成：同一份收藏每次走进来都是同一条长廊，
     多收藏一件，长廊就在尾部多延伸一段。
   ========================================================= */
(() => {
  'use strict';

  const view = document.getElementById('bookmarks-view');
  if (!view) return;

  /* ---------------------------------------------------------
     0. 常量
     --------------------------------------------------------- */
  const HW = 6;               // 长廊半宽（整条走廊宽 12）
  const EAVE_H = 10.8;         // 檐口高度：柱顶与屋面交接
  const RIDGE_H = 14.15;       // 屋脊高度：形成真实双坡屋顶
  const WALL_H = EAVE_H;       // 墙体止于檐口，不穿过屋面
  const EYE = 2.1;            // 视线高度
  const VIEW_D = 13;          // 停下来看作品时，离正对的那面墙的距离
  const CELL = 38;            // 路线网格的格子边长（一段直路至少这么长）
  const FILLET = 3.2;         // 拐角处镜头走的圆角半径
  const FOG_K = 0.0185;       // 雾的浓度
  const PILLAR_GAP = 12;      // 柱子间距
  const LAN_H = 8.55;         // 宫灯悬于檐下梁架之间
  const LAN_R2 = 58;          // 灯笼光照半径²
  const FOG = [22, 15, 12];

  // 画框（贴图以「像素」为单位，世界尺寸 = 像素 × PXU）
  const FRAME_W = 10.4;
  const BODY_W = 144, BODY_H = 97, SHADOW = 8;
  const TEX_W = BODY_W + SHADOW, TEX_H = BODY_H + SHADOW;
  const PXU = FRAME_W / BODY_W;
  const FRAME_BOTTOM = 1.7;

  // 镜头运动
  const VMAX = 88, A_ACC = 170, A_DEC = 140;

  const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------------------------------------------------------
     1. 小工具
     --------------------------------------------------------- */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash2 = (x, y) => {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const hashStr = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mulberry32 = a => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

  /* ---------------------------------------------------------
     2. 文案（中 / 英 / 日；作品标题与简介直接读页面上已翻译的 DOM）
     --------------------------------------------------------- */
  const lang = () => {
    const l = (window.siteI18n && window.siteI18n.lang) || document.documentElement.lang || 'zh';
    const s = String(l).toLowerCase();
    return s.startsWith('en') ? 'en' : s.startsWith('ja') ? 'ja' : 'zh';
  };
  const TEXT = {
    zh: {
      gallery: '收藏长廊', run: '点击任意处，沿着线冲出去', next: '点击画框以外的任意处，继续前进', open: '查看作品', back: '后退',
      emptyTitle: '长廊还是空的', emptySub: '在作品详情页点右上角的书签，收藏的作品会挂上这面墙。',
      allTitle: n => '共 ' + n + ' 件收藏', ghost: '空位', ghostSub: '这里留给你下一件收藏。',
      endTitle: '长廊的尽头', endSub: '点击回到起点', github: '查看 GitHub 项目', close: '关闭', aria: '收藏长廊：点击前进，点作品画框打开'
    },
    en: {
      gallery: 'THE HALL', run: 'Tap anywhere to run down the line', next: 'Tap anywhere else to keep running', open: 'Open work', back: 'Back',
      emptyTitle: 'The hall is empty', emptySub: 'Bookmark a work from its detail page and it will hang on these walls.',
      allTitle: n => n + (n === 1 ? ' work' : ' works') + ' collected', ghost: 'Empty niche', ghostSub: 'Saved for your next find.',
      endTitle: 'End of the hall', endSub: 'Tap to return to the start', github: 'View GitHub project', close: 'Close', aria: 'Bookmark hall: tap to run, tap a frame to open the work'
    },
    ja: {
      gallery: '回廊', run: 'どこでもタップして、線に沿って駆け抜ける', next: '額縁以外をタップで先へ進む', open: '作品を見る', back: '戻る',
      emptyTitle: '回廊はまだ空です', emptySub: '作品の詳細でブックマークすると、ここの壁に飾られます。',
      allTitle: n => n + '件のブックマーク', ghost: '空きスペース', ghostSub: '次のお気に入りのために空けてあります。',
      endTitle: '回廊の終点', endSub: 'タップで最初へ戻る', github: 'GitHub プロジェクトを見る', close: '閉じる', aria: 'ブックマーク回廊：タップで前進、額縁をタップで作品を開く'
    }
  };
  const tx = key => (TEXT[lang()] && TEXT[lang()][key]) || TEXT.zh[key];

  /* ---------------------------------------------------------
     3. 读数据：作品清单 + 收藏夹（顺序：按文件夹，再是没进文件夹的）
     --------------------------------------------------------- */
  const readWorks = () => [...document.querySelectorAll('.preview-card[data-id]')].map(card => {
    const panel = card.dataset.detail ? document.getElementById(card.dataset.detail) : null;
    const iframe = card.querySelector('iframe');
    return {
      id: card.dataset.id,
      title: (card.querySelector('.card-title') || {}).textContent || card.dataset.id,
      en: card.dataset.en || '',
      desc: ((panel && panel.querySelector('.detail-description')) || {}).textContent || '',
      github: (panel && panel.querySelector('.project-link') && panel.querySelector('.project-link').href) || '',
      src: (iframe && iframe.getAttribute('src')) || '',
      ratio: parseFloat(getComputedStyle(card.querySelector('.preview-mount') || card).getPropertyValue('--mount-ratio')) || 1.6439
    };
  });
  const readFolders = () => {
    try { if (typeof AppState !== 'undefined' && Array.isArray(AppState.bookmarkFolders)) return AppState.bookmarkFolders; } catch (_) {}
    try { const v = JSON.parse(localStorage.getItem('ui-archive-bookmark-folders') || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
  };
  const readLoose = () => {
    try { if (typeof AppState !== 'undefined' && Array.isArray(AppState.bookmarks)) return AppState.bookmarks; } catch (_) {}
    try { const v = JSON.parse(localStorage.getItem('ui-archive-bookmarks') || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
  };
  const collectItems = () => {
    const all = readWorks();
    const byId = new Map(all.map(w => [w.id, w]));
    const seen = new Set();
    const order = [];
    const folderOf = new Map();
    readFolders().forEach(f => (Array.isArray(f.works) ? f.works : []).forEach(id => {
      if (byId.has(id) && !seen.has(id)) { seen.add(id); order.push(id); folderOf.set(id, f.name || ''); }
    }));
    readLoose().forEach(id => { if (byId.has(id) && !seen.has(id)) { seen.add(id); order.push(id); } });
    return order.map(id => Object.assign({}, byId.get(id), { folder: folderOf.get(id) || '' }));
  };

  /* ---------------------------------------------------------
     4. 路线：网格上的自回避折线，每段路的尽头是一个拐角（挂一件作品）
     --------------------------------------------------------- */
  function planPath(legCount) {
    const rnd = mulberry32(0x51f15e);
    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const key = (x, y) => x + ',' + y;
    const used = new Set([key(0, 0)]);
    const pts = [[0, 0]];
    const dirs = [];
    let budget = 60000;
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    const dfs = (leg, x, y, d) => {
      if (leg > legCount) return true;
      if (--budget < 0) return false;
      const turns = d === null ? [0] : shuffle([1, 3]);
      for (const tn of turns) {
        const nd = d === null ? 1 : (d + tn) % 4;
        const lens = leg === 1 ? shuffle([2, 3]) : shuffle([1, 2, 3]);
        for (const k of lens) {
          const cells = [];
          let ok = true;
          for (let i = 1; i <= k; i++) {
            const cx = x + DIRS[nd][0] * i, cy = y + DIRS[nd][1] * i;
            if (used.has(key(cx, cy))) { ok = false; break; }
            cells.push([cx, cy]);
          }
          if (!ok) continue;
          cells.forEach(c => used.add(key(c[0], c[1])));
          pts.push(cells[k - 1]); dirs.push(nd);
          if (dfs(leg + 1, cells[k - 1][0], cells[k - 1][1], nd)) return true;
          cells.forEach(c => used.delete(key(c[0], c[1])));
          pts.pop(); dirs.pop();
        }
      }
      return false;
    };
    if (dfs(1, 0, 0, null)) return { pts, dirs };
    // 兜底：阶梯形，永远不会自交
    const p2 = [[0, 0]], d2 = [];
    for (let i = 1; i <= legCount; i++) {
      const nd = i % 2 === 1 ? 1 : 0;
      const last = p2[p2.length - 1];
      p2.push([last[0] + DIRS[nd][0], last[1] + DIRS[nd][1]]);
      d2.push(nd);
    }
    return { pts: p2, dirs: d2 };
  }

  /* ---------------------------------------------------------
     5. 画框贴图：像素画（已知作品手绘，其余按 id 生成）
     --------------------------------------------------------- */
  const disc = (g, cx, cy, r, color) => {
    g.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
      g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  };
  const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  function paintDaylight(g, x, y, w, h) {
    const sky = ['#23285c', '#3a3f86', '#6a5aa6', '#b96c92', '#ee9c7c', '#ffcf8a', '#ffe8b4'];
    const hor = Math.round(h * 0.62);
    const bh = Math.ceil(hor / sky.length);
    sky.forEach((c, i) => { g.fillStyle = c; g.fillRect(x, y + i * bh, w, Math.min(bh, hor - i * bh)); });
    g.fillStyle = 'rgba(255,255,255,.07)';
    for (let i = 1; i < sky.length; i++) for (let px = (i % 2); px < w; px += 2) g.fillRect(x + px, y + i * bh, 1, 1);
    const rnd = mulberry32(11);
    for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.35 + rnd() * 0.5).toFixed(2) + ')'; g.fillRect(x + Math.floor(rnd() * w), y + Math.floor(rnd() * hor * 0.45), 1, 1); }
    disc(g, x + Math.round(w * 0.26), y + hor - 2, 9, '#fff1bd');
    disc(g, x + Math.round(w * 0.26), y + hor - 2, 6, '#ffffe0');
    const sea = ['#33709f', '#2a5f8d', '#214e78', '#183f62'];
    const sh = Math.ceil((h - hor) / sea.length);
    sea.forEach((c, i) => { g.fillStyle = c; g.fillRect(x, y + hor + i * sh, w, sh); });
    g.fillStyle = '#ffe9b0';
    for (let i = 0; i < 7; i++) g.fillRect(x + Math.round(w * 0.26) - 8 + i * 2 + (i % 2) * 2, y + hor + 2 + i * 3, 6 - (i % 3), 1);
    g.fillStyle = '#2a2c45'; g.fillRect(x + Math.round(w * 0.66), y + hor - 4, 30, h - hor + 4);
    g.fillStyle = '#3a3d5c'; g.fillRect(x + Math.round(w * 0.66) + 2, y + hor - 6, 22, 3);
    const tx0 = x + Math.round(w * 0.66) + 11;
    for (let i = 0; i < 22; i++) {
      const tw = Math.round(7 - i * 0.12);
      g.fillStyle = (Math.floor(i / 4) % 2 === 0) ? '#f4f0e8' : '#e0483f';
      g.fillRect(tx0 - Math.floor(tw / 2), y + hor - 8 - i, tw, 1);
    }
    g.fillStyle = '#ffd34a'; g.fillRect(tx0 - 3, y + hor - 33, 6, 4);
    g.fillStyle = '#2a2c45'; g.fillRect(tx0 - 4, y + hor - 35, 8, 2);
    g.fillStyle = 'rgba(255,226,140,.35)';
    for (let i = 0; i < 26; i++) g.fillRect(tx0 - 3 - i * 2, y + hor - 32 - Math.floor(i * 0.18), 2, 2 + Math.floor(i * 0.34));
  }

  function paintOrbit(g, x, y, w, h) {
    g.fillStyle = '#090d2b'; g.fillRect(x, y, w, h);
    g.fillStyle = '#10174a'; g.fillRect(x, y + Math.round(h * 0.45), w, h);
    g.fillStyle = '#161f5c'; g.fillRect(x, y + Math.round(h * 0.78), w, h);
    const rnd = mulberry32(23);
    for (let i = 0; i < 46; i++) {
      const sx = x + Math.floor(rnd() * w), sy = y + Math.floor(rnd() * h);
      g.fillStyle = 'rgba(255,255,255,' + (0.3 + rnd() * 0.6).toFixed(2) + ')'; g.fillRect(sx, sy, 1, 1);
      if (rnd() > 0.9) { g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3); }
    }
    const cx = x + Math.round(w * 0.46), cy = y + Math.round(h * 0.52), R = 22;
    const bands = ['#f6d27a', '#eab45c', '#d98a3d', '#c4703a', '#e0a050', '#f0c46c'].map(hexToRgb);
    const ringA = (back) => {
      g.fillStyle = back ? '#a9822f' : '#ffd36a';
      for (let a = 0; a < 6.2832; a += 0.012) {
        const rx = Math.cos(a) * 40, ry = Math.sin(a) * 11;
        const isBack = Math.sin(a) < 0;
        if (isBack !== back) continue;
        const px = cx + Math.round(rx), py = cy + Math.round(ry * 0.9 - rx * 0.12);
        if (back && (px - cx) * (px - cx) + (py - cy) * (py - cy) < R * R) continue;
        g.fillRect(px, py, 1, 1);
      }
    };
    ringA(true);
    for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) {
      if (xx * xx + yy * yy > R * R) continue;
      const band = bands[clamp(Math.floor(((yy + R) / (2 * R)) * bands.length + Math.sin(xx * 0.2) * 0.25), 0, bands.length - 1)];
      const lit = clamp(0.55 + 0.6 * (-(xx * 0.55 + yy * 0.45) / R + 0.45), 0.35, 1.15);
      g.fillStyle = 'rgb(' + Math.round(band[0] * lit) + ',' + Math.round(band[1] * lit) + ',' + Math.round(band[2] * lit) + ')';
      g.fillRect(cx + xx, cy + yy, 1, 1);
    }
    ringA(false);
    disc(g, x + Math.round(w * 0.84), y + Math.round(h * 0.2), 4, '#dfe9ff');
    disc(g, x + Math.round(w * 0.84) + 1, y + Math.round(h * 0.2) + 1, 3, '#aab8e6');
  }

  function paintGeneric(g, x, y, w, h, id) {
    const hs = hashStr(id);
    const h1 = hs % 360, h2 = (hs >>> 8) % 360;
    const rows = 9, rh = Math.ceil(h * 0.64 / rows);
    for (let i = 0; i < rows; i++) {
      g.fillStyle = 'hsl(' + Math.round(lerp(h1, h2, i / rows)) + ',55%,' + Math.round(lerp(20, 66, i / rows)) + '%)';
      g.fillRect(x, y + i * rh, w, rh);
    }
    disc(g, x + Math.round(w * (0.3 + (hs % 40) / 100)), y + Math.round(h * 0.36), 8, 'hsl(' + h2 + ',90%,80%)');
    const ph = (hs % 628) / 100;
    [[0.62, 0.09, 22, '#1d2540'], [0.74, 0.07, 14, '#141a2e']].forEach(([base, amp, fr, col], k) => {
      g.fillStyle = col;
      for (let i = 0; i < w; i++) {
        const yy = Math.round(h * base + Math.sin(i / fr * 3 + ph + k * 2) * h * amp * 0.5 + Math.sin(i * 0.31 + k) * 1.5);
        g.fillRect(x + i, y + yy, 1, h - yy);
      }
    });
  }

  function makeFrameTex(slot) {
    const c = document.createElement('canvas');
    c.width = TEX_W; c.height = TEX_H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(SHADOW, SHADOW, BODY_W, BODY_H);
    const ghost = !!slot.ghost;
    g.fillStyle = '#080808'; g.fillRect(0, 0, BODY_W, BODY_H);
    g.fillStyle = ghost ? '#4b4234' : '#f4bd3c'; g.fillRect(3, 3, BODY_W - 6, BODY_H - 6);
    g.fillStyle = ghost ? '#6b5d47' : '#ffd96a'; g.fillRect(3, 3, BODY_W - 6, 2); g.fillRect(3, 3, 2, BODY_H - 6);
    g.fillStyle = ghost ? '#2f2a22' : '#b58f00'; g.fillRect(3, BODY_H - 5, BODY_W - 6, 2); g.fillRect(BODY_W - 5, 3, 2, BODY_H - 6);
    g.fillStyle = '#080808'; g.fillRect(7, 7, BODY_W - 14, BODY_H - 14);
    g.fillStyle = ghost ? '#1b1923' : '#f5ecd9'; g.fillRect(8, 8, BODY_W - 16, BODY_H - 16);
    g.fillStyle = '#080808'; g.fillRect(11, 11, BODY_W - 22, BODY_H - 22);
    const px = 12, py = 12, pw = BODY_W - 24, ph = BODY_H - 24;
    if (ghost) {
      g.fillStyle = '#0d0c13'; g.fillRect(px, py, pw, ph);
      g.fillStyle = '#6b5d47';
      for (let i = 0; i < pw; i += 6) { g.fillRect(px + i, py + 3, 3, 1); g.fillRect(px + i, py + ph - 4, 3, 1); }
      for (let i = 0; i < ph; i += 6) { g.fillRect(px + 3, py + i, 1, 3); g.fillRect(px + pw - 4, py + i, 1, 3); }
      g.fillStyle = '#8b7d67';
      g.fillRect(px + pw / 2 - 1, py + ph / 2 - 8, 3, 17); g.fillRect(px + pw / 2 - 8, py + ph / 2 - 1, 17, 3);
    } else {
      g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
      const id = slot.work.id;
      if (id === 'pixel-daylight-switch') paintDaylight(g, px, py, pw, ph);
      else if (id === 'pixel-orbit') paintOrbit(g, px, py, pw, ph);
      else paintGeneric(g, px, py, pw, ph, id);
      g.restore();
    }
    const data = g.getImageData(0, 0, TEX_W, TEX_H);
    return { w: TEX_W, h: TEX_H, px: new Uint32Array(data.data.buffer) };
  }

  /* ---------------------------------------------------------
     6. 建造世界：墙、柱子、横梁、灯笼、画框、镜头路径、引导线
     --------------------------------------------------------- */
  function buildWorld(items) {
    const slots = items.length ? items.map(w => ({ work: w })) : [{ ghost: true }, { ghost: true }];
    const M = slots.length + 1;                          // 路段数；最后一段通向尽头的光之门
    const plan = planPath(M);
    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const Q = plan.pts.map(p => [p[0] * CELL, p[1] * CELL]);
    const D1 = i => DIRS[plan.dirs[i - 1]];              // 第 i 段路的方向（1 起）
    const nL = d => [-d[1], d[0]], nR = d => [d[1], -d[0]];
    const mv = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k];
    const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

    const segs = [];
    const typeIds = { wall: 0, pillarF: 1, pillarS: 2, gate: 3, lintel: 4 };
    const addSeg = (a, b, type, leg, extra) => {
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const s = { ax: a[0], ay: a[1], bx: b[0], by: b[1], ex, ey, len: Math.hypot(ex, ey), type, tid: typeIds[type], leg, decal: null, flip: false, sliver: false, h0: 0, h1: WALL_H };
      if (extra) Object.assign(s, extra);
      segs.push(s);
      return s;
    };

    // 两侧墙的边界（拐角处用斜接，90° 转弯时就是内角 / 外角）
    const L = [], R = [];
    {
      const d = D1(1);
      L[0] = mv(mv(Q[0], nL(d), HW), d, -HW);
      R[0] = mv(mv(Q[0], nR(d), HW), d, -HW);
    }
    for (let i = 1; i < M; i++) {
      const a = D1(i), b = D1(i + 1);
      L[i] = mv(mv(Q[i], nL(a), HW), nL(b), HW);
      R[i] = mv(mv(Q[i], nR(a), HW), nR(b), HW);
    }
    {
      const d = D1(M);
      L[M] = mv(mv(Q[M], nL(d), HW), d, HW);
      R[M] = mv(mv(Q[M], nR(d), HW), d, HW);
    }
    const leftSegs = [], rightSegs = [];
    for (let j = 0; j < M; j++) {
      leftSegs.push(addSeg(L[j], L[j + 1], 'wall', j + 1));
      rightSegs.push(addSeg(R[j], R[j + 1], 'wall', j + 1));
    }
    addSeg(R[0], L[0], 'wall', 1);
    const gate = addSeg(L[M], R[M], 'gate', M);

    // 柱子 / 灯笼 / 横梁
    const lanterns = [];
    for (let i = 1; i <= M; i++) {
      const A = i === 1 ? Q[0] : Q[i - 1];
      const d = D1(i);
      const Ll = Math.hypot(Q[i][0] - A[0], Q[i][1] - A[1]);
      const tmin = i === 1 ? 9 : HW + 5;
      const tmax = Ll - (i === M ? 14 : HW + 5);
      let n = 0;
      for (let t = tmin; t <= tmax + 1e-6; t += PILLAR_GAP, n++) {
        [1, -1].forEach(side => {
          const nrm = side > 0 ? nL(d) : nR(d);
          const P = (tt, off) => [A[0] + d[0] * tt + nrm[0] * off, A[1] + d[1] * tt + nrm[1] * off];
          const depth = 1.15;
          addSeg(P(t - 0.85, HW - depth), P(t + 0.85, HW - depth), 'pillarF', i);
          addSeg(P(t - 0.85, HW), P(t - 0.85, HW - depth), 'pillarS', i);
          addSeg(P(t + 0.85, HW - depth), P(t + 0.85, HW), 'pillarS', i);
          const lp = P(t, HW - depth - 0.6);
          lanterns.push({ x: lp[0], y: lp[1], h: LAN_H, leg: i });
        });
        if (n % 2 === 1) {
          const c = [A[0] + d[0] * t, A[1] + d[1] * t];
          [[10.25, 10.82], [11.28, 11.88]].forEach(([h0, h1]) => {
            addSeg(mv(c, nL(d), HW), mv(c, nR(d), HW), 'lintel', i, { sliver: true, h0, h1 });
          });
        }
      }
    }

    // 画框（挂在每个拐角正对你的外侧墙上）
    const frames = slots.map((slot, k) => {
      const i = k + 1;
      const a = D1(i), b = D1(i + 1);
      const leftTurn = cross(a, b) > 0;
      const seg = leftTurn ? rightSegs[i] : leftSegs[i];
      const right = [a[1], -a[0]];
      seg.flip = (b[0] * right[0] + b[1] * right[1]) < 0;
      const c = seg.flip ? seg.len - HW : HW;
      const h1 = FRAME_BOTTOM + BODY_H * PXU;
      const dec = { sv0: c - FRAME_W / 2, sv1: c - FRAME_W / 2 + TEX_W * PXU, h0: h1 - TEX_H * PXU, h1, c, tex: makeFrameTex(slot) };
      dec.invW = TEX_W / (dec.sv1 - dec.sv0);
      dec.invH = TEX_H / (dec.h1 - dec.h0);
      const fr = { slot, seg, dec, index: i, lit: 0.22, sv0: c - FRAME_W / 2, sv1: c + FRAME_W / 2, h0: FRAME_BOTTOM, h1 };
      dec.frame = fr;
      seg.decal = dec;
      return fr;
    });

    // 镜头路径：直线 + 圆角
    const prims = [];
    let S = 0;
    const pushLine = (a, b, leg) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1e-6) return;
      prims.push({ kind: 0, ax: a[0], ay: a[1], dx: (b[0] - a[0]) / len, dy: (b[1] - a[1]) / len, len, s0: S, leg });
      S += len;
    };
    const lineEnds = [];
    for (let i = 1; i <= M; i++) {
      const d = D1(i);
      const A = i === 1 ? Q[0] : mv(Q[i - 1], d, FILLET);
      const B = i === M ? Q[M] : mv(Q[i], d, -FILLET);
      pushLine(A, B, i);
      lineEnds.push(S);
      if (i < M) {
        const dn = D1(i + 1);
        const C = [Q[i][0] + (dn[0] - d[0]) * FILLET, Q[i][1] + (dn[1] - d[1]) * FILLET];
        const a0 = Math.atan2(B[1] - C[1], B[0] - C[0]);
        const sweep = cross(d, dn) > 0 ? Math.PI / 2 : -Math.PI / 2;
        const len = FILLET * Math.PI / 2;
        prims.push({ kind: 1, cx: C[0], cy: C[1], r: FILLET, a0, sweep, len, s0: S, leg: i });
        S += len;
      }
    }
    const stopS = [0];
    for (let i = 1; i < M; i++) stopS.push(lineEnds[i - 1] - (VIEW_D - HW - FILLET));
    stopS.push(S - (VIEW_D - HW));

    // 引导线（比镜头路径两头各多出一截，起点从入口墙、终点到光之门）
    const guide = prims.map(p => Object.assign({}, p));
    guide.forEach(p => { p.gs0 = p.s0 + HW; });
    {
      const f0 = guide[0];
      f0.ax -= f0.dx * HW; f0.ay -= f0.dy * HW; f0.len += HW; f0.gs0 = 0;
      const fl = guide[guide.length - 1];
      fl.len += HW;
    }
    guide.forEach(p => {
      if (p.kind === 1) {
        p.sx = Math.cos(p.a0); p.sy = Math.sin(p.a0);
        p.ex = Math.cos(p.a0 + p.sweep); p.ey = Math.sin(p.a0 + p.sweep);
        p.sw = p.sweep;
      }
    });
    guide.forEach(p => {
      const m = 3.6;
      if (p.kind === 0) {
        const bx = p.ax + p.dx * p.len, by = p.ay + p.dy * p.len;
        p.minx = Math.min(p.ax, bx) - m; p.maxx = Math.max(p.ax, bx) + m; p.miny = Math.min(p.ay, by) - m; p.maxy = Math.max(p.ay, by) + m;
      } else { p.minx = p.cx - p.r - m; p.maxx = p.cx + p.r + m; p.miny = p.cy - p.r - m; p.maxy = p.cy + p.r + m; }
    });
    const guideByLeg = [];
    for (let i = 0; i <= M + 1; i++) guideByLeg.push([]);
    guide.forEach(p => { guideByLeg[p.leg].push(p); });
    const arcs = prims.filter(p => p.kind === 1).map(p => [p.s0, p.s0 + p.len]);

    return { M, slots, segs, lanterns, frames, prims, guide, guideByLeg, arcs, S, stopS, gate, Q, dirs: plan.dirs };
  }

  /* ---------------------------------------------------------
     7. 画布 / 镜头 / 状态
     --------------------------------------------------------- */
  const canvas = el('canvas', 'bc-canvas');
  canvas.setAttribute('role', 'img');
  const ctx = canvas.getContext('2d', { alpha: false });
  const vignette = el('div', 'bc-vignette');
  const fade = el('div', 'bc-fade');
  const hud = el('div', 'bc-hud', `
    <div class="bc-chip" data-bc="chip"></div>
    <div class="bc-dock" data-bc="dock">
      <p class="bc-hint" data-bc="hint"></p>
      <div class="bc-placard" data-bc="placard">
        <div class="bc-p-text">
          <p class="bc-kicker" data-bc="kicker"></p>
          <h2 class="bc-title" data-bc="title"></h2>
          <p class="bc-sub" data-bc="sub"></p>
        </div>
        <button type="button" class="bc-open" data-bc="open"></button>
      </div>
    </div>
    <button type="button" class="bc-back" data-bc="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5.5 12.5 12 19l6.5-6.5"/></svg></button>
  `);
  const viewer = el('div', 'bc-viewer', `
    <div class="bc-v-card" role="dialog" aria-modal="true">
      <button type="button" class="bc-v-close" data-bc="vclose"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <div class="bc-v-stage" data-bc="vstage"></div>
      <div class="bc-v-info">
        <h2 data-bc="vtitle"></h2>
        <p class="bc-v-en" data-bc="ven"></p>
        <p class="bc-v-desc" data-bc="vdesc"></p>
        <a class="bc-v-link" data-bc="vlink" target="_blank" rel="noopener noreferrer"><span data-bc="vlinktext"></span><i>↗</i></a>
      </div>
    </div>
  `);
  viewer.hidden = true;
  const q = (root, name) => root.querySelector('[data-bc="' + name + '"]');
  const ui = {
    chip: q(hud, 'chip'), dock: q(hud, 'dock'), placard: q(hud, 'placard'), kicker: q(hud, 'kicker'), title: q(hud, 'title'), sub: q(hud, 'sub'),
    open: q(hud, 'open'), hint: q(hud, 'hint'), back: q(hud, 'back'),
    vclose: q(viewer, 'vclose'), vstage: q(viewer, 'vstage'), vtitle: q(viewer, 'vtitle'), ven: q(viewer, 'ven'),
    vdesc: q(viewer, 'vdesc'), vlink: q(viewer, 'vlink'), vlinktext: q(viewer, 'vlinktext')
  };
  view.append(canvas, vignette, hud, fade, viewer);

  let world = null;
  let signature = '';
  let running = false;
  let raf = 0;
  let lastT = 0;
  let iw = 0, ih = 0, P = 3, cssW = 1, cssH = 1;
  let img = null, buf = null, zbuf = null, rowZ = null, rowFog = null;
  let lastF = 1, lastCy = 0, lastPx0 = 0, shiftPx = 0;
  const navEl = document.getElementById('mario-nav');
  let idleSkip = 0;
  let pBias = 0, renderEma = 0, slowCount = 0;
  let phase = 0;
  let visCache = { leg: -99, segs: [], lan: [], guide: [] };

  const cam = { s: 0, v: 0, x: 0, y: 0, yaw: 0, leg: 1, bob: 0, roll: 0, yawRate: 0, speedN: 0, dist: 0 };
  const nav = { stop: 0, target: 0 };
  let viewerOpen = false;
  let hudKey = '';

  function measureSafe() {
    let left = 0, bottom = 0;
    if (navEl) {
      const r = navEl.getBoundingClientRect(), vr = view.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        if (r.left - vr.left < 160 && r.height > r.width * 1.2) left = r.right - vr.left + 14;
        else if (r.top - vr.top > vr.height * 0.6) bottom = vr.bottom - r.top + 12;
      }
    }
    if (left) view.style.setProperty('--bc-left', Math.round(left) + 'px'); else view.style.removeProperty('--bc-left');
    if (bottom) view.style.setProperty('--bc-bottom', Math.round(bottom) + 'px'); else view.style.removeProperty('--bc-bottom');
    shiftPx = left ? Math.min(left * 0.5, cssW * 0.2) / P : 0;
  }

  function resize() {
    const r = view.getBoundingClientRect();
    cssW = Math.max(1, Math.round(r.width));
    cssH = Math.max(1, Math.round(r.height));
    // 提升内部渲染分辨率：减少放大后的粗颗粒，同时按屏幕面积控制成本。
    let p = Math.min(cssW, cssH) >= 700 ? 2 : 1;
    p = Math.max(p, Math.ceil(Math.sqrt(cssW * cssH / 360000))) + pBias;
    P = p;
    iw = Math.max(96, Math.round(cssW / P));
    ih = Math.max(96, Math.round(cssH / P));
    canvas.width = iw; canvas.height = ih;
    ctx.imageSmoothingEnabled = false;
    img = ctx.createImageData(iw, ih);
    buf = new Uint32Array(img.data.buffer);
    zbuf = new Float32Array(iw);
    rowZ = new Float32Array(ih);
    rowFog = new Float32Array(ih);
    measureSafe();
  }

  /* ---------- 路径查询 ---------- */
  function pathAt(s) {
    const prims = world.prims;
    s = clamp(s, 0, world.S);
    let i = 0;
    while (i < prims.length - 1 && prims[i + 1].s0 <= s) i++;
    const p = prims[i], t = s - p.s0;
    if (p.kind === 0) return { x: p.ax + p.dx * t, y: p.ay + p.dy * t, ang: Math.atan2(p.dy, p.dx), leg: p.leg };
    const th = p.a0 + p.sweep * (t / p.len);
    return { x: p.cx + p.r * Math.cos(th), y: p.cy + p.r * Math.sin(th), ang: th + (p.sweep > 0 ? Math.PI / 2 : -Math.PI / 2), leg: t > p.len * 0.5 ? p.leg + 1 : p.leg };
  }
  const arcProximity = s => {
    let best = 1e9;
    for (const a of world.arcs) { const d = s < a[0] ? a[0] - s : s > a[1] ? s - a[1] : 0; if (d < best) best = d; }
    return best;
  };

  function placeCamera(s, yaw) {
    const p = pathAt(s);
    cam.s = s; cam.v = 0; cam.x = p.x; cam.y = p.y; cam.leg = p.leg;
    cam.yaw = yaw != null ? yaw : p.ang;
    cam.yawRate = 0; cam.roll = 0; cam.speedN = 0;
  }

  function setWorld(items) {
    world = buildWorld(items);
    visCache = { leg: -99, segs: [], lan: [], guide: [] };
    nav.stop = 0; nav.target = 0;
    placeCamera(0);
    hudKey = '';
  }

  function visible(leg) {
    if (visCache.leg === leg) return visCache;
    const lo = leg - 1, hi = leg + 2;
    visCache = {
      leg,
      segs: world.segs.filter(s => s.leg >= lo && s.leg <= hi),
      lan: world.lanterns.filter(l => l.leg >= lo && l.leg <= hi),
      guide: [].concat(...[lo, leg, leg + 1, hi].filter((v, i, a) => a.indexOf(v) === i && v >= 1 && v <= world.M).map(l => world.guideByLeg[l]))
    };
    return visCache;
  }

  /* ---------------------------------------------------------
     8. 更新：运动控制（速度曲线可被打断，连点就是一路冲）
     --------------------------------------------------------- */
  function updateMotion(dt, now) {
    const target = world.stopS[nav.target];
    const dist = target - cam.s;
    const sign = dist >= 0 ? 1 : -1;
    const ad = Math.abs(dist);
    const local = VMAX * (0.6 + 0.4 * smooth(0, 14, arcProximity(cam.s)));
    const vd = sign * Math.min(local, Math.sqrt(2 * A_DEC * ad));
    const step = (Math.abs(vd) >= Math.abs(cam.v) ? A_ACC : A_DEC * 1.5) * dt;
    cam.v += clamp(vd - cam.v, -step, step);
    cam.s += cam.v * dt;
    if ((target - cam.s) * sign < 0) { cam.s = target; cam.v = 0; }
    if (Math.abs(target - cam.s) < 0.03 && Math.abs(cam.v) < 1.2) { cam.s = target; cam.v = 0; }
    cam.s = clamp(cam.s, 0, world.S);
    const arrived = cam.v === 0 && cam.s === target;
    if (arrived && nav.stop !== nav.target) nav.stop = nav.target;

    const p = pathAt(cam.s);
    const look = Math.abs(cam.v) > 4 ? pathAt(cam.s + Math.sign(cam.v) * 3.5).ang : p.ang;
    const want = cam.v < -4 ? p.ang : look;
    const prevYaw = cam.yaw;
    cam.yaw += angDiff(want, cam.yaw) * (1 - Math.exp(-dt * 8));
    if (arrived) cam.yaw += angDiff(p.ang, cam.yaw) * (1 - Math.exp(-dt * 6));
    const yr = angDiff(cam.yaw, prevYaw) / Math.max(dt, 1e-3);
    cam.yawRate += (yr - cam.yawRate) * (1 - Math.exp(-dt * 10));
    cam.x = p.x; cam.y = p.y; cam.leg = p.leg;
    cam.speedN = Math.abs(cam.v) / VMAX;
    cam.dist += Math.abs(cam.v) * dt;
    cam.bob = REDUCED ? 0 : Math.sin(cam.dist * 0.85) * cam.speedN * 1.6 + Math.sin(now * 55) * cam.speedN * arcShake(cam.s) * 1.4;
    const rollWant = REDUCED ? 0 : clamp(cam.yawRate * 0.95, -5, 5);
    cam.roll += (rollWant - cam.roll) * (1 - Math.exp(-dt * 12));
    phase += dt * (8 + 70 * cam.speedN);

    // 画框的聚光灯：靠近就亮起来
    const f = world.frames;
    for (let i = 0; i < f.length; i++) {
      const seg = f[i].seg;
      const mx = seg.ax + seg.ex * 0.5, my = seg.ay + seg.ey * 0.5;
      const d = Math.hypot(mx - cam.x, my - cam.y);
      const want = clamp(1 - (d - 16) / 60, 0.22, 1);
      f[i].lit += (want - f[i].lit) * (1 - Math.exp(-dt * 5));
    }
  }
  const arcShake = s => 1 - smooth(0, 6, arcProximity(s));

  /* ---------------------------------------------------------
     9. 渲染：射线投射（墙 / 柱 / 横梁 / 光之门）+ 地面投射（瓷砖 / 引导线）
     --------------------------------------------------------- */
  const slSeg = [], slU = [], slV = [];
  let gD = 0, gS = 0;
  function guideAt(wx, wy, list) {
    let best = 1e9, bs = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (wx < p.minx || wx > p.maxx || wy < p.miny || wy > p.maxy) continue;
      if (p.kind === 0) {
        const qx = wx - p.ax, qy = wy - p.ay;
        let t = qx * p.dx + qy * p.dy;
        if (t < 0) t = 0; else if (t > p.len) t = p.len;
        const ox = qx - p.dx * t, oy = qy - p.dy * t;
        const d2 = ox * ox + oy * oy;
        if (d2 < best) { best = d2; bs = p.gs0 + t; }
      } else {
        const vx = wx - p.cx, vy = wy - p.cy;
        const c0 = p.sx * vy - p.sy * vx, c1 = vx * p.ey - vy * p.ex;
        if (p.sw > 0 ? (c0 >= 0 && c1 >= 0) : (c0 <= 0 && c1 <= 0)) {
          const dd = Math.sqrt(vx * vx + vy * vy) - p.r;
          const d2 = dd * dd;
          if (d2 < best) { best = d2; bs = p.gs0 + clamp(angDiff(Math.atan2(vy, vx), p.a0) / p.sw, 0, 1) * p.len; }
        }
      }
    }
    gD = Math.sqrt(best); gS = bs;
  }

  function lanternLight(hx, hy, lan) {
    let I = 0;
    for (let i = 0; i < lan.length; i++) { const dx = hx - lan[i].x, dy = hy - lan[i].y; I += 1 / (1 + (dx * dx + dy * dy) / LAN_R2); }
    return I > 1.5 ? 1.5 : I;
  }

  const JIT = new Float32Array(256), TONE = new Float32Array(64);
  for (let i = 0; i < 256; i++) JIT[i] = 0.88 + 0.24 * hash2(i & 15, i >> 4);
  for (let i = 0; i < 64; i++) TONE[i] = 0.88 + 0.22 * hash2(i & 7, i >> 3);
  const SKY_TOP = [5, 7, 12], SKY_HOR = [46, 28, 18];
  let skyR = null, skyG = null, skyB = null;
  const pack = (r, g, b) => (0xFF000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r)) >>> 0;

  function render(now) {
    const vis = visible(cam.leg);
    const segs = vis.segs, lan = vis.lan, gl = vis.guide;
    const aspect = cssW / cssH;
    const baseH = (aspect >= 1.5 ? 86 : aspect <= 0.6 ? 58 : 58 + (aspect - 0.6) / 0.9 * 28) * Math.PI / 180;
    const hfov = baseH * (1 + (REDUCED ? 0 : 0.22) * cam.speedN);
    const tHalf = Math.tan(hfov / 2);
    const f = (iw / 2) / tHalf;
    const cy = ih * 0.55 + cam.bob;
    const px0 = iw / 2 + shiftPx;
    lastF = f; lastCy = cy; lastPx0 = px0;
    const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
    const px = cam.x, py = cam.y;

    for (let y = 0; y < ih; y++) {
      const d = y + 0.5 - cy;
      if (d > 0.5) { const z = f * EYE / d; rowZ[y] = z; rowFog[y] = 1 - Math.exp(-z * FOG_K); } else rowZ[y] = 0;
    }
    if (!skyR || skyR.length !== ih) { skyR = new Float32Array(ih); skyG = new Float32Array(ih); skyB = new Float32Array(ih); }
    for (let y = 0; y < ih; y++) {
      const t = Math.pow(clamp(y / Math.max(cy, 1), 0, 1), 1.5);
      skyR[y] = lerp(SKY_TOP[0], SKY_HOR[0], t); skyG[y] = lerp(SKY_TOP[1], SKY_HOR[1], t); skyB[y] = lerp(SKY_TOP[2], SKY_HOR[2], t);
    }
    const floorStart = Math.max(0, Math.floor(cy) + 1);
    const starOff = Math.floor(cam.yaw * 140);
    const linePulse = phase;

    for (let cx = 0; cx < iw; cx++) {
      const sx = (cx + 0.5 - px0) / f;
      const rdx = cosY + sinY * sx, rdy = sinY - cosY * sx;

      let bestU = 1e9, bestSeg = null, bestV = 0, nsl = 0;
      for (let k = 0; k < segs.length; k++) {
        const sg = segs[k];
        const den = rdx * sg.ey - rdy * sg.ex;
        if (den > -1e-9 && den < 1e-9) continue;
        const wx = sg.ax - px, wy = sg.ay - py;
        const u = (wx * sg.ey - wy * sg.ex) / den;
        if (u < 0.05) continue;
        const v = (wx * rdy - wy * rdx) / den;
        if (v < 0 || v > 1) continue;
        if (sg.sliver) { slSeg[nsl] = sg; slU[nsl] = u; slV[nsl] = v; nsl++; }
        else if (u < bestU) { bestU = u; bestSeg = sg; bestV = v; }
      }

      let y0, y1, u = bestU;
      if (!bestSeg) { u = 400; }
      zbuf[cx] = u;
      const hTop = cy - f * (WALL_H - EYE) / u, hBot = cy + f * EYE / u;
      y0 = Math.max(0, Math.ceil(hTop)); y1 = Math.min(ih - 1, Math.floor(hBot));

      // 双坡屋面内侧：檐口落在柱顶，屋脊抬高；沿廊道方向投影檩条，横向投影椽子。
      const roofLeg = clamp(cam.leg, 1, world.M);
      const roofDir = [[1,0],[0,1],[-1,0],[0,-1]][world.dirs[roofLeg - 1]];
      const roofN = [-roofDir[1], roofDir[0]];
      const roofOrigin = world.Q[roofLeg - 1];
      for (let y = 0; y < y0 && y < ih; y++) {
        const dRoof = cy - (y + 0.5);
        if (dRoof > 0.5) {
          let zr = f * (RIDGE_H - EYE) / dRoof;
          let wx = px, wy = py, lateral = 0, along = 0, roofH = RIDGE_H;
          for (let it = 0; it < 3; it++) {
            wx = px + rdx * zr; wy = py + rdy * zr;
            const ox = wx - roofOrigin[0], oy = wy - roofOrigin[1];
            lateral = ox * roofN[0] + oy * roofN[1];
            along = ox * roofDir[0] + oy * roofDir[1];
            const across = clamp(Math.abs(lateral) / HW, 0, 1);
            // 双坡曲线略带起翘，避免屋面像一张机械三角板。
            const slope = 1 - Math.pow(across, 1.28) + 0.035 * Math.pow(across, 7);
            roofH = EAVE_H + (RIDGE_H - EAVE_H) * slope;
            zr = f * (roofH - EYE) / dRoof;
          }
          if (Math.abs(lateral) <= HW + 0.12) {
            const tileU = ((along % 3.6) + 3.6) % 3.6;
            const beamU = Math.min(tileU, 3.6 - tileU);
            const absLat = Math.abs(lateral);
            const purlin = [0, 1.75, 3.5, 5.15].some(v => Math.abs(absLat - v) < 0.13);
            const rafter = beamU < 0.15;
            const trim = Math.abs(absLat - HW) < 0.18;
            const grain = (hash2(Math.floor(wx * 2.1), Math.floor(wy * 2.1)) - 0.5) * 5;
            let r = 211 + grain, g = 194 + grain, b = 165 + grain;
            if (purlin || rafter) { r = 91 + grain; g = 39 + grain * 0.5; b = 31 + grain * 0.35; }
            if (trim) { r = 157; g = 105; b = 54; }
            if (purlin && beamU < 0.3) { r = 190; g = 145; b = 73; }
            const fadeRoof = 1 - Math.exp(-zr * FOG_K * 0.52);
            r += (FOG[0] - r) * fadeRoof; g += (FOG[1] - g) * fadeRoof; b += (FOG[2] - b) * fadeRoof;
            buf[y * iw + cx] = pack(r | 0, g | 0, b | 0);
          } else {
            const t = Math.pow(clamp(y / Math.max(cy, 1), 0, 1), 1.5), k = 1 - t;
            buf[y * iw + cx] = pack((SKY_HOR[0] * k + 18) | 0, (SKY_HOR[1] * k + 12) | 0, (SKY_HOR[2] * k + 8) | 0);
          }
        }
      }

      if (bestSeg) {
        const seg = bestSeg;
        const s = bestV * seg.len;
        const hx = px + rdx * u, hy = py + rdy * u;
        const I = lanternLight(hx, hy, lan);
        const fog = 1 - Math.exp(-u * FOG_K);
        const dec = seg.decal;
        const sv = seg.flip ? seg.len - s : s;
        let spot = 0, lit = 0;
        if (dec) { lit = dec.frame.lit; spot = lit * Math.exp(-((sv - dec.c) * (sv - dec.c)) / 52); }
        const tid = seg.tid;
        for (let y = y0; y <= y1; y++) {
          const hh = EYE + (cy - (y + 0.5)) * u / f;
          let r, g, b, fogK = 1;
          if (tid === 3) {
            // 光之门：自发光的拱门
            const gx = (s - HW) / 3.7;
            let dd;
            if (hh < 6.2) dd = Math.max(Math.abs(gx) - 1, 0);
            else { const gy = (hh - 6.2) / 3.7; dd = Math.max(Math.sqrt(gx * gx + gy * gy) - 1, 0); }
            if (dd === 0 && hh < 10) {
              const ax = Math.abs(gx), c = 1 - 0.18 * ax - 0.1 * Math.max(0, hh - 6.2) / 3.7;
              r = 255 * c; g = (246 - 34 * ax) * c; b = (212 - 96 * ax) * c;
              fogK = 0.2;
            } else {
              const k = 0.55 + 0.45 * I;
              r = 38 * k; g = 42 * k; b = 66 * k;
              if (dd < 0.2 && hh < 10.4) { r = 244; g = 189; b = 60; fogK = 0.4; }
              else {
                const halo = Math.exp(-dd * dd * 7) * 0.55;
                r += 255 * halo; g += 200 * halo; b += 110 * halo;
              }
            }
          } else {
            if (tid === 0) {
              // 白灰墙身：石材勒脚、护墙板、连续壁柱与多层檐线。
              const panelF = (s + 0.4) / 5.4, panel = Math.floor(panelF), px = panelF - panel;
              const verticalEdge = px < 0.035 || px > 0.965;
              const grain = (hash2(Math.floor(s * 2.7), Math.floor(hh * 3.1)) - 0.5) * 5;
              const variation = (hash2(panel + 19, Math.floor(hh / 2.4)) - 0.5) * 5;
              let base = 218 + grain + variation;
              r = base + 3; g = base + 1; b = base - 7;
              if (hh < 1.55) { r = 151 + grain; g = 145 + grain; b = 132 + grain; }
              else if (hh < 3.15) {
                const inset = px > 0.10 && px < 0.90;
                r = inset ? 226 : 188; g = inset ? 220 : 179; b = inset ? 205 : 161;
                if (verticalEdge || hh < 1.78 || hh > 3.02) { r -= 24; g -= 22; b -= 18; }
              } else if (hh < 9.75) {
                const band = (hh - 3.35) % 5.9;
                if (verticalEdge && band > 0.2 && band < 5.65) { r -= 17; g -= 16; b -= 13; }
                if (band < 0.09 || band > 5.78) { r -= 20; g -= 17; b -= 12; }
                if (band > 0.22 && band < 5.55 && px > 0.13 && px < 0.87) {
                  const insetShade = 1 - 0.035 * Math.abs(px - 0.5) * 2;
                  r *= insetShade; g *= insetShade; b *= insetShade;
                }
              }
              if (hh > 1.48 && hh < 1.72) { r = 157; g = 148; b = 130; }
              if (hh > 3.02 && hh < 3.22) { r = 174; g = 151; b = 111; }
              if (hh > 9.72 && hh < 9.96) { r = 174; g = 145; b = 99; }
              if (hh > 10.02 && hh < 10.28) { r = 226; g = 218; b = 198; }
              if (hh > 11.92) { r = 174; g = 145; b = 99; }
            } else {
              // 深朱红木柱：立面明暗、纵向木纹、金色柱础与柱头箍线。
              const face = tid === 1 ? Math.sin(Math.PI * clamp(s / seg.len, 0, 1)) : 0.46;
              const sideShade = 0.48 + 0.52 * face;
              const grain = Math.sin(s * 17.0 + hh * 0.7) * 2.8 + Math.sin(s * 39.0) * 1.4;
              if (hh < 1.35) {
                r = 91 * sideShade; g = 68 * sideShade; b = 49 * sideShade;
              } else if (hh < 1.62 || (hh > 9.45 && hh < 9.78)) {
                r = 190 * sideShade; g = 145 * sideShade; b = 66 * sideShade;
              } else {
                const wood = 1 + grain / 100;
                r = (116 + 20 * face) * sideShade * wood;
                g = (29 + 12 * face) * sideShade * wood;
                b = (25 + 8 * face) * sideShade * wood;
                const groove = Math.sin(s * 23) > 0.91 ? 0.76 : 1;
                r *= groove; g *= groove; b *= groove;
                if (hh > 9.05 && hh < 9.42) { r *= 1.22; g *= 1.18; b *= 1.08; }
                // 柱顶不是平切：用逐层出挑的枋、栱、斗组合出简化斗拱轮廓。
                if (hh >= 9.78 && hh < 10.8) {
                  const edge = Math.abs(s / seg.len - 0.5) * 2;
                  if (hh < 10.05 && edge < 0.96) { r = 145 * sideShade; g = 48 * sideShade; b = 35 * sideShade; }
                  else if (hh < 10.32 && edge < 0.72) { r = 83 * sideShade; g = 34 * sideShade; b = 29 * sideShade; }
                  else if (hh < 10.58 && edge < 0.94) { r = 170 * sideShade; g = 116 * sideShade; b = 58 * sideShade; }
                  else if (hh >= 10.58 && edge < 0.66) { r = 88 * sideShade; g = 35 * sideShade; b = 29 * sideShade; }
                }
              }
            }
            const dh = (hh - LAN_H) * 0.1111;
            const Lc = I / (1 + dh * dh);
            const dsp = (hh - 4.8) * 0.2;
            const sp = spot / (1 + dsp * dsp);
            r *= 0.30 + 1.30 * Lc + 1.5 * sp;
            g *= 0.34 + 0.82 * Lc + 1.25 * sp;
            b *= 0.46 + 0.42 * Lc + 0.95 * sp;
            if (dec && hh >= dec.h0 && hh <= dec.h1 && sv >= dec.sv0 && sv < dec.sv1) {
              let tx2 = ((sv - dec.sv0) * dec.invW) | 0, ty2 = ((dec.h1 - hh) * dec.invH) | 0;
              if (tx2 >= TEX_W) tx2 = TEX_W - 1; if (ty2 >= TEX_H) ty2 = TEX_H - 1;
              const tp = dec.tex.px[ty2 * TEX_W + tx2];
              const a = tp >>> 24;
              if (a === 255) {
                const m = 0.34 + 0.92 * lit;
                r = (tp & 255) * m; g = ((tp >>> 8) & 255) * m; b = ((tp >>> 16) & 255) * m;
                fogK = 0.5;
              } else if (a > 0) { const k = 1 - a / 255; r *= k; g *= k; b *= k; }
            }
          }
          const fg2 = fog * fogK;
          r += (FOG[0] - r) * fg2; g += (FOG[1] - g) * fg2; b += (FOG[2] - b) * fg2;
          buf[y * iw + cx] = pack(r | 0, g | 0, b | 0);
        }
      }

      // 地面
      const yStart = bestSeg ? Math.max(y1 + 1, floorStart) : floorStart;
      for (let y = yStart; y < ih; y++) {
        const z = rowZ[y];
        const wx = px + rdx * z, wy = py + rdy * z;
        const gx = wx * 0.2, gy = wy * 0.2;
        const ix = Math.floor(gx), iy = Math.floor(gy);
        const fx = gx - ix, fy = gy - iy;
        const tone = TONE[(ix & 7) + ((iy & 7) << 3)];
        let r = 151 * tone, g = 145 * tone, b = 132 * tone;
        const seam = fx < 0.018 || fy < 0.018;
        if (seam) { r *= 0.72; g *= 0.72; b *= 0.75; }
        const vein = Math.sin((wx + wy * 0.31) * 0.42) * Math.sin(wy * 0.17);
        r += vein * 3; g += vein * 3; b += vein * 2;
        guideAt(wx, wy, gl);
        const d = gD;
        let fog = rowFog[y];
        if (d < 3.4) {
          const pulse = 0.5 + 0.5 * Math.cos((gS - linePulse) * 0.7);
          const q = 1 / (1 + d * d * 1.5);
          const glow = q * q * (0.42 + 0.42 * pulse * pulse);
          const core = d < 0.12 ? 1 : d < 0.26 ? (0.26 - d) / 0.14 : 0;
          r += 255 * glow * 0.62; g += 160 * glow * 0.62; b += 40 * glow * 0.62;
          const cb = core * (0.82 + 0.5 * pulse);
          r += 255 * cb; g += 218 * cb; b += 100 * cb;
          fog *= 1 - 0.6 * clamp(core + glow, 0, 1);
        }
        r += (FOG[0] - r) * fog; g += (FOG[1] - g) * fog; b += (FOG[2] - b) * fog;
        buf[y * iw + cx] = pack(r | 0, g | 0, b | 0);
      }

      // 横梁（比墙近才画，由远到近）
      if (nsl) {
        for (let a = 1; a < nsl; a++) { const sg = slSeg[a], uu = slU[a], vv = slV[a]; let b2 = a - 1; while (b2 >= 0 && slU[b2] < uu) { slSeg[b2 + 1] = slSeg[b2]; slU[b2 + 1] = slU[b2]; slV[b2 + 1] = slV[b2]; b2--; } slSeg[b2 + 1] = sg; slU[b2 + 1] = uu; slV[b2 + 1] = vv; }
        for (let k = 0; k < nsl; k++) {
          const ul = slU[k];
          if (ul >= u) continue;
          const sg = slSeg[k];
          const sA = clamp(Math.ceil(cy - f * (sg.h1 - EYE) / ul), 0, ih), sB = clamp(Math.floor(cy - f * (sg.h0 - EYE) / ul), -1, ih - 1);
          if (sB < sA) continue;
          const sl = slV[k] * sg.len;
          const hx = px + rdx * ul, hy = py + rdy * ul;
          const I = lanternLight(hx, hy, lan);
          const fog = 1 - Math.exp(-ul * FOG_K);
          for (let y = sA; y <= sB; y++) {
            const hh = EYE + (cy - (y + 0.5)) * ul / f;
            const hb = (hh - sg.h0) / (sg.h1 - sg.h0);
            let r, g, b;
            if (hb < 0.13 || hb > 0.9) { r = 232; g = 176; b = 56; }
            else {
              r = 118; g = 30; b = 34;
              if (hb > 0.38 && hb < 0.62 && (sl * 0.7) % 2 < 0.7) { r = 232; g = 176; b = 56; }
            }
            const Lc = 0.28 + 0.9 * I;
            r *= Lc; g *= Lc; b *= Lc * 0.95;
            r += (FOG[0] - r) * fog; g += (FOG[1] - g) * fog; b += (FOG[2] - b) * fog;
            buf[y * iw + cx] = pack(r | 0, g | 0, b | 0);
          }
        }
      }
    }

    ctx.putImageData(img, 0, 0);
    drawSprites(f, cy, cosY, sinY, px, py, lan);
    if (cam.speedN > 0.22 && !REDUCED) drawStreaks(now, f, cy);
  }

  function drawSprites(f, cy, cosY, sinY, px, py, lan) {
    const list = [];
    for (const L of lan) {
      const dx = L.x - px, dy = L.y - py;
      const zc = dx * cosY + dy * sinY;
      if (zc < 0.8 || zc > 150) continue;
      const xc = dx * sinY - dy * cosY;
      const sx = lastPx0 + xc / zc * f;
      if (sx < -80 || sx > iw + 80) continue;
      if (zbuf[clamp(Math.round(sx), 0, iw - 1)] < zc - 1.4) continue;
      list.push({ zc, sx, sy: cy - (L.h - EYE) / zc * f });
    }
    if (!list.length) return;
    list.sort((a, b) => b.zc - a.zc);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of list) {
      const fa = Math.exp(-s.zc * FOG_K * 0.55);
      const r = Math.max(5, f * 3.4 / s.zc);
      const gr = ctx.createRadialGradient(s.sx, s.sy, 0, s.sx, s.sy, r);
      gr.addColorStop(0, 'rgba(255,176,86,' + (0.6 * fa).toFixed(3) + ')');
      gr.addColorStop(0.45, 'rgba(255,120,50,' + (0.2 * fa).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(s.sx - r, s.sy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const s of list) {
      const fa = Math.exp(-s.zc * FOG_K * 0.9);
      // 传统宫灯轮廓：顶盖、朱红灯身、暖色灯芯、金属箍与流苏。
      const w = Math.max(3, Math.round(f * 0.92 / s.zc)), h = Math.max(5, Math.round(w * 1.72));
      const x = Math.round(s.sx - w / 2), y = Math.round(s.sy - h / 2);
      const mix = (c, k) => 'rgb(' + Math.round(c[0] * fa + FOG[0] * (1 - fa) * k) + ',' + Math.round(c[1] * fa + FOG[1] * (1 - fa) * k) + ',' + Math.round(c[2] * fa + FOG[2] * (1 - fa) * k) + ')';
      const cap = Math.max(2, Math.ceil(w * 0.82)), bodyY = y + Math.max(1, Math.floor(h * 0.18));
      ctx.fillStyle = mix([91, 48, 27], 1);
      ctx.fillRect(Math.round(s.sx - 1), y - Math.max(2, Math.floor(h * 0.16)), 2, Math.max(2, Math.floor(h * 0.16)));
      ctx.fillStyle = mix([205, 157, 76], 1);
      ctx.fillRect(Math.round(s.sx - cap / 2), y, cap, Math.max(1, Math.ceil(h * 0.12)));
      ctx.fillRect(Math.round(s.sx - cap / 2), y + h - Math.ceil(h * 0.16), cap, Math.max(1, Math.ceil(h * 0.1)));
      ctx.fillStyle = mix([132, 32, 27], 1);
      ctx.fillRect(x, bodyY, w, Math.max(2, h - Math.floor(h * 0.3)));
      ctx.fillStyle = mix([255, 195, 104], 1);
      ctx.fillRect(x + Math.max(1, Math.floor(w * 0.22)), bodyY + 1, Math.max(1, Math.ceil(w * 0.18)), Math.max(1, h - Math.floor(h * 0.38)));
      ctx.fillRect(x + Math.floor(w * 0.62), bodyY + 1, Math.max(1, Math.ceil(w * 0.14)), Math.max(1, h - Math.floor(h * 0.38)));
      ctx.fillStyle = mix([244, 177, 76], 1);
      ctx.fillRect(x, bodyY, w, 1);
      ctx.fillRect(Math.round(s.sx), y + h - 1, 1, Math.max(2, Math.round(h * 0.24)));
      ctx.fillRect(Math.round(s.sx) - 1, y + h + 1, 3, 1);
    }
    ctx.restore();
  }

  function drawStreaks(now, f, cy) {
    ctx.save();
    ctx.lineWidth = 1;
    const cx0 = lastPx0, n = 22;
    const rr = Math.min(iw, ih);
    for (let i = 0; i < n; i++) {
      const a = hash2(i * 7, 13) * 6.2832 + Math.floor(now * 14 + i) * 0.37;
      const r0 = rr * (0.3 + 0.28 * hash2(i, Math.floor(now * 14 + i)));
      const len = rr * (0.08 + 0.26 * cam.speedN) * (0.5 + hash2(i, 5));
      const ca = Math.cos(a), sa = Math.sin(a);
      ctx.strokeStyle = 'rgba(255,228,160,' + (0.22 * cam.speedN).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(Math.round(cx0 + ca * r0) + 0.5, Math.round(cy + sa * r0 * 0.8) + 0.5);
      ctx.lineTo(Math.round(cx0 + ca * (r0 + len)) + 0.5, Math.round(cy + sa * (r0 + len) * 0.8) + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- 当前画框在屏幕上的位置（用来判断点没点到作品） ---------- */
  function currentFrame() {
    if (!world || nav.stop < 1 || nav.stop > world.frames.length) return null;
    return world.frames[nav.stop - 1];
  }
  function frameCssRect(fr) {
    const seg = fr.seg, ca = Math.cos(cam.yaw), sa = Math.sin(cam.yaw);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const corners = [[fr.sv0, fr.h0], [fr.sv1, fr.h0], [fr.sv1, fr.h1], [fr.sv0, fr.h1]];
    for (const c of corners) {
      const s = seg.flip ? seg.len - c[0] : c[0];
      const wx = seg.ax + seg.ex * (s / seg.len), wy = seg.ay + seg.ey * (s / seg.len);
      const dx = wx - cam.x, dy = wy - cam.y;
      const z = dx * ca + dy * sa;
      if (z < 0.3) return null;
      const sx = lastPx0 + (dx * sa - dy * ca) / z * lastF, sy = lastCy - (c[1] - EYE) / z * lastF;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    const kx = cssW / iw, ky = cssH / ih;
    return { x0: x0 * kx, y0: y0 * ky, x1: x1 * kx, y1: y1 * ky };
  }

  /* ---------------------------------------------------------
     10. HUD
     --------------------------------------------------------- */
  const moving = () => cam.v !== 0 || nav.stop !== nav.target;
  const pad2 = n => (n < 10 ? '0' : '') + n;

  function updateHud(force) {
    const idle = !moving();
    const key = nav.stop + (idle ? 'i' : 'm') + lang() + world.slots.length;
    if (!force && key === hudKey) return;
    hudKey = key;
    hud.classList.toggle('is-moving', !idle);
    if (!idle) return;
    const n = world.slots.length, last = world.stopS.length - 1;
    const real = !!(world.slots[0] && world.slots[0].work);
    const st = nav.stop;
    let kicker = '', title = '', sub = '', showOpen = false;
    if (st === 0) {
      kicker = tx('gallery');
      title = real ? tx('allTitle')(n) : tx('emptyTitle');
      sub = real ? tx('run') : tx('emptySub');
    } else if (st === last) {
      kicker = tx('gallery');
      title = tx('endTitle'); sub = tx('endSub');
    } else {
      const slot = world.slots[st - 1];
      if (slot.work) {
        kicker = 'NO.' + pad2(st) + (slot.work.folder ? ' · ' + slot.work.folder : '');
        title = slot.work.title; sub = slot.work.en; showOpen = true;
      } else { kicker = 'NO.' + pad2(st); title = tx('ghost'); sub = tx('ghostSub'); }
    }
    ui.kicker.textContent = kicker;
    ui.title.textContent = title;
    ui.sub.textContent = sub;
    ui.sub.hidden = !sub;
    ui.open.hidden = !showOpen;
    ui.open.textContent = tx('open') + ' ▸';
    ui.chip.textContent = real ? pad2(Math.min(st, n)) + ' / ' + pad2(n) : '00 / 00';
    ui.hint.textContent = st > 0 && st < last ? tx('next') : '';
    ui.hint.hidden = !ui.hint.textContent;
    ui.back.setAttribute('aria-label', tx('back'));
    ui.back.title = tx('back');
    ui.back.hidden = st === 0;
    canvas.setAttribute('aria-label', tx('aria'));
  }

  /* ---------------------------------------------------------
     11. 导航 / 输入
     --------------------------------------------------------- */
  let restarting = false;
  function restart() {
    if (restarting) return;
    restarting = true;
    fade.classList.add('on');
    setTimeout(() => {
      nav.stop = 0; nav.target = 0; placeCamera(0); hudKey = '';
      fade.classList.remove('on');
      restarting = false;
    }, 320);
  }
  function advance(dir) {
    if (!running || viewerOpen || restarting || !world) return;
    const last = world.stopS.length - 1;
    if (dir > 0 && nav.target === last && nav.stop === last && !moving()) { restart(); return; }
    nav.target = clamp(nav.target + dir, Math.max(0, nav.stop - 2), Math.min(last, nav.stop + 3));
    hudKey = '';
  }

  function openViewer(item) {
    if (!item || viewerOpen) return;
    viewerOpen = true;
    ui.vtitle.textContent = item.title;
    ui.ven.textContent = item.en; ui.ven.hidden = !item.en;
    ui.vdesc.textContent = item.desc; ui.vdesc.hidden = !item.desc;
    ui.vlink.hidden = !item.github;
    if (item.github) ui.vlink.href = item.github;
    ui.vlinktext.textContent = tx('github');
    ui.vclose.setAttribute('aria-label', tx('close'));
    ui.vstage.style.setProperty('--bc-ratio', String(item.ratio || 1.6439));
    ui.vstage.replaceChildren();
    if (item.src) {
      const frame = document.createElement('iframe');
      frame.src = item.src;
      frame.title = item.title;
      frame.referrerPolicy = 'no-referrer';
      frame.allow = 'fullscreen';
      ui.vstage.appendChild(frame);
    }
    viewer.hidden = false;
    document.body.classList.add('bc-viewing');
    requestAnimationFrame(() => viewer.classList.add('on'));
    ui.vclose.focus({ preventScroll: true });
  }
  function closeViewer() {
    if (!viewerOpen) return;
    viewerOpen = false;
    viewer.classList.remove('on');
    viewer.hidden = true;
    document.body.classList.remove('bc-viewing');
    ui.vstage.replaceChildren();
    lastT = 0;
  }
  function openCurrent() {
    const fr = currentFrame();
    if (fr && fr.slot.work && !moving()) openViewer(fr.slot.work);
  }

  function tap(clientX, clientY) {
    if (moving()) { advance(1); return; }
    const fr = currentFrame();
    if (fr && fr.slot.work) {
      const rect = view.getBoundingClientRect();
      const r = frameCssRect(fr);
      const x = clientX - rect.left, y = clientY - rect.top, pad = 14;
      if (r && x >= r.x0 - pad && x <= r.x1 + pad && y >= r.y0 - pad && y <= r.y1 + pad) { openViewer(fr.slot.work); return; }
    }
    advance(1);
  }

  let pd = null, wheelAt = 0;
  view.addEventListener('pointerdown', e => {
    if (!running || e.target.closest('.bc-hud button, .bc-placard, .bc-viewer')) return;
    pd = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  view.addEventListener('pointerup', e => {
    if (!pd) return;
    const dx = e.clientX - pd.x, dy = e.clientY - pd.y, dt = performance.now() - pd.t;
    pd = null;
    if (!running || viewerOpen) return;
    if (Math.abs(dy) > 46 && Math.abs(dy) > Math.abs(dx) * 1.4) { advance(dy < 0 ? 1 : -1); return; }
    if (Math.hypot(dx, dy) < 12 && dt < 700) tap(e.clientX, e.clientY);
  });
  view.addEventListener('pointercancel', () => { pd = null; });
  view.addEventListener('wheel', e => {
    if (!running || viewerOpen) return;
    e.preventDefault();
    const t = performance.now();
    if (t - wheelAt < 320 || Math.abs(e.deltaY) < 4) return;
    wheelAt = t;
    advance(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  ui.open.addEventListener('click', e => { e.stopPropagation(); openCurrent(); });
  ui.back.addEventListener('click', e => { e.stopPropagation(); advance(-1); });
  ui.vclose.addEventListener('click', closeViewer);
  viewer.addEventListener('click', e => { if (e.target === viewer) closeViewer(); });
  document.addEventListener('keydown', e => {
    if (!running) return;
    if (e.key === 'Escape') { if (viewerOpen) { closeViewer(); e.preventDefault(); } return; }
    if (viewerOpen) return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === 'Enter' && !(t instanceof HTMLElement && t.closest('button, a'))) { e.preventDefault(); if (currentFrame() && !moving()) openCurrent(); else advance(1); }
    else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'PageDown') { if (!(t instanceof HTMLElement && t.closest('button, a'))) { e.preventDefault(); advance(1); } }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') { e.preventDefault(); advance(-1); }
  });

  /* ---------------------------------------------------------
     12. 主循环 / 启停
     --------------------------------------------------------- */
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!running || viewerOpen || document.hidden || !world) return;
    const now = ts / 1000;
    const dt = lastT ? Math.min(0.05, now - lastT) : 0.016;
    lastT = now;
    const idle = !moving();
    if (idle && cam.roll === 0 && ++idleSkip % 2 === 1 && Math.abs(cam.yawRate) < 0.01) { phase += dt * 8; /* 静止时 30fps 就够了 */ return; }
    const t0 = performance.now();
    updateMotion(dt, now);
    render(now);
    if (!idle) {
      // 自适应画质：机器吃力就把像素放大一档
      renderEma = renderEma ? renderEma * 0.92 + (performance.now() - t0) * 0.08 : performance.now() - t0;
      if (renderEma > 20 && ++slowCount > 24 && pBias < 3) { pBias++; slowCount = 0; renderEma = 0; resize(); }
    }
    const rr = Math.abs(cam.roll) < 0.03 ? 0 : cam.roll;
    if (rr) { const th = Math.abs(rr) * Math.PI / 180, asp = Math.max(cssW / cssH, cssH / cssW); canvas.style.transform = 'rotate(' + rr.toFixed(2) + 'deg) scale(' + (Math.cos(th) + Math.sin(th) * asp + 0.012).toFixed(3) + ')'; } else canvas.style.transform = '';
    view.style.setProperty('--bc-speed', cam.speedN.toFixed(2));
    updateHud(false);
  }

  function computeSignature(items) { return items.map(i => i.id + ':' + i.folder).join('|'); }
  function refreshData(force) {
    const items = collectItems();
    const sig = computeSignature(items);
    if (!force && sig === signature && world) return false;
    signature = sig;
    setWorld(items);
    return true;
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    refreshData(true);
    hudKey = '';
    updateHud(true);
    canvas.classList.remove('is-entering'); void canvas.offsetWidth; canvas.classList.add('is-entering');
    lastT = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    closeViewer();
  }
  function sync() {
    const on = document.body.classList.contains('is-bookmarks') && !view.hidden;
    if (on) start(); else stop();
  }

  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sync).observe(view, { attributes: true, attributeFilter: ['hidden'] });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (running) { resize(); lastT = 0; } }).observe(view);
  window.addEventListener('resize', () => { if (running) resize(); });
  ['site:bookmarkchange', 'site:folders', 'site:synced'].forEach(name => document.addEventListener(name, () => { if (running) { if (refreshData(false)) updateHud(true); } }));
  document.addEventListener('site:languagechange', () => { hudKey = ''; if (running && world) updateHud(true); });

  // 给调试 / 其他脚本留一个小接口
  window.siteCorridor = {
    advance, back: () => advance(-1), openCurrent,
    get state() { return { running, stop: nav.stop, target: nav.target, stops: world ? world.stopS.length : 0, s: cam.s, moving: moving() }; }
  };

  sync();
})();
