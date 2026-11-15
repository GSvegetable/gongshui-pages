(() => {
    /* =========================================================
       设置面板：齿轮开合 — v3.3.24
       ---------------------------------------------------------
       v3.3.9 把中英文切换收进设置面板时只改了界面，漏掉了开合逻辑：
       面板的 hidden 属性永远不会被移除，齿轮按钮点不动，
       整个语言切换在生产环境不可达。这里补回开合行为。
       ========================================================= */
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');

    const setPanelOpen = open => {
      if (!settingsPanel || !settingsToggle) return;
      settingsPanel.hidden = !open;
      settingsToggle.setAttribute('aria-expanded', String(open));
      if (open) window.siteNav?.open('settings', () => setPanelOpen(false));
      else window.siteNav?.close('settings');
    };

    if (settingsToggle && settingsPanel) {
      settingsToggle.addEventListener('click', event => {
        event.stopPropagation();
        setPanelOpen(settingsPanel.hidden);
      });
      document.addEventListener('click', event => {
        if (settingsPanel.hidden) return;
        if (settingsPanel.contains(event.target) || settingsToggle.contains(event.target)) return;
        setPanelOpen(false);
      });
      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || settingsPanel.hidden) return;
        setPanelOpen(false);
        settingsToggle.focus();
      });
    }

    /* =========================================================
       中英文切换 — v3.3.24
       ---------------------------------------------------------
       旧实现用「选择器@属性」的扁平表：选择器一旦撞车就会互相覆盖
       （两个不同的标题命中同一个元素，
        英文态下「开发者与贡献者」被写成 "Explore more"，
        而真正的「延伸体验」标题没人翻译）；
       中英文案还各存一份硬编码数组，页面一改就漏译
       （第三个视觉版本「环形世界版」的标签因此变成空白）。
       现在统一为：中文一律从 DOM 读取，英文按稳定 key 查表。
       ========================================================= */
    const button = document.getElementById('language-toggle');
    if (!button) return;

    const strings = {
      'nav.contributors': 'Contributors',
      'nav.settings': 'Settings',
      'layout.toggle.two': 'Switch to two-column layout',
      'layout.toggle.auto': 'Switch to adaptive layout',
      'nav.language': 'Switch language',
      'account.entry': 'Sign in / Sign up',
      'account.signout': 'Sign out',
      'settings.title': 'Settings',
      'mario.home': 'Home',
      'mario.compass': 'Compass',
      'mario.bookmarks': 'Bookmarks',
      'search.placeholder': 'Search works…',
      'search.label': 'Search works',
      'empty.title': 'Nothing here',
      'search.found': 'Found {n} works',
      'search.none': 'No matching works found',
      'empty.noWorks': 'No works added yet',
      'empty.noMatch': 'No matching works found',
      'empty.bookmarkEmpty': 'You have not bookmarked any work yet',
      'empty.bookmarkNoMatch': 'No matching works in this folder',
      'empty.folderEmpty': 'This folder is empty — bookmark works to fill it.',
      'empty.folderNoMatch': 'No matching folders',
      'bookmarks.title': 'Bookmarks',
      'folders.new': 'New folder',
      'folders.back': 'Back to folders',
      'folders.rename': 'Rename folder',
      'folders.delete': 'Delete folder',
      'folders.count': '{n} works',
      'folders.empty': 'No folders yet — tap “New folder” to start sorting your favourites.',
      'folders.picker.title': 'Save to folder',
      'folders.picker.new': 'New folder name',
      'folders.picker.add': 'Add',
      'folders.picker.close': 'Close',
      'folders.remove': 'Remove from folder',
      'bookmark.remove': 'Remove',
      'card.daylight': 'Pixel Daylight Switch',
      'card.orbit': 'Pixel Orbit',
      'card.daylight.aria': 'Open Pixel Daylight Switch details',
      'card.orbit.aria': 'Open Pixel Orbit details',
      'tag.pixel': 'Pixel art',
      'detail.daylight': 'Pixel Daylight Switch',
      'detail.orbit': 'Pixel Orbit',
      'detail.daylight.description': 'A miniature pixel world inside a refractive glass switch. Move the switch to transition naturally from day through dusk into night. The seaside lighthouse is one of its interactive scenes.',
      'detail.orbit.description': 'A tiny pixel world that changes with time. Drag the ring or adjust the time to watch the sky, sun, moon, clouds and house lights shift from morning to midnight.',
      'project.link': 'View GitHub project',
      'gallery.scenes': 'Scenes',
      'gallery.versions': 'Visual versions',
      'compare.title': 'Scene compare',
      'compare.hint': 'Tap the frame to pick which view the scene picker changes — the artwork itself stays interactive.',
      'compare.selected': 'Selected',
      'compare.selectMain': 'Select main view',
      'compare.selectSub': 'Select compare view',
      'compare.toggle': 'Version compare',
      'contributors.title': 'Creators & contributors',
      'compass.view.title': 'Compass',
      'compass.view.note': 'Unfolding the globe…',
      'globe.view.title': 'Contributors Globe',
      'globe.loading': 'Unfolding the globe…',
      'globe.night': 'Night view',
      'globe.day': 'Day view',
      'globe.cta': '＋ Add my flag',
      'globe.cta.title': 'Submit on GitHub and I will plant your flag',
      'globe.search.placeholder': 'Search authors…',
      'globe.stats': 'By {count} authors from {countries} countries',
      'globe.empty': 'No contributors yet — plant the first flag',
      'globe.nowebgl': 'This device has no WebGL — here is the list instead.',
      'globe.error': "The globe didn't load: {msg}",
      'globe.network': 'network error',
      'globe.retry': 'Retry',
      'globe.close': 'Close',
      'globe.work': 'View work · {title}',
      'embed.title': 'Embed in your page',
      'embed.note': 'Copy the snippet below and the artwork shows up on your page. The styles stay inside its own container and never touch your layout.',
      'embed.note.daylight': 'The artwork appears right above this script. Change data-scene to countryside / japanese-street / apartment / seaside / mountain-cabin for other scenes.',
      'embed.note.orbit': 'data-scene picks countryside, planet or world; data-composition picks art (the sunken home-preview crop) or full (the complete ring).',
      'embed.copy': 'Copy',
      'embed.copied': 'Copied',
      'explore.title': 'Explore more',
      'orbit.version.planet': 'Planet',
      'orbit.version.countryside': 'Countryside',
      'orbit.version.world': 'Ring world',
      'orbit.note.planet': 'Spherical terrain · Day-night orbit',
      'orbit.note.countryside': 'Country cottage · Day-night cycle',
      'orbit.note.world': '168 px · Day-night dial',
      'scene.countryside': 'Country cottage',
      'scene.japanese-street': 'Japanese street',
      'scene.apartment': 'Modern apartment',
      'scene.seaside': 'Seaside lighthouse',
      'scene.mountain-cabin': 'Mountain cabin',
      'action.bookmark': 'Bookmark work',
      'action.expand': 'Expand artwork area',
      'action.restore': 'Return to work details',
      'action.close': 'Close work details',
      'site.version': 'Site version'
    };

    const japanese = {
      'nav.contributors':'クリエイター・貢献者',
      'nav.settings':'設定','layout.toggle.two':'2列レイアウトに切り替え','layout.toggle.auto':'自動レイアウトに切り替え',
      'nav.language':'言語を切り替え','account.entry':'ログイン / 新規登録','account.signout':'ログアウト',
      'settings.title':'設定','mario.home':'ホーム','mario.compass':'コンパス','mario.bookmarks':'ブックマーク',
      'search.placeholder':'作品を検索…','search.label':'作品を検索','empty.title':'該当する作品はありません',
      'search.found':'{n}件の作品が見つかりました','search.none':'一致する作品が見つかりません',
      'empty.noWorks':'まだ作品がありません','empty.noMatch':'一致する作品が見つかりません',
      'empty.bookmarkEmpty':'まだブックマークした作品はありません','empty.bookmarkNoMatch':'このフォルダーに一致する作品はありません',
      'empty.folderEmpty':'フォルダーは空です。作品をブックマークして追加してください。','empty.folderNoMatch':'一致するフォルダーはありません',
      'bookmarks.title':'ブックマーク','folders.new':'新しいフォルダー','folders.back':'フォルダー一覧に戻る',
      'folders.rename':'フォルダー名を変更','folders.delete':'フォルダーを削除','folders.count':'{n}件の作品',
      'folders.empty':'フォルダーはまだありません。「新しいフォルダー」から整理を始めましょう。',
      'folders.picker.title':'フォルダーに保存','folders.picker.new':'新しいフォルダー名','folders.picker.add':'追加',
      'folders.picker.close':'閉じる','folders.remove':'フォルダーから削除','bookmark.remove':'削除',
      'card.daylight':'Pixel Daylight Switch','card.orbit':'Pixel Orbit',
      'card.daylight.aria':'Pixel Daylight Switch の詳細を開く','card.orbit.aria':'Pixel Orbit の詳細を開く',
      'tag.pixel':'ピクセルアート','detail.daylight':'Pixel Daylight Switch','detail.orbit':'Pixel Orbit',
      'detail.daylight.description':'屈折するガラススイッチの中に広がる小さなピクセルの世界。スイッチを動かすと、昼から夕暮れ、夜へと自然に移り変わります。海辺の灯台は操作できるシーンのひとつです。',
      'detail.orbit.description':'時間とともに変化する小さなピクセル世界。リングをドラッグしたり時刻を調整したりして、朝から真夜中まで空や太陽、月、雲、家の明かりの変化を楽しめます。',
      'project.link':'GitHub プロジェクトを見る','gallery.scenes':'シーン','gallery.versions':'ビジュアルバージョン',
      'compare.title':'シーン比較','compare.hint':'フレームをタップして、シーン選択を適用する表示を選びます。作品自体はそのまま操作できます。',
      'compare.selected':'選択中','compare.selectMain':'メイン表示を選択','compare.selectSub':'比較表示を選択','compare.toggle':'バージョン比較',
      'contributors.title':'クリエイター・貢献者','compass.view.title':'コンパス','compass.view.note':'地球を展開しています…',
      'globe.view.title':'貢献者の地球','globe.loading':'地球を展開しています…','globe.night':'夜景','globe.day':'昼景',
      'globe.cta':'＋ 自分の旗を追加','globe.cta.title':'GitHub から投稿すると、あなたの旗を立てます',
      'globe.search.placeholder':'作者を検索…','globe.stats':'{countries}か国の{count}人の作者',
      'globe.empty':'まだ貢献者はいません。最初の旗を立てましょう','globe.nowebgl':'この端末は WebGL に対応していません。リストを表示します。',
      'globe.error':'地球を読み込めませんでした：{msg}','globe.network':'ネットワークエラー','globe.retry':'再試行','globe.close':'閉じる',
      'globe.work':'作品を見る · {title}','embed.title':'ページに埋め込む',
      'embed.note':'下のコードをコピーすると、作品をページに表示できます。スタイルは専用コンテナ内に収まり、ページのレイアウトには影響しません。',
      'embed.note.daylight':'作品はこのスクリプトの上に表示されます。data-scene を countryside / japanese-street / apartment / seaside / mountain-cabin に変更すると別のシーンを表示できます。',
      'embed.note.orbit':'data-scene で countryside、planet、world を選択し、data-composition で art（ホーム表示用の切り抜き）または full（リング全体）を選択します。',
      'embed.copy':'コピー','embed.copied':'コピーしました','explore.title':'もっと見る',
      'orbit.version.planet':'惑星','orbit.version.countryside':'田園','orbit.version.world':'リングワールド',
      'orbit.note.planet':'球体地形 · 昼夜の軌道','orbit.note.countryside':'田舎の家 · 昼夜の移り変わり','orbit.note.world':'168 px · 昼夜ダイヤル',
      'scene.countryside':'田舎の家','scene.japanese-street':'日本の街並み','scene.apartment':'モダンなアパート',
      'scene.seaside':'海辺の灯台','scene.mountain-cabin':'山小屋',
      'action.bookmark':'作品をブックマーク','action.expand':'作品エリアを拡大','action.restore':'作品の詳細に戻る',
      'action.close':'作品の詳細を閉じる','site.version':'サイトバージョン'
    };

    // [字符串 key, 目标选择器, 属性名(留空表示改文本)]
    const targets = [
      ['nav.settings', '#settings-toggle', 'aria-label'],
      ['layout.toggle.two', '#layout-toggle', 'aria-label'],
      ['layout.toggle.two', '#layout-toggle', 'title'],
      ['nav.language', '#language-toggle', 'aria-label'],
      ['account.entry', '#account-entry'],
      ['settings.title', '.settings-title-label'],
      ['mario.home', '#nav-home', 'aria-label'],
      ['mario.compass', '.mario-block.block-brick', 'aria-label'],
      ['mario.bookmarks', '#nav-bookmark', 'aria-label'],
      ['folders.new', '#folder-new-label'],
      ['folders.back', '#bookmarks-back', 'aria-label'],
      ['folders.empty', '#folder-hint'],
      ['search.placeholder', '#search-input', 'placeholder'],
      ['search.label', '#search-input', 'aria-label'],
      ['empty.title', '#empty-state .empty-title'],
      ['card.daylight', '#lighthouse-card .card-title'],
      ['card.orbit', '#pixel-orbit-card .card-title'],
      ['card.daylight.aria', '#lighthouse-card', 'aria-label'],
      ['card.orbit.aria', '#pixel-orbit-card', 'aria-label'],
      ['tag.pixel', '#detail-panel .work-tag'],
      ['tag.pixel', '#orbit-detail-panel .work-tag'],
      ['detail.daylight', '#detail-title'],
      ['detail.orbit', '#orbit-detail-title'],
      ['detail.daylight.description', '#detail-panel .detail-description'],
      ['detail.orbit.description', '#orbit-detail-panel .detail-description'],
      ['project.link', '#detail-panel .project-link span:first-of-type'],
      ['project.link', '#orbit-detail-panel .project-link span:first-of-type'],
      ['gallery.scenes', '#detail-panel .gallery-heading h2'],
      ['gallery.versions', '#orbit-detail-panel .gallery-heading h2'],
      ['compare.toggle', '#compare-toggle'],
      ['compare.hint', '.compare-hint'],
      ['compare.selected', '.cmp-ring-badge'],
      ['contributors.title', '.creator-link-label'],
      ['compass.view.title', '#compass-view-title'],
      ['compass.view.note', '.compass-view-note'],
      ['embed.title', '#detail-panel .embed-snippet h2'],
      ['embed.title', '#orbit-detail-panel .embed-snippet h2'],
      ['embed.note', '#detail-panel .embed-note:not(:last-child)'],
      ['embed.note.daylight', '#detail-panel .embed-note:last-child'],
      ['embed.note.orbit', '#orbit-detail-panel .embed-note:last-child'],
      ['embed.copy', '#detail-panel .code-copy'],
      ['embed.copy', '#orbit-detail-panel .code-copy'],
      ['explore.title', '#detail-panel .inline-experience-section > h2'],
      ['action.bookmark', '#bookmark-card', 'aria-label'],
      ['action.expand', '#expand-artwork', 'aria-label'],
      ['action.close', '#close-card', 'aria-label'],
      ['site.version', '.site-version', 'aria-label']
    ];

    // 视觉版本：英文按 data 属性取值，中文从 DOM 读
    const orbitVersions = {
      planet: ['orbit.version.planet', 'orbit.note.planet'],
      countryside: ['orbit.version.countryside', 'orbit.note.countryside'],
      world: ['orbit.version.world', 'orbit.note.world']
    };
    // 场景选择：英文按 data 属性取值，中文从 DOM 读
    const scenes = {
      countryside: 'scene.countryside',
      'japanese-street': 'scene.japanese-street',
      apartment: 'scene.apartment',
      seaside: 'scene.seaside',
      'mountain-cabin': 'scene.mountain-cabin'
    };

    let language = (() => { try { const saved = localStorage.getItem('site-language'); return ['zh','en','ja'].includes(saved) ? saved : 'zh'; } catch (_) { return 'zh'; } })();
    const original = new Map();

    const remember = (key, el, attr) => {
      if (!original.has(key)) original.set(key, attr ? el.getAttribute(attr) : el.textContent);
      return original.get(key);
    };
    const put = (key, el, attr, lang) => {
      if (!el || !strings[key]) return;
      const zh = remember(key, el, attr);
      const translated = lang === 'en' ? strings[key] : lang === 'ja' ? (japanese[key] || strings[key]) : zh;
      if (attr) el.setAttribute(attr, translated);
      else el.textContent = translated;
    };

    const apply = lang => {
      targets.forEach(([key, selector, attr]) => {
        // 一个选择器可能命中多个元素（比如两个详情面板各有一个贡献者按钮），
        // 以前只用 querySelector 取第一个，第二个面板在英文态就留了中文。
        document.querySelectorAll(selector).forEach(el => put(key, el, attr, lang));
      });
      document.querySelectorAll('[data-orbit-version]').forEach(el => {
        const pair = orbitVersions[el.dataset.orbitVersion];
        if (!pair) return;
        put(pair[0], el.querySelector('strong'), null, lang);
        put(pair[1], el.querySelector('.orbit-scene-note'), null, lang);
      });
      document.querySelectorAll('[data-scene-choice]').forEach(el => {
        put(scenes[el.dataset.sceneChoice], el.querySelector('strong'), null, lang);
      });
    };

    // 给 main.js 用的取词接口（动态文案：搜索状态、空状态、放大按钮）
    window.siteI18n = {
      get lang() { return language; },
      t(key, vars) {
        let value = language === 'ja' ? (japanese[key] || strings[key]) : strings[key];
        if (value == null) return null;
        if (vars) {
          Object.keys(vars).forEach(name => {
            value = value.split('{' + name + '}').join(vars[name]);
          });
        }
        return value;
      }
    };

    button.addEventListener('click', () => {
      language = language === 'zh' ? 'en' : language === 'en' ? 'ja' : 'zh';
      try { localStorage.setItem('site-language', language); } catch (_) {}
      apply(language);
      document.documentElement.lang = language === 'en' ? 'en' : language === 'ja' ? 'ja' : 'zh-CN';
      button.textContent = language === 'zh' ? 'EN' : language === 'en' ? '日本語' : '中文';
      button.setAttribute('aria-label', language === 'ja' ? '言語を切り替え' : language === 'en' ? 'Switch language' : '切换语言');
      // 动态文案（搜索状态 / 空状态 / 放大按钮）由 main.js 重新渲染
      document.dispatchEvent(new CustomEvent('site:languagechange', { detail: { language } }));
    });
    document.documentElement.lang = language === 'en' ? 'en' : language === 'ja' ? 'ja' : 'zh-CN';
    button.textContent = language === 'zh' ? 'EN' : language === 'en' ? '日本語' : '中文';
    apply(language);
    if (language !== 'zh') document.dispatchEvent(new CustomEvent('site:languagechange', { detail: { language } }));
  })();
