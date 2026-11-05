// ── сцена «Карта экспедиции»: станции, работник, заказы, самородки ──
CV.scenes = CV.scenes || {};

// состояние кампании (живёт в сессии, дублируется в localStorage)
CV.State = {
  opened: new Set(),     // id расчищенных станций
  ordersDone: new Set(), // id выполненных заказов
  blocksOpen: new Set(), // блоки листа кандидата
  nuggets: new Set(),    // id собранных самородков
  tunerOpen: false,
  load() {
    try {
      const s = JSON.parse(localStorage.getItem('cvvizor.save') || 'null');
      if (!s) return;
      (s.opened || []).forEach(x => this.opened.add(x));
      (s.orders || []).forEach(x => this.ordersDone.add(x));
      (s.blocks || []).forEach(x => this.blocksOpen.add(x));
      (s.nuggets || []).forEach(x => this.nuggets.add(x));
      this.tunerOpen = !!s.tuner;
    } catch (e) {}
  },
  save() {
    try {
      localStorage.setItem('cvvizor.save', JSON.stringify({
        opened: [...this.opened], orders: [...this.ordersDone],
        blocks: [...this.blocksOpen], nuggets: [...this.nuggets], tuner: this.tunerOpen,
      }));
    } catch (e) {}
  },
  get ordersCount() { return this.ordersDone.size; },
};
CV.State.load();

