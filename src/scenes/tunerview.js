// ── сцена «Тюнер события»: расчётный лист на бумаге, чернила и красный карандаш ──
CV.scenes = CV.scenes || {};
CV.scenes.tuner = (view, app) => {
  const W = () => app.screen.width, H = () => app.screen.height;
  const C = CV.COLORS;
  const params = { ...CV.Tuner.defaults };
  let result = CV.Tuner.compute(params);

  const bg = new PIXI.Graphics();
  bg.beginFill(C.desk); bg.drawRect(0, 0, W(), H()); bg.endFill();
  view.addChild(bg);

  // расчётный лист
  const panel = CV.makePanel(660, 1130);
  panel.position.set((W() - 660) / 2, 24);
  view.addChild(panel);

  const title = CV.makeText(CV.t('tuner.title'), 30, C.ink, { head: true, weight: '700', upper: true });
  title.anchor.set(0.5, 0); title.position.set(W() / 2, 64);
  if (title.width > 560) title.scale.set(560 / title.width);
  const intro = CV.makeText(CV.t('tuner.intro'), 12, C.ink60, { wrap: true, wrapWidth: 540, align: 'center', ls: 0 });
  intro.anchor.set(0.5, 0); intro.position.set(W() / 2, 104);
  const note = CV.makeText(CV.t('tuner.cohortNote'), 10.5, C.ink40, { align: 'center' });
  note.anchor.set(0.5, 0);
  note.position.set(W() / 2, 132);
  view.addChild(title, intro, note);

  // ── слайдеры: форма на бумаге ──
  const sliders = new PIXI.Container();
  view.addChild(sliders);
  const sliderDefs = [
    { key: 'T', label: 'tuner.dur', unit: 'tuner.days', min: 3, max: 21, step: 1, fmt: v => v },
    { key: 'B', label: 'tuner.budget', unit: 'tuner.pts', min: 4000, max: 40000, step: 500, fmt: v => v.toLocaleString('ru-RU') },
    { key: 'g', label: 'tuner.goal', unit: '%', min: 0.4, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + ' %' },
    { key: 'P', label: 'tuner.pace', unit: 'tuner.perDay', min: 400, max: 4000, step: 50, fmt: v => v.toLocaleString('ru-RU') },
    { key: 'd', label: 'tuner.decay', unit: 'tuner.perDayPct', min: 0, max: 8, step: 0.5, fmt: v => (v % 1 ? v.toFixed(1) : v) },
  ];
  const rowX = (W() - 560) / 2, trackW = 340;
  let sTop = 158;

  sliderDefs.forEach(def => {
    const row = new PIXI.Container();
    row.position.set(rowX, sTop);
    const labT = CV.makeText(CV.t(def.label), 13, C.ink, { weight: '700' });
    const valT = CV.makeText(def.fmt(params[def.key]), 15, C.stamp, { weight: '700' });
    valT.anchor.set(0, 0.5); valT.position.set(380, 8);
    const unitT = CV.makeText(CV.t(def.unit), 10, C.ink40);
    unitT.position.set(382, 22);
    labT.position.set(0, 0);
    if (labT.width > 300) labT.scale.set(300 / labT.width);
    // трек: линия чернилами с засечками
    const track = new PIXI.Container();
    track.position.set(0, 30);
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
      setValue(track.toLocal(e.global).x);
      const move = ev => setValue(track.toLocal(ev.global).x);
      const up = () => { track.off('globalpointermove', move); track.off('pointerup', up); track.off('pointerupoutside', up); };
      track.on('globalpointermove', move);
      track.on('pointerup', up); track.on('pointerupoutside', up);
    });
    setKnob();
    sliders.addChild(row);
    def._setKnob = setKnob;
    sTop += 64;
  });

  // кривая плана: ровно / лавина — чипы-переключатели
  const curveRow = new PIXI.Container();
  curveRow.position.set(rowX, sTop + 6);
  const curveLab = CV.makeText(CV.t('tuner.curve'), 13, C.ink, { weight: '700' });
  const mkCurveChip = (label, x, onTap) => {
    let chip = CV.makeChip(label, { size: 12, padX: 14 });
    chip.eventMode = 'static'; chip.cursor = 'pointer';
    chip.on('pointertap', () => { onTap(); CV.Sfx.tap(); });
    chip.position.set(x, 0);
    curveRow.addChild(chip);
    return chip;
  };
  let bFlat = mkCurveChip(CV.t('tuner.flat'), 150, () => { params.k = 1; syncCurve(); redraw(); });
  let bAval = mkCurveChip(CV.t('tuner.avalanche'), 280, () => { params.k = 1.6; syncCurve(); redraw(); });
  curveRow.addChild(curveLab);
  sliders.addChild(curveRow);
  const syncCurve = () => {
    // активная кривая — тёмный перк, неактивная — пунктирный трейт
    const swap = (chip, active) => {
      const idx = curveRow.getChildIndex(chip);
      const fresh = CV.makeChip(chip.label.text, { size: 12, padX: 14, solid: active });
      if (!active) fresh.alpha = 0.75;
      fresh.eventMode = 'static'; fresh.cursor = 'pointer';
      fresh.position.copyFrom(chip.position);
      curveRow.addChildAt(fresh, idx);
      chip.destroy();
      if (chip === bFlat) { bFlat = fresh; bFlat.on('pointertap', () => { params.k = 1; syncCurve(); redraw(); CV.Sfx.tap(); }); }
      else { bAval = fresh; bAval.on('pointertap', () => { params.k = 1.6; syncCurve(); redraw(); CV.Sfx.tap(); }); }
    };
    swap(bFlat, params.k === 1);
    swap(bAval, params.k !== 1);
  };
  syncCurve();
  sTop += 56;

  // ── график: миллировка ──
  const chartCard = CV.makeCard(560, 280);
  chartCard.position.set((W() - 560) / 2, sTop + 4);
  view.addChild(chartCard);
  const chartG = new PIXI.Graphics();
  const chartW = 560, chartH = 280;
  chartG.position.set((W() - chartW) / 2, sTop + 4);
  view.addChild(chartG);

  const drawChart = () => {
    const g = chartG;
    g.clear();
    // сетка миллировки
    for (let i = 1; i < 5; i++) { g.moveTo(46, chartH * i / 5); g.lineTo(chartW - 16, chartH * i / 5); }
    g.stroke({ width: 1, color: 0x9b8f74, alpha: 0.35 });
    const maxV = Math.max(result.goal, ...result.series.pro) * 1.08 || 1;
    const X = i => 46 + (chartW - 66) * (i / Math.max(1, params.T - 1));
    const Y = v => chartH - 20 - (chartH - 40) * (v / maxV);
    // цель — красный карандаш
    g.moveTo(46, Y(result.goal)); g.lineTo(chartW - 16, Y(result.goal));
    g.stroke({ width: 2, color: C.stamp, alpha: 0.9 });
    const line = (arr, color, width = 3, alpha = 1) => {
      arr.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)));
      g.stroke({ width, color, alpha, cap: 'round', join: 'round' });
    };
    line(result.series.plan, C.goldDeep, 3.5);
    line(result.series.avg, C.ink, 2.6);
    line(result.series.newbie, 0x7d8ea0, 2, 0.9);
    line(result.series.pro, 0xb39a68, 2, 0.9);
  };

  // легенда
  const legend = new PIXI.Container();
  const legendDefs = [
    ['tuner.chartPlan', C.goldDeep], ['tuner.chartAvg', C.ink], ['tuner.chartNew', 0x7d8ea0], ['tuner.chartPro', 0xb39a68],
  ];
  let lx = 0;
  legendDefs.forEach(([key, color]) => {
    const sw = new PIXI.Graphics();
    sw.beginFill(color); sw.drawRect(0, 8, 22, 3); sw.endFill();
    const lt = CV.makeText(CV.t(key), 11, C.ink60, { ls: 0 });
    const item = new PIXI.Container();
    item.addChild(sw, lt);
    lt.position.set(28, 2);
    item.position.set(lx, 0);
    lx += lt.width + 40;
    legend.addChild(item);
  });
  legend.position.set((W() - chartW) / 2 + 46, sTop + 4 + chartH + 12);
  view.addChild(legend);
  sTop += chartH + 56;

  // ── проверки ──
  const checksC = new PIXI.Container();
  view.addChild(checksC);
  const checkRows = [];
  ['c1', 'c2', 'c3', 'c4', 'c5'].forEach((cid, i) => {
    const row = new PIXI.Container();
    row.position.set((W() - 560) / 2, sTop + i * 36);
    const ic = new PIXI.Container();
    const tx = CV.makeText(CV.t('tuner.' + cid), 12.5, C.ink, { wrap: true, wrapWidth: 510, ls: 0 });
    row.addChild(ic, tx);
    ic.position.set(0, 2); tx.position.set(36, 0);
    checksC.addChild(row);
    checkRows.push({ cid, ic });
  });
  sTop += 5 * 36 + 14;

  // вердикт
  const verdictT = CV.makeText('', 22, C.stamp, { weight: '700', upper: true, ls: 2 });
  const verdictSub = CV.makeText('', 12.5, C.ink60, { wrap: true, wrapWidth: 540, align: 'center', ls: 0 });
  verdictT.anchor.set(0.5); verdictSub.anchor.set(0.5);
  view.addChild(verdictT, verdictSub);

  const back = CV.makeButton(CV.t('common.back'), 170, { height: 50, size: 13, ghost: true, onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('map'); } });
  back.position.set(W() / 2 - 85, 24 + 1130 + 14);
  view.addChild(back);

  const redraw = () => {
    result = CV.Tuner.compute(params);
    sliderDefs.forEach(d => d._setKnob());
    drawChart();
    checkRows.forEach(({ cid, ic }) => {
      ic.removeChildren().forEach(c => c.destroy({ children: true }));
      const chk = result.checks.find(c => c.id === cid);
      ic.addChild(CV.statusIcon(chk.ok, 22));
    });
    verdictT.text = CV.t('tuner.verdict', { n: result.passed });
    verdictT.position.set(W() / 2, sTop + 8);
    verdictSub.text = result.passed === 5 ? CV.t('tuner.verdictOk') : CV.t('tuner.verdictFail');
    verdictSub.position.set(W() / 2, sTop + 40);
  };
  redraw();

  view.addChild(CV.makeVignette(app, 0.3));

  return {};
};
