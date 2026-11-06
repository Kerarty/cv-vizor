// ── тема: нуарное досье в духе Weappy — тёмный стол, состаренная бумага,
//    чернила, красные штампы. Всё рисуется кодом, текстур нет ──
window.CV = window.CV || {};
(function () {
  const C = {
    desk: 0x14161a,      // фон-стол
    deskPool: 0x23262c,  // световое пятно лампы
    deep: 0x0c0e11,      // затемнение/виньетка
    panel: 0x1d2026,     // тёмная панель
    line: 0x3a3f47,      // рамки тёмных панелей
    tile: 0x262a31,      // закрытый участок
    tileHover: 0x343943,
    paper: 0xddd3bd,     // документ
    paperLight: 0xefe8d4,// вложение/телеграмма
    paperDark: 0xcfc3a8,
    paperEdge: 0xb4a888, // внешний край бумаги
    cardEdge: 0xc5b896,  // край вложения
    ink: 0x2a251d,       // чернила
    ink60: 0x6f6759,
    ink40: 0x9a9284,
    grey: 0x8b8f97,      // вторичный текст на тёмном
    greyLine: 0x55595f,  // рамки кнопок на тёмном
    stamp: 0xa33c2e,     // красный штамп
    stampDark: 0x7c2f24,
    stampLight: 0xe0a598,
    gold: 0xc9a25a,      // золото кинохроники
    goldDeep: 0x8a6a2f,
    aging: 0x786044,     // тёплое старение бумаги
  };
  CV.COLORS = C;

  const FONT_HEAD = '"Oswald", "PT Sans Narrow", sans-serif';
  const FONT_MONO = '"PT Mono", "Courier New", monospace';
  CV.FONTS = { head: FONT_HEAD, mono: FONT_MONO };

  // пунктирная рамка: v8 не умеет dash в stroke — рисуем сегменты
  CV.dashedRect = (g, x, y, w, h, dash = 3, gap = 3) => {
    const seg = (x1, y1, x2, y2) => {
      const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.floor(len / (dash + gap)));
      for (let i = 0; i <= n; i++) {
        const a = i / n * len, b = Math.min(len, a + dash);
        if (a >= len) break;
        g.moveTo(x1 + (x2 - x1) * a / len, y1 + (y2 - y1) * a / len);
        g.lineTo(x1 + (x2 - x1) * b / len, y1 + (y2 - y1) * b / len);
      }
    };
    seg(x, y, x + w, y); seg(x + w, y, x + w, y + h);
    seg(x + w, y + h, x, y + h); seg(x, y + h, x, y);
  };

  // ── базовый стиль текста (PixiJS v8) ──
  CV.textStyle = (size, color, opts = {}) => {
    const style = {
      fontFamily: opts.head ? FONT_HEAD : FONT_MONO,
      fontSize: size,
      fill: color,
      fontWeight: opts.weight || '400',
      letterSpacing: opts.ls != null ? opts.ls : (opts.head ? size * 0.04 : 0),
      lineJoin: 'round',
      wordWrap: !!opts.wrap,
      wordWrapWidth: opts.wrapWidth || 600,
      breakWords: true,
      align: opts.align || 'left',
    };
    if (opts.italic) style.fontStyle = 'italic';
    return new PIXI.TextStyle(style);
  };

  CV.makeText = (str, size, color, opts = {}) => {
    const t = new PIXI.Text(opts.upper ? String(str).toUpperCase() : str, CV.textStyle(size, color, opts));
    if (opts.anchor) t.anchor.set(opts.anchor);
    return t;
  };

  // ── бумажный документ: тень, состаренная бумага, двойная рамка ──
  CV.makePanel = (w, h, opts = {}) => {
    const wrap = new PIXI.Container();
    const g = new PIXI.Graphics();
    // падающая тень
    g.beginFill(0x000000, 0.5); g.drawRoundedRect(5, 16, w, h, 2); g.endFill();
    // бумага
    g.beginFill(opts.light ? C.paperLight : C.paper); g.drawRect(0, 0, w, h); g.endFill();
    // старение: тёплая кайма изнутри
    const ag = opts.aging !== false ? 0.10 : 0;
    if (ag) {
      g.beginFill(C.aging, ag); g.drawRect(0, 0, w, h); g.endFill();
      g.beginFill(opts.light ? C.paperLight : C.paper, 1); g.drawRect(14, 14, w - 28, h - 28); g.endFill();
    }
    // внешний край и внутренняя рамка чернилами
    g.setStrokeStyle({ width: 1, color: C.paperEdge }); g.drawRect(0.5, 0.5, w - 1, h - 1); g.stroke();
    if (opts.inner !== false) {
      g.setStrokeStyle({ width: 2, color: C.ink, alpha: 0.5 });
      g.drawRect(10, 10, w - 20, h - 20); g.stroke();
    }
    wrap.addChild(g);
    wrap.content = { x: 34, y: 28 };
    return wrap;
  };

  // ── вложение: светлый листок с жёсткой короткой тенью (телеграмма) ──
  CV.makeCard = (w, h, opts = {}) => {
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.beginFill(C.ink, 0.25); g.drawRect(2, 3, w, h); g.endFill(); // жёсткая тень 2×3
    g.beginFill(opts.light === false ? C.paper : C.paperLight);
    g.drawRect(0, 0, w, h); g.endFill();
    g.setStrokeStyle({ width: 1, color: C.cardEdge }); g.drawRect(0.5, 0.5, w - 1, h - 1); g.stroke();
    if (opts.red) { // красный служебный кант
      g.beginFill(C.stamp); g.drawRect(0, 0, 4, h); g.endFill();
    }
    c.addChild(g);
    return c;
  };

  // ── кнопка: чернильная (на бумаге), призрачная (на тёмном), красная ──
  CV.makeButton = (label, w, opts = {}) => {
    const h = opts.height || 60;
    const c = new PIXI.Container();
    const up = new PIXI.Graphics(), down = new PIXI.Graphics();
    const drawBg = (g, pressed) => {
      g.clear();
      if (opts.red) {
        g.beginFill(pressed ? 0xc04a39 : C.stamp); g.drawRect(0, 0, w, h); g.endFill();
      } else if (opts.ghost) { // на тёмном столе
        g.setStrokeStyle({ width: 1, color: pressed ? C.paper : C.greyLine });
        g.drawRect(0.5, 0.5, w - 1, h - 1); g.stroke();
      } else { // чернила на бумаге
        if (pressed) { g.beginFill(C.ink); g.drawRect(0, 0, w, h); g.endFill(); }
        g.setStrokeStyle({ width: 3, color: C.ink });
        g.drawRect(1.5, 1.5, w - 3, h - 3); g.stroke();
      }
    };
    drawBg(up, false); drawBg(down, true);
    const size = opts.size || 15;
    const mkText = () => CV.makeText(label, size, opts.red ? C.paperLight : (opts.ghost ? C.paper : C.ink), { ls: size * 0.22, upper: true });
    const t = mkText();
    t.anchor.set(0.5); t.position.set(w / 2, h / 2 - 1);
    c.addChild(up, t);
    c.eventMode = 'static'; c.cursor = 'pointer';
    let pressed = false;
    const press = v => {
      if (v === pressed) return;
      pressed = v;
      c.removeChild(pressed ? up : down);
      c.addChildAt(pressed ? down : up, 0);
      t.y = h / 2 + (v ? 1 : -1);
      if (!opts.red && !opts.ghost) t.fill = v ? C.paperLight : C.ink; // инверсия чернильной
    };
    c.on('pointerdown', () => press(true));
    c.on('pointerup', () => press(false));
    c.on('pointerupoutside', () => press(false));
    c.on('pointerover', () => { if (!opts.red) t.alpha = 0.75; });
    c.on('pointerout', () => { t.alpha = 1; });
    if (opts.onTap) c.on('pointertap', opts.onTap);
    c.label = t;
    return c;
  };

  // ── чип-лейбл: пунктирный трейт (на бумаге), тёмный перк, призрачный (на тёмном) ──
  CV.makeChip = (label, opts = {}) => {
    const c = new PIXI.Container();
    const size = opts.size || 12;
    const t = CV.makeText(label, size, opts.color || (opts.solid ? C.paper : (opts.ghost ? C.paper : C.ink)), { ls: size * 0.08, upper: !!opts.upper });
    const padX = opts.padX != null ? opts.padX : 9;
    const w = t.width + padX * 2, h = size + 12;
    const g = new PIXI.Graphics();
    if (opts.solid) { // перк: тёмная плашка
      g.beginFill(C.ink); g.drawRect(0, 0, w, h); g.endFill();
    } else if (opts.ghost) { // на тёмном: рамка greyLine
      g.setStrokeStyle({ width: 1, color: opts.line || C.greyLine });
      g.drawRect(0.5, 0.5, w - 1, h - 1); g.stroke();
    } else { // трейт: пунктирная рамка на светлом
      g.beginFill(C.paperLight); g.drawRect(0, 0, w, h); g.endFill();
      g.setStrokeStyle({ width: 1, color: 0x8d7f61 });
      CV.dashedRect(g, 0.5, 0.5, w - 1, h - 1); g.stroke();
    }
    t.position.set(padX, h / 2); t.anchor.set(0, 0.5);
    c.addChild(g, t);
    c.w = w; c.h = h;
    c.label = t;
    return c;
  };

  // ── красный штамп: двойная рамка, поворот, полупрозрачные чернила ──
  CV.makeStamp = (text, opts = {}) => {
    const size = opts.size || 12;
    const t = CV.makeText(text, size, C.stamp, { weight: '700', ls: size * 0.22, upper: true });
    const padX = opts.padX != null ? opts.padX : 10, padY = opts.padY != null ? opts.padY : 4;
    const w = t.width + padX * 2, h = size + padY * 2 + 4;
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.setStrokeStyle({ width: opts.thick || 3, color: C.stamp });
    g.drawRect(0, 0, w, h); g.stroke();
    g.setStrokeStyle({ width: 1, color: C.stamp, alpha: 0.6 });
    g.drawRect(3, 3, w - 6, h - 6); g.stroke();
    t.position.set(w / 2, h / 2); t.anchor.set(0.5);
    c.addChild(g, t);
    if (opts.rotation !== 0) c.rotation = opts.rotation != null ? opts.rotation : (9 * Math.PI / 180);
    c.alpha = opts.alpha != null ? opts.alpha : 0.88;
    c.w = w; c.h = h;
    // для анимации «шлёп»
    c.pivot.set(w / 2, h / 2);
    c.position.set(w / 2 + (opts.x || 0), h / 2 + (opts.y || 0));
    return c;
  };

  // ── полосатый стат-бар личного дела (диагональная штриховка) ──
  CV.makeStatBar = (w, h) => {
    const c = new PIXI.Container();
    const track = new PIXI.Graphics();
    track.beginFill(C.paperLight); track.drawRect(0, 0, w, h); track.endFill();
    track.setStrokeStyle({ width: 1, color: 0x9b8f74 }); track.drawRect(0.5, 0.5, w - 1, h - 1); track.stroke();
    const stripes = new PIXI.Graphics();
    const span = w * 1.6;
    for (let x = -h; x < span; x += 8) {
      stripes.beginFill(x % 16 ? C.stamp : C.stampDark);
      stripes.drawPolygon([x, h, x + 4, h, x + 4 + h, 0, x + h, 0]);
      stripes.endFill();
    }
    const mask = new PIXI.Graphics();
    // v8: маска без заливки рендерит пустоту — заливаем белым
    mask.beginFill(0xffffff); mask.drawRect(0, 0, w, h); mask.endFill();
    c.addChild(track, mask);
    const fillC = new PIXI.Container();
    fillC.addChild(stripes);
    fillC.position.set(1, 1);
    stripes.mask = mask;
    fillC.scale.x = 0.001;
    c.addChild(fillC);
    c.setFill = f => { fillC.scale.x = Math.max(0.001, Math.min(1, f)); };
    return c;
  };

  // ── иконки: чернильные пиктограммы в одну линию (28×28) ──
  CV.makeIcon = (kind, size = 28, color = C.ink) => {
    const g = new PIXI.Graphics();
    const s = size / 28;
    g.scale.set(s);
    const S = o => g.stroke({ width: 2.2, color, cap: 'round', join: 'round', ...o });
    switch (kind) {
      case 'zap': // энергия
        g.beginFill(color);
        g.moveTo(15, 2); g.lineTo(6, 16); g.lineTo(13, 16); g.lineTo(11, 26);
        g.lineTo(22, 11); g.lineTo(14.5, 11); g.lineTo(17, 2); g.closePath(); g.endFill();
        break;
      case 'clue': // улика: бирка с дырочкой
        g.moveTo(4, 12); g.lineTo(12, 4); g.lineTo(24, 4); g.lineTo(24, 16); g.lineTo(16, 24);
        g.lineTo(4, 12); g.closePath(); S();
        g.beginFill(color); g.drawCircle(19, 9, 2); g.endFill();
        break;
      case 'check':
        g.moveTo(5, 15); g.lineTo(12, 22); g.lineTo(23, 7); S({ width: 3 });
        break;
      case 'cross':
        g.moveTo(7, 7); g.lineTo(21, 21); g.moveTo(21, 7); g.lineTo(7, 21); S({ width: 3, color: C.stamp });
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
      case 'pdf':
        g.moveTo(7, 2); g.lineTo(18, 2); g.lineTo(22, 6); g.lineTo(22, 26); g.lineTo(7, 26);
        g.closePath(); S();
        g.moveTo(18, 2); g.lineTo(18, 6); g.lineTo(22, 6); S({ width: 1.6 });
        g.moveTo(10, 11); g.lineTo(19, 11); g.moveTo(10, 15); g.lineTo(19, 15); g.moveTo(10, 19); g.lineTo(16, 19);
        S({ width: 1.6 });
        break;
      case 'lang':
        g.circle(14, 14, 11); S({ width: 1.8 });
        g.beginFill(color); g.ellipse(14, 14, 5, 11); g.endFill();
        g.moveTo(3.5, 10); g.lineTo(24.5, 10); g.moveTo(3.5, 18); g.lineTo(24.5, 18); S({ width: 1.8 });
        break;
      case 'sound':
        g.beginFill(color); g.drawPolygon([5, 11, 11, 11, 17, 5, 17, 23, 11, 17, 5, 17]); g.endFill();
        g.arc(18, 14, 6, -0.9, 0.9); g.arc(18, 14, 10, -0.9, 0.9); S({ width: 2 });
        break;
      case 'mute':
        g.beginFill(color); g.drawPolygon([5, 11, 11, 11, 17, 5, 17, 23, 11, 17, 5, 17]); g.endFill();
        g.moveTo(20, 9); g.lineTo(27, 19); g.moveTo(27, 9); g.lineTo(20, 19); S({ width: 2.4, color: C.stamp });
        break;
      // ── пиктограммы участков (одним цветом — как гравюра) ──
      case 'tent': // концепт: палатка = черновик
        g.moveTo(4, 24); g.lineTo(14, 4); g.lineTo(24, 24); g.closePath(); S();
        g.moveTo(14, 12); g.lineTo(19, 24); g.moveTo(14, 12); g.lineTo(9, 24); S({ width: 1.6 });
        break;
      case 'mine': // прииск: кирка
        g.moveTo(6, 24); g.lineTo(20, 8); S();
        g.moveTo(12, 4); g.quadraticCurveTo(20, 2, 25, 10); S();
        g.moveTo(14, 6); g.lineTo(18, 10); S({ width: 1.6 });
        break;
      case 'factory': // playable: плей-кадр
        g.roundRect(3, 6, 22, 16, 2); S();
        g.beginFill(color); g.drawPolygon([12, 10, 19, 14, 12, 18]); g.endFill();
        break;
      case 'loop': // петля времени
        g.arc(14, 14, 9, 0.7, Math.PI * 2 - 0.7); S({ width: 3 });
        g.moveTo(21, 5); g.lineTo(21, 12); g.lineTo(14, 12); S({ width: 3 });
        break;
      case 'harbor': // гавань: якорь
        g.circle(14, 6, 3); S();
        g.moveTo(14, 9); g.lineTo(14, 22); S();
        g.moveTo(7, 14); g.lineTo(21, 14); S();
        g.arc(14, 16, 8, 0.25, Math.PI - 0.25); S();
        break;
      case 'workshop': // мастерская: шестерня
        g.circle(14, 14, 6); S({ width: 2.6 });
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          g.moveTo(14 + Math.cos(a) * 8.5, 14 + Math.sin(a) * 8.5);
          g.lineTo(14 + Math.cos(a) * 12, 14 + Math.sin(a) * 12);
        }
        S({ width: 2.6 });
        break;
      case 'fort': // форт: зубцы стены
        g.moveTo(4, 25); g.lineTo(4, 10); g.lineTo(8, 10); g.lineTo(8, 14); g.lineTo(12, 14);
        g.lineTo(12, 10); g.lineTo(16, 10); g.lineTo(16, 14); g.lineTo(20, 14); g.lineTo(20, 10);
        g.lineTo(24, 10); g.lineTo(24, 25); g.closePath(); S();
        g.moveTo(11, 25); g.lineTo(11, 19); g.lineTo(17, 19); g.lineTo(17, 25); S({ width: 1.6 });
        break;
    }
    return g;
  };

  CV.statusIcon = (ok, size = 26) => CV.makeIcon(ok ? 'check' : 'cross', size, ok ? C.ink : C.stamp);

  // ── спрайты: нуарная тема обходится без текстур (заглушки для совместимости) ──
  const texCache = new Map();
  CV.preloadArt = async () => { /* ассетов нет — вся графика кодом */ };
  CV.sprite = () => null;
  CV.hasArt = () => false;
})();
