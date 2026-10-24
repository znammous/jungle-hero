// بطل الغابة — الشاشات والتفاعل
(() => {
  const app = document.getElementById('app');
  let round = null;       // الجولة الجارية (تدريب أو سباق)
  let lastRound = null;   // لإعادة نفس الجولة من شاشة النتائج
  let managing = false;   // وضع حذف المستكشفين
  let newAvatar = AVATARS[0];

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ltr = s => `<span dir="ltr">${s}</span>`;
  const $ = id => document.getElementById(id);

  function render(html) {
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
            return `<div class="profile-wrap">
              <button class="profile-card" data-act="selectProfile" data-arg="${p.id}">
                <span class="avatar">${p.avatar}</span>
                <b>${esc(p.name)}</b>
                <small>${r.emoji} ${r.name}</small>
                <small>🪙 ${p.coins}</small>
              </button>
              ${managing ? `<button class="delete-btn" data-act="deleteProfile" data-arg="${p.id}" aria-label="حذف">✕</button>` : ''}
            </div>`;
          }).join('')}
          <button class="profile-card add" data-act="go" data-arg="newProfile">
            <span class="avatar">➕</span><b>مستكشف جديد</b>
          </button>
        </div>
        ${list.length ? `<button class="link-btn" data-act="toggleManage">${managing ? 'تم' : 'إدارة المستكشفين'}</button>` : ''}
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
      const rank = Engine.rankFor(p.bestRace);
      const next = RANKS.find(r => r.min > p.bestRace);
      const owned = ITEMS.filter(i => p.items.includes(i.id));
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

        <div class="card campsite">
          <h3>⛺ مخيّمك</h3>
          ${owned.length
            ? `<div class="gear">${owned.map(i => `<span title="${i.name}">${i.emoji}</span>`).join('')}</div>`
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
            const m = Math.round(Engine.mastery(p, r.table) * 100);
            const found = p.animals.includes(r.table);
            return `<button class="region ${locked ? 'locked' : ''} ${found ? 'done' : ''}" data-act="startPractice" data-arg="${i}">
              <span class="region-icon">${locked ? '🔒' : r.icon}</span>
              <span class="region-info">
                <b>${r.name}</b>
                <small>جدول ${ltr(r.table)} · إتقان ${ltr(m + '%')}</small>
                <span class="bar"><i style="width:${m}%"></i></span>
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
            const cant = !owned && p.coins < i.price;
            return `<button class="item ${owned ? 'owned' : ''} ${cant ? 'cant' : ''}" data-act="buy" data-arg="${i.id}">
              <span class="item-emoji">${i.emoji}</span>
              <b>${i.name}</b>
              <span class="price">${owned ? '✓ لديك' : `🪙 ${i.price}`}</span>
            </button>`;
          }).join('')}
        </div>
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

    play() {
      const r = round;
      const p = Store.current();
      const race = r.mode === 'race';
      const title = race ? '🏃 سباق النهر' : `${r.region.icon} ${r.region.name}`;
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
      } else {
        hero = pct === 1 ? '🌟' : pct >= 0.7 ? '😃' : '💪';
        title = pct === 1 ? 'ممتاز! كل الإجابات صحيحة' : pct >= 0.7 ? 'أحسنت يا بطل!' : 'استمر بالتدريب، أنت تتحسّن!';
      }

      const banners = [];
      if (s.newRecord) banners.push(`🏆 رقم قياسي جديد!`);
      if (s.rankUp) banners.push(`${s.rankUp.emoji} رتبة جديدة: ${s.rankUp.name}`);
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
        ${unique.length ? `<div class="card mistakes">
          <h3>📝 راجع هذه المسائل</h3>
          <div class="mistake-list">${unique.map(q => `<span dir="ltr">${q.a} × ${q.b} = ${q.answer}</span>`).join('')}</div>
        </div>` : ''}
        <div class="actions">
          <button class="btn orange" data-act="again">🔁 مرة أخرى</button>
          <button class="btn green" data-act="go" data-arg="camp">⛺ المخيّم</button>
        </div>
      </section>`);
    },
  };

  function go(name, arg) {
    if (round) abortRound();
    Screens[name](arg);
  }

  // ───────────── الجولات ─────────────
  function startRound(mode, regionIndex) {
    const p = Store.current();
    const region = REGIONS[regionIndex];
    lastRound = { mode, regionIndex };
    round = {
      mode, region,
      pool: mode === 'race' ? Engine.racePool(p) : Engine.tablePool(region.table),
      total: mode === 'practice' ? CONFIG.practiceLength : null,
      asked: 0, right: 0, mistakes: [],
      input: '', q: null, locked: true, timer: null,
    };
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
      const bar = $('timebar');
      bar.style.width = Math.max(0, (left / total) * 100) + '%';
      bar.classList.toggle('hurry', left <= 10000);
      $('timeText').textContent = Math.max(0, Math.ceil(left / 1000));
      if (left <= 0) finishRound();
    }, 100);
  }

  function nextQuestion() {
    const p = Store.current();
    round.q = Engine.pick(p, round.pool, round.q && round.q.key);
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
    round.locked = true;
    Engine.record(p, q.a, q.b, ok, performance.now() - round.qStart);
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
    const progress = round.mode === 'race'
      ? Math.min(round.right / CONFIG.raceGoal, 1)
      : round.asked / round.total;
    $('walker').style.setProperty('--p', progress);
    if (round.mode === 'practice') {
      $('steps').children[round.asked - 1].className = ok ? 'right' : 'wrong';
    }

    const delay = ok ? 350 : round.mode === 'race' ? 1000 : 1800;
    round.timeout = setTimeout(() => {
      if (!round) return;
      if (round.mode === 'practice' && round.asked >= round.total) finishRound();
      else nextQuestion();
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
    const coinsBefore = p.coins;
    const summary = { mode: r.mode, right: r.right, asked: r.asked, mistakes: r.mistakes, newRecord: false, rankUp: null };

    p.coins += r.right;
    if (r.mode === 'race') {
      const oldRank = Engine.rankFor(p.bestRace);
      if (r.right > p.bestRace) {
        summary.newRecord = p.bestRace > 0;
        p.bestRace = r.right;
        p.coins += 10;
      }
      const newRank = Engine.rankFor(p.bestRace);
      if (newRank !== oldRank) summary.rankUp = newRank;
      p.races.push({ score: r.right, at: Date.now() });
      p.races = p.races.slice(-50);
    } else {
      p.coins += 5;                              // مكافأة إكمال الجولة
      if (r.right === r.asked) p.coins += 5;     // مكافأة الجولة الكاملة
    }

    summary.events = Engine.progress(p);
    summary.coins = p.coins - coinsBefore;
    Store.save();
    Sound.play(summary.events.length || summary.newRecord || summary.rankUp ? 'win' : 'coin');
    Screens.results(summary);
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

    startRace() { startRound('race', 0); },

    again() { startRound(lastRound.mode, lastRound.regionIndex); },

    exitRound() { if (round) go('camp'); },

    buy(id) {
      const p = Store.current();
      const item = ITEMS.find(i => i.id === id);
      if (p.items.includes(id)) return;
      if (p.coins < item.price) { toast(`تحتاج ${item.price - p.coins} عملة إضافية 🪙`); return; }
      p.coins -= item.price;
      p.items.push(id);
      Store.save();
      Sound.play('coin');
      toast(`اشتريت ${item.name} ${item.emoji}`);
      Screens.shop();
    },
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
    if (!round) {
      if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'nameInput') actions.saveProfile();
      return;
    }
    let k = e.key;
    const arabic = '٠١٢٣٤٥٦٧٨٩'.indexOf(k);
    if (arabic >= 0) k = String(arabic);
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
