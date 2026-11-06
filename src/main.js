// ── точка входа: pixi v8 (async init), логический размер = окно в CSS-пикселях, ──
//    сцена занимает весь экран; текст не уменьшается на телефоне ──
(async function () {
  let LW = 720, LH = 1280;
  const computeSize = () => {
    LW = Math.max(300, Math.round(window.innerWidth));
    LH = Math.max(460, Math.round(window.innerHeight));
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

  // PixiJS v8: рендерим в dpr (до 2×) — хрусткий текст на ретине
  const app = new PIXI.Application();
  await app.init({
    width: LW, height: LH,
    background: 0x14161a,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    powerPreference: 'high-performance',
  });
  document.getElementById('app').appendChild(app.canvas);

  const fit = () => {
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';
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
        CV.Scenes.rebuild();
      }
    }, 180);
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
