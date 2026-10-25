// أبطال الغابة — الشاشات والتفاعل
(() => {
  const app = document.getElementById('app');
  let round = null;       // الجولة الجارية (تدريب، إحماء، سباق، مراجعة)
  let lastRound = null;   // لإعادة نفس الجولة من شاشة النتائج
  let duel = null;        // سباق الإخوة الجاري على شاشة مقسومة
  let brain = null;       // تحدّي العقل الجاري: ثلاث ألعاب قصيرة متتالية
  let duelPicks = [];     // الطفلان المختاران لسباق الإخوة
  let duelLand = 'mul';    // غابة سباق الإخوة ومبارزة العقول: يختارها من يبدأ التحدي، والكل يلعب فيها
  let duelMode = 'net';   // 'net' عدة أجهزة (الافتراضي) | 'local' تابلت واحد
  let duelKind = 'race';  // 'race' سباق النهر | 'brain' مبارزة العقول (على جهاز واحد فقط)
  let netPending = null;  // دعوة سباق على عدة أجهزة قبل أن يبدأ: { id, role, pid }
  let newAvatar = AVATARS[0];
  let welcomeSkipped = false;   // اختار «متابعة بدون مزامنة» في هذه المرة

  // لوحة ولي الأمر
  let parentOK = false;   // فُتحت بالرمز في هذه الزيارة
  let pinStage = null;    // 'enter' | 'new' | 'confirm'
  let pinBuffer = '';
  let pinFirst = '';
  let parentKid = null;
  let kidPinShown = false; // ولي الأمر أظهر رمز الطفل المختار
  let parentWorld = 'mul'; // الغابة المعروضة في تقرير الطفل
  let boardWorld = 'mul';  // الغابة المعروضة في لوحة المتصدرين

  // رمز دخول الطفل: { mode: 'login'|'create'|'change', id, name, avatar, stage: 'enter'|'old'|'new'|'confirm', buf, first }
  let kidPin = null;

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ltr = s => `<span dir="ltr">${s}</span>`;
  const $ = id => document.getElementById(id);
  const allItems = () => ITEMS.concat(RARE_ITEMS);
  const any = list => list[Math.floor(Math.random() * list.length)];

  // الشريط السفلي للتنقل بين الشاشات الرئيسية (لا يظهر في الجولات والسباقات)
  const TABS = [
    { name: 'camp', icon: '⛺', label: 'المخيّم' },
    { name: 'map', icon: '🗺️', label: 'الخريطة' },
    { act: 'startRace', icon: '🏃', label: 'السباق' },
    { name: 'shop', icon: '🎒', label: 'المتجر' },
    { name: 'performance', icon: '📊', label: 'أدائي' },
  ];
  const TAB_SCREENS = new Set(['camp', 'map', 'shop', 'animals', 'diary', 'performance', 'ranks', 'worlds']);

  function tabBar() {
    return `<nav class="tabbar">${TABS.map(t => t.act
      ? `<button class="tab" data-act="${t.act}"><span>${t.icon}</span><b>${t.label}</b></button>`
      : `<button class="tab ${nav.cur === t.name ? 'on' : ''}" data-act="go" data-arg="${t.name}"><span>${t.icon}</span><b>${t.label}</b></button>`
    ).join('')}</nav>`;
  }

  function render(html) {
    const tabs = !round && !duel && TAB_SCREENS.has(nav.cur) && !!Store.current();
    document.body.classList.toggle('bgrest', !!(round || duel || brain));
    document.body.classList.toggle('tabs', tabs);
    app.innerHTML = html + (tabs ? tabBar() : '');
    window.scrollTo(0, 0);
  }

  let toastTimer;
  function toast(msg, ms = 2200) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  function subHeader(title) {
    const p = Store.current();
    return `<header class="topbar">
      <button class="chip" data-act="go" data-arg="camp">→ المخيّم</button>
      <h2 class="topbar-title">${title}</h2>
      <div class="chip coins">🪙 <b>${p.coins}</b></div>
    </header>`;
  }

  // ما يظهر للطفل بعد الجولة: غابة جديدة أو منطقة جديدة أو حيوان
  const eventBanner = e => e.type === 'world' ? `🌍 فتحت غابة جديدة: ${e.world.icon} ${e.world.name}!`
    : e.type === 'unlock' ? `🔓 فتحت منطقة جديدة: ${e.region.icon} ${e.region.name}`
    : `🐾 اكتشفت حيواناً جديداً: ${e.region.animal.emoji} ${e.region.animal.name}`;

  // الحيوانات المكتشفة في كل الغابات (الغابة المقفلة لا تُنشأ في الملف)
  function animalCount(p) {
    const lands = WORLDS.filter(w => w.regions);
    const found = lands.filter(w => Engine.isOpen(p, w)).reduce((n, w) => n + Engine.state(p, w.id).animals.length, 0);
    return { found, total: lands.reduce((n, w) => n + w.regions.length, 0) };
  }

  const bar = pct => `<span class="bar"><i style="width:${Math.round(Math.min(pct, 1) * 100)}%"></i></span>`;

  // نموذج الاسم والشخصية: لمستكشف جديد، أو لتعديل المستكشف الحالي
  function profileForm(p) {
    newAvatar = p ? p.avatar : AVATARS[0];
    render(`<section class="screen">
      <header class="topbar"><button class="chip" data-act="go" data-arg="${p ? 'camp' : 'profiles'}">→ رجوع</button></header>
      <div class="card form-card">
        <h2>${p ? 'تعديل ملفي ✏️' : 'مستكشف جديد 🎒'}</h2>
        ${p
          // الاسم يغيّره ولي الأمر فقط من لوحته
          ? `<p class="label">اسمك: <b>${esc(p.name)}</b></p><p class="muted">لتغيير الاسم اطلب من ولي الأمر 👨‍👩‍👧</p>`
          : `<label for="nameInput">ما اسمك؟</label>
        <input id="nameInput" maxlength="20" autocomplete="off" placeholder="اكتب اسمك هنا">`}
        <p class="label">اختر شخصيتك</p>
        <div class="avatar-grid">
          ${AVATARS.map(a => `<button class="avatar-btn ${a === newAvatar ? 'selected' : ''}" data-act="pickAvatar" data-arg="${a}">${a}</button>`).join('')}
        </div>
        <button class="btn green wide" data-act="saveProfile" data-arg="${p ? 'edit' : ''}">${p ? 'حفظ التغييرات ✅' : 'التالي: الرمز السري 🔒'}</button>
        ${p ? '<button class="link-btn dark" data-act="changeKidPin">🔑 تغيير رمز الدخول</button>' : ''}
      </div>
    </section>`);
    setTimeout(() => $('nameInput') && $('nameInput').focus(), 50);
  }

  // ───────────── الشاشات ─────────────
  const Screens = {
    // تُعرض عند فتح اللعبة إذا لم يسجّل ولي الأمر دخوله على هذا الجهاز
    welcome() {
      render(`<section class="screen welcome">
        <header class="hero-title">
          <div class="logo">🌴🧭🌴</div>
          <h1>أبطال الغابة</h1>
        </header>
        <div class="card welcome-card">
          <div class="welcome-icon">☁️</div>
          <h2>سجّل دخول ولي الأمر</h2>
          <p>ليظهر تقدّم الأطفال نفسه على اللابتوب والتابلت، ولا يضيع إذا تغيّر الجهاز.</p>
          <button class="btn green wide google-btn" data-act="syncIn">
            <span class="g-logo">G</span> تسجيل الدخول بحساب Google
          </button>
          <p class="muted">مرة واحدة فقط على كل جهاز، بنفس الحساب.</p>
          <button class="link-btn dark" data-act="skipWelcome">متابعة بدون مزامنة ←</button>
        </div>
      </section>`);
    },

    profiles() {
      const list = Store.state.profiles;
      // من يعود إلى هنا يحتاج رمز الطفل ليدخل ملفه من جديد
      Store.select(null);
      render(`<section class="screen">
        <header class="hero-title">
          <div class="logo">🌴🧭🌴</div>
          <h1>أبطال الغابة</h1>
          <p>من المستكشف اليوم؟</p>
        </header>
        <div class="profile-grid compact">
          ${list.map(p => `<button class="profile-card" data-act="selectProfile" data-arg="${p.id}">
              <span class="avatar">${p.avatar}</span>
              <b>${esc(p.name)}</b>
            </button>`).join('')}
        </div>
        ${list.length >= 2 ? '<button class="btn orange wide duel-btn" data-act="duelSetup">⚔️ سباق الإخوة</button>' : ''}
        ${leaderboard(list)}
        ${compareCard(list, false)}
        <button class="profile-card add new-explorer" data-act="go" data-arg="newProfile">
          <span class="avatar">➕</span><b>مستكشف جديد</b>
        </button>
        <div class="footer-links">
          <button class="link-btn" data-act="openParent">👨‍👩‍👧 ولي الأمر</button>
          ${Sync.status() === 'out' ? '<button class="link-btn" data-act="showWelcome">☁️ تفعيل المزامنة</button>' : ''}
        </div>
        ${appButtons()}
      </section>`);
    },

    newProfile() { profileForm(null); },

    // رمز الطفل: للدخول إلى ملفه، أو اختياره عند الإنشاء، أو تغييره
    kidPin() {
      const k = kidPin;
      const p = k.mode === 'create' ? k : Store.state.profiles.find(x => x.id === k.id);
      if (!p) { kidPin = null; go('home'); return; }
      const prompts = {
        enter: `أهلاً يا ${esc(p.name)}! أدخل رمزك السري`,
        old: 'أدخل رمزك الحالي',
        new: k.mode === 'login' ? 'اختر رمزاً سرياً من 4 أرقام ليحمي ملفك 🔒' : 'اختر رمزاً سرياً من 4 أرقام تتذكّره',
        confirm: 'أعد إدخال الرمز للتأكيد',
      };
      render(`<section class="screen">
        <header class="topbar"><button class="chip" data-act="go" data-arg="${k.mode === 'change' ? 'editProfile' : 'profiles'}">→ رجوع</button></header>
        <div class="card pin-card kid-pin">
          <span class="avatar">${p.avatar}</span>
          <p>${prompts[k.stage]}</p>
          <div class="pin-dots" id="kidDots">${pinDots(k.buf)}</div>
          <div class="numpad small" dir="ltr">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-act="kidPinKey" data-arg="${n}">${n}</button>`).join('')}
            <button class="key util" data-act="kidPinKey" data-arg="del" aria-label="مسح">⌫</button>
            <button class="key" data-act="kidPinKey" data-arg="0">0</button>
            <span></span>
          </div>
          ${k.stage === 'enter' || k.stage === 'old' ? '<button class="link-btn dark" data-act="forgotKidPin">نسيت الرمز؟</button>' : ''}
        </div>
      </section>`);
    },
    editProfile() { profileForm(Store.current()); },

    camp() {
      const p = Store.current();
      const s = Store.state.settings;
      const w = Engine.current(p);
      const ws = Engine.state(p, w.id);
      const rank = Engine.rankFor(ws.bestRace);
      const next = RANKS.find(r => r.min > ws.bestRace);
      const zoo = animalCount(p);
      const owned = allItems().filter(i => p.items.includes(i.id));
      const t = Journey.today(p);
      const st = Journey.streak(p);
      const nextSt = Journey.nextStation(p);
      const mins = Journey.minutesToday(p);
      const tired = s.maxMin && mins >= s.maxMin;

      render(`<section class="screen">
        <header class="topbar">
          <button class="chip" data-act="go" data-arg="profiles">🔄 تغيير</button>
          <div class="chip coins">🪙 <b>${p.coins}</b></div>
          <button class="chip" data-act="toggleMute" aria-label="الصوت">${Store.state.muted ? '🔇' : '🔊'}</button>
        </header>

        <div class="card explorer-card">
          <button class="avatar xl edit-avatar" data-act="go" data-arg="editProfile" aria-label="تعديل الاسم والشخصية">${p.avatar}<i>✏️</i></button>
          <div>
            <h2>أهلاً يا ${esc(p.name)}!</h2>
            <button class="rank-badge" data-act="go" data-arg="ranks">${rank.emoji} ${rank.name} ${ltr('‹')}</button>
            <p class="muted">${next
              ? `لتصبح ${next.emoji} ${next.name}: سجّل ${ltr(next.min)} أو أكثر في سباق النهر`
              : 'وصلت لأعلى رتبة في الغابة! 🎉'}</p>
          </div>
        </div>

        <button class="card world-card" data-act="go" data-arg="worlds">
          <span class="world-icon">${w.icon}</span>
          <span class="world-info"><b>${w.name}</b><small>عالم الغابات: ${ltr(`${Engine.openWorlds(p).length}/${WORLDS.length}`)} مفتوحة</small></span>
          <span class="world-go">🌍 تغيير ${ltr('‹')}</span>
        </button>

        ${tired ? `<div class="banner rest">⛺ المستكشف يحتاج راحة! لعبت ${ltr(mins)} دقيقة اليوم</div>` : ''}

        <div class="card expedition">
          <div class="exp-head">
            <h3>🧭 رحلة اليوم</h3>
            <span class="streak-badge" title="أيام متتالية">🔥 ${st.count}</span>
          </div>
          <div class="stations">
            ${Journey.STATIONS.map(x => {
              const cls = t.done[x.id] ? 'done' : nextSt && nextSt.id === x.id ? 'next' : '';
              return `<button class="station ${cls}" data-act="station" data-arg="${x.id}">
                <span class="st-icon">${t.done[x.id] ? '✅' : x.icon}</span><b>${x.name}</b>
              </button><span class="st-link ${t.done[x.id] ? 'done' : ''}"></span>`;
            }).join('')}
            <button class="station chest ${t.chest ? 'done' : Journey.chestReady(p) ? 'next' : ''}" data-act="chestStation">
              <span class="st-icon">${t.chest ? '🎉' : '🎁'}</span><b>الكنز</b>
            </button>
          </div>
          <div class="time-row">
            <span>⏱️ وقت اليوم</span>
            ${bar(mins / s.goalMin)}
            <span>${ltr(`${mins}/${s.goalMin}`)} دقيقة</span>
          </div>
        </div>

        <div class="card campsite">
          <h3>⛺ مخيّمك</h3>
          ${owned.length
            ? `<div class="gear">${owned.map(i => `<span class="${i.id.startsWith('r-') ? 'rare' : ''}" title="${i.name}">${i.emoji}</span>`).join('')}</div>`
            : `<p class="muted">مخيّمك فارغ! اجمع العملات واشترِ معدّات الرحلة من المتجر.</p>`}
        </div>

        <nav class="menu">
          <button class="big-btn green" data-act="go" data-arg="map">
            <span class="big-icon">🗺️</span><b>خريطة ${w.name}</b><small>تدرّب على ${w.skill}</small>
          </button>
          <button class="big-btn orange" data-act="startRace">
            <span class="big-icon">🏃</span><b>سباق النهر</b><small>دقيقة واحدة!</small>
          </button>
          <button class="big-btn pink" data-act="startBrain">
            <span class="big-icon">🧠</span><b>تحدّي العقل</b><small>${(ws.brain || {}).best ? `أفضل وزن: ${ltr(ws.brain.best)} غ` : '3 ألعاب سريعة'}</small>
          </button>
          <button class="big-btn brown" data-act="go" data-arg="shop">
            <span class="big-icon">🎒</span><b>متجر المعدّات</b><small>اشترِ أدوات الرحلة</small>
          </button>
          <button class="big-btn teal" data-act="go" data-arg="animals">
            <span class="big-icon">🐾</span><b>دفتر الحيوانات</b><small>${ltr(`${zoo.found}/${zoo.total}`)}</small>
          </button>
          <button class="big-btn purple" data-act="go" data-arg="diary">
            <span class="big-icon">📔</span><b>دفتر الرحلة</b><small>أيامك وسلسلتك</small>
          </button>
          <button class="big-btn blue" data-act="go" data-arg="performance">
            <span class="big-icon">📊</span><b>أدائي</b><small>${ltr(masteredTile(p, w).val)} متقنة</small>
          </button>
          <button class="big-btn gold" data-act="go" data-arg="ranks">
            <span class="big-icon">🏅</span><b>مسار الرتب</b><small>${ltr(`${RANKS.indexOf(rank) + 1}/${RANKS.length}`)}</small>
          </button>
        </nav>
      </section>`);
    },

    map() {
      const p = Store.current();
      const w = Engine.current(p);
      const ws = Engine.state(p, w.id);
      render(`<section class="screen">
        ${subHeader(`${w.icon} ${w.name}`)}
        <p class="hint">${w.hint}</p>
        <div class="trail-map">
          ${w.regions.map((r, i) => {
            const locked = i >= ws.unlocked;
            const m = Engine.mastery(p, r.table, w.id);
            const found = ws.animals.includes(r.table);
            return `<button class="region ${locked ? 'locked' : ''} ${found ? 'done' : ''}" data-act="startPractice" data-arg="${i}">
              <span class="region-icon">${locked ? '🔒' : r.icon}</span>
              <span class="region-info">
                <b>${r.name}</b>
                <small>${regionLabel(w, r)} · إتقان ${ltr(Math.round(m * 100) + '%')}</small>
                ${bar(m)}
              </span>
              <span class="region-animal ${found ? '' : 'hidden'}"><i>${found ? r.animal.emoji : '🐾'}</i></span>
            </button>`;
          }).join('')}
        </div>
      </section>`);
    },

    // عالم الغابات: كل غابة عملية حسابية، والمستكشف يختار أين يلعب
    worlds() {
      const p = Store.current();
      const cur = Engine.current(p);
      render(`<section class="screen">
        ${subHeader('🌍 عالم الغابات')}
        <p class="hint">كل غابة مغامرة جديدة بمناطقها وحيواناتها. عملاتك ومعدّاتك وسلسلة أيامك تبقى معك في كل الغابات!</p>
        <div class="world-list">
          ${WORLDS.map(w => {
            const open = Engine.isOpen(p, w);
            let info;
            if (w.soon) info = '🚧 قيد البناء، قريباً!';
            else if (!open) {
              const r = Engine.world(w.needs.world).regions[w.needs.regions - 1];
              info = `🔒 تُفتح عند الوصول إلى ${r.icon} ${r.name}`;
            } else {
              const ws = Engine.state(p, w.id);
              info = `🐾 ${ltr(`${ws.animals.length}/${w.regions.length}`)} · ${Engine.rankFor(ws.bestRace).emoji} ${Engine.rankFor(ws.bestRace).name}`;
            }
            return `<button class="world ${open ? '' : 'locked'} ${w === cur ? 'on' : ''}" data-act="selectWorld" data-arg="${w.id}">
              <span class="world-icon">${open ? w.icon : w.soon ? '🚧' : '🔒'}</span>
              <span class="world-info"><b>${w.name}</b><small>${info}</small></span>
              ${w === cur ? '<span class="world-here">⭐ أنت هنا</span>' : ''}
            </button>`;
          }).join('')}
        </div>
      </section>`);
    },

    shop() {
      const p = Store.current();
      render(`<section class="screen">
        ${subHeader('🎒 متجر المعدّات')}
        <p class="hint">كل مستكشف يحتاج معدّات! اشترِ ما تحب لتزيين مخيّمك.</p>
        <div class="shop-grid">
          ${ITEMS.map(i => {
            const owned = p.items.includes(i.id);
            if (!owned && i.region >= reached(p)) {
              return `<button class="item locked" data-act="buy" data-arg="${i.id}">
                <span class="item-emoji">🔒</span>
                <b>${i.name}</b>
                <small>يُفتح بعد فتح ${newRegions(i.region)}</small>
              </button>`;
            }
            const cant = !owned && p.coins < i.price;
            return `<button class="item ${owned ? 'owned' : ''} ${cant ? 'cant' : ''}" data-act="buy" data-arg="${i.id}">
              <span class="item-emoji">${i.emoji}</span>
              <b>${i.name}</b>
              <span class="price">${owned ? '✓ لديك' : `🪙 ${i.price}`}</span>
            </button>`;
          }).join('')}
        </div>
        <p class="hint">✨ هناك قطع نادرة لا تُباع هنا! تجدها في كنز رحلة اليوم والجائزة الأسبوعية.</p>

        <h3 class="shop-title">🛡️ درع السلسلة</h3>
        <div class="card shield-card">
          <span class="item-emoji">🛡️</span>
          <div>
            <b>يحمي سلسلة أيامك 🔥</b>
            <p class="muted">إذا فاتك يوم، يُستخدم الدرع تلقائياً فلا تنقطع سلسلتك. لديك ${ltr(`${p.shields || 0}/${MAX_SHIELDS}`)}</p>
          </div>
          <button class="btn orange" data-act="buyShield">🪙 ${COINS.shield}</button>
        </div>

        <h3 class="shop-title">🏠 جوائز العائلة</h3>
        ${rewards().length ? `<div class="shop-grid">${rewards().map(r => `
          <button class="item ${p.coins < r.price ? 'cant' : ''}" data-act="requestReward" data-arg="${r.id}">
            <span class="item-emoji">${r.emoji}</span>
            <b>${esc(r.name)}</b>
            <span class="price">🪙 ${r.price}</span>
          </button>`).join('')}</div>`
          : '<p class="hint">لا توجد جوائز عائلية بعد. اطلب من ولي الأمر أن يضيفها من لوحته 👨‍👩‍👧</p>'}
        ${requestsList(p)}
      </section>`);
    },

    animals() {
      const p = Store.current();
      render(`<section class="screen">
        ${subHeader('🐾 دفتر الحيوانات')}
        <p class="hint">أتقن كل منطقة بالكامل لتكتشف الحيوان الذي يعيش فيها.</p>
        ${WORLDS.filter(w => w.regions).map(w => {
          const found = Engine.isOpen(p, w) ? Engine.state(p, w.id).animals : [];
          return `<h3 class="shop-title">${w.icon} ${w.name}</h3>
          <div class="animal-grid">
          ${w.regions.map(r => {
            const ok = found.includes(r.table);
            return `<div class="animal ${ok ? 'found' : 'hidden'}">
              <span class="animal-emoji"><i>${ok ? r.animal.emoji : '🐾'}</i></span>
              <b>${ok ? r.animal.name : 'مَن أنا؟'}</b>
              <small>${r.icon} ${r.name} · ${regionLabel(w, r)}</small>
            </div>`;
          }).join('')}
          </div>`;
        }).join('')}
      </section>`);
    },

    ranks() {
      const p = Store.current();
      const w = Engine.current(p);
      const best = Engine.state(p, w.id).bestRace;
      const cur = Engine.rankFor(best);
      const next = RANKS.find(r => r.min > best);
      const prev = cur.min;
      render(`<section class="screen">
        ${subHeader('🏅 مسار الرتب')}
        <p class="hint">${w.icon} رتبتك في ${w.name}: كل رتبة تُفتح بعدد الإجابات الصحيحة في دقيقة واحدة في سباق النهر 🏃</p>
        <div class="card rank-now">
          <span class="rank-emoji">${cur.emoji}</span>
          <div>
            <b>${cur.name}</b>
            <p class="muted">أفضل نتيجة: ${ltr(best)} في الدقيقة</p>
            ${next ? `${bar((best - prev) / (next.min - prev))}
              <p class="muted">باقي ${ltr(next.min - best)} لتصبح ${next.emoji} ${next.name}</p>`
              : '<p class="muted">فتحت كل الرتب! أنت من أبطال الغابة 🎉</p>'}
          </div>
        </div>
        <ol class="rank-path">
          ${RANKS.map(r => {
            const state = r === cur ? 'current' : r.min <= best ? 'done' : 'locked';
            return `<li class="rank-step ${state}">
              <span class="rank-emoji">${r.emoji}</span>
              <span class="rank-info">
                <b>${r.name}</b>
                <small>${ltr(r.min)} في الدقيقة</small>
              </span>
              <span class="rank-state">${state === 'done' ? '✅' : state === 'current' ? '⭐ أنت هنا' : r === next ? '🎯 التالية' : '🔒'}</span>
            </li>`;
          }).join('')}
        </ol>
      </section>`);
    },

    diary() {
      const p = Store.current();
      const st = Journey.streak(p);
      const w = Journey.weekStatus(p);
      const rare = RARE_ITEMS.filter(i => p.items.includes(i.id));
      const dayIcon = d => d.state === 'done' ? '👣' : d.state === 'played' ? '🌱' : '';
      const weekRow = days => days.map(d =>
        `<div class="day ${d.state} ${d.isToday ? 'today' : ''} ${d.future ? 'future' : ''}">
          <small>${d.name}</small><span>${dayIcon(d)}</span>
        </div>`).join('');

      render(`<section class="screen">
        ${subHeader('📔 دفتر الرحلة')}

        <div class="card streak-card">
          <div class="streak-big">🔥 ${ltr(st.count)}</div>
          <div>
            <b>أيام متتالية</b>
            <p class="muted">أكمل رحلة اليوم كل يوم لتكبر سلسلتك.</p>
            <p class="muted">🛡️ يوم الراحة هذا الأسبوع: <b>${st.restUsed ? 'استُخدم' : 'متاح'}</b>. إذا فاتك يوم واحد في الأسبوع لا تنقطع سلسلتك.</p>
          </div>
        </div>

        <div class="card">
          <h3>👣 هذا الأسبوع</h3>
          <div class="week-row">${weekRow(w.days)}</div>
          <div class="week-goal">
            <span>🏆 الجائزة الأسبوعية: أكمل رحلة اليوم ${ltr(CONFIG.weeklyGoal)} أيام</span>
            ${bar(w.done / CONFIG.weeklyGoal)}
            <b>${ltr(`${Math.min(w.done, CONFIG.weeklyGoal)}/${CONFIG.weeklyGoal}`)}</b>
          </div>
          ${w.ready ? '<button class="btn orange wide" data-act="claimWeek">🏆 افتح الجائزة الأسبوعية</button>'
            : w.claimed ? '<p class="muted center">✅ حصلت على جائزة هذا الأسبوع!</p>' : ''}
        </div>

        <div class="card">
          <h3>🗓️ آخر 4 أسابيع</h3>
          <div class="month">${[-3, -2, -1, 0].map(o => `<div class="week-row compact">${weekRow(Journey.week(p, o))}</div>`).join('')}</div>
          <p class="muted center">👣 رحلة كاملة · 🌱 لعب قليلاً</p>
        </div>

        <div class="card">
          <h3>✨ القطع النادرة</h3>
          <div class="rare-grid">${RARE_ITEMS.map(i =>
            `<span class="rare-item ${p.items.includes(i.id) ? 'found' : ''}" title="${i.name}">${i.emoji}<small>${i.name}</small></span>`).join('')}</div>
          <p class="muted center">${ltr(`${rare.length}/${RARE_ITEMS.length}`)}</p>
        </div>
      </section>`);
    },

    // ───── سباق الإخوة ─────
    duelPick() {
      const list = Store.state.profiles;
      if (!duelLands().some(w => w.id === duelLand)) duelLand = 'mul';
      const net = duelMode === 'net';
      const n = duelPicks.length;
      const canNet = Sync.duel.ready();
      const picked = duelPicks.map(id => list.find(p => p.id === id));
      const layout = duelLayout(n);
      const brainKind = duelKind === 'brain';
      // في عدة أجهزة يختار الطفل نفسه فقط (وغالباً يكون مختاراً مسبقاً)، فالزر فوق الأسماء
      const sendBtn = `<button class="btn green wide" data-act="netHost" data-arg="${brainKind ? 'brain' : 'race'}" ${n === 1 && canNet ? '' : 'disabled'}>📨 أرسل الدعوة</button>`;
      render(`<section class="screen duel-screen">
        <header class="topbar">
          <button class="chip" data-act="go" data-arg="home">→ رجوع</button>
          <h2 class="topbar-title">⚔️ سباق الإخوة</h2>
          <span></span>
        </header>
        <div class="seg duel-modes">
          <button class="${net ? '' : 'on'}" data-act="setDuelMode" data-arg="local">📱 جهاز واحد</button>
          <button class="${net ? 'on' : ''}" data-act="setDuelMode" data-arg="net">🌐 عدة أجهزة</button>
        </div>
        <div class="seg duel-modes">
          <button class="${brainKind ? '' : 'on'}" data-act="setDuelKind" data-arg="race">🏃 سباق النهر</button>
          <button class="${brainKind ? 'on' : ''}" data-act="setDuelKind" data-arg="brain">🧠 مبارزة العقول</button>
        </div>
        <div class="seg duel-modes duel-lands">${duelLands().map(w =>
          `<button class="${w.id === duelLand ? 'on' : ''}" data-act="setDuelLand" data-arg="${w.id}">${w.icon} ${w.name}</button>`).join('')}</div>
        <div class="card">
          ${brainKind ? `<p>الجميع يُسأل من الغابة المختارة، والصعوبة تتكيّف معه وحده: تصعب كلما أجاب صحيحاً.
            ثلاث ألعاب، ${ltr(Brain.DUEL_SECONDS)} ثانية لكل منها، ومن يُجب صحيحاً أكثر يفوز باللعبة.
            <b>الفائز من يكسب ألعاباً أكثر!</b></p>
          <p class="muted">${net
            ? (canNet ? `اختر نفسك، ثم يقبل إخوتك الدعوة على أجهزتهم (حتى ${ltr(MAX_PLAYERS)} لاعبين). تحتاج الأجهزة إلى الإنترنت وحساب Google نفسه.` : '⚠️ سجّل دخول ولي الأمر بحساب Google على كل الأجهزة أولاً، مع اتصال بالإنترنت.')
            : 'اختر متسابقَين اثنين، وضعا التابلت بينكما، ولكل واحد نصف الشاشة يضغط فيه.'}</p>` : `<p>${net ? `اختر نفسك، ثم يقبل إخوتك الدعوة على أجهزتهم (حتى ${ltr(MAX_PLAYERS)} لاعبين).` : 'اختر متسابقَين اثنين.'}
            الجميع يُسأل من الغابة المختارة، وجزيرة كل واحد على بُعد أفضل نتيجة له وإجابتين.
            <b>الأول من يصل إلى جزيرته أولاً!</b></p>
          <p class="muted">${net
            ? (canNet ? 'تحتاج الأجهزة إلى الإنترنت وحساب Google نفسه.' : '⚠️ سجّل دخول ولي الأمر بحساب Google على كل الأجهزة أولاً، مع اتصال بالإنترنت.')
            : 'ضعا التابلت بينكما، ولكل واحد لوحة أرقامه.'}</p>`}
        </div>
        ${net ? sendBtn : ''}
        <div class="profile-grid">${list.map(p => {
          const i = duelPicks.indexOf(p.id);
          return `<button class="profile-card ${i >= 0 ? 'picked' : ''}" data-act="duelPick" data-arg="${p.id}">
            <span class="avatar">${p.avatar}</span><b>${esc(p.name)}</b>
            <small>${brainKind ? `${Engine.world(duelLand).icon} ${Engine.world(duelLand).name}` : `${Engine.world(duelLand).icon} 🏝️ هدفه ${ltr(duelGoal(p))}`}</small>
            ${i >= 0 && !net ? `<span class="pick-no">${ltr(i + 1)}</span>` : ''}
          </button>`;
        }).join('')}</div>
        ${net || n < 2 ? '' : `<div class="card">
          <h3>📱 شكل الشاشة</h3>
          <div class="layouts">${duelLayouts(n).map(l => `<button class="layout-opt ${l.id === layout ? 'on' : ''}" data-act="setDuelLayout" data-arg="${l.id}">
            <span class="mini ${l.id}">${picked.map(p => `<i>${p.avatar}</i>`).join('')}</span>
            <b>${l.name}</b><small>${l.hint}</small>
          </button>`).join('')}</div>
        </div>`}
        ${net ? ''
          : brainKind ? `<button class="btn green wide" data-act="startBrainDuel" ${n >= 2 ? '' : 'disabled'}>🧠 ابدأ المبارزة</button>`
          : `<button class="btn green wide" data-act="startDuel" ${n >= 2 ? '' : 'disabled'}>🏁 ابدأ السباق</button>`}
      </section>`);
    },

    // انتظار المتسابقين (لصاحب الدعوة) أو انتظار البدء (للمنضم)
    netWait(role) {
      const d = Sync.duel.data();
      const players = d && netPending && d.id === netPending.id ? activePlayers(d) : [];
      const host = role === 'host';
      const what = d && d.kind === 'brain' ? 'المبارزة' : 'السباق';
      render(`<section class="screen results duel-screen net-wait">
        <div class="result-hero wait-spin">⏳</div>
        <h1>${host ? 'بانتظار المتسابقين…' : `بانتظار بدء ${what}…`}</h1>
        <p class="hint">${host
          ? `افتح اللعبة على الأجهزة الأخرى واضغط «انضم» (حتى ${ltr(MAX_PLAYERS)} لاعبين).`
          : `تبدأ ${what} عندما يضغط صاحب الدعوة «ابدأ».`}</p>
        <div class="net-players">${players.map(x => `<span>${x.avatar}<b>${esc(x.name)}</b></span>`).join('')}</div>
        <div class="actions">
          ${host ? `<button class="btn green" data-act="netStart" ${players.length >= 2 ? '' : 'disabled'}>🏁 ابدأ ${what} (${ltr(players.length)})</button>` : ''}
          <button class="btn orange" data-act="netCancel">✕ إلغاء</button>
        </div>
      </section>`);
    },

    netJoin(d) {
      duelLand = d.world || 'mul';
      const taken = activePlayers(d);
      const list = Store.state.profiles.filter(p => !taken.some(x => x.pid === p.id || x.name === p.name));
      const host = d.players[d.host];
      render(`<section class="screen duel-screen">
        <header class="topbar">
          <button class="chip" data-act="go" data-arg="home">→ رجوع</button>
          <h2 class="topbar-title">⚔️ دعوة لسباق</h2>
          <span></span>
        </header>
        <div class="card center">
          <p>${host.avatar} <b>${esc(host.name)}</b> يدعوك ${d.kind === 'brain' ? 'لمبارزة العقول 🧠' : 'لسباق'} في ${Engine.world(d.world || 'mul').icon} ${Engine.world(d.world || 'mul').name}! من أنت؟</p>
          <div class="net-players">${taken.map(x => `<span>${x.avatar}<b>${esc(x.name)}</b></span>`).join('')}</div>
        </div>
        <div class="profile-grid">${list.map(p => `<button class="profile-card" data-act="netJoin" data-arg="${p.id}">
            <span class="avatar">${p.avatar}</span><b>${esc(p.name)}</b>
            <small>${d.kind === 'brain' ? `${Engine.world(duelLand).icon} ${Engine.world(duelLand).name}` : `${Engine.world(duelLand).icon} 🏝️ هدفه ${ltr(duelGoal(p))}`}</small>
          </button>`).join('')}</div>
      </section>`);
    },

    duel() {
      const half = (side, i) => `<div class="duel-half" data-side="${i}">
        <div class="duel-head">
          <b>${side.p.avatar} ${esc(side.p.name)}</b>
          <span class="chip">✅ <b id="dScore${i}">0</b></span>
        </div>
        <div class="track river">
          <span class="goal">🏝️</span>
          <span id="dWalker${i}" class="walker" style="--p:0">${side.p.avatar}</span>
        </div>
        <div id="dQ${i}" class="question" dir="ltr"></div>
        <div id="dPad${i}" class="pad">${duelPad(null)}</div>
      </div>`;
      const mid = `<div class="duel-mid">
          <button class="chip" data-act="exitDuel" aria-label="خروج">✕</button>
          <div class="timebar"><i id="timebar"></i><span id="timeText">${CONFIG.raceSeconds}</span></div>
        </div>`;
      if (duel.net) {
        render(`<section class="duel net">
          ${mid}
          ${duel.net.opps.map((o, j) => `<div class="opp">
            <b>${o.avatar} ${esc(o.name)}</b>
            <div class="track river"><span class="goal">🏝️</span>
              <span id="oWalker${j}" class="walker" style="--p:0">${o.avatar}</span></div>
            <span class="chip">✅ <b id="oScore${j}">0</b></span>
          </div>`).join('')}
          ${half(duel.sides[0], 0)}
        </section>`);
        return;
      }
      const n = duel.sides.length;
      if (n === 2) {
        render(`<section class="duel ${duelLayout(2)}">${half(duel.sides[0], 0)}${mid}${half(duel.sides[1], 1)}</section>`);
        return;
      }
      render(`<section class="duel multi ${duelLayout(n)}">
        ${mid}
        <div class="duel-grid">${duel.sides.map(half).join('')}</div>
      </section>`);
    },

    duelResults(res) {
      const medals = ['🥇', '🥈', '🥉'];
      const firsts = res.sides.filter(x => x.place === 1);
      const title = res.winner ? `فاز ${res.winner.p.avatar} ${esc(res.winner.p.name)}!`
        : firsts.length > 1 ? 'تعادل! 🤝' : 'انتهى السباق';
      const card = x => `<div class="card duel-card ${x === res.winner ? 'won' : ''}">
        <div class="place">${x.place ? medals[x.place - 1] || ltr(x.place) : ''}</div>
        <div class="avatar">${x.p.avatar}</div>
        <b>${esc(x.p.name)}</b>
        <div class="stats">
          <div class="stat good"><b>${x.right}</b><small>صحيحة</small></div>
          ${x.coins === null ? '' : `<div class="stat coin"><b>${ltr('+' + x.coins)}</b><small>🪙</small></div>`}
        </div>
        <small>${x.out || (x.reachedAt ? '🏝️ وصل إلى جزيرته' : `🏝️ ${ltr(`${x.right}/${x.goal}`)}`)}</small>
        ${x.banners.map(t => `<div class="banner">${t}</div>`).join('')}
      </div>`;
      render(`<section class="screen results duel-screen">
        <div class="result-hero">${res.winner ? '🏆' : '🤝'}</div>
        <h1>${title}</h1>
        <p class="hint">${res.note || (res.winner && res.winner.reachedAt ? 'وصل إلى جزيرته أولاً' : res.winner ? 'الأقرب إلى جزيرته' : 'وصلوا بنفس النسبة')}</p>
        <div class="duel-cards">${res.sides.map(card).join('')}</div>
        <div class="actions">
          ${res.again
            ? `<button class="btn orange" data-act="${res.again}">🧠 مبارزة أخرى</button>`
            : `<button class="btn orange" data-act="${res.net ? 'duelSetup' : 'startDuel'}">⚔️ سباق آخر</button>`}
          <button class="btn green" data-act="go" data-arg="home">🏠 الرئيسية</button>
        </div>
      </section>`);
    },

    // أداء الطفل مقارنة بنفسه فقط
    performance() {
      const p = Store.current();
      const w = Engine.current(p);
      const r = Journey.weekReport(p, w.id);
      const st = Journey.streak(p);
      const races = racesIn(p, w.id).slice(-15);
      const maxRace = Math.max(10, ...races.map(x => x.score));
      const tricky = trickyFacts(p, w.id);

      const lines = [];
      if (r.raceThis !== null && r.raceLast !== null) {
        const diff = r.raceThis - r.raceLast;
        lines.push(diff > 0
          ? `📈 أسرع من الأسبوع الماضي بـ <b>${ltr(diff)}</b> إجابات في السباق!`
          : `🏃 متوسطك في السباق هذا الأسبوع ${ltr(r.raceThis)} (الأسبوع الماضي ${ltr(r.raceLast)})`);
      }
      lines.push(r.newMastered
        ? `🌟 أتقنت <b>${ltr(r.newMastered)}</b> مسألة جديدة هذا الأسبوع`
        : '🌱 تدرّب قليلاً كل يوم لتُتقن مسائل جديدة هذا الأسبوع');

      render(`<section class="screen">
        ${subHeader('📊 أدائي')}
        <p class="hint">${w.icon} ${w.name}</p>

        <div class="tiles">
          <div class="tile"><b>🔥 ${ltr(st.count)}</b><small>أيام متتالية</small></div>
          <div class="tile"><b>${ltr(masteredTile(p, w).val)}</b><small>${masteredTile(p, w).what} متقنة</small></div>
          <div class="tile"><b>${ltr(Engine.state(p, w.id).bestRace)}</b><small>أفضل سباق</small></div>
          <div class="tile"><b>${ltr(Journey.minutesToday(p))}</b><small>دقيقة اليوم</small></div>
        </div>

        <div class="card">
          <ul class="facts-list">${lines.map(l => `<li>${l}</li>`).join('')}</ul>
        </div>

        <div class="card">
          <h3>🏃 سباقاتي الأخيرة</h3>
          ${races.length ? `<div class="chart races">
            ${races.map(x => `<div class="col"><span class="val">${x.score}</span>
              <i style="height:${(x.score / maxRace) * 100}%"></i></div>`).join('')}
          </div>
          <p class="muted center">من الأقدم (يمين) إلى الأحدث (يسار)</p>`
          : '<p class="muted">العب سباق النهر لترى نتائجك هنا 🏃</p>'}
        </div>

        <div class="card">
          <h3>🎯 مسائل تحتاج تدريب</h3>
          ${tricky.length ? `<div class="tricky">${tricky.map(([t, n]) => {
              const f = Engine.fact(p, w.id, t, n);
              const q = Engine.make(w.id, t, n);
              return `<span><b dir="ltr">${q.text}</b><small>${ltr(`${f.right}/${f.seen}`)}</small></span>`;
            }).join('')}</div>
            <button class="btn orange wide" data-act="startTricky">💪 تدرّب عليها الآن</button>`
          : '<p class="muted">لا توجد مسائل صعبة عليك الآن، أحسنت! 🌟</p>'}
        </div>

        <div class="card">
          <h3>🗺️ خريطة الإتقان</h3>
          <p class="muted">${w.gen ? 'كل شريط منطقة. املأها كلها!' : 'كل مربع مسألة. اجعل الخريطة كلها خضراء!'}</p>
          ${masteryMap(p, w.id)}
          <div class="legend" ${w.gen ? 'hidden' : ''}>
            <span><i class="hm l0"></i>لم تجرّبها</span>
            <span><i class="hm l1"></i>تحتاج تدريب</span>
            <span><i class="hm l3"></i>تتحسّن</span>
            <span><i class="hm l4"></i>أتقنتها</span>
            <span><i class="hm l5"></i>بطل فيها</span>
          </div>
        </div>
      </section>`);
    },

    chest() {
      render(`<section class="screen results">
        <div class="chest-box">🎁</div>
        <h1>كنز رحلة اليوم!</h1>
        <p class="hint">أكملت المحطات الثلاث. ماذا يوجد في الصندوق؟</p>
        <button class="btn orange" data-act="openChest">افتح الكنز ✨</button>
      </section>`);
    },

    reward(reward, title) {
      const p = Store.current();
      const st = Journey.streak(p);
      render(`<section class="screen results">
        <div class="result-hero">${reward.item ? reward.item.emoji : '💰'}</div>
        <h1>${title}</h1>
        <div class="stats">
          <div class="stat coin"><b>${ltr('+' + reward.coins)}</b><small>🪙 عملات</small></div>
          ${reward.item ? `<div class="stat rare"><b>${reward.item.emoji}</b><small>${reward.item.name}</small></div>` : ''}
        </div>
        ${reward.item ? '<div class="banner">✨ قطعة نادرة لا تُباع في المتجر! أُضيفت إلى مخيّمك</div>' : ''}
        ${st.count ? `<div class="banner">🔥 سلسلتك الآن: ${ltr(st.count)}</div>` : ''}
        <div class="actions">
          <button class="btn green" data-act="go" data-arg="camp">⛺ المخيّم</button>
        </div>
      </section>`);
    },

    play() {
      const r = round;
      const p = Store.current();
      const race = r.mode === 'race';
      const best = Engine.state(p, r.w).bestRace;
      const titles = { race: '🏃 سباق النهر', warmup: '🏕️ الإحماء', review: '📝 المراجعة', tricky: '🎯 مسائل تحتاج تدريب' };
      const title = titles[r.mode] || `${r.region.icon} ${r.region.name}`;
      render(`<section class="screen play">
        <header class="topbar">
          <button class="chip" data-act="exitRound" aria-label="خروج">✕</button>
          <h2 class="topbar-title">${title}</h2>
          <div class="chip">✅ <b id="score">0</b></div>
        </header>

        <div class="track ${race ? 'river' : 'trail'}">
          <span class="goal">${race ? '🏝️' : '💎'}</span>
          ${race && best ? `<span class="best-flag" style="--p:${Math.min(best / r.goal, 1)}" title="أفضل نتيجة">🚩</span>` : ''}
          <span id="walker" class="walker" style="--p:0">${p.avatar}</span>
        </div>
        ${race
          ? `<div class="timebar"><i id="timebar"></i><span id="timeText">${CONFIG.raceSeconds}</span></div>`
          : `<div class="steps" id="steps">${'<i></i>'.repeat(r.total)}</div>`}

        <div class="play-body">
          <div class="question-area">
            <div id="question" class="question" dir="ltr"></div>
            <div id="feedback" class="feedback"></div>
          </div>
          <div id="pad" class="pad">${numpad()}</div>
        </div>
      </section>`);
    },

    // سباق النهر: بطاقة قبل العدّ التنازلي، ومنها يدعو الطفل إخوته للسباق
    raceIntro() {
      const p = Store.current();
      const w = Engine.current(p);
      const best = Engine.state(p, w.id).bestRace;
      render(`<section class="screen">
        <header class="topbar">
          <button class="chip" data-act="go" data-arg="camp">→ رجوع</button>
          <h2 class="topbar-title">🏃 سباق النهر</h2>
          <span></span>
        </header>
        <div class="card brain-intro">
          <div class="brain-icon">🏃</div>
          <h2>${w.icon} ${w.name}</h2>
          <p>أجب أكبر عدد من المسائل في ${ltr(CONFIG.raceSeconds)} ثانية</p>
          <p class="muted">${best ? `أفضل نتيجة لك: ${ltr(best)}` : 'أول سباق لك هنا!'}</p>
          <button class="btn orange wide" data-act="raceGo">ابدأ ▶</button>
          <button class="btn green wide" data-act="raceInvite">⚔️ ادعُ إخوتك لسباق النهر</button>
        </div>
      </section>`);
    },

    // تحدّي العقل: بطاقة تعريف قبل كل لعبة، ثم شاشة اللعب
    brain() {
      const b = brain;
      const G = Brain.GAMES[b.g];
      const games = b.sides[0].games;
      const steps = `<div class="brain-steps">${Brain.GAMES.map((x, i) =>
        `<span class="${i < b.g ? 'done' : i === b.g ? 'on' : ''}">${i < b.g ? games[i].medal : x.icon}</span>`).join('')}</div>`;
      if (b.phase === 'intro') {
        render(`<section class="screen brain">
          <header class="topbar">
            <button class="chip" data-act="exitBrain" aria-label="خروج">✕</button>
            <h2 class="topbar-title">🧠 تحدّي العقل</h2>
            <div class="chip">${ltr(`${b.g + 1}/${Brain.GAMES.length}`)}</div>
          </header>
          ${steps}
          <div class="card brain-intro">
            <div class="brain-icon">${G.icon}</div>
            <h2>${G.name}</h2>
            <p>${G.how}</p>
            <p class="muted">${ltr(Brain.SECONDS)} ثانية، وتصعب كلما أجبت صحيحاً</p>
            <button class="btn orange wide" data-act="brainGo">ابدأ ▶</button>
            ${b.g === 0 ? '<button class="btn green wide" data-act="brainInvite">⚔️ ادعُ إخوتك لمبارزة العقول</button>' : ''}
          </div>
        </section>`);
        return;
      }
      render(`<section class="screen play brain">
        <header class="topbar">
          <button class="chip" data-act="exitBrain" aria-label="خروج">✕</button>
          <h2 class="topbar-title">${G.icon} ${G.name}</h2>
          <div class="chip">🧠 <b id="bScore0">0</b></div>
        </header>
        ${steps}
        <div class="timebar"><i id="timebar"></i><span id="timeText">${Brain.SECONDS}</span></div>
        <div class="brain-lv" id="bLv0"></div>
        <div class="brain-stage" id="bStage0"></div>
        <div id="bFb0" class="feedback"></div>
      </section>`);
    },

    // مبارزة العقول: نفس تقسيم شاشة سباق الإخوة، ولكل لاعب أسئلته ومستواه
    brainDuel() {
      const G = Brain.GAMES[brain.g];
      const half = (s, i) => `<div class="duel-half bhalf" data-side="${i}">
        <div class="duel-head">
          <b>${s.p.avatar} ${esc(s.p.name)}</b>
          <span class="chip">✅ <b id="bScore${i}">0</b></span>
        </div>
        <div class="brain-lv" id="bLv${i}"></div>
        <div class="brain-stage" id="bStage${i}"></div>
        <div class="feedback" id="bFb${i}"></div>
      </div>`;
      const mid = `<div class="duel-mid">
          <button class="chip" data-act="exitBrain" aria-label="خروج">✕</button>
          <span class="bmid-game">${G.icon}</span>
          <div class="timebar"><i id="timebar"></i><span id="timeText">${Brain.DUEL_SECONDS}</span></div>
        </div>`;
      if (brain.net) {
        render(`<section class="duel brain net">
          ${mid}
          <div id="bOpps">${brainOpps()}</div>
          ${half(brain.sides[0], 0)}
        </section>`);
        return;
      }
      const n = brain.sides.length;
      if (n === 2) {
        render(`<section class="duel brain ${duelLayout(2)}">${half(brain.sides[0], 0)}${mid}${half(brain.sides[1], 1)}</section>`);
        return;
      }
      render(`<section class="duel brain multi ${duelLayout(n)}">
        ${mid}
        <div class="duel-grid">${brain.sides.map(half).join('')}</div>
      </section>`);
    },

    brainResults(s) {
      render(`<section class="screen results">
        <div class="result-hero">🧠</div>
        <h1>وزن دماغك: ${ltr(s.grams)} غرام</h1>
        ${s.best ? `<p class="hint">أفضل وزن: ${ltr(s.best)} غرام</p>` : ''}
        <div class="card brain-sum">
          ${s.games.map(g => {
            const G = Brain.GAMES.find(x => x.id === g.id);
            return `<div class="brain-row"><span>${G.icon} ${G.name}</span><b>${g.medal} ${ltr(g.points)}</b>
              <small>✅ ${ltr(g.right)} · ⭐ المستوى ${ltr(g.top)}</small></div>`;
          }).join('')}
        </div>
        <div class="stats">
          <div class="stat coin"><b>${ltr('+' + s.coins)}</b><small>🪙 عملات</small></div>
        </div>
        ${s.newRecord ? '<div class="banner">🏆 رقم قياسي جديد لوزن الدماغ!</div>' : ''}
        ${s.goalReached ? `<div class="banner">⏱️ حقّقت هدف اليوم: ${ltr(Store.state.settings.goalMin)} دقيقة! 🎉</div>` : ''}
        <div class="actions">
          <button class="btn orange" data-act="startBrain">🔁 مرة أخرى</button>
          <button class="btn green" data-act="go" data-arg="camp">⛺ المخيّم</button>
        </div>
      </section>`);
    },

    results(s) {
      const pct = s.asked ? s.right / s.asked : 0;
      let hero, title;
      if (s.mode === 'race') {
        hero = s.newRecord ? '🏆' : '🏝️';
        title = `قفزت على ${ltr(s.right)} صخرة!`;
      } else if (s.mode === 'review') {
        hero = '🌟';
        title = 'صحّحت كل أخطاء اليوم!';
      } else {
        hero = pct === 1 ? '🌟' : pct >= 0.7 ? '😃' : '💪';
        title = pct === 1 ? 'ممتاز! كل الإجابات صحيحة' : pct >= 0.7 ? 'أحسنت يا بطل!' : 'استمر بالتدريب، أنت تتحسّن!';
      }

      const banners = [];
      if (s.newRecord) banners.push('🏆 رقم قياسي جديد!');
      if (s.rankUp) banners.push(`${s.rankUp.emoji} رتبة جديدة: ${s.rankUp.name}`);
      if (s.station) banners.push(`✅ أنجزت محطة ${s.station.icon} ${s.station.name} في رحلة اليوم`);
      if (s.goalReached) banners.push(`⏱️ حقّقت هدف اليوم: ${ltr(Store.state.settings.goalMin)} دقيقة! 🎉`);
      if (s.restTime) banners.push('⛺ لعبت كثيراً اليوم، حان وقت الراحة');
      s.events.forEach(e => banners.push(eventBanner(e)));

      const unique = [...new Map(s.mistakes.map(q => [q.id, q])).values()];

      render(`<section class="screen results">
        <div class="result-hero">${hero}</div>
        <h1>${title}</h1>
        <div class="stats">
          <div class="stat good"><b>${s.right}</b><small>صحيحة</small></div>
          <div class="stat bad"><b>${s.asked - s.right}</b><small>خاطئة</small></div>
          <div class="stat coin"><b>${ltr('+' + s.coins)}</b><small>🪙 عملات</small></div>
        </div>
        ${banners.map(b => `<div class="banner">${b}</div>`).join('')}
        ${unique.length && s.mode !== 'review' ? `<div class="card mistakes">
          <h3>📝 راجع هذه المسائل</h3>
          <div class="mistake-list">${unique.map(q => `<span dir="ltr">${q.solved}</span>`).join('')}</div>
        </div>` : ''}
        <div class="actions">
          ${s.chestReady ? '<button class="btn orange pulse" data-act="go" data-arg="chest">🎁 افتح كنز اليوم</button>' : ''}
          ${s.mode !== 'review' ? '<button class="btn orange" data-act="again">🔁 مرة أخرى</button>' : ''}
          <button class="btn green" data-act="go" data-arg="camp">⛺ المخيّم</button>
        </div>
      </section>`);
    },

    // ───── ولي الأمر ─────
    parentGate() {
      const s = Store.state.settings;
      if (!pinStage) pinStage = s.pin ? 'enter' : 'new';
      const prompts = {
        enter: 'أدخل رمز ولي الأمر',
        new: 'اختر رمزاً سرياً من 4 أرقام',
        confirm: 'أعد إدخال الرمز للتأكيد',
      };
      render(`<section class="screen">
        <header class="topbar"><button class="chip" data-act="leaveParent">→ رجوع</button></header>
        <div class="card pin-card">
          <h2>👨‍👩‍👧 ولي الأمر</h2>
          <p>${prompts[pinStage]}</p>
          <div class="pin-dots" id="pinDots">${[0, 1, 2, 3].map(i => `<i class="${i < pinBuffer.length ? 'on' : ''}"></i>`).join('')}</div>
          <div class="numpad small" dir="ltr">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-act="pinKey" data-arg="${n}">${n}</button>`).join('')}
            <button class="key util" data-act="pinKey" data-arg="del" aria-label="مسح">⌫</button>
            <button class="key" data-act="pinKey" data-arg="0">0</button>
            <span></span>
          </div>
          ${pinStage === 'enter' ? '<button class="link-btn dark" data-act="forgotPin">نسيت الرمز؟</button>' : ''}
        </div>
      </section>`);
    },

    parent() {
      if (!parentOK) { Screens.parentGate(); return; }
      const s = Store.state.settings;
      const kids = Store.state.profiles;
      if (!kids.some(k => k.id === parentKid)) parentKid = kids.length ? kids[0].id : null;
      const p = kids.find(k => k.id === parentKid);
      const seg = (act, values, current, label) => values.map(v =>
        `<button class="${current === v ? 'on' : ''}" data-act="${act}" data-arg="${v}">${label(v)}</button>`).join('');

      render(`<section class="screen parent">
        <header class="topbar">
          <button class="chip" data-act="leaveParent">→ خروج</button>
          <h2 class="topbar-title">👨‍👩‍👧 لوحة ولي الأمر</h2>
          <span></span>
        </header>

        <div class="card">
          <h3>⚙️ الإعدادات</h3>
          <div class="setting"><span>الهدف اليومي</span>
            <div class="seg">${seg('setGoal', [10, 15, 20, 30], s.goalMin, v => `${ltr(v)} د`)}</div></div>
          <div class="setting"><span>تذكير بالراحة بعد</span>
            <div class="seg">${seg('setMax', [0, 30, 45, 60], s.maxMin, v => v ? `${ltr(v)} د` : 'بدون')}</div></div>
          <button class="link-btn dark" data-act="changePin">🔑 تغيير الرمز</button>
        </div>

        ${pendingCard()}

        ${rewardsCard()}

        ${syncCard()}

        ${compareCard(kids)}

        ${p ? `<div class="kid-tabs">${kids.map(k =>
            `<button class="chip ${k.id === parentKid ? 'on' : ''}" data-act="parentKid" data-arg="${k.id}">${k.avatar} ${esc(k.name)}</button>`).join('')}</div>
          ${kidReport(p)}`
          : '<p class="hint">لا يوجد مستكشفون بعد.</p>'}
      </section>`);
    },
  };

  // ───── جوائز العائلة ─────
  // الجوائز في إعدادات ولي الأمر، والطلبات في ملف كل طفل (فتُزامَن مع باقي البيانات)
  const rewards = () => Store.state.settings.rewards || (Store.state.settings.rewards = []);
  const requests = p => p.requests || (p.requests = []);
  let newRewardEmoji = REWARD_EMOJIS[0];

  function requestsList(p) {
    const list = requests(p).slice(-6).reverse();
    if (!list.length) return '';
    const label = { pending: '⏳ بانتظار ولي الأمر', given: '✅ حصلت عليها', declined: '↩️ أُعيدت العملات' };
    return `<div class="card">
      <h3>📬 طلباتك</h3>
      <ul class="request-list">${list.map(r =>
        `<li class="${r.status}"><span>${r.emoji} ${esc(r.name)}</span><small>${label[r.status]}</small></li>`).join('')}</ul>
    </div>`;
  }

  function pendingCard() {
    const pending = [];
    Store.state.profiles.forEach(k => requests(k).forEach(r => { if (r.status === 'pending') pending.push({ k, r }); }));
    if (!pending.length) return '';
    return `<div class="card pending-card">
      <h3>📬 طلبات جوائز بانتظارك</h3>
      ${pending.map(({ k, r }) => `<div class="pending-row">
        <span>${k.avatar} <b>${esc(k.name)}</b> طلب ${r.emoji} ${esc(r.name)} <small>(🪙 ${r.price})</small></span>
        <span class="pending-actions">
          <button class="btn green small" data-act="giveReward" data-arg="${k.id}:${r.id}">✅ تم التسليم</button>
          <button class="btn gray small" data-act="declineReward" data-arg="${k.id}:${r.id}">↩️ رفض</button>
        </span>
      </div>`).join('')}
    </div>`;
  }

  function rewardsCard() {
    const list = rewards();
    const presets = REWARD_PRESETS.filter(x => !list.some(r => r.name === x.name));
    return `<div class="card">
      <h3>🏠 جوائز العائلة</h3>
      <p class="muted">جوائز حقيقية يشتريها الأطفال بعملاتهم. عند الشراء يصلك طلب هنا لتؤكد التسليم، أو ترفضه فتعود العملات.</p>
      ${list.length ? `<ul class="reward-list">${list.map(r => `<li>
        <span>${r.emoji} ${esc(r.name)}</span><b>🪙 ${r.price}</b>
        <button class="link-btn danger" data-act="removeReward" data-arg="${r.id}" aria-label="حذف">✕</button>
      </li>`).join('')}</ul>` : ''}
      ${presets.length ? `<p class="label">اقتراحات سريعة:</p>
        <div class="preset-row">${presets.map((x, i) =>
          `<button class="chip light" data-act="addPreset" data-arg="${REWARD_PRESETS.indexOf(x)}">${x.emoji} ${x.name} · ${x.price}</button>`).join('')}</div>` : ''}
      <p class="label">أو أضف جائزة من عندك:</p>
      <div class="emoji-row">${REWARD_EMOJIS.map(e =>
        `<button class="avatar-btn small ${e === newRewardEmoji ? 'selected' : ''}" data-act="pickRewardEmoji" data-arg="${e}">${e}</button>`).join('')}</div>
      <div class="reward-form">
        <input id="rewardName" maxlength="30" placeholder="اسم الجائزة" autocomplete="off">
        <input id="rewardPrice" type="number" inputmode="numeric" min="10" max="2000" placeholder="السعر" dir="ltr">
        <button class="btn green small" data-act="addReward">➕ إضافة</button>
      </div>
    </div>`;
  }

  // تسجيل الدخول لمزامنة التقدّم بين اللابتوب والتابلت
  function syncCard() {
    const st = Sync.status();
    const when = Sync.lastSync()
      ? new Date(Sync.lastSync()).toLocaleTimeString('ar', { hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' })
      : '';
    let body;
    if (st === 'loading') body = '<p class="muted">جارٍ التحميل…</p>';
    else if (st === 'unavailable') body = '<p class="muted">المزامنة تحتاج اتصالاً بالإنترنت. اللعبة تعمل وتحفظ على هذا الجهاز.</p>';
    else if (st === 'out') body = `<p class="muted">سجّل دخولك بحساب Google على كل جهاز ليظهر تقدّم الأطفال نفسه على اللابتوب والتابلت.</p>
      <button class="btn green wide" data-act="syncIn">تسجيل الدخول بحساب Google</button>`;
    else {
      const label = { syncing: '⏳ جارٍ المزامنة…', offline: '📴 بدون اتصال — ستُرفع التعديلات عند عودة الإنترنت', ok: `✅ متزامن${when ? ` · آخر مزامنة ${when}` : ''}`, error: '⚠️ تعذّرت المزامنة' }[st];
      body = `<p>${label}</p>
        <p class="muted" dir="ltr">${esc(Sync.email())}</p>
        <button class="link-btn dark" data-act="syncOut">تسجيل الخروج من هذا الجهاز</button>`;
    }
    return `<div class="card" id="syncCard"><h3>☁️ المزامنة بين الأجهزة</h3>${body}</div>`;
  }

  // لوحة المتصدرين: الصغار والكبار كلٌّ في لوحته، يحدّد ولي الأمر مجموعة كل طفل
  const GROUPS = [{ id: 'small', name: '🐣 الصغار' }, { id: 'big', name: '🦁 الكبار' }];
  const groupOf = p => p.group || 'big';
  function leaderboard(list) {
    if (list.length < 2) return '';
    const medals = ['🥇', '🥈', '🥉'];
    // غابات فيها سباق لأحد الأطفال على الأقل، والضرب دائماً
    const lands = WORLDS.filter(w => w.id === 'mul' ||
      list.some(k => Engine.isOpen(k, w) && Engine.state(k, w.id).bestRace > 0));
    const w = lands.find(x => x.id === boardWorld) || lands.find(x => x.id === 'mul');
    // نتيجة الطفل في الغابة، أو لا شيء إن لم يفتحها بعد
    const best = k => (Engine.isOpen(k, w) ? Engine.state(k, w.id).bestRace : 0);
    const boards = GROUPS.map(g => {
      const kids = list.filter(p => groupOf(p) === g.id).sort((a, b) => best(b) - best(a));
      if (!kids.length) return '';
      return `<div class="board">
        <h4>${g.name}</h4>
        <ol>${kids.map(p => {
          // المتساوون في النتيجة يتشاركون المركز
          const place = kids.filter(k => best(k) > best(p)).length;
          const rank = Engine.rankFor(best(p));
          return `<li><span class="place">${medals[place] || ltr(place + 1)}</span>
            <span class="who">${p.avatar} ${esc(p.name)}<small class="who-rank">${rank.emoji} ${rank.name}</small></span><b>${ltr(best(p))}</b></li>`;
        }).join('')}</ol>
      </div>`;
    }).join('');
    return `<div class="card leaders">
      <h3>🏆 المتصدرون في سباق النهر</h3>
      ${lands.length > 1 ? `<div class="kid-tabs">${lands.map(x =>
        `<button class="chip ${x === w ? 'on' : ''}" data-act="boardWorld" data-arg="${x.id}">${x.icon} ${x.name}</button>`).join('')}</div>` : ''}
      <div class="boards">${boards}</div>
      <p class="muted center">أفضل عدد إجابات صحيحة في الدقيقة</p>
    </div>`;
  }

  // مقارنة مختصرة بين الأطفال: جهد هذا الأسبوع وتحسّن كل طفل عن نفسه، لا المستوى المطلق
  // في لوحة ولي الأمر يفتح الصف تقرير الطفل، وفي الشاشة الرئيسية للعرض فقط
  function compareCard(kids, inParent = true) {
    if (kids.length < 2) return '';
    const rows = kids.map(k => {
      const r = Journey.weekReport(k);
      const gain = r.raceThis !== null && r.raceLast !== null ? r.raceThis - r.raceLast : null;
      // الإتقان الجديد من كل الغابات، والتحسّن في سباق الضرب
      const fresh = Engine.openWorlds(k).reduce((n, w) => n + Journey.weekReport(k, w.id).newMastered, 0);
      return { k, vals: [r.daysPlayed, r.minutes, fresh, gain] };
    });
    const best = [0, 1, 2, 3].map(i => Math.max(...rows.map(x => x.vals[i] ?? -Infinity)));
    const cell = (v, i, text) => `<td class="${v !== null && v > 0 && v === best[i] ? 'top' : ''}">${text}</td>`;
    const gainText = g => g === null ? '—' : g > 0 ? `↑ ${g}` : g < 0 ? `↓ ${-g}` : '=';
    return `<div class="card">
      <h3>👥 هذا الأسبوع</h3>
      <table class="compare">
        <tr><th></th><th>🔥 أيام</th><th>⏱️ دقائق</th><th>⭐ إتقان جديد</th><th>🏃 تحسّن السباق</th></tr>
        ${rows.map(({ k, vals: [d, m, n, g] }) => `<tr class="kid-row ${inParent && k.id === parentKid ? 'on' : ''}"${inParent ? ` data-act="parentKid" data-arg="${k.id}"` : ''}>
          <th>${k.avatar} ${esc(k.name)}</th>
          ${cell(d, 0, ltr(`${d}/7`))}${cell(m, 1, ltr(m))}${cell(n, 2, ltr(n ? `+${n}` : 0))}${cell(g, 3, ltr(gainText(g)))}
        </tr>`).join('')}
      </table>
      <p class="muted center">التحسّن = متوسط السباق هذا الأسبوع مقارنة بالأسبوع الماضي لكل طفل</p>
    </div>`;
  }

  // الصف = الجدول (أو المقسوم عليه)، والعمود = العدد (أو الناتج)
  function masteryMap(p, w = 'mul') {
    const W = Engine.world(w);
    if (W.gen) {
      return `<div class="skill-list">${W.regions.map(r => {
        const m = Engine.mastery(p, r.table, w);
        return `<div class="skill-row"><span>${r.icon} ${r.label}</span>${bar(m)}<small>${ltr(Math.round(m * 100) + '%')}</small></div>`;
      }).join('')}</div>`;
    }
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const rows = w === 'mul' ? nums : W.regions.map(r => r.table).sort((a, b) => a - b);
    let heat = `<i class="hm-head">${W.op}</i>`;
    nums.forEach(n => { heat += `<i class="hm-head">${n}</i>`; });
    rows.forEach(t => {
      heat += `<i class="hm-head">${t}</i>`;
      nums.forEach(n => {
        const f = Engine.fact(p, w, t, n);
        const q = Engine.make(w, t, n);
        const [a, b] = w === 'mul' ? [t, n] : [q.a, q.b];
        const lvl = f.seen === 0 ? 'l0' : f.box >= CONFIG.maxBox ? 'l5' : f.box >= CONFIG.masteredBox ? 'l4' : f.box === 2 ? 'l3' : f.box === 1 ? 'l2' : 'l1';
        heat += `<i class="hm ${lvl}" title="${a} ${W.op} ${b} = ${q.answer} · ${f.right}/${f.seen}"></i>`;
      });
    });
    return `<div class="heatmap" dir="ltr">${heat}</div>`;
  }

  // اسم مهارة المنطقة: «جدول 7» أو «القسمة على 7» أو «جمع حتى 20»
  const regionLabel = (w, r) => r.label || `${w.unit} ${ltr(r.table)}`;

  // ما أتقنه الطفل في غابة: مسائل في الضرب والقسمة، ومناطق في الغابات ذات المسائل العشوائية
  function masteredTile(p, w) {
    if (!w.gen) return { val: `${Journey.weekReport(p, w.id).mastered}/${w.total}`, what: 'مسألة' };
    const n = w.regions.filter(r => Engine.mastery(p, r.table, w.id) >= 1).length;
    return { val: `${n}/${w.regions.length}`, what: 'منطقة' };
  }

  // تقدّم المستكشف في كل الغابات: 1 + المناطق التي فتحها بعد الأولى في كل غابة (يفتح أدوات المتجر)
  const reached = p => 1 + Engine.openWorlds(p).reduce((n, w) => n + Engine.state(p, w.id).unlocked - 1, 0);
  const newRegions = n => (n === 1 ? 'منطقة جديدة' : n === 2 ? 'منطقتين جديدتين' : `${ltr(n)} مناطق جديدة`);

  // الغابات التي لعب فيها المستكشف (والغابة الحالية دائماً)، دون إنشاء سجل لغابة لم يدخلها
  function playedWorlds(p, cur) {
    const played = w => (w.id === 'mul' ? Object.keys(p.facts).length > 0
      : !!(p.worlds && p.worlds[w.id] && (Object.keys(p.worlds[w.id].facts).length || p.worlds[w.id].skill || p.worlds[w.id].bestRace)));
    return Engine.openWorlds(p).filter(w => w.id === cur || played(w)).map(w => w.id);
  }

  const racesIn = (p, w) => p.races.filter(x => (x.w || 'mul') === w);

  // أصعب المسائل: جُرّبت 3 مرات على الأقل ولم تُتقن بعد، الأقل دقة أولاً
  function trickyFacts(p, w = 'mul', n = 3) {
    return Object.entries(Engine.state(p, w).facts)
      // المسائل العشوائية لا تُحفظ إلا إذا أخطأ فيها، فتكفي مرة واحدة
      .filter(([, f]) => f.seen >= (Engine.world(w).gen ? 1 : 3) && f.box < CONFIG.masteredBox)
      .sort((x, y) => x[1].right / x[1].seen - y[1].right / y[1].seen)
      .slice(0, n)
      .map(([k]) => Engine.pairOf(w, k));
  }

  // تقرير طفل واحد في لوحة ولي الأمر
  function kidReport(p) {
    const s = Store.state.settings;
    const open = Engine.openWorlds(p);
    const w = open.find(x => x.id === parentWorld) || open[0];
    const r = Journey.weekReport(p, w.id);
    const st = Journey.streak(p);
    const recent = Journey.recentDays(p, 7);
    const races = racesIn(p, w.id).slice(-15);
    const last = p.races[p.races.length - 1];
    const maxMins = Math.max(s.goalMin, ...recent.map(d => d.mins));
    const maxRace = Math.max(10, ...races.map(x => x.score));

    const summary = [`لعب ${ltr(r.daysPlayed)} من 7 أيام هذا الأسبوع، بمجموع ${ltr(r.minutes)} دقيقة.`];
    summary.push(r.newMastered
      ? `أتقن ${ltr(r.newMastered)} مسألة جديدة هذا الأسبوع.`
      : 'لم يُتقن مسائل جديدة هذا الأسبوع بعد.');
    if (r.raceThis !== null) {
      summary.push(r.raceLast !== null
        ? `متوسط سباق النهر ${ltr(r.raceThis)} (الأسبوع الماضي ${ltr(r.raceLast)}).`
        : `متوسط سباق النهر هذا الأسبوع ${ltr(r.raceThis)}.`);
    }
    if (r.hardest.length) {
      summary.push(`أصعب المسائل عنده: ${r.hardest.map(h =>
        `<b dir="ltr">${h.text}</b> (${ltr(`${h.right}/${h.seen}`)})`).join('، ')}.`);
    }

    return `
      <div class="card">
        <div class="setting"><span>✏️ الاسم</span>
          <div class="reward-form rename"><input id="renameInput" maxlength="20" autocomplete="off" value="${esc(p.name)}">
            <button class="btn green" data-act="renameKid">حفظ</button></div></div>
        <div class="setting"><span>🔑 رمز الدخول ${p.pin ? `<b dir="ltr">${kidPinShown ? p.pin : '••••'}</b>` : '<small class="muted">(لم يُختر بعد)</small>'}
            ${p.pin ? `<button class="link-btn dark" data-act="toggleKidPin">${kidPinShown ? '🙈 إخفاء' : '👁️ إظهار'}</button>` : ''}</span>
          <div class="reward-form rename"><input id="kidPinInput" type="tel" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="رمز جديد">
            <button class="btn green" data-act="setKidPin">حفظ</button></div></div>
        <div class="setting"><span>🏆 لوحة المتصدرين</span>
          <div class="seg">${GROUPS.map(g => `<button class="${groupOf(p) === g.id ? 'on' : ''}" data-act="setGroup" data-arg="${g.id}">${g.name}</button>`).join('')}</div></div>
      </div>

      ${open.length > 1 ? `<div class="kid-tabs">${open.map(x =>
        `<button class="chip ${x === w ? 'on' : ''}" data-act="parentWorld" data-arg="${x.id}">${x.icon} ${x.name}</button>`).join('')}</div>` : ''}

      <div class="tiles">
        <div class="tile"><b>🔥 ${ltr(st.count)}</b><small>أيام متتالية</small></div>
        <div class="tile"><b>${ltr(Journey.minutesToday(p))}</b><small>دقيقة اليوم</small></div>
        <div class="tile"><b>${ltr(masteredTile(p, w).val)}</b><small>${masteredTile(p, w).what} متقنة</small></div>
        <div class="tile"><b>${ltr(Engine.state(p, w.id).bestRace)}</b><small>أفضل سباق</small></div>
      </div>

      <div class="card">
        <h3>📝 ملخص الأسبوع</h3>
        <ul class="facts-list">${summary.map(l => `<li>${l}</li>`).join('')}</ul>
      </div>

      <div class="card">
        <h3>⏱️ دقائق اللعب (آخر 7 أيام)</h3>
        <div class="chart" style="--goal:${s.goalMin / maxMins}">
          <span class="goal-line" title="الهدف اليومي"></span>
          ${recent.map(d => `<div class="col"><span class="val">${d.mins || ''}</span>
            <i class="${d.mins >= s.goalMin ? 'met' : ''}" style="height:${(d.mins / maxMins) * 100}%"></i>
            <small>${d.name}</small></div>`).join('')}
        </div>
        <p class="muted center">الخط المتقطّع = الهدف اليومي (${ltr(s.goalMin)} دقيقة)</p>
      </div>

      <div class="card">
        <h3>🏃 نتائج سباق النهر في ${w.name} (آخر ${ltr(races.length)})</h3>
        ${races.length ? `<div class="chart races">
          ${races.map(x => `<div class="col"><span class="val">${x.score}</span>
            <i style="height:${(x.score / maxRace) * 100}%"></i></div>`).join('')}
        </div>
        <p class="muted center">من الأقدم (يمين) إلى الأحدث (يسار)</p>` : '<p class="muted">لم يلعب سباق النهر هنا بعد.</p>'}
        ${last ? `<button class="link-btn dark" data-act="undoRace">↩️ حذف آخر نتيجة سباق (${Engine.world(last.w || 'mul').icon} ${ltr(last.score)})</button>` : ''}
      </div>

      <div class="card">
        <h3>🗺️ خريطة الإتقان</h3>
        ${masteryMap(p, w.id)}
        <div class="legend" ${w.gen ? 'hidden' : ''}>
          <span><i class="hm l0"></i>لم يُجرَّب</span>
          <span><i class="hm l1"></i>ضعيف</span>
          <span><i class="hm l3"></i>يتحسّن</span>
          <span><i class="hm l4"></i>متقن</span>
          <span><i class="hm l5"></i>متقن جداً</span>
        </div>
      </div>

      <button class="link-btn danger" data-act="deleteProfile" data-arg="${p.id}">🗑️ حذف ${esc(p.name)}</button>`;
  }

  // ───────────── زر الرجوع ─────────────
  // الشاشات التي يُرجَع إليها، ويُحفظ موضع التمرير في كل منها لتعود كما تركتها
  const STACKED = new Set(['profiles', 'camp', 'map', 'shop', 'animals', 'ranks', 'diary', 'performance']);
  const nav = { stack: [], cur: null, on: false, inPop: false, skip: false };

  Object.keys(Screens).forEach(name => {
    const show = Screens[name];
    Screens[name] = (...args) => {
      let y = 0;
      const i = nav.stack.findIndex(e => e.name === name);
      if (nav.cur === name) y = window.scrollY;                       // تحديث الشاشة نفسها
      else if (i >= 0) { y = nav.stack[i].y; nav.stack.length = i; }  // عودة إلى شاشة سابقة
      else if (STACKED.has(nav.cur)) {
        nav.stack.push({ name: nav.cur, y: window.scrollY });
        navGuard();
      }
      nav.cur = name;
      show(...args);
      if (y) window.scrollTo(0, y);
    };
  });

  // يُرجع شاشة واحدة، ويعيد false في الشاشة الأولى
  function navBack() {
    if (duel && app.querySelector('.duel')) {
      if (!app.querySelector('.duel-lock')) actions.exitDuel();
      return true;
    }
    if (brain && brain.duel && app.querySelector('.duel.brain') && !nav.leaving) {
      if (!app.querySelector('.duel-lock')) actions.exitBrain();
      return true;
    }
    if (nav.cur === 'parent' || nav.cur === 'parentGate') { actions.leaveParent(); return true; }
    if (nav.cur === 'welcome' && nav.stack.length) { actions.skipWelcome(); return true; }
    const prev = nav.stack[nav.stack.length - 1];
    if (!prev) return false;
    if (round) abortRound();
    abortBrain();
    Screens[Store.current() ? prev.name : 'profiles']();
    return true;
  }

  // نافذة التطبيق لا تعرف زر الرجوع إلا من سجلّ الصفحة، فنُبقي فيه مواضع احتياطية.
  // تُضاف مع لمس الشاشة لأن المتصفح يتخطّى ما يُضاف بلا لمس، وكل ضغطة رجوع تستهلك موضعاً
  const NAV_MIN = 2;
  const depth = () => (history.state && history.state.jh) || 0;
  function navGuard() {
    if (!nav.on || nav.inPop) return;
    try { history.pushState({ jh: depth() + 1 }, ''); } catch (e) {}
  }
  function navTop() {
    for (let i = depth(); i < NAV_MIN; i++) navGuard();
  }
  // إلى أول السجلّ: فتُغلق ضغطة الرجوع التالية التطبيق
  function navToStart() {
    const d = depth();
    if (!d) return;
    nav.skip = true;
    history.go(-d);
  }

  function onPop() {
    if (nav.skip) { nav.skip = false; return; }
    nav.inPop = true;
    let ok = true;
    try { ok = navBack(); } catch (e) {}
    nav.inPop = false;
    if (ok) return;
    navToStart();
    toast('اضغط رجوع مرة أخرى للخروج');
  }

  try { history.replaceState({ jh: depth() }, ''); } catch (e) {}
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  if (window.history && history.pushState) {
    nav.on = true;
    window.addEventListener('popstate', onPop);
    ['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, navTop, true));
  }

  // ───── الخروج والتصغير ─────
  // داخل تطبيق أندرويد (Capacitor) يُستعمل التطبيق نفسه، وفي نافذة الويب ما تسمح به
  const nativeApp = () => {
    try {
      const C = window.Capacitor;
      return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.App || null;
    } catch (e) { return null; }
  };
  const standalone = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;

  // زر التثبيت يظهر في المتصفح فقط؛ ومتصفح لا يدعم نافذة التثبيت يعرض طريقة التثبيت يدوياً
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    if (nav.cur === 'profiles') Screens.profiles();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    toast('✅ ثُبّت التطبيق');
    if (nav.cur === 'profiles') Screens.profiles();
  });

  function appButtons() {
    const A = nativeApp();
    const update = '<button class="chip" data-act="checkUpdate">🔄 تحديث</button>';
    if (!A && !standalone()) return `<div class="app-buttons"><button class="chip" data-act="installApp">📲 تثبيت التطبيق</button>${update}</div>`;
    return `<div class="app-buttons">
      ${update}
      ${A ? '<button class="chip" data-act="minimizeApp">➖ تصغير</button>' : ''}
      <button class="chip" data-act="exitApp">🚪 خروج</button>
    </div>`;
  }

  (() => {
    const A = nativeApp();
    if (!A || !A.addListener) return;
    let last = 0;
    A.addListener('backButton', () => {
      let ok = true;
      try { ok = navBack(); } catch (e) {}
      if (ok) { last = 0; return; }
      if (Date.now() - last < 2000) { A.exitApp(); return; }
      last = Date.now();
      toast('اضغط رجوع مرة أخرى للخروج');
    });
  })();

  // «الرئيسية» هي شاشة المستكشف الذي دخل، وتبقى كذلك حتى يضغط «تغيير»
  function go(name, arg) {
    if (name === 'home') name = Store.current() ? 'camp' : 'profiles';
    if (round) abortRound();
    abortDuel();
    abortBrain();
    Screens[name](arg);
  }

  // ───────────── الجولات ─────────────
  function startRound(mode, regionIndex = 0) {
    const p = Store.current();
    const w = Engine.current(p).id;
    const ws = Engine.state(p, w);
    const region = Engine.world(w).regions[regionIndex];
    const t = Journey.today(p);
    lastRound = { mode, regionIndex };
    round = {
      mode, region, w,
      // الإحماء يخلط الغابة الحالية مع الغابات التي لعب فيها الطفل فعلاً، فمن يركّز على غابة واحدة يبقى فيها.
      // والسباق في الغابة الحالية لأن رتبته لها
      pools: mode === 'warmup' ? Object.fromEntries(playedWorlds(p, w).map(x => [x, Engine.racePool(p, x)])) : null,
      pool: mode === 'race' || mode === 'warmup' ? Engine.racePool(p, w)
        : mode === 'tricky' ? trickyFacts(p, w) : Engine.tablePool(region.table, p, w),
      queue: mode === 'review' ? t.mistakes.map(m => m.slice()) : null,
      total: null,
      asked: 0, right: 0, cleared: 0, mistakes: [],
      input: '', q: null, locked: true, timer: null,
      secsAtStart: t.secs,
      goal: Engine.raceGoal(ws.bestRace),   // الضفة الأخرى في السباق
      // ما كان عليه الملف قبل السباق، ليستطيع ولي الأمر التراجع عنه إن لعبه غير الطفل
      undo: mode === 'race' ? {
        w, facts: {}, coins: p.coins, bestRace: ws.bestRace, unlocked: ws.unlocked, animals: ws.animals.slice(),
        skill: Engine.world(w).gen ? Object.assign({}, ws.skill) : undefined,
        day: { secs: t.secs, asked: t.asked, right: t.right, mistakes: t.mistakes.map(Engine.mistakeId), race: !!t.done.race },
      } : null,
    };
    round.total = mode === 'review' ? round.queue.length : mode === 'tricky' ? 9 : CONFIG.practiceLength;
    Screens.play();
    mode === 'race' ? countdown(3) : nextQuestion();
  }

  // ───── سباق الإخوة ─────
  // جزيرة كل طفل على بُعد أفضل نتيجة له وإجابتين، فيفوز من يتفوّق على نفسه
  // الجميع في الغابة التي اختارها من بدأ التحدي، وهدف كل طفل من أفضل سباق له فيها
  // (من لم يفتح الغابة بعد يُسأل من منطقتها الأولى)
  const duelGoal = p => Math.max(8, Engine.state(p, duelLand).bestRace + 2);
  const duelSide = p => ({ p, w: duelLand, pool: Engine.racePool(p, duelLand), goal: duelGoal(p),
    q: null, input: '', right: 0, locked: true, reachedAt: 0, qStart: 0 });

  // الغابات المتاحة للتحدي: المفتوحة لمن يبدأه (أو لأي طفل قبل أن يختار أحد)
  function duelLands() {
    const host = Store.state.profiles.find(k => k.id === duelPicks[0]);
    const kids = host ? [host] : Store.state.profiles;
    return WORLDS.filter(w => !w.soon && kids.some(k => Engine.isOpen(k, w)));
  }

  const MAX_PLAYERS = 4;
  // على جهاز واحد لاعبان فقط: الشاشة لا تتسع لأكثر. حتى 4 لاعبين على عدة أجهزة
  const MAX_LOCAL = 2;

  // أشكال تقسيم الشاشة حسب عدد اللاعبين، ويُحفظ الاختيار على هذا الجهاز فقط
  const DUEL_LAYOUTS = {
    2: [
      { id: 'side', name: 'جنباً إلى جنب', hint: 'متجاوران أمام الشاشة' },
      { id: 'stack', name: 'فوق وتحت', hint: 'كلاهما بنفس الاتجاه' },
      { id: 'face', name: 'متقابلان', hint: 'التابلت على الطاولة بينكما' },
    ],
    3: [{ id: 'cols', name: 'أعمدة', hint: 'التابلت بالعرض' }],
    4: [
      { id: 'grid', name: 'مربعات', hint: 'كلكم بنفس الاتجاه' },
      { id: 'grid-face', name: 'متقابلون', hint: 'اثنان من كل جهة' },
    ],
  };
  const duelLayouts = n => DUEL_LAYOUTS[Math.min(Math.max(n, 2), MAX_PLAYERS)];
  function duelLayout(n) {
    const k = Math.min(Math.max(n, 2), MAX_PLAYERS);
    const ok = DUEL_LAYOUTS[k];
    const saved = (Store.state.duelLayouts || {})[k] || (k === 2 ? Store.state.duelLayout : null);
    if (ok.some(l => l.id === saved)) return saved;
    if (k === 2) return matchMedia('(orientation: landscape)').matches ? 'side' : 'face';
    return ok[0].id;
  }

  function startDuel() {
    const players = duelPicks.map(id => Store.state.profiles.find(p => p.id === id));
    if (players.length < 2 || players.some(p => !p)) { Screens.duelPick(); return; }
    duel = {
      sides: players.map(duelSide),
      timer: null, timeouts: [],
    };
    Screens.duel();
    duelCountdown(3);
  }

  function duelCountdown(n) {
    if (!duelAlive()) return;
    if (n === 0) {
      Sound.play('go');
      const total = CONFIG.raceSeconds * 1000;
      duel.endsAt = performance.now() + total;
      duel.timer = setInterval(() => {
        if (!duelAlive()) return;
        const left = duel.endsAt - performance.now();
        const tb = $('timebar');
        tb.style.setProperty('--t', Math.max(0, left / total));
        tb.classList.toggle('hurry', left <= 10000);
        $('timeText').textContent = Math.max(0, Math.ceil(left / 1000));
        if (left <= 0) finishDuel();
      }, 100);
      duel.t0 = performance.now();
      duel.sides.forEach((_, i) => duelNext(i));
      return;
    }
    Sound.play('tick');
    duel.sides.forEach((_, i) => { $(`dQ${i}`).innerHTML = `<span class="count">${n}</span>`; });
    duel.timeouts.push(setTimeout(() => duelCountdown(n - 1), 800));
  }

  // يتوقف السباق إذا غادرت الشاشة بأي طريقة (زر الرجوع مثلاً)
  function duelAlive() {
    if (duel && !app.querySelector('.duel')) abortDuel();
    return !!duel;
  }

  function abortDuel() {
    if (!duel) return;
    if (duel.net) {
      clearTimeout(duel.net.waitT);
      // خرج قبل النهاية: نُعلم الجهاز الآخر
      if (!duel.net.finished) Sync.duel.update({ [`${myPath}.left`]: true }).catch(() => {});
    }
    clearInterval(duel.timer);
    duel.timeouts.forEach(clearTimeout);
    duel = null;
    document.body.classList.remove('bgrest');
  }

  // لوحة كل متسابق: أرقام (مع مفتاح السالب في غابته)، أو أزرار اختيار في أسئلة الكسور والسالب
  function duelPad(q) {
    if (q && q.choices) {
      return `<div class="choices" dir="ltr">${q.choices.map(c => `<button class="choice" data-dchoice="${c.v}">${c.html}</button>`).join('')}</div>`;
    }
    const minus = !!(q && q.minus);
    return numpad(minus).replace(/data-key=/g, 'data-dkey=');
  }

  function duelNext(i) {
    const side = duel.sides[i];
    side.q = Engine.pick(side.p, side.pool, side.q && side.q.key, side.w);
    side.input = '';
    side.locked = false;
    side.qStart = performance.now();
    const el = $(`dQ${i}`);
    const q = side.q;
    el.className = q.html ? 'question rich' : 'question';
    el.innerHTML = q.html ? q.html.replace('id="answer"', `id="dA${i}"`)
      : `<span>${q.a}</span><span class="op">${q.op}</span><span>${q.b}</span><span class="op">=</span><span id="dA${i}" class="answer">&nbsp;</span>`;
    const kind = q.choices ? 'choice' : q.minus ? 'signed' : 'plain';
    if (q.choices || side.pad !== kind) $(`dPad${i}`).innerHTML = duelPad(q);
    side.pad = kind;
  }

  function duelChoose(i, v) {
    if (!duelAlive()) return;
    const side = duel.sides[i];
    if (side.locked || !side.q.choices) return;
    side.input = v;
    duelSubmit(i);
  }

  function duelKey(i, k) {
    if (!duelAlive()) return;
    const side = duel.sides[i];
    if (side.locked) return;
    // أسئلة الاختيار: الأرقام 1، 2، 3 على لوحة اللابتوب تختار الجواب
    if (side.q.choices) { const c = side.q.choices[Number(k) - 1]; if (c) duelChoose(i, c.v); return; }
    if (k === 'minus') {
      if (!side.q.minus) return;
      side.input = side.input.startsWith('-') ? side.input.slice(1) : '-' + side.input;
    } else if (k === 'del') side.input = side.input.slice(0, -1);
    else if (k === 'ok') { if (/\d/.test(side.input)) duelSubmit(i); return; }
    else if (side.input.replace('-', '').length < 3) side.input += k;
    $(`dA${i}`).innerHTML = side.input.replace('-', '−') || '&nbsp;';
    if (/\d/.test(side.input) && side.input.length === String(side.q.answer).length) duelSubmit(i);
  }

  function duelSubmit(i) {
    const side = duel.sides[i];
    const q = side.q;
    const ok = q.choices ? side.input === q.answer : Number(side.input) === q.answer;
    const ms = performance.now() - side.qStart;
    side.locked = true;
    if (q.choices) {
      $(`dPad${i}`).querySelectorAll('.choice').forEach(b => {
        if (b.dataset.dchoice === q.answer) b.classList.add('right');
        else if (b.dataset.dchoice === side.input) b.classList.add('wrong');
      });
    }
    Engine.record(side.p, q, ok, ms);
    Journey.addAnswer(side.p, q, ok, ms);
    const el = $(`dQ${i}`);
    if (ok) {
      side.right++;
      Sound.play('right');
      el.classList.add('right');
      if (side.right >= side.goal && !side.reachedAt) side.reachedAt = performance.now();
    } else {
      Sound.play('wrong');
      el.classList.add('wrong');
      el.innerHTML = q.html ? `<span class="fix">${q.solved}</span>`
        : `<span>${q.a}</span><span class="op">${q.op}</span><span>${q.b}</span><span class="op">=</span><span class="fix">${q.answer}</span>`;
    }
    $(`dScore${i}`).textContent = side.right;
    $(`dWalker${i}`).style.setProperty('--p', Math.min(side.right / side.goal, 1));
    if (duel.net) netPush(false);
    duel.timeouts.push(setTimeout(() => { if (duelAlive()) duelNext(i); }, ok ? 300 : 900));
  }

  // نتيجة السباق في ملف الطفل: العملات والرقم القياسي والرتبة (مشتركة مع سباق النهر)
  function settleRace(p, right, w = 'mul') {
    const out = { newRecord: false, rankUp: null };
    const ws = Engine.state(p, w);
    p.coins += Math.floor(right * COINS.perCorrect);
    const oldRank = Engine.rankFor(ws.bestRace);
    if (right > ws.bestRace) {
      out.newRecord = ws.bestRace > 0;
      ws.bestRace = right;
      p.coins += COINS.raceRecord;
    }
    const newRank = Engine.rankFor(ws.bestRace);
    if (newRank !== oldRank) out.rankUp = newRank;
    // سباقات كل الغابات في قائمة واحدة، وw تميّز غير الضرب
    p.races.push(w === 'mul' ? { score: right, at: Date.now() } : { score: right, at: Date.now(), w });
    p.races = p.races.slice(-50);
    return out;
  }

  // يُحفظ مع آخر سباق فقط: ما يلزم لإرجاع الملف كما كان قبله
  function keepUndo(p, u) {
    const t = Journey.today(p);
    p.races.forEach(x => delete x.undo);
    p.races[p.races.length - 1].undo = {
      w: u.w, facts: u.facts, coins: p.coins - u.coins, bestRace: u.bestRace, unlocked: u.unlocked, animals: u.animals, skill: u.skill,
      day: {
        key: Journey.dayKey(), secs: t.secs - u.day.secs, asked: t.asked - u.day.asked, right: t.right - u.day.right,
        added: t.mistakes.map(Engine.mistakeId).filter(k => !u.day.mistakes.includes(k)), race: u.day.race,
      },
    };
  }

  // يحذف آخر نتيجة سباق ويُرجع ما غيّرته. السباقات القديمة (بلا سجل تراجع) تُرجَع جزئياً فقط
  function undoLastRace(p) {
    const last = p.races.pop();
    const u = last.undo;
    const ws = Engine.state(p, last.w || 'mul');
    if (u) {
      Object.entries(u.facts).forEach(([k, f]) => { if (f) ws.facts[k] = f; else delete ws.facts[k]; });
      p.coins = Math.max(0, p.coins - u.coins);
      ws.bestRace = u.bestRace;
      ws.unlocked = u.unlocked;
      ws.animals = u.animals;
      if (u.skill) ws.skill = u.skill;
      const t = p.days[u.day.key];
      if (t) {
        t.secs = Math.max(0, t.secs - u.day.secs);
        t.asked = Math.max(0, t.asked - u.day.asked);
        t.right = Math.max(0, t.right - u.day.right);
        t.mistakes = t.mistakes.filter(m => !u.day.added.includes(Engine.mistakeId(m)));
        if (!u.day.race && !t.chest) delete t.done.race;
      }
      return true;
    }
    const others = Math.max(0, ...racesIn(p, last.w || 'mul').map(x => x.score));
    let coins = Math.floor(last.score * COINS.perCorrect);
    if (ws.bestRace === last.score && others < last.score) { ws.bestRace = others; coins += COINS.raceRecord; }
    p.coins = Math.max(0, p.coins - coins);
    const t = p.days[Journey.dayKey(new Date(last.at))];
    const sameDay = p.races.some(x => Journey.dayKey(new Date(x.at)) === Journey.dayKey(new Date(last.at)));
    if (t && !t.chest && !sameDay) delete t.done.race;
    return false;
  }

  function stopDuel() {
    abortDuel();
    Store.save();
    Screens.duelPick();
  }

  // نتيجة طفل واحد من السباق في ملفه
  function settleSide(x, won) {
    const before = x.p.coins;
    const r = settleRace(x.p, x.right, x.w);
    if (won) x.p.coins += COINS.duelWin;
    Journey.complete(x.p, 'race');
    x.banners = [];
    if (r.newRecord) x.banners.push('🏆 رقم قياسي جديد!');
    if (r.rankUp) x.banners.push(`${r.rankUp.emoji} رتبة جديدة: ${r.rankUp.name}`);
    Engine.progress(x.p).forEach(e => x.banners.push(eventBanner(e)));
    x.coins = x.p.coins - before;
  }

  // المراكز: من وصل إلى جزيرته أولاً، ثم الأقرب إليها. المتساوون يتشاركون المركز
  function rankSides(list) {
    const key = x => x.reachedAt ? [0, x.reachedAt] : [1, -(x.right / x.goal)];
    const cmp = (a, b) => { const [p, q] = [key(a), key(b)]; return p[0] - q[0] || p[1] - q[1]; };
    const sorted = list.slice().sort(cmp);
    sorted.forEach((x, i) => { x.place = i && cmp(sorted[i - 1], x) === 0 ? sorted[i - 1].place : i + 1; });
    return sorted;
  }
  // فائز واحد فقط إذا انفرد بالمركز الأول
  const soleWinner = ranked => {
    const firsts = ranked.filter(x => x.place === 1);
    return ranked.length >= 2 && firsts.length === 1 ? firsts[0] : null;
  };

  function finishDuel() {
    if (duel.net) { netFinish(); return; }
    const sides = duel.sides;
    abortDuel();
    const ranked = rankSides(sides);
    const winner = soleWinner(ranked);
    sides.forEach(x => settleSide(x, x === winner));
    Store.save();
    Sound.play('win');
    Screens.duelResults({ sides: ranked, winner });
  }

  // ───── سباق الإخوة على عدة أجهزة ─────
  // مستند واحد للسباق: كل جهاز يكتب تقدّم طفله فقط في players.{معرّف الجهاز}، ويقرأ تقدّم الآخرين
  const DEVICE = (() => {
    try {
      let id = localStorage.getItem('jungle-hero-device');
      if (!id) localStorage.setItem('jungle-hero-device', id = Math.random().toString(36).slice(2, 10));
      return id;
    } catch (e) { return Math.random().toString(36).slice(2, 10); }
  })();
  const INVITE_MS = 2 * 60 * 1000;   // تنتهي الدعوة بعد دقيقتين
  const myPath = `players.${DEVICE}`;

  const netPlayer = p => ({
    device: DEVICE, pid: p.id, name: p.name, avatar: p.avatar, goal: duelGoal(p), joinedAt: Date.now(),
    right: 0, reachedMs: 0, done: false, left: false,
    brain: Brain.GAMES.map(() => 0), g: 0,   // مبارزة العقول: الإجابات الصحيحة في كل لعبة، واللعبة الحالية
  });
  const activePlayers = d => Object.values((d && d.players) || {})
    .filter(x => !x.left).sort((a, b) => a.joinedAt - b.joinedAt);

  function netHost(kind = 'race') {
    const p = Store.state.profiles.find(k => k.id === duelPicks[0]);
    if (!p) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    netPending = { id, role: 'host', pid: p.id };
    Screens.netWait('host');
    Sync.duel.set({ id, kind, world: duelLand, state: 'waiting', createdAt: Date.now(), host: DEVICE, players: { [DEVICE]: netPlayer(p) } })
      .catch(() => {
        netPending = null;
        toast('⚠️ تعذّر إرسال الدعوة. تأكد من الإنترنت وتسجيل الدخول.', 5000);
        Screens.duelPick();
      });
  }

  function netJoin(pid) {
    const d = Sync.duel.data();
    const p = Store.state.profiles.find(k => k.id === pid);
    if (!p || !inviteFor(d)) { toast('انتهت الدعوة أو اكتمل العدد'); go('home'); return; }
    duelLand = d.world || 'mul';
    netPending = { id: d.id, role: 'guest', pid };
    Screens.netWait('guest');
    Sync.duel.update({ [myPath]: netPlayer(p) }).catch(() => {
      netPending = null;
      toast('⚠️ تعذّر الانضمام. تأكد من الإنترنت.', 5000);
      go('home');
    });
  }

  function netStart() {
    const d = Sync.duel.data();
    if (!netPending || netPending.role !== 'host' || !d || d.id !== netPending.id || activePlayers(d).length < 2) return;
    Sync.duel.update({ state: 'running' }).catch(() => {});
    d.kind === 'brain' ? startNetBrain(d) : startNetDuel(d);
  }

  function netCancel() {
    if (netPending) {
      Sync.duel.update(netPending.role === 'host' ? { state: 'cancelled' } : { [`${myPath}.left`]: true }).catch(() => {});
      netPending = null;
    }
    go('home');
  }

  function startNetDuel(d) {
    duelLand = d.world || 'mul';
    const { pid } = netPending;
    netPending = null;
    const p = Store.state.profiles.find(k => k.id === pid);
    const opps = activePlayers(d).filter(x => x.device !== DEVICE).slice(0, MAX_PLAYERS - 1).map(x => Object.assign({}, x));
    if (!p || !opps.length) { go('home'); return; }
    duel = {
      sides: [duelSide(p)],
      net: { id: d.id, opps, finished: false },
      timer: null, timeouts: [],
    };
    Screens.duel();
    duelCountdown(3);
  }

  // نرفع التقدّم كل 0.6 ثانية على الأكثر، والنتيجة النهائية فوراً
  function netPush(final) {
    const n = duel.net, s = duel.sides[0], t0 = duel.t0;
    const send = () => {
      n.pushT = null;
      const data = {
        [`${myPath}.right`]: s.right,
        [`${myPath}.reachedMs`]: s.reachedAt ? Math.round(s.reachedAt - t0) : 0,
      };
      if (final) data[`${myPath}.done`] = true;
      Sync.duel.update(data).catch(() => {});
    };
    if (final) { clearTimeout(n.pushT); send(); return; }
    if (!n.pushT) n.pushT = setTimeout(send, 600);
  }

  const othersDone = n => n.opps.every(o => o.done || o.left);

  function netFinish() {
    const n = duel.net;
    clearInterval(duel.timer);
    duel.timeouts.forEach(clearTimeout);
    duel.sides[0].locked = true;
    n.finished = true;
    netPush(true);
    const box = document.createElement('div');
    box.className = 'duel-lock';
    box.innerHTML = '<div class="card pin-card"><div class="result-hero wait-spin">⏳</div><h2>بانتظار نتائج المنافسين…</h2></div>';
    app.querySelector('.duel').appendChild(box);
    // إذا انقطع اتصال أحدهم لا ننتظره طويلاً
    n.waitT = setTimeout(netResolve, 8000);
    if (othersDone(n)) netResolve();
  }

  function netResolve() {
    if (!duel || !duel.net) return;
    const n = duel.net, s = duel.sides[0], t0 = duel.t0;
    abortDuel();
    const mine = Object.assign(s, { reachedAt: s.reachedAt ? s.reachedAt - t0 : 0 });
    const others = n.opps.map(o => ({
      p: { avatar: o.avatar, name: o.name }, right: o.right, goal: o.goal, reachedAt: o.reachedMs || 0,
      coins: null, banners: [], out: o.left ? '🏳️ انسحب قبل النهاية' : !o.done ? '📡 انقطع اتصاله' : '',
    }));
    const ranked = rankSides([mine, ...others.filter(x => !x.out)]);
    const winner = soleWinner(ranked);
    settleSide(mine, winner === mine);
    Store.save();
    Sound.play('win');
    Screens.duelResults({
      sides: ranked.concat(others.filter(x => x.out)), winner, net: true,
      note: ranked.length < 2 ? 'لم يُكمل المنافسون السباق، فلا فائز هذه المرة' : '',
    });
  }

  // دعوة صالحة من جهاز آخر لم ننضم إليها، وفيها مكان
  const inviteFor = d => !!(d && d.state === 'waiting' && d.players && d.host !== DEVICE && d.players[d.host] &&
    !activePlayers(d).some(x => x.device === DEVICE) && activePlayers(d).length < MAX_PLAYERS &&
    Date.now() - d.createdAt < INVITE_MS);

  const inviteBar = document.createElement('div');
  inviteBar.className = 'invite-bar';
  inviteBar.hidden = true;
  document.body.appendChild(inviteBar);
  inviteBar.addEventListener('click', e => {
    const d = Sync.duel.data();
    if (e.target.closest('[data-invite=join]') && inviteFor(d)) { inviteBar.hidden = true; Screens.netJoin(d); }
    else if (e.target.closest('[data-invite=no]')) { inviteBar.dataset.dismissed = d ? d.id : ''; inviteBar.hidden = true; }
  });
  let inviteTimer;
  function showInvite(d) {
    const ok = inviteFor(d) && !round && !duel && !brain && !netPending && inviteBar.dataset.dismissed !== d.id;
    inviteBar.hidden = !ok;
    clearTimeout(inviteTimer);
    if (!ok) return;
    const host = d.players[d.host];
    inviteBar.innerHTML = `<span>${d.kind === 'brain' ? '🧠' : '⚔️'} ${host.avatar} <b>${esc(host.name)}</b> يدعوك ${d.kind === 'brain' ? 'لمبارزة العقول' : 'لسباق'} في ${Engine.world(d.world || 'mul').icon} ${Engine.world(d.world || 'mul').name}!</span>
      <button class="btn orange" data-invite="join">انضم</button>
      <button class="chip" data-invite="no" aria-label="تجاهل">✕</button>`;
    inviteTimer = setTimeout(() => showInvite(Sync.duel.data()), d.createdAt + INVITE_MS - Date.now());
  }

  Sync.duel.on(d => {
    showInvite(d);
    if (netPending) {
      // انتظار: لا نتابع إلا إذا كانت شاشة الانتظار ما زالت ظاهرة
      if (!app.querySelector('.net-wait')) { netPending = null; return; }
      if (!d || d.id !== netPending.id) return;
      if (d.state === 'cancelled') { netPending = null; toast('أُلغيت الدعوة'); go('home'); return; }
      if (d.state === 'running') {
        if (activePlayers(d).some(x => x.device === DEVICE)) d.kind === 'brain' ? startNetBrain(d) : startNetDuel(d);
        else { netPending = null; toast('بدأ السباق قبل انضمامك'); go('home'); }
        return;
      }
      Screens.netWait(netPending.role);   // تحديث قائمة المنضمين
      return;
    }
    if (brain && brain.net && d && d.id === brain.net.id) { netBrainUpdate(d); return; }
    if (!duel || !duel.net || !d || d.id !== duel.net.id) return;
    const n = duel.net;
    n.opps.forEach((o, j) => {
      const x = d.players && d.players[o.device];
      if (!x) return;
      if (x.left && !o.left && !n.finished) toast(`🏳️ انسحب ${x.name}`, 3000);
      Object.assign(o, x);
      if ($(`oWalker${j}`)) {
        $(`oWalker${j}`).style.setProperty('--p', Math.min(x.right / x.goal, 1));
        $(`oScore${j}`).textContent = x.right;
      }
    });
    if (n.finished && othersDone(n)) netResolve();
  });

  function countdown(n) {
    if (!round) return;
    if (n === 0) {
      Sound.play('go');
      startTimer();
      nextQuestion();
      return;
    }
    Sound.play('tick');
    $('question').innerHTML = `<span class="count">${n}</span>`;
    $('feedback').textContent = 'استعد...';
    round.timeout = setTimeout(() => countdown(n - 1), 800);
  }

  function startTimer() {
    const total = CONFIG.raceSeconds * 1000;
    round.endsAt = performance.now() + total;
    round.timer = setInterval(() => {
      const left = round.endsAt - performance.now();
      const tb = $('timebar');
      tb.style.width = Math.max(0, (left / total) * 100) + '%';
      tb.classList.toggle('hurry', left <= 10000);
      $('timeText').textContent = Math.max(0, Math.ceil(left / 1000));
      if (left <= 0) finishRound();
    }, 100);
  }

  // minus: لوحة غابة السالب والموجب، فيها مفتاح يقلب إشارة الجواب
  const numpad = (minus = false) => `<div class="numpad ${minus ? 'signed' : ''}" dir="ltr">
    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-key="${n}">${n}</button>`).join('')}
    ${minus ? '<button class="key util minus" data-key="minus" aria-label="سالب">−</button>' : ''}
    ${minus ? '' : '<button class="key util" data-key="del" aria-label="مسح">⌫</button>'}
    <button class="key" data-key="0">0</button>
    ${minus ? '<button class="key util" data-key="del" aria-label="مسح">⌫</button>' : ''}
    <button class="key ok" data-key="ok" aria-label="تأكيد">✓</button>
  </div>`;

  // أسئلة الاختيار (الكسور): أزرار الأجوبة مكان لوحة الأرقام
  const choicePad = q => `<div class="choices" dir="ltr">${q.choices.map(c =>
    `<button class="choice" data-choice="${c.v}">${c.html}</button>`).join('')}</div>`;

  function choose(v) {
    if (!round || round.locked || !round.q.choices) return;
    round.input = v;
    submit();
  }

  function nextQuestion() {
    const p = Store.current();
    if (round.mode === 'review') {
      round.q = Engine.fromMistake(round.queue.shift());
    } else {
      const w = round.pools ? any(Object.keys(round.pools)) : round.w;
      round.q = Engine.pick(p, round.pools ? round.pools[w] : round.pool, round.q && round.q.key, w);
    }
    round.input = '';
    round.locked = false;
    round.qStart = performance.now();
    const q = round.q;
    const el = $('question');
    el.className = 'question';
    el.innerHTML = q.html || `<span>${q.a}</span><span class="op">${q.op}</span><span>${q.b}</span><span class="op">=</span><span id="answer" class="answer">&nbsp;</span>`;
    el.classList.toggle('rich', !!q.html);
    $('feedback').textContent = '';
    const kind = q.choices ? 'choice' : q.minus ? 'signed' : 'plain';
    if (q.choices || round.pad !== kind) $('pad').innerHTML = q.choices ? choicePad(q) : numpad(!!q.minus);
    round.pad = kind;
  }

  function pressKey(k) {
    if (!round || round.locked) return;
    // في أسئلة الاختيار: الأرقام 1، 2، 3 على لوحة اللابتوب تختار الجواب
    if (round.q.choices) { const c = round.q.choices[Number(k) - 1]; if (c) choose(c.v); return; }
    if (k === 'minus') {
      if (!round.q.minus) return;
      round.input = round.input.startsWith('-') ? round.input.slice(1) : '-' + round.input;
    } else if (k === 'del') round.input = round.input.slice(0, -1);
    else if (k === 'ok') { if (/\d/.test(round.input)) submit(); return; }
    else if (round.input.replace('-', '').length < 3) round.input += k;
    $('answer').innerHTML = round.input.replace('-', '−') || '&nbsp;';
    // يُصحَّح تلقائياً عند كتابة عدد الأرقام الصحيح. أسئلة السالب تنتظر زر ✓،
    // لأن التصحيح التلقائي يكشف الإشارة: يُصحَّح «7» فوراً إن كان الجواب 7، ولا يُصحَّح إن كان −7
    if (!round.q.minus && /\d/.test(round.input) && round.input.length === String(round.q.answer).length) submit();
  }

  function submit() {
    const p = Store.current();
    const q = round.q;
    const ok = q.choices ? round.input === q.answer : Number(round.input) === q.answer;
    const ms = performance.now() - round.qStart;
    round.locked = true;
    if (q.choices) {
      $('pad').querySelectorAll('.choice').forEach(b => {
        if (b.dataset.choice === q.answer) b.classList.add('right');
        else if (b.dataset.choice === round.input) b.classList.add('wrong');
      });
    }
    const facts = Engine.state(p, q.w).facts;
    if (round.undo && !(q.key in round.undo.facts)) round.undo.facts[q.key] = facts[q.key] ? Object.assign({}, facts[q.key]) : null;
    Engine.record(p, q, ok, ms);
    Journey.addAnswer(p, q, ok, ms);
    round.asked++;

    const el = $('question');
    if (ok) {
      round.right++;
      Sound.play('right');
      el.classList.add('right');
      $('feedback').textContent = ['رائع! 🎉', 'صحيح! ⭐', 'ممتاز! 🌟', 'أحسنت! 👏'][round.right % 4];
    } else {
      round.mistakes.push(q);
      Sound.play('wrong');
      el.classList.add('wrong');
      $('feedback').innerHTML = `الإجابة الصحيحة: <b dir="ltr">${q.solved}</b>`;
    }

    $('score').textContent = round.right;
    let progress;
    if (round.mode === 'race') {
      progress = Math.min(round.right / round.goal, 1);
    } else if (round.mode === 'review') {
      // في المراجعة: المسألة الخاطئة تعود لآخر الطابور حتى تُجاب صحيحة
      if (ok) {
        round.cleared++;
        Journey.clearMistake(p, q);
        $('steps').children[round.cleared - 1].className = 'right';
      } else {
        round.queue.push(Engine.mistakeOf(q));
      }
      progress = round.cleared / round.total;
    } else {
      $('steps').children[round.asked - 1].className = ok ? 'right' : 'wrong';
      progress = round.asked / round.total;
    }
    $('walker').style.setProperty('--p', progress);

    const delay = ok ? 350 : round.mode === 'race' ? 1000 : 1800;
    round.timeout = setTimeout(() => {
      if (!round) return;
      const over = round.mode === 'review' ? !round.queue.length
        : round.mode !== 'race' && round.asked >= round.total;
      over ? finishRound() : nextQuestion();
    }, delay);
  }

  function abortRound() {
    clearInterval(round.timer);
    clearTimeout(round.timeout);
    round = null;
    Store.save();
  }

  function finishRound() {
    const r = round;
    abortRound();
    const p = Store.current();
    const s = Store.state.settings;
    const coinsBefore = p.coins;
    const summary = { mode: r.mode, right: r.right, asked: r.asked, mistakes: r.mistakes, newRecord: false, rankUp: null };

    if (r.mode === 'race') {
      Object.assign(summary, settleRace(p, r.right, r.w));
    } else {
      p.coins += Math.floor(r.right * COINS.perCorrect);
      p.coins += COINS.roundDone;
      if (r.mode !== 'review' && r.right === r.asked) p.coins += COINS.perfect;
    }

    // محطات رحلة اليوم: أي سباق يُكمل محطة السباق
    const stationId = r.mode === 'practice' || r.mode === 'tricky' ? null : r.mode;
    if (stationId && Journey.complete(p, stationId)) {
      summary.station = Journey.STATIONS.find(x => x.id === stationId);
    }
    summary.chestReady = Journey.chestReady(p);

    const secs = Journey.today(p).secs;
    summary.goalReached = r.secsAtStart < s.goalMin * 60 && secs >= s.goalMin * 60;
    summary.restTime = s.maxMin && r.secsAtStart < s.maxMin * 60 && secs >= s.maxMin * 60;

    summary.events = Engine.progress(p);
    summary.coins = p.coins - coinsBefore;
    if (r.mode === 'race') keepUndo(p, r.undo);
    Store.save();
    const big = summary.events.length || summary.newRecord || summary.rankUp || summary.station || summary.goalReached;
    Sound.play(big ? 'win' : 'coin');
    Screens.results(summary);
  }

  // إيقاف السباق أو المبارزة يحتاج رمز ولي الأمر حتى لا يوقفها الخاسر
  let stopLock = null;   // { pin, fn }
  function askStop(what, fn) {
    if (!Store.state.settings.pin) {
      if (confirm(`إيقاف ${what}؟ لن تُحسب النتيجة.`)) fn();
      return;
    }
    stopLock = { pin: '', fn };
    const lock = document.createElement('div');
    lock.className = 'duel-lock';
    lock.innerHTML = `<div class="card pin-card">
      <h2>⏸️ إيقاف ${what}</h2>
      <p>أدخل رمز ولي الأمر</p>
      <div class="pin-dots" id="duelDots">${'<i></i>'.repeat(4)}</div>
      <div class="numpad small" dir="ltr">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-act="duelPin" data-arg="${n}">${n}</button>`).join('')}
        <button class="key util" data-act="duelPin" data-arg="del" aria-label="مسح">⌫</button>
        <button class="key" data-act="duelPin" data-arg="0">0</button>
        <span></span>
      </div>
      <button class="link-btn dark" data-act="duelPin" data-arg="cancel">↩️ متابعة ${what}</button>
    </div>`;
    app.querySelector('.duel').appendChild(lock);
  }

  // ───── تحدّي العقل ─────
  // brain.sides: لاعب واحد من المخيّم، أو من 2 إلى 4 في مبارزة العقول على شاشة مقسومة.
  // كل لاعب يُسأل من غابته الحالية وبمستواه هو
  function brainSideFor(p, w = Engine.current(p).id) {
    const bs = Brain.state(p, w);
    return {
      p, w, P: null, q: null, locked: true,
      // كل لعبة تبدأ أقل بمستوى من آخر ما وصل إليه، ليبدأ مرتاحاً
      games: Brain.GAMES.map(G => {
        const lv = Math.max(1, (bs.lv[G.id] || 1) - 1);
        return { id: G.id, lv, top: lv, streak: 0, right: 0, wrong: 0, points: 0, medal: '', won: false };
      }),
    };
  }

  // دعوة الإخوة من بطاقة اللعبة: التحدي نفسه في غابة الطفل الحالي، وهو مختار مسبقاً
  function inviteSiblings(kind) {
    const p = Store.current();
    duelKind = kind;
    duelLand = Engine.current(p).id;
    duelPicks = [p.id];
    actions.duelSetup();
  }

  function startBrain() {
    const p = Store.current();
    abortBrain();
    brain = { duel: false, g: 0, phase: 'intro', sides: [brainSideFor(p)], timer: null, timeouts: [], secsAtStart: Journey.today(p).secs };
    Screens.brain();
  }

  function startBrainDuel() {
    const players = duelPicks.map(id => Store.state.profiles.find(p => p.id === id));
    if (players.length < 2 || players.some(p => !p)) { Screens.duelPick(); return; }
    abortBrain();
    brain = { duel: true, g: 0, phase: 'play', sides: players.map(p => brainSideFor(p, duelLand)), timer: null, timeouts: [] };
    brainGo();
  }

  // تتوقف اللعبة إذا غادرت الشاشة بأي طريقة
  function brainAlive() {
    if (brain && !app.querySelector('.brain')) abortBrain();
    return !!brain;
  }
  const brainSide = i => (brainAlive() && brain.phase === 'play' && !brain.sides[i].locked ? brain.sides[i] : null);

  function abortBrain() {
    if (!brain) return;
    if (brain.net) {
      clearTimeout(brain.net.waitT);
      clearTimeout(brain.net.pushT);
      if (!brain.net.finished) Sync.duel.update({ [`${myPath}.left`]: true }).catch(() => {});
    }
    clearInterval(brain.timer);
    brain.timeouts.forEach(clearTimeout);
    // الوقت الذي لُعب يُحسب في وقت اليوم لكل لاعب
    if (brain.t0) brain.sides.forEach(s => { Journey.today(s.p).secs += (performance.now() - brain.t0) / 1000; });
    brain = null;
    document.body.classList.remove('bgrest');
    Store.save();
  }

  function brainGo() {
    if (!brain) return;
    const b = brain;
    b.phase = 'play';
    b.sides.forEach(s => { s.P = Brain.pool(s.p, s.w); s.locked = true; });
    b.duel ? Screens.brainDuel() : Screens.brain();
    b.sides.forEach((_, i) => brainLevel(i));
    const G = Brain.GAMES[b.g];
    const tick = n => {
      if (!brainAlive()) return;
      if (n === 0) {
        Sound.play('go');
        const total = (b.duel ? Brain.DUEL_SECONDS : Brain.SECONDS) * 1000;
        b.t0 = b.t0 || performance.now();
        b.endsAt = performance.now() + total;
        b.timer = setInterval(() => {
          if (!brainAlive()) return;
          const left = b.endsAt - performance.now();
          const tb = $('timebar');
          if (b.duel) tb.style.setProperty('--t', Math.max(0, left / total));
          else tb.style.width = Math.max(0, (left / total) * 100) + '%';
          tb.classList.toggle('hurry', left <= 10000);
          $('timeText').textContent = Math.max(0, Math.ceil(left / 1000));
          if (left <= 0) brainEndGame();
        }, 100);
        b.sides.forEach((_, i) => brainNext(i));
        return;
      }
      Sound.play('tick');
      b.sides.forEach((_, i) => {
        $(`bStage${i}`).innerHTML = (b.duel ? `<div class="bgame">${G.icon} ${G.name}<small>${G.how}</small></div>` : '') +
          `<div class="question"><span class="count">${n}</span></div>`;
      });
      b.timeouts.push(setTimeout(() => tick(n - 1), 800));
    };
    tick(3);
  }

  function brainLevel(i) {
    const g = brain.sides[i].games[brain.g];
    $(`bLv${i}`).innerHTML = `المستوى ${'⭐'.repeat(g.lv)}<span class="dim">${'⭐'.repeat(5 - g.lv)}</span>`;
    // في المبارزة تُعدّ الإجابات الصحيحة، لأن لكل لاعب مستواه
    $(`bScore${i}`).textContent = brain.duel ? g.right : g.points;
  }

  const brainExpr = c => c.html || `<span dir="ltr">${c.a} ${c.op} ${c.b}</span>`;

  function brainNext(i) {
    if (!brainAlive()) return;
    const b = brain;
    const s = b.sides[i];
    const g = s.games[b.g];
    // مسائل الجمع والطرح والكسور عشوائية، فتتجدّد مع كل سؤال
    if (Engine.world(s.w).gen) s.P = Brain.pool(s.p, s.w);
    // شاشة المبارزة أضيق، فبطاقات أقل
    const q = Brain.make[g.id](s.P, g.lv, b.duel ? 6 : 8);
    if (!q) { s.locked = true; return; }
    s.q = q;
    $(`bFb${i}`).textContent = '';
    const stage = $(`bStage${i}`);
    if (g.id === 'cmp') {
      stage.innerHTML = `<div class="scale">
        ${[q.x, q.y].map((c, k) => `<button class="pan" data-act="brainCmp" data-arg="${i}:${k}">
          <span class="expr">${brainExpr(c)}</span><span class="val" dir="ltr"></span></button>`).join('<span class="fulcrum">⚖️</span>')}
      </div>`;
    } else if (g.id === 'pick') {
      stage.innerHTML = `<div class="target">اضغط كل ما يساوي <b dir="ltr">${q.label || q.n}</b></div>
        <div class="bcards">${q.cards.map((c, k) => `<button class="bcard" data-act="brainCard" data-arg="${i}:${k}">${brainExpr(c)}</button>`).join('')}</div>`;
    } else {
      const total = q.groups ? q.groups.reduce((n, x) => n + x.count, 0) : 0;
      const fruits = x => Array.from({ length: x.count }, (_, k) =>
        `<i class="${x.crossed && k >= x.count - x.crossed ? 'x' : ''}">${q.fruit}</i>`).join('');
      stage.innerHTML = `<p class="arr-text">${q.text}</p>
        <div class="fruits ${total > 50 ? 'many' : ''} ${q.rows || (q.groups || []).some(x => x.label) ? 'rows' : ''}">
          ${q.shape ? `<div class="bshape">${q.shape}</div>` : q.groups.map(x => `${x.plus ? '<span class="plus">+</span>' : ''}<div class="fgroup">
            ${x.label ? `<span class="basket">${x.label}</span>` : ''}
            <div class="fgrid" style="grid-template-columns:repeat(${x.cols},auto)">${fruits(x)}</div></div>`).join('')}
        </div>
        <div class="bchoices" dir="ltr">${q.options.map(o => (typeof o === 'object' ? o : { v: o, html: o })).map(o =>
          `<button class="bchoice" data-act="brainChoice" data-arg="${i}:${o.v}">${o.html}</button>`).join('')}</div>`;
      // المستويات العليا: الثمار تظهر لحظة ثم تُغطّى، فيحسب بدل أن يعدّ
      if (q.flash) {
        b.timeouts.push(setTimeout(() => {
          if (brain === b && s.q === q && !s.locked) stage.querySelector('.fruits').classList.add('covered');
        }, q.flash));
      }
    }
    s.locked = false;
  }

  function brainAnswer(i, ok) {
    const b = brain;
    const s = b.sides[i];
    const g = s.games[b.g];
    s.locked = true;
    Brain.step(g, ok);
    Sound.play(ok ? 'right' : 'wrong');
    $(`bFb${i}`).textContent = ok ? ['رائع! 🎉', 'صحيح! ⭐', 'ممتاز! 🌟', 'أحسنت! 👏'][g.right % 4] : 'لا بأس، ركّز في التالي 💪';
    brainLevel(i);
    if (b.net) netBrainPush(false);
    b.timeouts.push(setTimeout(() => brainNext(i), ok ? 450 : 1300));
  }

  function brainEndGame() {
    const b = brain;
    clearInterval(b.timer);
    b.timeouts.forEach(clearTimeout);
    b.timeouts = [];
    b.sides.forEach(s => { s.locked = true; });
    const games = b.sides.map(s => s.games[b.g]);
    games.forEach(g => { g.medal = Brain.medal(g.points); });
    let note;
    if (b.net) {
      note = `✅ ${games[0].right} إجابة صحيحة`;
    } else if (b.duel) {
      // يفوز باللعبة من أجاب صحيحاً أكثر (ويتشارك المتساوون)
      const top = Math.max(...games.map(g => g.right));
      if (top > 0) games.forEach(g => { g.won = g.right === top; });
      const won = b.sides.filter(s => s.games[b.g].won);
      note = won.length === 1 ? `👑 ${won[0].p.avatar} ${won[0].p.name} فاز باللعبة` : won.length ? '🤝 تعادل في هذه اللعبة' : '';
    } else {
      note = `${games[0].medal} ${games[0].points} نقطة`;
    }
    if (++b.g < Brain.GAMES.length) {
      Sound.play('coin');
      if (note) toast(note, 1800);
      if (b.net) netBrainPush(false);
      if (b.duel) {
        b.phase = 'wait';
        b.timeouts.push(setTimeout(() => { if (brainAlive()) brainGo(); }, 2000));
      } else {
        b.phase = 'intro';
        Screens.brain();
      }
      return;
    }
    b.net ? netBrainFinish() : b.duel ? finishBrainDuel() : finishBrain();
  }

  function finishBrain() {
    const b = brain;
    const side = b.sides[0];
    abortBrain();
    const p = side.p;
    const bs = Brain.state(p, side.w);
    const coinsBefore = p.coins;
    const grams = side.games.reduce((n, g) => n + g.points, 0);
    const right = side.games.reduce((n, g) => n + g.right, 0);
    p.coins += Math.floor(right * COINS.perCorrect) + COINS.roundDone;
    const newRecord = grams > bs.best && bs.best > 0;
    if (grams > bs.best) { bs.best = grams; p.coins += COINS.raceRecord; }
    side.games.forEach(g => { bs.lv[g.id] = g.lv; });
    const goalMin = Store.state.settings.goalMin;
    const summary = {
      grams, best: bs.best, games: side.games, newRecord, coins: p.coins - coinsBefore,
      goalReached: b.secsAtStart < goalMin * 60 && Journey.today(p).secs >= goalMin * 60,
    };
    Store.save();
    Sound.play(newRecord ? 'win' : 'coin');
    Screens.brainResults(summary);
  }

  // المراكز: الأكثر فوزاً بالألعاب، ثم الأكثر إجابات صحيحة، والمتساوون يتشاركون المركز
  function rankBrain(list) {
    const cmp = (x, y) => y.wins - x.wins || y.right - x.right;
    const ranked = list.slice().sort(cmp);
    ranked.forEach((x, i) => { x.place = i && cmp(ranked[i - 1], x) === 0 ? ranked[i - 1].place : i + 1; });
    return ranked;
  }

  function finishBrainDuel() {
    const b = brain;
    abortBrain();
    const list = b.sides.map(s => ({
      p: s.p, s,
      wins: s.games.filter(g => g.won).length,
      right: s.games.reduce((n, g) => n + g.right, 0),
      banners: [],
    }));
    const ranked = rankBrain(list);
    const winner = soleWinner(ranked);
    list.forEach(x => {
      const before = x.p.coins;
      x.p.coins += Math.floor(x.right * COINS.perCorrect) + (x === winner ? COINS.duelWin : 0);
      const bs = Brain.state(x.p, x.s.w);
      x.s.games.forEach(g => { bs.lv[g.id] = g.lv; });
      x.coins = x.p.coins - before;
      x.out = Brain.GAMES.map((G, j) => `${G.icon} ${x.s.games[j].won ? '👑' : ''}${x.s.games[j].right}`).join(' · ');
    });
    Store.save();
    Sound.play('win');
    Screens.duelResults({
      sides: ranked, winner, again: 'startBrainDuel',
      note: winner ? `فاز بـ ${winner.wins} من ${Brain.GAMES.length} ألعاب` : 'نفس عدد الألعاب والإجابات الصحيحة',
    });
  }

  // ───── مبارزة العقول على عدة أجهزة ─────
  // كل جهاز يلعب الألعاب الثلاث وحده، ويرفع إجاباته الصحيحة في كل لعبة. الفائز بكل لعبة يُحسب في النهاية
  function startNetBrain(d) {
    duelLand = d.world || 'mul';
    const { pid } = netPending;
    netPending = null;
    const p = Store.state.profiles.find(k => k.id === pid);
    const opps = activePlayers(d).filter(x => x.device !== DEVICE).slice(0, MAX_PLAYERS - 1).map(x => Object.assign({}, x));
    if (!p || !opps.length) { go('home'); return; }
    abortBrain();
    brain = {
      duel: true, g: 0, phase: 'play', sides: [brainSideFor(p, duelLand)], timer: null, timeouts: [],
      net: { id: d.id, opps, finished: false },
    };
    brainGo();
  }

  // شريط المنافسين: إجاباتهم الصحيحة في كل لعبة حتى الآن
  const brainOpps = () => brain.net.opps.map(o => `<div class="opp">
      <b>${o.avatar} ${esc(o.name)}</b>
      <span class="ogames">${o.left ? '🏳️ انسحب' : Brain.GAMES.map((G, j) =>
        `<span class="${j === (o.g || 0) && !o.done ? 'on' : ''}">${G.icon} ${ltr((o.brain || [])[j] || 0)}</span>`).join('')}</span>
    </div>`).join('');

  // نرفع التقدّم كل 0.6 ثانية على الأكثر، والنتيجة النهائية فوراً
  function netBrainPush(final) {
    const n = brain.net;
    const s = brain.sides[0];
    const send = () => {
      n.pushT = null;
      const data = { [`${myPath}.brain`]: s.games.map(g => g.right), [`${myPath}.g`]: Math.min(brain ? brain.g : 0, Brain.GAMES.length - 1) };
      if (final) data[`${myPath}.done`] = true;
      Sync.duel.update(data).catch(() => {});
    };
    if (final) { clearTimeout(n.pushT); send(); return; }
    if (!n.pushT) n.pushT = setTimeout(send, 600);
  }

  function netBrainUpdate(d) {
    const n = brain.net;
    n.opps.forEach(o => {
      const x = d.players && d.players[o.device];
      if (!x) return;
      if (x.left && !o.left && !n.finished) toast(`🏳️ انسحب ${x.name}`, 3000);
      Object.assign(o, x);
    });
    if ($('bOpps')) $('bOpps').innerHTML = brainOpps();
    if (n.finished && othersDone(n)) netBrainResolve();
  }

  function netBrainFinish() {
    const n = brain.net;
    n.finished = true;
    brain.phase = 'wait';
    netBrainPush(true);
    const box = document.createElement('div');
    box.className = 'duel-lock';
    box.innerHTML = '<div class="card pin-card"><div class="result-hero wait-spin">⏳</div><h2>بانتظار نتائج المنافسين…</h2></div>';
    app.querySelector('.duel').appendChild(box);
    // الأجهزة لا تبدأ في اللحظة نفسها تماماً، فننتظر قليلاً، ولا ننتظر من انقطع اتصاله طويلاً
    n.waitT = setTimeout(netBrainResolve, 15000);
    if (othersDone(n)) netBrainResolve();
  }

  function netBrainResolve() {
    if (!brain || !brain.net) return;
    const b = brain;
    const s = b.sides[0];
    const n = b.net;
    abortBrain();
    const mine = { p: s.p, s, per: s.games.map(g => g.right), banners: [] };
    const others = n.opps.map(o => ({
      p: { avatar: o.avatar, name: o.name }, per: o.brain || Brain.GAMES.map(() => 0), coins: null, banners: [],
      gone: o.left ? '🏳️ انسحب قبل النهاية' : !o.done ? '📡 انقطع اتصاله' : '',
    }));
    const playing = [mine, ...others.filter(x => !x.gone)];
    // الفائز بكل لعبة: الأكثر إجابات صحيحة فيها
    Brain.GAMES.forEach((G, j) => {
      const top = Math.max(...playing.map(x => x.per[j]));
      playing.forEach(x => { x.won = x.won || []; x.won[j] = top > 0 && x.per[j] === top; });
    });
    playing.concat(others).forEach(x => {
      x.won = x.won || [];
      x.wins = x.won.filter(Boolean).length;
      x.right = x.per.reduce((a, c) => a + c, 0);
      x.out = x.gone || Brain.GAMES.map((G, j) => `${G.icon} ${x.won[j] ? '👑' : ''}${x.per[j]}`).join(' · ');
    });
    const ranked = rankBrain(playing);
    const winner = soleWinner(ranked);
    const before = s.p.coins;
    s.p.coins += Math.floor(mine.right * COINS.perCorrect) + (winner === mine ? COINS.duelWin : 0);
    const bs = Brain.state(s.p, s.w);
    s.games.forEach(g => { bs.lv[g.id] = g.lv; });
    mine.coins = s.p.coins - before;
    Store.save();
    Sound.play('win');
    Screens.duelResults({
      sides: ranked.concat(others.filter(x => x.gone)), winner, net: true, again: 'duelSetup',
      note: ranked.length < 2 ? 'لم يُكمل المنافسون المبارزة، فلا فائز هذه المرة'
        : winner ? `فاز بـ ${winner.wins} من ${Brain.GAMES.length} ألعاب` : 'نفس عدد الألعاب والإجابات الصحيحة',
    });
  }

  const pinDots = buf => [0, 1, 2, 3].map(i => `<i class="${i < buf.length ? 'on' : ''}"></i>`).join('');

  function updatePinDots() {
    $('pinDots').innerHTML = pinDots(pinBuffer);
  }

  function enterProfile(id) {
    kidPin = null;
    Store.select(id);
    const used = Journey.applyShields(Store.current());
    if (used) Store.save();
    go('camp');
    if (used) toast(`🛡️ ${used === 1 ? 'درع السلسلة حمى' : `${used} دروع حمت`} سلسلتك من الانقطاع!`);
  }

  // ولي الأمر يؤكد تسليم الجائزة، أو يرفضها فتعود العملات للطفل
  function settleRequest(arg, status) {
    if (!parentOK) return;
    const [kidId, reqId] = arg.split(':');
    const k = Store.state.profiles.find(x => x.id === kidId);
    const r = k && requests(k).find(x => x.id === reqId);
    if (!r || r.status !== 'pending') return;
    r.status = status;
    if (status === 'declined') k.coins += r.price;
    Store.save();
    toast(status === 'given' ? '✅ سُجّل التسليم' : `↩️ أُعيدت ${r.price} عملة إلى ${k.name}`);
    Screens.parent();
  }

  // ───────────── الأزرار ─────────────
  const actions = {
    go: arg => go(arg),

    // المستكشفون من الإصدارات السابقة بلا رمز يختارون رمزاً أول مرة
    selectProfile(id) {
      const p = Store.state.profiles.find(x => x.id === id);
      if (!p) return;
      kidPin = { mode: 'login', id, stage: p.pin ? 'enter' : 'new', buf: '', first: '' };
      go('kidPin');
    },

    changeKidPin() {
      const p = Store.current();
      kidPin = { mode: 'change', id: p.id, stage: p.pin ? 'old' : 'new', buf: '', first: '' };
      go('kidPin');
    },

    kidPinKey(key) {
      const k = kidPin;
      if (!k) return;
      if (key === 'del') { k.buf = k.buf.slice(0, -1); $('kidDots').innerHTML = pinDots(k.buf); return; }
      if (k.buf.length >= 4) return;
      k.buf += key;
      $('kidDots').innerHTML = pinDots(k.buf);
      if (k.buf.length < 4) return;

      const entered = k.buf;
      k.buf = '';
      setTimeout(() => {
        if (kidPin !== k) return;
        const p = Store.state.profiles.find(x => x.id === k.id);
        if (k.stage === 'enter' || k.stage === 'old') {
          if (p && entered === p.pin) {
            if (k.stage === 'enter') { enterProfile(p.id); return; }
            k.stage = 'new';
          } else { Sound.play('wrong'); toast('الرمز غير صحيح'); }
        } else if (k.stage === 'new') {
          k.first = entered;
          k.stage = 'confirm';
        } else if (entered !== k.first) {
          Sound.play('wrong');
          toast('الرمزان غير متطابقين، حاول مرة أخرى');
          k.stage = 'new';
        } else if (k.mode === 'create') {
          kidPin = null;
          Store.createProfile(k.name, k.avatar, entered);
          Sound.play('win');
          go('camp');
          return;
        } else if (p) {
          p.pin = entered;
          Store.save();
          toast('🔑 حُفظ الرمز، تذكّره جيداً');
          if (k.mode === 'login') enterProfile(p.id);
          else { kidPin = null; go('camp'); }
          return;
        }
        Screens.kidPin();
      }, 150);
    },

    forgotKidPin() { toast('اطلب من ولي الأمر أن يريك رمزك من لوحته 👨‍👩‍👧', 3500); },

    toggleKidPin() { kidPinShown = !kidPinShown; Screens.parent(); },
    setKidPin() {
      const p = Store.state.profiles.find(k => k.id === parentKid);
      if (!p || !parentOK) return;
      const pin = $('kidPinInput').value.trim();
      if (!/^[0-9]{4}$/.test(pin)) { toast('الرمز 4 أرقام'); return; }
      p.pin = pin;
      kidPinShown = true;
      Store.save();
      toast(`🔑 الرمز الجديد لـ${p.name}: ${pin}`, 3500);
      Screens.parent();
    },

    // الحذف من لوحة ولي الأمر فقط، فلا يصل إليه إلا من يعرف الرمز
    deleteProfile(id) {
      if (!parentOK) return;
      const p = Store.state.profiles.find(x => x.id === id);
      if (p && confirm(`هل تريد حذف «${p.name}»؟ سيضيع كل تقدّمه.`)) {
        Store.deleteProfile(id);
        parentKid = null;
        toast('حُذف المستكشف');
        Screens.parent();
      }
    },

    pickAvatar(a, el) {
      newAvatar = a;
      app.querySelectorAll('.avatar-btn').forEach(b => b.classList.toggle('selected', b === el));
    },

    saveProfile(mode) {
      if (mode === 'edit') {
        const p = Store.current();
        p.avatar = newAvatar;
        Store.save();
        toast('✅ حُفظت التغييرات');
        go('camp');
        return;
      }
      const name = $('nameInput').value.trim();
      if (!name) { toast('اكتب اسمك أولاً ✏️'); $('nameInput').focus(); return; }
      kidPin = { mode: 'create', name, avatar: newAvatar, stage: 'new', buf: '', first: '' };
      go('kidPin');
    },

    toggleMute() {
      Store.state.muted = !Store.state.muted;
      Store.save();
      Screens.camp();
    },

    startPractice(i) {
      i = Number(i);
      const p = Store.current();
      if (i >= Engine.state(p, Engine.current(p).id).unlocked) { toast('🔒 أتقن المنطقة السابقة لتفتح هذه'); return; }
      startRound('practice', i);
    },

    startRace() { Screens.raceIntro(); },
    raceGo() { startRound('race'); },
    raceInvite() { inviteSiblings('race'); },

    again() {
      const p = Store.current();
      if (lastRound.mode === 'tricky' && !trickyFacts(p, Engine.current(p).id).length) { go('performance'); return; }
      startRound(lastRound.mode, lastRound.regionIndex);
    },
    duelSetup() {
      // عدة أجهزة هو الوضع الافتراضي، إلا إذا لم تكن المزامنة جاهزة على هذا الجهاز
      duelMode = Sync.duel.ready() ? 'net' : 'local';
      duelPicks = duelPicks.filter(id => Store.state.profiles.some(p => p.id === id)).slice(0, duelMode === 'net' ? 1 : MAX_LOCAL);
      Screens.duelPick();
    },
    duelPick(id) {
      const i = duelPicks.indexOf(id);
      if (i >= 0) duelPicks.splice(i, 1);
      else if (duelMode === 'net') duelPicks = [id];
      else if (duelPicks.length < MAX_LOCAL) duelPicks.push(id);
      // الثالث يحلّ محل أقدم المختارَين
      else { duelPicks.shift(); duelPicks.push(id); }
      Screens.duelPick();
    },
    startDuel() { startDuel(); },
    setDuelLand(id) { duelLand = id; Screens.duelPick(); },
    setDuelMode(m) { duelMode = m; duelPicks = duelPicks.slice(0, m === 'net' ? 1 : MAX_LOCAL); Screens.duelPick(); },
    netHost(kind) { netHost(kind); },
    netStart() { netStart(); },
    netJoin(pid) { netJoin(pid); },
    netCancel() { netCancel(); },
    setDuelLayout(id) {
      const k = Math.min(Math.max(duelPicks.length, 2), MAX_PLAYERS);
      Store.state.duelLayouts = Object.assign({}, Store.state.duelLayouts, { [k]: id });
      Store.save();
      Screens.duelPick();
    },
    // إيقاف سباق الإخوة يحتاج رمز ولي الأمر حتى لا يوقفه الخاسر
    exitDuel() {
      if (duelAlive()) askStop('السباق', stopDuel);
    },
    duelPin(k) {
      const lock = app.querySelector('.duel-lock');
      if (!stopLock || !lock || !lock.querySelector('#duelDots')) return;
      if (k === 'cancel') { lock.remove(); stopLock = null; return; }
      stopLock.pin = k === 'del' ? stopLock.pin.slice(0, -1) : (stopLock.pin + k).slice(0, 4);
      $('duelDots').innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < stopLock.pin.length ? 'on' : ''}"></i>`).join('');
      if (stopLock.pin.length < 4) return;
      if (stopLock.pin === Store.state.settings.pin) { const fn = stopLock.fn; stopLock = null; fn(); return; }
      stopLock.pin = '';
      toast('❌ الرمز غير صحيح');
      setTimeout(() => { if ($('duelDots')) $('duelDots').innerHTML = '<i></i>'.repeat(4); }, 250);
    },
    startTricky() { const p = Store.current(); if (trickyFacts(p, Engine.current(p).id).length) startRound('tricky'); },

    selectWorld(id) {
      const p = Store.current();
      const w = Engine.world(id);
      if (w.soon) { toast(`🚧 ${w.name} قيد البناء، قريباً!`); return; }
      if (!Engine.isOpen(p, w)) {
        const r = Engine.world(w.needs.world).regions[w.needs.regions - 1];
        toast(`🔒 تُفتح عندما تصل إلى ${r.icon} ${r.name} في ${Engine.world(w.needs.world).name}`, 3000);
        return;
      }
      p.world = id;
      Store.save();
      Sound.play('coin');
      go('camp');
    },

    // الخروج من الجولة يعيدك إلى الشاشة التي بدأتها منها
    exitRound() { if (round && !navBack()) go('camp'); },

    startBrain() { startBrain(); },
    startBrainDuel() { startBrainDuel(); },
    setDuelKind(k) { duelKind = k; Screens.duelPick(); },
    brainGo() { brainGo(); },
    brainInvite() { abortBrain(); inviteSiblings('brain'); },
    exitBrain() {
      if (!brainAlive()) return;
      const stop = () => {
        nav.leaving = true;
        try { if (!navBack()) go('camp'); } finally { nav.leaving = false; }
      };
      if (brain.duel) askStop('المبارزة', stop);
      else stop();
    },

    brainCmp(arg) {
      const [i, k] = arg.split(':').map(Number);
      const s = brainSide(i);
      if (!s) return;
      const { x, y } = s.q;
      const ok = (k === 0 ? x.answer - y.answer : y.answer - x.answer) > 0;
      const stage = $(`bStage${i}`);
      stage.querySelectorAll('.pan').forEach((el, j) => {
        const c = j ? y : x;
        el.querySelector('.val').innerHTML = c.reveal || `= ${c.answer}`;
        el.classList.add((j ? y.answer > x.answer : x.answer > y.answer) ? 'heavy' : 'light');
      });
      stage.querySelector('.scale').classList.add(ok ? 'right' : 'wrong');
      brainAnswer(i, ok);
    },

    brainCard(arg, el) {
      const [i, k] = arg.split(':').map(Number);
      const s = brainSide(i);
      if (!s || el.classList.contains('picked')) return;
      const stage = $(`bStage${i}`);
      if (s.q.cards[k].ok) {
        el.classList.add('picked');
        Sound.play('tick');
        if (stage.querySelectorAll('.bcard.picked').length === s.q.cards.filter(x => x.ok).length) brainAnswer(i, true);
        return;
      }
      el.classList.add('miss');
      stage.querySelectorAll('.bcard').forEach((e, j) => { if (s.q.cards[j].ok) e.classList.add('reveal'); });
      brainAnswer(i, false);
    },

    brainChoice(arg, el) {
      const c = arg.indexOf(':');
      const i = Number(arg.slice(0, c)), v = arg.slice(c + 1);
      const s = brainSide(i);
      if (!s) return;
      const ans = String(s.q.answer);
      const ok = v === ans;
      const stage = $(`bStage${i}`);
      stage.querySelector('.fruits').classList.remove('covered');
      el.classList.add(ok ? 'right' : 'wrong');
      if (!ok) stage.querySelectorAll('.bchoice').forEach(e => { if (e.dataset.arg === `${i}:${ans}`) e.classList.add('right'); });
      brainAnswer(i, ok);
    },

    exitApp() {
      Store.save();
      const A = nativeApp();
      if (A) { A.exitApp(); return; }
      window.close();
      // إن لم يسمح المتصفح بإغلاق النافذة
      setTimeout(() => { navToStart(); toast('اضغط زر الرجوع في الجهاز للخروج'); }, 300);
    },

    checkUpdate() { checkUpdate(); },
    async installApp() {
      if (!installPrompt) {
        const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
        toast(ios ? 'من زر المشاركة ⬆️ اختر «إضافة إلى الشاشة الرئيسية»' : 'من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»', 5000);
        return;
      }
      const e = installPrompt;
      installPrompt = null;
      e.prompt();
      try { await e.userChoice; } catch (err) {}
    },
    minimizeApp() {
      Store.save();
      const A = nativeApp();
      if (A && A.minimizeApp) A.minimizeApp();
    },

    buy(id) {
      const p = Store.current();
      const item = ITEMS.find(i => i.id === id);
      if (p.items.includes(id)) return;
      if (item.region >= reached(p)) {
        toast(`🔒 تُفتح هذه الأداة بعد فتح ${newRegions(item.region - reached(p) + 1).replace(/<[^>]+>/g, '')} في أي غابة`);
        return;
      }
      if (p.coins < item.price) { toast(`تحتاج ${item.price - p.coins} عملة إضافية 🪙`); return; }
      p.coins -= item.price;
      p.items.push(id);
      Store.save();
      Sound.play('coin');
      toast(`اشتريت ${item.name} ${item.emoji}`);
      Screens.shop();
    },

    buyShield() {
      const p = Store.current();
      if ((p.shields || 0) >= MAX_SHIELDS) { toast(`لديك ${MAX_SHIELDS} دروع، وهذا الحد الأقصى 🛡️`); return; }
      if (p.coins < COINS.shield) { toast(`تحتاج ${COINS.shield - p.coins} عملة إضافية 🪙`); return; }
      p.coins -= COINS.shield;
      p.shields = (p.shields || 0) + 1;
      Store.save();
      Sound.play('coin');
      toast('🛡️ اشتريت درع السلسلة');
      Screens.shop();
    },

    requestReward(id) {
      const p = Store.current();
      const r = rewards().find(x => x.id === id);
      if (!r) return;
      if (p.coins < r.price) { toast(`تحتاج ${r.price - p.coins} عملة إضافية 🪙`); return; }
      if (!confirm(`هل تريد طلب «${r.name}» مقابل ${r.price} عملة؟`)) return;
      p.coins -= r.price;
      requests(p).push({ id: Date.now().toString(36), emoji: r.emoji, name: r.name, price: r.price, at: Date.now(), status: 'pending' });
      Store.save();
      Sound.play('win');
      toast('📬 أُرسل طلبك إلى ولي الأمر');
      Screens.shop();
    },

    // ───── رحلة اليوم ─────
    station(id) {
      const p = Store.current();
      const t = Journey.today(p);
      if (t.done[id]) { toast('✅ أنجزت هذه المحطة اليوم'); return; }
      if (id !== 'review') { startRound(id); return; }
      if (!t.done.warmup || !t.done.race) { toast('📝 المراجعة آخر محطة: أكمل الإحماء والسباق أولاً'); return; }
      if (t.mistakes.length) { startRound('review'); return; }
      // لا أخطاء لمراجعتها: تكتمل المحطة مباشرة
      Journey.complete(p, 'review');
      Store.save();
      Sound.play('win');
      toast('لا أخطاء لمراجعتها اليوم، رائع! 🎉');
      go(Journey.chestReady(p) ? 'chest' : 'camp');
    },

    chestStation() {
      const p = Store.current();
      if (Journey.chestReady(p)) go('chest');
      else if (Journey.today(p).chest) toast('🌙 فتحت كنز اليوم. عُد غداً لكنز جديد!');
      else toast('🎁 أكمل المحطات الثلاث لتفتح الكنز');
    },

    openChest() {
      const p = Store.current();
      const reward = Journey.openChest(p);
      if (!reward) { go('camp'); return; }
      Store.save();
      Sound.play('win');
      Screens.reward(reward, 'وجدت في الكنز:');
    },

    claimWeek() {
      const p = Store.current();
      const reward = Journey.claimWeek(p);
      if (!reward) return;
      Store.save();
      Sound.play('win');
      Screens.reward(reward, '🏆 الجائزة الأسبوعية!');
    },

    // ───── ولي الأمر ─────
    openParent() {
      parentOK = false;
      pinStage = null;
      pinBuffer = '';
      Screens.parentGate();
    },

    leaveParent() {
      parentOK = false;
      kidPinShown = false;
      pinStage = null;
      pinBuffer = '';
      Screens.profiles();
    },

    pinKey(k) {
      const s = Store.state.settings;
      if (k === 'del') { pinBuffer = pinBuffer.slice(0, -1); updatePinDots(); return; }
      if (pinBuffer.length >= 4) return;
      pinBuffer += k;
      updatePinDots();
      if (pinBuffer.length < 4) return;

      const entered = pinBuffer;
      pinBuffer = '';
      setTimeout(() => {
        if (pinStage === 'enter') {
          if (entered === s.pin) { parentOK = true; pinStage = null; Screens.parent(); }
          else { Sound.play('wrong'); toast('الرمز غير صحيح'); Screens.parentGate(); }
        } else if (pinStage === 'new') {
          pinFirst = entered;
          pinStage = 'confirm';
          Screens.parentGate();
        } else {
          if (entered === pinFirst) {
            s.pin = entered;
            Store.save();
            parentOK = true;
            pinStage = null;
            toast('🔑 حُفظ الرمز');
            Screens.parent();
          } else {
            Sound.play('wrong');
            toast('الرمزان غير متطابقين، حاول مرة أخرى');
            pinStage = 'new';
            Screens.parentGate();
          }
        }
      }, 150);
    },

    // سؤال صعب على طفل في الثامنة بدل استرجاع الرمز
    forgotPin() {
      const a = 12 + Math.floor(Math.random() * 8);
      const b = 13 + Math.floor(Math.random() * 8);
      const ans = prompt(`للتأكد أنك ولي الأمر: كم ناتج ${b} × ${a}؟`);
      if (ans === null) return;
      if (Number(ans.trim()) === a * b) {
        pinStage = 'new';
        pinBuffer = '';
        Screens.parentGate();
      } else {
        toast('الإجابة غير صحيحة');
      }
    },

    changePin() {
      pinStage = 'new';
      pinBuffer = '';
      Screens.parentGate();
    },

    setGoal(v) { Store.state.settings.goalMin = Number(v); Store.save(); Screens.parent(); },
    setMax(v) { Store.state.settings.maxMin = Number(v); Store.save(); Screens.parent(); },
    parentKid(id) { parentKid = id; kidPinShown = false; Screens.parent(); },
    parentWorld(id) { parentWorld = id; Screens.parent(); },
    boardWorld(id) { boardWorld = id; Screens.profiles(); },
    renameKid() {
      const p = Store.state.profiles.find(k => k.id === parentKid);
      if (!p || !parentOK) return;
      const name = $('renameInput').value.trim();
      if (!name) { toast('اكتب الاسم أولاً ✏️'); return; }
      p.name = name;
      Store.save();
      toast('✅ تغيّر الاسم');
      Screens.parent();
    },
    // إن لعب أحد السباق بدلاً من الطفل: تُحذف النتيجة ولا تؤثر في رتبته ومستواه
    undoRace() {
      const p = Store.state.profiles.find(k => k.id === parentKid);
      if (!p || !parentOK || !p.races.length) return;
      const last = p.races[p.races.length - 1];
      if (!confirm(`حذف آخر نتيجة سباق لـ«${p.name}» (${last.score})؟ ستُسحب عملاتها ويعود أفضل سباق كما كان.`)) return;
      const full = undoLastRace(p);
      Store.save();
      toast(full ? '↩️ حُذفت النتيجة وعاد كل شيء كما كان' : '↩️ حُذفت النتيجة وعاد أفضل سباق والعملات');
      Screens.parent();
    },
    setGroup(g) {
      const p = Store.state.profiles.find(k => k.id === parentKid);
      if (!p || !parentOK) return;
      p.group = g; Store.save(); Screens.parent();
    },

    pickRewardEmoji(e, el) {
      newRewardEmoji = e;
      app.querySelectorAll('.emoji-row .avatar-btn').forEach(b => b.classList.toggle('selected', b === el));
    },

    addPreset(i) {
      const x = REWARD_PRESETS[Number(i)];
      rewards().push({ id: Date.now().toString(36), emoji: x.emoji, name: x.name, price: x.price });
      Store.save();
      Screens.parent();
    },

    addReward() {
      const name = $('rewardName').value.trim();
      const price = Math.round(Number($('rewardPrice').value));
      if (!name) { toast('اكتب اسم الجائزة'); return; }
      if (!(price >= 10 && price <= 2000)) { toast('السعر بين 10 و 2000 عملة'); return; }
      rewards().push({ id: Date.now().toString(36), emoji: newRewardEmoji, name, price });
      Store.save();
      toast('➕ أُضيفت الجائزة');
      Screens.parent();
    },

    removeReward(id) {
      const s = Store.state.settings;
      s.rewards = rewards().filter(r => r.id !== id);
      Store.save();
      Screens.parent();
    },

    giveReward(arg) { settleRequest(arg, 'given'); },
    declineReward(arg) { settleRequest(arg, 'declined'); },

    syncIn() {
      Sync.signIn().catch(e => {
        if (e.code !== 'auth/popup-closed-by-user') toast('تعذّر تسجيل الدخول');
      });
    },

    skipWelcome() {
      welcomeSkipped = true;
      Screens.profiles();
    },

    showWelcome() { Screens.welcome(); },

    syncOut() {
      if (confirm('تسجيل الخروج من هذا الجهاز؟ يبقى التقدّم محفوظاً عليه لكن لن يُزامَن.')) Sync.signOut();
    },
  };

  app.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (el) actions[el.dataset.act](el.dataset.arg, el);
  });

  // لوحة الأرقام تستجيب عند اللمس مباشرة لتكون أسرع
  app.addEventListener('pointerdown', e => {
    const d = e.target.closest('[data-dkey]');
    if (d) {
      e.preventDefault();
      d.classList.add('pressed');
      setTimeout(() => d.classList.remove('pressed'), 120);
      duelKey(Number(d.closest('.duel-half').dataset.side), d.dataset.dkey);
      return;
    }
    const dc = e.target.closest('[data-dchoice]');
    if (dc) { e.preventDefault(); duelChoose(Number(dc.closest('.duel-half').dataset.side), dc.dataset.dchoice); return; }
    const c = e.target.closest('[data-choice]');
    if (c) { e.preventDefault(); choose(c.dataset.choice); return; }
    const k = e.target.closest('[data-key]');
    if (!k) return;
    e.preventDefault();
    k.classList.add('pressed');
    setTimeout(() => k.classList.remove('pressed'), 120);
    pressKey(k.dataset.key);
  });

  // لوحة مفاتيح اللابتوب (تقبل الأرقام الإنجليزية والعربية)
  document.addEventListener('keydown', e => {
    let k = e.key;
    const arabic = '٠١٢٣٤٥٦٧٨٩'.indexOf(k);
    if (arabic >= 0) k = String(arabic);

    if (!round) {
      if (brain) {
        if (document.querySelector('.duel-lock')) {
          if (/^[0-9]$/.test(k)) actions.duelPin(k);
          else if (k === 'Backspace') actions.duelPin('del');
          else if (k === 'Escape') actions.duelPin('cancel');
        } else if (k === 'Escape') actions.exitBrain();
        return;
      }
      if (document.querySelector('.duel-lock')) {
        if (/^[0-9]$/.test(k)) actions.duelPin(k);
        else if (k === 'Backspace') actions.duelPin('del');
        else if (k === 'Escape') actions.duelPin('cancel');
        return;
      }
      if (duel && duel.net) {
        if (/^[0-9]$/.test(k)) duelKey(0, k);
        else if (k === '-' || k === '−') duelKey(0, 'minus');
        else if (k === 'Backspace') duelKey(0, 'del');
        else if (k === 'Enter') duelKey(0, 'ok');
        return;
      }
      if (duel) return;
      if (document.querySelector('.kid-pin')) {
        if (/^[0-9]$/.test(k)) actions.kidPinKey(k);
        else if (k === 'Backspace') actions.kidPinKey('del');
        return;
      }
      if (document.querySelector('.pin-card')) {
        if (/^[0-9]$/.test(k)) actions.pinKey(k);
        else if (k === 'Backspace') actions.pinKey('del');
        return;
      }
      if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'nameInput') actions.saveProfile();
      return;
    }
    if (/^[0-9]$/.test(k)) pressKey(k);
    else if (k === '-' || k === '−') pressKey('minus');
    else if (k === 'Backspace') pressKey('del');
    else if (k === 'Enter') pressKey('ok');
    else if (k === 'Escape') actions.exitRound();
    else return;
    e.preventDefault();
  });

  // وصلت بيانات من جهاز آخر أو تغيّرت حالة المزامنة: نحدّث الشاشة إن كانت لا تتأثر بجولة جارية
  Sync.onUpdate(changed => {
    // سباق الإخوة وشاشاته لا تتعلق بمستكشف واحد، فلا نعيد رسمها
    if (round || duel || brain || app.querySelector('.duel-screen')) return;
    const st = Sync.status();
    if (app.querySelector('.screen.welcome')) {
      // نجح تسجيل الدخول (أو تعذّرت المزامنة): ننتقل لاختيار المستكشف
      if (st === 'out') return;
      if (st === 'ok' || st === 'syncing' || st === 'offline') toast('✅ تم تسجيل الدخول، التقدّم يُزامَن الآن');
      Screens.profiles();
    } else if (app.querySelector('.screen.parent') && parentOK) {
      const card = $('syncCard');
      if (changed || !card) Screens.parent();
      else card.outerHTML = syncCard();
    } else if ((app.querySelector('.profile-grid') || !Store.current()) && !app.querySelector('.pin-card, .form-card')) {
      if (st === 'out' && !welcomeSkipped && navigator.onLine) Screens.welcome();
      else if (changed || app.querySelector('.profile-grid')) Screens.profiles();
    }
  });

  // ───── التحديثات ─────
  // زر «تحديث»: يبحث عن إصدار جديد ويحدّث فوراً، وإلا يعيد تحميل الصفحة
  let checkUpdate = () => { Store.save(); location.reload(); };
  // نبحث عن إصدار جديد كلما عاد التطبيق إلى الشاشة. عند وصوله نحدّث فوراً في الشاشة الرئيسية،
  // وفي غيرها نعرض شريطاً حتى لا نقطع جولة أو سباقاً
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    const sw = navigator.serviceWorker;
    const hadController = !!sw.controller;   // أول تثبيت ليس تحديثاً
    const check = () => sw.getRegistration().then(r => r && r.update()).catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    setInterval(check, 30 * 60 * 1000);

    const reload = () => { Store.save(); location.reload(); };
    const updateBar = document.createElement('div');
    updateBar.className = 'invite-bar update-bar';
    updateBar.hidden = true;
    updateBar.innerHTML = '<span>✨ تحديث جديد جاهز</span><button class="btn green">حدّث الآن</button>';
    updateBar.querySelector('button').addEventListener('click', reload);
    document.body.appendChild(updateBar);

    let ready = false, manual = false;
    checkUpdate = async () => {
      toast('🔄 جارٍ البحث عن تحديث…');
      const r = await sw.getRegistration().catch(() => null);
      if (!r) { reload(); return; }
      if (ready || r.waiting) { reload(); return; }
      manual = true;
      try { await r.update(); } catch (e) { toast('📡 تعذّر الاتصال، تأكد من الإنترنت'); manual = false; return; }
      if (r.installing || r.waiting) return;   // سيُعاد التحميل عند تفعيل الإصدار الجديد
      manual = false;
      toast('✅ لديك أحدث إصدار');
    };
    const apply = () => {
      if (!ready) return;
      if (manual) { reload(); return; }
      const idle = !round && !duel && !netPending && (nav.cur === 'profiles' || nav.cur === 'camp' || nav.cur === 'welcome');
      if (idle) reload();
      else updateBar.hidden = false;
    };
    sw.addEventListener('controllerchange', () => {
      if (!hadController || ready) return;
      ready = true;
      apply();
    });
    // إذا عاد إلى الشاشة الرئيسية بعد ظهور الشريط نحدّث وحدنا
    const showProfiles = Screens.profiles;
    Screens.profiles = (...args) => { showProfiles(...args); if (ready) setTimeout(apply, 0); };
  }

  Store.load();
  // يبقى المستكشف داخلاً بين مرات فتح اللعبة، ولا يُطلب رمزه إلا بعد «تغيير»
  if (Store.current()) enterProfile(Store.state.currentId);
  else Screens.profiles();
  Sync.start();
})();
