// رحلة اليوم، سلسلة الأيام، وقت اللعب، الجائزة الأسبوعية، وتقرير ولي الأمر
const Journey = (() => {
  const pad = n => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const weekStart = (d = new Date()) => addDays(d, -d.getDay());   // الأسبوع يبدأ يوم الأحد
  const weekKey = d => dayKey(weekStart(d));
  const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const STATIONS = [
    { id: 'warmup', icon: '🏕️', name: 'الإحماء' },
    { id: 'race',   icon: '🏃', name: 'سباق النهر' },
    { id: 'review', icon: '📝', name: 'المراجعة' },
  ];

  function today(p) {
    const k = dayKey();
    return p.days[k] || (p.days[k] = { secs: 0, right: 0, asked: 0, done: {}, mistakes: [], chest: false });
  }

  const isDone = (p, d) => { const x = p.days[dayKey(d)]; return !!(x && x.chest); };

  function addAnswer(p, q, ok, ms) {
    const t = today(p);
    t.secs += Math.min(ms, CONFIG.idleCapMs) / 1000;
    t.asked++;
    if (ok) t.right++;
    else if (!t.mistakes.some(([a, b]) => Engine.key(a, b) === q.key)) t.mistakes.push([q.a, q.b]);
  }

  function clearMistake(p, q) {
    const t = today(p);
    t.mistakes = t.mistakes.filter(([a, b]) => Engine.key(a, b) !== q.key);
  }

  const minutesToday = p => Math.floor(((p.days[dayKey()] || {}).secs || 0) / 60);
  const nextStation = p => STATIONS.find(s => !today(p).done[s.id]) || null;
  const chestReady = p => { const t = today(p); return STATIONS.every(s => t.done[s.id]) && !t.chest; };

  // يعيد true إذا أُنجزت المحطة الآن لأول مرة اليوم
  function complete(p, id) {
    const t = today(p);
    if (t.done[id]) return false;
    t.done[id] = true;
    return true;
  }

  function pickRare(p) {
    const left = RARE_ITEMS.filter(i => !p.items.includes(i.id));
    return left.length ? left[Math.floor(Math.random() * left.length)] : null;
  }

  function openChest(p) {
    const t = today(p);
    if (!chestReady(p)) return null;
    t.chest = true;
    const reward = { coins: COINS.chestMin + Math.floor(Math.random() * (COINS.chestMax - COINS.chestMin + 1)), item: null };
    if (Math.random() < CONFIG.chestRareChance) reward.item = pickRare(p);
    p.coins += reward.coins;
    if (reward.item) p.items.push(reward.item.id);
    return reward;
  }

  // الأيام المتتالية التي اكتملت فيها رحلة اليوم، مع يوم راحة واحد مسموح في كل أسبوع،
  // والأيام التي غطّاها درع. breakAt = اليوم الذي انقطعت عنده السلسلة (إن وُجد)
  function walk(p, extraCovered = []) {
    const doneKeys = Object.keys(p.days).filter(k => p.days[k].chest).sort();
    const now = new Date();
    if (!doneKeys.length) return { count: 0, restUsed: false, breakAt: null };
    const covered = new Set((p.shieldDays || []).concat(extraCovered));
    const rests = new Set();
    let count = isDone(p, now) ? 1 : 0;   // اليوم الحالي لا يكسر السلسلة قبل أن ينتهي
    for (let d = addDays(now, -1); dayKey(d) >= doneKeys[0]; d = addDays(d, -1)) {
      const k = dayKey(d);
      if (isDone(p, d)) count++;
      else if (covered.has(k)) continue;
      else if (!rests.has(weekKey(d))) rests.add(weekKey(d));
      else return { count, restUsed: rests.has(weekKey(now)), breakAt: k };
    }
    return { count, restUsed: rests.has(weekKey(now)), breakAt: null };
  }

  const streak = p => walk(p);

  // يستخدم الدروع تلقائياً لسدّ انقطاع حديث (آخر 7 أيام)،
  // ولا يستخدم أي درع إن كانت الدروع لا تكفي لسدّ الفجوة كلها. يعيد عدد الدروع المستخدمة
  function applyShields(p) {
    const recent = dayKey(addDays(new Date(), -7));
    const plan = [];
    for (;;) {
      const w = walk(p, plan);
      if (!w.breakAt || w.breakAt < recent) break;
      if (plan.length >= (p.shields || 0)) return 0;
      plan.push(w.breakAt);
    }
    if (!plan.length) return 0;
    p.shieldDays = (p.shieldDays || []).concat(plan);
    p.shields -= plan.length;
    return plan.length;
  }

  // أيام أسبوع (0 = هذا الأسبوع، -1 = الماضي...)
  function week(p, offset = 0) {
    const start = addDays(weekStart(), offset * 7);
    const todayK = dayKey();
    return DAY_NAMES.map((name, i) => {
      const k = dayKey(addDays(start, i));
      const x = p.days[k];
      return {
        key: k, name,
        isToday: k === todayK,
        future: k > todayK,
        state: x && x.chest ? 'done' : x && x.asked ? 'played' : 'none',
        mins: x ? Math.round(x.secs / 60) : 0,
      };
    });
  }

  function weekStatus(p) {
    const days = week(p);
    const done = days.filter(d => d.state === 'done').length;
    const claimed = p.weeklyClaimed.includes(weekKey(new Date()));
    return { days, done, claimed, ready: done >= CONFIG.weeklyGoal && !claimed };
  }

  function claimWeek(p) {
    if (!weekStatus(p).ready) return null;
    p.weeklyClaimed.push(weekKey(new Date()));
    const item = pickRare(p);
    const reward = { coins: item ? COINS.weekly : COINS.weekly * 2, item };
    p.coins += reward.coins;
    if (item) p.items.push(item.id);
    return reward;
  }

  // دقائق آخر n يوم (الأقدم أولاً)
  function recentDays(p, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const x = p.days[dayKey(d)];
      out.push({ name: DAY_NAMES[d.getDay()], mins: x ? Math.round(x.secs / 60) : 0 });
    }
    return out;
  }

  function weekReport(p) {
    const startMs = weekStart().getTime();
    const lastMs = addDays(weekStart(), -7).getTime();
    const days = week(p);
    const avg = list => list.length ? Math.round(list.reduce((s, r) => s + r.score, 0) / list.length) : null;
    const facts = Object.entries(p.facts);
    return {
      daysPlayed: days.filter(d => d.state !== 'none').length,
      minutes: days.reduce((s, d) => s + d.mins, 0),
      newMastered: facts.filter(([, f]) => f.masteredAt >= startMs).length,
      mastered: facts.filter(([, f]) => f.box >= CONFIG.masteredBox).length,
      raceThis: avg(p.races.filter(r => r.at >= startMs)),
      raceLast: avg(p.races.filter(r => r.at >= lastMs && r.at < startMs)),
      hardest: facts
        .filter(([, f]) => f.seen >= 3 && f.box < CONFIG.masteredBox)
        .sort((x, y) => x[1].right / x[1].seen - y[1].right / y[1].seen)
        .slice(0, 3)
        .map(([k, f]) => ({ text: k.replace('x', ' × '), right: f.right, seen: f.seen })),
    };
  }

  return {
    STATIONS, dayKey, today, addAnswer, clearMistake, minutesToday, nextStation, chestReady, complete,
    openChest, streak, applyShields, week, weekStatus, claimWeek, recentDays, weekReport,
  };
})();
