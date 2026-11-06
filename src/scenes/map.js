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
  const L = CV.layout();
  const { W, H, phone, fs, headerH } = L;
  const C = CV.COLORS;
  const layers = new PIXI.Container();
  layers.sortableChildren = true;
  view.addChild(layers);

  // ── стол ──
  const bg = new PIXI.Graphics();
  bg.beginFill(C.desk); bg.drawRect(0, 0, W, H); bg.endFill();
  layers.addChild(bg);

  // ── лист дела: во всю доступную ширину ──
  const sheetW = Math.min(W - L.pad * 2, phone ? W - L.pad * 2 : 980);
  const sheetX = Math.round((W - sheetW) / 2);
  const sheetY = headerH + 8;
  const sheetH = H - sheetY - 8;
  const sheet = CV.makePanel(sheetW, sheetH, { inner: false });
  sheet.position.set(sheetX, sheetY);
  layers.addChild(sheet);

  // ── раскладка участков: на телефоне — вертикальная тропа, на ПК — змейка 2×4 ──
  const slots = [];
  const stationSlot = new Map();
  const stList = CV.DATA.stations;

  if (phone) {
    const top = sheetY + 44;
    const bottom = sheetY + sheetH - 44;
    const avail = Math.max(300, bottom - top);
    let tileH = Math.min(68, Math.max(50, avail / 7 - 12));
    let gap = (avail - 7 * tileH) / 6;
    if (gap < 8) { tileH = Math.max(46, tileH - (8 - gap)); gap = (avail - 7 * tileH) / 6; }
    const tileW = sheetW - 52;
    stList.forEach((st, i) => {
      const x = i === 6 ? sheetX + (sheetW - tileW) / 2 : sheetX + 18 + (i % 2 ? 14 : 0);
      const y = top + i * (tileH + gap);
      const slot = { x, y, w: tileW, h: tileH, cx: x + tileW / 2, cy: y + tileH / 2 };
      slots.push(slot); stationSlot.set(st.id, slot);
    });
  } else {
    const top = sheetY + 56;
    const bottom = sheetY + sheetH - 58;
    const avail = Math.max(320, bottom - top);
    let tileH = Math.min(78, Math.max(54, avail / 4 - 34));
    let gap = (avail - 4 * tileH) / 3;
    if (gap < 30) { tileH = Math.max(48, tileH - (30 - gap)); gap = (avail - 4 * tileH) / 3; }
    const tileW = Math.min(360, (sheetW - 160) / 2);
    const totalW = tileW * 2 + 40;
    const startX = sheetX + (sheetW - totalW) / 2;
    const colX = [startX, startX + tileW + 40];
    const rowY = i => top + i * (tileH + gap);
    const put = (i, x, row) => {
      const slot = { x, y: rowY(row), w: tileW, h: tileH, cx: x + tileW / 2, cy: rowY(row) + tileH / 2 };
      slots.push(slot); stationSlot.set(stList[i].id, slot);
    };
    put(0, colX[0], 0); put(1, colX[1], 0);
    put(2, colX[1], 1); put(3, colX[0], 1);
    put(4, colX[0], 2); put(5, colX[1], 2);
    put(6, sheetX + (sheetW - tileW) / 2, 3);
  }

  // поле: контейнер под маршрут/плитки/улики
  const field = new PIXI.Container();
  field.zIndex = 10;
  layers.addChild(field);

  // маршрут: пунктир чернилами
  const road = new PIXI.Graphics();
  road.setStrokeStyle({ width: 1.8, color: C.ink, alpha: 0.36 });
  const dashSeg = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1), steps = Math.max(1, Math.floor(len / 15));
    for (let j = 0; j < steps; j++) {
      const a = j / steps, b = a + 0.46 / steps;
      road.moveTo(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a);
      road.lineTo(x1 + (x2 - x1) * b, y1 + (y2 - y1) * b);
    }
  };
  for (let i = 0; i < slots.length - 1; i++) dashSeg(slots[i].cx, slots[i].cy, slots[i + 1].cx, slots[i + 1].cy);
  road.stroke();
  field.addChild(road);

  // ── плитки участков ──
  const stationViews = new Map();
  const buildTile = (st, isOpen) => {
    const slot = stationSlot.get(st.id);
    const tw = slot.w, th = slot.h;
    const cont = new PIXI.Container();
    const g = new PIXI.Graphics();
    if (isOpen) {
      g.beginFill(C.ink, 0.22); g.drawRect(2, 3, tw, th); g.endFill();
      g.beginFill(C.paperLight); g.drawRect(0, 0, tw, th); g.endFill();
      g.beginFill(C.stamp); g.drawRect(0, th - 3, tw, 3); g.endFill();
      g.setStrokeStyle({ width: 1, color: 0x9b8f74 }); g.drawRect(0.5, 0.5, tw - 1, th - 1); g.stroke();
    } else {
      g.beginFill(C.tile); g.drawRect(0, 0, tw, th); g.endFill();
      g.setStrokeStyle({ width: 1, color: C.line }); g.drawRect(0.5, 0.5, tw - 1, th - 1); g.stroke();
    }
    cont.addChild(g);
    if (!isOpen) cont.addChild(CV.makeHatch(tw, th));

    const compact = th < 50;
    const iconSize = compact ? 18 : (phone ? 22 : 25);
    const ic = CV.makeIcon(st.kind, iconSize, isOpen ? C.ink : C.grey);
    ic.position.set(12, th / 2 - iconSize / 2);
    cont.addChild(ic);

    const nameMax = tw - iconSize - (compact ? 28 : 40);
    const nameT = CV.makeText(CV.t('station.' + st.id + '.name'), compact ? 13.5 : (phone ? 15 : 16.5),
      isOpen ? C.ink : C.grey, { weight: isOpen ? '700' : '400', upper: isOpen });
    nameT.anchor.set(0, 0.5);
    nameT.position.set(12 + iconSize + 10, compact ? th / 2 : th / 2 - (phone ? 7 : 8));
    CV.fitText(nameT, nameMax);
    cont.addChild(nameT);

    if (!compact) {
      const stamp = isOpen
        ? CV.makeStamp(CV.t('map.openStamp'), { size: 8, thick: 2, padX: 6, padY: 2, rotation: -7 * Math.PI / 180, alpha: 0.82 })
        : CV.makeStamp(CV.t('map.closed'), { size: 8, thick: 2, padX: 6, padY: 2, rotation: -7 * Math.PI / 180, alpha: 0.7 });
      CV.placeStamp(stamp, tw - stamp.w - 8, th - stamp.h - 5);
      cont.addChild(stamp);
    }

    cont.hitArea = new PIXI.Rectangle(0, 0, tw, th);
    return cont;
  };

  // если 5/5, форт вскрывается сам — даже в старом сохранении
  const fortAutoOpened = CV.State.ordersCount >= 5 && !CV.State.opened.has('s7');
  if (fortAutoOpened) { CV.State.opened.add('s7'); CV.State.save(); }

  for (const st of stList) {
    const slot = stationSlot.get(st.id);
    const opened = CV.State.opened.has(st.id);
    const cont = buildTile(st, opened);
    cont.position.set(slot.x, slot.y);
    cont.eventMode = 'static'; cont.cursor = 'pointer';
    cont.on('pointerover', () => { if (!CV.State.opened.has(st.id)) cont.alpha = 0.86; });
    cont.on('pointerout', () => { cont.alpha = 1; });
    cont.on('pointertap', () => tapStation(st));
    field.addChild(cont);
    stationViews.set(st.id, { cont, st, slot });
  }

  // ── улики: в просветах между участками, крупная тач-цель ──
  const clueViews = new Map();
  const clueGaps = [1, 3, 5];
  CV.DATA.nuggets.forEach((n, i) => {
    if (CV.State.nuggets.has(n.id)) return;
    const a = slots[clueGaps[i] || i], b = slots[(clueGaps[i] || i) + 1] || a;
    const gapY = (a.y + a.h + b.y) / 2;
    const gx = phone
      ? (i % 2 ? sheetX + sheetW - 14 : sheetX + 14)
      : Math.max(sheetX + 24, Math.min(sheetX + sheetW - 24, (a.cx + b.cx) / 2 + (i % 2 ? 42 : -42)));
    const c = new PIXI.Container();
    const ring = new PIXI.Graphics();
    ring.circle(0, 0, 11); ring.stroke({ width: 2, color: C.stamp });
    ring.circle(0, 0, 3.4); ring.stroke({ width: 1.4, color: C.stamp, alpha: 0.6 });
    const q = CV.makeText('?', 13, C.stamp, { weight: '700' });
    q.anchor.set(0.5); q.position.set(0, -1);
    c.addChild(ring, q);
    c.position.set(gx, gapY);
    c.eventMode = 'static'; c.cursor = 'pointer';
    c.hitArea = new PIXI.Circle(0, 0, 26);
    c.on('pointertap', () => collectClue(n.id, c));
    c.zIndex = 30;
    field.addChild(c);
    clueViews.set(n.id, c);
  });

  // ── метка «вы здесь» ──
  const worker = new PIXI.Container();
  const pin = new PIXI.Graphics();
  pin.beginFill(C.stamp); pin.drawCircle(0, 0, 6); pin.endFill();
  pin.circle(0, 0, 10); pin.stroke({ width: 2, color: C.stamp, alpha: 0.55 });
  const hereT = CV.makeText(CV.t('map.youAreHere'), 10.5, C.stamp, { ls: 1.5, upper: true });
  hereT.anchor.set(0, 0.5); hereT.position.set(14, 0);
  worker.addChild(pin, hereT);
  worker.position.set(slots[0].cx - 34, slots[0].y - 16);
  worker.zIndex = 20;
  field.addChild(worker);

  // ── HUD: служебная полоса дела ──
  const hud = new PIXI.Container();
  hud.zIndex = 100;
  const hudBg = new PIXI.Graphics();
  hudBg.beginFill(C.panel, 0.97); hudBg.drawRect(0, 0, W, headerH); hudBg.endFill();
  hudBg.beginFill(C.line); hudBg.drawRect(0, headerH - 1, W, 1); hudBg.endFill();
  hud.addChild(hudBg);
  layers.addChild(hud);

  const midY = headerH / 2;
  const zapIc = CV.makeIcon('zap', 18, C.gold);
  zapIc.position.set(14, midY - 9);
  const energyT = CV.makeText(CV.DATA.ENERGY_MAX, 16, C.paper, { weight: '700' });
  energyT.anchor.set(0, 0.5); energyT.position.set(38, midY);
  hud.addChild(zapIc, energyT);

  const attT = CV.makeText(CV.t('hud.attention', { s: 0 }), 11, C.grey, { upper: true, ls: 0.5 });
  attT.anchor.set(0, 0.5); attT.position.set(100, midY);
  attT.visible = !phone;
  hud.addChild(attT);

  // правая группа: депеши · PDF · личное дело
  const fileW = phone ? 78 : 150;
  const fileH = 40;
  const fileX = W - L.pad - fileW;
  const bFile = CV.makeButton(CV.t(phone ? 'hud.fileShort' : 'hud.file'), fileW, {
    height: fileH, size: phone ? 11 : 12, ghost: true,
    onTap: () => { CV.Sfx.open(); CV.Scenes.switchTo('sheet'); },
  });
  bFile.position.set(fileX, (headerH - fileH) / 2);
  hud.addChild(bFile);

  const pdfX = fileX - 46;
  const bPdf = new PIXI.Container();
  const pdfIc = CV.makeIcon('pdf', 22, C.paper);
  pdfIc.position.set(9, 9);
  bPdf.addChild(pdfIc);
  bPdf.hitArea = new PIXI.Rectangle(0, 0, 40, 40);
  bPdf.eventMode = 'static'; bPdf.cursor = 'pointer';
  bPdf.position.set(pdfX, midY - 20);
  bPdf.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); });
  hud.addChild(bPdf);

  let ordersChip = CV.makeChip(CV.t('hud.orders') + ' ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount }), {
    ghost: true, size: phone ? 10.5 : 12, upper: true, padX: phone ? 9 : 12,
  });
  ordersChip.eventMode = 'static'; ordersChip.cursor = 'pointer';
  ordersChip.hitArea = new PIXI.Rectangle(-5, -6, ordersChip.w + 10, ordersChip.h + 12);
  ordersChip.position.set(pdfX - ordersChip.w - 8, midY - ordersChip.h / 2);
  ordersChip.on('pointertap', () => { CV.Sfx.open(); toggleOrders(true); });
  hud.addChild(ordersChip);

  // водяной знак и таймер внимания на самом листе
  const wm = CV.makeText(CV.t('hud.caseNo'), 10.5, C.aging, { ls: 5, upper: true });
  wm.alpha = 0.55;
  wm.position.set(sheetX + 16, sheetY + 13);
  layers.addChild(wm);
  const wmAtt = CV.makeText(CV.t('hud.attention', { s: 0 }), 10.5, C.aging, { ls: 1 });
  wmAtt.alpha = 0.55;
  wmAtt.position.set(sheetX + 16, sheetY + 27);
  layers.addChild(wmAtt);

  // ── энергия ──
  const energy = { v: CV.DATA.ENERGY_MAX, regenT: 0 };
  const renderEnergy = () => { energyT.text = String(energy.v); };
  renderEnergy();

  const attStart = performance.now();
  let attShown = null;

  // ── тост ──
  const toast = (text) => {
    const c = CV.makeChip(text, { solid: true, size: phone ? 11.5 : 13, padX: 14 });
    if (c.w > W - 24) c.scale.set((W - 24) / c.w);
    c.position.set(W / 2 - c.w * c.scale.x / 2, H - c.h - 16);
    c.zIndex = 950; layers.addChild(c);
    CV.tween(c, { y: H - c.h - 28 }, 200).then(() =>
      setTimeout(() => { CV.tween(c, { alpha: 0 }, 300).then(() => c.destroy()); }, 1800));
  };

  // ── оверлеи ──
  const factLayer = new PIXI.Container();
  factLayer.eventMode = 'static';
  factLayer.visible = false;
  factLayer.zIndex = 900;
  layers.addChild(factLayer);

  let ordersScroll = null;

  // ── карточки фактов ──
  const showFacts = (st) => {
    factLayer.removeChildren().forEach(c => c.destroy({ children: true }));
    factLayer.visible = true;

    const dim = new PIXI.Graphics();
    dim.beginFill(C.deep, 0.8); dim.drawRect(0, 0, W, H); dim.endFill();
    dim.eventMode = 'static';
    dim.on('pointertap', () => { factLayer.visible = false; });
    factLayer.addChild(dim);

    const panelW = Math.min(W - 24, phone ? 440 : 620);
    const cardW = panelW - 32;

    // факты
    const facts = [];
    for (let i = 0; i < 4; i++) {
      const t = CV.t('station.' + st.id + '.facts.' + i + '.t');
      if (t.startsWith('?')) break;
      facts.push(i);
    }

    const cards = [];
    let cardsTotal = 0;
    const cardDefs = facts.map(fi => {
      const title = CV.makeText(CV.t('station.' + st.id + '.facts.' + fi + '.t'), phone ? 15 : 16, C.ink, {
        weight: '700', wrap: true, wrapWidth: cardW - 32, lineHeight: (phone ? 15 : 16) * 1.3,
      });
      const body = CV.makeText(CV.t('station.' + st.id + '.facts.' + fi + '.x'), phone ? 13 : 13.5, C.ink60, {
        wrap: true, wrapWidth: cardW - 32, ls: 0, lineHeight: (phone ? 13 : 13.5) * 1.42,
      });
      const chip = CV.makeChip(CV.t('station.' + st.id + '.facts.' + fi + '.c'), { size: phone ? 10 : 11 });
      const h = 12 + title.height + 6 + body.height + 8 + chip.h + 12;
      return { title, body, chip, h };
    });
    cardDefs.forEach(d => { cardsTotal += d.h + 10; });

    const headerArea = 92;
    const closeH = 48;
    const panelH = headerArea + cardsTotal + closeH + 20;
    const panelY = Math.max(12, (H - panelH) / 2);
    const panelX = (W - panelW) / 2;

    const panel = CV.makePanel(panelW, panelH, { light: true });
    panel.position.set(panelX, panelY);
    factLayer.addChild(panel);

    const titleT = CV.makeText(CV.t('station.' + st.id + '.name'), phone ? 22 : 28, C.ink, { head: true, weight: '700', upper: true });
    titleT.anchor.set(0.5, 0);
    titleT.position.set(W / 2, panelY + 24);
    CV.fitText(titleT, panelW - 48);
    const subT = CV.makeText('— ' + CV.t('station.' + st.id + '.sub'), phone ? 12 : 13, C.ink60, { align: 'center', wrap: true, wrapWidth: panelW - 48, ls: 0 });
    subT.anchor.set(0.5, 0); subT.position.set(W / 2, panelY + 54);
    factLayer.addChild(titleT, subT);

    let fy = panelY + 88;
    cardDefs.forEach((d, i) => {
      const card = new PIXI.Container();
      card._finalY = fy + i * 10;
      card.position.set(panelX + 16, card._finalY);
      card.visible = false;
      card.addChild(CV.makeCard(cardW, d.h, { red: true }));
      d.title.position.set(16, 12);
      d.body.position.set(16, 12 + d.title.height + 6);
      d.chip.position.set(16, 12 + d.title.height + 6 + d.body.height + 8);
      card.addChild(d.title, d.body, d.chip);
      factLayer.addChild(card);
      cards.push(card);
      fy += d.h + 10;
    });

    const closeB = CV.makeButton(CV.t('common.close'), Math.min(panelW - 40, 220), {
      height: closeH, size: 13,
      onTap: () => { CV.Sfx.tap(); factLayer.visible = false; },
    });
    closeB.position.set(W / 2 - closeB.w / 2, panelY + panelH - closeH - 14);
    factLayer.addChild(closeB);
    CV.cascade(cards);
  };

  // ── метка: идти и шлёпать штамп ──
  const busy = { v: false };
  const walkTo = (x, y) => new Promise(res => {
    const sx = worker.x, sy = worker.y;
    const dist = Math.hypot(x - sx, y - sy);
    const ms = Math.max(260, dist * 1.05);
    const t0 = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      worker.x = sx + (x - sx) * p;
      worker.y = sy + (y - sy) * p;
      if (p < 1) setTimeout(step, 16); else res();
    };
    setTimeout(step, 16);
  });

  const refreshTile = (st) => {
    const sv = stationViews.get(st.id);
    if (!sv) return;
    const fresh = buildTile(st, true);
    fresh.position.set(sv.slot.x, sv.slot.y);
    fresh.eventMode = 'static'; fresh.cursor = 'pointer';
    fresh.on('pointertap', () => tapStation(st));
    field.addChild(fresh);
    sv.cont.destroy({ children: true });
    sv.cont = fresh;
  };

  const unsealFort = async (announce) => {
    if (CV.State.opened.has('s7')) return false;
    CV.State.opened.add('s7');
    CV.State.save();
    refreshTile(CV.DATA.stations.find(s => s.id === 's7'));
    const slot = stationSlot.get('s7');
    const slam = CV.makeStamp(CV.t('map.openStamp'), { size: phone ? 13 : 16, thick: 4, padX: 12, padY: 5, rotation: -8 * Math.PI / 180 });
    slam.position.set(slot.cx, slot.cy);
    slam.visible = false;
    slam.zIndex = 60;
    field.addChild(slam);
    await CV.stampSlam(slam);
    CV.Sfx.done();
    setTimeout(() => slam.destroy(), 900);
    if (announce) toast(CV.t('map.fortOpen'));
    return true;
  };

  const tapStation = async (st) => {
    if (busy.v) return;
    if (st.id === 's7' && CV.State.opened.has('s7') && CV.State.ordersCount >= 5) {
      CV.Sfx.done();
      CV.Scenes.switchTo('victory');
      return;
    }
    if (CV.State.opened.has(st.id)) { CV.Sfx.open(); showFacts(st); return; }
    if (st.id === 's7' && CV.State.ordersCount < 5) { CV.Sfx.fail(); toast(CV.t('map.fortHint')); return; }

    busy.v = true;
    const slot = stationSlot.get(st.id);
    const cost = CV.DATA.CHOP_COST;
    const lastPush = energy.v < cost;
    energy.v = Math.max(0, energy.v - cost);
    renderEnergy();
    if (lastPush) toast(CV.t('map.lastPush'));

    await walkTo(slot.cx, slot.cy + 18);
    CV.Sfx.chop();
    CV.State.opened.add(st.id);
    CV.State.save();
    const sv = stationViews.get(st.id);
    const idx = field.getChildIndex(sv.cont);
    const fresh = buildTile(st, true);
    fresh.position.set(slot.x, slot.y);
    fresh.eventMode = 'static'; fresh.cursor = 'pointer';
    fresh.on('pointertap', () => tapStation(st));
    field.addChildAt(fresh, idx);
    sv.cont.destroy({ children: true });
    sv.cont = fresh;

    const slam = CV.makeStamp(CV.t('map.openStamp'), { size: phone ? 13 : 16, thick: 4, padX: 12, padY: 5, rotation: -8 * Math.PI / 180 });
    slam.position.set(slot.cx, slot.cy);
    slam.visible = false;
    field.addChild(slam);
    await CV.stampSlam(slam);
    CV.Sfx.done();
    toast('✓ ' + CV.t('station.' + st.id + '.name'));
    await new Promise(r => setTimeout(r, 550));
    slam.destroy();
    energy.v = Math.min(CV.DATA.ENERGY_MAX, energy.v + 1);
    renderEnergy();
    busy.v = false;
    showFacts(st);
  };

  const collectClue = (id, clueView) => {
    CV.State.nuggets.add(id);
    CV.State.save();
    clueViews.delete(id);
    clueView.destroy();
    CV.Sfx.coin();
    energy.v = Math.min(CV.DATA.ENERGY_MAX, energy.v + 10);
    renderEnergy();
    const idx = [...CV.State.nuggets].length;
    toast(CV.t('map.clueFound', { n: idx }));

    const text = CV.t('nugget.' + id + '.x');
    if (text.startsWith('?')) return;
    factLayer.visible = true;
    factLayer.removeChildren().forEach(c => c.destroy({ children: true }));
    const dim = new PIXI.Graphics();
    dim.beginFill(C.deep, 0.8); dim.drawRect(0, 0, W, H); dim.endFill();
    dim.eventMode = 'static'; dim.on('pointertap', () => { factLayer.visible = false; });
    factLayer.addChild(dim);

    const panelW = Math.min(W - 32, phone ? 420 : 600);
    const body = CV.makeText(text, phone ? 13.5 : 14, C.ink60, { wrap: true, wrapWidth: panelW - 64, ls: 0, lineHeight: (phone ? 13.5 : 14) * 1.42 });
    const panelH = 112 + body.height + 34;
    const panel = CV.makePanel(panelW, panelH, { light: true });
    const panelX = (W - panelW) / 2;
    const panelY = Math.max(16, (H - panelH) / 2);
    panel.position.set(panelX, panelY);
    factLayer.addChild(panel);

    const ic = CV.makeIcon('clue', 28, C.stamp);
    ic.position.set(panelX + 24, panelY + 24);
    const t = CV.makeText(CV.t('nugget.' + id + '.t'), phone ? 16 : 17, C.ink, { weight: '700' });
    t.position.set(panelX + 62, panelY + 24);
    const stamp = CV.makeStamp(CV.t('map.clueFound', { n: idx }), { size: 10.5 });
    CV.placeStamp(stamp, panelX + panelW - stamp.w - 22, panelY + 60);
    body.position.set(panelX + 32, panelY + 106);
    factLayer.addChild(ic, t, stamp, body);
    CV.tween(stamp.scale, { x: 1, y: 1 }, 300, 'back');
  };

  // ── панель депеш ──
  const ordersLayer = new PIXI.Container();
  ordersLayer.eventMode = 'static';
  ordersLayer.visible = false;
  ordersLayer.zIndex = 900;
  layers.addChild(ordersLayer);

  const buildOrders = () => {
    if (ordersScroll) { ordersScroll.destroy(); ordersScroll = null; }
    ordersLayer.removeChildren().forEach(c => c.destroy({ children: true }));

    const dim = new PIXI.Graphics();
    dim.beginFill(C.deep, 0.82); dim.drawRect(0, 0, W, H); dim.endFill();
    dim.eventMode = 'static';
    dim.on('pointertap', () => toggleOrders(false));
    ordersLayer.addChild(dim);

    const panelW = Math.min(W - 20, phone ? W - 20 : 640);
    const panelH = Math.min(H - 24, phone ? H - 24 : 740);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;
    const panel = CV.makePanel(panelW, panelH);
    panel.position.set(panelX, panelY);
    ordersLayer.addChild(panel);

    const title = CV.makeText(CV.t('map.ordersTitle') + ' — ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount }), phone ? 20 : 26, C.ink, { head: true, weight: '700', upper: true });
    title.position.set(panelX + 16, panelY + 18);
    CV.fitText(title, panelW - 130);
    ordersLayer.addChild(title);

    const closeB = CV.makeButton(CV.t('common.close'), phone ? 82 : 100, { height: 32, size: 10.5, onTap: () => toggleOrders(false) });
    closeB.position.set(panelX + panelW - closeB.w - 16, panelY + 14);
    ordersLayer.addChild(closeB);

    const viewTop = panelY + 62;
    const viewH = panelH - 76;
    const cardW = panelW - 32;

    const content = new PIXI.Container();
    content.position.set(panelX + 16, viewTop);
    ordersLayer.addChild(content);

    let cy = 0;
    CV.DATA.orders.forEach((o, i) => {
      const done = CV.State.ordersDone.has(o.id);
      const needs = [...new Set(o.needs)];
      const pad = 14;
      const btnW = phone ? 98 : 120;
      const doneStamp = done ? CV.makeStamp(CV.t('order.done'), { size: phone ? 9 : 10.5, thick: 2, padX: 7, padY: 2, rotation: -7 * Math.PI / 180, alpha: 0.85 }) : null;
      const sideW = done ? doneStamp.w + 12 : btnW + 10;
      const nameT = CV.makeText((i + 1) + '. ' + CV.t('order.' + o.id + '.name'), phone ? 14.5 : 16, done ? C.ink40 : C.ink, {
        weight: '700', wrap: true, wrapWidth: cardW - pad * 2 - sideW, lineHeight: (phone ? 14.5 : 16) * 1.3,
      });
      const lineW = cardW - pad * 2 - sideW;
      const lineT = CV.makeText('«' + CV.t('order.' + o.id + '.line') + '»', phone ? 11.5 : 12.5, C.ink60, {
        wrap: true, wrapWidth: lineW, ls: 0, lineHeight: (phone ? 11.5 : 12.5) * 1.4,
      });
      const chips = [];
      const chipList = needs.map(sid => {
        const lit = CV.State.opened.has(sid);
        const chip = CV.makeChip(CV.t('station.' + sid + '.name'), { size: phone ? 9.5 : 10.5, padX: 7 });
        if (!lit) chip.alpha = 0.45;
        return chip;
      });

      let contentBottom = pad + nameT.height + 4 + lineT.height + 8;
      // чипы в несколько строк
      let cxp = 0, cyp = contentBottom;
      chipList.forEach(chip => {
        if (cxp + chip.w > cardW - pad * 2) { cxp = 0; cyp += chip.h + 5; }
        chip.position.set(cxp, cyp);
        chips.push(chip);
        cxp += chip.w + 5;
      });
      const chipsBottom = chipList.length ? cyp + chipList[0].h : contentBottom;
      const rewardT = CV.makeText('→ ' + CV.t('order.' + o.id + '.reward'), phone ? 10.5 : 11.5, done ? C.ink40 : C.goldDeep, {
        weight: '700', wrap: true, wrapWidth: cardW - pad * 2, lineHeight: (phone ? 10.5 : 11.5) * 1.35,
      });
      const rewardY = Math.max(chipsBottom + 7, contentBottom + 4);
      contentBottom = rewardY + rewardT.height + pad;
      const cardH = Math.max(done ? 96 : 112, contentBottom);

      const card = new PIXI.Container();
      card.position.set(0, cy);
      card.addChild(CV.makeCard(cardW, cardH, { red: true }));
      nameT.position.set(pad, pad);
      lineT.position.set(pad, pad + nameT.height + 4);
      rewardT.position.set(pad, rewardY);
      card.addChild(nameT, lineT, ...chips, rewardT);

      if (done) {
        CV.placeStamp(doneStamp, cardW - doneStamp.w - pad, pad);
        card.addChild(doneStamp);
      } else {
        const can = needs.every(sid => CV.State.opened.has(sid));
        const b = CV.makeButton(CV.t('order.execute'), btnW, {
          height: 38, size: phone ? 10.5 : 11.5,
          onTap: () => { if (can) completeOrder(o); else { CV.Sfx.fail(); toast(CV.t('order.needFacts')); } },
        });
        b.position.set(cardW - btnW - pad, pad);
        if (!can) b.alpha = 0.45;
        card.addChild(b);
      }

      content.addChild(card);
      cy += cardH + 10;
    });

    const viewportH = viewH;
    const maxScroll = Math.max(0, cy - viewportH);
    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff); mask.drawRect(panelX, viewTop, panelW, viewportH); mask.endFill();
    ordersLayer.addChild(mask);
    content.mask = mask;

    // область перетаскивания — под карточками, чтобы не мешать кнопкам
    const hit = new PIXI.Container();
    hit.hitArea = new PIXI.Rectangle(panelX, viewTop, panelW, viewportH);
    hit.eventMode = 'static';
    ordersLayer.addChildAt(hit, ordersLayer.getChildIndex(content));

    const bar = CV.makeScrollBar(app, C.ink40);
    bar.g.zIndex = 5;
    ordersLayer.addChild(bar.g);

    ordersScroll = CV.scrollArea(app, hit, {
      getMax: () => maxScroll,
      apply: off => { content.y = viewTop + off; },
      isActive: () => ordersLayer.visible,
      onMove: off => bar.draw(off, maxScroll, viewportH, panelX + panelW - 6, viewTop),
    });
    ordersScroll.update();
  };

  const completeOrder = (o) => {
    if (CV.State.ordersDone.has(o.id)) return;
    CV.State.ordersDone.add(o.id);
    if (o.opens === 'tuner') {
      CV.State.tunerOpen = true;
    } else {
      CV.State.blocksOpen.add(o.opens);
    }
    CV.State.save();

    ordersChip.label.text = CV.t('hud.orders') + ' ' + CV.t('hud.ordersDone', { n: CV.State.ordersCount });
    CV.Sfx.done();

    if (o.opens === 'tuner') {
      toggleOrders(false);
      CV.Scenes.switchTo('tuner');
      return;
    }

    buildOrders();
    if (CV.State.ordersCount >= 5) {
      unsealFort(false);
      toast(CV.t('order.allDone'));
    } else {
      toast(CV.t('order.done') + ' → ' + CV.t('order.' + o.id + '.reward'));
    }
  };

  const toggleOrders = (show) => {
    if (show) {
      buildOrders();
      ordersLayer.visible = true;
    } else {
      ordersLayer.visible = false;
      if (ordersScroll) { ordersScroll.destroy(); ordersScroll = null; }
    }
  };

  // виньетка поверх карты, но под HUD и оверлеями
  const vig = CV.makeVignette(app, 0.34);
  vig.zIndex = 80;
  layers.addChild(vig);

  if (fortAutoOpened) setTimeout(() => toast(CV.t('map.fortOpen')), 600);

  // ── update ──
  return {
    exit() {
      if (ordersScroll) { ordersScroll.destroy(); ordersScroll = null; }
    },
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
        wmAtt.text = CV.t('hud.attention', { s: att });
      }
      // лёгкое покачивание улик
      clueViews.forEach(c => { c.y += Math.sin(performance.now() / 400 + c.x) * 0.06; });
      if (ordersScroll) ordersScroll.update();
    },
  };
};
