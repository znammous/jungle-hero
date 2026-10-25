// منطق التعلّم: اختيار الأسئلة حسب نقاط الضعف (نظام صناديق Leitner) وحساب الإتقان
// كل مسألة تُبنى من زوج [الجدول، العدد] في غابة (world) معيّنة
const Engine = (() => {
  const world = id => WORLDS.find(w => w.id === id);

  // 3×7 و 7×3 نفس المسألة، فتُحفظ بمفتاح واحد
  const key = (a, b) => (a <= b ? `${a}x${b}` : `${b}x${a}`);

  // غابة الجمع والطرح: مولّد لكل منطقة يعيد المسألة نصاً مثل '27+15'
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const ADD_GEN = {
    1: () => { const a = rnd(1, 9); return `${a}+${rnd(1, 10 - a)}`; },
    2: () => { const c = rnd(2, 10); return `${c}-${rnd(1, c - 1)}`; },
    // حتى 20: مسائل تتجاوز العشرة (8 + 5، 13 - 5)
    3: () => { const a = rnd(2, 9); return `${a}+${rnd(11 - a, 9)}`; },
    4: () => { const x = rnd(2, 9), b = rnd(11 - x, 9); return `${x + b}-${b}`; },
    5: () => { const x = rnd(1, 9); return `${x * 10}+${rnd(1, 10 - x) * 10}`; },
    6: () => { const c = rnd(2, 10); return `${c * 10}-${rnd(1, c - 1) * 10}`; },
    7: () => { const at = rnd(1, 8), au = rnd(0, 8); return `${at * 10 + au}+${rnd(0, 9 - at) * 10 + rnd(1, 9 - au)}`; },
    8: () => { const at = rnd(2, 9), au = rnd(1, 9); return `${at * 10 + au}-${rnd(0, at - 1) * 10 + rnd(1, au)}`; },
    9: () => { const at = rnd(1, 7), au = rnd(1, 9); return `${at * 10 + au}+${rnd(0, 8 - at) * 10 + rnd(10 - au, 9)}`; },
    10: () => { const at = rnd(2, 9), au = rnd(0, 8); return `${at * 10 + au}-${rnd(0, at - 1) * 10 + rnd(au + 1, 9)}`; },
    11: () => ADD_GEN[rnd(7, 10)](),
  };

  const KEYS = {
    mul: key,
    div: (t, n) => `${t * n}/${t}`,
    add: (t, n) => `${t}:${n}`,
  };
  // من المفتاح المحفوظ إلى الزوج [الجدول، العدد]
  const PAIRS = {
    mul: k => k.split('x').map(Number),
    div: k => { const [a, t] = k.split('/').map(Number); return [t, a / t]; },
    add: k => { const i = k.indexOf(':'); return [Number(k.slice(0, i)), k.slice(i + 1)]; },
  };
  const MAKE = {
    mul: (t, n) => { const [a, b] = Math.random() < 0.5 ? [t, n] : [n, t]; return { a, b, answer: t * n }; },
    div: (t, n) => ({ a: t * n, b: t, answer: n }),
    add: (t, n) => {
      const [, a, op, b] = n.match(/^(\d+)([+-])(\d+)$/);
      return { a: +a, b: +b, op: op === '+' ? '+' : '−', answer: op === '+' ? +a + +b : a - b,
        fastMs: world('add').regions.find(r => r.table === t).fastMs };
    },
  };

  function make(w, t, n) {
    const k = KEYS[w](t, n);
    return Object.assign({ w, t, n, op: world(w).op, key: k, id: `${w}:${k}` }, MAKE[w](t, n));
  }

  const pairOf = (w, k) => PAIRS[w](k);
  const label = (w, k) => (w === 'add'
    ? k.slice(k.indexOf(':') + 1).replace('+', ' + ').replace('-', ' − ')
    : k.replace(/[x/]/, ` ${world(w).op} `));

  // تقدّم المستكشف في غابة: غابة الضرب في الملف نفسه كما كانت، وكل غابة أخرى في p.worlds
  function state(p, w = 'mul') {
    if (w === 'mul') return p;
    p.worlds = p.worlds || {};
    return p.worlds[w] || (p.worlds[w] = { facts: {}, unlocked: 1, animals: [], bestRace: 0 });
  }

  const isOpen = (p, w) => !w.soon && (!w.needs || state(p, w.needs.world).unlocked >= w.needs.regions);
  const openWorlds = p => WORLDS.filter(w => isOpen(p, w));
  // الغابة التي يلعب فيها المستكشف الآن
  const current = p => { const w = world(p.world); return w && isOpen(p, w) ? w : world('mul'); };

  function fact(p, w, t, n) {
    return state(p, w).facts[KEYS[w](t, n)] || { box: 0, seen: 0, right: 0 };
  }

  function record(p, q, ok, ms) {
    const s = state(p, q.w);
    const fast = ms <= (q.fastMs || CONFIG.fastMs);
    const gen = world(q.w).gen;
    if (gen) {
      // إتقان المنطقة: كل إجابة صحيحة سريعة تقرّب، وكل خطأ يُبعد خطوتين
      s.skill = s.skill || {};
      s.skill[q.t] = Math.max(0, Math.min(CONFIG.skillGoal, (s.skill[q.t] || 0) + (ok ? (fast ? 1 : 0) : -2)));
      // المسائل العشوائية لا تُحفظ كلها: فقط ما أخطأ فيه حتى يتقنه، لتعود إليه
      if (ok && !s.facts[q.key]) return;
    }
    const facts = s.facts;
    const f = facts[q.key] || (facts[q.key] = { box: 0, seen: 0, right: 0 });
    f.seen++;
    if (ok) {
      f.right++;
      // الإجابة السريعة ترفع الصندوق، والبطيئة الصحيحة تحافظ عليه
      f.box = fast ? Math.min(CONFIG.maxBox, f.box + 1) : Math.max(f.box, 1);
      if (f.box >= CONFIG.masteredBox && !f.masteredAt) f.masteredAt = Date.now();
    } else {
      f.box = Math.max(0, f.box - 2);
    }
    f.last = Date.now();
    if (gen && f.box >= CONFIG.masteredBox) delete facts[q.key];
  }

  // نسبة المسائل المتقنة في جدول (من 1 إلى 12)
  function mastery(p, table, w = 'mul') {
    if (world(w).gen) return Math.min(1, ((state(p, w).skill || {})[table] || 0) / CONFIG.skillGoal);
    let mastered = 0;
    for (let n = 1; n <= 12; n++) if (fact(p, w, table, n).box >= CONFIG.masteredBox) mastered++;
    return mastered / 12;
  }

  function tablePool(table, p, w = 'mul') {
    const pool = [];
    if (!world(w).gen) {
      for (let n = 1; n <= 12; n++) pool.push([table, n]);
      return pool;
    }
    // مسائل جديدة في كل جولة، ومعها أضعف ما أخطأ فيه سابقاً
    const pre = `${table}:`;
    Object.entries(state(p, w).facts)
      .filter(([k]) => k.startsWith(pre))
      .sort((x, y) => x[1].box - y[1].box)
      .slice(0, 4)
      .forEach(([k]) => pool.push(pairOf(w, k)));
    const seen = new Set(pool.map(x => x[1]));
    for (let i = 0; pool.length < 12 && i < 200; i++) {
      const n = ADD_GEN[table]();
      if (!seen.has(n)) { seen.add(n); pool.push([table, n]); }
    }
    return pool;
  }

  // السباق: كل المناطق المفتوحة، بدون 1 لأنها سهلة جداً
  function racePool(p, w = 'mul') {
    if (world(w).gen) {
      return world(w).regions.slice(0, state(p, w).unlocked).flatMap(r => tablePool(r.table, p, w).slice(0, 6));
    }
    const seen = new Set();
    const pool = [];
    world(w).regions.slice(0, state(p, w).unlocked).forEach(r => {
      for (let n = 2; n <= 12; n++) {
        const k = KEYS[w](r.table, n);
        if (!seen.has(k)) { seen.add(k); pool.push([r.table, n]); }
      }
    });
    return pool;
  }

  // المسائل الأضعف والجديدة تظهر أكثر
  function pick(p, pool, prevKey, w = 'mul') {
    const options = pool.length > 1 ? pool.filter(([t, n]) => KEYS[w](t, n) !== prevKey) : pool;
    const weights = options.map(([t, n]) => {
      const f = fact(p, w, t, n);
      return (CONFIG.maxBox + 1 - f.box) ** 2 + (f.seen === 0 ? 4 : 0);
    });
    let r = Math.random() * weights.reduce((s, x) => s + x, 0);
    let i = 0;
    while (r > weights[i] && i < options.length - 1) r -= weights[i++];
    return make(w, ...options[i]);
  }

  // أخطاء اليوم تُحفظ [الجدول، العدد] للضرب كما كانت، و[الجدول، العدد، الغابة] لغيرها
  const mistakeOf = q => (q.w === 'mul' ? [q.t, q.n] : [q.t, q.n, q.w]);
  const mistakeId = ([t, n, w = 'mul']) => `${w}:${KEYS[w](t, n)}`;
  const fromMistake = ([t, n, w = 'mul']) => make(w, t, n);

  function rankFor(score) {
    return RANKS.filter(r => score >= r.min).pop();
  }

  // هدف السباق (الضفة الأخرى) = الرتبة التالية، فيبقى الهدف قريباً ويكبر مع المستكشف
  function raceGoal(best) {
    return (RANKS.find(r => r.min > best) || RANKS[RANKS.length - 1]).min;
  }

  // بعد كل جولة: فتح مناطق وغابات جديدة واكتشاف الحيوانات (مع مكافآت)
  function progress(p) {
    const events = [];
    WORLDS.forEach(w => {
      if (!isOpen(p, w)) return;
      const s = state(p, w.id);
      if (w.needs && !s.opened) {
        s.opened = true;
        events.push({ type: 'world', world: w });
      }
      while (s.unlocked < w.regions.length &&
             mastery(p, w.regions[s.unlocked - 1].table, w.id) >= CONFIG.unlockAt) {
        events.push({ type: 'unlock', region: w.regions[s.unlocked], world: w });
        s.unlocked++;
        p.coins += COINS.unlock;
      }
      w.regions.slice(0, s.unlocked).forEach(r => {
        if (!s.animals.includes(r.table) && mastery(p, r.table, w.id) >= 1) {
          s.animals.push(r.table);
          p.coins += COINS.animal;
          events.push({ type: 'animal', region: r, world: w });
        }
      });
    });
    return events;
  }

  return {
    world, key, make, pairOf, label, state, isOpen, openWorlds, current, fact, record, mastery,
    tablePool, racePool, pick, mistakeOf, mistakeId, fromMistake, rankFor, raceGoal, progress,
  };
})();
