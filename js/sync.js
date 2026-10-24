// مزامنة التقدّم بين الأجهزة بحساب Google لولي الأمر — نفس مشروع Firebase لجدول الأبطال.
// اللعبة تعمل كاملة بدونها؛ تُحمَّل مكتبة Firebase فقط عند توفّر الإنترنت.
// البيانات في families/{uid}/apps/jungleHero كنصّ JSON واحد (Firestore لا يقبل المصفوفات المتداخلة).
const Sync = (() => {
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const FIREBASE = {
    apiKey: 'AIzaSyBny9DhGm7ySaAa9lBxw3tbHaZ7OdCAPNU',
    authDomain: 'tablehero-d582b.firebaseapp.com',
    projectId: 'tablehero-d582b',
    storageBucket: 'tablehero-d582b.firebasestorage.app',
    messagingSenderId: '1035331862918',
    appId: '1:1035331862918:web:d73e41610d2d2185a96c07',
  };

  // 'loading' | 'unavailable' | 'out' (غير مسجّل) | 'syncing' | 'offline' | 'ok' | 'error'
  let status = 'loading';
  let fb = null, user = null, ref = null, unsub = null, pushTimer = null;
  let lastSync = 0;
  let listeners = [];
  // سباق الإخوة على جهازين: مستند واحد للسباق الحالي بجانب مستند اللعبة
  let duelRef = null, duelUnsub = null, duelData = null;
  const duelListeners = [];
  const duelNotify = () => duelListeners.forEach(fn => fn(duelData));
  const notify = changed => listeners.forEach(fn => fn(changed));
  const set = s => { status = s; notify(false); };

  async function start() {
    if (!location.protocol.startsWith('http')) { set('unavailable'); return; }
    try {
      const [app, auth, fs] = await Promise.all([
        import(SDK + 'firebase-app.js'),
        import(SDK + 'firebase-auth.js'),
        import(SDK + 'firebase-firestore.js'),
      ]);
      const a = app.initializeApp(FIREBASE);
      fb = { auth, fs, authI: auth.getAuth(a), db: fs.initializeFirestore(a, { localCache: fs.persistentLocalCache() }) };
    } catch (e) {
      // بدون إنترنت: نحاول مرة أخرى عند عودة الاتصال
      set('unavailable');
      window.addEventListener('online', start, { once: true });
      return;
    }
    fb.auth.onAuthStateChanged(fb.authI, onUser);
  }

  function onUser(u) {
    if (unsub) { unsub(); unsub = null; }
    if (duelUnsub) { duelUnsub(); duelUnsub = null; }
    user = u;
    duelData = null;
    duelRef = u ? fb.fs.doc(fb.db, 'families', u.uid, 'apps', 'jungleDuel') : null;
    duelNotify();
    if (!u) { ref = null; set('out'); return; }
    duelUnsub = fb.fs.onSnapshot(duelRef, snap => {
      duelData = snap.exists() ? snap.data() : null;
      duelNotify();
    }, () => { duelData = null; duelNotify(); });
    set('syncing');
    ref = fb.fs.doc(fb.db, 'families', u.uid, 'apps', 'jungleHero');
    unsub = fb.fs.onSnapshot(ref, { includeMetadataChanges: true }, snap => {
      if (snap.metadata.hasPendingWrites) return;   // صدى ما رفعناه نحن
      let push = true, changed = false;
      if (snap.exists()) {
        try {
          const r = Store.merge(JSON.parse(snap.data().data));
          push = r.push; changed = r.changed;
        } catch (e) { /* نسخة تالفة: نستبدلها بنسخة الجهاز */ }
      }
      if (!snap.metadata.fromCache) lastSync = Date.now();
      status = snap.metadata.fromCache ? 'offline' : 'ok';
      notify(changed);
      if (push) pushNow();
    }, () => set('error'));
  }

  function pushNow() {
    clearTimeout(pushTimer);
    if (!ref) return;
    set('syncing');
    fb.fs.setDoc(ref, { data: JSON.stringify(Store.exportData()), savedAt: Date.now() })
      .then(() => { lastSync = Date.now(); set('ok'); })
      .catch(() => set('error'));
  }

  // نجمع التعديلات المتتالية أثناء اللعب في رفعة واحدة
  Store.onSave(() => {
    if (!ref) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 3000);
  });
  // قبل إغلاق الصفحة أو إخفائها نرفع ما تبقّى (Firestore يحفظه محلياً إن لم يكتمل)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pushTimer) pushNow();
  });

  function signIn() {
    const provider = new fb.auth.GoogleAuthProvider();
    return fb.auth.signInWithPopup(fb.authI, provider).catch(e => {
      if (e.code === 'auth/popup-blocked') return fb.auth.signInWithRedirect(fb.authI, provider);
      throw e;
    });
  }

  function signOut() {
    Store.state.linked = false;
    Store.save();
    return fb.auth.signOut(fb.authI);
  }

  return {
    start, signIn, signOut,
    status: () => status,
    email: () => (user && user.email) || '',
    lastSync: () => lastSync,
    // changed = true عندما وصلت بيانات جديدة من جهاز آخر
    onUpdate: fn => listeners.push(fn),
    duel: {
      ready: () => !!duelRef && (status === 'ok' || status === 'syncing'),
      data: () => duelData,
      on: fn => duelListeners.push(fn),
      set: obj => duelRef ? fb.fs.setDoc(duelRef, obj) : Promise.reject(new Error('signed out')),
      update: obj => duelRef ? fb.fs.updateDoc(duelRef, obj) : Promise.reject(new Error('signed out')),
    },
  };
})();
