// ── общий адаптивный слой: логический размер = CSS-пиксели окна, ──
//    поэтому текст читается одинаково на телефоне и на ПК ──
window.CV = window.CV || {};
(function () {
  // размеры и типографика под текущее окно (пересчитываются при пересборке сцены)
  CV.layout = () => {
    const W = Math.max(300, Math.round(window.innerWidth || 720));
    const H = Math.max(460, Math.round(window.innerHeight || 1280));
    const phone = W < 760;
    const pad = phone ? 14 : 28;
    const colW = Math.min(W - pad * 2, phone ? 700 : 760);
    const colX = Math.round((W - colW) / 2);
    const headerH = phone ? 52 : 58;
    const fs = phone
      ? { h1: 42, h2: 20, h3: 17, body: 14.5, small: 13, tiny: 11.5, ui: 13, btn: 14, chip: 11.5 }
      : { h1: 54, h2: 23, h3: 18, body: 16, small: 14, tiny: 12, ui: 14, btn: 15, chip: 12 };
    return { W, H, phone, pad, colW, colX, headerH, fs };
  };

  // вписать текст в ширину, чтобы длинные имена не вылезали за карточку
  CV.fitText = (t, maxW) => {
    if (maxW > 0 && t.width > maxW) t.scale.set(maxW / t.width);
    return t;
  };

  // штампы в theme.js живут вокруг pivot — ставим их по левому верхнему углу
  CV.placeStamp = (stamp, x, y) => {
    stamp.position.set(x + stamp.w / 2, y + stamp.h / 2);
    return stamp;
  };

  // ── прокрутка: колесо мыши, свайп, клавиатура, инерция ──
  // hit — контейнер, который ловит drag (обычно вся сцена или область списка)
  CV.scrollArea = (app, hit, opts) => {
    const getMax = opts.getMax || (() => 0);
    const apply = opts.apply || (() => {});
    const isActive = opts.isActive || (() => true);
    let off = 0, target = 0, drag = null, dragging = false, suppressed = false;
    let lastY = 0, lastT = 0, velocity = 0;

    const clamp = v => Math.max(0, Math.min(getMax(), v));
    const paint = () => { apply(-off); if (opts.onMove) opts.onMove(off); };

    const wheel = e => {
      if (!isActive()) return;
      if (getMax() <= 0) return;
      e.preventDefault();
      const step = e.deltaMode === 1 ? e.deltaY * 20 : (e.deltaMode === 2 ? e.deltaY * getMax() : e.deltaY);
      target = clamp(target + step);
    };
    app.canvas.addEventListener('wheel', wheel, { passive: false });

    const key = e => {
      if (!isActive() || getMax() <= 0) return;
      if (e.key === 'ArrowDown') target = clamp(target + 44);
      else if (e.key === 'ArrowUp') target = clamp(target - 44);
      else if (e.key === 'PageDown' || e.key === ' ') target = clamp(target + app.screen.height * 0.8);
      else if (e.key === 'PageUp') target = clamp(target - app.screen.height * 0.8);
      else if (e.key === 'Home') target = 0;
      else if (e.key === 'End') target = getMax();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', key);

    hit.eventMode = 'static';
    hit.on('pointerdown', e => {
      if (!isActive() || getMax() <= 0) return;
      drag = { y: e.global.y, start: target };
      lastY = e.global.y; lastT = performance.now(); velocity = 0;
      dragging = false; suppressed = false;
    });
    hit.on('globalpointermove', e => {
      if (!drag || !isActive()) return;
      const dy = e.global.y - drag.y;
      if (Math.abs(dy) > 8) { dragging = true; suppressed = true; }
      if (!dragging) return;
      const now = performance.now();
      if (now > lastT) velocity = (e.global.y - lastY) / (now - lastT);
      lastY = e.global.y; lastT = now;
      target = clamp(drag.start - dy);
      off = target;
      paint();
    });
    const end = () => {
      if (!drag) return;
      if (dragging) target = clamp(target - velocity * 260);
      drag = null; dragging = false;
    };
    hit.on('pointerup', end);
    hit.on('pointerupoutside', end);

    return {
      get off() { return off; },
      set(v) { target = clamp(v); off = target; paint(); },
      update() {
        if (getMax() <= 0) { off = target = 0; }
        if (dragging) return;
        off += (target - off) * 0.24;
        if (Math.abs(target - off) < 0.15) off = target;
        paint();
      },
      wasDrag() { return suppressed; },
      destroy() {
        app.canvas.removeEventListener('wheel', wheel);
        window.removeEventListener('keydown', key);
      },
    };
  };

  // тонкий индикатор прокрутки справа
  CV.makeScrollBar = (app, color) => {
    const g = new PIXI.Graphics();
    g.eventMode = 'none';
    return {
      g,
      draw(off, max, viewH, x, y) {
        g.clear();
        if (max <= 0) return;
        const trackH = viewH;
        const thumbH = Math.max(28, trackH * (viewH / (viewH + max)));
        const ty = y + (trackH - thumbH) * Math.max(0, Math.min(1, off / max));
        g.beginFill(color || 0x55595f, 0.45);
        g.drawRect(x, y, 2, trackH);
        g.endFill();
        g.beginFill(color || 0x9a9284, 0.9);
        g.drawRect(x, ty, 2, thumbH);
        g.endFill();
      },
    };
  };
})();
