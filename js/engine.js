// منطق التعلّم: اختيار الأسئلة حسب نقاط الضعف (نظام صناديق Leitner) وحساب الإتقان
// كل مسألة تُبنى من زوج [الجدول، العدد] في غابة (world) معيّنة
const Engine = (() => {
  const world = id => WORLDS.find(w => w.id === id);

  // 3×7 و 7×3 نفس المسألة، فتُحفظ بمفتاح واحد
  const key = (a, b) => (a <= b ? `${a}x${b}` : `${b}x${a}`);

  const KEYS = {
    mul: key,
    div: (t, n) => `${t * n}/${t}`,
  };
  // من المفتاح المحفوظ إلى الزوج [الجدول، العدد]
  const PAIRS = {
    mul: k => k.split('x').map(Number),
    div: k => { const [a, t] = k.split('/').map(Number); return [t, a / t]; },
  };
  const MAKE = {
    mul: (t, n) => { const [a, b] = Math.random() < 0.5 ? [t, n] : [n, t]; return { a, b, answer: t * n }; },
    div: (t, n) => ({ a: t * n, b: t, answer: n }),
  };

  function make(w, t, n) {
    const k = KEYS[w](t, n);
    return Object.assign({ w, t, n, op: world(w).op, key: k, id: `${w}:${k}` }, MAKE[w](t, n));
  }

  const pairOf = (w, k) => PAIRS[w](k);
  const label = (w, k) => k.replace(/[x/]/, ` ${world(w).op} `);

  // تقدّم المستكشف في غابة: غابة الضرب في الملف نفسه كما كانت، وكل غابة أخرى في p.worlds
  function state(p, w = 'mul') {
    if (w === 'mul') return p;
    p.worlds = p.worlds || {};
    return p.worlds[w] || (p.worlds[w] = { facts: {}, unlocked: 1, animals: [], bestRace: 0 });
  }

  const isOpen = (p, w) => !w.soon && (!w.needs || state(p, w.needs.world).unlocked >= w.needs.regions);
  const openWorlds = p => WORLDS.filter(w => isOpen(p, w));
  // الغابة التي يلعب فيها المستكشف الآن
  const current = p => { const w = world(p.world); return w && isOpen(p, w) ? w : WORLDS[0]; };

  function fact(p, w, t, n) {
    return state(p, w).facts[KEYS[w](t, n)] || { box: 0, seen: 0, right: 0 };
  }

  function record(p, q, ok, ms) {
    const facts = state(p, q.w).facts;
    const f = facts[q.key] || (facts[q.key] = { box: 0, seen: 0, right: 0 });
    f.seen++;
    if (ok) {
      f.right++;
      // الإجابة السريعة ترفع الصندوق، والبطيئة الصحيحة تحافظ عليه
      f.box = ms <= CONFIG.fastMs ? Math.min(CONFIG.maxBox, f.box + 1) : Math.max(f.box, 1);
      if (f.box >= CONFIG.masteredBox && !f.masteredAt) f.masteredAt = Date.now();
    } else {
      f.box = Math.max(0, f.box - 2);
    }
    f.last = Date.now();
  }

  // نسبة المسائل المتقنة في جدول (من 1 إلى 12)
  function mastery(p, table, w = 'mul') {
    let mastered = 0;
    for (let n = 1; n <= 12; n++) if (fact(p, w, table, n).box >= CONFIG.masteredBox) mastered++;
    return mastered / 12;
  }

  function tablePool(table) {
    const pool = [];
    for (let n = 1; n <= 12; n++) pool.push([table, n]);
    return pool;
  }

  // السباق: كل المناطق المفتوحة، بدون 1 لأنها سهلة جداً
  function racePool(p, w = 'mul') {
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
