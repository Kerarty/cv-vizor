// ── сцена «Личное дело»: карточка офицера, дела-проекты, печати ──
CV.scenes = CV.scenes || {};
CV.scenes.sheet = (view, app) => {
  const W = () => app.screen.width, H = () => app.screen.height;
  const C = CV.COLORS;

  const bg = new PIXI.Graphics();
  bg.beginFill(C.desk); bg.drawRect(0, 0, W(), H()); bg.endFill();
  view.addChild(bg);
  view.addChild(CV.makeVignette(app, 0.4));

  const scroll = new PIXI.Container();
  view.addChild(scroll);
  const content = new PIXI.Container();
  scroll.addChild(content);

  let y = 30;
  const addAt = (el, x, yy) => { el.position.set(x, yy); content.addChild(el); return el; };

  // ── шапка тома ──
  const volNum = CV.makeChip(CV.t('title.caseNo'), { ghost: true, size: 11, upper: true, padX: 10 });
  addAt(volNum, (W() - volNum.w) / 2, y); y += volNum.h + 14;
  const volTitle = CV.makeText(CV.t('sheet.title'), 58, 0xcfd3d9, { head: true, weight: '700', upper: true });
  volTitle.anchor.set(0.5, 0);
  addAt(volTitle, W() / 2, y); y += 74;
  const volSub = CV.makeText(CV.t('sheet.role'), 12, C.grey);
  volSub.anchor.set(0.5, 0);
  addAt(volSub, W() / 2, y); y += 34;

  // ── карточка офицера ──
  const CARD_H = 560;
  const card = CV.makePanel(660, CARD_H);
  addAt(card, (W() - 660) / 2, y);
  const cardY = y;
  y += CARD_H + 22;
  const cardX = (W() - 660) / 2;
  const RX = cardX + 210; // правая колонка
  const RW = 660 - 210 - 30;

  // фото: тёмный силуэт из архива
  const photoBg = new PIXI.Graphics();
  photoBg.beginFill(C.paperDark); photoBg.drawRect(0, 0, 180, CARD_H); photoBg.endFill();
  photoBg.setStrokeStyle({ width: 1, color: 0x8d7f61 });
  CV.dashedRect(photoBg, 179.5, 0.5, 0, CARD_H - 1, 4, 4); photoBg.stroke();
  photoBg.position.set(cardX + 15, cardY + 15);
  const sil = new PIXI.Graphics();
  sil.beginFill(0x5a5245, 0.85);
  sil.drawPolygon([45, 240, 37, 82, 70, 40, 110, 26, 150, 40, 183, 82, 175, 240]);
  sil.endFill();
  sil.position.set(photoBg.x + 15, photoBg.y + 90);
  const photoCap = CV.makeText(CV.t('sheet.photo'), 9, C.ink60, { ls: 2, upper: true });
  photoCap.anchor.set(0.5);
  photoCap.position.set(photoBg.x + 90, cardY + CARD_H - 44);
  content.addChild(photoBg, sil, photoCap);

  // имя и звание
  const nameT = CV.makeText('Кукар Ярослав', 25, C.ink, { head: true, weight: '700', upper: true, ls: 2 });
  nameT.position.set(RX, cardY + 34);
  const rankT = CV.makeText(CV.t('sheet.rank'), 10, C.ink60, { wrap: true, wrapWidth: RW, ls: 0 });
  rankT.position.set(RX, cardY + 68);
  content.addChild(nameT, rankT);

  // штамп за улики
  if (CV.State.nuggets.size >= 3) {
    const gs = CV.makeStamp(CV.t('sheet.golden'), { size: 10, thick: 2, padX: 8, padY: 3, rotation: -6 * Math.PI / 180 });
    gs.position.set(cardX + 660 - gs.w / 2 - 30, cardY + 24);
    content.addChild(gs);
  }

  // статы: полосатые бары
  const stats = [
    ['statDesign', CV.DATA.sheetStats[0]],
    ['statBalance', CV.DATA.sheetStats[1]],
    ['statProto', CV.DATA.sheetStats[2]],
    ['statDocs', CV.DATA.sheetStats[3]],
  ];
  let sy = cardY + 104;
  const barW = 150, barH = 11;
  stats.forEach(([key, s], i) => {
    const lab = CV.makeText(CV.t('sheet.' + key), 10, C.ink, { wrap: true, wrapWidth: RW - barW - 60, ls: 0 });
    lab.position.set(RX, sy + 1);
    const bar = CV.makeStatBar(barW, barH);
    bar.position.set(RX + RW - barW - 26, sy);
    content.addChild(lab, bar);
    const val = CV.makeText(String(Math.round(s.value * 10)), 12, C.ink, { weight: '700' });
    val.anchor.set(0, 0.5);
    val.position.set(RX + RW - 12, sy + barH / 2);
    content.addChild(val);
    const anim = { _f: 0 };
    Object.defineProperty(anim, 'f', {
      get() { return this._f; },
      set(v) { this._f = v; bar.setFill(v); },
    });
    CV.tween(anim, { f: s.value }, 900 + i * 150);
    sy += 44;
  });

  // особые приметы
  let py = sy + 8;
  const traitsTitle = CV.makeText(CV.t('sheet.traitsTitle').toUpperCase(), 10, C.ink60, { ls: 3 });
  traitsTitle.position.set(RX, py);
  content.addChild(traitsTitle);
  py += 20;
  ['trait1', 'trait2', 'trait3'].forEach(k => {
    const chip = CV.makeChip(CV.t('sheet.' + k), { size: 10 });
    if (chip.w > RW) chip.scale.set(RW / chip.w);
    chip.position.set(RX, py);
    content.addChild(chip);
    py += chip.h + 8;
  });

  // перки
  py += 6;
  const perksTitle = CV.makeText(CV.t('sheet.perksTitle').toUpperCase(), 10, C.ink60, { ls: 3 });
  perksTitle.position.set(RX, py);
  content.addChild(perksTitle);
  py += 20;
  let pxx = RX, pMax = cardX + 660 - 30;
  ['perk1', 'perk2', 'perk3', 'perk4', 'perk5', 'perk6'].forEach(k => {
    const chip = CV.makeChip(CV.t('sheet.' + k), { size: 10, solid: true });
    if (pxx + chip.w > pMax) { pxx = RX; py += chip.h + 8; }
    chip.position.set(pxx, py);
    content.addChild(chip);
    pxx += chip.w + 8;
  });

  // ── секции ──
  const section = (name, builder) => {
    const head = CV.makeText(name, 19, C.gold, { head: true, weight: '600', upper: true, ls: 3 });
    addAt(head, 74, y); y += 30;
    builder();
    y += 18;
  };
  const para = (text, size = 12.5, color = 0xd6d0c2, weight = '400') => {
    const t = CV.makeText(text, size, color, { wrap: true, wrapWidth: 572, weight, ls: 0 });
    addAt(t, 74, y);
    y += t.height + 8;
    return t;
  };

  section(CV.t('sheet.about'), () => para(CV.t('sheet.aboutText')));
  section(CV.t('sheet.edu'), () => para(CV.t('sheet.eduText')));

  // дела-проекты: печать «запечатано» до депеши
  const caseFile = (nameKey, items, blockId, orderId) => {
    const ok = CV.State.blocksOpen.has(blockId);
    // шапка дела
    const headRow = new PIXI.Container();
    const no = CV.makeText('ДЕЛО ' + ({ exp: 1, skills: 2, playable: 3, stack: 4 }[blockId]), 10, C.grey, { ls: 3 });
    const nm = CV.makeText(CV.t('sheet.' + nameKey), 16, ok ? 0xd6d0c2 : C.grey, { head: true, weight: '600', upper: true, ls: 2 });
    const tag = CV.makeStamp(ok ? CV.t('map.openStamp') : CV.t('map.closed'), { size: 9, thick: 2, padX: 7, padY: 2, rotation: -3 * Math.PI / 180, alpha: ok ? 0.8 : 0.55 });
    headRow.addChild(no, nm, tag);
    no.position.set(74, y + 4);
    nm.position.set(150, y);
    if (nm.width > 400) nm.scale.set(400 / nm.width);
    tag.position.set(690 - tag.w / 2, y + 14);
    content.addChild(headRow);
    y += 34;
    items.forEach(k => para((ok ? '✓ ' : '· ') + CV.t('sheet.' + k), 12, ok ? 0xd6d0c2 : 0x767b83));
    if (!ok) para(CV.t('sheet.blockLocked', { o: CV.t('order.' + orderId + '.name') }), 11, C.stampLight, '700');
    y += 8;
  };

  caseFile('exp', ['exp1', 'exp2', 'exp3'], 'exp', 'o1');
  section(CV.t('sheet.skills'), () => {
    const ok = CV.State.blocksOpen.has('skills');
    ['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6'].forEach(k =>
      para((ok ? '✓ ' : '· ') + CV.t('sheet.' + k), 12, ok ? 0xd6d0c2 : 0x767b83));
    if (!ok) para(CV.t('sheet.blockLocked', { o: CV.t('order.o3.name') }), 11, C.stampLight, '700');
  });
  caseFile('playT', ['play1', 'play2', 'play3'], 'playable', 'o4');
  caseFile('stackT', ['stack1', 'stack2', 'stack3'], 'stack', 'o5');

  // честный блок
  section(CV.t('sheet.missing'), () => {
    const t = CV.makeText(CV.t('sheet.missingText'), 12, C.ink, { wrap: true, wrapWidth: 540, ls: 0 });
    const box = CV.makeCard(572, t.height + 30, { red: true });
    addAt(box, 74, y);
    addAt(t, 96, y + 15);
    y += t.height + 44;
  });

  // контакты
  section(CV.t('sheet.contacts'), () => {
    const c = CV.DATA.contacts;
    const phone = CV.makeText(c.phone, 13.5, 0xd6d0c2, { weight: '700' });
    addAt(phone, 74, y); y += 26;
    const email = CV.makeText(c.email, 13.5, 0xd6d0c2, { weight: '700' });
    addAt(email, 74, y); y += 26;
    const gh = CV.makeText(c.github, 13.5, C.gold, { weight: '700' });
    gh.eventMode = 'static'; gh.cursor = 'pointer';
    gh.on('pointertap', () => { CV.Sfx.tap(); window.open(c.gh, '_blank'); });
    addAt(gh, 74, y); y += 30;
  });

  // PDF
  const bPdf = CV.makeButton(CV.t('sheet.dl'), 330, { height: 58, size: 13, red: true, onTap: () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); } });
  addAt(bPdf, W() / 2 - 165, y + 6);
  y += 76;
  const note = CV.makeText(CV.t('common.pdfNote'), 10.5, C.grey, { align: 'center', wrap: true, wrapWidth: 460, ls: 0 });
  note.anchor.set(0.5, 0);
  addAt(note, W() / 2, y + 4);
  y += 52;

  const contentH = y + 30;
  const back = CV.makeButton(CV.t('common.back'), 170, { height: 50, size: 13, ghost: true, onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('map'); } });
  addAt(back, W() / 2 - 85, contentH + 16);

  // прокрутка: тач/мышь тянет контент
  const maxScroll = () => Math.max(0, contentH + 90 - (H() - 20));
  view.eventMode = 'static';
  let dragging = null;
  view.on('pointerdown', e => {
    dragging = { y: e.global.y, off: scroll._off || 0, moved: false };
  });
  view.on('globalpointermove', e => {
    if (!dragging) return;
    const dy = e.global.y - dragging.y;
    if (Math.abs(dy) > 6) dragging.moved = true;
    scroll._off = dragging.off - dy;
  });
  const endDrag = () => { dragging = null; };
  view.on('pointerup', endDrag);
  view.on('pointerupoutside', endDrag);

  return {
    view, scroll,
    update() {
      scroll.y = -Math.min(Math.max(0, scroll._off || 0), maxScroll());
    },
  };
};
