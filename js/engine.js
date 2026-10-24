// منطق التعلّم: اختيار الأسئلة حسب نقاط الضعف (نظام صناديق Leitner) وحساب الإتقان
const Engine = (() => {
  // 3×7 و 7×3 نفس المسألة، فتُحفظ بمفتاح واحد
  const key = (a, b) => (a <= b ? `${a}x${b}` : `${b}x${a}`);

  function fact(p, a, b) {
    return p.facts[key(a, b)] || { box: 0, seen: 0, right: 0 };
  }

  function record(p, a, b, ok, ms) {
    const k = key(a, b);
    const f = p.facts[k] || (p.facts[k] = { box: 0, seen: 0, right: 0 });
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

  // نسبة المسائل المتقنة في جدول (من ×1 إلى ×12)
  function mastery(p, table) {
    let mastered = 0;
    for (let n = 1; n <= 12; n++) if (fact(p, table, n).box >= CONFIG.masteredBox) mastered++;
    return mastered / 12;
  }

  function tablePool(table) {
    const pool = [];
    for (let n = 1; n <= 12; n++) pool.push([table, n]);
    return pool;
  }

  // السباق: كل المناطق المفتوحة، بدون ×1 لأنها سهلة جداً
  function racePool(p) {
    const seen = new Set();
    const pool = [];
    REGIONS.slice(0, p.unlocked).forEach(r => {
      for (let n = 2; n <= 12; n++) {
        const k = key(r.table, n);
        if (!seen.has(k)) { seen.add(k); pool.push([r.table, n]); }
      }
    });
    return pool;
  }

  // المسائل الأضعف والجديدة تظهر أكثر
  function pick(p, pool, prevKey) {
    const options = pool.length > 1 ? pool.filter(([a, b]) => key(a, b) !== prevKey) : pool;
    const weights = options.map(([a, b]) => {
      const f = fact(p, a, b);
      return (CONFIG.maxBox + 1 - f.box) ** 2 + (f.seen === 0 ? 4 : 0);
    });
    let r = Math.random() * weights.reduce((s, w) => s + w, 0);
    let i = 0;
    while (r > weights[i] && i < options.length - 1) r -= weights[i++];
    let [a, b] = options[i];
    if (Math.random() < 0.5) [a, b] = [b, a];
    return { a, b, answer: a * b, key: key(a, b) };
  }

  function rankFor(score) {
    return RANKS.filter(r => score >= r.min).pop();
  }

  // هدف السباق (الضفة الأخرى) = الرتبة التالية، فيبقى الهدف قريباً ويكبر مع المستكشف
  function raceGoal(best) {
    return (RANKS.find(r => r.min > best) || RANKS[RANKS.length - 1]).min;
  }

  // بعد كل جولة: فتح مناطق جديدة واكتشاف الحيوانات (مع مكافآت)
  function progress(p) {
    const events = [];
    while (p.unlocked < REGIONS.length &&
           mastery(p, REGIONS[p.unlocked - 1].table) >= CONFIG.unlockAt) {
      events.push({ type: 'unlock', region: REGIONS[p.unlocked] });
      p.unlocked++;
      p.coins += COINS.unlock;
    }
    REGIONS.slice(0, p.unlocked).forEach(r => {
      if (!p.animals.includes(r.table) && mastery(p, r.table) >= 1) {
        p.animals.push(r.table);
        p.coins += COINS.animal;
        events.push({ type: 'animal', region: r });
      }
    });
    return events;
  }

  return { key, fact, record, mastery, tablePool, racePool, pick, rankFor, raceGoal, progress };
})();
