// مزامنة التقدّم بين الأجهزة بحساب Google لولي الأمر — نفس مشروع Firebase لجدول الأبطال.
// اللعبة تعمل كاملة بدونها؛ تُحمَّل مكتبة Firebase فقط عند توفّر الإنترنت.
// البيانات في families/{uid}/apps/jungleHero كنصّ JSON واحد (Firestore لا يقبل المصفوفات المتداخلة).
// أجهزة الأطفال تنضم برمز يُنشئه ولي الأمر: تدخل بحساب مجهول وتُسجَّل في families/{uid}/members/{معرّفها}.
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
  let fid = null, joining = false, memberUnsub = null, devicesUnsub = null, devices = [];
  const FID_KEY = 'jungle-hero-family';
  const savedFid = () => { try { return localStorage.getItem(FID_KEY); } catch (e) { return null; } };
  const saveFid = v => { try { v ? localStorage.setItem(FID_KEY, v) : localStorage.removeItem(FID_KEY); } catch (e) {} };
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
      // للتجربة على هذا الجهاز فقط: localhost/?emulator يستخدم محاكيات Firebase بدل المشروع الحقيقي
      if (location.hostname === 'localhost' && /[?&]emulator\b/.test(location.search)) {
        auth.connectAuthEmulator(fb.authI, 'http://localhost:9099', { disableWarnings: true });
        fs.connectFirestoreEmulator(fb.db, 'localhost', 8085);
      }
    } catch (e) {
      // بدون إنترنت: نحاول مرة أخرى عند عودة الاتصال
      set('unavailable');
      window.addEventListener('online', start, { once: true });
      return;
    }
    fb.auth.onAuthStateChanged(fb.authI, onUser);
  }

  function onUser(u) {
    // أثناء الانضمام يصل الحساب المجهول قبل أن نعرف العائلة، فننتظر join
    if (joining && u && u.isAnonymous && !savedFid()) { user = u; return; }
    if (unsub) { unsub(); unsub = null; }
    if (duelUnsub) { duelUnsub(); duelUnsub = null; }
    if (memberUnsub) { memberUnsub(); memberUnsub = null; }
    if (devicesUnsub) { devicesUnsub(); devicesUnsub = null; }
    devices = [];
    user = u;
    // ولي الأمر عائلته حسابه، وجهاز الطفل يعرف عائلته من رمز الانضمام
    fid = !u ? null : u.isAnonymous ? savedFid() : u.uid;
    duelData = null;
    duelRef = fid ? fb.fs.doc(fb.db, 'families', fid, 'apps', 'jungleDuel') : null;
    duelNotify();
    if (!fid) { ref = null; set('out'); return; }
    if (u.isAnonymous) {
      // إذا فصل ولي الأمر هذا الجهاز نخرج منه ويبقى التقدّم محفوظاً عليه
      memberUnsub = fb.fs.onSnapshot(fb.fs.doc(fb.db, 'families', fid, 'members', u.uid), snap => {
        if (!snap.exists() && !snap.metadata.fromCache) leave();
      }, () => {});
    } else {
      devicesUnsub = fb.fs.onSnapshot(fb.fs.collection(fb.db, 'families', fid, 'members'), snap => {
        devices = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.at - b.at);
        notify(false);
      }, () => {});
    }
    duelUnsub = fb.fs.onSnapshot(duelRef, snap => {
      duelData = snap.exists() ? snap.data() : null;
      duelNotify();
    }, () => { duelData = null; duelNotify(); });
    set('syncing');
    ref = fb.fs.doc(fb.db, 'families', fid, 'apps', 'jungleHero');
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
    // جهاز الطفل يحذف نفسه من أجهزة العائلة قبل الخروج
    if (user && user.isAnonymous && fid) {
      return fb.fs.deleteDoc(fb.fs.doc(fb.db, 'families', fid, 'members', user.uid)).catch(() => {}).then(leave);
    }
    return leave();
  }

  function leave() {
    Store.state.linked = false;
    Store.save();
    saveFid(null);
    return fb.auth.signOut(fb.authI);
  }

  // رمز من 8 أحرف بلا الأحرف المتشابهة (0/O و1/I/L)، صالح لعشر دقائق
  const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const CODE_MS = 10 * 60 * 1000;
  // يعيد الرمز فوراً ليُعرض، و ready يكتمل عندما يحفظه الخادم (أو يفشل بعد 15 ثانية بلا اتصال)
  function createCode(kid) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const code = Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
    const exp = Date.now() + CODE_MS;
    const ready = Promise.race([
      fb.fs.setDoc(fb.fs.doc(fb.db, 'pairCodes', code), { fid, kid: kid || '', exp: fb.fs.Timestamp.fromMillis(exp) }),
      new Promise((_, fail) => setTimeout(() => fail(new Error('timeout')), 15000)),
    ]);
    return { code, exp, ready };
  }

  // ينضم هذا الجهاز إلى عائلة ولي الأمر، ويعيد معرّف الطفل صاحب الجهاز (أو '' لجهاز مشترك)
  async function join(raw, name) {
    const code = String(raw).toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (code.length !== 8) throw new Error('bad-code');
    if (!fb) throw new Error('unavailable');
    if (user && !user.isAnonymous) throw new Error('signed-in');
    joining = true;
    try {
      const cred = user || (await fb.auth.signInAnonymously(fb.authI)).user;
      // getDoc من الخادم: رمز غير موجود يُرفض بدل أن يُقرأ من الكاش
      const snap = await fb.fs.getDocFromServer(fb.fs.doc(fb.db, 'pairCodes', code)).catch(e => {
        throw new Error(e.code === 'permission-denied' ? 'expired' : 'network');
      });
      if (!snap.exists() || snap.data().exp.toMillis() < Date.now()) throw new Error('expired');
      const c = snap.data();
      await fb.fs.setDoc(fb.fs.doc(fb.db, 'families', c.fid, 'members', cred.uid),
        { code, kid: c.kid || '', name: String(name || '').slice(0, 40), at: Date.now() });
      saveFid(c.fid);
      joining = false;
      onUser(cred);
      return c.kid || '';
    } finally { joining = false; }
  }

  const removeDevice = id => fb.fs.deleteDoc(fb.fs.doc(fb.db, 'families', fid, 'members', id));

  return {
    start, signIn, signOut, createCode, join, removeDevice,
    status: () => status,
    email: () => (user && user.email) || '',
    // 'parent' حساب Google | 'device' جهاز انضم برمز | '' غير مسجّل
    role: () => !fid ? '' : user.isAnonymous ? 'device' : 'parent',
    devices: () => devices,
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
