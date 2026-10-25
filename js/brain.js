// تحدّي العقل: ثماني ألعاب قصيرة (مثل Big Brain Academy) يختار الطفل منها ما يريد، تُبنى من مسائل الغابة الحالية
// كل لعبة تصعب مع الإجابات الصحيحة وتسهل مع الخطأ، والمستوى من 1 إلى 5
const Brain = (() => {
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const any = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const SECONDS = 60;        // مدة كل لعبة
  const DUEL_SECONDS = 45;   // مدة كل لعبة في مبارزة العقول
  const MAX_LV = 5;
  const FRUITS = ['🍎', '🍌', '🍓', '🥥', '🍊', '🍇', '🥭', '🍐'];

  // pts = نقاط كل إجابة صحيحة لكل مستوى (اللعبة الأبطأ تعطي أكثر حتى تتقارب النتائج)
  const GAMES = [
    { id: 'cmp', icon: '⚖️', name: 'أيّهما أثقل؟', how: 'اضغط الكفّة التي ناتجها أكبر', pts: 6 },
    { id: 'pick', icon: '🧺', name: 'اجمع الثمار', how: 'اضغط كل البطاقات التي تساوي العدد', pts: 15 },
    { id: 'arr', icon: '👀', name: 'عين الصقر', how: 'انظر إلى الثمار واختر الجواب الصحيح', pts: 10 },
    { id: 'miss', icon: '🐒', name: 'القرد الناقص', how: 'خبّأ القرد رقماً في المسألة. ما هو؟', pts: 10 },
    { id: 'tf', icon: '🪨', name: 'صحّ أم خطأ؟', how: 'هل المسألة على الصخرة صحيحة؟ أجب بسرعة', pts: 4 },
    { id: 'seq', icon: '🐾', name: 'تتبّع الأثر', how: 'اكتشف النمط في آثار الأقدام وأكمله', pts: 10 },
    { id: 'pair', icon: '🔗', name: 'الأزواج', how: 'صِل كل مسألة بجوابها', pts: 12 },
    { id: 'ord', icon: '🍌', name: 'رتّب الثمار', how: 'اضغط البطاقات بالترتيب من الأصغر إلى الأكبر', pts: 12 },
  ];

  // الطفل يختار الألعاب (الكل افتراضياً)، وتأتي بترتيب مختلف كل مرة
  const pickGames = (ids = GAMES.map(G => G.id)) => shuffle(ids.filter(id => GAMES.some(G => G.id === id)));
  const game = id => GAMES.find(G => G.id === id) || GAMES[0];

  // ما يُحفظ في الغابة: أفضل وزن للدماغ، وآخر مستوى وصل إليه في كل لعبة
  function state(p, w) {
    const s = Engine.state(p, w);
    return s.brain || (s.brain = { best: 0, lv: {} });
  }

  // مسائل المناطق المفتوحة في الغابة (الكسور والسالب لها مولّداتها في آخر الملف)
  function pool(p, w) {
    if (w === 'frac' || w === 'neg') return { w };
    const W = Engine.world(w);
    const pairs = W.gen
      ? W.regions.slice(0, Engine.state(p, w).unlocked).flatMap(r => Engine.tablePool(r.table, p, w))
      : Engine.racePool(p, w);
    const qs = pairs.map(x => Engine.make(w, ...x));
    return {
      w, qs,
      tables: W.regions.slice(0, Engine.state(p, w).unlocked).map(r => r.table),
      ops: new Set(qs.map(q => q.op)),
      max: Math.max(...qs.map(q => Math.max(q.a, q.b, q.answer))),
    };
  }

  // 3 × 8 و 8 × 3 بطاقة واحدة
  const same = (x, y) => x.op === y.op &&
    ((x.a === y.a && x.b === y.b) || ((x.op === '×' || x.op === '+') && x.a === y.b && x.b === y.a));

  // ── ⚖️ أيّهما أثقل؟ كلما ارتفع المستوى اقترب الناتجان ──
  const GAP = [null, [0.35, 1], [0.2, 0.5], [0.1, 0.3], [0.04, 0.15], [0, 0.07]];
  function compare(P, lv) {
    const top = Math.max(...P.qs.map(q => q.answer));
    const [lo, hi] = GAP[lv].map(f => f * top);
    let fallback = null;
    for (let i = 0; i < 150; i++) {
      const x = any(P.qs), y = any(P.qs);
      const d = Math.abs(x.answer - y.answer);
      if (!d) continue;
      if (d >= lo && d <= Math.max(hi, 1)) return { x, y };
      fallback = fallback || { x, y };
    }
    return fallback;
  }

  // ── 🧺 اجمع الثمار: كل الطرق في الغابة لكتابة العدد n ──
  function ways(P, n) {
    const out = [];
    if (P.w === 'mul') {
      for (let a = 1; a <= 12; a++) {
        const b = n / a;
        if (a <= b && b <= 12 && Number.isInteger(b) && (P.tables.includes(a) || P.tables.includes(b))) {
          out.push(Math.random() < 0.5 ? { a, b, op: '×' } : { a: b, b: a, op: '×' });
        }
      }
    } else if (P.w === 'div') {
      if (n >= 1 && n <= 12) P.tables.forEach(t => out.push({ a: n * t, b: t, op: '÷' }));
    } else {
      if (P.ops.has('+')) for (let a = 1; a < n; a++) out.push({ a, b: n - a, op: '+' });
      if (P.ops.has('−')) for (let b = 1; n + b <= P.max; b++) out.push({ a: n + b, b, op: '−' });
    }
    return out;
  }

  // cap = أكبر عدد للبطاقات (أقل في الشاشة المقسومة)
  function pick(P, lv, cap = 8) {
    const size = Math.min(3 + lv, cap);
    for (let i = 0; i < 80; i++) {
      const n = any(P.qs).answer;
      const good = shuffle(ways(P, n));
      // من المستوى الثاني نحاول أن يكون للعدد أكثر من طريقة
      if (!good.length || (lv > 1 && good.length < 2 && i < 50)) continue;
      const want = Math.min(good.length, lv === 1 ? rnd(1, 2) : rnd(2, 3));
      // بطاقات خاطئة قريبة من العدد، وتقترب أكثر كلما ارتفع المستوى
      const spread = Math.max(1, Math.round(n * (0.6 - lv * 0.1)));
      const bad = [];
      for (let j = 0; j < 150 && bad.length < size - want; j++) {
        const m = n + (Math.random() < 0.5 ? -1 : 1) * rnd(1, spread + Math.floor(j / 15));
        if (m < 1 || m === n) continue;
        const ws = ways(P, m);
        if (!ws.length) continue;
        const c = any(ws);
        if (!bad.some(x => same(x, c))) bad.push(c);
      }
      if (bad.length < size - want) continue;
      const cards = good.slice(0, want).map(c => Object.assign({ ok: true }, c))
        .concat(bad.map(c => Object.assign({ ok: false }, c)));
      return { n, cards: shuffle(cards) };
    }
    return null;
  }

  // أربعة خيارات: البعيدة في المستويات الأولى، والقريبة (الأخطاء الشائعة) في الأعلى
  function choices(ans, near, lv) {
    const set = new Set([ans]);
    if (lv >= 3) shuffle(near.filter(x => x > 0 && x !== ans)).forEach(x => set.size < 4 && set.add(x));
    const far = Math.max(2, Math.round(ans * (0.5 - lv * 0.07)));
    for (let i = 0; set.size < 4 && i < 100; i++) {
      const x = ans + (Math.random() < 0.5 ? -1 : 1) * rnd(1, far + Math.floor(i / 10));
      if (x > 0) set.add(x);
    }
    return shuffle([...set]);
  }

  // ── 👀 عين الصقر: الثمار مرسومة، وفي المستويات العليا تظهر لحظة ثم تختفي ──
  function arr(P, lv) {
    const fruit = any(FRUITS);
    const flash = lv >= 4 ? (lv === 4 ? 2200 : 1500) : 0;
    if (P.w === 'mul') {
      const cap = lv <= 2 ? 40 : 100;
      const qs = P.qs.filter(q => q.a <= 10 && q.b <= 10 && q.answer <= cap);
      const q = qs.length ? any(qs) : Engine.make('mul', rnd(2, 5), rnd(2, 5));
      const { a, b } = q;
      return {
        fruit, flash, text: 'كم ثمرة؟', answer: a * b,
        // الصفوف أقل من الأعمدة حتى تتسع المصفوفة بالعرض
        groups: [{ count: a * b, cols: Math.max(a, b) }],
        options: choices(a * b, [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a * b + 1, a * b - 1], lv),
      };
    }
    if (P.w === 'div') {
      const qs = P.qs.filter(q => q.a <= (lv <= 2 ? 40 : 72));
      const q = qs.length ? any(qs) : Engine.make('div', 2, rnd(2, 6));
      const { a: total, b: t, answer: n } = q;
      // في البداية تظهر السلال وفي كل منها حصّتها، ثم كومة واحدة يُقسَم عددها ذهنياً
      const cols = [6, 8, 9, 10].find(c => c !== n && c !== t) || 7;
      return {
        fruit, flash: 0, answer: n,
        text: `وزّع ${total} ثمرة على ${t} سلال بالتساوي. كم في كل سلة؟`,
        groups: lv <= 2
          ? Array.from({ length: t }, () => ({ count: n, cols: n, label: '🧺' }))
          : [{ count: total, cols }],
        options: choices(n, [n + 1, n - 1, n + 2, t, n * 2], lv),
      };
    }
    // الجمع والطرح بأعداد حتى 20 حتى تُرسم الثمار
    const qs = P.qs.filter(q => q.a <= 20 && q.b <= 20 && q.answer <= 20);
    let q = qs.length ? any(qs) : null;
    if (!q) { const a = rnd(2, 9); q = { a, b: rnd(1, 9), op: '+' }; q.answer = q.a + q.b; }
    const plus = q.op === '+';
    return {
      fruit, flash, answer: q.answer,
      text: plus ? 'كم ثمرة معاً؟' : 'أكل القرد الثمار المشطوبة. كم بقي؟',
      groups: plus ? [{ count: q.a, cols: 5 }, { count: q.b, cols: 5, plus: true }] : [{ count: q.a, cols: 5, crossed: q.b }],
      options: choices(q.answer, [q.answer + 1, q.answer - 1, q.answer + 2, q.answer - 2, plus ? q.a : q.a - q.b + 10], lv),
    };
  }

  // ── غابة الكسور: نفس الألعاب بكسور، والمقام يكبر مع المستوى ──
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const frHtml = (n, d) => `<span class="fr"><b>${n}</b><b>${d}</b></span>`;
  const shape = (k, d, kind = 'pie') => Fractions.make(`name:${k}/${d}:${kind}`).text;
  const frac = (k, d, html) => ({ k, d, answer: k / d, html: html || frHtml(k, d), reveal: shape(k, d) });
  const maxD = lv => Math.min(2 + lv * 2, 12);
  const equal = (x, y) => x.k * y.d === y.k * x.d;

  // المستويان الأوّلان بنفس المقام، الثالث بنفس البسط، ثم كسور مختلفة تقترب قيمتها
  function fracCompare(lv) {
    for (let i = 0; i < 100; i++) {
      let x, y;
      if (lv <= 2) {
        const d = rnd(3, maxD(lv) + 2);
        x = frac(rnd(1, d - 1), d); y = frac(rnd(1, d - 1), d);
      } else if (lv === 3) {
        const k = rnd(1, 3);
        x = frac(k, rnd(k + 1, 10)); y = frac(k, rnd(k + 1, 10));
      } else {
        const a = rnd(2, maxD(lv)), b = rnd(2, maxD(lv));
        x = frac(rnd(1, a - 1), a); y = frac(rnd(1, b - 1), b);
        if (lv === 5 && Math.abs(x.answer - y.answer) > 0.2 && i < 80) continue;
      }
      if (!equal(x, y)) return { x, y };
    }
    return { x: frac(1, 2), y: frac(1, 4) };
  }

  // اضغط كل الكسور التي تساوي الكسر (½ = 2/4 = 3/6)، ومن المستوى الثاني تظهر الرسوم أيضاً
  function fracPick(lv, cap = 8) {
    const size = Math.min(3 + lv, cap);
    const d = rnd(2, Math.min(2 + lv, 6));
    let k = rnd(1, d - 1);
    if (gcd(k, d) > 1) k = 1;
    const T = frac(k, d);
    const good = [];
    for (let m = 1; m * d <= 12; m++) good.push(frac(k * m, d * m));
    if (lv >= 2) {
      const m = any(good);
      good.push(frac(m.k, m.d, shape(m.k, m.d, any(['pie', 'bar']))));
    }
    const want = Math.min(good.length, lv === 1 ? rnd(1, 2) : rnd(2, 3));
    const bad = [];
    for (let j = 0; j < 200 && bad.length < size - want; j++) {
      const m = rnd(1, Math.max(1, Math.floor(12 / d)));
      // أخطاء شائعة: بسط أو مقام مختلف بواحد، أو البسط والمقام بالمقلوب
      const c = any([[k * m + 1, d * m], [k * m, d * m + 1], [k * m + m, d * m], [d * m - k * m, d * m], [rnd(1, 5), rnd(2, 12)]]);
      if (c[0] < 1 || c[0] >= c[1]) continue;
      const f = Math.random() < 0.3 && lv >= 2 && c[1] <= 12 ? frac(c[0], c[1], shape(c[0], c[1])) : frac(c[0], c[1]);
      if (!equal(f, T) && !bad.some(x => x.k === f.k && x.d === f.d)) bad.push(f);
    }
    const cards = shuffle(good).slice(0, want).map(c => Object.assign({ ok: true }, c))
      .concat(bad.map(c => Object.assign({ ok: false }, c)));
    return { n: T.answer, label: T.html, cards: shuffle(cards) };
  }

  // ما الكسر الملوّن؟ أو كم ثمرة في جزء من السلة؟
  function fracArr(lv) {
    const flash = lv >= 4 ? (lv === 4 ? 2200 : 1500) : 0;
    const d = rnd(2, maxD(lv));
    const k = rnd(1, d - 1);
    if (Math.random() < 0.5) {
      const kind = any(['pie', 'bar']);
      const opts = [[k, d]];
      shuffle([[d - k, d], [k, d + 1], [k + 1, d], [k - 1, d], [k, d - 1], [d, k + d]]).concat([[1, d + 2], [2, d + 3]]).forEach(([a, b]) => {
        if (opts.length < 4 && a > 0 && a < b && !opts.some(([x, y]) => x * b === a * y)) opts.push([a, b]);
      });
      return {
        flash, text: 'ما الكسر الملوّن؟', answer: `${k}/${d}`, shape: shape(k, d, kind),
        options: shuffle(opts).map(([a, b]) => ({ v: `${a}/${b}`, html: frHtml(a, b) })),
      };
    }
    // الثمار صفوف بعدد المقام، فيرى الطفل أن كل صف جزء
    const dd = Math.min(d, 6), per = rnd(2, lv <= 2 ? 3 : 5), kk = Math.min(k, dd - 1), ans = kk * per;
    return {
      flash, fruit: any(FRUITS), answer: ans,
      text: `كم ثمرة في ${frHtml(kk, dd)} السلة؟`,
      groups: Array.from({ length: dd }, () => ({ count: per, cols: per })),
      rows: true,
      options: choices(ans, [per, ans + per, ans - per, dd * per - ans, ans + 1], lv),
    };
  }

  // ── غابة السالب والموجب: المستويات الأولى أعداد، ثم عمليات بالسالب تقترب نتائجها ──
  const sgn = n => (n < 0 ? `−${-n}` : `${n}`);
  const par = n => (n < 0 ? `(${sgn(n)})` : `${n}`);
  const nz = (lo, hi) => { let n; do n = rnd(lo, hi); while (n === 0); return n; };
  // العدد وحده لا يحتاج كشف ناتجه تحت الكفّة
  const int = n => ({ answer: n, html: `<span dir="ltr">${sgn(n)}</span>`, reveal: '&nbsp;' });

  // عملية بعدد سالب، وأنواعها تزيد مع المستوى: 3 + (−5)، −4 + (−2)، −6 + 4، 2 − 7، 3 − (−4)
  function negExpr(lv) {
    const kind = any(['pn', 'nn', 'np', 'sub', 'subn'].slice(0, Math.min(lv + 1, 5)));
    let a, b, op = '+';
    if (kind === 'pn') { a = rnd(1, 9); b = nz(-9, -1); }
    else if (kind === 'nn') { a = nz(-9, -1); b = nz(-9, -1); }
    else if (kind === 'np') { a = nz(-9, -1); b = rnd(1, 9); }
    else if (kind === 'sub') { a = rnd(0, 9); b = rnd(a + 1, 12); op = '−'; }
    else { a = nz(-9, 9); b = nz(-9, -1); op = '−'; }
    const v = op === '+' ? a + b : a - b;
    return { a, b, op, answer: v, html: `<span dir="ltr">${sgn(a)} ${op} ${par(b)}</span>`, reveal: `= ${sgn(v)}` };
  }

  // أيّهما أكبر: سالب وموجب، ثم سالبان متباعدان فمتقاربان (−3 أكبر من −8)، ثم عمليتان
  function negCompare(lv) {
    for (let i = 0; i < 100; i++) {
      let x, y;
      if (lv === 1) { x = int(nz(-9, -1)); y = int(rnd(0, 9)); }
      else if (lv <= 3) {
        const a = nz(-10, -1), d = lv === 2 ? rnd(3, 8) : rnd(1, 2);
        x = int(a); y = int(a - d >= -12 ? a - d : a + d);
        if (y.answer >= 0) continue;
      } else {
        x = negExpr(lv); y = negExpr(lv);
        if (lv === 5 && Math.abs(x.answer - y.answer) > 3) continue;
      }
      if (x.answer !== y.answer) return Math.random() < 0.5 ? { x, y } : { x: y, y: x };
    }
    return { x: int(-3), y: int(-8) };
  }

  // اضغط كل ما يساوي −2، ومن البطاقات الخاطئة عكس الإشارة (2) لأنه الخطأ الأشهر
  function negPick(lv, cap = 8) {
    const size = Math.min(3 + lv, cap);
    const byVal = new Map();
    for (let i = 0; i < 500; i++) {
      const e = negExpr(Math.max(lv, 2));
      if (!byVal.has(e.answer)) byVal.set(e.answer, []);
      const list = byVal.get(e.answer);
      if (!list.some(x => x.html === e.html)) list.push(e);
    }
    const vals = [...byVal.keys()].filter(v => v !== 0 && Math.abs(v) <= 10 && byVal.get(v).length >= 2 && (lv > 2 || v < 0));
    const n = vals.length ? any(vals) : -2;
    if (!byVal.has(n)) byVal.set(n, [{ answer: n, html: `<span dir="ltr">3 + ${par(-5)}</span>` }]);
    const good = shuffle(byVal.get(n)).slice(0, lv === 1 ? rnd(1, 2) : rnd(2, 3));
    const near = shuffle([-n, n + 1, n - 1, n + 2, n - 2, n + 3, n - 3].filter(v => byVal.has(v)));
    const bad = [];
    for (let j = 0; near.length && bad.length < size - good.length && j < 60; j++) {
      const v = near[j % near.length];
      const c = any(byVal.get(v));
      if (!bad.some(x => x.html === c.html)) bad.push(c);
    }
    const cards = good.map(c => Object.assign({ ok: true }, c)).concat(bad.map(c => Object.assign({ ok: false }, c)));
    return { n, label: sgn(n), cards: shuffle(cards) };
  }

  // أين يشير السهم على خط الأعداد؟ وفي المستويات العليا يظهر لحظة ثم يختفي
  function negArr(lv) {
    const a = lv <= 2 ? nz(-9, -1) : nz(-10, 10);
    const set = new Set([a]);
    shuffle([-a, a + 1, a - 1, a + 2, a - 2]).forEach(v => { if (set.size < 4 && v !== 0) set.add(v); });
    return {
      flash: lv >= 4 ? (lv === 4 ? 2200 : 1500) : 0,
      text: 'أين يشير السهم؟', answer: String(a), shape: Integers.make(`line:${a}`).text,
      options: shuffle([...set]).map(v => ({ v: String(v), html: sgn(v) })),
    };
  }

  // ── 🐒 القرد الناقص: رقم مخفي في المسألة. في البداية يختبئ الرقم الثاني، ثم أيّ رقم ──
  const MONKEY = '<i class="monkey">🐒</i>';
  const eq = (parts, hide) => `<span class="meq" dir="ltr">${parts.map((x, k) => (k === hide ? MONKEY : x)).join(' ')}</span>`;

  function miss(P, lv) {
    for (let i = 0; i < 60; i++) {
      const q = any(P.qs);
      const { a, b, op, answer: c } = q;
      // المكان المخفي: 0 الأول، 2 الثاني، 4 الناتج (المستوى الأول فقط، لأنه مسألة عادية)
      const hide = lv === 1 ? any([2, 4]) : lv === 2 ? 2 : any([0, 2]);
      const h = [a, null, b, null, c][hide];
      if (!(h > 0)) continue;
      // الأخطاء الشائعة: العملية المعاكسة (جمع بدل طرح) والأرقام المجاورة
      const near = [h + 1, h - 1, h + 2, h - 2];
      if (op === '+') near.push(c + (hide ? a : b), c);
      if (op === '−') near.push(hide === 0 ? c - b : a + c, c);
      if (op === '×') near.push(c - (hide ? a : b), hide ? a : b);
      if (op === '÷') near.push(hide === 0 ? Math.round(c / b) || c + b : a * c, c);
      return {
        text: 'ما الرقم الذي خبّأه القرد؟', answer: h,
        html: eq([a, op, b, '=', c], hide), reveal: eq([a, op, b, '=', c], -1),
        options: choices(h, near, lv),
      };
    }
    const a = rnd(2, 9), b = rnd(2, 9);
    return { text: 'ما الرقم الذي خبّأه القرد؟', answer: b, html: eq([a, '×', b, '=', a * b], 2), reveal: eq([a, '×', b, '=', a * b], -1), options: choices(b, [b + 1, b - 1], lv) };
  }

  // الكسور: كسر يساوي كسراً (½ = 🐒/4)، ومن المستوى الثالث جمع بنفس المقام أو مقام مخفي
  function fracMiss(lv) {
    const d = rnd(2, Math.min(2 + lv, 6));
    let k = rnd(1, d - 1);
    if (gcd(k, d) > 1) k = 1;
    const m = rnd(2, Math.max(2, Math.floor(12 / d)));
    const kind = lv <= 2 ? 'num' : lv === 3 ? any(['num', 'add']) : any(['num', 'den', 'add']);
    if (kind === 'add') {
      const D = rnd(4, maxD(lv) + 2), x = rnd(1, D - 2), y = rnd(1, D - 1 - x);
      return {
        text: 'ما الرقم الذي خبّأه القرد؟', answer: y,
        html: `<span class="meq" dir="ltr">${frHtml(x, D)} + ${frHtml(MONKEY, D)} = ${frHtml(x + y, D)}</span>`,
        reveal: `<span class="meq" dir="ltr">${frHtml(x, D)} + ${frHtml(y, D)} = ${frHtml(x + y, D)}</span>`,
        options: choices(y, [x + y, y + 1, y - 1, x], lv),
      };
    }
    const den = kind === 'den';
    const h = den ? d * m : k * m;
    const right = (v) => (den ? frHtml(k * m, v) : frHtml(v, d * m));
    return {
      text: 'ما الرقم الذي خبّأه القرد؟', answer: h,
      html: `<span class="meq" dir="ltr">${frHtml(k, d)} = ${right(MONKEY)}</span>`,
      reveal: `<span class="meq" dir="ltr">${frHtml(k, d)} = ${right(h)}</span>`,
      // أشهر خطأ: إضافة الفرق بدل الضرب (½ = 3/4)
      options: choices(h, den ? [d + k * m - k, d * m + 1, d * m - 1] : [k + d * m - d, k * m + 1, k * m - 1, k], lv),
    };
  }

  // السالب والموجب: 3 + 🐒 = −2، والخيارات فيها عكس الإشارة دائماً
  function negMiss(lv) {
    let e;
    for (let i = 0; i < 50; i++) { e = negExpr(Math.max(lv, 2)); if (e.a && e.answer) break; }
    const hide = lv <= 3 ? 2 : any([0, 2]);
    const h = hide ? e.b : e.a;
    const set = new Set([h]);
    shuffle([-h, h + 1, h - 1, h + 2, h - 2]).forEach(x => { if (set.size < 4 && x !== 0) set.add(x); });
    const parts = [sgn(e.a), e.op, par(e.b), '=', sgn(e.answer)];
    return {
      text: 'ما الرقم الذي خبّأه القرد؟', answer: String(h), html: eq(parts, hide), reveal: eq(parts, -1),
      options: shuffle([...set]).map(x => ({ v: String(x), html: sgn(x) })),
    };
  }

  // ── 🪨 صحّ أم خطأ: نصف المسائل خاطئة، وخطؤها يقترب من الصحيح مع المستوى ──
  const YES_NO = [{ v: '1', html: '✅ صحّ' }, { v: '0', html: '❌ خطأ' }];
  const tfOut = (show, right, ok) => ({
    text: 'هل المسألة صحيحة؟', answer: ok ? '1' : '0', two: true,
    html: `<span class="meq" dir="ltr">${show}</span>`, reveal: `<span class="meq" dir="ltr">${right}</span>`, options: YES_NO,
  });
  const nearWrong = (ans, near, lv) => {
    const list = (lv >= 3 ? near : []).filter(x => x > 0 && x !== ans);
    if (list.length) return any(list);
    const far = Math.max(2, Math.round(ans * (0.5 - lv * 0.07)));
    return Math.max(1, ans + (Math.random() < 0.5 && ans > far ? -1 : 1) * rnd(1, far)) || ans + 1;
  };

  function tf(P, lv) {
    const q = any(P.qs);
    const { a, b, op, answer: c } = q;
    const ok = Math.random() < 0.5;
    const near = op === '×' ? [a * (b + 1), a * (b - 1), (a + 1) * b, c + 1, c - 1]
      : op === '÷' ? [c + 1, c - 1, b] : [c + 1, c - 1, c + 2, c - 2, c + 10, c - 10];
    let v = ok ? c : nearWrong(c, near, lv);
    if (v === c && !ok) v = c + 1;
    return tfOut(`${a} ${op} ${b} = ${v}`, `${a} ${op} ${b} = ${c}`, ok);
  }

  // الكسور: كسر يساوي كسراً، ومن المستوى الثالث جمع، وخطؤه الشهير جمع المقامين (⅓ + ⅓ = 2/6)
  function fracTf(lv) {
    const ok = Math.random() < 0.5;
    if (lv >= 3 && Math.random() < 0.6) {
      const D = rnd(3, maxD(lv) + 1), x = rnd(1, D - 2), y = rnd(1, D - 1 - x);
      const wrong = any([[x + y, D + D], [x + y + 1, D], [x * y, D]].filter(([k, d]) => k * D !== (x + y) * d));
      const [k, d] = ok ? [x + y, D] : wrong;
      return tfOut(`${frHtml(x, D)} + ${frHtml(y, D)} = ${frHtml(k, d)}`, `${frHtml(x, D)} + ${frHtml(y, D)} = ${frHtml(x + y, D)}`, ok);
    }
    const d = rnd(2, Math.min(2 + lv, 6));
    let k = rnd(1, d - 1);
    if (gcd(k, d) > 1) k = 1;
    const m = rnd(2, Math.max(2, Math.floor(12 / d)));
    // الخطأ: إضافة الرقم نفسه للبسط والمقام بدل الضرب، أو بسط أكبر بواحد
    const [wk, wd] = any([[k + m, d + m], [k * m + 1, d * m], [k * m, d * m + 1]]);
    return tfOut(`${frHtml(k, d)} = ${ok ? frHtml(k * m, d * m) : frHtml(wk, wd)}`, `${frHtml(k, d)} = ${frHtml(k * m, d * m)}`, ok);
  }

  // السالب: أشهر خطأ عكس الإشارة
  function negTf(lv) {
    const e = negExpr(Math.max(lv, 2));
    const ok = Math.random() < 0.5;
    const shown = ok ? e.answer : e.answer && Math.random() < 0.6 ? -e.answer : e.answer + any([1, -1, 2, -2]);
    const left = `${sgn(e.a)} ${e.op} ${par(e.b)}`;
    return tfOut(`${left} = ${sgn(shown)}`, `${left} = ${sgn(e.answer)}`, ok);
  }

  // ── 🐾 تتبّع الأثر: خمسة آثار بينها خطوة ثابتة، وأحدها مخفي ──
  const PAW = '<i class="paw">🐾</i>';
  const seqHide = lv => (lv <= 2 ? 4 : lv === 3 ? any([3, 4]) : rnd(1, 4));
  const seqOut = (terms, hide, shown, ans, options) => ({
    text: 'ما الرقم المخفي في الأثر؟', answer: ans,
    html: `<span class="meq seq" dir="ltr">${terms.map((t, k) => (k === hide ? MONKEY : shown(t))).join(PAW)}</span>`,
    reveal: `<span class="meq seq" dir="ltr">${terms.map(shown).join(PAW)}</span>`,
    options,
  });

  function seq(P, lv) {
    let start, step;
    if (P.w === 'mul') {
      const t = any(P.tables.filter(x => x > 1).length ? P.tables.filter(x => x > 1) : [2]);
      // المستوى الأول من أول الجدول، ثم من وسطه، والخامس تنازلي أحياناً
      const i0 = lv <= 1 ? 1 : rnd(1, 8);
      [start, step] = lv === 5 && Math.random() < 0.5 ? [t * (i0 + 4), -t] : [t * i0, t];
    } else if (P.w === 'div') {
      const t = any(P.tables);
      [start, step] = [t * rnd(5, 12), -t];
    } else {
      step = lv <= 1 ? rnd(1, 2) : rnd(2, 2 + lv * 2);
      const down = P.ops.has('−') && Math.random() < 0.5;
      start = down ? rnd(step * 4, step * 4 + 20) : rnd(0, 20);
      if (down) step = -step;
    }
    const terms = [0, 1, 2, 3, 4].map(k => start + k * step);
    const hide = seqHide(lv);
    const h = terms[hide];
    const k = Math.abs(step);
    return seqOut(terms, hide, t => t, h, choices(h, [h + 1, h - 1, h + k, h - k, h + k + 1], lv));
  }

  // الكسور: البسط يزيد واحداً (⅛، 2/8، 3/8) ثم سلسلة كسور متساوية (⅓، 2/6، 3/9)
  function fracSeq(lv) {
    const hide = seqHide(lv);
    const opts = (k, d, alts) => {
      const list = [[k, d]];
      shuffle(alts).forEach(([a, b]) => { if (list.length < 4 && a > 0 && b > 0 && !list.some(([x, y]) => x === a && y === b)) list.push([a, b]); });
      return shuffle(list).map(([a, b]) => ({ v: `${a}/${b}`, html: frHtml(a, b) }));
    };
    if (lv <= 3) {
      const d = rnd(6, 12), k0 = rnd(1, d - 5);
      const terms = [0, 1, 2, 3, 4].map(k => [k0 + k, d]);
      const [k, dd] = terms[hide];
      return seqOut(terms, hide, ([a, b]) => frHtml(a, b), `${k}/${dd}`, opts(k, dd, [[k + 1, dd], [k - 1, dd], [k, dd + 1], [k + 2, dd], [dd, k]]));
    }
    const d = rnd(2, 4), k0 = rnd(1, d - 1);
    const terms = [1, 2, 3, 4, 5].map(m => [k0 * m, d * m]);
    const [k, dd] = terms[hide];
    return seqOut(terms, hide, ([a, b]) => frHtml(a, b), `${k}/${dd}`, opts(k, dd, [[k + 1, dd], [k, dd + 1], [k0 + hide, d + hide], [k - k0, dd]]));
  }

  // السالب: العدّ يعبر الصفر نزولاً، ومن المستوى الرابع صعوداً من السالب أيضاً
  function negSeq(lv) {
    const step = lv <= 1 ? 1 : lv === 2 ? 2 : rnd(2, 5);
    const up = lv >= 4 && Math.random() < 0.5;
    const start = up ? -rnd(step * 2, step * 4) : rnd(step, step * 2);
    const terms = [0, 1, 2, 3, 4].map(k => start + (up ? k : -k) * step);
    const hide = seqHide(lv);
    const h = terms[hide];
    const set = new Set([h]);
    shuffle([-h, h + 1, h - 1, h + step, h - step]).forEach(x => { if (set.size < 4 && x !== h) set.add(x); });
    return seqOut(terms, hide, sgn, String(h), shuffle([...set]).map(x => ({ v: String(x), html: sgn(x) })));
  }

  // ── 🔗 الأزواج: مسائل في عمود وأجوبتها في عمود، ومن المستوى الرابع أجوبة متقاربة ──
  const nPairs = (lv, cap) => Math.min(lv <= 1 ? 2 : lv <= 3 ? 3 : 4, Math.floor(cap / 2));
  const pairOut = list => ({
    left: shuffle(list.map((x, key) => ({ key, html: x.l }))),
    right: shuffle(list.map((x, key) => ({ key, html: x.r }))),
    n: list.length,
  });

  function pair(P, lv, cap = 8) {
    const n = nPairs(lv, cap);
    const close = lv >= 4;
    for (let i = 0; i < 40; i++) {
      const base = any(P.qs);
      const pool = shuffle(P.qs.filter(q => !close || Math.abs(q.answer - base.answer) <= Math.max(6, base.answer * 0.3)));
      const list = [base];
      pool.forEach(q => { if (list.length < n && !list.some(x => x.answer === q.answer)) list.push(q); });
      if (list.length === n) return pairOut(list.map(q => ({ l: `<span dir="ltr">${q.a} ${q.op} ${q.b}</span>`, r: q.answer })));
    }
    return null;
  }

  // الكسور: الكسر برسمه، ومن المستوى الرابع بكسر يساويه
  function fracPair(lv, cap = 8) {
    const n = nPairs(lv, cap);
    const list = [];
    for (let i = 0; list.length < n && i < 100; i++) {
      const d = rnd(2, Math.min(maxD(lv), lv >= 4 ? 6 : 8)), k = rnd(1, d - 1);
      if (list.some(x => x.k * d === k * x.d)) continue;
      const m = rnd(2, Math.max(2, Math.floor(12 / d)));
      list.push({ k, d, l: frHtml(k, d), r: lv >= 4 ? frHtml(k * m, d * m) : shape(k, d, any(['pie', 'bar'])) });
    }
    return pairOut(list);
  }

  function negPair(lv, cap = 8) {
    const n = nPairs(lv, cap);
    const list = [];
    for (let i = 0; list.length < n && i < 200; i++) {
      const e = negExpr(Math.max(lv, 2));
      if (!list.some(x => x.v === e.answer)) list.push({ v: e.answer, l: e.html, r: `<span dir="ltr">${sgn(e.answer)}</span>` });
    }
    return pairOut(list);
  }

  // ── 🍌 رتّب الثمار: ثلاث بطاقات ثم أربع، تتقارب قيمها، وفي المستوى الخامس من الأكبر إلى الأصغر أحياناً ──
  const ordOut = (cards, lv) => {
    const desc = lv === 5 && Math.random() < 0.5;
    return {
      desc, cards: shuffle(cards),
      order: cards.map(c => c.answer).sort((x, y) => (desc ? y - x : x - y)),
    };
  };
  const nOrd = (lv, cap) => Math.min(lv <= 2 ? 3 : 4, cap);

  function ord(P, lv, cap = 8) {
    const n = nOrd(lv, cap);
    for (let i = 0; i < 60; i++) {
      const base = any(P.qs);
      const gap = Math.max(1, Math.round(base.answer * [0, 1, 0.6, 0.4, 0.25, 0.15][lv]));
      const near = shuffle(P.qs.filter(q => Math.abs(q.answer - base.answer) <= gap * n));
      const list = [base];
      near.forEach(q => { if (list.length < n && !list.some(x => x.answer === q.answer)) list.push(q); });
      if (list.length === n) return ordOut(list, lv);
    }
    return null;
  }

  function fracOrd(lv, cap = 8) {
    const n = nOrd(lv, cap);
    const list = [];
    const d0 = rnd(5, 12), k0 = rnd(1, 3);
    for (let i = 0; list.length < n && i < 200; i++) {
      let f;
      if (lv <= 2) f = frac(rnd(1, d0 - 1), d0);
      else if (lv === 3) f = frac(k0, rnd(k0 + 1, 12));
      else { const d = rnd(2, maxD(lv)); f = frac(rnd(1, d - 1), d); }
      if (!list.some(x => equal(x, f))) list.push(f);
    }
    return ordOut(list, lv);
  }

  function negOrd(lv, cap = 8) {
    const n = nOrd(lv, cap);
    const list = [];
    for (let i = 0; list.length < n && i < 200; i++) {
      const x = lv <= 3 ? int(nz(-12, lv === 1 ? 6 : -1)) : negExpr(lv);
      if (!list.some(y => y.answer === x.answer)) list.push(x);
    }
    return ordOut(list, lv);
  }

  const make = {
    cmp: (P, lv) => (P.w === 'frac' ? fracCompare(lv) : P.w === 'neg' ? negCompare(lv) : compare(P, lv)),
    pick: (P, lv, cap) => (P.w === 'frac' ? fracPick(lv, cap) : P.w === 'neg' ? negPick(lv, cap) : pick(P, lv, cap)),
    arr: (P, lv) => (P.w === 'frac' ? fracArr(lv) : P.w === 'neg' ? negArr(lv) : arr(P, lv)),
    miss: (P, lv) => (P.w === 'frac' ? fracMiss(lv) : P.w === 'neg' ? negMiss(lv) : miss(P, lv)),
    tf: (P, lv) => (P.w === 'frac' ? fracTf(lv) : P.w === 'neg' ? negTf(lv) : tf(P, lv)),
    seq: (P, lv) => (P.w === 'frac' ? fracSeq(lv) : P.w === 'neg' ? negSeq(lv) : seq(P, lv)),
    pair: (P, lv, cap) => (P.w === 'frac' ? fracPair(lv, cap) : P.w === 'neg' ? negPair(lv, cap) : pair(P, lv, cap)),
    ord: (P, lv, cap) => (P.w === 'frac' ? fracOrd(lv, cap) : P.w === 'neg' ? negOrd(lv, cap) : ord(P, lv, cap)),
  };

  // المستوى يرتفع بعد إجابتين صحيحتين متتاليتين، وينزل مع كل خطأ
  function step(g, ok) {
    if (ok) {
      g.right++;
      g.points += g.lv * GAMES.find(x => x.id === g.id).pts;
      if (++g.streak >= 2) { g.lv = Math.min(MAX_LV, g.lv + 1); g.streak = 0; }
    } else {
      g.wrong++;
      g.streak = 0;
      g.lv = Math.max(1, g.lv - 1);
    }
    g.top = Math.max(g.top, g.lv);
  }

  // حدود الأوسمة للعبة من 60 ثانية
  const medal = pts => (pts >= 400 ? '🥇' : pts >= 240 ? '🥈' : pts >= 110 ? '🥉' : '🎖️');

  return { SECONDS, DUEL_SECONDS, GAMES, game, pickGames, state, pool, make, step, medal };
})();
