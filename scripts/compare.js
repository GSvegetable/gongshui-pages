/* =========================================================
   版本对比 · 副视图 — v1.3.0
   ---------------------------------------------------------
   「版本对比」打开时，在主视图下方生成一个同尺寸的副视图。
   主站（main.js）负责开关、选中与场景选择路由，这里只管副视图 iframe：
   · 像素昼夜开关：preview.html，用 postMessage 切场景
   · 像素圆环：showcase.html，用 ?scene= 切版本；composition=full（上浮状态）
   ========================================================= */
(() => {
  const PDS_PREVIEW = 'https://gsvegetable.github.io/1_pixel-daylight-switch/preview.html';
  const ORBIT_SHOWCASE = 'https://gsvegetable.github.io/2_pixel-dusk/showcase.html?v=1.4.0&composition=full';
  const PREVIEW_ORIGIN = 'https://gsvegetable.github.io';

  const frame = document.getElementById('compare-frame');
  if (!frame) return;

  let scope = null;   // 'pds' | 'orbit'
  let version = null; // 副视图当前版本
  let iframe = null;
  const pdsFrames = new Map();

  window.addEventListener('message', event => {
    const el = pdsFrames.get(event.source);
    if (event.origin !== PREVIEW_ORIGIN || !el || event.data?.type !== 'pds-preview-ready') return;
    el.contentWindow?.postMessage({ type: 'pds-set-scene', scene: el.dataset.scene || 'seaside' }, PREVIEW_ORIGIN);
  });

  const teardown = () => {
    if (!iframe) return;
    if (iframe.contentWindow) pdsFrames.delete(iframe.contentWindow);
    iframe.remove();
    iframe = null;
  };

  const ensureIframe = () => {
    if (iframe) return iframe;
    iframe = document.createElement('iframe');
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer';
    iframe.allow = 'fullscreen';
    iframe.setAttribute('title', '版本对比副视图');
    frame.appendChild(iframe);
    if (scope === 'pds') {
      pdsFrames.set(iframe.contentWindow, iframe);
      iframe.addEventListener('load', () => {
        iframe.contentWindow?.postMessage({ type: 'pds-set-scene', scene: iframe.dataset.scene || 'seaside' }, PREVIEW_ORIGIN);
      });
    }
    return iframe;
  };

  const apply = () => {
    if (!scope) return;
    const el = ensureIframe();
    el.dataset.scene = version;
    if (scope === 'orbit') {
      el.src = ORBIT_SHOWCASE + '&scene=' + encodeURIComponent(version);
    } else {
      if (!el.dataset.started) {
        el.dataset.started = '1';
        el.src = PDS_PREVIEW;
      }
      el.contentWindow?.postMessage({ type: 'pds-set-scene', scene: version }, PREVIEW_ORIGIN);
    }
  };

  window.siteCompare = {
    // 打开对比：主站传入作品类型与默认版本（默认跟主视图一致）
    show(nextScope, defaultVersion) {
      if (nextScope !== scope) { teardown(); scope = nextScope; }
      version = defaultVersion;
      apply();
    },
    hide() {
      // 保留 iframe，只隐藏；切换作品时 show 会重建
    },
    // 换副视图版本；和当前一样则返回 false（无反应）
    setVersion(next) {
      if (!scope || !next || next === version) return false;
      version = next;
      apply();
      return true;
    },
    getVersion() { return version; }
  };

  // v1.3.0：副视图中间恢复可交互，选中改由主站盖在边缘的「外框热区」负责，
  // 这里不再拦截点击（否则点画面就只是选中，没法操作副视图里的作品）。
})();
