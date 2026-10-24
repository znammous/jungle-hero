// أصوات بسيطة تُولَّد بالكود (Web Audio) — بدون ملفات صوت
const Sound = (() => {
  let ctx = null;

  function tone(freq, dur, type = 'sine', when = 0, vol = 0.15) {
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  function play(name) {
    if (Store.state.muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { return; }

    switch (name) {
      case 'right': tone(660, 0.12, 'triangle'); tone(990, 0.15, 'triangle', 0.07); break;
      case 'wrong': tone(200, 0.3, 'sawtooth', 0, 0.07); break;
      case 'tick':  tone(520, 0.08, 'square', 0, 0.06); break;
      case 'go':    tone(880, 0.25, 'triangle'); break;
      case 'coin':  tone(988, 0.08, 'square', 0, 0.08); tone(1319, 0.2, 'square', 0.08, 0.08); break;
      case 'win':   [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', i * 0.12)); break;
    }
  }

  return { play };
})();
