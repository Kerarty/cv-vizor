// ── точка входа: pixi v8 (async init), адаптивная геометрия, менеджер сцен ──
(async function () {
  // адаптивный логический размер: контент живёт в колонке 720, стол растягивается
  // альбом/ПК: высота 1280, ширина до 1600 · портрет: ширина 720, высота до 1760
  let LW = 720, LH = 1280;
  const computeSize = () => {
    const aw = Math.max(320, window.innerWidth), ah = Math.max(320, window.innerHeight);
    const aspect = aw / ah;
    if (aspect >= 1) {
      LH = 1280;
      LW = Math.min(1600, Math.max(720, Math.round(1280 * aspect)));
    } else {
      LW = 720;
      LH = Math.min(1760, Math.max(1280, Math.round(720 / aspect)));
    }
  };
  computeSize();

  const t0 = performance.now();
  window.__sessionStart = performance.now();

  const loader = document.getElementById('loader');
  const fill = document.getElementById('loader-fill');
  const text = document.getElementById('loader-text');
  const progress = (p, label) => {
    fill.style.width = Math.round(p * 100) + '%';
    if (label) text.textContent = label;
  };

  progress(0.3, 'открываем архив…');

  // PixiJS v8: асинхронная инициализация; рендерим в dpr (до 2×) — хрусткий текст
  const app = new PIXI.Application();
  await app.init({
    width: LW, height: LH,
    background: 0x14161a,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    powerPreference: 'high-performance',
  });
  document.getElementById('app').appendChild(app.canvas);

  const fit = () => {
    const k = Math.min(window.innerWidth / LW, window.innerHeight / LH);
    app.canvas.style.width = Math.round(LW * k) + 'px';
    app.canvas.style.height = Math.round(LH * k) + 'px';
  };
  // resize: пересчёт геометрии и пересборка текущей сцены (дебаунс)
  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const oldW = LW, oldH = LH;
      computeSize();
      fit();
      if ((LW !== oldW || LH !== oldH) && window.__booted) {
        app.renderer.resize(LW, LH);
        CV.Scenes.switchTo(CV.Scenes.currentName);
      }
    }, 150);
  });
  fit();

  progress(0.55, 'раскладываем материалы дела…');

  // ждём base64-шрифты (нужны для PIXI.Text), со страховкой по таймауту
  try {
    document.fonts.load('400 20px "PT Mono"');
    document.fonts.load('500 20px "Oswald"');
    document.fonts.load('600 20px "Oswald"');
    document.fonts.load('700 20px "Oswald"');
    await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]);
  } catch (e) { /* шрифты — не блокер */ }

  progress(0.85, 'ставим печать…');
  await CV.preloadArt();

  const sm = new CV.SceneManager(app);
  CV.Scenes = sm;
  sm.register('title', CV.scenes.title);
  sm.register('map', CV.scenes.map);
  sm.register('tuner', CV.scenes.tuner);
  sm.register('sheet', CV.scenes.sheet);
  sm.register('victory', CV.scenes.victory);

  // время загрузки считаем ДО первого рендера титула (титул его показывает)
  window.__loadMs = performance.now() - t0;
  await sm.switchTo('title');
  loader.style.opacity = '0';
  setTimeout(() => loader.remove(), 450);
  window.__booted = true;
  console.log('[cv-vizor] готово за', (window.__loadMs / 1000).toFixed(2), 'сек ·', LW + '×' + LH);
})();
