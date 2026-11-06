// ── точка входа: pixi v8 (async init), шрифты, менеджер сцен ──
(async function () {
  const LW = 720, LH = 1280; // логический размер (портрет)
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

  // PixiJS v8: асинхронная инициализация
  const app = new PIXI.Application();
  await app.init({ width: LW, height: LH, background: 0x14161a, antialias: true });
  document.getElementById('app').appendChild(app.canvas);

  const fit = () => {
    const k = Math.min(window.innerWidth / LW, window.innerHeight / LH);
    app.canvas.style.width = Math.round(LW * k) + 'px';
    app.canvas.style.height = Math.round(LH * k) + 'px';
  };
  window.addEventListener('resize', fit);
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
  console.log('[cv-vizor] готово за', (window.__loadMs / 1000).toFixed(2), 'сек');
})();
