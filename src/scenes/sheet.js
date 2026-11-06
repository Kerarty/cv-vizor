// ── сцена «Личное дело»: карточка офицера, дела-проекты, печати ──
CV.scenes = CV.scenes || {};
CV.scenes.sheet = (view, app) => {
  const L = CV.layout();
  const { W, H, phone, pad, colW, colX, headerH, fs } = L;
  const C = CV.COLORS;

  // тёмный стол и виньетка
  const bg = new PIXI.Graphics();
  bg.beginFill(C.desk); bg.drawRect(0, 0, W, H); bg.endFill();
  view.addChild(bg);
  view.addChild(CV.makeVignette(app, 0.4));

  // ── прокручиваемый контент ──
  const scroll = new PIXI.Container();
  view.addChild(scroll);
  const content = new PIXI.Container();
  const top = headerH + 14;
  content.position.set(colX, top);
  scroll.addChild(content);

  let y = 0;
  const textW = Math.max(200, colW - 4);
  const para = (text, size, color, opts = {}) => {
    const t = CV.makeText(text, size || (phone ? 14.5 : 15), color || 0xd6d0c2, {
      wrap: true, wrapWidth: textW, ls: 0, lineHeight: (size || (phone ? 14.5 : 15)) * 1.45, ...opts,
    });
    t.position.set(0, y);
    content.addChild(t);
    y += t.height + 7;
    return t;
  };
  const section = (name) => {
    y += phone ? 22 : 28;
    const head = CV.makeText(name, phone ? 18 : 20, C.gold, { head: true, weight: '600', upper: true, ls: 2.5 });
    head.position.set(0, y);
    content.addChild(head);
    y += head.height + 10;
  };
  const flow = (chips, x, startY, maxW, gapX = 7, gapY = 7) => {
    let cx = 0, cy = startY;
    chips.forEach(ch => {
      if (cx > 0 && cx + ch.w > maxW) { cx = 0; cy += ch.h + gapY; }
      ch.position.set(x + cx, cy);
      cx += ch.w + gapX;
    });
    return cy + (chips.length ? chips[chips.length - 1].h : 0);
  };

  // ── шапка тома ──
  const volNum = CV.makeChip(CV.t('title.caseNo'), { ghost: true, size: phone ? 10.5 : 11, upper: true, padX: 10 });
  volNum.position.set((colW - volNum.w) / 2, y);
  content.addChild(volNum);
  y += volNum.h + 12;

  const volTitle = CV.makeText(CV.t('sheet.title'), phone ? 40 : 54, 0xcfd3d9, { head: true, weight: '700', upper: true, ls: 1 });
  CV.fitText(volTitle, colW);
  volTitle.anchor.set(0.5, 0);
  volTitle.position.set(colW / 2, y);
  content.addChild(volTitle);
  y += volTitle.height + 6;

  const volSub = CV.makeText(CV.t('sheet.role'), phone ? 12.5 : 14, C.grey, { align: 'center', wrap: true, wrapWidth: colW, ls: 0, lineHeight: (phone ? 12.5 : 14) * 1.4 });
  volSub.anchor.set(0.5, 0);
  volSub.position.set(colW / 2, y);
  content.addChild(volSub);
  y += volSub.height + 6;

  const hint = CV.makeText(CV.t('sheet.scrollHint'), phone ? 10.5 : 11.5, C.ink40, { align: 'center', ls: 0.5 });
  hint.anchor.set(0.5, 0);
  hint.position.set(colW / 2, y);
  content.addChild(hint);
  y += hint.height + 18;

  // ── карточка офицера ──
  const cardPad = phone ? 16 : 22;
  const cardC = new PIXI.Container();
  const cardContent = new PIXI.Container();

  const photoW = phone ? 92 : 148;
  const photoH = phone ? 118 : 204;

  let leftBottom = 0;

  // фото: тёмный силуэт из архива
  const photoBg = new PIXI.Graphics();
  photoBg.beginFill(C.paperDark); photoBg.drawRect(0, 0, photoW, photoH); photoBg.endFill();
  photoBg.setStrokeStyle({ width: 1, color: 0x8d7f61 });
  CV.dashedRect(photoBg, 0.5, 0.5, photoW - 1, photoH - 1, 4, 4); photoBg.stroke();
  photoBg.position.set(cardPad, cardPad);
  const sil = new PIXI.Graphics();
  sil.beginFill(0x5a5245, 0.85);
  sil.circle(photoW / 2, photoH * 0.3, photoW * 0.2); sil.endFill();
  sil.beginFill(0x5a5245, 0.85);
  sil.moveTo(photoW * 0.06, photoH); sil.lineTo(photoW * 0.1, photoH * 0.62);
  sil.quadraticCurveTo(photoW * 0.14, photoH * 0.44, photoW * 0.33, photoH * 0.42);
  sil.lineTo(photoW * 0.67, photoH * 0.42);
  sil.quadraticCurveTo(photoW * 0.86, photoH * 0.44, photoW * 0.9, photoH * 0.62);
  sil.lineTo(photoW * 0.94, photoH);
  sil.closePath(); sil.endFill();
  sil.position.set(cardPad, cardPad);
  const photoCap = CV.makeText(CV.t('sheet.photo'), 8.5, C.ink60, { ls: 1.5, upper: true, align: 'center' });
  CV.fitText(photoCap, photoW - 8);
  photoCap.anchor.set(0.5, 0);
  photoCap.position.set(cardPad + photoW / 2, cardPad + 8);
  cardContent.addChild(photoBg, sil, photoCap);
  leftBottom = cardPad + photoH;

  // имя и звание
  const rightX = cardPad + photoW + 14;
  const rightW = Math.max(120, colW - rightX - cardPad);
  const nameT = CV.makeText(CV.t('sheet.name'), phone ? 20 : 26, C.ink, { head: true, weight: '700', upper: true, ls: 1 });
  CV.fitText(nameT, rightW);
  nameT.position.set(rightX, cardPad);
  const rankT = CV.makeText(CV.t('sheet.rank'), phone ? 11 : 12.5, C.ink60, {
    wrap: true, wrapWidth: rightW, ls: 0, lineHeight: (phone ? 11 : 12.5) * 1.4,
  });
  rankT.position.set(rightX, cardPad + nameT.height + 6);
  cardContent.addChild(nameT, rankT);

  // статы
  const stats = [
    ['statDesign', CV.DATA.sheetStats[0]],
    ['statBalance', CV.DATA.sheetStats[1]],
    ['statProto', CV.DATA.sheetStats[2]],
    ['statDocs', CV.DATA.sheetStats[3]],
  ];
  const statsX = phone ? cardPad : rightX;
  const statsW = phone ? colW - cardPad * 2 : rightW;
  let sy = phone
    ? cardPad + Math.max(photoH, nameT.height + rankT.height + 6) + 14
    : cardPad + nameT.height + 6 + rankT.height + 14;
  stats.forEach(([key, s], i) => {
    const lab = CV.makeText(CV.t('sheet.' + key), phone ? 12 : 12.5, C.ink, {
      wrap: true, wrapWidth: statsW - 44, ls: 0, lineHeight: (phone ? 12 : 12.5) * 1.35,
    });
    lab.position.set(statsX, sy);
    const barW = Math.max(60, statsW - 42);
    const bar = CV.makeStatBar(barW, 10);
    bar.position.set(statsX, sy + lab.height + 4);
    const val = CV.makeText(String(Math.round(s.value * 10)), 12.5, C.ink, { weight: '700' });
    val.anchor.set(0, 0.5);
    val.position.set(statsX + barW + 10, sy + lab.height + 4 + 5);
    cardContent.addChild(lab, bar, val);
    const anim = { _f: 0 };
    Object.defineProperty(anim, 'f', {
      get() { return this._f; },
      set(v) { this._f = v; bar.setFill(v); },
    });
    CV.tween(anim, { f: s.value }, 900 + i * 150);
    sy += lab.height + 4 + 10 + 12;
  });

  // особые приметы и перки
  const postX = phone ? cardPad : rightX;
  const postW = phone ? colW - cardPad * 2 : rightW;
  let py = sy + 2;
  const traitsTitle = CV.makeText(CV.t('sheet.traitsTitle').toUpperCase(), phone ? 10 : 10.5, C.ink60, { ls: 2.5 });
  traitsTitle.position.set(postX, py);
  cardContent.addChild(traitsTitle);
  py += 18;
  const traitChips = ['trait1', 'trait2', 'trait3'].map(k => {
    const chip = CV.makeChip(CV.t('sheet.' + k), { size: phone ? 10 : 10.5 });
    if (chip.w > postW) chip.scale.set(postW / chip.w);
    return chip;
  });
  py = flow(traitChips, postX, py, postW) + 10;
  cardContent.addChild(...traitChips);

  const perksTitle = CV.makeText(CV.t('sheet.perksTitle').toUpperCase(), phone ? 10 : 10.5, C.ink60, { ls: 2.5 });
  perksTitle.position.set(postX, py);
  cardContent.addChild(perksTitle);
  py += 18;
  const perkChips = ['perk1', 'perk2', 'perk3', 'perk4', 'perk5', 'perk6'].map(k =>
    CV.makeChip(CV.t('sheet.' + k), { size: phone ? 10 : 10.5, solid: true }));
  const perkBottom = flow(perkChips, postX, py, postW);
  cardContent.addChild(...perkChips);

  const contentBottom = Math.max(leftBottom, statsX === cardPad ? sy : leftBottom, perkBottom);
  const cardH = contentBottom + cardPad;
  const card = CV.makePanel(colW, cardH);
  cardC.addChild(card, cardContent);
  cardC.position.set(0, y);
  content.addChild(cardC);
  y += cardH + 22;

  // штамп за улики — поверх фото
  if (CV.State.nuggets.size >= 3) {
    const gs = CV.makeStamp(CV.t('sheet.golden'), { size: 9.5, thick: 2, padX: 8, padY: 3, rotation: -6 * Math.PI / 180 });
    if (gs.w > photoW - 8) gs.scale.set((photoW - 8) / gs.w);
    CV.placeStamp(gs, cardPad + (photoW - gs.w * gs.scale.x) / 2, cardPad + photoH - gs.h * gs.scale.y - 8);
    cardContent.addChild(gs);
  }

  // ── секции ──
  section(CV.t('sheet.about'));
  para(CV.t('sheet.aboutText'));

  section(CV.t('sheet.edu'));
  para(CV.t('sheet.eduText'));

  // дела-проекты: печать «запечатано» до депеши
  const caseFile = (nameKey, items, blockId, orderId) => {
    const ok = CV.State.blocksOpen.has(blockId);
    y += 8;
    const headRow = new PIXI.Container();
    const no = CV.makeText(CV.t('sheet.caseWord') + ' ' + ({ exp: 1, skills: 2, playable: 3, stack: 4 }[blockId]), phone ? 9.5 : 10, C.grey, { ls: 2.5 });
    const nm = CV.makeText(CV.t('sheet.' + nameKey), phone ? 15 : 17, ok ? 0xd6d0c2 : C.grey, { head: true, weight: '600', upper: true, ls: 1.5 });
    CV.fitText(nm, colW - 160);
    const tag = CV.makeStamp(ok ? CV.t('map.openStamp') : CV.t('map.closed'), { size: phone ? 8 : 9, thick: 2, padX: 7, padY: 2, rotation: -3 * Math.PI / 180, alpha: ok ? 0.8 : 0.55 });
    headRow.addChild(no, nm, tag);
    no.position.set(0, 4);
    nm.position.set(66, 0);
    CV.placeStamp(tag, colW - tag.w, 2);
    headRow.position.set(0, y);
    content.addChild(headRow);
    y += 30;
    items.forEach(k => para((ok ? '✓ ' : '· ') + CV.t('sheet.' + k), phone ? 13.5 : 14, ok ? 0xd6d0c2 : 0x767b83));
    if (!ok) para(CV.t('sheet.blockLocked', { o: CV.t('order.' + orderId + '.name') }), phone ? 12 : 12.5, C.stampLight, { weight: '700' });
    y += 8;
  };

  section(CV.t('sheet.exp'));
  caseFile('exp', ['exp1', 'exp2', 'exp3'], 'exp', 'o1');

  section(CV.t('sheet.skills'));
  {
    const ok = CV.State.blocksOpen.has('skills');
    ['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6'].forEach(k =>
      para((ok ? '✓ ' : '· ') + CV.t('sheet.' + k), phone ? 13.5 : 14, ok ? 0xd6d0c2 : 0x767b83));
    if (!ok) para(CV.t('sheet.blockLocked', { o: CV.t('order.o3.name') }), phone ? 12 : 12.5, C.stampLight, { weight: '700' });
  }

  caseFile('playT', ['play1', 'play2', 'play3'], 'playable', 'o4');
  caseFile('stackT', ['stack1', 'stack2', 'stack3'], 'stack', 'o5');

  // честный блок
  section(CV.t('sheet.missing'));
  {
    const t = CV.makeText(CV.t('sheet.missingText'), phone ? 13 : 13.5, C.ink, {
      wrap: true, wrapWidth: colW - 36, ls: 0, lineHeight: (phone ? 13 : 13.5) * 1.45,
    });
    const boxH = t.height + 30;
    const box = CV.makeCard(colW, boxH, { red: true });
    box.position.set(0, y);
    t.position.set(16, y + 15);
    content.addChild(box, t);
    y += boxH + 16;
  }

  // контакты
  section(CV.t('sheet.contacts'));
  {
    const c = CV.DATA.contacts;
    const phoneT = CV.makeText(c.phone, phone ? 14 : 14.5, 0xd6d0c2, { weight: '700' });
    phoneT.position.set(0, y); content.addChild(phoneT); y += phoneT.height + 10;
    const email = CV.makeText(c.email, phone ? 14 : 14.5, 0xd6d0c2, { weight: '700' });
    email.position.set(0, y); content.addChild(email); y += email.height + 10;
    const gh = CV.makeText(c.github, phone ? 14 : 14.5, C.gold, { weight: '700' });
    gh.eventMode = 'static'; gh.cursor = 'pointer';
    gh.hitArea = new PIXI.Rectangle(0, -4, gh.width + 8, gh.height + 8);
    gh.on('pointertap', () => { if (!sc || !sc.wasDrag()) { CV.Sfx.tap(); window.open(c.gh, '_blank'); } });
    gh.position.set(0, y);
    content.addChild(gh); y += gh.height + 22;
  }

  // PDF
  const bPdf = CV.makeButton(CV.t('sheet.dl'), Math.min(colW, 360), {
    height: 54, size: phone ? 12.5 : 13, red: true,
    onTap: () => { if (!sc || !sc.wasDrag()) { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); } },
  });
  bPdf.position.set((colW - bPdf.w) / 2, y);
  content.addChild(bPdf);
  y += bPdf.height + 10;

  const note = CV.makeText(CV.t('common.pdfNote'), phone ? 11 : 11.5, C.grey, {
    align: 'center', wrap: true, wrapWidth: Math.min(colW - 20, 460), ls: 0, lineHeight: (phone ? 11 : 11.5) * 1.45,
  });
  note.anchor.set(0.5, 0);
  note.position.set(colW / 2, y);
  content.addChild(note);
  y += note.height + 22;

  const back = CV.makeButton(CV.t('common.back'), Math.min(colW, 220), {
    height: 48, size: 12.5, ghost: true,
    onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('map'); },
  });
  back.position.set((colW - back.w) / 2, y);
  content.addChild(back);
  y += back.height + 26;

  const contentH = y;

  // ── фиксированная шапка ──
  const header = new PIXI.Container();
  const hbg = new PIXI.Graphics();
  hbg.beginFill(C.panel, 0.98); hbg.drawRect(0, 0, W, headerH); hbg.endFill();
  hbg.beginFill(C.line); hbg.drawRect(0, headerH - 1, W, 1); hbg.endFill();
  header.addChild(hbg);

  const hBack = CV.makeButton(CV.t('common.back'), phone ? 78 : 100, {
    height: 36, size: phone ? 10.5 : 11.5, ghost: true,
    onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('map'); },
  });
  hBack.position.set(pad, (headerH - 36) / 2);
  const hTitle = CV.makeText(CV.t('sheet.title'), phone ? 14.5 : 16.5, C.paper, { head: true, weight: '700', upper: true, ls: 2 });
  hTitle.anchor.set(0.5); hTitle.position.set(W / 2, headerH / 2);
  const hPdf = new PIXI.Container();
  const hPdfIc = CV.makeIcon('pdf', 22, C.paper);
  hPdfIc.position.set(9, 9);
  hPdf.addChild(hPdfIc);
  hPdf.hitArea = new PIXI.Rectangle(0, 0, 40, 40);
  hPdf.eventMode = 'static'; hPdf.cursor = 'pointer';
  hPdf.position.set(W - pad - 40, (headerH - 40) / 2);
  hPdf.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); });
  header.addChild(hBack, hTitle, hPdf);
  view.addChild(header);

  // ── прокрутка (колесо мыши, свайп, клавиатура) ──
  const bar = CV.makeScrollBar(app, C.greyLine);
  view.addChild(bar.g);
  const viewTop = headerH + 8;
  const viewH = H - viewTop - 8;
  const maxScroll = () => Math.max(0, contentH + top + 18 - H);
  const sc = CV.scrollArea(app, view, {
    getMax: maxScroll,
    apply: off => { content.y = top + off; },
    onMove: off => bar.draw(off, maxScroll(), viewH, W - 6, viewTop),
  });
  sc.update();

  return {
    view, scroll,
    exit() { sc.destroy(); },
    update() {
      sc.update();
      bar.draw(sc.off, maxScroll(), viewH, W - 6, viewTop);
    },
  };
};
