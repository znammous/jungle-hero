// غابة الكسور: توليد المسائل ورسمها.
// كل مسألة نص قصير يُحفظ في سجل الأخطاء ويُعاد بناؤها منه، مثل 'add:2/7:3/7' أو 'name:3/4:pie'
const Fractions = (() => {
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const any = list => list[rnd(0, list.length - 1)];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const shuffle = list => list.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

  // كسر بسطه فوق مقامه
  const fr = (n, d) => `<span class="fr"><b>${n}</b><b>${d}</b></span>`;
  const slot = '<span id="answer" class="answer">&nbsp;</span>';
  const prompt = text => `<span class="q-prompt" dir="rtl">${text}</span>`;
  const op = s => `<span class="op">${s}</span>`;

  // دائرة أو شريط مقسوم إلى d أجزاء، أول k منها ملوّنة
  function shape(kind, k, d) {
    let parts = '';
    if (kind === 'bar') {
      for (let i = 0; i < d; i++) parts += `<rect class="${i < k ? 'on' : 'off'}" x="${2 + i * 96 / d}" y="2" width="${96 / d}" height="36"/>`;
      return `<svg class="shape strip" viewBox="0 0 100 40">${parts}</svg>`;
    }
    const pt = i => {
      const a = (i / d) * 2 * Math.PI - Math.PI / 2;
      return `${(50 + 46 * Math.cos(a)).toFixed(2)} ${(50 + 46 * Math.sin(a)).toFixed(2)}`;
    };
    for (let i = 0; i < d; i++) parts += `<path class="${i < k ? 'on' : 'off'}" d="M50 50 L${pt(i)} A46 46 0 0 1 ${pt(i + 1)}Z"/>`;
    return `<svg class="shape" viewBox="0 0 100 100">${parts}</svg>`;
  }

  const split = s => s.split('/').map(Number);
  const SIGNS = { lt: '<', eq: '=', gt: '>' };
  const cmpOf = (a, b, c, d) => (a * d < c * b ? 'lt' : a * d > c * b ? 'gt' : 'eq');

  // مولّد لكل منطقة (رقمها = table في FRAC_REGIONS)
  const GEN = {
    1: () => { const d = rnd(2, 4); return `name:${rnd(1, d - 1)}/${d}:${any(['pie', 'bar'])}`; },
    2: () => { const d = any([3, 4, 5, 6, 8]); return `name:${rnd(1, d - 1)}/${d}:${any(['pie', 'bar'])}`; },
    3: () => { const d = rnd(2, 5); return `of:1/${d}:${d * rnd(2, 5)}`; },
    4: () => { const d = rnd(4, 10), a = rnd(1, d - 1); return `cmp:${a}/${d}:${Math.random() < 0.15 ? a : rnd(1, d - 1)}/${d}`; },
    5: () => {
      const k = rnd(1, 3), d = rnd(k + 1, 10);
      let e = rnd(k + 1, 10);
      if (e === d && Math.random() < 0.8) e = d === 10 ? k + 1 : d + 1;
      return `cmp:${k}/${d}:${k}/${e}`;
    },
    6: () => { const b = rnd(2, 5); let a = rnd(1, b - 1); if (gcd(a, b) > 1) a = 1; return `eq:${a}/${b}:${b * rnd(2, 4)}`; },
    7: () => { const d = rnd(3, 10), a = rnd(1, d - 2); return `add:${a}/${d}:${rnd(1, d - a)}/${d}`; },
    8: () => { const d = rnd(3, 10), a = rnd(2, d); return `sub:${a}/${d}:${rnd(1, a - 1)}/${d}`; },
    9: () => { const d = rnd(2, 6); let k = rnd(1, d - 1); if (gcd(k, d) > 1) k = 1; const m = rnd(2, 4); return `simp:${k * m}/${d * m}`; },
    10: () => {
      const b = rnd(2, 5), D = b * rnd(2, 3);
      const x = `${rnd(1, b - 1)}/${b}`, y = `${rnd(1, D - 1)}/${D}`;
      return Math.random() < 0.5 ? `cmp:${x}:${y}` : `cmp:${y}:${x}`;
    },
    // خليط: كل المهارات السابقة، وكسر من عدد ببسط أكبر من 1
    11: () => {
      if (Math.random() < 0.15) { const d = rnd(3, 5); return `of:${rnd(2, d - 1)}/${d}:${d * rnd(2, 4)}`; }
      return GEN[rnd(3, 10)]();
    },
  };

  // أجوبة خاطئة قريبة لسؤال «ما الكسر الملوّن؟»، لا تساوي الجواب الصحيح في القيمة
  function nameChoices(k, d) {
    const out = [[k, d]];
    [[d - k, d], [k, d + 1], [1, d], [k, d - 1], [k + 1, d], [d, k]].forEach(([a, b]) => {
      if (out.length < 3 && a > 0 && b > 1 && !out.some(([x, y]) => x * b === a * y)) out.push([a, b]);
    });
    return shuffle(out).map(([a, b]) => ({ v: `${a}/${b}`, html: fr(a, b) }));
  }

  // يبني المسألة من نصها: html للعرض، text و solved للقوائم، answer، و choices إن كانت اختياراً
  function make(n) {
    const [type, x, y] = n.split(':');
    if (type === 'name') {
      const [k, d] = split(x);
      return {
        html: prompt('ما الكسر الملوّن؟') + shape(y, k, d),
        text: shape(y, k, d), solved: `${shape(y, k, d)} = ${fr(k, d)}`,
        answer: x, choices: nameChoices(k, d),
      };
    }
    if (type === 'of') {
      const [k, d] = split(x), N = Number(y), ans = (k * N) / d;
      return {
        html: prompt(`كم يساوي ${fr(k, d)} من ${N}؟`) + op('=') + slot,
        text: `${fr(k, d)} × ${N}`, solved: `${fr(k, d)} × ${N} = ${ans}`, answer: ans,
      };
    }
    if (type === 'cmp') {
      const [a, b] = split(x), [c, d] = split(y), ans = cmpOf(a, b, c, d);
      return {
        html: prompt('اختر الإشارة الصحيحة') + fr(a, b) + op('?') + fr(c, d),
        text: `${fr(a, b)} ? ${fr(c, d)}`, solved: `${fr(a, b)} ${SIGNS[ans]} ${fr(c, d)}`,
        answer: ans, choices: ['lt', 'eq', 'gt'].map(v => ({ v, html: SIGNS[v] })),
      };
    }
    if (type === 'eq') {
      const [a, b] = split(x), D = Number(y), ans = (a * D) / b;
      return {
        html: fr(a, b) + op('=') + fr(slot, D),
        text: `${fr(a, b)} = ${fr('?', D)}`, solved: `${fr(a, b)} = ${fr(ans, D)}`, answer: ans,
      };
    }
    if (type === 'add' || type === 'sub') {
      const [a, d] = split(x), [b] = split(y), sign = type === 'add' ? '+' : '−';
      const ans = type === 'add' ? a + b : a - b;
      return {
        html: fr(a, d) + op(sign) + fr(b, d) + op('=') + fr(slot, d),
        text: `${fr(a, d)} ${sign} ${fr(b, d)}`, solved: `${fr(a, d)} ${sign} ${fr(b, d)} = ${fr(ans, d)}`, answer: ans,
      };
    }
    // simp: تبسيط الكسر إلى أبسط صورة
    const [a, b] = split(x), g = gcd(a, b);
    return {
      html: prompt('بسّط الكسر') + fr(a, b) + op('=') + fr(a / g, slot),
      text: `${fr(a, b)} = ${fr(a / g, '?')}`, solved: `${fr(a, b)} = ${fr(a / g, b / g)}`, answer: b / g,
    };
  }

  return { next: t => GEN[t](), make };
})();
