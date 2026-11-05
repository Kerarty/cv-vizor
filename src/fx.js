// ── эффекты: снег, северное сияние, туман, переходы ──
window.CV = window.CV || {};
(function () {
  const C = CV.COLORS;

  // Снег: пул круглых спрайтов, всё рисуется кодом
  CV.makeSnow = (app, count = 90) => {
    const cont = new PIXI.Container();
    const flakes = [];
    const tex = (() => {
      const g = new PIXI.Graphics();
      g.beginFill(0xffffff); g.drawCircle(8, 8, 7); g.endFill();
      g.beginFill(0xffffff, 0.5); g.drawCircle(8, 8, 8); g.endFill();
      return app.renderer.generateTexture(g);
    })();
    for (let i = 0; i < count; i++) {
      const s = new PIXI.Sprite(tex);
      const scale = 0.25 + Math.random() * 0.8;
      s.scale.set(scale);
      s.alpha = 0.25 + Math.random() * 0.65;
      s.x = Math.random() * app.screen.width;
      s.y = Math.random() * app.screen.height;
      s._v = { vy: 22 + scale * 55, sway: Math.random() * Math.PI * 2, swayV: 0.6 + Math.random() * 1.4, drift: (Math.random() - 0.5) * 18 };
      cont.addChild(s);
      flakes.push(s);
    }
    cont.update = dt => {
      const W = app.screen.width, H = app.screen.height;
      for (const s of flakes) {
        s.y += s._v.vy * dt;
        s._v.sway += s._v.swayV * dt;
        s.x += (Math.sin(s._v.sway) * s._v.drift) * dt;
        if (s.y > H + 12) { s.y = -12; s.x = Math.random() * W; }
        if (s.x < -12) s.x = W + 10; else if (s.x > W + 12) s.x = -10;
      }
    };
    return cont;
  };

  // Северное сияние: три волнистые ленты, перерисовка раз в кадр (дёшево)
  CV.makeAurora = (app, opts = {}) => {
    const cont = new PIXI.Container();
    cont.alpha = opts.alpha != null ? opts.alpha : 0.5;
    const bands = [
      { color: 0x59d6a2, baseY: opts.y || 190, amp: 34, period: 620, speed: 0.5, width: 74 },
      { color: 0x6fb9e8, baseY: (opts.y || 190) + 70, amp: 26, period: 480, speed: -0.35, width: 54 },
      { color: 0xb48ae0, baseY: (opts.y || 190) + 130, amp: 22, period: 720, speed: 0.28, width: 42 },
    ];
    const gs = bands.map(b => {
      const g = new PIXI.Graphics();
      g.alpha = 0.2 + Math.random() * 0.14;
      cont.addChild(g);
      return g;
    });
    let t = 0;
    const W = () => app.screen.width;
    cont.update = dt => {
      t += dt;
      bands.forEach((b, i) => {
        const g = gs[i];
        g.clear();
        g.beginFill(b.color, 1);
        const step = 26, w = W();
        const top = [], bot = [];
        for (let x = -20; x <= w + 20; x += step) {
          const y = b.baseY + Math.sin(x / b.period + t * b.speed) * b.amp
            + Math.sin(x / (b.period * 0.37) - t * b.speed * 1.7) * b.amp * 0.3;
          top.push(x, y - b.width);
          bot.push(x, y + b.width * 0.2);
        }
        g.drawPolygon([...top, ...bot.reverse()]);
        g.endFill();
      });
    };
    return cont;
  };

  // Туман над закрытой станцией: серая клякса + медленный дрейф
  CV.makeFog = (radius, color = C.fog) => {
    const c = new PIXI.Container();
    const blobs = [];
    for (let i = 0; i < 6; i++) {
      const g = new PIXI.Graphics();
      const r = radius * (0.45 + Math.random() * 0.4);
      g.beginFill(color, 0.5); g.drawCircle(0, 0, r); g.endFill();
      g.x = (Math.random() - 0.5) * radius; g.y = (Math.random() - 0.5) * radius * 0.7;
      g._v = { dx: (Math.random() - 0.5) * 6, dy: (Math.random() - 0.5) * 4, r };
      c.addChild(g); blobs.push(g);
    }
    c.update = dt => {
      for (const b of blobs) {
        b.x += b._v.dx * dt; b.y += b._v.dy * dt;
        if (Math.abs(b.x) > radius * 0.4) b._v.dx *= -1;
        if (Math.abs(b.y) > radius * 0.3) b._v.dy *= -1;
      }
    };
    return c;
  };

  // Переход между сценами: шторка
  CV.makeCurtain = (app) => {
    const g = new PIXI.Graphics();
    g.beginFill(C.night, 1); g.drawRect(0, 0, app.screen.width, app.screen.height); g.endFill();
    g.eventMode = 'static'; // блокирует клики во время перехода
    g.visible = false;
    g.zIndex = 9999;
    let busy = false;
    g.transition = async (mid) => {
      if (busy) return; busy = true;
      g.visible = true; g.alpha = 0;
      await CV.tween(g, { alpha: 1 }, 220);
      await mid();
      await CV.tween(g, { alpha: 0 }, 240);
      g.visible = false; busy = false;
    };
    return g;
  };

  // ── микро-твин хелпер (без библиотек; setTimeout — работает и в фоновой вкладке) ──
  CV.tween = (target, props, ms, ease = 'out') =>
    new Promise(res => {
      const start = {}, end = props;
      for (const k of Object.keys(props)) start[k] = target[k];
      const t0 = performance.now();
      const step = () => {
        const now = performance.now();
        let p = Math.min(1, (now - t0) / ms);
        p = ease === 'out' ? 1 - Math.pow(1 - p, 3) : ease === 'in' ? p * p * p : p;
        for (const k of Object.keys(end)) target[k] = start[k] + (end[k] - start[k]) * p;
        if (p < 1) setTimeout(step, 16); else res();
      };
      setTimeout(step, 16);
    });

  // каскадный выход карточек
  CV.cascade = async (items, step = 60) => {
    for (const it of items) {
      it.visible = true;
      it.alpha = 0; it.y = it._finalY + 24;
      CV.tween(it, { alpha: 1, y: it._finalY }, 260);
      await new Promise(r => setTimeout(r, step));
    }
  };
})();
