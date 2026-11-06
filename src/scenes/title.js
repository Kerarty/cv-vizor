// ── сцена «Титул»: обложка дела на тёмном столе, штамп, свет лампы ──
CV.scenes = CV.scenes || {};
CV.scenes.title = (view, app) => {
  const W = () => app.screen.width, H = () => app.screen.height;
  const C = CV.COLORS;
  const layers = new PIXI.Container();
  view.addChild(layers);

  // стол
  const desk = new PIXI.Graphics();
  desk.beginFill(C.desk); desk.drawRect(0, 0, W(), H()); desk.endFill();
  layers.addChild(desk);

  // световое пятно лампы
  const pool = CV.makeLampPool(app, W() / 2, 600, 470);
  layers.addChild(pool);

  // пыль в свете
  const dust = CV.makeDust(app, 30);
  layers.addChild(dust);

  // ── обложка дела ──
  const ui = new PIXI.Container();
  layers.addChild(ui);

  const fw = 624, fh = 806, fx = (W() - fw) / 2, fy = Math.round((H() - fh) / 2);
  const folder = CV.makePanel(fw, fh);
  folder.position.set(fx, fy);
  ui.addChild(folder);

  const TX = fx + 56; // левый край текста

  // штамп «К РАССМОТРЕНИЮ»
  const stamp = CV.makeStamp(CV.t('title.stamp'), { size: 12 });
  stamp.position.set(fx + fw - stamp.w / 2 - 26, fy + 58);
  ui.addChild(stamp);

  // номер дела
  const caseNo = CV.makeText(CV.t('title.caseNo'), 13, C.ink60, { ls: 6, upper: true });
  caseNo.position.set(TX, fy + 66);
  ui.addChild(caseNo);

  // заголовок: Освальд, капсом, лесенкой
  const words = CV.t('title.name').split(' ');
  const lines = words.length >= 3 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : words;
  const maxTW = fw - 112;
  let ty = fy + 128;
  for (const line of lines) {
    const t = CV.makeText(line, 86, C.ink, { head: true, weight: '700', upper: true, ls: 1 });
    if (t.width > maxTW) t.scale.set(maxTW / t.width);
    t.position.set(TX, ty);
    ty += Math.round(t.height * 0.92);
    ui.addChild(t);
  }
  ty += 4;

  // кандидат и подзаголовок
  const cand = CV.makeText(CV.t('title.candidate'), 14, C.ink, { ls: 3, upper: true });
  cand.position.set(TX, ty); ui.addChild(cand);
  ty += 34;
  const sub = CV.makeText(CV.t('title.subtitle'), 13, C.ink60);
  sub.position.set(TX, ty); ui.addChild(sub);
  ty += 44;

  // мета
  const meta = CV.makeText(CV.t('title.meta'), 11, C.ink60, { wrap: true, wrapWidth: fw - 118 });
  meta.position.set(TX, ty); ui.addChild(meta);
  ty += Math.min(90, meta.height + 26);

  // кнопки
  const bOpen = CV.makeButton(CV.t('title.open'), 330, { height: 62, size: 15, onTap: () => { CV.Sfx.open(); CV.Scenes.switchTo('map'); } });
  bOpen.position.set(TX, ty);
  ui.addChild(bOpen);
  const bSkip = CV.makeButton(CV.t('title.skip'), 330, { height: 50, size: 12, onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('sheet'); } });
  bSkip.position.set(TX, ty + 78);
  ui.addChild(bSkip);

  // ряд: язык / PDF / звук — служебные кнопки на бумаге
  const row = new PIXI.Container();
  const rowY = fy + fh - 96;
  const mkPaperChip = (label) => {
    const t = CV.makeText(label, 12, C.ink, { ls: 2, upper: true });
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    const w = t.width + 20, h = 26;
    g.setStrokeStyle({ width: 1, color: C.ink60 });
    g.drawRect(0.5, 0.5, w - 1, h - 1); g.stroke();
    t.position.set(10, h / 2); t.anchor.set(0, 0.5);
    c.addChild(g, t);
    c.w = w; c.h = h;
    return c;
  };
  const bLang = mkPaperChip(CV.getLang().toUpperCase() + ' → ' + (CV.getLang() === 'ru' ? 'EN' : 'RU'));
  bLang.eventMode = 'static'; bLang.cursor = 'pointer';
  bLang.on('pointertap', () => {
    CV.setLang(CV.getLang() === 'ru' ? 'en' : 'ru'); CV.Sfx.tap();
    CV.Scenes.switchTo('title');
  });
  row.addChild(bLang);

  const bPdf = CV.makeIcon('pdf', 26, C.ink);
  bPdf.eventMode = 'static'; bPdf.cursor = 'pointer';
  bPdf.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); });
  const bSnd = new PIXI.Container();
  const drawSnd = () => {
    bSnd.removeChildren().forEach(c => c.destroy({ children: true }));
    bSnd.addChild(CV.makeIcon(CV.Sfx.muted ? 'mute' : 'sound', 26, C.ink));
  };
  bSnd.eventMode = 'static'; bSnd.cursor = 'pointer';
  bSnd.on('pointertap', () => { CV.Sfx.toggle(); drawSnd(); });
  drawSnd();
  row.addChild(bPdf, bSnd);
  // раскладка ряда
  let rx = TX;
  bLang.position.set(rx, rowY); rx += bLang.w + 22;
  bPdf.position.set(rx, rowY + 1); rx += 34;
  bSnd.position.set(rx, rowY + 1);
  ui.addChild(row);

  // подпись под обложкой
  const loaded = CV.makeText(CV.t('title.loaded', { n: (window.__loadMs / 1000).toFixed(2) }), 12, C.grey, { align: 'center' });
  loaded.anchor.set(0.5, 0);
  loaded.position.set(W() / 2, fy + fh + 26);
  ui.addChild(loaded);

  // виньетка поверх
  layers.addChild(CV.makeVignette(app));

  return {
    update(dt) {
      dust.update(dt);
      stamp.alpha = 0.84 + Math.sin(performance.now() / 1400) * 0.04;
    },
  };
};
