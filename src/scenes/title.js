// ── сцена «Титул»: сумерки, станция, фонарь, снег, сияние ──
CV.scenes = CV.scenes || {};
CV.scenes.title = (view, app) => {
  const W = () => app.screen.width, H = () => app.screen.height;
  const layers = new PIXI.Container();
  view.addChild(layers);

  // небо
  const sky = new PIXI.Graphics();
  const drawSky = () => {
    sky.clear();
    sky.beginFill(0x12212c); sky.drawRect(0, 0, W(), H()); sky.endFill();
    sky.beginFill(0x1d3140); sky.drawRect(0, 0, W(), H() * 0.55); sky.endFill();
    sky.beginFill(0x274253); sky.drawRect(0, 0, W(), H() * 0.3); sky.endFill();
  };
  drawSky();
  layers.addChild(sky);

  // звёзды
  const stars = new PIXI.Container();
  for (let i = 0; i < 60; i++) {
    const s = new PIXI.Graphics();
    const a = 0.2 + Math.random() * 0.6;
    s.beginFill(0xffffff, a); s.drawCircle(0, 0, Math.random() * 1.6 + 0.6); s.endFill();
    s.x = Math.random() * 720; s.y = Math.random() * 420;
    s._tw = Math.random() * Math.PI * 2;
    stars.addChild(s);
  }
  layers.addChild(stars);

  const aurora = CV.makeAurora(app, { y: 170, alpha: 0.55 });
  layers.addChild(aurora);

  // дальние ели (силуэты)
  const far = new PIXI.Graphics();
  const pine = (g, x, y, s, color) => {
    g.beginFill(color);
    for (let i = 0; i < 3; i++) {
      const w = (34 - i * 8) * s, yy = y - i * 16 * s;
      g.drawPolygon([x, yy - 26 * s, x + w / 2, yy, x - w / 2, yy]);
    }
    g.drawRect(x - 2.5 * s, y, 5 * s, 10 * s);
    g.endFill();
  };
  for (let i = 0; i < 14; i++) pine(far, 20 + i * 52 + Math.random() * 20, 560 + Math.random() * 24, 0.8 + Math.random() * 0.5, 0x18292f);
  layers.addChild(far);

  // снежная земля
  const ground = new PIXI.Graphics();
  const drawGround = () => {
    ground.clear();
    ground.beginFill(0xd7e4ea); ground.drawRect(0, 620, W(), H() - 620); ground.endFill();
    ground.beginFill(CV.COLORS.snow); ground.drawRect(0, 660, W(), H() - 660); ground.endFill();
    // сугробы
    ground.beginFill(0xf6fafc, 0.85);
    for (let x = -40; x < W() + 60; x += 90) ground.ellipse(x, 690 + (x % 3) * 14, 90, 26);
    ground.endFill();
  };
  drawGround();
  layers.addChild(ground);

  // станция с тёплым окном
  const hut = new PIXI.Container();
  const hutG = new PIXI.Graphics();
  hutG.beginFill(CV.COLORS.woodDark); hutG.drawPolygon([0, 0, 90, 0, 90, 66, 0, 66]); hutG.endFill();
  hutG.beginFill(CV.COLORS.wood); hutG.drawRect(4, 8, 82, 54); hutG.endFill();
  hutG.beginFill(CV.COLORS.woodDark); hutG.drawPolygon([-8, 2, 45, -34, 98, 2]); hutG.endFill();
  hutG.beginFill(0xd9c8a6); hutG.drawPolygon([-6, 0, 45, -30, 96, 0]); hutG.endFill();
  hutG.beginFill(CV.COLORS.gold); hutG.drawRect(18, 22, 20, 18); hutG.endFill();
  hutG.beginFill(CV.COLORS.goldLight, 0.85); hutG.drawRect(20, 24, 16, 7); hutG.endFill();
  hutG.beginFill(0x3d2606); hutG.drawRect(56, 30, 22, 36); hutG.endFill();
  const glow = new PIXI.Graphics();
  glow.beginFill(CV.COLORS.gold, 0.16); glow.drawCircle(28, 31, 46); glow.endFill();
  hut.addChild(glow, hutG);
  hut.position.set(310, 700);
  hut.scale.set(1.25);
  layers.addChild(hut);

  // фонарь
  const lamp = new PIXI.Container();
  const lampG = new PIXI.Graphics();
  lampG.beginFill(CV.COLORS.woodDark); lampG.drawRect(-2, -6, 4, 70); lampG.endFill();
  lampG.beginFill(CV.COLORS.gold); lampG.drawRoundedRect(-9, -30, 18, 24, 4); lampG.endFill();
  lampG.beginFill(CV.COLORS.goldLight, 0.9); lampG.drawRoundedRect(-6, -27, 12, 18, 3); lampG.endFill();
  const halo = new PIXI.Graphics();
  halo.beginFill(CV.COLORS.gold, 0.13); halo.drawCircle(0, -18, 64); halo.endFill();
  lamp.addChild(halo, lampG);
  lamp.position.set(170, 760);
  layers.addChild(lamp);

  const snow = CV.makeSnow(app, 110);
  layers.addChild(snow);

  // ── UI ──
  const ui = new PIXI.Container();
  layers.addChild(ui);

  const title = CV.makeText(CV.t('title.name'), 68, CV.COLORS.gold, { display: true, align: 'center', shadow: true, shadowColor: 0x000000 });
  title.anchor.set(0.5, 0.5);
  title.position.set(W() / 2, 300);
  // автоподгонка: не шире экрана
  const maxW = W() - 40;
  if (title.width > maxW) title.scale.set(maxW / title.width);
  ui.addChild(title);

  const sub = CV.makeText(CV.t('title.subtitle'), 26, 0xcfe0ea, { align: 'center', ls: 3 });
  sub.anchor.set(0.5);
  sub.position.set(W() / 2, 368);
  ui.addChild(sub);

  const hint = CV.makeText(CV.t('title.hint'), 17, 0x9fb8c9, { align: 'center' });
  hint.anchor.set(0.5);
  hint.position.set(W() / 2, 404);
  ui.addChild(hint);

  const bx = W() / 2;
  const bPlay = CV.makeButton(CV.t('title.play'), 320, { height: 72, size: 27, onTap: () => { CV.Sfx.open(); CV.Scenes.switchTo('map'); } });
  bPlay.position.set(bx - 160, 850);
  ui.addChild(bPlay);

  const bSkip = CV.makeButton(CV.t('title.skip'), 320, { height: 60, size: 21, onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('sheet'); } });
  bSkip.position.set(bx - 160, 946);
  ui.addChild(bSkip);

  // RU|EN + PDF + звук
  const row = new PIXI.Container();
  const bLang = CV.makeChip(CV.getLang().toUpperCase() + ' → ' + (CV.getLang() === 'ru' ? 'EN' : 'RU'), { size: 15, fill: 0x00000030, line: 0xcfe0ea88, color: 0xffffff });
  bLang.eventMode = 'static'; bLang.cursor = 'pointer';
  bLang.on('pointertap', () => {
    CV.setLang(CV.getLang() === 'ru' ? 'en' : 'ru'); CV.Sfx.tap();
    CV.Scenes.switchTo('title');
  });
  row.addChild(bLang);

  const iconPdf = CV.makeIcon('pdf', 30);
  const bPdf = new PIXI.Container();
  bPdf.addChild(iconPdf);
  bPdf.eventMode = 'static'; bPdf.cursor = 'pointer';
  bPdf.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); });
  bPdf.position.set(0, 0);
  row.addChild(bPdf);

  const bSnd = new PIXI.Container();
  const drawSndIcon = () => {
    bSnd.removeChildren().forEach(c => c.destroy({ children: true }));
    bSnd.addChild(CV.makeIcon(CV.Sfx.muted ? 'mute' : 'sound', 30, 0x2e5d4b));
  };
  bSnd.eventMode = 'static'; bSnd.cursor = 'pointer';
  bSnd.on('pointertap', () => { CV.Sfx.toggle(); drawSndIcon(); });
  drawSndIcon();
  row.addChild(bSnd);

  row.children.forEach((c, i) => { c.x = i * 70; });
  row.position.set(W() / 2 - 70, 1046);
  ui.addChild(row);

  const loaded = CV.makeText(CV.t('title.loaded', { n: (window.__loadMs / 1000).toFixed(2) }), 15, 0x7d97a8, { align: 'center' });
  loaded.anchor.set(0.5);
  loaded.position.set(W() / 2, H() - 26);
  ui.addChild(loaded);

  return {
    update(dt) {
      snow.update(dt);
      aurora.update(dt);
      stars.children.forEach(s => { s._tw += dt * 2; s.alpha = 0.35 + Math.sin(s._tw) * 0.3; });
      halo.alpha = 0.1 + Math.sin(performance.now() / 700) * 0.035;
      glow.alpha = 0.13 + Math.sin(performance.now() / 900) * 0.04;
    },
  };
};
