// بطاقة تهنئة الفائز: صورة تُرسم على canvas بدون إنترنت، فيها تاج واسم الفائز، للحفظ أو المشاركة
const WinnerCard = (() => {
  const W = 1080, H = 1350;
  const FONT = '"Baloo Bhaijaan 2", "Segoe UI", Tahoma, sans-serif';
  const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

  // عشوائية ثابتة حتى تخرج الزينة بنفس الشكل كل مرة
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function text(ctx, s, x, y, size, opts = {}) {
    ctx.font = `${opts.weight || 800} ${size}px ${opts.emoji ? EMOJI : FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    // يصغّر الخط إن كان النص أعرض من البطاقة (الأسماء الطويلة)
    const max = opts.max || W - 140;
    const w = ctx.measureText(s).width;
    if (w > max) ctx.font = `${opts.weight || 800} ${Math.floor(size * max / w)}px ${opts.emoji ? EMOJI : FONT}`;
    if (opts.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = opts.strokeWidth || size / 7;
      ctx.strokeStyle = opts.stroke;
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = opts.color || '#fff';
    ctx.fillText(s, x, y);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function background(ctx) {
    const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, '#2b6b3f');
    g.addColorStop(1, '#0f2c19');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // أشعة ذهبية خلف التاج
    const cx = W / 2, cy = 470;
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 18; i++) {
      ctx.rotate(Math.PI * 2 / 18);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-60, -900);
      ctx.lineTo(60, -900);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 216, 102, 0.07)';
      ctx.fill();
    }
    ctx.restore();
    const glow = ctx.createRadialGradient(cx, cy, 40, cx, cy, 520);
    glow.addColorStop(0, 'rgba(255, 214, 90, 0.55)');
    glow.addColorStop(1, 'rgba(255, 214, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // قصاصات احتفال ملوّنة
    seed = 7;
    const colors = ['#ffc93c', '#f28c28', '#e04f3f', '#4fb3d9', '#8fd17f', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      const x = rnd() * W, y = rnd() * H * 0.62;
      if (Math.hypot(x - cx, y - cy) < 300) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd() * Math.PI);
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.85;
      if (i % 3) ctx.fillRect(-9, -4, 18, 8);
      else { ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }

    // أوراق الغابة في الزوايا
    text(ctx, '🌿', 80, 90, 120, { emoji: true });
    text(ctx, '🌴', W - 90, 100, 130, { emoji: true });
    text(ctx, '🍃', 70, H - 90, 100, { emoji: true });
    text(ctx, '🌿', W - 80, H - 90, 110, { emoji: true });
  }

  // تاج ذهبي مرسوم (لا يعتمد على شكل الإيموجي في كل جهاز)
  function crown(ctx, cx, top, w) {
    const h = w * 0.62, l = cx - w / 2, base = top + h;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    const g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, '#fff2a8');
    g.addColorStop(0.45, '#ffc93c');
    g.addColorStop(1, '#d98a12');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(l, base);
    ctx.lineTo(l - w * 0.04, top + h * 0.18);
    ctx.lineTo(l + w * 0.25, top + h * 0.55);
    ctx.lineTo(cx, top);
    ctx.lineTo(l + w * 0.75, top + h * 0.55);
    ctx.lineTo(l + w * 1.04, top + h * 0.18);
    ctx.lineTo(l + w, base);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#a8650a';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // شريط القاعدة
    roundRect(ctx, l - 10, base - h * 0.08, w + 20, h * 0.26, 14);
    const b = ctx.createLinearGradient(0, base - h * 0.08, 0, base + h * 0.18);
    b.addColorStop(0, '#ffd75e');
    b.addColorStop(1, '#c97c0c');
    ctx.fillStyle = b;
    ctx.fill();
    ctx.stroke();

    // جواهر
    const gem = (x, y, r, c) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#a8650a';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
    };
    gem(l - w * 0.04, top + h * 0.14, w * 0.055, '#ffffff');
    gem(cx, top - w * 0.01, w * 0.065, '#ffffff');
    gem(l + w * 1.04, top + h * 0.14, w * 0.055, '#ffffff');
    const gy = base + h * 0.05;
    gem(cx, gy, w * 0.06, '#e04f3f');
    gem(cx - w * 0.3, gy, w * 0.045, '#1f9e9a');
    gem(cx + w * 0.3, gy, w * 0.045, '#1f9e9a');
  }

  function ribbon(ctx, s, cy) {
    ctx.font = `800 58px ${FONT}`;
    ctx.direction = 'rtl';
    const w = Math.min(W - 160, ctx.measureText(s).width + 140), h = 104, x = (W - w) / 2, y = cy - h / 2;
    // طرفا الشريط المعقودان
    ctx.fillStyle = '#b4561a';
    [[x - 50, x + 20], [x + w + 50, x + w - 20]].forEach(([o, i]) => {
      ctx.beginPath();
      ctx.moveTo(i, y + 22);
      ctx.lineTo(o, y + 22);
      ctx.lineTo(o + (o < i ? 30 : -30), y + 22 + h / 2);
      ctx.lineTo(o, y + h + 22);
      ctx.lineTo(i, y + h + 22);
      ctx.closePath();
      ctx.fill();
    });
    roundRect(ctx, x, y, w, h, 18);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#ffa84a');
    g.addColorStop(1, '#e0701a');
    ctx.fillStyle = g;
    ctx.fill();
    text(ctx, s, W / 2, cy + 4, 58, { color: '#fff', stroke: 'rgba(120, 50, 0, 0.35)', strokeWidth: 6, max: w - 60 });
  }

  // info: { name, avatar, kind, land, note, right, wrong, date }
  async function draw(info) {
    try { await Promise.all(['800 100px "Baloo Bhaijaan 2"', '400 40px "Baloo Bhaijaan 2"'].map(f => document.fonts.load(f, 'تهانينا abc'))); } catch (e) {}
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    background(ctx);

    text(ctx, 'أبطال الغابة', W / 2, 80, 46, { color: 'rgba(255, 255, 255, 0.75)' });

    // التاج فوق دائرة الصورة الرمزية
    const cy = 520, r = 170;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(W / 2, cy, r + 18, 0, Math.PI * 2);
    const ring = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    ring.addColorStop(0, '#fff2a8');
    ring.addColorStop(1, '#d98a12');
    ctx.fillStyle = ring;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(W / 2, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fbf3dc';
    ctx.fill();
    text(ctx, info.avatar, W / 2, cy + 12, 210, { emoji: true });
    crown(ctx, W / 2, cy - r - 175, 300);

    text(ctx, '🎉 تهانينا 🎉', W / 2, 790, 92, { color: '#ffc93c', stroke: '#143a21', strokeWidth: 14 });
    text(ctx, info.name, W / 2, 920, 150, { color: '#fff', stroke: '#b4561a', strokeWidth: 22 });
    ribbon(ctx, `بطل ${info.kind}`, 1065);

    if (info.note) text(ctx, info.note, W / 2, 1180, 44, { color: '#fbf3dc', weight: 400 });
    const stats = [`✅ ${info.right} صحيحة`].concat(info.wrong == null ? [] : [`❌ ${info.wrong} خاطئة`]);
    const line = [info.land, ...stats].join('   •   ');
    text(ctx, line, W / 2, 1245, 38, { color: '#8fd17f', weight: 400 });
    text(ctx, info.date, W / 2, 1300, 32, { color: 'rgba(255, 255, 255, 0.55)', weight: 400 });

    return new Promise(res => c.toBlob(res, 'image/png'));
  }

  return { draw };
})();
