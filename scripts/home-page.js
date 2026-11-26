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
      'layout.toggle.two': 'Add one column',
      'layout.toggle.auto': 'Restore default columns',
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

      'card.globe': 'Contributors Globe','card.corridor': 'The Bookmark Hall','card.navigation': 'Navigation Interaction System',
      'card.globe.aria': 'Open Contributors Globe details','card.corridor.aria': 'Open Bookmark Hall details','card.navigation.aria': 'Open Navigation Interaction System details',
      'detail.globe': 'Contributors Globe','detail.corridor': 'The Bookmark Hall','detail.navigation': 'Navigation Interaction System',
      'detail.globe.description': 'Bring open-source contributors onto an explorable globe. Rotate the planet, inspect flags and avatars, search for authors, and open their work directly from each profile. It turns collaboration hidden in a code repository into a world you can explore.',
      'detail.corridor.description': 'Turn a flat bookmark list into a space you can walk through. The hall is rendered in real time with a Canvas 2D ray caster; saved works become framed pictures along the walls. Follow the golden line, stop in front of a work, and open the original live experience.',
      'detail.navigation.description': 'A three-part navigation system built from pixel-like blocks: Home, Compass and Bookmarks. These are more than icons: each has a clear state, tactile feedback, view transitions and navigation history.',
      'feature.globe.title': 'Explore the globe',
      'feature.globe.description': 'Rotate and explore the globe, inspect contributor markers and profiles, search for authors, and switch between day and night. The embed starts with an empty data set and hides the submission entry by default.',
      'feature.corridor.title': 'Spatial experience',
      'feature.corridor.description': 'Move through the hall and browse framed works along the walls. The host page supplies the bookmark data; the component does not read visitors’ accounts or local storage.',
      'feature.navigation.title': 'Interaction samples',
      'feature.navigation.description': 'Explore 24 pixel-style button samples. Each control supports pointer and keyboard interaction; clicks emit a selection event without taking over your site’s routing.',
      'tag.interaction': 'Interaction','tag.visualization': 'Data visualization','tag.spatial': 'Spatial interaction','tag.pixelart': 'Procedural pixel art','tag.interface': 'Interface design','tag.micro': 'Micro-interactions',
      'action.open.globe': 'Explore the globe in Compass','action.open.corridor': 'Enter the Bookmark Hall','action.open.home': 'Return to Home and view navigation',

      'card.daylight.aria': 'Open Pixel Daylight Switch details',
      'card.orbit.aria': 'Open Pixel Orbit details',
      'tag.pixel': 'Pixel art',
      'detail.daylight': 'Pixel Daylight Switch',
      'detail.orbit': 'Pixel Orbit',
      'detail.daylight.description': 'A miniature pixel world inside a refractive glass switch. Move the switch to transition naturally from day through dusk into night. The seaside lighthouse is one of its interactive scenes.',
      'detail.orbit.description': 'A tiny pixel world that changes with time. Drag the ring or adjust the time to watch the sky, sun, moon, clouds and house lights shift from morning to midnight.',
      'project.link': 'View project',
      'feature.daylight.scale.title': 'The Scale of a Switch',
      'feature.daylight.scale.p1': 'I wanted to keep the direct, unmistakable feel of a physical switch while letting it carry something softer. The square border provides order, the flowing light provides mood; the two together give this piece its character.',
      'feature.daylight.scale.p2': 'It suits a quick look and it suits repeated use: every flick is a small journey from day to night.',
      'feature.daylight.time.title': 'Turning Time',
      'feature.daylight.time.p1': 'This is not a button that only switches on and off. It turns time into a process you can touch: day, dusk and night stop being three separate states and become one graded, atmospheric shift of light.',
      'feature.daylight.time.p2': 'The scene is not a backdrop but the carrier of the change. The same point in time feels different in a different space.',
      'feature.orbit.composition.title': 'More Than One Composition',
      'feature.orbit.composition.p1': 'The planet edition stresses the spherical feel of a whole world, the countryside edition pulls the view back to a familiar everyday scale, and the ring-world edition turns the orbit itself into the main subject.',
      'feature.orbit.composition.p2': 'The editions are not simple skins. Each one answers the same question with a different composition: how can a change in time be made visible?',
      'feature.orbit.motion.title': 'Setting the World in Motion',
      'feature.orbit.motion.p1': 'The pixel ring turns time into an orbit you can actually operate. What it cares about is not a simple day-and-night switch, but how a world keeps changing over time: the colour of the sky, the position of the sun and moon, and the brightness of the window lights.',
      'feature.orbit.motion.p2': 'The ring is both the scale of time and the organising principle of the scene. It gives abstract time a place, a direction and a distance.',
      'feature.globe.place.title': 'Giving Data a Location',
      'feature.globe.place.p1': 'A place on the map stops data from being just another column. The globe shows the overall relationships, the markers provide the way in, and the profiles fill in the details: read the distribution from afar, then move closer to meet the individuals.',
      'feature.globe.place.p2': 'This piece is meant to be explored slowly rather than read in one go.',
      'feature.globe.names.title': 'From Names to a World',
      'feature.globe.names.p1': 'A repository records collaboration, but it rarely shows the spatial relationships between the people involved. The contributors globe turns that information into markers on a globe, so every exploration becomes a discovery.',
      'feature.globe.names.p2': 'It is a rotatable geographic canvas and also a way of looking at an open-source community. Drag the globe to change your view, find a marker, select it to read the contributor\'s profile, then follow the profile card to the related work.',
      'feature.corridor.roam.title': 'Bookmarks Can Be Walked',
      'feature.corridor.roam.p1': 'The hall turns a flat list into a space with direction and distance. Distant frames catch your eye, and the closer you get the more they invite you in, so browsing picks up a rhythm.',
      'feature.corridor.roam.p2': 'It is not meant to replace every list, but to offer bookmarks another way of being opened — one with more space.',
      'feature.corridor.archive.title': 'Walking Into the Archive',
      'feature.corridor.archive.p1': 'The bookmark hall tries to change how a traditional list of bookmarks is read. It puts the entries into an explorable space, where moving and looking reveal the content instead of scrolling endlessly through a stack of cards.',
      'feature.corridor.archive.p2': 'The space itself becomes the index, and each frame is a way into a piece of work. The hall only shows data the host page hands it; it never reads a visitor\'s account or local bookmarks.',
      'feature.navigation.character.title': 'Giving Buttons a Personality',
      'feature.navigation.character.p1': 'A button is more than a container for an icon. The shift on press, the rhythm of the rebound and the feedback after the trigger all change how the interface feels.',
      'feature.navigation.character.p2': 'This system uses 24 pixel buttons as samples to explore their press animations and state changes separately. Each button can carry its own timing, and they can also be combined and linked.',
      'gallery.scenes': 'Scenes',
      'gallery.versions': 'Visual versions',
      'compare.title': 'Scene compare',
      'compare.hint': 'Tap the frame to pick which view the scene picker changes — the artwork itself stays interactive.',
      'compare.selected': 'Selected',
      'compare.selectMain': 'Select main view',
      'compare.selectSub': 'Select compare view',
      'compare.toggle': 'Version compare',
      'contributors.title': 'View developer',
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
      'embed.note.globe': 'The submission entry is disabled in this snippet. To show your own contributors, point data-contributors-src to an HTTPS JSON file you host.',
      'embed.note.corridor': 'Call setItems() with your own bookmark array. Replace the example title and URL; the component does not read visitors’ bookmarks.',
      'embed.note.navigation': 'This loads all 24 samples. Use data-sample="7" for one button or data-samples="0,2,7,14" for a selection.',
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
      'bookmarks.eyebrow': 'YOUR PERSONAL COLLECTION',
      'bookmarks.title.main': 'Keep what you love,',
      'bookmarks.title.accent': 'close at hand.',
      'bookmarks.note': 'Keep the work you love close. Create folders and organise the things you want to revisit.',
      'site.version': 'Site version'
    };

    const japanese = {
      'nav.contributors':'クリエイター・貢献者',
      'nav.settings':'設定','layout.toggle.two':'列を1つ増やす','layout.toggle.auto':'既定の列数に戻す',
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

      'card.globe':'Contributors Globe','card.corridor':'The Bookmark Hall','card.navigation':'Navigation Interaction System',
      'card.globe.aria':'Contributors Globe の詳細を開く','card.corridor.aria':'Bookmark Hall の詳細を開く','card.navigation.aria':'Navigation Interaction System の詳細を開く',
      'detail.globe':'Contributors Globe','detail.corridor':'The Bookmark Hall','detail.navigation':'Navigation Interaction System',
      'detail.globe.description':'オープンソースの貢献者を、探索できる地球上に表示します。地球を回転し、旗やアバターを確認し、作者を検索して、その人の作品へ直接移動できます。',
      'detail.corridor.description':'ブックマークの一覧を、歩いて進める空間へ。Canvas 2D のレイキャスティングで回廊をリアルタイムに描き、保存した作品を壁の額縁として展示します。',
      'detail.navigation.description':'ホーム、コンパス、ブックマーク。3つのピクセル風ブロックで構成されたナビゲーションです。状態、押下フィードバック、画面切り替え、履歴を備えています。',
      'feature.globe.title':'地球を探索',
      'feature.globe.description':'地球を回転させ、投稿者のマーカーやプロフィールを確認できます。作者の検索や昼夜の切り替えにも対応。埋め込み時はデータが空で、投稿入口は初期状態で非表示です。',
      'feature.corridor.title':'空間体験',
      'feature.corridor.description':'回廊を進み、壁に並ぶ額縁の作品を閲覧できます。ブックマーク情報はホストページから渡され、訪問者のアカウントやローカルストレージは読み取りません。',
      'feature.navigation.title':'インタラクションサンプル',
      'feature.navigation.description':'ピクセル風ボタンのサンプルを24種類収録。マウスとキーボードで操作でき、クリック時は選択イベントを通知するだけで、サイトのルーティングを乗っ取りません。',
      'tag.interaction':'インタラクション','tag.visualization':'データビジュアライゼーション','tag.spatial':'空間インタラクション','tag.pixelart':'プロシージャル・ピクセルアート','tag.interface':'インターフェースデザイン','tag.micro':'マイクロインタラクション',
      'action.open.globe':'コンパスで地球を探索','action.open.corridor':'ブックマーク回廊へ','action.open.home':'ホームに戻ってナビゲーションを見る',

      'card.daylight.aria':'Pixel Daylight Switch の詳細を開く','card.orbit.aria':'Pixel Orbit の詳細を開く',
      'tag.pixel':'ピクセルアート','detail.daylight':'Pixel Daylight Switch','detail.orbit':'Pixel Orbit',
      'detail.daylight.description':'屈折するガラススイッチの中に広がる小さなピクセルの世界。スイッチを動かすと、昼から夕暮れ、夜へと自然に移り変わります。海辺の灯台は操作できるシーンのひとつです。',
      'detail.orbit.description':'時間とともに変化する小さなピクセル世界。リングをドラッグしたり時刻を調整したりして、朝から真夜中まで空や太陽、月、雲、家の明かりの変化を楽しめます。',
      'feature.daylight.scale.title': 'スイッチの尺度',
      'feature.daylight.scale.p1': '実物のスイッチが持つ明確な手触りを残しつつ、もっと柔らかな変化を乗せたいと思いました。角形の境界が秩序を担い、流れる光が感情を担います。その二つが出会って、この作品の性格になります。',
      'feature.daylight.scale.p2': '短暂く留まるにも、繰り返し触るにも向いています。ひねるたびに、小さな一日中の旅が始まります。',
      'feature.daylight.time.title': '時をひねる',
      'feature.daylight.time.p1': 'オンとオフを切り替えるだけのボタンではありません。時間を、触れて確かめられる連続の過程に変えます。白昼、黄昏、夜は孤立した三つの状態ではなく、遷移と感情を持った一つの光の変化になります。',
      'feature.daylight.time.p2': 'シーンは背景ではなく、変化を運ぶ器です。同じ時間でも、空間が違えば受け取り方が変わります。',
      'feature.orbit.composition.title': '构图は一つではない',
      'feature.orbit.composition.p1': '惑星版は世界の球面感を強調し、田舎版は視線を日常生活の縮尺へ戻し、環世界版は軌道そのものを主役にします。',
      'feature.orbit.composition.p2': '各版は単なる着せ替えではありません。異なる構図で同じ問いに答えます。時間の変化をどう見せるか。',
      'feature.orbit.motion.title': '世界を回す',
      'feature.orbit.motion.p1': 'ピクセルリングは、操作できる軌道として時間を具体化します。単純な昼夜切り替えではなく、世界が時間とともにどう変わり続けるかを見つめます。空の色、太陽と月の位置、家の灯りの明暗。',
      'feature.orbit.motion.p2': 'リングは時間の目盛りであり、シーンを組み立てる原理でもあります。抽象的な時間に、位置と方向と距離を与えます。',
      'feature.globe.place.title': 'データに場所を',
      'feature.globe.place.p1': '地理位置があれば、データは表の列の一つではなくなります。球体が全体の関係を示し、マーカーが入口になり、プロフィールが具体的な情報を補います。遠い場所から分布を読み取り、近づいて一人ずつ確かめていく姿です。',
      'feature.globe.place.p2': 'この作品は、一度に読み切るのではなく、ゆっくり探しながら楽しむことを想定しています。',
      'feature.globe.names.title': '名前から世界へ',
      'feature.globe.names.p1': 'リポジトリは協業を記録しますが、協力者同士の空間的な関係を目で捉えることはほとんどありません。投稿者地球は、その情報を地球上のマーカーへ変え、探索のたびに発見が生まれます。',
      'feature.globe.names.p2': '回転できる地理のキャンバスであり、オープンソースコミュニティの見る一つの方法です。地球をドラッグして視点を動かし、マーカーを探し、選んで投稿者のプロフィールを読み、そこから関連作品へ進みます。',
      'feature.corridor.roam.title': 'コレクションも歩ける',
      'feature.corridor.roam.p1': '回廊は二次元のリストを、方向と距離のある空間へ変えます。遠くの額縁が視線を引き、近づくと内容が次の入口になり、閲覧にリズムが生まれます。',
      'feature.corridor.roam.p2': 'すべてのリストを置き換えるものではなく、コレクションにもう一つの、空間感のある開き方を提供します。',
      'feature.corridor.archive.title': 'コレクションへ入る',
      'feature.corridor.archive.p1': 'コレクション回廊は、従来のブックマーク一覧の読み方を変えようとします。項目を探索できる空間に入れ、スクロールし続けるのではなく、動きと観察で中身を見つけていきます。',
      'feature.corridor.archive.p2': '空間そのものが索引になり、額縁が作品への入口になります。回廊はホストページが渡したデータだけを表示し、閲覧者のアカウントやローカル保存は読みません。',
      'feature.navigation.character.title': 'ボタンに性格を与える',
      'feature.navigation.character.p1': 'ボタンはアイコンを入れる器ではありません。押したときの位移、戻るときのリズム、反応が返ったときのフィードバックが、界面の感じ方を左右します。',
      'feature.navigation.character.p2': 'このシステムでは 24 個のピクセルボタンをサンプルとして、それぞれの押下アニメーションと状態変化を単体で探ります。ボタンごとに固有のタイミングを持たせることも、組み合わせたり連動させることもできます。',
      'project.link':'プロジェクトを見る','gallery.scenes':'シーン','gallery.versions':'ビジュアルバージョン',
      'compare.title':'シーン比較','compare.hint':'フレームをタップして、シーン選択を適用する表示を選びます。作品自体はそのまま操作できます。',
      'compare.selected':'選択中','compare.selectMain':'メイン表示を選択','compare.selectSub':'比較表示を選択','compare.toggle':'バージョン比較',
      'contributors.title':'開発者を見る','compass.view.title':'コンパス','compass.view.note':'地球を展開しています…',
      'globe.view.title':'貢献者の地球','globe.loading':'地球を展開しています…','globe.night':'夜景','globe.day':'昼景',
      'globe.cta':'＋ 自分の旗を追加','globe.cta.title':'GitHub から投稿すると、あなたの旗を立てます',
      'globe.search.placeholder':'作者を検索…','globe.stats':'{countries}か国の{count}人の作者',
      'globe.empty':'まだ貢献者はいません。最初の旗を立てましょう','globe.nowebgl':'この端末は WebGL に対応していません。リストを表示します。',
      'globe.error':'地球を読み込めませんでした：{msg}','globe.network':'ネットワークエラー','globe.retry':'再試行','globe.close':'閉じる',
      'globe.work':'作品を見る · {title}','embed.title':'ページに埋め込む',
      'embed.note':'下のコードをコピーすると、作品をページに表示できます。スタイルは専用コンテナ内に収まり、ページのレイアウトには影響しません。',
      'embed.note.daylight':'作品はこのスクリプトの上に表示されます。data-scene を countryside / japanese-street / apartment / seaside / mountain-cabin に変更すると別のシーンを表示できます。',
      'embed.note.orbit':'data-scene で countryside、planet、world を選択し、data-composition で art（ホーム表示用の切り抜き）または full（リング全体）を選択します。',
      'embed.note.globe':'このコードでは投稿入口を無効にしています。自分の投稿者を表示するには、data-contributors-src に自分でホストした HTTPS の JSON ファイルを指定してください。',
      'embed.note.corridor':'setItems() に自分のブックマーク配列を渡してください。サンプルのタイトルと URL は置き換えてください。訪問者のブックマークは読み取りません。',
      'embed.note.navigation':'24種類すべてを表示します。data-sample="7" で1つだけ、data-samples="0,2,7,14" で複数を選択できます。',
      'embed.copy':'コピー','embed.copied':'コピーしました','explore.title':'もっと見る',
      'orbit.version.planet':'惑星','orbit.version.countryside':'田園','orbit.version.world':'リングワールド',
      'orbit.note.planet':'球体地形 · 昼夜の軌道','orbit.note.countryside':'田舎の家 · 昼夜の移り変わり','orbit.note.world':'168 px · 昼夜ダイヤル',
      'scene.countryside':'田舎の家','scene.japanese-street':'日本の街並み','scene.apartment':'モダンなアパート',
      'scene.seaside':'海辺の灯台','scene.mountain-cabin':'山小屋',
      'action.bookmark':'作品をブックマーク','action.expand':'作品エリアを拡大','action.restore':'作品の詳細に戻る',
      'action.close':'作品の詳細を閉じる',
      'bookmarks.eyebrow':'YOUR PERSONAL COLLECTION',
      'bookmarks.title.main':'好きな作品を、',
      'bookmarks.title.accent':'ここに大切に。',
      'bookmarks.note':'また見たい作品をここに残しましょう。フォルダーを作って、自分らしく整理できます。',
      'site.version':'サイトバージョン'
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
      ['bookmarks.eyebrow', '.bookmark-eyebrow-text'],
      ['bookmarks.title.main', '.bookmark-title-main'],
      ['bookmarks.title.accent', '.bookmark-title-accent'],
      ['bookmarks.note', '.bookmark-intro-note'],
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

      ['card.globe', '#contributors-globe-card .card-title'],['card.corridor', '#bookmarks-corridor-card .card-title'],['card.navigation', '#navigation-system-card .card-title'],
      ['card.globe.aria', '#contributors-globe-card', 'aria-label'],['card.corridor.aria', '#bookmarks-corridor-card', 'aria-label'],['card.navigation.aria', '#navigation-system-card', 'aria-label'],
      ['detail.globe', '#globe-work-title'],['detail.corridor', '#corridor-work-title'],['detail.navigation', '#navigation-work-title'],
      ['detail.globe.description', '#globe-work-panel .detail-description'],['detail.corridor.description', '#corridor-work-panel .detail-description'],['detail.navigation.description', '#navigation-work-panel .detail-description'],
      ['tag.interaction', '#globe-work-panel .portfolio-tag:first-child'],['tag.visualization', '#globe-work-panel .portfolio-tag:last-child'],
      ['tag.spatial', '#corridor-work-panel .portfolio-tag:first-child'],['tag.pixelart', '#corridor-work-panel .portfolio-tag:last-child'],
      ['tag.interface', '#navigation-work-panel .portfolio-tag:first-child'],['tag.micro', '#navigation-work-panel .portfolio-tag:last-child'],
      ['action.open.globe', '[data-open-site-view="globe"] span:first-child'],['action.open.corridor', '[data-open-site-view="bookmarks"] span:first-child'],['action.open.home', '[data-open-site-view="home"] span:first-child'],

      ['tag.pixel', '#detail-panel .work-tag'],
      ['tag.pixel', '#orbit-detail-panel .work-tag'],
      ['detail.daylight', '#detail-title'],
      ['detail.orbit', '#orbit-detail-title'],
      ['detail.daylight.description', '#detail-panel .detail-description'],
      ['detail.orbit.description', '#orbit-detail-panel .detail-description'],
      ['project.link', '#detail-panel .project-link span:first-of-type'],
      ['project.link', '#orbit-detail-panel .project-link span:first-of-type'],
      ['project.link', '#globe-work-panel .detail-actions > a.project-link span:first-of-type'],
      ['project.link', '#corridor-work-panel .detail-actions > a.project-link span:first-of-type'],
      ['project.link', '#navigation-work-panel .detail-actions > a.project-link span:first-of-type'],
      ['gallery.scenes', '#detail-panel > .gallery-heading h2'],
      ['gallery.versions', '#orbit-detail-panel > .gallery-heading h2'],
      ['compare.toggle', '#compare-toggle'],
      ['compare.hint', '.compare-hint'],
      ['compare.selected', '.cmp-ring-badge'],
      ['contributors.title', '.creator-link-label'],
      ['feature.globe.title', '#globe-feature-title'],
      ['feature.globe.description', '#globe-work-panel > .detail-feature:first-of-type > p:first-of-type'],
      ['feature.corridor.title', '#corridor-feature-title'],
      ['feature.corridor.description', '#corridor-work-panel > .detail-feature:first-of-type > p:first-of-type'],
      ['feature.navigation.title', '#navigation-feature-title'],
      ['feature.navigation.description', '#navigation-work-panel > .detail-feature:first-of-type > p:first-of-type'],
      ['compass.view.title', '#compass-view-title'],
      ['compass.view.note', '.compass-view-note'],
      ['embed.title', '#detail-panel .embed-snippet h2'],
      ['embed.title', '#orbit-detail-panel .embed-snippet h2'],
      ['embed.title', '#globe-work-panel .embed-snippet h2'],
      ['embed.title', '#corridor-work-panel .embed-snippet h2'],
      ['embed.title', '#navigation-work-panel .embed-snippet h2'],
      ['embed.note', '#detail-panel .embed-note:not(:last-child)'],
      ['embed.note.daylight', '#detail-panel .embed-note:last-child'],
      ['embed.note.orbit', '#orbit-detail-panel .embed-note:last-child'],
      ['embed.note.globe', '#globe-work-panel .embed-note'],
      ['embed.note.corridor', '#corridor-work-panel .embed-note'],
      ['embed.note.navigation', '#navigation-work-panel .embed-note'],
      ['embed.copy', '#detail-panel .code-copy'],
      ['embed.copy', '#orbit-detail-panel .code-copy'],
      ['embed.copy', '#globe-work-panel .code-copy'],
      ['embed.copy', '#corridor-work-panel .code-copy'],
      ['embed.copy', '#navigation-work-panel .code-copy'],
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
    // 中文原文按「元素」缓存，不按 key 缓存。
    // 同一个 key 可能命中多个元素（例如选择器写宽了，命中了面板里的全部段落）。
    // 若按 key 缓存，缓存里只会留下第一个元素的中文，
    // 切回中文时其余元素会被写成同一句话——段落就重复了。
    const original = new WeakMap();

    const remember = (el, attr) => {
      if (!original.has(el)) original.set(el, attr ? el.getAttribute(attr) : el.textContent);
      return original.get(el);
    };
    const put = (key, el, attr, lang) => {
      if (!el || !strings[key]) return;
      const zh = remember(el, attr);
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
      // 通用翻译入口：HTML 里标了 data-i18n 的元素按 key 查表。
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) put(key, el, null, lang);
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
