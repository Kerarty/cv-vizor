// Сборка одностраничника: инлайнит PixiJS, шрифты и src/ в index.html.
// Запуск: node build.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));

// порядок конкатенации важен: данные и словари раньше сцен
const SRC_FILES = [
  'src/i18n.js',
  'src/data.js',
  'src/theme.js',
  'src/fx.js',
  'src/tuner.js',
  'src/sfx.js',
  'src/scenes/manager.js',
  'src/scenes/title.js',
  'src/scenes/map.js',
  'src/scenes/tunerview.js',
  'src/scenes/sheet.js',
  'src/scenes/victory.js',
  'src/main.js',
];

// 1. шрифты -> @font-face c base64
const FONTS = [
  ['RuslanDisplay-Regular.ttf', 'Ruslan Display', 'normal', 400, 'truetype'],
  ['nunito-cyrillic-400.woff2', 'Nunito', 'normal', 400, 'woff2'],
  ['nunito-cyrillic-700.woff2', 'Nunito', 'normal', 700, 'woff2'],
  ['nunito-latin-400.woff2', 'Nunito', 'normal', 400, 'woff2'],
  ['nunito-latin-700.woff2', 'Nunito', 'normal', 700, 'woff2'],
];
const fontsCss = FONTS.map(([file, family, style, weight, fmt]) => {
  if (!exists('assets/fonts/' + file)) throw new Error('нет шрифта: ' + file);
  const b64 = fs.readFileSync(path.join(ROOT, 'assets/fonts', file)).toString('base64');
  return `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};` +
    `src:url(data:font/${fmt};base64,${b64}) format('${fmt === 'truetype' ? 'truetype' : 'woff2'}');}`;
}).join('\n');

// 2. спрайты assets/art → CV.ASSETS (dataURL)
const artDir = path.join(ROOT, 'assets/art');
const assetsJs = fs.existsSync(artDir)
  ? 'window.CV = window.CV || {};\nCV.ASSETS = {\n' + fs.readdirSync(artDir)
      .filter(f => f.endsWith('.png'))
      .map(f => `  '${f.replace('.png', '')}': 'data:image/png;base64,` +
        fs.readFileSync(path.join(artDir, f)).toString('base64') + `',`)
      .join('\n') + '\n};'
  : 'window.CV = window.CV || {}; CV.ASSETS = {};';

// 3. исходники в один IIFE
const src = SRC_FILES.map(f => {
  if (!exists(f)) throw new Error('нет файла: ' + f);
  return '// ── ' + f + ' ──\n' + read(f);
}).join('\n');
const gameJs = assetsJs + '\n(function(){\n"use strict";\n' + src + '\n})();';

// 3. проверка словарей: ключи RU и EN обязаны совпадать
{
  const ru = new Set(), en = new Set();
  const walk = (o, pre, set) => Object.keys(o).forEach(k => {
    const p = pre ? pre + '.' + k : k;
    if (typeof o[k] === 'object' && o[k] !== null) walk(o[k], p, set); else set.add(p);
  });
  // i18n.js исполняем в песочнице, чтобы вытащить словари
  const sandbox = { window: {} };
  new Function('window', 'with(window){' + read('src/i18n.js') + '}')(sandbox.window);
  const dicts = sandbox.window.CV.I18N;
  walk(dicts.ru, '', ru); walk(dicts.en, '', en);
  const missEn = [...ru].filter(k => !en.has(k));
  const missRu = [...en].filter(k => !ru.has(k));
  if (missEn.length || missRu.length) {
    throw new Error('ПРОПУЩЕНЫ КЛЮЧИ i18n:\n  нет в EN: ' + missEn.join(', ') +
      '\n  нет в RU: ' + missRu.join(', '));
  }
}

// 4. сборка шаблона
let html = read('index.template.html');
html = html.replace('{{FONTS_CSS}}', fontsCss);
html = html.replace('{{PIXI_JS}}', () => read('src/vendor/pixi.min.js'));
html = html.replace('{{GAME_JS}}', () => gameJs);
fs.writeFileSync(path.join(ROOT, 'index.html'), html);

const kb = (fs.statSync(path.join(ROOT, 'index.html')).size / 1024).toFixed(0);
console.log('index.html собран: ' + kb + ' КБ' + (kb > 2048 ? '  ⚠ БЮДЖЕТ 2 МБ ПРЕВЫШЕН' : '  ✓ в бюджете'));
