// ── сцена «Карта дела»: лист дела с участками, депеши, улики, метка «вы здесь» ──
CV.scenes = CV.scenes || {};

// состояние кампании (живёт в сессии, дублируется в localStorage)
CV.State = {
  opened: new Set(),     // id вскрытых участков
  ordersDone: new Set(), // id исполненных депеш
  blocksOpen: new Set(), // блоки личного дела
  nuggets: new Set(),    // id собранных улик
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

  // ── стол ──
  const bg = new PIXI.Graphics();
  bg.beginFill(C.desk); bg.drawRect(0, 0, W(), H()); bg.endFill();
  layers.addChild(bg);

  // ── лист дела ──
  const sheet = CV.makePanel(668, 1148, { inner: false });
  sheet.position.set((W() - 668) / 2, 84);
  layers.addChild(sheet);

  // водяной знак «карта дела»
  const wm = CV.makeText(CV.t('hud.caseNo'), 15, C.aging, { ls: 8, upper: true });
  wm.alpha = 0.5;
  wm.position.set(sheet.x + 30, sheet.y + 22);
  layers.addChild(wm);

  // маршрут: пунктир чернилами
  const road = new PIXI.Graphics();
  road.setStrokeStyle({ width: 2, color: C.ink, alpha: 0.4 });
  const path = CV.DATA.stations.map(s => [s.x, s.y]);
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i], [x2, y2] = path[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1), steps = Math.floor(len / 18);
    for (let j = 0; j < steps; j++) {
      const a = j / steps, b = a + 0.45 / steps;
      road.moveTo(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a);
      road.lineTo(x1 + (x2 - x1) * b, y1 + (y2 - y1) * b);
    }
  }
  road.stroke();
  layers.addChild(road);

  // ── участки ──
  const TW = 168, TH = 56;
  const stationViews = new Map();
  const buildTile = (st, isOpen) => {
    const cont = new PIXI.Container();
    const g = new PIXI.Graphics();
    if (isOpen) {
      g.beginFill(C.paperLight); g.drawRect(0, 0, TW, TH); g.endFill();
      g.beginFill(C.stamp); g.drawRect(0, TH - 3, TW, 3); g.endFill();
      g.setStrokeStyle({ width: 1, color: 0x9b8f74 }); g.drawRect(0.5, 0.5, TW - 1, TH - 1); g.stroke();
    } else {
      g.beginFill(C.tile); g.drawRect(0, 0, TW, TH); g.endFill();
      g.setStrokeStyle({ width: 1, color: C.line }); g.drawRect(0.5, 0.5, TW - 1, TH - 1); g.stroke();
    }
    cont.addChild(g);
    if (!isOpen) {
      const hatch = CV.makeHatch(TW, TH);
      cont.addChild(hatch);
    }
    // имя
    const nameT = CV.makeText(CV.t('station.' + st.id + '.name'), 11.5,
      isOpen ? C.ink : C.grey, { weight: isOpen ? '700' : '400', upper: isOpen });
    nameT.anchor.set(0.5);
    nameT.position.set(TW / 2 + (isOpen ? 10 : 0), isOpen ? 18 : TH / 2);
    if (nameT.width > TW - (isOpen ? 52 : 30)) nameT.scale.set((TW - (isOpen ? 52 : 30)) / nameT.width);
    cont.addChild(nameT);
    // пиктограмма у вскрытых
    if (isOpen) {
      const ic = CV.makeIcon(st.kind, 22, C.ink);
      ic.position.set(10, TH / 2 - 11);
      cont.addChild(ic);
      const sub = CV.makeStamp(CV.t('map.openStamp'), { size: 8, thick: 2, padX: 6, padY: 2, rotation: -7 * Math.PI / 180, alpha: 0.8 });
      sub.position.set(TW - sub.w / 2 - 8, TH - sub.h / 2 - 6);
      cont.addChild(sub);
    } else {
      const closed = CV.makeStamp(CV.t('map.closed'), { size: 9, thick: 2, padX: 7, padY: 2, rotation: -7 * Math.PI / 180, alpha: 0.75 });
      closed.position.set(TW - closed.w / 2 - 10, TH - closed.h / 2 - 7);
      cont.addChild(closed);
    }
    return cont;
  };
  for (const st of CV.DATA.stations) {
    const opened = CV.State.opened.has(st.id);
    const cont = buildTile(st, opened);
    cont.position.set(st.x - TW / 2, st.y - TH / 2);
    cont.eventMode = 'static'; cont.cursor = 'pointer';
    cont.on('pointerover', () => { if (!CV.State.opened.has(st.id)) cont.alpha = 0.86; });
    cont.on('pointerout', () => { cont.alpha = 1; });
    cont.on('pointertap', () => tapStation(st));
    layers.addChild(cont);
    stationViews.set(st.id, { cont, st });
  }

  // ── улики ──
  const clueViews = new Map();
  for (const n of CV.DATA.nuggets) {
    if (CV.State.nuggets.has(n.id)) continue;
    const c = new PIXI.Container();
    const ring = new PIXI.Graphics();
    ring.circle(0, 0, 11); ring.stroke({ width: 2, color: C.stamp });
    ring.circle(0, 0, 3.4); ring.stroke({ width: 1.4, color: C.stamp, alpha: 0.6 });
    const q = CV.makeText('?', 13, C.stamp, { weight: '700' });
    q.anchor.set(0.5); q.position.set(0, -1);
    c.addChild(ring, q);
    c.position.set(n.x, n.y);
    c.eventMode = 'static'; c.cursor = 'pointer';
    c.on('pointertap', () => collectClue(n.id, c));
    layers.addChild(c);
    clueViews.set(n.id, c);
  }

  // ── метка «вы здесь» ──
  const worker = new PIXI.Container();
  const pin = new PIXI.Graphics();
  pin.beginFill(C.stamp); pin.drawCircle(0, 0, 6); pin.endFill();
  pin.circle(0, 0, 10); pin.stroke({ width: 2, color: C.stamp, alpha: 0.55 });
  const hereT = CV.makeText(CV.t('map.youAreHere'), 10, C.stamp, { ls: 2, upper: true });
  hereT.anchor.set(0.5, 1); hereT.position.set(0, -16);
  worker.addChild(pin, hereT);
  worker.position.set(190, 380);
  layers.addChild(worker);

  // ── HUD: служебная полоса дела ──
  const hud = new PIXI.Container();
  const hudBg = new PIXI.Graphics();
  hudBg.beginFill(C.panel, 0.97); hudBg.drawRect(0, 0, W(), 56); hudBg.endFill();
  hudBg.beginFill(C.line); hudBg.drawRect(0, 55, W(), 1); hudBg.endFill();
  hud.addChild(hudBg);
  layers.addChild(hud);

  const caseT = CV.makeText(CV.t('hud.caseNo'), 11, C.grey, { ls: 4, upper: true });
  caseT.position.set(20, 24); caseT.anchor.set(0, 0.5);
  hud.addChild(caseT);

  const zapIc = CV.makeIcon('zap', 20, C.gold);
  zapIc.position.set(150, 18);
  const energyT = CV.makeText('30', 17, C.paper, { weight: '700' });
  energyT.anchor.set(0, 0.5); energyT.position.set(174, 28);
  hud.addChild(zapIc, energyT);

  const attT = CV.makeText(CV.t('hud.attention', { s: 0 }), 11, C.grey, { upper: true, ls: 1 });
  attT.anchor.set(0, 0.5); attT.position.set(230, 28);
  hud.addChild(attT);

  let ordersChip = CV.makeChip(CV.t('hud.orders') + ' ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount }), { ghost: true, size: 11, upper: true, padX: 12 });
  ordersChip.eventMode = 'static'; ordersChip.cursor = 'pointer';
  ordersChip.on('pointertap', () => { CV.Sfx.open(); toggleOrders(true); });
  ordersChip.position.set(W() - 340, 15);
  hud.addChild(ordersChip);

  const bPdf = CV.makeIcon('pdf', 26, C.paper);
  bPdf.eventMode = 'static'; bPdf.cursor = 'pointer';
  bPdf.position.set(W() - 224, 15);
  bPdf.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); });
  hud.addChild(bPdf);

  const bFile = CV.makeButton(CV.t('hud.file'), 152, { height: 34, size: 11, ghost: true, onTap: () => { CV.Sfx.open(); CV.Scenes.switchTo('sheet'); } });
  bFile.position.set(W() - 178, 11);
  hud.addChild(bFile);

  // ── энергия ──
  const energy = { v: CV.DATA.ENERGY_MAX, regenT: 0 };
  const renderEnergy = () => { energyT.text = String(energy.v); };
  renderEnergy();

  const attStart = performance.now();
  let attShown = null;

  // ── тост ──
  const toast = (text) => {
    const c = CV.makeChip(text, { ghost: true, line: C.stamp, color: C.paperLight, size: 13, padX: 16 });
    c.position.set(W() / 2 - c.w / 2, 74);
    c.zIndex = 500; layers.addChild(c); layers.sortableChildren = true;
    CV.tween(c, { y: 88 }, 200).then(() =>
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
    dim.beginFill(C.deep, 0.78); dim.drawRect(0, 0, W(), H()); dim.endFill();
    dim.eventMode = 'static';
    dim.on('pointertap', () => { factLayer.visible = false; });
    factLayer.addChild(dim);

    const panel = CV.makePanel(640, 660, { light: true });
    panel.position.set((W() - 640) / 2, 190);
    factLayer.addChild(panel);

    const header = CV.makeText(CV.t('station.' + st.id + '.name'), 30, C.ink, { head: true, weight: '700', upper: true });
    header.anchor.set(0.5, 0);
    header.position.set(W() / 2, 236);
    if (header.width > 560) header.scale.set(560 / header.width);
    factLayer.addChild(header);
    const sub = CV.makeText('— ' + CV.t('station.' + st.id + '.sub'), 13, C.ink60);
    sub.anchor.set(0.5, 0); sub.position.set(W() / 2, 276);
    factLayer.addChild(sub);

    const facts = [];
    for (let i = 0; i < 4; i++) {
      const t = CV.t('station.' + st.id + '.facts.' + i + '.t');
      if (t.startsWith('?')) break;
      facts.push(i);
    }
    const cards = [];
    const cardW = 552, cardH = 96;
    facts.forEach((fi, i) => {
      const card = new PIXI.Container();
      card._finalY = 312 + i * (cardH + 14);
      card.position.set((W() - cardW) / 2, card._finalY);
      card.visible = false;
      card.addChild(CV.makeCard(cardW, cardH, { red: true }));
      const t = CV.makeText(CV.t('station.' + st.id + '.facts.' + fi + '.t'), 15, C.ink, { weight: '700' });
      t.position.set(24, 12);
      if (t.width > cardW - 48) t.scale.set((cardW - 48) / t.width);
      const x = CV.makeText(CV.t('station.' + st.id + '.facts.' + fi + '.x'), 11.5, C.ink60, { wrap: true, wrapWidth: cardW - 190, ls: 0 });
      x.position.set(24, 36);
      const chip = CV.makeChip(CV.t('station.' + st.id + '.facts.' + fi + '.c'), { size: 10 });
      chip.position.set(cardW - chip.w - 16, cardH - chip.h - 12);
      card.addChild(t, x, chip);
      factLayer.addChild(card);
      cards.push(card);
    });
    const closeB = CV.makeButton(CV.t('common.close'), 190, { height: 52, size: 14, ghost: true, onTap: () => { CV.Sfx.tap(); factLayer.visible = false; } });
    closeB.position.set(W() / 2 - 95, 890);
    factLayer.addChild(closeB);
    CV.cascade(cards);
  };

  // ── метка: идти и шлёпать штамп ──
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
      if (p < 1) setTimeout(step, 16); else res();
    };
    setTimeout(step, 16);
  });

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

    await walkTo(st.x, st.y + 40);
    // шлепок штампа на участок
    CV.Sfx.chop();
    CV.State.opened.add(st.id);
    CV.State.save();
    const idx = sv.cont.parent.getChildIndex(sv.cont);
    const fresh = buildTile(st, true);
    fresh.position.copyFrom(sv.cont.position);
    layers.addChildAt(fresh, idx);
    sv.cont.destroy({ children: true });
    sv.cont = fresh;
    const slam = CV.makeStamp(CV.t('map.openStamp'), { size: 16, thick: 4, padX: 14, padY: 6, rotation: -8 * Math.PI / 180 });
    slam.position.set(st.x, st.y);
    slam.visible = false;
    layers.addChild(slam);
    await CV.stampSlam(slam);
    CV.Sfx.done();
    toast('✓ ' + CV.t('station.' + st.id + '.name'));
    await new Promise(r => setTimeout(r, 650));
    slam.destroy();
    energy.v = Math.min(CV.DATA.ENERGY_MAX, energy.v + 1); // небольшой бонус
    renderEnergy();
    busy.v = false;
    showFacts(st);
  };

  const collectClue = (id, view) => {
    CV.State.nuggets.add(id);
    CV.State.save();
    clueViews.delete(id);
    view.destroy();
    CV.Sfx.coin();
    energy.v = Math.min(CV.DATA.ENERGY_MAX, energy.v + 10);
    renderEnergy();
    const idx = [...CV.State.nuggets].length;
    toast(CV.t('map.clueFound', { n: idx }));
    const n = CV.t('nugget.' + id + '.t');
    if (!n.startsWith('?')) {
      factLayer.visible = true;
      factLayer.removeChildren().forEach(c => c.destroy({ children: true }));
      const dim = new PIXI.Graphics();
      dim.beginFill(C.deep, 0.78); dim.drawRect(0, 0, W(), H()); dim.endFill();
      dim.eventMode = 'static'; dim.on('pointertap', () => { factLayer.visible = false; });
      factLayer.addChild(dim);
      const panel = CV.makePanel(600, 240, { light: true });
      panel.position.set((W() - 600) / 2, H() / 2 - 140);
      factLayer.addChild(panel);
      const stamp = CV.makeStamp(CV.t('map.clueFound', { n: idx }), { size: 12 });
      stamp.scale.set(2.2);
      stamp.position.set(W() / 2 - stamp.w / 2 + 130, H() / 2 - 96);
      factLayer.addChild(stamp);
      const ic = CV.makeIcon('clue', 30, C.stamp);
      ic.position.set((W() - 600) / 2 + 40, H() / 2 - 96);
      const t = CV.makeText(CV.t('nugget.' + id + '.t'), 16, C.ink, { weight: '700' });
      t.position.set((W() - 600) / 2 + 84, H() / 2 - 92);
      const x = CV.makeText(CV.t('nugget.' + id + '.x'), 13, C.ink60, { wrap: true, wrapWidth: 480 });
      x.position.set((W() - 600) / 2 + 60, H() / 2 - 48);
      factLayer.addChild(ic, t, x);
      CV.tween(stamp.scale, { x: 1, y: 1 }, 300, 'back');
    }
  };

  // ── панель депеш ──
  const ordersLayer = new PIXI.Container();
  ordersLayer.eventMode = 'static';
  ordersLayer.visible = false;
  layers.addChild(ordersLayer);

  const buildOrders = () => {
    ordersLayer.removeChildren().forEach(c => c.destroy({ children: true }));
    const dim = new PIXI.Graphics();
    dim.beginFill(C.deep, 0.8); dim.drawRect(0, 0, W(), H()); dim.endFill();
    dim.on('pointertap', () => toggleOrders(false));
    ordersLayer.addChild(dim);

    const panelW = 660;
    const panelH = Math.min(H() - 130, 150 + CV.DATA.orders.length * 148);
    const panel = CV.makePanel(panelW, panelH);
    panel.position.set((W() - panelW) / 2, 96);
    ordersLayer.addChild(panel);

    const title = CV.makeText(CV.t('map.ordersTitle') + ' — ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount }), 28, C.ink, { head: true, weight: '700', upper: true });
    title.anchor.set(0.5, 0);
    title.position.set(W() / 2, 128);
    ordersLayer.addChild(title);

    CV.DATA.orders.forEach((o, i) => {
      const y = 196 + i * 142;
      const done = CV.State.ordersDone.has(o.id);
      const cardW = panelW - 100, cardH = 128;
      const card = new PIXI.Container();
      card.position.set((W() - cardW) / 2, y);
      card.addChild(CV.makeCard(cardW, cardH, { red: true }));
      // строка телеграфа
      const cut = CV.makeText('✂ ─────────────', 10, C.ink40, { ls: 3 });
      cut.position.set(24, 8);
      const nameT = CV.makeText((i + 1) + '. ' + CV.t('order.' + o.id + '.name'), 15, done ? C.ink40 : C.ink, { weight: '700' });
      nameT.position.set(24, 28);
      if (nameT.width > cardW - 200) nameT.scale.set((cardW - 200) / nameT.width);
      const lineT = CV.makeText('«' + CV.t('order.' + o.id + '.line') + '»', 11, C.ink60, { wrap: true, wrapWidth: cardW - 220 });
      lineT.position.set(24, 52);
      // чипы участков
      const needs = [...new Set(o.needs)];
      let cx = 24;
      needs.forEach(sid => {
        const lit = CV.State.opened.has(sid);
        const chip = CV.makeChip(CV.t('station.' + sid + '.name'), { size: 9.5, padX: 7 });
        if (!lit) chip.alpha = 0.45;
        chip.position.set(cx, 78);
        if (cx + chip.w > cardW - 130) { chip.visible = false; }
        card.addChild(chip);
        cx += chip.w + 6;
      });
      card.addChild(cut, nameT, lineT);

      if (done) {
        const st = CV.makeStamp(CV.t('order.done'), { size: 11, thick: 2, padX: 8, padY: 3, rotation: -7 * Math.PI / 180, alpha: 0.85 });
        st.position.set(cardW - st.w / 2 - 24, cardH / 2);
        card.addChild(st);
        const rT = CV.makeText('→ ' + CV.t('order.' + o.id + '.reward'), 11, C.ink40, { weight: '700' });
        rT.position.set(24, 104);
        card.addChild(rT);
      } else {
        const can = needs.every(sid => CV.State.opened.has(sid));
        const b = CV.makeButton(CV.t('order.execute'), 132, {
          height: 40, size: 11,
          onTap: () => { if (can) completeOrder(o); else { CV.Sfx.fail(); toast(CV.t('order.needFacts')); } },
        });
        b.position.set(cardW - 152, 24);
        if (!can) b.alpha = 0.45;
        card.addChild(b);
        const rT = CV.makeText('→ ' + CV.t('order.' + o.id + '.reward'), 11, C.goldDeep, { weight: '700' });
        rT.position.set(24, 104);
        card.addChild(rT);
      }
      ordersLayer.addChild(card);
    });

    const closeB = CV.makeButton(CV.t('common.close'), 190, { height: 50, size: 14, ghost: true, onTap: () => toggleOrders(false) });
    closeB.position.set(W() / 2 - 95, 84 + panelH + 18);
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
    // пересобираем чип: число депеш изменилось
    const rebuilt = CV.makeChip(CV.t('hud.orders') + ' ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount }), { ghost: true, size: 11, upper: true, padX: 12 });
    rebuilt.eventMode = 'static'; rebuilt.cursor = 'pointer';
    rebuilt.on('pointertap', () => { CV.Sfx.open(); toggleOrders(true); });
    rebuilt.position.copyFrom(ordersChip.position);
    hud.addChildAt(rebuilt, hud.getChildIndex(ordersChip));
    ordersChip.destroy();
    ordersChip = rebuilt;
    buildOrders();
    if (CV.State.ordersCount >= 5) {
      toast(CV.t('order.allDone'));
    } else toast(CV.t('order.done') + ' → ' + CV.t('order.' + o.id + '.reward'));
  };

  const toggleOrders = (show) => {
    if (show) buildOrders();
    ordersLayer.visible = show;
  };

  // виньетка поверх карты, но под HUD и оверлеями
  layers.addChildAt(CV.makeVignette(app, 0.34), layers.children.length - 3);

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
      // лёгкое покачивание улик
      clueViews.forEach(c => { c.y += Math.sin(performance.now() / 400 + c.x) * 0.08; });
    },
  };
};
