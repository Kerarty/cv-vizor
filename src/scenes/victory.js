// ── сцена «Дело закрыто»: эпилог на бумаге и штамп «ГОДЕН К НАЙМУ» ──
CV.scenes = CV.scenes || {};
CV.scenes.victory = (view, app) => {
  const L = CV.layout();
  const { W, H, phone, pad } = L;
  const C = CV.COLORS;

  const bg = new PIXI.Graphics();
  bg.beginFill(C.desk); bg.drawRect(0, 0, W, H); bg.endFill();
  view.addChild(bg);

  const pool = CV.makeLampPool(app, W / 2, H * 0.42, Math.min(W, H) * 0.7);
  view.addChild(pool);
  const dust = CV.makeDust(app, phone ? 16 : 26);
  view.addChild(dust);

  const paperW = Math.min(W - (phone ? 24 : 80), phone ? 560 : 640);
  const innerPad = phone ? 24 : 38;
  const innerW = paperW - innerPad * 2;

  const C2 = new PIXI.Container();
  let y = 0;

  const caseNo = CV.makeText(CV.t('victory.caseNo'), phone ? 11 : 12, C.ink60, { ls: 5, upper: true, align: 'center' });
  caseNo.anchor.set(0.5, 0); caseNo.position.set(innerW / 2, y);
  C2.addChild(caseNo);
  y += caseNo.height + 10;

  const title = CV.makeText(CV.t('victory.title'), phone ? 38 : 54, C.ink, { head: true, weight: '700', upper: true, ls: 1 });
  CV.fitText(title, innerW);
  title.anchor.set(0.5, 0); title.position.set(innerW / 2, y);
  C2.addChild(title);
  y += title.height + 8;

  const sub = CV.makeText(CV.t('victory.sub'), phone ? 12.5 : 13.5, C.ink60, {
    align: 'center', wrap: true, wrapWidth: innerW, ls: 0, lineHeight: (phone ? 12.5 : 13.5) * 1.4,
  });
  sub.anchor.set(0.5, 0); sub.position.set(innerW / 2, y);
  C2.addChild(sub);
  y += sub.height + 18;

  const s0 = performance.now() - (window.__sessionStart || performance.now());
  const stats = [
    CV.t('victory.orders', { n: CV.State.ordersCount }),
    CV.t('victory.clues', { n: CV.State.nuggets.size }),
    CV.t('victory.time', { s: Math.floor(s0 / 1000) }),
  ];
  const statsT = CV.makeText(stats.join('   ·   '), phone ? 12 : 13, C.ink, {
    weight: '700', align: 'center', wrap: true, wrapWidth: innerW, ls: 0, lineHeight: (phone ? 12 : 13) * 1.5,
  });
  statsT.anchor.set(0.5, 0); statsT.position.set(innerW / 2, y);
  C2.addChild(statsT);
  y += statsT.height + 12;

  const thanks = CV.makeText(CV.t('victory.thanks'), phone ? 12.5 : 13.5, C.ink60, {
    align: 'center', wrap: true, wrapWidth: innerW - 10, ls: 0, lineHeight: (phone ? 12.5 : 13.5) * 1.45,
  });
  thanks.anchor.set(0.5, 0); thanks.position.set(innerW / 2, y);
  C2.addChild(thanks);
  y += thanks.height + 22;

  // линии для подписи + штамп
  const rules = new PIXI.Graphics();
  rules.setStrokeStyle({ width: 1, color: C.ink, alpha: 0.35 });
  rules.moveTo(18, y + 28); rules.lineTo(innerW - 18, y + 28);
  rules.moveTo(18, y + 70); rules.lineTo(innerW - 18, y + 70);
  rules.stroke();
  C2.addChild(rules);

  const stamp = CV.makeStamp(CV.t('victory.stamp'), { size: phone ? 19 : 28, thick: 4, padX: 18, padY: 9, rotation: -6 * Math.PI / 180 });
  CV.placeStamp(stamp, (innerW - stamp.w) / 2, y + 12);
  stamp.visible = false;
  stamp.scale.set(2.4);
  C2.addChild(stamp);
  y += 100;

  // кнопки
  const bPdf = CV.makeButton(CV.t('sheet.dl'), Math.min(innerW, 360), {
    height: 52, size: phone ? 12.5 : 13, red: true,
    onTap: () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); },
  });
  bPdf.position.set((innerW - bPdf.w) / 2, y);
  C2.addChild(bPdf);
  y += bPdf.height + 10;

  const bMail = CV.makeButton(CV.t('victory.write'), Math.min(innerW, 360), {
    height: 48, size: phone ? 12 : 13,
    onTap: () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.mailto, '_blank'); },
  });
  bMail.position.set((innerW - bMail.w) / 2, y);
  C2.addChild(bMail);
  y += bMail.height + 12;

  const bGh = CV.makeChip(CV.DATA.contacts.github, { ghost: true, size: phone ? 11.5 : 12, color: C.gold, line: C.goldDeep, padX: 14 });
  if (bGh.w > innerW) bGh.scale.set(innerW / bGh.w);
  bGh.eventMode = 'static'; bGh.cursor = 'pointer';
  bGh.hitArea = new PIXI.Rectangle(0, 0, bGh.w + 8, bGh.h + 8);
  bGh.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.gh, '_blank'); });
  bGh.position.set((innerW - bGh.w * bGh.scale.x) / 2, y);
  C2.addChild(bGh);
  y += bGh.h + 8;

  const paperH = y + innerPad * 2;
  const paper = CV.makePanel(paperW, paperH);
  const paperC = new PIXI.Container();
  paperC.addChild(paper, C2);
  C2.position.set(innerPad, innerPad);

  const fitK = Math.min(1, (H - 24) / paperH);
  const paperX = (W - paperW) / 2;
  const paperY = Math.max(46, (H - paperH * fitK) / 2);
  paperC.position.set(paperX, paperY);
  paperC.scale.set(fitK);
  view.addChild(paperC);

  // назад — всегда на виду
  const back = CV.makeButton(CV.t('common.back'), phone ? 84 : 110, {
    height: 38, size: phone ? 10.5 : 11.5, ghost: true,
    onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('map'); },
  });
  back.position.set(pad, 10);
  view.addChild(back);

  view.addChild(CV.makeVignette(app, 0.3));

  setTimeout(() => {
    stamp.visible = true;
    CV.Sfx.done();
    CV.stampSlam(stamp);
  }, 600);

  return {
    update(dt) {
      dust.update(dt);
    },
  };
};
