// عالم فلفولة: غابة نهارية مشمسة مع الفيلة الصغيرة «فلفولة». لكل مستكشف عالمه (p.look)، والافتراضي عالم فلفولة.
// لا تتغير المسائل ولا المعرّفات، فيبقى التقدّم المحفوظ كما هو؛ تتغير الأسماء والرموز المعروضة فقط.
const World = (() => {
  const FALFOULA = 'falfoula', CLASSIC = 'classic';
  const lookOf = p => (p && p.look === CLASSIC ? CLASSIC : FALFOULA);
  const isFalfoula = () => lookOf(Store.current()) === FALFOULA;

  // تُقرأ الخاصية حسب عالم المستكشف الحالي، فتبقى شاشات اللعبة كما هي
  function dress(obj, falfoula) {
    Object.keys(falfoula).forEach(k => {
      const plain = obj[k];
      Object.defineProperty(obj, k, { enumerable: true, configurable: true, get: () => (isFalfoula() ? falfoula[k] : plain) });
    });
  }
  const dressBy = (list, key, map) => list.forEach(x => { if (map[x[key]]) dress(x, map[x[key]]); });

  dressBy(WORLDS, 'id', {
    add: { name: 'مرج الجمع والطرح' },
    mul: { name: 'بستان الضرب' },
    div: { name: 'واحة القسمة' },
    frac: { name: 'شاطئ الكسور' },
    neg: { name: 'جبال السالب والموجب' },
  });
  dressBy(ADD_REGIONS, 'table', {
    1: { name: 'مرج فلفولة' },
    6: { name: 'بيت القندس', icon: '🏡' },
    10: { name: 'وادي الغروب' },
    11: { name: 'بيت الأسد', icon: '🏡' },
  });
  dressBy(REGIONS, 'table', {
    2: { name: 'شاطئ الرمل الذهبي' },
    5: { name: 'شلال قوس قزح', icon: '🌈' },
    9: { name: 'تلة الشروق', icon: '🌄' },
    7: { name: 'كهف اليراعات', icon: '✨', animal: { emoji: '🦝', name: 'الراكون' } },
    8: { name: 'بركة القصب', icon: '🪷', animal: { emoji: '🦚', name: 'الطاووس' } },
    12: { name: 'قلب الغابة', icon: '🌳', animal: { emoji: '🐯', name: 'النمر الصغير' } },
  });
  dressBy(DIV_REGIONS, 'table', {
    6: { name: 'بيت الفيلة', icon: '🏡' },
    9: { name: 'حديقة الصبّار', animal: { emoji: '🦗', name: 'الجندب' } },
    7: { name: 'غابة الندى', icon: '🌦️' },
    12: { name: 'جبل الغيوم', icon: '⛅' },
  });
  dressBy(FRAC_REGIONS, 'table', {
    8: { name: 'موج البحر', icon: '🌊' },
    9: { name: 'سفينة الرحّالة', icon: '⛵', animal: { emoji: '🐳', name: 'الحوت الصغير' } },
    11: { name: 'حديقة المرجان', icon: '🪸' },
  });
  dressBy(NEG_REGIONS, 'table', {
    3: { animal: { emoji: '🦊', name: 'الثعلب' } },
    6: { name: 'كهف الثلج', icon: '🧊', animal: { emoji: '🐹', name: 'الهامستر' } },
    9: { name: 'شلال الثلج', icon: '🌨️' },
    10: { name: 'تلة الطائرات الورقية', icon: '🪁', animal: { emoji: '🦤', name: 'طائر الدودو' } },
    11: { name: 'قمة الشتاء', icon: '🏔️' },
  });
  dressBy(ITEMS, 'id', {
    hat: { name: 'قبعة فلفولة' },
    bag: { name: 'حقيبة فلفولة' },
    map: { name: 'خريطة فلفولة' },
    lantern: { name: 'فانوس فلفولة' },
    hut: { name: 'بيت فلفولة' },
  });
  [
    { emoji: '🌱', name: 'برعم الغابة' },
    { emoji: '👣', name: 'متتبّع خطوات فلفولة' },
    { emoji: '🎒', name: 'رفيق الرحلة' },
    { emoji: '🧭', name: 'قائد الرحلة' },
    { emoji: '⛺', name: 'نجم المخيّم' },
    { emoji: '🌈', name: 'نجم الغابة' },
    { emoji: '🏆', name: 'بطل الغابة' },
    { emoji: '👑', name: 'أسطورة الغابة' },
  ].forEach((r, i) => dress(RANKS[i], r));

  // ───── الفيلة الصغيرة فلفولة: رسم أصلي يعمل بدون إنترنت ─────
  const SKIN = '#b5cde6', EDGE = '#55779b', DARK = '#26425e';
  const EYES = {
    happy: `<circle cx="44" cy="70" r="6.5" fill="${DARK}"/><circle cx="76" cy="70" r="6.5" fill="${DARK}"/><circle cx="46.2" cy="67.6" r="2.3" fill="#fff"/><circle cx="78.2" cy="67.6" r="2.3" fill="#fff"/>`,
    cheer: `<path d="M37 72q7-10 14 0M69 72q7-10 14 0" fill="none" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>`,
    oops: `<circle cx="44" cy="71" r="5" fill="${DARK}"/><circle cx="76" cy="71" r="5" fill="${DARK}"/><circle cx="45.6" cy="69.4" r="1.7" fill="#fff"/><circle cx="77.6" cy="69.4" r="1.7" fill="#fff"/><path d="M36 61l11-3M84 61l-11-3" stroke="${EDGE}" stroke-width="3" stroke-linecap="round"/>`,
  };
  // الخرطوم يتغيّر مع المزاج: يلتف ممسكاً بطاقة الضرب، أو يرتفع فرحاً، أو يتدلى
  const TRUNK = {
    happy: 'M60 78C60 100 63 113 77 113C88 113 93 105 92 97',
    cheer: 'M60 78C60 96 70 102 82 96C94 90 99 76 96 62',
    oops: 'M60 78C60 96 58 108 50 116',
  };
  const CARD = {
    happy: [92, 88], cheer: [96, 52], oops: null,
  };
  const MOUTH = {
    happy: `<path d="M38 88q5 7 12 6" fill="none" stroke="${DARK}" stroke-width="2.6" stroke-linecap="round"/>`,
    cheer: `<path d="M34 86q6 16 19 11q-1-11-19-11z" fill="#c75b6e" stroke="${DARK}" stroke-width="2" stroke-linejoin="round"/>`,
    oops: `<path d="M72 93q5-5 10 0" fill="none" stroke="${DARK}" stroke-width="2.6" stroke-linecap="round"/>`,
  };
  const mult = c => (c ? `<g transform="translate(${c[0]} ${c[1]}) rotate(8)">
      <rect x="-12" y="-12" width="24" height="24" rx="6" fill="#ffcb3d" stroke="#b8791a" stroke-width="2.4"/>
      <path d="M-5-5L5 5M5-5L-5 5" stroke="#7a4a0c" stroke-width="3.6" stroke-linecap="round"/>
    </g>` : '');
  const svg = (mood = 'happy') => {
    const m = TRUNK[mood] ? mood : 'happy';
    return `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg">
    <g stroke="${EDGE}" stroke-width="3">
      <ellipse cx="22" cy="66" rx="21" ry="28" fill="${SKIN}" transform="rotate(-10 22 66)"/>
      <ellipse cx="98" cy="66" rx="21" ry="28" fill="${SKIN}" transform="rotate(10 98 66)"/>
    </g>
    <ellipse cx="23" cy="67" rx="12" ry="18" fill="#ffc9d6" transform="rotate(-10 23 67)"/>
    <ellipse cx="97" cy="67" rx="12" ry="18" fill="#ffc9d6" transform="rotate(10 97 67)"/>
    <ellipse cx="60" cy="126" rx="29" ry="21" fill="${SKIN}" stroke="${EDGE}" stroke-width="3"/>
    <g fill="${SKIN}" stroke="${EDGE}" stroke-width="3"><rect x="34" y="130" width="20" height="17" rx="8"/><rect x="66" y="130" width="20" height="17" rx="8"/></g>
    <g fill="#f4fbff"><circle cx="39" cy="143" r="2"/><circle cx="44" cy="144" r="2"/><circle cx="49" cy="143" r="2"/><circle cx="71" cy="143" r="2"/><circle cx="76" cy="144" r="2"/><circle cx="81" cy="143" r="2"/></g>
    <ellipse cx="60" cy="72" rx="37" ry="34" fill="${SKIN}" stroke="${EDGE}" stroke-width="3"/>
    <path d="M31 101q29 14 58 0l2 9q-31 15-62 0z" fill="#3fae5f" stroke="#237a3f" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M38 110l-5 17 12-5 3-10z" fill="#3fae5f" stroke="#237a3f" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M26 44q34-11 68 0l6 7q-40-10-80 0z" fill="#f5d58b" stroke="#a97f33" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M33 42c0-20 11-31 27-31s27 11 27 31q-27-8-54 0z" fill="#f5d58b" stroke="#a97f33" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M33 42q27-8 54 0l-1-8q-26-8-52 0z" fill="#3fae5f" stroke="#237a3f" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="30" cy="84" rx="7" ry="4.6" fill="#ffb3c4" opacity=".85"/><ellipse cx="90" cy="84" rx="7" ry="4.6" fill="#ffb3c4" opacity=".85"/>
    ${EYES[m]}
    ${MOUTH[m]}
    <path d="${TRUNK[m]}" fill="none" stroke="${EDGE}" stroke-width="19" stroke-linecap="round"/>
    <path d="${TRUNK[m]}" fill="none" stroke="${SKIN}" stroke-width="13.5" stroke-linecap="round"/>
    ${mult(CARD[m])}
  </svg>`;
  };
  const falfoula = (mood, cls = '') => `<span class="falfoula ${cls}" aria-hidden="true">${svg(mood)}</span>`;

  const TIPS = [
    'هيا نحلّ مسائل جديدة اليوم!',
    'كل إجابة صحيحة تجعلني أرفع خرطومي فرحاً!',
    'الخطأ صديق التعلّم، فلنحاول مرة أخرى.',
    'ذاكرة الفيلة قوية، وبالتدريب تقوى ذاكرتك أيضاً.',
    'خطوة صغيرة كل يوم تصنع بطلاً كبيراً.',
  ];
  const STREAK_TIP = n => `${n} أيام متتالية! أنا فخورة بك جداً.`;

  function paint() {
    const on = isFalfoula();
    document.documentElement.dataset.theme = on ? FALFOULA : CLASSIC;
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = on ? '#cfeeff' : '#1f5130';
  }

  let reactTimer;
  // تتفاعل فلفولة مع إجابة الطفل ثم تعود لابتسامتها
  function react(ok) {
    const b = document.getElementById('buddy');
    if (!b) return;
    clearTimeout(reactTimer);
    b.innerHTML = falfoula(ok ? 'cheer' : 'oops', ok ? 'hop' : 'sway');
    reactTimer = setTimeout(() => { const x = document.getElementById('buddy'); if (x) x.innerHTML = falfoula('happy'); }, 1200);
  }

  // شمس وسحب وتلال خضراء فوق الخلفية الموجودة
  const addScenery = () => {
    let h = '<span class="sun-disc"></span><span class="hill far"></span><span class="hill near"></span>';
    [[8, 150, -4, 46], [24, 100, -24, 62], [42, 170, -12, 54]].forEach(c => {
      h += `<span class="cloud" style="top:${c[0]}%;--w:${c[1]}px;animation-delay:${c[2]}s;animation-duration:${c[3]}s"></span>`;
    });
    document.getElementById('bg').insertAdjacentHTML('afterbegin', h);
  };
  addScenery();
  paint();

  return {
    FALFOULA, CLASSIC, lookOf, isFalfoula, paint, react, falfoula,
    // صورة فلفولة للرسم على canvas؛ ترجع null إن تعذّر تحميلها فتُرسم البطاقة بدونها
    falfoulaImage: mood => new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(mood).replace('<svg ', '<svg width="480" height="600" '));
    }),
    preview(look) { document.documentElement.dataset.theme = look; },
    logo: plain => (isFalfoula() ? falfoula('cheer', 'logo-falfoula') : plain),
    // جملة تشجيع ثابتة طوال اليوم حتى لا تتبدل عند إعادة رسم الشاشة
    greeting(streak) {
      if (!isFalfoula()) return '';
      const tip = streak >= 3 ? STREAK_TIP(streak) : TIPS[new Date().getDate() % TIPS.length];
      return `<div class="falfoula-talk">${falfoula('happy', 'talk-falfoula')}<p><b>فلفولة:</b> ${tip}</p></div>`;
    },
    buddy: () => (isFalfoula() ? `<div class="buddy" id="buddy">${falfoula('happy')}</div>` : ''),
    resultFace(plain, good) { return isFalfoula() ? falfoula(good ? 'cheer' : 'happy', 'result-falfoula') : plain; },
    lookPicker(look) {
      const opt = (v, ic, t, d) => `<button type="button" class="look-opt ${look === v ? 'selected' : ''}" data-act="pickLook" data-arg="${v}"><span>${ic}</span><b>${t}</b><small>${d}</small></button>`;
      return `<p class="label">اختر عالمك</p><div class="look-pick">
        ${opt(FALFOULA, falfoula('happy', 'look-falfoula'), 'عالم فلفولة', 'غابة مشمسة وفيلة صغيرة لطيفة')}
        ${opt(CLASSIC, '🧭', 'عالم المستكشفين', 'غابة داكنة ومغامرة')}
      </div>`;
    },
  };
})();
