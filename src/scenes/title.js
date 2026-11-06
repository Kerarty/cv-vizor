// ── сцена «Титул»: обложка дела на тёмном столе, штамп, свет лампы ──
CV.scenes = CV.scenes || {};
CV.scenes.title = (view, app) => {
  const L = CV.layout();
  const { W, H, phone, fs } = L;
  const C = CV.COLORS;
  const layers = new PIXI.Container();
  view.addChild(layers);

  // стол
  const desk = new PIXI.Graphics();
  desk.beginFill(C.desk); desk.drawRect(0, 0, W, H); desk.endFill();
  layers.addChild(desk);

  // световое пятно лампы и пыль
  const pool = CV.makeLampPool(app, W / 2, H * 0.44, Math.min(W, H) * 0.72);
  layers.addChild(pool);
  const dust = CV.makeDust(app, phone ? 18 : 30);
  layers.addChild(dust);

  // ── обложка дела: ширина по экрану, высота по контенту ──
  const cardW = Math.min(W - (phone ? 24 : 80), 640);
  const pad = phone ? 24 : 46;
  const innerW = cardW - pad * 2;

  const ui = new PIXI.Container();
  const content = new PIXI.Container();
  ui.addChild(content);

  let y = pad;

  // номер дела
  const caseNo = CV.makeText(CV.t('title.caseNo'), phone ? 11.5 : 13, C.ink60, { ls: 5, upper: true });
  caseNo.position.set(pad, y);
  content.addChild(caseNo);

  // штамп «К РАССМОТРЕНИЮ» — верхний правый угол
  const stamp = CV.makeStamp(CV.t('title.stamp'), { size: phone ? 10 : 12 });
  CV.placeStamp(stamp, cardW - pad - stamp.w, y - 2);
  content.addChild(stamp);
  y += 34;

  // заголовок: Освальд, капсом, лесенкой
  const words = CV.t('title.name').split(' ');
  const lines = words.length >= 3 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : words;
  const titleSize = phone ? 54 : 78;
  for (const line of lines) {
    const t = CV.makeText(line, titleSize, C.ink, { head: true, weight: '700', upper: true, ls: 1 });
    CV.fitText(t, innerW);
    t.position.set(pad, y);
    content.addChild(t);
    y += Math.round(t.height * (phone ? 0.96 : 0.94));
  }
  y += phone ? 2 : 6;

  // кандидат, подзаголовок, мета
  const cand = CV.makeText(CV.t('title.candidate'), phone ? 13 : 15, C.ink, { ls: 1.5, upper: true, wrap: true, wrapWidth: innerW });
  cand.position.set(pad, y);
  CV.fitText(cand, innerW);
  content.addChild(cand);
  y += cand.height + 8;

  const sub = CV.makeText(CV.t('title.subtitle'), phone ? 12.5 : 14, C.ink60, { wrap: true, wrapWidth: innerW, ls: 0, lineHeight: (phone ? 12.5 : 14) * 1.4 });
  sub.position.set(pad, y);
  content.addChild(sub);
  y += sub.height + 14;

  const meta = CV.makeText(CV.t('title.meta'), phone ? 11.5 : 12.5, C.ink60, {
    wrap: true, wrapWidth: innerW, ls: 0, lineHeight: (phone ? 11.5 : 12.5) * 1.45,
  });
  meta.position.set(pad, y);
  content.addChild(meta);
  y += meta.height + 22;

  // кнопки — на всю ширину обложки
  const bOpen = CV.makeButton(CV.t('title.open'), innerW, {
    height: phone ? 54 : 60, size: phone ? 14 : 15,
    onTap: () => { CV.Sfx.open(); CV.Scenes.switchTo('map'); },
  });
  bOpen.position.set(pad, y);
  content.addChild(bOpen);
  y += bOpen.height + 12;

  const bSkip = CV.makeButton(CV.t('title.skip'), innerW, {
    height: phone ? 48 : 52, size: phone ? 12.5 : 13,
    onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('sheet'); },
  });
  bSkip.position.set(pad, y);
  content.addChild(bSkip);
  y += bSkip.height + 26;

  // служебный ряд: язык / PDF / звук — крупные тач-цели
  const mkPaperChip = (label) => {
    const t = CV.makeText(label, phone ? 11.5 : 12, C.ink, { ls: 1.5, upper: true });
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    const w = t.width + 24, h = 34;
    g.setStrokeStyle({ width: 1, color: C.ink60 });
    g.drawRect(0.5, 0.5, w - 1, h - 1); g.stroke();
    t.position.set(12, h / 2); t.anchor.set(0, 0.5);
    c.addChild(g, t);
    c.w = w; c.h = h;
    c.hitArea = new PIXI.Rectangle(-4, -5, w + 8, h + 10);
    return c;
  };
  const mkIconBtn = (kind, size) => {
    const c = new PIXI.Container();
    const ic = CV.makeIcon(kind, size, C.ink);
    ic.position.set(8, 8);
    c.addChild(ic);
    c.w = c.h = size + 16;
    c.hitArea = new PIXI.Rectangle(-4, -4, c.w + 8, c.h + 8);
    c.eventMode = 'static'; c.cursor = 'pointer';
    return c;
  };

  const row = new PIXI.Container();
  const bLang = mkPaperChip(CV.getLang().toUpperCase() + ' → ' + (CV.getLang() === 'ru' ? 'EN' : 'RU'));
  bLang.eventMode = 'static'; bLang.cursor = 'pointer';
  bLang.on('pointertap', () => {
    CV.setLang(CV.getLang() === 'ru' ? 'en' : 'ru'); CV.Sfx.tap();
    CV.Scenes.switchTo('title');
  });
  const bPdf = mkIconBtn('pdf', phone ? 24 : 26);
  bPdf.on('pointertap', () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); });
  const bSnd = mkIconBtn('sound', phone ? 24 : 26);
  const drawSnd = () => {
    bSnd.removeChildren().forEach(c => c.destroy({ children: true }));
    const ic = CV.makeIcon(CV.Sfx.muted ? 'mute' : 'sound', phone ? 24 : 26, C.ink);
    ic.position.set(8, 8);
    bSnd.addChild(ic);
  };
  drawSnd();
  bSnd.on('pointertap', () => { CV.Sfx.toggle(); drawSnd(); });

  row.addChild(bLang, bPdf, bSnd);
  let rx = 0;
  bLang.position.set(rx, 0); rx += bLang.w + 18;
  bPdf.position.set(rx, 3); rx += bPdf.w + 14;
  bSnd.position.set(rx, 3);
  row.position.set(pad, y);
  content.addChild(row);
  y += 42;

  // высота обложки по контенту; на крошечных экранах слегка ужимаем
  const cardH = y + pad - 10;
  const fitK = Math.min(1, (H - 20) / cardH);
  const cardX = (W - cardW) / 2;
  const cardY = Math.max(10, (H - cardH * fitK) / 2 - 6);

  const folder = CV.makePanel(cardW, cardH);
  folder.position.set(0, 0);
  ui.addChildAt(folder, 0);
  ui.position.set(cardX, cardY);
  ui.scale.set(fitK);
  layers.addChild(ui);

  // подпись под обложкой
  const loaded = CV.makeText(CV.t('title.loaded', { n: (window.__loadMs / 1000).toFixed(2) }), phone ? 11 : 12, C.grey, { align: 'center' });
  loaded.anchor.set(0.5, 0);
  loaded.position.set(W / 2, Math.min(H - 18, cardY + cardH * fitK + 14));
  layers.addChild(loaded);

  // виньетка поверх
  layers.addChild(CV.makeVignette(app));

  return {
    update(dt) {
      dust.update(dt);
      stamp.alpha = 0.84 + Math.sin(performance.now() / 1400) * 0.04;
    },
  };
};
