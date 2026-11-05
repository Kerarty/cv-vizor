// ── тема: палитра GDD, панели-доски, золотые кнопки, векторные иконки ──
window.CV = window.CV || {};
(function () {
  const C = {
    snow: 0xEAF2F5, taiga: 0x2E5D4B, brusnika: 0xB5433A, gold: 0xE8A93D,
    goldDark: 0xA86E1F, goldLight: 0xF7D789, wood: 0x8A5A33, woodDark: 0x5E3D22,
    woodLight: 0xA9744A, sky: 0x9FB8C9, night: 0x1d3140, nightDark: 0x12212c,
    ink: 0x20313C, paper: 0xF4E9D3, paperDark: 0xD9C8A6, fog: 0xC9D6DE,
  };
  CV.COLORS = C;

  const FONT_DISPLAY = '"Ruslan Display", serif';
  const FONT_TEXT = '"Nunito", sans-serif';
  CV.FONTS = { display: FONT_DISPLAY, text: FONT_TEXT };

  // ── базовые стили текста (формат PixiJS v8) ──
  CV.textStyle = (size, color, opts = {}) => {
    const style = {
      fontFamily: opts.display ? FONT_DISPLAY : FONT_TEXT,
      fontSize: size,
      fill: color,
      fontWeight: opts.weight || (opts.display ? '400' : '600'),
      letterSpacing: opts.ls != null ? opts.ls : (opts.display ? 2 : 0),
      lineJoin: 'round',
      wordWrap: !!opts.wrap,
      wordWrapWidth: opts.wrapWidth || 600,
      breakWords: true,
      align: opts.align || 'left',
    };
    if (opts.stroke) {
      style.stroke = { color: opts.stroke, width: opts.strokeThickness || 2, join: 'round' };
    }
    if (opts.shadow) {
      style.dropShadow = {
        color: opts.shadowColor != null ? opts.shadowColor : 0x000000,
        alpha: 0.35,
        distance: opts.shadowDistance || 3,
        angle: Math.PI / 2,
        blur: 2,
      };
    }
    return new PIXI.TextStyle(style);
  };

  CV.makeText = (str, size, color, opts = {}) => {
    const t = new PIXI.Text(str, CV.textStyle(size, color, opts));
    if (opts.anchor) t.anchor.set(opts.anchor);
    return t;
  };

  // ── деревянная панель 9-slice-подобная (рисуется кодом) ──
  CV.makePanel = (w, h, opts = {}) => {
    const g = new PIXI.Graphics();
    const r = opts.radius != null ? opts.radius : 18;
    const base = opts.fill || C.wood, dark = opts.border || C.woodDark, light = opts.top || C.woodLight;
    g.beginFill(dark, 0.55); g.drawRoundedRect(4, 8, w, h, r); g.endFill(); // тень
    g.beginFill(dark); g.drawRoundedRect(0, 0, w, h, r); g.endFill();       // рама
    g.beginFill(base); g.drawRoundedRect(5, 5, w - 10, h - 10, r - 4); g.endFill();
    g.beginFill(light, 0.28); g.drawRoundedRect(5, 5, w - 10, (h - 10) * 0.42, r - 4); g.endFill();
    // гвоздики по углам
    g.beginFill(C.goldDark, 0.9);
    for (const [nx, ny] of [[16, 16], [w - 16, 16], [16, h - 16], [w - 16, h - 16]]) {
      g.drawCircle(nx, ny, 3.2);
    }
    g.endFill();
    return g;
  };

  // ── пергамент-карточка ──
  CV.makeCard = (w, h, opts = {}) => {
    const g = new PIXI.Graphics();
    g.beginFill(0x8a744f, 0.4); g.drawRoundedRect(3, 7, w, h, 14); g.endFill();
    g.beginFill(C.paperDark); g.drawRoundedRect(0, 0, w, h, 14); g.endFill();
    g.beginFill(C.paper); g.drawRoundedRect(4, 4, w - 8, h - 8, 11); g.endFill();
    // волокна
    for (let i = 1; i < 4; i++) {
      g.moveTo(14, h * i / 4 + 6); g.lineTo(w - 14, h * i / 4 + 2);
    }
    g.stroke({ width: 1, color: C.paperDark, alpha: 0.5 });
    return g;
  };

  // ── золотая кнопка ──
  CV.makeButton = (label, w, opts = {}) => {
    const h = opts.height || 64;
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    const draw = (pressed) => {
      g.clear();
      const dy = pressed ? 2 : 0;
      g.beginFill(C.goldDark, 0.5); g.drawRoundedRect(3, 7 + dy, w, h - dy, h / 2 - 2); g.endFill();
      g.beginFill(opts.danger ? 0x8f2f27 : C.goldDark); g.drawRoundedRect(0, dy, w, h - dy, (h - dy) / 2); g.endFill();
      g.beginFill(opts.danger ? C.brusnika : C.gold); g.drawRoundedRect(0, dy, w, h - dy - 6, (h - dy - 6) / 2); g.endFill();
      g.beginFill(0xffffff, 0.35); g.drawRoundedRect(w * 0.12, dy + 5, w * 0.76, (h - dy) * 0.32, (h - dy) * 0.16); g.endFill();
    };
    draw(false);
    const t = CV.makeText(label, opts.size || 24, 0x3d2606, { weight: '800', ls: 1 });
    t.anchor.set(0.5); t.position.set(w / 2, h / 2 - 2);
    c.addChild(g, t);
    c.eventMode = 'static'; c.cursor = 'pointer';
    const down = () => { draw(true); t.y = h / 2; };
    const up = () => { draw(false); t.y = h / 2 - 2; };
    c.on('pointerdown', down); c.on('pointerup', up); c.on('pointerupoutside', up);
    if (opts.onTap) c.on('pointertap', opts.onTap);
    c.label = t;
    return c;
  };

  // ── чип-бейдж ──
  // цвет можно передать как 0xRRGGBB или 0xRRGGBBAA (8-значный разворачиваем в цвет+альфу)
  const splitAlpha = n => (n > 0xFFFFFF ? { c: n >>> 8, a: (n & 0xFF) / 255 } : { c: n, a: 1 });
  CV.makeChip = (label, opts = {}) => {
    const c = new PIXI.Container();
    const pad = 12;
    const t = CV.makeText(label, opts.size || 14, opts.color || C.ink, { weight: '700' });
    const w = t.width + pad * 2, h = (opts.size || 14) + 14;
    const g = new PIXI.Graphics();
    const f = splitAlpha(opts.fill || 0x000000);
    g.beginFill(f.c, f.a); g.drawRoundedRect(0, 0, w, h, h / 2); g.endFill();
    const l = splitAlpha(opts.line || C.goldDark);
    g.roundRect(0, 0, w, h, h / 2);
    g.stroke({ width: 1.5, color: l.c, alpha: l.a * 0.8 });
    t.position.set(pad, h / 2 - 1); t.anchor.set(0, 0.5);
    c.addChild(g, t);
    c.w = w; c.h = h;
    c.label = t;
    return c;
  };

  // ── иконки (вектор, без эмодзи) ──
  CV.makeIcon = (kind, size = 28, color = 0xffffff) => {
    const g = new PIXI.Graphics();
    const s = size / 28;
    g.scale.set(s);
    switch (kind) {
      case 'bolt': // энергия
        g.beginFill(color);
        g.moveTo(15, 2); g.lineTo(6, 16); g.lineTo(13, 16); g.lineTo(11, 26);
        g.lineTo(22, 11); g.lineTo(14.5, 11); g.lineTo(17, 2); g.closePath(); g.endFill();
        break;
      case 'coin':
        g.beginFill(C.goldDark); g.drawCircle(14, 14, 12); g.endFill();
        g.beginFill(C.gold); g.drawCircle(14, 13, 10.5); g.endFill();
        g.beginFill(C.goldLight, 0.8); g.drawCircle(11, 10, 3.4); g.endFill();
        break;
      case 'scroll': // заказы
        g.beginFill(C.paper); g.drawRoundedRect(5, 3, 18, 22, 3); g.endFill();
        g.beginFill(C.paperDark); g.drawRect(8, 8, 12, 2); g.drawRect(8, 13, 12, 2); g.drawRect(8, 18, 8, 2);
        g.endFill();
        g.beginFill(C.brusnika); g.drawRoundedRect(3, 1, 22, 4, 2); g.drawRoundedRect(3, 23, 22, 4, 2); g.endFill();
        break;
      case 'check':
        g.moveTo(5, 15); g.lineTo(12, 22); g.lineTo(23, 7);
        g.stroke({ width: 5, color, cap: 'round', join: 'round' });
        break;
      case 'cross':
        g.moveTo(7, 7); g.lineTo(21, 21); g.moveTo(21, 7); g.lineTo(7, 21);
        g.stroke({ width: 5, color, cap: 'round' });
        break;
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 5.5 : 12, a = -Math.PI / 2 + i * Math.PI / 5;
          pts.push(14 + r * Math.cos(a), 14 + r * Math.sin(a));
        }
        g.beginFill(color); g.drawPolygon(pts); g.endFill();
        break;
      }
      case 'nugget':
        g.beginFill(C.goldDark); g.drawPolygon([4, 20, 9, 8, 18, 5, 25, 12, 22, 22, 10, 24]); g.endFill();
        g.beginFill(C.gold); g.drawPolygon([7, 18, 10, 10, 17, 8, 22, 13, 20, 20, 10, 21]); g.endFill();
        g.beginFill(C.goldLight, 0.9); g.drawCircle(12, 12, 2.4); g.endFill();
        break;
      case 'pdf':
        g.beginFill(0xd64b3e); g.drawRoundedRect(4, 2, 20, 24, 3); g.endFill();
        g.beginFill(0xffffff);
        g.drawRect(8, 7, 12, 2); g.drawRect(8, 12, 12, 2); g.drawRect(8, 17, 8, 2); g.endFill();
        g.beginFill(C.gold); g.drawRoundedRect(10, 20, 14, 8, 2); g.endFill();
        break;
      case 'lang':
        g.circle(14, 14, 11); g.stroke({ width: 2, color });
        g.beginFill(color); g.drawEllipse(14, 14, 5, 11); g.endFill();
        g.moveTo(3.5, 10); g.lineTo(24.5, 10); g.moveTo(3.5, 18); g.lineTo(24.5, 18);
        g.stroke({ width: 2, color });
        break;
      case 'sound':
        g.beginFill(color); g.drawPolygon([5, 11, 11, 11, 17, 5, 17, 23, 11, 17, 5, 17]); g.endFill();
        g.arc(18, 14, 6, -0.9, 0.9); g.arc(18, 14, 10, -0.9, 0.9);
        g.stroke({ width: 2.4, color });
        break;
      case 'mute':
        g.beginFill(color); g.drawPolygon([5, 11, 11, 11, 17, 5, 17, 23, 11, 17, 5, 17]); g.endFill();
        g.moveTo(20, 9); g.lineTo(27, 19); g.moveTo(27, 9); g.lineTo(20, 19);
        g.stroke({ width: 2.6, color: C.brusnika });
        break;
      // ── иконки станций ──
      case 'tent':
        g.beginFill(C.brusnika); g.drawPolygon([14, 3, 26, 25, 2, 25]); g.endFill();
        g.beginFill(0x8f352d); g.drawPolygon([14, 3, 18, 11, 10, 11]); g.endFill();
        g.beginFill(C.nightDark); g.drawPolygon([14, 12, 20, 25, 8, 25]); g.endFill();
        break;
      case 'mine':
        g.beginFill(C.woodDark); g.drawRect(4, 14, 20, 10); g.endFill();
        g.beginFill(C.wood); g.drawRect(6, 16, 16, 6); g.endFill();
        g.beginFill(0x000000); g.drawPolygon([9, 25, 14, 14, 19, 25]); g.endFill();
        g.beginFill(C.gold); g.drawCircle(14, 22, 2.4); g.drawCircle(10, 19, 1.6); g.drawCircle(18, 18, 1.4);
        g.endFill();
        break;
      case 'factory':
        g.beginFill(0x6b7680); g.drawRect(3, 13, 22, 11); g.endFill();
        g.beginFill(0x8a95a0); g.drawRect(5, 15, 5, 9); g.drawRect(12, 15, 5, 9);
        g.beginFill(C.brusnika); g.drawRect(19, 6, 4, 7); g.endFill();
        g.beginFill(C.sky, 0.9); g.drawCircle(21, 4, 3.4); g.endFill();
        break;
      case 'loop':
        g.arc(14, 14, 9, 0.6, Math.PI * 2 - 0.6);
        g.stroke({ width: 4.5, color: 0x7f6bd9, cap: 'round' });
        g.moveTo(20, 6); g.lineTo(20, 13); g.lineTo(13, 13);
        g.stroke({ width: 4.5, color, cap: 'round' });
        break;
      case 'harbor':
        g.beginFill(0x4a6d84); g.drawRect(2, 19, 24, 5); g.endFill();
        g.beginFill(C.wood); g.drawRect(13, 6, 3, 14); g.endFill();
        g.beginFill(C.paper); g.drawPolygon([16, 6, 25, 11, 16, 15]); g.endFill();
        g.beginFill(C.brusnika); g.drawPolygon([13, 6, 7, 10, 13, 14]); g.endFill();
        break;
      case 'workshop':
        g.beginFill(C.wood); g.drawPolygon([3, 25, 3, 13, 14, 4, 25, 13, 25, 25]); g.endFill();
        g.beginFill(C.woodDark); g.drawPolygon([14, 4, 25, 13, 3, 13]); g.endFill();
        g.beginFill(0x000000, 0.19); g.drawRoundedRect(11, 17, 6, 8, 1); g.endFill();
        g.beginFill(C.gold); g.drawCircle(14, 11, 2.6); g.endFill();
        break;
      case 'fort':
        g.beginFill(0x7d8791);
        g.drawRect(3, 10, 5, 15); g.drawRect(11, 10, 6, 15); g.drawRect(20, 10, 5, 15);
        g.drawRect(3, 6, 5, 4); g.drawRect(11, 6, 6, 4); g.drawRect(20, 6, 5, 4);
        g.endFill();
        g.beginFill(0x5a636c); g.drawRect(9, 22, 10, 3); g.endFill();
        g.beginFill(C.brusnika); g.drawRect(13, 2, 2, 8); g.endFill();
        g.beginFill(C.gold); g.drawPolygon([15, 2, 22, 4, 15, 7]); g.endFill();
        break;
    }
    return g;
  };

  // ── ряд иконок-статусов (проверки тюнера) ──
  CV.statusIcon = (ok, size = 26) => CV.makeIcon(ok ? 'check' : 'cross', size, ok ? 0x3f8f5f : C.brusnika);

  // ── спрайты из встроенных ассетов (build.js собирает CV.ASSETS) ──
  // текстуры грузим заранее через PIXI.Assets (dataURL грузится асинхронно)
  const texCache = new Map();
  CV.preloadArt = async () => {
    if (!CV.ASSETS) return;
    for (const [name, url] of Object.entries(CV.ASSETS)) {
      try { texCache.set(name, await PIXI.Assets.load(url)); } catch (e) { /* нет ассета — рисуем кодом */ }
    }
  };
  CV.sprite = (name) => {
    const tex = texCache.get(name);
    return tex ? new PIXI.Sprite(tex) : null;
  };
})();
