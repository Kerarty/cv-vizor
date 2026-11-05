// ── процедурный звук: WebAudio, без сэмплов ──
window.CV = window.CV || {};
CV.Sfx = (function () {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('cvvizor.muted') === '1'; } catch (e) {}
  const ac = () => {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const blip = (freq, dur, type = 'sine', vol = 0.08, slide = 0) => {
    if (muted) return;
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  };
  return {
    get muted() { return muted; },
    toggle() { muted = !muted; try { localStorage.setItem('cvvizor.muted', muted ? '1' : '0'); } catch (e) {} return muted; },
    tap() { blip(660, 0.06, 'triangle', 0.05); },
    open() { blip(420, 0.1, 'sine', 0.06, 160); },
    chop() { blip(150, 0.09, 'square', 0.05, -60); },
    coin() { blip(1180, 0.09, 'sine', 0.07); setTimeout(() => blip(1560, 0.12, 'sine', 0.06), 70); },
    done() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.14, 'triangle', 0.07), i * 95)); },
    fail() { blip(220, 0.16, 'sawtooth', 0.04, -80); },
  };
})();
