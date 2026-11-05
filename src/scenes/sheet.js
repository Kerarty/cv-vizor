// ── сцена «Лист кандидата»: досье на амбарных досках ──
CV.scenes = CV.scenes || {};
CV.scenes.sheet = (view, app) => {
  const W = () => app.screen.width, H = () => app.screen.height;
  const C = CV.COLORS;

  const bg = new PIXI.Graphics();
  bg.beginFill(0x243b47); bg.drawRect(0, 0, W(), H()); bg.endFill();
  view.addChild(bg);
  const snow = CV.makeSnow(app, 36);
  view.addChild(snow);

  const scroll = new PIXI.Container();
  view.addChild(scroll);
  const content = new PIXI.Container();
  scroll.addChild(content);

  let y = 26;
  const addAt = (el, x, yy) => { el.position.set(x, yy); content.addChild(el); return el; };

  const panel = CV.makePanel(Math.min(660, W() - 40), 1, { radius: 22 });
  addAt(panel, (W() - panel.width) / 2, y);
  const px = panel.x, pw = panel.width;

  const title = CV.makeText(CV.t('sheet.title'), 40, C.paper, { display: true });
  title.anchor.set(0.5);
  addAt(title, W() / 2, y + 52);
  // лента из Xmas-пака за заголовком
  const ribbon = CV.sprite('ribbon');
  if (ribbon) {
    const rw = Math.min(560, W() - 80), rh = rw * (138 / 882);
    ribbon.width = rw; ribbon.height = rh;
    ribbon.anchor.set(0.5);
    ribbon.position.set(W() / 2, y + 52);
    ribbon.alpha = 0.95;
    content.addChildAt(ribbon, content.getChildIndex(title));
    title.style.fill = 0x3d2606;
    title.style.dropShadow = null;
  }
  const golden = CV.State.nuggets.size >= 3;
  if (golden) {
    const g = new PIXI.Graphics();
    g.beginFill(C.gold, 0.25); g.drawRoundedRect(px + 24, y + 88, pw - 48, 30, 15); g.endFill();
    g.lineStyle(1.5, C.gold); g.drawRoundedRect(px + 24, y + 88, pw - 48, 30, 15);
    const gt = CV.makeText('★ ' + CV.t('sheet.golden'), 14, C.goldLight, { weight: '800' });
    gt.anchor.set(0.5); gt.position.set(W() / 2, y + 103);
    content.addChild(g, gt);
  }

  const role = CV.makeText(CV.t('sheet.role'), 16, 0xcfe0ea, { align: 'center', weight: '600' });
  role.anchor.set(0.5);
  addAt(role, W() / 2, y + (golden ? 134 : 118));

  // ── характеристики ──
  y = (golden ? 170 : 152);
  const statLabels = { design: 'Гейм-дизайн|Game design', balance: 'Баланс и экономика|Balance & economy', proto: 'Прототипирование|Prototyping', docs: 'Документация|Documentation' };
  CV.DATA.sheetStats.forEach((s, i) => {
    const [ru, en] = statLabels[s.id].split('|');
    const label = CV.makeText(CV.getLang() === 'ru' ? ru : en, 15, 0xe8f2f7, { weight: '700' });
    label.position.set(px + 44, y + i * 34 + 4);
    const track = new PIXI.Graphics();
    track.beginFill(0x12212c, 0.53); track.drawRoundedRect(px + 44 + 190, y + i * 34 + 6, 300, 14, 7); track.endFill();
    const fillG = new PIXI.Graphics();
    fillG.beginFill(C.gold); fillG.drawRect(px + 44 + 190, y + i * 34 + 6, 1, 14); fillG.endFill();
    fillG.scale.set(0.001, 1);
    content.addChild(label, track, fillG);
    CV.tween(fillG.scale, { x: 300 * s.value }, 900 + i * 150);
  });
  y += 4 * 34 + 16;

  // ── секции ──
  const section = (name, builder) => {
    const st = CV.makeText(name, 22, C.gold, { display: true });
    addAt(st, px + 44, y); y += 38;
    builder();
    y += 14;
  };
  const para = (text, size = 15, color = 0xe8f2f7, weight = '500') => {
    const t = CV.makeText(text, size, color, { wrap: true, wrapWidth: pw - 100, weight, lineJoin: 'round' });
    addAt(t, px + 44, y);
    y += t.height + 10;
  };

  section(CV.t('sheet.about'), () => para(CV.t('sheet.aboutText')));
  section(CV.t('sheet.edu'), () => para(CV.t('sheet.eduText')));

  // проекты (блок exp)
  const lockHint = orderName => CV.t('sheet.blockLocked', { o: orderName });
  section(CV.t('sheet.exp'), () => {
    ['exp1', 'exp2', 'exp3'].forEach(k => {
      const ok = CV.State.blocksOpen.has('exp');
      para((ok ? '✓ ' : '· ') + CV.t('sheet.' + k), 14, ok ? 0xe8f2f7 : 0x7d97a8);
    });
    if (!CV.State.blocksOpen.has('exp')) para(lockHint('o1'), 12, C.brusnika, '700');
  });

  // навыки
  section(CV.t('sheet.skills'), () => {
    ['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6'].forEach(k => {
      const ok = CV.State.blocksOpen.has('skills');
      para((ok ? '✓ ' : '· ') + CV.t('sheet.' + k), 14, ok ? 0xe8f2f7 : 0x7d97a8);
    });
    if (!CV.State.blocksOpen.has('skills')) para(lockHint('o3'), 12, C.brusnika, '700');
  });

  // playable-кейс
  section(CV.t('sheet.playT'), () => {
    ['play1', 'play2', 'play3'].forEach(k => {
      const ok = CV.State.blocksOpen.has('playable');
      para((ok ? '✓ ' : '· ') + CV.t('sheet.' + k), 14, ok ? 0xe8f2f7 : 0x7d97a8);
    });
    if (!CV.State.blocksOpen.has('playable')) para(lockHint('o4'), 12, C.brusnika, '700');
  });

  // стек
  section(CV.t('sheet.stackT'), () => {
    ['stack1', 'stack2', 'stack3'].forEach(k => {
      const ok = CV.State.blocksOpen.has('stack');
      para((ok ? '✓ ' : '· ') + CV.t('sheet.' + k), 14, ok ? 0xe8f2f7 : 0x7d97a8);
    });
    if (!CV.State.blocksOpen.has('stack')) para(lockHint('o5'), 12, C.brusnika, '700');
  });

  // честный блок
  section(CV.t('sheet.missing'), () => {
    const t = CV.makeText(CV.t('sheet.missingText'), 14, 0xf2d7b0, { wrap: true, wrapWidth: pw - 100, weight: '500' });
    const box = new PIXI.Graphics();
    box.beginFill(0x8f2f27, 0.2); box.drawRoundedRect(px + 30, y - 8, pw - 60, t.height + 26, 10); box.endFill();
    box.lineStyle(1.5, C.brusnika, 0.8); box.drawRoundedRect(px + 30, y - 8, pw - 60, t.height + 26, 10);
    addAt(box, 0, 0);
    addAt(t, px + 44, y);
    y += t.height + 30;
  });

  // контакты
  section(CV.t('sheet.contacts'), () => {
    const c = CV.DATA.contacts;
    const phone = CV.makeText(c.phone, 17, 0xe8f2f7, { weight: '700' });
    addAt(phone, px + 44, y); y += 30;
    const email = CV.makeText(c.email, 17, 0xe8f2f7, { weight: '700' });
    addAt(email, px + 44, y); y += 30;
    const gh = CV.makeText(c.github, 17, 0x9fd6b8, { weight: '700' });
    gh.eventMode = 'static'; gh.cursor = 'pointer';
    gh.on('pointertap', () => { CV.Sfx.tap(); window.open(c.gh, '_blank'); });
    addAt(gh, px + 44, y); y += 34;
  });

  // PDF
  const bPdf = CV.makeButton(CV.t('sheet.dl'), 320, { height: 58, size: 19, onTap: () => { CV.Sfx.tap(); window.open(CV.DATA.contacts.pdf, '_blank'); } });
  addAt(bPdf, W() / 2 - 160, y + 6);
  y += 76;
  const note = CV.makeText(CV.t('common.pdfNote'), 12, 0x9fb8c9, { align: 'center', wrap: true, wrapWidth: pw - 80 });
  note.anchor.set(0.5);
  addAt(note, W() / 2, y + 4);
  y += 44;

  // подгоняем панель под контент
  panel.clear();
  const rebuilt = CV.makePanel(pw, y + 30, { radius: 22 });
  rebuilt.position.copyFrom(panel.position);
  content.addChildAt(rebuilt, content.getChildIndex(panel));
  content.removeChild(panel);
  panel.destroy();

  const contentH = y + 60;
  const back = CV.makeButton(CV.t('common.back'), 170, { height: 54, size: 19, onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('map'); } });
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
    update(dt) {
      snow.update(dt);
      scroll.y = -Math.min(Math.max(0, scroll._off || 0), maxScroll());
    },
  };
};
