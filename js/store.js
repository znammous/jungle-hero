// حفظ البيانات على الجهاز نفسه (localStorage)، مع مزامنة اختيارية بين الأجهزة (sync.js)
const Store = (() => {
  const KEY = 'jungle-hero-v1';
  // deleted: معرّفات المحذوفين ووقت الحذف، حتى لا يعودوا من جهاز آخر
  // wins: سجل الفائزين في تحديات الإخوة على هذا الجهاز (لا يُرفع للسحابة)
  const state = { profiles: [], currentId: null, muted: false, settings: {}, settingsAt: 0, deleted: {}, linked: false, wins: [] };
  // إعدادات ولي الأمر: الهدف اليومي بالدقائق، وتذكير الراحة (0 = بدون)، والرمز السري
  const DEFAULT_SETTINGS = { goalMin: 15, maxMin: 0, pin: null };

  // آخر نسخة محفوظة من كل مستكشف والإعدادات، لنعرف ما تغيّر عند الحفظ
  let lastSaved = {};
  const snap = p => JSON.stringify(Object.assign({}, p, { updatedAt: 0 }));
  let onSave = () => {};

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved) Object.assign(state, saved);
    } catch (e) { /* التخزين غير متاح: نكمل في الذاكرة فقط */ }
    // ترقية البيانات المحفوظة من الإصدارات السابقة
    state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings);
    state.deleted = state.deleted || {};
    state.wins = state.wins || [];
    state.profiles.forEach(p => {
      p.days = p.days || {};
      p.weeklyClaimed = p.weeklyClaimed || [];
      p.requests = p.requests || [];
      p.shields = p.shields || 0;
      p.shieldDays = p.shieldDays || [];
      p.updatedAt = p.updatedAt || p.createdAt || 0;
    });
    remember();
  }

  function remember() {
    lastSaved = { settings: JSON.stringify(state.settings) };
    state.profiles.forEach(p => { lastSaved[p.id] = snap(p); });
  }

  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // يختم وقت التعديل على كل ما تغيّر منذ آخر حفظ، ثم يحفظ ويُعلم المزامنة
  function save() {
    const now = Date.now();
    let changed = false;
    state.profiles.forEach(p => {
      const s = snap(p);
      if (s !== lastSaved[p.id]) { p.updatedAt = now; lastSaved[p.id] = s; changed = true; }
    });
    const s = JSON.stringify(state.settings);
    if (s !== lastSaved.settings) { state.settingsAt = now; lastSaved.settings = s; changed = true; }
    write();
    if (changed) onSave();
  }

  function createProfile(name, avatar, pin) {
    const p = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name, avatar,
      pin,           // رمز الدخول السري من 4 أرقام (يراه ولي الأمر في لوحته)
      coins: 0,
      items: [],     // معرّفات المعدّات المشتراة
      facts: {},     // سجل كل مسألة: { box, seen, right }
      unlocked: 1,   // عدد المناطق المفتوحة
      animals: [],   // الجداول التي اكتُشف حيوانها
      bestRace: 0,
      races: [],     // آخر نتائج السباق
      days: {},      // سجل كل يوم: الوقت والمحطات والأخطاء والكنز
      weeklyClaimed: [],
      requests: [],  // طلبات جوائز العائلة: { id, emoji, name, price, at, status }
      shields: 0,    // دروع السلسلة غير المستخدمة
      shieldDays: [],// الأيام التي غطّاها درع
      createdAt: Date.now(),
      updatedAt: 0,
    };
    state.profiles.push(p);
    state.currentId = p.id;
    save();
    return p;
  }

  function deleteProfile(id) {
    state.profiles = state.profiles.filter(p => p.id !== id);
    if (state.currentId === id) state.currentId = null;
    state.deleted[id] = Date.now();
    delete lastSaved[id];
    write();
    onSave();
  }

  function select(id) { state.currentId = id; write(); }
  function current() { return state.profiles.find(p => p.id === state.currentId) || null; }

  // ───── المزامنة ─────
  // ما يُرفع للسحابة: المستكشفون والإعدادات فقط (الصوت والمستكشف الحالي خاصّان بكل جهاز)
  function exportData() {
    return { profiles: state.profiles, settings: state.settings, settingsAt: state.settingsAt, deleted: state.deleted };
  }

  const progress = p => Object.values(p.facts).reduce((n, f) => n + f.seen, 0);

  // يدمج نسخة السحابة مع نسخة الجهاز: الأحدث تعديلاً يفوز لكل مستكشف.
  // يعيد { changed: تغيّر شيء هنا، push: عند هذا الجهاز ما ليس في السحابة }
  function merge(remote) {
    const now = Date.now();
    let changed = false, push = false;
    const rProfiles = remote.profiles || [];
    const rDeleted = remote.deleted || {};

    // أول ربط لهذا الجهاز: مستكشف بنفس الاسم على الجهازين يصبح واحداً، ويبقى صاحب التقدّم الأكبر
    if (!state.linked) {
      state.profiles.forEach(p => {
        if (rProfiles.some(r => r.id === p.id)) return;
        const twin = rProfiles.find(r => r.name.trim() === p.name.trim() && !(rDeleted[r.id] >= r.updatedAt));
        if (!twin) return;
        if (progress(p) > progress(twin)) { rDeleted[twin.id] = now; p.updatedAt = now; }
        else state.deleted[p.id] = now;
      });
      state.linked = true;
      changed = true;
    }

    Object.keys(rDeleted).forEach(id => {
      if (!(state.deleted[id] >= rDeleted[id])) { state.deleted[id] = rDeleted[id]; changed = true; }
    });
    Object.keys(state.deleted).forEach(id => { if (!(rDeleted[id] >= state.deleted[id])) push = true; });

    rProfiles.forEach(r => {
      const local = state.profiles.find(p => p.id === r.id);
      if (!local) { state.profiles.push(r); changed = true; }
      else if (r.updatedAt > local.updatedAt) {
        // نعدّل الكائن نفسه حتى تبقى أي إشارة إليه في اللعبة صحيحة
        Object.keys(local).forEach(k => delete local[k]);
        Object.assign(local, r);
        changed = true;
      } else if (local.updatedAt > r.updatedAt) push = true;
    });

    const before = state.profiles.length;
    state.profiles = state.profiles.filter(p => !(state.deleted[p.id] >= p.updatedAt));
    if (state.profiles.length !== before) changed = true;
    state.profiles.forEach(p => { if (!rProfiles.some(r => r.id === p.id)) push = true; });
    if (state.currentId && !current()) state.currentId = null;

    if ((remote.settingsAt || 0) > state.settingsAt) {
      state.settings = Object.assign({}, DEFAULT_SETTINGS, remote.settings);
      state.settingsAt = remote.settingsAt;
      changed = true;
    } else if (state.settingsAt > (remote.settingsAt || 0)) push = true;

    if (changed) { remember(); write(); }
    return { changed, push };
  }

  return {
    state, load, save, createProfile, deleteProfile, select, current,
    exportData, merge, onSave: fn => { onSave = fn; },
  };
})();
