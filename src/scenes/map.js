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

  // ── дневной фон: небо, горы, снег ──
  const bg = new PIXI.Graphics();
  const drawBg = () => {
    bg.clear();
    bg.beginFill(0xBFD5E1); bg.drawRect(0, 0, W(), H()); bg.endFill();
    bg.beginFill(0xD3E3EC); bg.drawRect(0, 0, W(), H() * 0.35); bg.endFill();
    // горы
    bg.beginFill(0x9FB8C9);
    bg.drawPolygon([-30, 330, 120, 170, 260, 330]);
    bg.drawPolygon([180, 330, 380, 130, 560, 330]);
    bg.drawPolygon([440, 330, 620, 180, 780, 330]);
    bg.endFill();
    bg.beginFill(0xffffff, 0.75);
    bg.drawPolygon([104, 205, 120, 170, 138, 205]);
    bg.drawPolygon([352, 172, 380, 130, 410, 172]);
    bg.drawPolygon([596, 216, 620, 180, 646, 216]);
    bg.endFill();
    // снежное поле
    bg.beginFill(0xE7F0F5); bg.drawRect(0, 320, W(), H() - 320); bg.endFill();
    bg.beginFill(C.snow); bg.drawRect(0, 360, W(), H() - 360); bg.endFill();
    bg.beginFill(0xf6fafc, 0.8);
    for (let y = 400; y < H() + 60; y += 74)
      for (let x = ((y / 74) % 2) * 60 - 60; x < W() + 80; x += 150)
        bg.ellipse(x + ((y * 13) % 40), y + ((x * 7) % 30), 88, 20);
    bg.endFill();
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

  // ели
  const pines = new PIXI.Container();
  const pine = (x, y, s) => {
    const g = new PIXI.Graphics();
    g.beginFill(0x3d2606); g.drawRect(x - 3 * s, y, 6 * s, 12 * s); g.endFill();
    for (let i = 0; i < 3; i++) {
      const w = (44 - i * 10) * s, yy = y - i * 20 * s;
      g.beginFill(C.taiga); g.drawPolygon([x, yy - 34 * s, x + w / 2, yy, x - w / 2, yy]); g.endFill();
      g.beginFill(0xffffff, 0.85); g.drawPolygon([x, yy - 34 * s, x + w * 0.16, yy - 22 * s, x - w * 0.16, yy - 22 * s]); g.endFill();
    }
    pines.addChild(g);
  };
  [[70, 380, 1], [660, 400, 1.15], [40, 640, 0.9], [680, 700, 1], [80, 1000, 1.1], [640, 1120, 0.95], [200, 1180, 0.9], [560, 980, 0.85]].forEach(a => pine(...a));
  layers.addChild(pines);

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

  // ── HUD ──
  const hud = new PIXI.Container();
  layers.addChild(hud);
  const hudPanel = CV.makePanel(W() - 24, 64, { radius: 16 });
  hudPanel.position.set(12, 12);
  hud.addChild(hudPanel);

  const boltIcon = CV.makeIcon('bolt', 26, C.gold);
  boltIcon.position.set(34, 28);
  const energyT = CV.makeText('30', 22, C.ink, { weight: '800' });
  energyT.anchor.set(0, 0.5); energyT.position.set(56, 44);
  hud.addChild(boltIcon, energyT);

  const attIcon = CV.makeIcon('coin', 24);
  attIcon.position.set(150, 28);
  const attT = CV.makeText(CV.t('hud.attention', { s: 0 }), 15, C.ink, { weight: '700' });
  attT.anchor.set(0, 0.5); attT.position.set(178, 44);
  hud.addChild(attIcon, attT);

  const ordersChip = CV.makeChip(CV.t('hud.orders') + ' ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount }), { size: 16, fill: 0xf4e9d3 });
  ordersChip.eventMode = 'static'; ordersChip.cursor = 'pointer';
  ordersChip.on('pointertap', () => { CV.Sfx.open(); toggleOrders(true); });
  ordersChip.position.set(W() - 300, 24);
  hud.addChild(ordersChip);

  const bPdf = CV.makeIcon('pdf', 36);
  bPdf.eventMode = 'static'; bPdf.cursor = 'pointer';
  bPdf.position.set(W() - 178, 24);
  bPdf.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); });
  hud.addChild(bPdf);

  const bSheet = CV.makeButton(CV.t('sheet.title'), 120, { height: 44, size: 15, onTap: () => { CV.Sfx.open(); CV.Scenes.switchTo('sheet'); } });
  bSheet.position.set(W() - 132, 22);
  hud.addChild(bSheet);

  const bTuner = CV.makeButton('TUNER', 120, { height: 44, size: 15, onTap: () => { CV.Sfx.open(); CV.Scenes.switchTo('tuner'); } });
  bTuner.position.set(W() - 262, 22);
  bTuner.visible = CV.State.tunerOpen;
  hud.addChild(bTuner);

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
    const cardW = Math.min(640, W() - 60), cardH = Math.min(118, (H() - 320) / facts.length - 18);
    const cards = [];
    facts.forEach((fi, i) => {
      const card = new PIXI.Container();
      card._finalY = 170 + i * (cardH + 18);
      card.position.set((W() - cardW) / 2, card._finalY);
      card.visible = false;
      card.addChild(CV.makeCard(cardW, cardH));
      const t = CV.makeText(CV.t('station.' + st.id + '.facts.' + fi + '.t'), 19, C.ink, { weight: '800', wrap: true, wrapWidth: cardW - 210 });
      t.position.set(20, 14);
      const x = CV.makeText(CV.t('station.' + st.id + '.facts.' + fi + '.x'), 15, 0x4a5a64, { wrap: true, wrapWidth: cardW - 210, weight: '500' });
      x.position.set(20, 44);
      const chip = CV.makeChip(CV.t('station.' + st.id + '.facts.' + fi + '.c'), { size: 13, fill: 0xE8A93D22, line: C.goldDark });
      chip.position.set(cardW - chip.w - 18, cardH / 2 - chip.h / 2);
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
    const panelH = Math.min(H() - 160, 130 + CV.DATA.orders.length * 150);
    const panel = CV.makePanel(panelW, panelH);
    panel.position.set((W() - panelW) / 2, 120);
    ordersLayer.addChild(panel);

    const title = CV.makeText(CV.t('hud.orders') + ' — ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount }), 26, C.paper, { display: true });
    title.anchor.set(0.5);
    title.position.set(W() / 2, 120 + 42);
    ordersLayer.addChild(title);

    CV.DATA.orders.forEach((o, i) => {
      const y = 120 + 84 + i * 148;
      const done = CV.State.ordersDone.has(o.id);
      const cardW = panelW - 44, cardH = 130;
      const card = new PIXI.Container();
      card.position.set((W() - cardW) / 2, y);
      card.addChild(CV.makeCard(cardW, cardH));
      const nameT = CV.makeText((i + 1) + '. ' + CV.t('order.' + o.id + '.name'), 19, done ? 0x3f8f5f : C.ink, { weight: '800' });
      nameT.position.set(18, 12);
      const lineT = CV.makeText('«' + CV.t('order.' + o.id + '.line') + '»', 14, 0x4a5a64, { wrap: true, wrapWidth: cardW - 190, weight: '500' });
      lineT.position.set(18, 40);
      // чипы ресурсов
      const needs = [...new Set(o.needs)];
      let cx = 18;
      const chips = [];
      needs.forEach(sid => {
        const lit = CV.State.opened.has(sid);
        const chip = CV.makeChip(CV.t('station.' + sid + '.name'), { size: 12, fill: lit ? 0x3f8f5f22 : 0x00000010, line: lit ? 0x3f8f5f : 0x9aa7af, color: lit ? 0x2c5c44 : 0x5a6870 });
        chip.position.set(cx, 66);
        card.addChild(chip);
        cx += chip.w + 8;
      });
      card.addChild(nameT, lineT);

      if (done) {
        const star = CV.sprite('star');
        if (star) { star.width = 34; star.height = 34; star.position.set(cardW - 52, 12); card.addChild(star); }
        else { const ok = CV.makeIcon('check', 30, 0x3f8f5f); ok.position.set(cardW - 50, 16); card.addChild(ok); }
        const rT = CV.makeText('→ ' + CV.t('order.' + o.id + '.reward'), 14, 0x3f8f5f, { weight: '700' });
        rT.position.set(18, 96);
        card.addChild(rT);
      } else {
        const can = needs.every(sid => CV.State.opened.has(sid));
        const b = CV.makeButton(can ? CV.t('common.yes') : CV.t('order.needFacts'), 190, {
          height: 44, size: 14, danger: !can,
          onTap: () => { if (can) completeOrder(o); else CV.Sfx.fail(); },
        });
        b.position.set(cardW - 210, 74);
        card.addChild(b);
        const rT = CV.makeText('→ ' + CV.t('order.' + o.id + '.reward'), 13, C.goldDark, { weight: '700' });
        rT.position.set(18, 96);
        card.addChild(rT);
      }
      ordersLayer.addChild(card);
    });

    const closeB = CV.makeButton(CV.t('common.close'), 180, { height: 52, size: 18, onTap: () => toggleOrders(false) });
    closeB.position.set(W() / 2 - 90, H() - 150);
    ordersLayer.addChild(closeB);
  };

  const completeOrder = (o) => {
    CV.State.ordersDone.add(o.id);
    if (o.opens === 'tuner') { CV.State.tunerOpen = true; bTuner.visible = true; }
    else CV.State.blocksOpen.add(o.opens);
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
