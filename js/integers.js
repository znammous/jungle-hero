// غابة السالب والموجب: توليد المسائل ورسم خط الأعداد.
// كل مسألة نص قصير يُحفظ في سجل الأخطاء ويُعاد بناؤها منه، مثل 'add:3:-5' أو 'line:-4'
const Integers = (() => {
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const any = list => list[rnd(0, list.length - 1)];
  const shuffle = list => list.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const nz = (lo, hi) => { let n; do n = rnd(lo, hi); while (n === 0); return n; };

  // السالب بإشارة الطرح الحقيقية، والعدد السالب بعد عملية بين قوسين: 3 + (−5)
  const num = n => (n < 0 ? `−${-n}` : `${n}`);
  const par = n => (n < 0 ? `(${num(n)})` : `${n}`);
  // عدد سالب داخل جملة عربية: يبقى بإشارته في مكانها
  const ltrNum = (n, unit = '') => `<bdi dir="ltr">${num(n)}${unit}</bdi>`;
  const slot = '<span id="answer" class="answer">&nbsp;</span>';
  const prompt = text => `<span class="q-prompt" dir="rtl">${text}</span>`;
  const op = s => `<span class="op">${s}</span>`;

  // خط أعداد من −10 إلى 10 وعليه سهم عند العدد المطلوب
  function line(target) {
    const x = n => 10 + (n + 10) * 14;
    let ticks = '';
    for (let n = -10; n <= 10; n++) {
      const big = n % 5 === 0;
      ticks += `<line x1="${x(n)}" y1="${big ? 34 : 38}" x2="${x(n)}" y2="${big ? 54 : 50}"/>`;
      if (big) ticks += `<text x="${x(n)}" y="72">${num(n)}</text>`;
    }
    return `<svg class="numline" viewBox="0 0 300 80">
      <line class="axis" x1="4" y1="44" x2="296" y2="44"/>${ticks}
      <path class="marker" d="M${x(target) - 7} 10 L${x(target) + 7} 10 L${x(target)} 26Z"/>
    </svg>`;
  }

  const SIGNS = { lt: '<', eq: '=', gt: '>' };

  // مولّد لكل منطقة (رقمها = table في NEG_REGIONS)
  const GEN = {
    1: () => `line:${Math.random() < 0.7 ? nz(-9, -1) : nz(1, 9)}`,
    2: () => {
      const a = nz(-10, -1), b = Math.random() < 0.1 ? a : nz(-10, 10);
      return Math.random() < 0.5 ? `cmp:${a}:${b}` : `cmp:${b}:${a}`;
    },
    3: () => (Math.random() < 0.7 ? `temp:${rnd(0, 8)}:${-rnd(2, 12)}` : `temp:${nz(-9, -1)}:${rnd(2, 12)}`),
    4: () => `add:${rnd(1, 9)}:${nz(-9, -1)}`,
    5: () => { const a = rnd(0, 9); return `sub:${a}:${rnd(a + 1, 12)}`; },
    6: () => `add:${nz(-9, -1)}:${nz(-9, -1)}`,
    7: () => `add:${nz(-9, -1)}:${rnd(1, 9)}`,
    8: () => `sub:${nz(-9, 9)}:${nz(-9, -1)}`,
    9: () => `${any(['add', 'sub'])}:${nz(-20, 20)}:${nz(-20, 20)}`,
    10: () => { const a = nz(-9, 9); return `mul:${a}:${a > 0 ? nz(-9, -1) : nz(-9, 9)}`; },
    11: () => (Math.random() < 0.2 ? GEN[any([2, 3])]() : GEN[rnd(4, 10)]()),
  };

  // يبني المسألة من نصها: html للعرض، text و solved للقوائم، answer، و choices أو minus (مفتاح السالب)
  function make(n) {
    const [type, x, y] = n.split(':');
    const a = Number(x), b = Number(y);
    if (type === 'line') {
      const vals = [a, -a, a + 1, a - 1].filter((v, i, list) => v !== 0 && list.indexOf(v) === i).slice(0, 3);
      return {
        html: prompt('أين يشير السهم؟') + line(a),
        text: line(a), solved: `${line(a)} = ${num(a)}`,
        answer: String(a), choices: shuffle(vals).map(v => ({ v: String(v), html: num(v) })),
      };
    }
    if (type === 'cmp') {
      const ans = a < b ? 'lt' : a > b ? 'gt' : 'eq';
      return {
        html: prompt('اختر الإشارة الصحيحة') + num(a) + op('?') + num(b),
        text: `${num(a)} ? ${num(b)}`, solved: `${num(a)} ${SIGNS[ans]} ${num(b)}`,
        answer: ans, choices: ['lt', 'eq', 'gt'].map(v => ({ v, html: SIGNS[v] })),
      };
    }
    if (type === 'temp') {
      const story = b < 0 ? `انخفضت ${-b}°` : `ارتفعت ${b}°`;
      return {
        html: prompt(`🌡️ كانت الحرارة ${ltrNum(a, '°')} ثم ${story}. كم أصبحت؟`) + op('=') + slot,
        text: `${num(a)}° ${b < 0 ? '−' : '+'} ${Math.abs(b)}°`, solved: `${num(a)}° ${b < 0 ? '−' : '+'} ${Math.abs(b)}° = ${num(a + b)}°`,
        answer: a + b, minus: true,
      };
    }
    const sign = { add: '+', sub: '−', mul: '×' }[type];
    const ans = type === 'add' ? a + b : type === 'sub' ? a - b : a * b;
    const text = `${num(a)} ${sign} ${par(b)}`;
    return {
      html: `<span>${num(a)}</span>${op(sign)}<span>${par(b)}</span>${op('=')}${slot}`,
      text, solved: `${text} = ${num(ans)}`, answer: ans, minus: true,
    };
  }

  return { next: t => GEN[t](), make };
})();
