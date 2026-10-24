// حفظ البيانات على الجهاز نفسه (localStorage) — لا إنترنت ولا خوادم
const Store = (() => {
  const KEY = 'jungle-hero-v1';
  const state = { profiles: [], currentId: null, muted: false };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved) Object.assign(state, saved);
    } catch (e) { /* التخزين غير متاح: نكمل في الذاكرة فقط */ }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function createProfile(name, avatar) {
    const p = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name, avatar,
      coins: 0,
      items: [],     // معرّفات المعدّات المشتراة
      facts: {},     // سجل كل مسألة: { box, seen, right }
      unlocked: 1,   // عدد المناطق المفتوحة
      animals: [],   // الجداول التي اكتُشف حيوانها
      bestRace: 0,
      races: [],     // آخر نتائج السباق
      createdAt: Date.now(),
    };
    state.profiles.push(p);
    state.currentId = p.id;
    save();
    return p;
  }

  function deleteProfile(id) {
    state.profiles = state.profiles.filter(p => p.id !== id);
    if (state.currentId === id) state.currentId = null;
    save();
  }

  function select(id) { state.currentId = id; save(); }
  function current() { return state.profiles.find(p => p.id === state.currentId) || null; }

  return { state, load, save, createProfile, deleteProfile, select, current };
})();
