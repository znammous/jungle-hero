// بطل الغابة — الشاشات والتفاعل
(() => {
  const app = document.getElementById('app');
  let round = null;       // الجولة الجارية (تدريب، إحماء، سباق، مراجعة)
  let lastRound = null;   // لإعادة نفس الجولة من شاشة النتائج
  let managing = false;   // وضع حذف المستكشفين
  let newAvatar = AVATARS[0];

  // لوحة ولي الأمر
  let parentOK = false;   // فُتحت بالرمز في هذه الزيارة
  let pinStage = null;    // 'enter' | 'new' | 'confirm'
  let pinBuffer = '';
  let pinFirst = '';
  let parentKid = null;

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ltr = s => `<span dir="ltr">${s}</span>`;
  const $ = id => document.getElementById(id);
  const allItems = () => ITEMS.concat(RARE_ITEMS);

  function render(html) {
    document.body.classList.toggle('bgrest', !!round);
    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  function subHeader(title) {
    const p = Store.current();
    return `<header class="topbar">
      <button class="chip" data-act="go" data-arg="camp">→ المخيّم</button>
      <h2 class="topbar-title">${title}</h2>
      <div class="chip coins">🪙 <b>${p.coins}</b></div>
    </header>`;
  }

  const bar = pct => `<span class="bar"><i style="width:${Math.round(Math.min(pct, 1) * 100)}%"></i></span>`;

  // ───────────── الشاشات ─────────────
  const Screens = {
    profiles() {
      const list = Store.state.profiles;
      render(`<section class="screen">
        <header class="hero-title">
          <div class="logo">🌴🧭🌴</div>
          <h1>بطل الغابة</h1>
          <p>من المستكشف اليوم؟</p>
        </header>
        <div class="profile-grid">
          ${list.map(p => {
            const r = Engine.rankFor(p.bestRace);
            const st = Journey.streak(p);
            return `<div class="profile-wrap">
              <button class="profile-card" data-act="selectProfile" data-arg="${p.id}">
                <span class="avatar">${p.avatar}</span>
                <b>${esc(p.name)}</b>
                <small>${r.emoji} ${r.name}</small>
                <small>🪙 ${p.coins}${st.count ? ` · 🔥 ${st.count}` : ''}</small>
              </button>
              ${managing ? `<button class="delete-btn" data-act="deleteProfile" data-arg="${p.id}" aria-label="حذف">✕</button>` : ''}
            </div>`;
          }).join('')}
          <button class="profile-card add" data-act="go" data-arg="newProfile">
            <span class="avatar">➕</span><b>مستكشف جديد</b>
          </button>
        </div>
        <div class="footer-links">
          ${list.length ? `<button class="link-btn" data-act="toggleManage">${managing ? 'تم' : 'إدارة المستكشفين'}</button>` : ''}
          <button class="link-btn" data-act="openParent">👨‍👩‍👧 ولي الأمر</button>
        </div>
      </section>`);
    },

    newProfile() {
      render(`<section class="screen">
        <header class="topbar"><button class="chip" data-act="go" data-arg="profiles">→ رجوع</button></header>
        <div class="card form-card">
          <h2>مستكشف جديد 🎒</h2>
          <label for="nameInput">ما اسمك؟</label>
          <input id="nameInput" maxlength="12" autocomplete="off" placeholder="اكتب اسمك هنا">
          <p class="label">اختر شخصيتك</p>
          <div class="avatar-grid">
            ${AVATARS.map(a => `<button class="avatar-btn ${a === newAvatar ? 'selected' : ''}" data-act="pickAvatar" data-arg="${a}">${a}</button>`).join('')}
          </div>
          <button class="btn green wide" data-act="saveProfile">ابدأ المغامرة 🚀</button>
        </div>
      </section>`);
      setTimeout(() => $('nameInput') && $('nameInput').focus(), 50);
    },

    camp() {
      const p = Store.current();
      const s = Store.state.settings;
      const rank = Engine.rankFor(p.bestRace);
      const next = RANKS.find(r => r.min > p.bestRace);
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
          <span class="avatar xl">${p.avatar}</span>
          <div>
            <h2>أهلاً يا ${esc(p.name)}!</h2>
            <div class="rank-badge">${rank.emoji} ${rank.name}</div>
            <p class="muted">${next
              ? `لتصبح ${next.emoji} ${next.name}: سجّل ${ltr(next.min)} أو أكثر في سباق النهر`
              : 'وصلت لأعلى رتبة في الغابة! 🎉'}</p>
          </div>
        </div>

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
            <span class="big-icon">🗺️</span><b>خريطة الغابة</b><small>تدرّب على الجداول</small>
          </button>
          <button class="big-btn orange" data-act="startRace">
            <span class="big-icon">🏃</span><b>سباق النهر</b><small>دقيقة واحدة!</small>
          </button>
          <button class="big-btn brown" data-act="go" data-arg="shop">
            <span class="big-icon">🎒</span><b>متجر المعدّات</b><small>اشترِ أدوات الرحلة</small>
          </button>
          <button class="big-btn teal" data-act="go" data-arg="animals">
            <span class="big-icon">🐾</span><b>دفتر الحيوانات</b><small>${ltr(`${p.animals.length}/${REGIONS.length}`)}</small>
          </button>
          <button class="big-btn purple" data-act="go" data-arg="diary">
            <span class="big-icon">📔</span><b>دفتر الرحلة</b><small>أيامك وتقدّمك</small>
          </button>
        </nav>
      </section>`);
    },

    map() {
      const p = Store.current();
      render(`<section class="screen">
        ${subHeader('🗺️ خريطة الغابة')}
        <p class="hint">اختر منطقة لتتدرّب على جدولها. أتقنها لتفتح المنطقة التالية وتكتشف حيوانها!</p>
        <div class="trail-map">
          ${REGIONS.map((r, i) => {
            const locked = i >= p.unlocked;
            const m = Engine.mastery(p, r.table);
            const found = p.animals.includes(r.table);
            return `<button class="region ${locked ? 'locked' : ''} ${found ? 'done' : ''}" data-act="startPractice" data-arg="${i}">
              <span class="region-icon">${locked ? '🔒' : r.icon}</span>
              <span class="region-info">
                <b>${r.name}</b>
                <small>جدول ${ltr(r.table)} · إتقان ${ltr(Math.round(m * 100) + '%')}</small>
                ${bar(m)}
              </span>
              <span class="region-animal">${found ? r.animal.emoji : '❓'}</span>
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
            const region = REGIONS[i.region];
            if (!owned && i.region >= p.unlocked) {
              return `<button class="item locked" data-act="buy" data-arg="${i.id}">
                <span class="item-emoji">🔒</span>
                <b>${i.name}</b>
                <small>يُفتح في ${region.icon} ${region.name}</small>
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
      </section>`);
    },

    animals() {
      const p = Store.current();
      render(`<section class="screen">
        ${subHeader('🐾 دفتر الحيوانات')}
        <p class="hint">أتقن جدول كل منطقة بالكامل لتكتشف الحيوان الذي يعيش فيها.</p>
        <div class="animal-grid">
          ${REGIONS.map(r => {
            const found = p.animals.includes(r.table);
            return `<div class="animal ${found ? 'found' : ''}">
              <span class="animal-emoji">${found ? r.animal.emoji : '❓'}</span>
              <b>${found ? r.animal.name : '؟؟؟'}</b>
              <small>${r.icon} ${r.name} · جدول ${ltr(r.table)}</small>
            </div>`;
          }).join('')}
        </div>
      </section>`);
    },

    diary() {
      const p = Store.current();
      const st = Journey.streak(p);
      const w = Journey.weekStatus(p);
      const r = Journey.weekReport(p);
      const rare = RARE_ITEMS.filter(i => p.items.includes(i.id));
      const dayIcon = d => d.state === 'done' ? '👣' : d.state === 'played' ? '🌱' : '';
      const weekRow = days => days.map(d =>
        `<div class="day ${d.state} ${d.isToday ? 'today' : ''} ${d.future ? 'future' : ''}">
          <small>${d.name}</small><span>${dayIcon(d)}</span>
        </div>`).join('');

      const lines = [];
      lines.push(`🏃 أفضل نتيجة في السباق: <b>${ltr(p.bestRace)}</b>`);
      if (r.raceThis !== null && r.raceLast !== null) {
        const diff = r.raceThis - r.raceLast;
        lines.push(diff > 0
          ? `📈 أسرع من الأسبوع الماضي بـ <b>${ltr(diff)}</b> إجابات في السباق!`
          : `🏃 متوسطك في السباق هذا الأسبوع ${ltr(r.raceThis)} (الأسبوع الماضي ${ltr(r.raceLast)})`);
      }
      lines.push(`✅ مسائل أتقنتها: <b>${ltr(`${r.mastered}/78`)}</b>`);
      if (r.newMastered) lines.push(`🌟 أتقنت <b>${ltr(r.newMastered)}</b> مسألة جديدة هذا الأسبوع`);

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
          <h3>📈 تقدّمك</h3>
          <ul class="facts-list">${lines.map(l => `<li>${l}</li>`).join('')}</ul>
        </div>

        <div class="card">
          <h3>🗓️ آخر 4 أسابيع</h3>
          <div class="month">${[-3, -2, -1, 0].map(o => `<div class="week-row compact">${weekRow(Journey.week(p, o))}</div>`).join('')}</div>
          <p class="muted center">👣 رحلة كاملة · 🌱 لعب قليلاً</p>
        </div>

        <div class="card">
          <h3>✨ القطع النادرة</h3>
          <div class="rare-grid">${RARE_ITEMS.map(i => p.items.includes(i.id)
            ? `<span class="rare-item found" title="${i.name}">${i.emoji}<small>${i.name}</small></span>`
            : `<span class="rare-item"><span>❔</span><small>؟؟؟</small></span>`).join('')}</div>
          <p class="muted center">${ltr(`${rare.length}/${RARE_ITEMS.length}`)}</p>
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
      const titles = { race: '🏃 سباق النهر', warmup: '🏕️ الإحماء', review: '📝 المراجعة' };
      const title = titles[r.mode] || `${r.region.icon} ${r.region.name}`;
      render(`<section class="screen play">
        <header class="topbar">
          <button class="chip" data-act="exitRound" aria-label="خروج">✕</button>
          <h2 class="topbar-title">${title}</h2>
          <div class="chip">✅ <b id="score">0</b></div>
        </header>

        <div class="track ${race ? 'river' : 'trail'}">
          <span class="goal">${race ? '🏝️' : '💎'}</span>
          ${race && p.bestRace ? `<span class="best-flag" style="--p:${Math.min(p.bestRace / CONFIG.raceGoal, 1)}" title="أفضل نتيجة">🚩</span>` : ''}
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
          <div class="numpad" dir="ltr">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-key="${n}">${n}</button>`).join('')}
            <button class="key util" data-key="del" aria-label="مسح">⌫</button>
            <button class="key" data-key="0">0</button>
            <button class="key ok" data-key="ok" aria-label="تأكيد">✓</button>
          </div>
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
      s.events.forEach(e => banners.push(e.type === 'unlock'
        ? `🔓 فتحت منطقة جديدة: ${e.region.icon} ${e.region.name}`
        : `🐾 اكتشفت حيواناً جديداً: ${e.region.animal.emoji} ${e.region.animal.name}`));

      const unique = [...new Map(s.mistakes.map(q => [q.key, q])).values()];

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
          <div class="mistake-list">${unique.map(q => `<span dir="ltr">${q.a} × ${q.b} = ${q.answer}</span>`).join('')}</div>
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

        ${p ? `<div class="kid-tabs">${kids.map(k =>
            `<button class="chip ${k.id === parentKid ? 'on' : ''}" data-act="parentKid" data-arg="${k.id}">${k.avatar} ${esc(k.name)}</button>`).join('')}</div>
          ${kidReport(p)}`
          : '<p class="hint">لا يوجد مستكشفون بعد.</p>'}
      </section>`);
    },
  };

  // تقرير طفل واحد في لوحة ولي الأمر
  function kidReport(p) {
    const s = Store.state.settings;
    const r = Journey.weekReport(p);
    const st = Journey.streak(p);
    const recent = Journey.recentDays(p, 7);
    const races = p.races.slice(-15);
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

    let heat = '<i class="hm-head">×</i>';
    for (let b = 1; b <= 12; b++) heat += `<i class="hm-head">${b}</i>`;
    for (let a = 1; a <= 12; a++) {
      heat += `<i class="hm-head">${a}</i>`;
      for (let b = 1; b <= 12; b++) {
        const f = Engine.fact(p, a, b);
        const lvl = f.seen === 0 ? 'l0' : f.box >= CONFIG.maxBox ? 'l5' : f.box >= CONFIG.masteredBox ? 'l4' : f.box === 2 ? 'l3' : f.box === 1 ? 'l2' : 'l1';
        heat += `<i class="hm ${lvl}" title="${a} × ${b} = ${a * b} · ${f.right}/${f.seen}"></i>`;
      }
    }

    return `
      <div class="tiles">
        <div class="tile"><b>🔥 ${ltr(st.count)}</b><small>أيام متتالية</small></div>
        <div class="tile"><b>${ltr(Journey.minutesToday(p))}</b><small>دقيقة اليوم</small></div>
        <div class="tile"><b>${ltr(`${r.mastered}/78`)}</b><small>مسألة متقنة</small></div>
        <div class="tile"><b>${ltr(p.bestRace)}</b><small>أفضل سباق</small></div>
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
        <h3>🏃 نتائج سباق النهر (آخر ${ltr(races.length)})</h3>
        ${races.length ? `<div class="chart races">
          ${races.map(x => `<div class="col"><span class="val">${x.score}</span>
            <i style="height:${(x.score / maxRace) * 100}%"></i></div>`).join('')}
        </div>
        <p class="muted center">من الأقدم (يمين) إلى الأحدث (يسار)</p>` : '<p class="muted">لم يلعب سباق النهر بعد.</p>'}
      </div>

      <div class="card">
        <h3>🗺️ خريطة الإتقان</h3>
        <div class="heatmap" dir="ltr">${heat}</div>
        <div class="legend">
          <span><i class="hm l0"></i>لم يُجرَّب</span>
          <span><i class="hm l1"></i>ضعيف</span>
          <span><i class="hm l3"></i>يتحسّن</span>
          <span><i class="hm l4"></i>متقن</span>
          <span><i class="hm l5"></i>متقن جداً</span>
        </div>
      </div>`;
  }

  function go(name, arg) {
    if (round) abortRound();
    Screens[name](arg);
  }

  // ───────────── الجولات ─────────────
  function startRound(mode, regionIndex = 0) {
    const p = Store.current();
    const region = REGIONS[regionIndex];
    const t = Journey.today(p);
    lastRound = { mode, regionIndex };
    round = {
      mode, region,
      pool: mode === 'race' || mode === 'warmup' ? Engine.racePool(p) : Engine.tablePool(region.table),
      queue: mode === 'review' ? t.mistakes.map(m => m.slice()) : null,
      total: null,
      asked: 0, right: 0, cleared: 0, mistakes: [],
      input: '', q: null, locked: true, timer: null,
      secsAtStart: t.secs,
    };
    round.total = mode === 'review' ? round.queue.length : CONFIG.practiceLength;
    Screens.play();
    mode === 'race' ? countdown(3) : nextQuestion();
  }

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

  function nextQuestion() {
    const p = Store.current();
    if (round.mode === 'review') {
      let [a, b] = round.queue.shift();
      if (Math.random() < 0.5) [a, b] = [b, a];
      round.q = { a, b, answer: a * b, key: Engine.key(a, b) };
    } else {
      round.q = Engine.pick(p, round.pool, round.q && round.q.key);
    }
    round.input = '';
    round.locked = false;
    round.qStart = performance.now();
    const q = round.q;
    const el = $('question');
    el.className = 'question';
    el.innerHTML = `<span>${q.a}</span><span class="op">×</span><span>${q.b}</span><span class="op">=</span><span id="answer" class="answer">&nbsp;</span>`;
    $('feedback').textContent = '';
  }

  function pressKey(k) {
    if (!round || round.locked) return;
    if (k === 'del') round.input = round.input.slice(0, -1);
    else if (k === 'ok') { if (round.input) submit(); return; }
    else if (round.input.length < 3) round.input += k;
    $('answer').innerHTML = round.input || '&nbsp;';
    // يُصحَّح تلقائياً عند كتابة عدد الأرقام الصحيح
    if (round.input.length === String(round.q.answer).length) submit();
  }

  function submit() {
    const p = Store.current();
    const q = round.q;
    const ok = Number(round.input) === q.answer;
    const ms = performance.now() - round.qStart;
    round.locked = true;
    Engine.record(p, q.a, q.b, ok, ms);
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
      $('feedback').innerHTML = `الإجابة الصحيحة: <b dir="ltr">${q.a} × ${q.b} = ${q.answer}</b>`;
    }

    $('score').textContent = round.right;
    let progress;
    if (round.mode === 'race') {
      progress = Math.min(round.right / CONFIG.raceGoal, 1);
    } else if (round.mode === 'review') {
      // في المراجعة: المسألة الخاطئة تعود لآخر الطابور حتى تُجاب صحيحة
      if (ok) {
        round.cleared++;
        Journey.clearMistake(p, q);
        $('steps').children[round.cleared - 1].className = 'right';
      } else {
        round.queue.push([q.a, q.b]);
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

    p.coins += Math.floor(r.right * COINS.perCorrect);
    if (r.mode === 'race') {
      const oldRank = Engine.rankFor(p.bestRace);
      if (r.right > p.bestRace) {
        summary.newRecord = p.bestRace > 0;
        p.bestRace = r.right;
        p.coins += COINS.raceRecord;
      }
      const newRank = Engine.rankFor(p.bestRace);
      if (newRank !== oldRank) summary.rankUp = newRank;
      p.races.push({ score: r.right, at: Date.now() });
      p.races = p.races.slice(-50);
    } else {
      p.coins += COINS.roundDone;
      if (r.mode !== 'review' && r.right === r.asked) p.coins += COINS.perfect;
    }

    // محطات رحلة اليوم: أي سباق يُكمل محطة السباق
    const stationId = r.mode === 'practice' ? null : r.mode;
    if (stationId && Journey.complete(p, stationId)) {
      summary.station = Journey.STATIONS.find(x => x.id === stationId);
    }
    summary.chestReady = Journey.chestReady(p);

    const secs = Journey.today(p).secs;
    summary.goalReached = r.secsAtStart < s.goalMin * 60 && secs >= s.goalMin * 60;
    summary.restTime = s.maxMin && r.secsAtStart < s.maxMin * 60 && secs >= s.maxMin * 60;

    summary.events = Engine.progress(p);
    summary.coins = p.coins - coinsBefore;
    Store.save();
    const big = summary.events.length || summary.newRecord || summary.rankUp || summary.station || summary.goalReached;
    Sound.play(big ? 'win' : 'coin');
    Screens.results(summary);
  }

  function updatePinDots() {
    $('pinDots').innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < pinBuffer.length ? 'on' : ''}"></i>`).join('');
  }

  // ───────────── الأزرار ─────────────
  const actions = {
    go: arg => go(arg),

    selectProfile(id) {
      if (managing) return;
      Store.select(id);
      go('camp');
    },

    toggleManage() { managing = !managing; Screens.profiles(); },

    deleteProfile(id) {
      const p = Store.state.profiles.find(x => x.id === id);
      if (p && confirm(`هل تريد حذف «${p.name}»؟ سيضيع كل تقدّمه.`)) {
        Store.deleteProfile(id);
        if (!Store.state.profiles.length) managing = false;
        Screens.profiles();
      }
    },

    pickAvatar(a, el) {
      newAvatar = a;
      app.querySelectorAll('.avatar-btn').forEach(b => b.classList.toggle('selected', b === el));
    },

    saveProfile() {
      const name = $('nameInput').value.trim();
      if (!name) { toast('اكتب اسمك أولاً ✏️'); $('nameInput').focus(); return; }
      Store.createProfile(name, newAvatar);
      Sound.play('win');
      go('camp');
    },

    toggleMute() {
      Store.state.muted = !Store.state.muted;
      Store.save();
      Screens.camp();
    },

    startPractice(i) {
      i = Number(i);
      if (i >= Store.current().unlocked) { toast('🔒 أتقن المنطقة السابقة لتفتح هذه'); return; }
      startRound('practice', i);
    },

    startRace() { startRound('race'); },

    again() { startRound(lastRound.mode, lastRound.regionIndex); },

    exitRound() { if (round) go('camp'); },

    buy(id) {
      const p = Store.current();
      const item = ITEMS.find(i => i.id === id);
      if (p.items.includes(id)) return;
      if (item.region >= p.unlocked) {
        const r = REGIONS[item.region];
        toast(`🔒 تُفتح هذه الأداة عندما تصل إلى ${r.icon} ${r.name}`);
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
    parentKid(id) { parentKid = id; Screens.parent(); },
  };

  app.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (el) actions[el.dataset.act](el.dataset.arg, el);
  });

  // لوحة الأرقام تستجيب عند اللمس مباشرة لتكون أسرع
  app.addEventListener('pointerdown', e => {
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
      if (document.querySelector('.pin-card')) {
        if (/^[0-9]$/.test(k)) actions.pinKey(k);
        else if (k === 'Backspace') actions.pinKey('del');
        return;
      }
      if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'nameInput') actions.saveProfile();
      return;
    }
    if (/^[0-9]$/.test(k)) pressKey(k);
    else if (k === 'Backspace') pressKey('del');
    else if (k === 'Enter') pressKey('ok');
    else if (k === 'Escape') actions.exitRound();
    else return;
    e.preventDefault();
  });

  Store.load();
  Screens.profiles();
})();
