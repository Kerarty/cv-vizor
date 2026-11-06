// ── эффекты нуарного досье: пыль в свете лампы, виньетка, штриховка,
//    шторка. Снег и северное сияние остались в прошлой версии ──
window.CV = window.CV || {};
(function () {
  const C = CV.COLORS;

  // Пыль: медленные крапинки, дрейфующие в свете лампы (для обложки и финала)
  CV.makeDust = (app, count = 26) => {
    const cont = new PIXI.Container();
    const motes = [];
    const tex = (() => {
      const g = new PIXI.Graphics();
      g.beginFill(0xffffff); g.drawCircle(4, 4, 2.6); g.endFill();
      return app.renderer.generateTexture(g);
    })();
    for (let i = 0; i < count; i++) {
      const s = new PIXI.Sprite(tex);
      const scale = 0.2 + Math.random() * 0.5;
      s.scale.set(scale);
      s.alpha = 0.03 + Math.random() * 0.07;
      s.tint = 0xd8cdb4; // тёплая пыль
      s.x = Math.random() * app.screen.width;
      s.y = Math.random() * app.screen.height;
      s._v = { vy: -(3 + Math.random() * 8), sway: Math.random() * Math.PI * 2, swayV: 0.3 + Math.random() * 0.5, drift: (Math.random() - 0.5) * 14 };
      cont.addChild(s);
      motes.push(s);
    }
    cont.update = dt => {
      const W = app.screen.width, H = app.screen.height;
      for (const s of motes) {
        s.y += s._v.vy * dt;
        s._v.sway += s._v.swayV * dt;
        s.x += Math.sin(s._v.sway) * s._v.drift * dt;
        if (s.y < -8) { s.y = H + 8; s.x = Math.random() * W; }
        if (s.x < -8) s.x = W + 6; else if (s.x > W + 8) s.x = -6;
      }
    };
    return cont;
  };

  // Виньетка: затемнение по краям стола (статичная, дёшево)
  CV.makeVignette = (app, strength = 0.42) => {
    const g = new PIXI.Graphics();
    const W = app.screen.width, H = app.screen.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.hypot(cx, cy);
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      const r = R * (0.62 + 0.38 * (i / (steps - 1)));
      g.beginFill(C.deep, strength / steps);
      g.ellipse(cx, cy, r, r * 1.25);
      g.endFill();
    }
    g.eventMode = 'none';
    return g;
  };

  // Световое пятно лампы: концентрические эллипсы от deskPool к прозрачности
  CV.makeLampPool = (app, cx, cy, radius) => {
    const g = new PIXI.Graphics();
    const steps = 7;
    for (let i = steps; i >= 1; i--) {
      const r = radius * i / steps;
      g.beginFill(C.deskPool, 0.09);
      g.ellipse(cx, cy, r, r * 0.82);
      g.endFill();
    }
    return g;
  };

  // Штриховка «ЗАКРЫТО»: диагональные линии в рамке участка
  CV.makeHatch = (w, h, color = 0x4a4f58, alpha = 0.5) => {
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    for (let x = -h; x < w + h; x += 9) {
      g.moveTo(x, h); g.lineTo(x + h, 0);
    }
    g.stroke({ width: 1.5, color, alpha });
    const mask = new PIXI.Graphics();
    // v8: маска без заливки рендерит пустоту — заливаем белым
    mask.beginFill(0xffffff); mask.drawRect(0, 0, w, h); mask.endFill();
    c.addChild(mask, g);
    g.mask = mask;
    return c;
  };

  // Переход между сценами: шторка
  CV.makeCurtain = (app) => {
    const g = new PIXI.Graphics();
    g.beginFill(C.deep, 1); g.drawRect(0, 0, app.screen.width, app.screen.height); g.endFill();
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
        if (ease === 'out') p = 1 - Math.pow(1 - p, 3);
        else if (ease === 'in') p = p * p * p;
        else if (ease === 'back') { // перелёт для шлепка штампа
          const c1 = 1.70158, c3 = c1 + 1;
          p = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
        }
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

  // шлепок штампа: резкий рост и прижатие к бумаге
  CV.stampSlam = async (stamp) => {
    stamp.visible = true;
    stamp.alpha = 0;
    stamp.scale.set(2.6);
    CV.tween(stamp, { alpha: 0.88 }, 140);
    await CV.tween(stamp.scale, { x: 1, y: 1 }, 240, 'back');
  };
})();
