// تحدّي العقل: ثلاث ألعاب قصيرة (مثل Big Brain Academy) تُبنى من مسائل الغابة الحالية
// كل لعبة تصعب مع الإجابات الصحيحة وتسهل مع الخطأ، والمستوى من 1 إلى 5
const Brain = (() => {
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const any = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const SECONDS = 45;        // مدة كل لعبة
  const DUEL_SECONDS = 30;   // مدة كل لعبة في مبارزة العقول
  const MAX_LV = 5;
  const FRUITS = ['🍎', '🍌', '🍓', '🥥', '🍊', '🍇', '🥭', '🍐'];

  // pts = نقاط كل إجابة صحيحة لكل مستوى (اللعبة الأبطأ تعطي أكثر حتى تتقارب النتائج)
  const GAMES = [
    { id: 'cmp', icon: '⚖️', name: 'أيّهما أثقل؟', how: 'اضغط الكفّة التي ناتجها أكبر', pts: 6 },
    { id: 'pick', icon: '🧺', name: 'اجمع الثمار', how: 'اضغط كل البطاقات التي تساوي العدد', pts: 15 },
    { id: 'arr', icon: '👀', name: 'عين الصقر', how: 'انظر إلى الثمار واختر الجواب الصحيح', pts: 10 },
  ];

  // ما يُحفظ في الغابة: أفضل وزن للدماغ، وآخر مستوى وصل إليه في كل لعبة
  function state(p, w) {
    const s = Engine.state(p, w);
    return s.brain || (s.brain = { best: 0, lv: {} });
  }

  // مسائل المناطق المفتوحة في الغابة (الكسور لها مولّداتها في آخر الملف)
  function pool(p, w) {
    if (w === 'frac') return { w };
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

  const make = {
    cmp: (P, lv) => (P.w === 'frac' ? fracCompare(lv) : compare(P, lv)),
    pick: (P, lv, cap) => (P.w === 'frac' ? fracPick(lv, cap) : pick(P, lv, cap)),
    arr: (P, lv) => (P.w === 'frac' ? fracArr(lv) : arr(P, lv)),
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

  const medal = pts => (pts >= 300 ? '🥇' : pts >= 180 ? '🥈' : pts >= 80 ? '🥉' : '🎖️');

  return { SECONDS, DUEL_SECONDS, GAMES, state, pool, make, step, medal };
})();
