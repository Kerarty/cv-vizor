// ── сцена «Отчёт экспедиции» — финал ──
CV.scenes = CV.scenes || {};
CV.scenes.victory = (view, app) => {
  const W = () => app.screen.width, H = () => app.screen.height;
  const C = CV.COLORS;

  const sky = new PIXI.Graphics();
  sky.beginFill(0x12212c); sky.drawRect(0, 0, W(), H()); sky.endFill();
  sky.beginFill(0x1d3140); sky.drawRect(0, 0, W(), H() * 0.5); sky.endFill();
  view.addChild(sky);

  const aurora = CV.makeAurora(app, { y: 150, alpha: 0.6 });
  view.addChild(aurora);

  // форт: настоящее кирпичное здание + флаг
  const fort = new PIXI.Container();
  const fortSpr = CV.sprite('b-fort');
  if (fortSpr) {
    fortSpr.height = 320; fortSpr.width = 320;
    fortSpr.anchor.set(0.5, 0.94);
    fortSpr.position.set(0, 40);
    fort.addChild(fortSpr);
    const flag = new PIXI.Graphics();
    flag.beginFill(C.brusnika); flag.drawRect(-2, -230, 3, 60); flag.endFill();
    flag.beginFill(C.gold); flag.drawPolygon([1, -230, 40, -218, 1, -206]); flag.endFill();
    fort.addChild(flag);
  }
  fort.position.set(W() / 2, 380);
  view.addChild(fort);

  const ground = new PIXI.Graphics();
  ground.beginFill(0xd7e4ea); ground.drawRect(0, 470, W(), H() - 470); ground.endFill();
  ground.beginFill(C.snow); ground.drawRect(0, 510, W(), H() - 510); ground.endFill();
  view.addChild(ground);

  const snow = CV.makeSnow(app, 90);
  view.addChild(snow);

  const title = CV.makeText(CV.t('victory.title'), 52, C.gold, { display: true, shadow: true });
  title.anchor.set(0.5); title.position.set(W() / 2, 60);
  const sub = CV.makeText(CV.t('victory.sub'), 19, 0xe8f2f7, { weight: '600' });
  sub.anchor.set(0.5); sub.position.set(W() / 2, 104);
  view.addChild(title, sub);

  const s0 = performance.now() - (window.__sessionStart || performance.now());
  const stats = [
    CV.t('victory.orders', { n: CV.State.ordersCount }),
    CV.t('victory.nuggets', { n: CV.State.nuggets.size }),
    CV.t('victory.time', { s: Math.floor(s0 / 1000) }),
  ];
  const statsT = CV.makeText(stats.join('   ·   '), 17, 0x4a5a64, { weight: '800', align: 'center' });
  statsT.anchor.set(0.5); statsT.position.set(W() / 2, 570);
  const thanks = CV.makeText(CV.t('victory.thanks'), 15, 0x9fb8c9, { align: 'center', wrap: true, wrapWidth: W() - 120 });
  thanks.anchor.set(0.5); thanks.position.set(W() / 2, 620);
  view.addChild(statsT, thanks);

  const bPdf = CV.makeButton(CV.t('sheet.dl'), 320, { height: 64, size: 20, onTap: () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); } });
  bPdf.position.set(W() / 2 - 160, 690);
  const bMail = CV.makeButton(CV.t('victory.write'), 320, { height: 58, size: 18, onTap: () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.mailto, '_blank'); } });
  bMail.position.set(W() / 2 - 160, 776);
  const bGh = CV.makeChip(CV.DATA.contacts.github, { size: 16, fill: 0x1d3140cc, line: 0x9fd6b8, color: 0x9fd6b8 });
  bGh.eventMode = 'static'; bGh.cursor = 'pointer';
  bGh.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.gh, '_blank'); });
  bGh.position.set(W() / 2 - bGh.w / 2, 858);
  view.addChild(bPdf, bMail, bGh);

  const back = CV.makeButton(CV.t('common.back'), 170, { height: 50, size: 17, onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('map'); } });
  back.position.set(W() / 2 - 85, H() - 70);
  view.addChild(back);

  return {
    update(dt) {
      snow.update(dt);
      aurora.update(dt);
      fort.y = 380 + Math.sin(performance.now() / 900) * 4;
    },
  };
};
