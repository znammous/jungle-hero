// خلفية الغابة المتحركة: أشعة شمس، يراعات، أوراق تتساقط، نباتات تتمايل، وفراشة وببغاء يعبران
// كل الحركة transform و opacity فقط (بلا filter:blur) لتبقى خفيفة على التابلت
(() => {
  const bg = document.getElementById('bg');
  const rnd = (a, b) => a + Math.random() * (b - a);
  let h = '';

  // أشعة شمس تتسلّل بين الأشجار
  [{ l: 8, w: 90, g: 0 }, { l: 34, w: 140, g: -5 }, { l: 66, w: 70, g: -9 }].forEach(r => {
    h += `<span class="ray" style="left:${r.l}%;--w:${r.w}px;animation-delay:${r.g}s"></span>`;
  });

  // نباتات كبيرة في الأركان تتمايل مع النسيم
  [
    { e: '🌿', s: 'bottom:-30px;right:-24px', f: 150, g: 0 },
    { e: '🌴', s: 'bottom:-40px;left:-30px', f: 190, g: -2 },
    { e: '🍃', s: 'top:-28px;left:-20px', f: 120, g: -4 },
    { e: '🌿', s: 'top:-30px;right:-30px;transform-origin:top center', f: 130, g: -1 },
  ].forEach(p => {
    h += `<span class="plant" style="${p.s};font-size:${p.f}px;animation-delay:${p.g}s">${p.e}</span>`;
  });

  // يراعات مضيئة تسبح في الهواء
  for (let i = 0; i < 18; i++) {
    h += `<span class="firefly" style="top:${rnd(5, 95)}%;left:${rnd(0, 100)}%;--s:${rnd(8, 16)}px;` +
         `--d:${rnd(7, 13)}s;animation-delay:${rnd(-13, 0)}s,${rnd(-3, 0)}s"></span>`;
  }

  // أوراق تتساقط ببطء: الكبيرة أقرب فأسرع وأوضح
  for (let i = 0; i < 9; i++) {
    const size = rnd(18, 34);
    h += `<span class="leaf" style="left:${rnd(5, 105)}%;font-size:${size}px;opacity:${(0.35 + size / 70).toFixed(2)};` +
         `animation-duration:${(40 - size * 0.6).toFixed(1)}s;animation-delay:${rnd(-30, 0).toFixed(1)}s">${i % 3 ? '🍃' : '🍂'}</span>`;
  }

  // زوّار يعبرون الشاشة بين حين وآخر
  h += `<span class="flyer" style="top:22%;animation-duration:38s;animation-delay:-6s"><i>🦋</i></span>`;
  h += `<span class="flyer" style="top:58%;animation-duration:52s;animation-delay:-30s"><i>🦜</i></span>`;

  bg.innerHTML = h;
})();
