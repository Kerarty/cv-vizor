// ── сцена «Дело закрыто»: эпилог на бумаге и штамп «ГОДЕН К НАЙМУ» ──
CV.scenes = CV.scenes || {};
CV.scenes.victory = (view, app) => {
  const W = () => app.screen.width, H = () => app.screen.height;
  const C = CV.COLORS;

  const bg = new PIXI.Graphics();
  bg.beginFill(C.desk); bg.drawRect(0, 0, W(), H()); bg.endFill();
  view.addChild(bg);

  const pool = CV.makeLampPool(app, W() / 2, H() / 2 - 60, 440);
  view.addChild(pool);
  const dust = CV.makeDust(app, 26);
  view.addChild(dust);

  // группа контента — вертикально центрируется на любом экране
  const G = new PIXI.Container();
  G.position.y = Math.round((H() - 1070) / 2) - 130;
  view.addChild(G);

  // эпилог: лист дела
  const pw = 620, ph = 560;
  const paper = CV.makePanel(pw, ph);
  paper.position.set((W() - pw) / 2, 170);
  G.addChild(paper);

  const caseNo = CV.makeText(CV.t('victory.caseNo'), 12, C.ink60, { ls: 6, upper: true });
  caseNo.anchor.set(0.5, 0);
  caseNo.position.set(W() / 2, 216);
  const title = CV.makeText(CV.t('victory.title'), 62, C.ink, { head: true, weight: '700', upper: true });
  title.anchor.set(0.5, 0);
  title.position.set(W() / 2, 250);
  const sub = CV.makeText(CV.t('victory.sub'), 13, C.ink60);
  sub.anchor.set(0.5, 0);
  sub.position.set(W() / 2, 328);
  G.addChild(caseNo, title, sub);

  const s0 = performance.now() - (window.__sessionStart || performance.now());
  const stats = [
    CV.t('victory.orders', { n: CV.State.ordersCount }),
    CV.t('victory.clues', { n: CV.State.nuggets.size }),
    CV.t('victory.time', { s: Math.floor(s0 / 1000) }),
  ];
  const statsT = CV.makeText(stats.join('   ·   '), 12.5, C.ink, { weight: '700', align: 'center', ls: 0 });
  statsT.anchor.set(0.5, 0);
  statsT.position.set(W() / 2, 392);
  const thanks = CV.makeText(CV.t('victory.thanks'), 12, C.ink60, { align: 'center', wrap: true, wrapWidth: 480, ls: 0 });
  thanks.anchor.set(0.5, 0);
  thanks.position.set(W() / 2, 428);
  G.addChild(statsT, thanks);

  // линии для подписи — внутри листа, независимо от ширины стола
  const rules = new PIXI.Graphics();
  rules.setStrokeStyle({ width: 1, color: C.ink, alpha: 0.35 });
  rules.moveTo(90, 560); rules.lineTo(530, 560);
  rules.moveTo(90, 610); rules.lineTo(530, 610);
  rules.stroke();
  rules.position.set((W() - 620) / 2, 0);
  G.addChild(rules);

  // штамп «ГОДЕН К НАЙМУ» — влётовский шлепок
  const stamp = CV.makeStamp(CV.t('victory.stamp'), { size: 30, thick: 5, padX: 24, padY: 12, rotation: -6 * Math.PI / 180 });
  stamp.position.set(W() / 2 - 20, 586);
  stamp.visible = false;
  stamp.scale.set(2.6);
  G.addChild(stamp);
  setTimeout(() => { CV.Sfx.done(); CV.stampSlam(stamp); }, 700);

  const bPdf = CV.makeButton(CV.t('sheet.dl'), 340, { height: 60, size: 13, red: true, onTap: () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); } });
  bPdf.position.set(W() / 2 - 170, 786);
  const bMail = CV.makeButton(CV.t('victory.write'), 340, { height: 54, size: 13, onTap: () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.mailto, '_blank'); } });
  bMail.position.set(W() / 2 - 170, 862);
  const bGh = CV.makeChip(CV.DATA.contacts.github, { ghost: true, size: 12, color: C.gold, line: C.goldDeep, padX: 14 });
  bGh.eventMode = 'static'; bGh.cursor = 'pointer';
  bGh.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.gh, '_blank'); });
  bGh.position.set(W() / 2 - bGh.w / 2, 938);
  G.addChild(bPdf, bMail, bGh);

  const back = CV.makeButton(CV.t('common.back'), 170, { height: 48, size: 12, ghost: true, onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('map'); } });
  back.position.set(W() / 2 - 85, H() - 66);
  view.addChild(back);

  view.addChild(CV.makeVignette(app, 0.3));

  return {
    update(dt) {
      dust.update(dt);
    },
  };
};
