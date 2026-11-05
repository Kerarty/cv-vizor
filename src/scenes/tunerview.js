// ── сцена «Тюнер события»: живой инструмент из заказа №2 ──
CV.scenes = CV.scenes || {};
CV.scenes.tuner = (view, app) => {
  const W = () => app.screen.width, H = () => app.screen.height;
  const C = CV.COLORS;
  const params = { ...CV.Tuner.defaults };
  let result = CV.Tuner.compute(params);

  const bg = new PIXI.Graphics();
  bg.beginFill(0x243b47); bg.drawRect(0, 0, W(), H()); bg.endFill();
  view.addChild(bg);
  const snow = CV.makeSnow(app, 40);
  view.addChild(snow);

  const title = CV.makeText(CV.t('tuner.title'), 34, C.paper, { display: true });
  title.anchor.set(0.5); title.position.set(W() / 2, 54);
  const intro = CV.makeText(CV.t('tuner.intro'), 15, 0xcfe0ea, { wrap: true, wrapWidth: W() - 80, align: 'center', weight: '500' });
  intro.anchor.set(0.5); intro.position.set(W() / 2, 96);
  view.addChild(title, intro);

  // ── слайдеры ──
  const sliders = new PIXI.Container();
  view.addChild(sliders);
  const sliderDefs = [
    { key: 'T', label: 'tuner.dur', unit: 'tuner.days', min: 3, max: 21, step: 1, fmt: v => v },
    { key: 'B', label: 'tuner.budget', unit: 'tuner.pts', min: 4000, max: 40000, step: 500, fmt: v => v.toLocaleString('ru-RU') },
    { key: 'g', label: 'tuner.goal', unit: '%', min: 0.4, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + ' %' },
    { key: 'P', label: 'tuner.pace', unit: 'tuner.perDay', min: 400, max: 4000, step: 50, fmt: v => v.toLocaleString('ru-RU') },
    { key: 'd', label: 'tuner.decay', unit: 'tuner.perDayPct', min: 0, max: 8, step: 0.5, fmt: v => (v % 1 ? v.toFixed(1) : v) },
  ];
  const sliderW = Math.min(640, W() - 120);
  let sTop = 140;

  sliderDefs.forEach(def => {
    const row = new PIXI.Container();
    row.position.set((W() - sliderW) / 2 - 90, sTop);
    const labT = CV.makeText(CV.t(def.label), 16, 0xe8f2f7, { weight: '700' });
    const valT = CV.makeText(def.fmt(params[def.key]), 17, C.gold, { weight: '800' });
    valT.anchor.set(0, 0); valT.position.set(sliderW - 40, -2);
    labT.position.set(0, 0);
    // трек
    const track = new PIXI.Container();
    track.position.set(0, 30);
    const tg = new PIXI.Graphics();
    tg.beginFill(0x0e1a23); tg.drawRoundedRect(0, 0, sliderW - 80, 12, 6); tg.endFill();
    tg.beginFill(0x335061, 0.53); tg.drawRoundedRect(0, 0, sliderW - 80, 12, 6); tg.endFill();
    const fillG = new PIXI.Graphics();
    const knob = new PIXI.Graphics();
    knob.beginFill(C.gold); knob.drawCircle(0, 6, 13); knob.endFill();
    knob.beginFill(C.goldLight, 0.9); knob.drawCircle(-3, 3, 4); knob.endFill();
    knob.lineStyle(2, C.goldDark); knob.drawCircle(0, 6, 13);
    track.addChild(tg, fillG, knob);
    track.eventMode = 'static'; track.cursor = 'pointer';
    const unitT = CV.makeText(CV.t(def.unit), 12, 0x9fb8c9);
    unitT.position.set(sliderW - 78, 30);
    row.addChild(labT, valT, track, unitT);

    const setValue = (nx) => {
      const p = Math.max(0, Math.min(1, nx / (sliderW - 80)));
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
      knob.x = p * (sliderW - 80);
      fillG.clear();
      fillG.beginFill(C.goldDark); fillG.drawRoundedRect(0, 0, knob.x, 12, 6); fillG.endFill();
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
    sTop += 74;
  });

  // кривая плана: ровно / лавина
  const curveRow = new PIXI.Container();
  curveRow.position.set((W() - sliderW) / 2 - 90, sTop);
  const curveLab = CV.makeText(CV.t('tuner.curve'), 16, 0xe8f2f7, { weight: '700' });
  const bFlat = CV.makeButton(CV.t('tuner.flat'), 150, { height: 42, size: 15, onTap: () => { params.k = 1; syncCurve(); redraw(); } });
  const bAval = CV.makeButton(CV.t('tuner.avalanche'), 170, { height: 42, size: 15, onTap: () => { params.k = 1.6; syncCurve(); redraw(); } });
  bFlat.position.set(200, -6); bAval.position.set(370, -6);
  curveRow.addChild(curveLab, bFlat, bAval);
  sliders.addChild(curveRow);
  const syncCurve = () => {
    (params.k === 1 ? bFlat : bAval).label.alpha = 1;
    (params.k === 1 ? bAval : bFlat).label.alpha = 0.55;
  };
  syncCurve();
  sTop += 62;

  // ── график ──
  const chartG = new PIXI.Graphics();
  const chartW = Math.min(640, W() - 70), chartH = 330;
  chartG.position.set((W() - chartW) / 2, sTop + 10);
  view.addChild(chartG);

  const drawChart = () => {
    const g = chartG;
    g.clear();
    // фон и сетка
    g.beginFill(0x0e1a23, 0.8); g.drawRoundedRect(0, 0, chartW, chartH, 12); g.endFill();
    g.lineStyle(1, 0x335061, 0.4);
    for (let i = 1; i < 5; i++) { g.moveTo(46, chartH * i / 5); g.lineTo(chartW - 12, chartH * i / 5); }
    const maxV = Math.max(result.goal, ...result.series.pro) * 1.08 || 1;
    const X = i => 46 + (chartW - 66) * (i / Math.max(1, params.T - 1));
    const Y = v => chartH - 22 - (chartH - 44) * (v / maxV);
    // цель
    g.lineStyle(2, C.brusnika, 0.9, 0.5);
    g.moveTo(46, Y(result.goal)); g.lineTo(chartW - 12, Y(result.goal));
    const line = (arr, color, width = 3, alpha = 1) => {
      g.lineStyle({ width, color, alpha, cap: 'round', join: 'round' });
      arr.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)));
    };
    line(result.series.plan, C.gold, 3.5);
    line(result.series.avg, 0x59d6a2);
    line(result.series.newbie, 0x8fb7cf, 2, 0.85);
    line(result.series.pro, 0xd98f6b, 2, 0.85);
    return { X, Y };
  };

  // легенда
  const legend = new PIXI.Container();
  const legendDefs = [
    ['tuner.chartPlan', C.gold], ['tuner.chartAvg', 0x59d6a2], ['tuner.chartNew', 0x8fb7cf], ['tuner.chartPro', 0xd98f6b],
  ];
  let lx = 0;
  legendDefs.forEach(([key, color]) => {
    const sw = new PIXI.Graphics();
    sw.beginFill(color); sw.drawRoundedRect(0, 6, 22, 4, 2); sw.endFill();
    const lt = CV.makeText(CV.t(key), 12, 0xcfe0ea, { weight: '600' });
    const item = new PIXI.Container();
    item.addChild(sw, lt);
    lt.position.set(28, 0);
    item.position.set(lx, 0);
    lx += lt.width + 44;
    legend.addChild(item);
  });
  legend.position.set((W() - chartW) / 2 + 46, sTop + chartH + 16);
  view.addChild(legend);
  sTop += chartH + 48;

  // ── проверки ──
  const checksC = new PIXI.Container();
  view.addChild(checksC);
  const checkRows = [];
  ['c1', 'c2', 'c3', 'c4', 'c5'].forEach((cid, i) => {
    const row = new PIXI.Container();
    row.position.set((W() - 620) / 2, sTop + i * 40);
    const ic = new PIXI.Container();
    const tx = CV.makeText(CV.t('tuner.' + cid), 15, 0xe8f2f7, { weight: '600', wrap: true, wrapWidth: 560 });
    row.addChild(ic, tx);
    ic.position.set(0, 4); tx.position.set(38, 0);
    checksC.addChild(row);
    checkRows.push({ cid, ic });
  });

  // вердикт
  const verdictT = CV.makeText('', 24, C.gold, { display: true, weight: '400' });
  const verdictSub = CV.makeText('', 14, 0xcfe0ea, { weight: '500', wrap: true, wrapWidth: W() - 100, align: 'center' });
  verdictT.anchor.set(0.5); verdictSub.anchor.set(0.5);
  const note = CV.makeText(CV.t('tuner.cohortNote'), 12, 0x7d97a8, { align: 'center' });
  note.anchor.set(0.5);
  view.addChild(verdictT, verdictSub, note);

  const back = CV.makeButton(CV.t('common.back'), 170, { height: 54, size: 19, onTap: () => { CV.Sfx.tap(); CV.Scenes.switchTo('map'); } });
  back.position.set(W() / 2 - 85, H() - 74);
  view.addChild(back);

  const redraw = () => {
    result = CV.Tuner.compute(params);
    sliderDefs.forEach(d => d._setKnob());
    drawChart();
    checkRows.forEach(({ cid, ic }) => {
      ic.removeChildren().forEach(c => c.destroy({ children: true }));
      const chk = result.checks.find(c => c.id === cid);
      ic.addChild(CV.statusIcon(chk.ok, 26));
    });
    verdictT.text = CV.t('tuner.verdict', { n: result.passed });
    verdictT.position.set(W() / 2, sTop + 5 * 40 + 22);
    verdictSub.text = result.passed === 5 ? CV.t('tuner.verdictOk') : CV.t('tuner.verdictFail');
    verdictSub.position.set(W() / 2, sTop + 5 * 40 + 56);
    note.position.set(W() / 2, H() - 96);
  };
  redraw();

  return {
    update(dt) { snow.update(dt); },
  };
};