CV.scenes.map = (view, app) => {
  const W = () => app.screen.width, H = () => app.screen.height;
  const C = CV.COLORS;
  const layers = new PIXI.Container();
  view.addChild(layers);

  // ── дневной фон: настоящее небо и даль Park Zone, снег кодом ──
  const bg = new PIXI.Container();
  const drawBg = () => {
    bg.removeChildren().forEach(c => c.destroy({ children: true }));
    const base = new PIXI.Graphics();
    base.beginFill(0xBFD5E1); base.drawRect(0, 0, W(), H()); base.endFill();
    bg.addChild(base);
    const sky = CV.sprite('map-sky');
    if (sky) { sky.width = W(); sky.height = 340; sky.position.set(0, 0); bg.addChild(sky); }
    const treeline = CV.sprite('map-treeline-winter');
    if (treeline) { treeline.width = W(); treeline.height = 150; treeline.position.set(0, 240); treeline.alpha = 0.9; bg.addChild(treeline); }
    const snow = new PIXI.Graphics();
    snow.beginFill(0xE7F0F5); snow.drawRect(0, 330, W(), H() - 330); snow.endFill();
    snow.beginFill(C.snow); snow.drawRect(0, 356, W(), H() - 356); snow.endFill();
    snow.beginFill(0xf6fafc, 0.8);
    for (let y = 400; y < H() + 60; y += 74)
      for (let x = ((y / 74) % 2) * 60 - 60; x < W() + 80; x += 150)
        snow.ellipse(x + ((y * 13) % 40), y + ((x * 7) % 30), 88, 20);
    snow.endFill();
    bg.addChild(snow);
  };
  drawBg();
  layers.addChild(bg);

  // дорога между станциями (пунктир)
  const road = new PIXI.Graphics();
  road.beginFill(0xdbe7ee, 1);
  const path = CV.DATA.stations.map(s => [s.x, s.y]);
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i], [x2, y2] = path[i + 1];
    const steps = 7;
    for (let j = 0; j < steps; j++) {
      const t0 = j / steps, t1 = (j + 0.55) / steps;
      road.drawRoundedRect(x1 + (x2 - x1) * t0 - 5, y1 + (y2 - y1) * t0 - 5, 14 + Math.abs(x2 - x1) * 0.02, 10, 4);
    }
  }
  road.endFill();
  road.alpha = 0.75;
  layers.addChild(road);

  // ── настоящие деревья и кусты (озимённые, Park Zone) ──
  const flora = new PIXI.Container();
  const addTree = (kind, x, y, h) => {
    const t = CV.sprite('map-tree' + kind);
    if (!t) return;
    t.width = h * 0.9; t.height = h;
    t.anchor.set(0.5, 0.95);
    t.position.set(x, y);
    flora.addChild(t);
  };
  const addBush = (kind, x, y, w) => {
    const b = CV.sprite('map-bush' + kind);
    if (!b) return;
    b.width = w; b.height = w * 0.5;
    b.anchor.set(0.5, 0.9);
    b.position.set(x, y);
    flora.addChild(b);
  };
  addTree(1, 70, 430, 150); addTree(2, 665, 450, 160); addTree(3, 42, 680, 120);
  addTree(1, 688, 745, 140); addTree(2, 88, 1030, 150); addTree(3, 648, 1140, 120);
  addTree(1, 215, 1200, 130); addTree(2, 568, 1000, 130);
  addBush(1, 150, 480, 60); addBush(2, 602, 575, 54); addBush(3, 252, 735, 58);
  addBush(1, 520, 1010, 56); addBush(2, 662, 860, 50); addBush(3, 96, 905, 52);
  addBush(1, 300, 1262, 58); addBush(2, 478, 665, 52);
  layers.addChild(flora);

  // ── станции ──
  const stationViews = new Map(); // id → {cont, fog, plate, open}
  for (const st of CV.DATA.stations) {
    const cont = new PIXI.Container();
    cont.position.set(st.x, st.y);
    cont.eventMode = 'static'; cont.cursor = 'pointer';

    let icon;
    const spr = st.sprite ? CV.sprite(st.sprite) : null;
    if (spr) {
      // здание из пака: 320×400 → якорь у фундамента
      const targetH = 96;
      spr.scale.set(targetH / 400);
      spr.anchor.set(0.5, 0.9);
      icon = spr;
    } else {
      icon = CV.makeIcon(st.kind, 64);
      icon.anchor?.set?.(0.5);
      icon.position.set(0, -6);
    }
    // тень-подложка
    const pad = new PIXI.Graphics();
    pad.beginFill(0x2e5d4b, 0.12); pad.drawCircle(0, 8, 44); pad.endFill();
    cont.addChild(pad, icon);

    const plate = CV.makeChip(CV.t('station.' + st.id + '.name'), { size: 14 });
    plate.position.set(-plate.w / 2, 34);
    cont.addChild(plate);

    const isFort = st.id === 's7';
    const opened = CV.State.opened.has(st.id);
    icon.visible = opened; // до расчистки станция полностью под туманом
    let fog = null;
    if (!opened) {
      fog = CV.makeFog(52);
      fog.position.set(0, -6);
      cont.addChild(fog);
      plate.alpha = 0.45;
    }
    cont.on('pointertap', () => tapStation(st));
    layers.addChild(cont);
    stationViews.set(st.id, { cont, icon, plate, fog, st, isFort });
  }

  // ── самородки ──
  const nuggetViews = new Map();
  for (const n of CV.DATA.nuggets) {
    if (CV.State.nuggets.has(n.id)) continue;
    const c = new PIXI.Container();
    c.position.set(n.x, n.y);
    const g = CV.makeIcon('nugget', 30);
    g.position.set(-15, -15);
    c.addChild(g);
    c.eventMode = 'static'; c.cursor = 'pointer';
    c.alpha = 0.95;
    c.on('pointertap', () => collectNugget(n.id, c));
    layers.addChild(c);
    nuggetViews.set(n.id, c);
  }

  // ── работник ──
  const worker = new PIXI.Container();
  const wG = new PIXI.Graphics();
  // парка
  wG.beginFill(0x6e4a2b); wG.drawRoundedRect(-11, -6, 22, 26, 7); wG.endFill();
  wG.beginFill(0x8a5a33); wG.drawRoundedRect(-9, -4, 18, 22, 6); wG.endFill();
  // голова + шапка-ушанка
  wG.beginFill(0xe8b98a); wG.drawCircle(0, -14, 8); wG.endFill();
  wG.beginFill(0x4a3524); wG.drawRoundedRect(-9, -23, 18, 8, 3); wG.endFill();
  wG.beginFill(0x4a3524); wG.drawRoundedRect(-12, -17, 5, 7, 2); wG.drawRoundedRect(7, -17, 5, 7, 2); wG.endFill();
  // борода
  wG.beginFill(0xd8d8d8); wG.drawRoundedRect(-5, -11, 10, 7, 3); wG.endFill();
  // топор (отдельным контейнером для анимации)
  const axe = new PIXI.Container();
  const axeG = new PIXI.Graphics();
  axeG.beginFill(0x6b4423); axeG.drawRect(-1.5, -20, 3, 20); axeG.endFill();
  axeG.beginFill(0xb9c2c9); axeG.drawPolygon([-2, -20, 10, -22, 10, -13, -2, -14]); axeG.endFill();
  axeG.position.set(8, -4);
  axe.addChild(axeG);
  worker.addChild(wG, axe);
  worker.position.set(190, 395);
  worker.scale.set(1.15);
  layers.addChild(worker);
  // тень работника
  const wShadow = new PIXI.Graphics();
  wShadow.beginFill(0x2e5d4b, 0.18); wShadow.drawEllipse(0, 22, 16, 6); wShadow.endFill();
  worker.addChildAt(wShadow, 0);

  // ── HUD: пилюля btn-long + настоящие иконки ──
  const hud = new PIXI.Container();
  layers.addChild(hud);
  const hudBg = CV.sprite('ui-btn-long');
  hudBg.width = W() - 24; hudBg.height = 64;
  hudBg.tint = 0xdfe9ee; // слегка приглушаем глянец под текст
  hudBg.position.set(12, 12);
  hud.addChild(hudBg);

  const boltIcon = CV.sprite('ui-energy');
  if (boltIcon) { boltIcon.height = 34; boltIcon.width = 34 * 249 / 406; boltIcon.position.set(34, 27); }
  const energyT = CV.makeText('30', 22, C.ink, { weight: '800' });
  energyT.anchor.set(0, 0.5); energyT.position.set(70, 44);
  hud.addChild(boltIcon, energyT);

  const attIcon = CV.sprite('ui-clock');
  if (attIcon) { attIcon.width = 26; attIcon.height = 26; attIcon.position.set(150, 31); }
  const attT = CV.makeText(CV.t('hud.attention', { s: 0 }), 15, C.ink, { weight: '700' });
  attT.anchor.set(0, 0.5); attT.position.set(180, 44);
  hud.addChild(attIcon, attT);

  const ordersChip = CV.makeChip(CV.t('hud.orders') + ' ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount }), { size: 15, dark: true });
  ordersChip.eventMode = 'static'; ordersChip.cursor = 'pointer';
  ordersChip.on('pointertap', () => { CV.Sfx.open(); toggleOrders(true); });
  ordersChip.position.set(W() - 320, 26);
  hud.addChild(ordersChip);

  const bPdf = CV.makeIcon('pdf', 36);
  bPdf.eventMode = 'static'; bPdf.cursor = 'pointer';
  bPdf.position.set(W() - 190, 26);
  bPdf.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); });
  hud.addChild(bPdf);

  const bSheet = CV.makeButton(CV.t('sheet.title'), 122, { height: 46, size: 15, onTap: () => { CV.Sfx.open(); CV.Scenes.switchTo('sheet'); } });
  bSheet.position.set(W() - 134, 21);
  hud.addChild(bSheet);

  // ── энергия ──
  const energy = { v: CV.DATA.ENERGY_MAX, regenT: 0 };
  const renderEnergy = () => { energyT.text = String(energy.v); };
  renderEnergy();

  // ── таймер внимания ──
  const attStart = performance.now();
  let attShown = null;

  // ── тост ──
  const toast = (text, color = C.gold) => {
    const c = CV.makeChip(text, { size: 17, fill: 0x1d3140ee, line: color, color: 0xffffff });
    c.position.set(W() / 2 - c.w / 2, 96);
    c.zIndex = 500; layers.addChild(c); layers.sortableChildren = true;
    CV.tween(c, { y: 116 }, 200).then(() =>
      setTimeout(() => { CV.tween(c, { alpha: 0 }, 300).then(() => c.destroy()); }, 1600));
  };

  // ── карточки фактов ──
  const factLayer = new PIXI.Container();
  factLayer.eventMode = 'static';
  factLayer.visible = false;
  layers.addChild(factLayer);
  const showFacts = (st) => {
    factLayer.removeChildren().forEach(c => c.destroy({ children: true }));
    factLayer.visible = true;
    const dim = new PIXI.Graphics();
    dim.beginFill(0x12212c, 0.62); dim.drawRect(0, 0, W(), H()); dim.endFill();
    dim.eventMode = 'static';
    dim.on('pointertap', () => { factLayer.visible = false; });
    factLayer.addChild(dim);

    const nFacts = CV.t('station.' + st.id + '.name');
    const header = CV.makeText(nFacts, 30, C.paper, { display: true });
    header.anchor.set(0.5);
    header.position.set(W() / 2, 90);
    factLayer.addChild(header);
    const sub = CV.makeText(CV.t('station.' + st.id + '.sub'), 16, 0xcfe0ea);
    sub.anchor.set(0.5); sub.position.set(W() / 2, 122);
    factLayer.addChild(sub);

    const facts = [];
    for (let i = 0; i < 4; i++) {
      const t = CV.t('station.' + st.id + '.facts.' + i + '.t');
      if (t.startsWith('?')) break;
      facts.push(i);
    }
    const cardW = Math.min(640, W() - 60), cardH = Math.min(150, (H() - 360) / facts.length - 14);
    const cards = [];
    const padX = Math.round(cardW * 0.13) + 12;
    facts.forEach((fi, i) => {
      const card = new PIXI.Container();
      card._finalY = 175 + i * (cardH + 14);
      card.position.set((W() - cardW) / 2, card._finalY);
      card.visible = false;
      card.addChild(CV.makeCard(cardW, cardH));
      const t = CV.makeText(CV.t('station.' + st.id + '.facts.' + fi + '.t'), 19, C.ink, { weight: '800', wrap: true, wrapWidth: cardW - padX - 190 });
      t.position.set(padX, cardH * 0.13);
      const x = CV.makeText(CV.t('station.' + st.id + '.facts.' + fi + '.x'), 14, 0x44545e, { wrap: true, wrapWidth: cardW - padX - 190, weight: '500' });
      x.position.set(padX, cardH * 0.13 + 30);
      const chip = CV.makeChip(CV.t('station.' + st.id + '.facts.' + fi + '.c'), { size: 13, tint: 0xfff3d6 });
      chip.position.set(cardW - chip.w - padX * 0.6, cardH / 2 - chip.h / 2);
      card.addChild(t, x, chip);
      factLayer.addChild(card);
      cards.push(card);
    });
    const closeB = CV.makeButton(CV.t('common.close'), 180, { height: 52, size: 18, onTap: () => { CV.Sfx.tap(); factLayer.visible = false; } });
    closeB.position.set(W() / 2 - 90, H() - 110);
    factLayer.addChild(closeB);
    CV.cascade(cards);
  };

  // ── работник: идти и рубить ──
  const busy = { v: false };
  const walkTo = (x, y) => new Promise(res => {
    const sx = worker.x, sy = worker.y;
    const dist = Math.hypot(x - sx, y - sy);
    const ms = Math.max(300, dist * 1.1);
    const t0 = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      worker.x = sx + (x - sx) * p;
      worker.y = sy + (y - sy) * p;
      worker.scale.x = 1.15 * (x >= sx ? 1 : -1);
      if (p < 1) setTimeout(step, 16); else res();
    };
    setTimeout(step, 16);
  });
  const chopAnim = async () => {
    for (let i = 0; i < 3; i++) {
      await CV.tween(axe, { rotation: -1.5 }, 120, 'in');
      CV.Sfx.chop();
      await CV.tween(axe, { rotation: 0.35 }, 90, 'out');
      await new Promise(r => setTimeout(r, 60));
    }
    await CV.tween(axe, { rotation: 0 }, 120);
  };

  const tapStation = async (st) => {
    if (busy.v) return;
    const sv = stationViews.get(st.id);
    if (CV.State.opened.has(st.id)) { CV.Sfx.open(); showFacts(st); return; }
    if (st.id === 's7' && CV.State.ordersCount < 5) { CV.Sfx.fail(); toast(CV.t('map.fortHint')); return; }

    busy.v = true;
    const cost = CV.DATA.CHOP_COST;
    const lastPush = energy.v < cost;
    energy.v = Math.max(0, energy.v - cost);
    renderEnergy();
    if (lastPush) toast(CV.t('map.lastPush'));

    await walkTo(st.x + 44, st.y + 18);
    await chopAnim();
    CV.State.opened.add(st.id);
    CV.State.save();
    // снять туман, показать станцию
    if (sv.fog) {
      sv.icon.visible = true;
      sv.icon.alpha = 0;
      await CV.tween(sv.fog, { alpha: 0 }, 450);
      sv.fog.destroy();
      sv.fog = null;
      sv.plate.alpha = 1;
      await CV.tween(sv.icon, { alpha: 1 }, 350);
    }
    CV.Sfx.done();
    toast('✓ ' + CV.t('station.' + st.id + '.name'));
    energy.v = Math.min(CV.DATA.ENERGY_MAX, energy.v + 1); // небольшой бонус
    renderEnergy();
    await walkTo(worker.x, worker.y + 40);
    busy.v = false;
    showFacts(st);
  };

  const collectNugget = (id, view) => {
    CV.State.nuggets.add(id);
    CV.State.save();
    nuggetViews.delete(id);
    view.destroy();
    CV.Sfx.coin();
    energy.v = Math.min(CV.DATA.ENERGY_MAX, energy.v + 10);
    renderEnergy();
    const idx = [...CV.State.nuggets].length;
    toast(CV.t('map.nuggetFound', { n: idx }));
    const n = CV.t('nugget.' + id + '.t');
    if (!n.startsWith('?')) {
      const st = { id: '__nugget__' };
      // показать секретную карточку как факт
      factLayer.visible = true;
      factLayer.removeChildren().forEach(c => c.destroy({ children: true }));
      const dim = new PIXI.Graphics();
      dim.beginFill(0x12212c, 0.62); dim.drawRect(0, 0, W(), H()); dim.endFill();
      dim.eventMode = 'static'; dim.on('pointertap', () => { factLayer.visible = false; });
      factLayer.addChild(dim);
      const cardW = Math.min(600, W() - 60), cardH = 150;
      const card = new PIXI.Container();
      card._finalY = H() / 2 - cardH / 2;
      card.position.set((W() - cardW) / 2, card._finalY);
      card.visible = false;
      card.addChild(CV.makeCard(cardW, cardH));
      const nugIcon = CV.makeIcon('nugget', 40); nugIcon.position.set(20, 14);
      const t = CV.makeText(CV.t('nugget.' + id + '.t'), 20, C.goldDark, { weight: '800' });
      t.position.set(74, 18);
      const x = CV.makeText(CV.t('nugget.' + id + '.x'), 16, 0x4a5a64, { wrap: true, wrapWidth: cardW - 100, weight: '500' });
      x.position.set(24, 60);
      card.addChild(nugIcon, t, x);
      factLayer.addChild(card);
      CV.cascade([card]);
    }
  };

  // ── панель заказов ──
  const ordersLayer = new PIXI.Container();
  ordersLayer.eventMode = 'static';
  ordersLayer.visible = false;
  layers.addChild(ordersLayer);

  const buildOrders = () => {
    ordersLayer.removeChildren().forEach(c => c.destroy({ children: true }));
    const dim = new PIXI.Graphics();
    dim.beginFill(0x12212c, 0.66); dim.drawRect(0, 0, W(), H()); dim.endFill();
    dim.on('pointertap', () => toggleOrders(false));
    ordersLayer.addChild(dim);

    const panelW = Math.min(660, W() - 40);
    const panelH = Math.min(H() - 120, 130 + CV.DATA.orders.length * 150);
    const panel = CV.makePanel(panelW, panelH);
    panel.position.set((W() - panelW) / 2, 80);
    ordersLayer.addChild(panel);

    const title = CV.makeText(CV.t('hud.orders') + ' — ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount }), 26, C.ink, { display: true });
    title.anchor.set(0.5);
    title.position.set(W() / 2, 80 + 128);
    ordersLayer.addChild(title);

    CV.DATA.orders.forEach((o, i) => {
      const y = 80 + 168 + i * 146;
      const done = CV.State.ordersDone.has(o.id);
      const cardW = panelW - 244, cardH = 132;
      const card = new PIXI.Container();
      card.position.set((W() - cardW) / 2 + 62, y);
      const padX = Math.round(cardW * 0.08) + 8;
      card.addChild(CV.makeCard(cardW, cardH));
      const nameT = CV.makeText((i + 1) + '. ' + CV.t('order.' + o.id + '.name'), 18, done ? 0x2f7d4f : C.ink, { weight: '800' });
      nameT.position.set(padX, 10);
      const lineT = CV.makeText('«' + CV.t('order.' + o.id + '.line') + '»', 12, 0x44545e, { wrap: true, wrapWidth: cardW - padX * 2, weight: '500' });
      lineT.position.set(padX, 36);
      // чипы ресурсов
      const needs = [...new Set(o.needs)];
      let cx = padX;
      needs.forEach(sid => {
        const lit = CV.State.opened.has(sid);
        const chip = CV.makeChip(CV.t('station.' + sid + '.name'), { size: 10, tint: lit ? 0xd9f2e4 : 0xe8edf0, color: lit ? 0x2c5c44 : 0x5a6870 });
        chip.position.set(cx, 62);
        card.addChild(chip);
        cx += chip.w + 6;
      });
      card.addChild(nameT, lineT);

      if (done) {
        const star = CV.sprite('ui-star');
        if (star) { star.width = 34; star.height = 32; star.position.set(cardW - 48, 10); card.addChild(star); }
        else { const ok = CV.makeIcon('check', 30, 0x3f8f5f); ok.position.set(cardW - 44, 14); card.addChild(ok); }
        const rT = CV.makeText('→ ' + CV.t('order.' + o.id + '.reward'), 13, 0x2f7d4f, { weight: '700' });
        rT.position.set(padX, 100);
        card.addChild(rT);
      } else {
        const can = needs.every(sid => CV.State.opened.has(sid));
        const b = CV.makeButton(CV.t('common.yes'), 150, {
          height: 48, size: 15,
          onTap: () => { if (can) completeOrder(o); else { CV.Sfx.fail(); toast(CV.t('order.needFacts')); } },
        });
        b.position.set(cardW - 166, 42);
        if (!can) b.alpha = 0.45;
        card.addChild(b);
        const rT = CV.makeText('→ ' + CV.t('order.' + o.id + '.reward'), 12, C.goldDark, { weight: '700' });
        rT.position.set(padX, 100);
        card.addChild(rT);
      }
      ordersLayer.addChild(card);
    });

    const closeB = CV.makeButton(CV.t('common.close'), 180, { height: 52, size: 18, onTap: () => toggleOrders(false) });
    closeB.position.set(W() / 2 - 90, 80 + panelH - 60);
    ordersLayer.addChild(closeB);
  };

  const completeOrder = (o) => {
    CV.State.ordersDone.add(o.id);
    if (o.opens === 'tuner') {
      CV.State.tunerOpen = true;
      // награда — живой тюнер: открываем сразу
      toggleOrders(false);
      CV.Sfx.done();
      CV.Scenes.switchTo('tuner');
      return;
    }
    CV.State.blocksOpen.add(o.opens);
    CV.State.save();
    CV.Sfx.done();
    ordersChip.label.text = CV.t('hud.orders') + ' ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount });
    buildOrders();
    if (CV.State.ordersCount >= 5) {
      toast(CV.t('order.allDone'));
      // снять туман с форта
      const fv = stationViews.get('s7');
      if (fv.fog) {
        fv.icon.visible = true;
        fv.icon.alpha = 0;
        CV.tween(fv.fog, { alpha: 0 }, 600).then(() => {
          if (fv.fog) { fv.fog.destroy(); fv.fog = null; }
          CV.tween(fv.icon, { alpha: 1 }, 400);
        });
        fv.plate.alpha = 1;
      }
    } else toast(CV.t('order.done') + ' → ' + CV.t('order.' + o.id + '.reward'));
  };

  const toggleOrders = (show) => {
    if (show) buildOrders();
    ordersLayer.visible = show;
  };

  // ── update ──
  return {
    update(dt) {
      // регенерация энергии
      energy.regenT += dt * 1000;
      while (energy.regenT >= CV.DATA.ENERGY_REGEN_MS && energy.v < CV.DATA.ENERGY_MAX) {
        energy.regenT -= CV.DATA.ENERGY_REGEN_MS;
        energy.v++;
        renderEnergy();
      }
      // таймер внимания
      const att = Math.floor((performance.now() - attStart) / 1000);
      if (att !== attShown) {
        attShown = att;
        attT.text = CV.t('hud.attention', { s: att });
      }
      // снег/туман лёгкий дрейф
      stationViews.forEach(sv => { if (sv.fog) sv.fog.update(dt); });
      // покачивание самородков
      nuggetViews.forEach(c => { c.y += Math.sin(performance.now() / 400 + c.x) * 0.08; });
    },
  };
};
