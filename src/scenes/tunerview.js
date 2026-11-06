// ── сцена «Тюнер события»: расчётный лист на бумаге, чернила и красный карандаш ──
CV.scenes = CV.scenes || {};
CV.scenes.tuner = (view, app) => {
  const L = CV.layout();
  const { W, H, phone, pad, colW, colX, headerH } = L;
  const C = CV.COLORS;
  const params = { ...CV.Tuner.defaults };
  let result = CV.Tuner.compute(params);

  const bg = new PIXI.Graphics();
  bg.beginFill(C.desk); bg.drawRect(0, 0, W, H); bg.endFill();
  view.addChild(bg);
  view.addChild(CV.makeVignette(app, 0.32));

  // прокручиваемый лист
  const scroll = new PIXI.Container();
  view.addChild(scroll);
  const contentTop = headerH + 14;
  const paperW = Math.min(W - pad * 2, phone ? 700 : 720);
  const paperX = (W - paperW) / 2;
  const innerPad = phone ? 18 : 26;
  const innerW = paperW - innerPad * 2;

  const C2 = new PIXI.Container();

  let y = 0;
  const title = CV.makeText(CV.t('tuner.title'), phone ? 23 : 30, C.ink, { head: true, weight: '700', upper: true });
  title.anchor.set(0.5, 0);
  CV.fitText(title, innerW);
  title.position.set(innerW / 2, y);
  C2.addChild(title);
  y += title.height + 8;

  const intro = CV.makeText(CV.t('tuner.intro'), phone ? 12.5 : 13.5, C.ink60, {
    wrap: true, wrapWidth: innerW, align: 'center', ls: 0, lineHeight: (phone ? 12.5 : 13.5) * 1.42,
  });
  intro.anchor.set(0.5, 0);
  intro.position.set(innerW / 2, y);
  C2.addChild(intro);
  y += intro.height + 6;

  const note = CV.makeText(CV.t('tuner.cohortNote'), phone ? 10.5 : 11, C.ink40, { align: 'center' });
  note.anchor.set(0.5, 0);
  note.position.set(innerW / 2, y);
  C2.addChild(note);
  y += note.height + 20;

  // ── слайдеры ──
  const sliderDefs = [
    { key: 'T', label: 'tuner.dur', unit: 'tuner.days', min: 3, max: 21, step: 1, fmt: v => v },
    { key: 'B', label: 'tuner.budget', unit: 'tuner.pts', min: 4000, max: 40000, step: 500, fmt: v => v.toLocaleString('ru-RU') },
    { key: 'g', label: 'tuner.goal', unit: '%', min: 0.4, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + ' %' },
    { key: 'P', label: 'tuner.pace', unit: 'tuner.perDay', min: 400, max: 4000, step: 50, fmt: v => v.toLocaleString('ru-RU') },
    { key: 'd', label: 'tuner.decay', unit: 'tuner.perDayPct', min: 0, max: 8, step: 0.5, fmt: v => (v % 1 ? v.toFixed(1) : v) },
  ];
  const trackW = innerW;

  sliderDefs.forEach(def => {
    const row = new PIXI.Container();
    row.position.set(0, y);
    const labT = CV.makeText(CV.t(def.label), phone ? 13 : 13.5, C.ink, { weight: '700' });
    CV.fitText(labT, innerW - 110);
    const valT = CV.makeText(def.fmt(params[def.key]), phone ? 15 : 16, C.stamp, { weight: '700' });
    valT.anchor.set(1, 0);
    valT.position.set(innerW, -1);
    const unitT = CV.makeText(CV.t(def.unit), phone ? 9.5 : 10.5, C.ink40);
    unitT.anchor.set(1, 0);
    unitT.position.set(innerW, 18);
    labT.position.set(0, 0);

    // трек: линия чернилами с засечками
    const track = new PIXI.Container();
    track.position.set(0, 40);
    const tg = new PIXI.Graphics();
    tg.moveTo(0, 6); tg.lineTo(trackW, 6);
    tg.stroke({ width: 2, color: C.ink, alpha: 0.85 });
    for (let i = 0; i <= 4; i++) {
      tg.moveTo(trackW * i / 4, 2); tg.lineTo(trackW * i / 4, 10);
    }
    tg.stroke({ width: 1.4, color: C.ink, alpha: 0.55 });
    const fillG = new PIXI.Graphics();
    const knob = new PIXI.Graphics();
    knob.beginFill(C.ink); knob.drawRect(-8, -2, 16, 16); knob.endFill();
    track.addChild(tg, fillG, knob);
    track.eventMode = 'static'; track.cursor = 'pointer';
    track.hitArea = new PIXI.Rectangle(0, -6, trackW, 28);
    row.addChild(labT, valT, unitT, track);

    const setValue = (nx) => {
      const p = Math.max(0, Math.min(1, nx / trackW));
      let v = def.min + (def.max - def.min) * p;
      v = Math.round(v / def.step) * def.step;
      v = +v.toFixed(3);
      if (v !== params[def.key]) {
        params[def.key] = v;
        valT.text = def.fmt(v);
        redraw();
      }
    };
    const setKnob = () => {
      const p = (params[def.key] - def.min) / (def.max - def.min);
      knob.x = p * trackW;
      fillG.clear();
      fillG.moveTo(0, 6); fillG.lineTo(knob.x, 6);
      fillG.stroke({ width: 4, color: C.stamp });
    };
    track.on('pointerdown', e => {
      e.stopPropagation();
      setValue(track.toLocal(e.global).x);
      const move = ev => setValue(track.toLocal(ev.global).x);
      const up = () => {
        track.off('globalpointermove', move);
        track.off('pointerup', up); track.off('pointerupoutside', up);
      };
      track.on('globalpointermove', move);
      track.on('pointerup', up); track.on('pointerupoutside', up);
    });
    setKnob();
    C2.addChild(row);
    def._setKnob = setKnob;
    y += 72;
  });

  // кривая плана: ровно / лавина
  const curveRow = new PIXI.Container();
  curveRow.position.set(0, y);
  const curveLab = CV.makeText(CV.t('tuner.curve'), phone ? 13 : 13.5, C.ink, { weight: '700' });
  curveRow.addChild(curveLab);
  let bFlat = null, bAval = null;
  let curveH = 42;
  const layoutCurve = () => {
    const chips = [bFlat, bAval].filter(Boolean);
    const labelW = curveLab.width;
    const total = labelW + 14 + chips.reduce((s, c) => s + c.w, 0) + (chips.length - 1) * 10;
    if (total <= innerW) {
      curveLab.position.set(0, 0);
      let cx = labelW + 14;
      chips.forEach(c => { c.position.set(cx, -2); cx += c.w + 10; });
      curveH = 42;
    } else {
      curveLab.position.set(0, 0);
      let cx = 0;
      chips.forEach(c => { c.position.set(cx, 26); cx += c.w + 10; });
      curveH = 70;
    }
  };
  const syncCurve = () => {
    const swap = (chip, active, k, label) => {
      const fresh = CV.makeChip(label, { size: phone ? 11.5 : 12, padX: 12, solid: active });
      if (!active) fresh.alpha = 0.75;
      fresh.eventMode = 'static'; fresh.cursor = 'pointer';
      fresh.on('pointertap', () => { params.k = k; syncCurve(); redraw(); CV.Sfx.tap(); });
      if (chip) curveRow.removeChild(chip);
      curveRow.addChild(fresh);
      return fresh;
    };
    bFlat = swap(bFlat, params.k === 1, 1, CV.t('tuner.flat'));
    bAval = swap(bAval, params.k !== 1, 1.6, CV.t('tuner.avalanche'));
    layoutCurve();
  };
  syncCurve();
  C2.addChild(curveRow);
  y += curveH + 12;

  // ── график ──
  const chartH = phone ? 230 : 280;
  const chartTop = y;
  const chartCard = CV.makeCard(innerW, chartH);
  chartCard.position.set(0, chartTop);
  C2.addChild(chartCard);
  const chartG = new PIXI.Graphics();
  chartG.position.set(0, chartTop);
  C2.addChild(chartG);
  const chartPadL = 44, chartPadR = 14, chartPadT = 16, chartPadB = 22;

  const drawChart = () => {
    const g = chartG;
    g.clear();
    const plotW = innerW - chartPadL - chartPadR;
    const plotH = chartH - chartPadT - chartPadB;
    // сетка миллировки
    for (let i = 1; i < 5; i++) {
      const gy = chartPadT + plotH * i / 5;
      g.moveTo(chartPadL, gy); g.lineTo(innerW - chartPadR, gy);
    }
    g.stroke({ width: 1, color: 0x9b8f74, alpha: 0.32 });
    const maxV = Math.max(result.goal, ...result.series.pro) * 1.08 || 1;
    const X = i => chartPadL + plotW * (i / Math.max(1, params.T - 1));
    const Y = v => chartPadT + plotH - plotH * (v / maxV);
    // цель — красный карандаш
    g.moveTo(chartPadL, Y(result.goal)); g.lineTo(innerW - chartPadR, Y(result.goal));
    g.stroke({ width: 2, color: C.stamp, alpha: 0.9 });
    const line = (arr, color, width = 3, alpha = 1) => {
      arr.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)));
      g.stroke({ width, color, alpha, cap: 'round', join: 'round' });
    };
    line(result.series.plan, C.goldDeep, 3.5);
    line(result.series.avg, C.ink, 2.6);
    line(result.series.newbie, 0x7d8ea0, 2, 0.9);
    line(result.series.pro, 0x6e7f72, 2, 0.9);
  };
  drawChart();
  y += chartH + 10;

  // легенда
  const legendDefs = [
    ['tuner.chartPlan', C.goldDeep], ['tuner.chartAvg', C.ink],
    ['tuner.chartNew', 0x7d8ea0], ['tuner.chartPro', 0x6e7f72],
  ];
  const legend = new PIXI.Container();
  legend.position.set(2, y);
  let lx = 0, ly = 0;
  const legendMax = innerW - 4;
  legendDefs.forEach(([key, color]) => {
    const sw = new PIXI.Graphics();
    sw.beginFill(color); sw.drawRect(0, 6, 16, 3); sw.endFill();
    const lt = CV.makeText(CV.t(key), phone ? 10.5 : 11.5, C.ink60, { ls: 0 });
    const item = new PIXI.Container();
    item.addChild(sw, lt);
    lt.position.set(21, 0);
    const iw = 21 + lt.width + 16;
    if (lx > 0 && lx + iw > legendMax) { lx = 0; ly += 22; }
    item.position.set(lx, ly);
    lx += iw;
    legend.addChild(item);
  });
  C2.addChild(legend);
  y += ly + 28;

  // ── проверки ──
  const checksTitle = CV.makeText(CV.t('tuner.checks').toUpperCase(), phone ? 12 : 12.5, C.ink60, { ls: 2.5 });
  checksTitle.position.set(0, y);
  C2.addChild(checksTitle);
  y += 22;
  const checkRows = [];
  ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(cid => {
    const row = new PIXI.Container();
    row.position.set(0, y);
    const ic = new PIXI.Container();
    const tx = CV.makeText(CV.t('tuner.' + cid), phone ? 12.5 : 13, C.ink, {
      wrap: true, wrapWidth: innerW - 32, ls: 0, lineHeight: (phone ? 12.5 : 13) * 1.4,
    });
    row.addChild(ic, tx);
    ic.position.set(0, 2); tx.position.set(30, 0);
    C2.addChild(row);
    checkRows.push({ cid, ic });
    y += Math.max(24, tx.height) + 8;
  });
  y += 10;

  // вердикт
  const verdictT = CV.makeText('', phone ? 20 : 23, C.stamp, { weight: '700', upper: true, ls: 1.5 });
  const verdictSub = CV.makeText('', phone ? 12 : 13, C.ink60, {
    wrap: true, wrapWidth: innerW, align: 'center', ls: 0, lineHeight: (phone ? 12 : 13) * 1.42,
  });
  verdictT.anchor.set(0.5, 0); verdictSub.anchor.set(0.5, 0);
  C2.addChild(verdictT, verdictSub);
  const verdictY = y;
  y += 78;

  const redraw = () => {
    result = CV.Tuner.compute(params);
    sliderDefs.forEach(d => d._setKnob());
    drawChart();
    checkRows.forEach(({ cid, ic }) => {
      ic.removeChildren().forEach(c => c.destroy({ children: true }));
      const chk = result.checks.find(c => c.id === cid);
      ic.addChild(CV.statusIcon(chk.ok, 20));
    });
    verdictT.text = CV.t('tuner.verdict', { n: result.passed });
    CV.fitText(verdictT, innerW);
    verdictT.position.set(innerW / 2, verdictY);
    verdictSub.text = result.passed === 5 ? CV.t('tuner.verdictOk') : CV.t('tuner.verdictFail');
    verdictSub.position.set(innerW / 2, verdictY + 34);
  };
  redraw();

  const paperH = y + innerPad * 2;
  const paper = CV.makePanel(paperW, paperH);
  const paperC = new PIXI.Container();
  paperC.position.set(paperX, contentTop);
  paperC.addChild(paper, C2);
  C2.position.set(innerPad, innerPad);
  scroll.addChild(paperC);

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
  const hTitle = CV.makeText(CV.t('tuner.title'), phone ? 14 : 16, C.paper, { head: true, weight: '700', upper: true, ls: 1 });
  hTitle.anchor.set(0.5); hTitle.position.set(W / 2, headerH / 2);
  CV.fitText(hTitle, W - 2 * (pad + 90));
  header.addChild(hBack, hTitle);
  view.addChild(header);

  // ── прокрутка ──
  const bar = CV.makeScrollBar(app, C.greyLine);
  view.addChild(bar.g);
  const viewTop = headerH + 8;
  const viewH = H - viewTop - 8;
  const maxScroll = () => Math.max(0, contentTop + paperH + 18 - H);
  const sc = CV.scrollArea(app, view, {
    getMax: maxScroll,
    apply: off => { scroll.y = off; },
    onMove: off => bar.draw(off, maxScroll(), viewH, W - 6, viewTop),
  });
  sc.update();

  return {
    view,
    exit() { sc.destroy(); },
    update() {
      sc.update();
      bar.draw(sc.off, maxScroll(), viewH, W - 6, viewTop);
    },
  };
};
