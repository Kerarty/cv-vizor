// ── данные: структура станций, заказов, самородков (текст — в i18n) ──
window.CV = window.CV || {};

CV.DATA = {
  // логическое поле карты 720×1280 (портрет); sprite — здание из пака CraftPix
  stations: [
    { id: 's1', x: 190, y: 300, kind: 'tent' },                        // палатка документалиста
    { id: 's2', x: 480, y: 220, kind: 'mine', sprite: 'b-wood-warehouse' },    // прииск Эридора
    { id: 's3', x: 580, y: 470, kind: 'factory', sprite: 'b-brick-warehouse' }, // playable-цех
    { id: 's4', x: 320, y: 560, kind: 'loop', sprite: 'b-brick-house' },       // echoloop
    { id: 's5', x: 120, y: 760, kind: 'harbor' },                      // гавань мини-игр
    { id: 's6', x: 420, y: 880, kind: 'workshop', sprite: 'b-wood-house' },    // баланс-мастерская
    { id: 's7', x: 360, y: 1090, kind: 'fort' },                       // форт vizor
  ],

  orders: [
    { id: 'o1', needs: ['s2', 's1', 's5'], opens: 'exp' },   // сквозная фича
    { id: 'o2', needs: ['s6', 's2'],       opens: 'tuner' }, // live-ops → тюнер
    { id: 'o3', needs: ['s6', 's5'],       opens: 'skills' },
    { id: 'o4', needs: ['s3', 's3'],       opens: 'playable' }, // playable ×2
    { id: 'o5', needs: ['s4'],             opens: 'stack' },
  ],

  // 3 самородка: у палатки, за елью у прииска, в просвете тумана у форта
  nuggets: [
    { id: 'n1', x: 260, y: 345 },
    { id: 'n2', x: 540, y: 250 },
    { id: 'n3', x: 430, y: 1050 },
  ],

  // награды заказов — какие блоки открываются на Листе кандидата
  blocks: ['exp', 'skills', 'playable', 'stack'],

  contacts: {
    phone: '+375 44 783-84-89',
    email: 'kukar.yar@gmail.com',
    github: 'github.com/Kerarty',
    mailto: 'mailto:kukar.yar@gmail.com?subject=%D0%97%D0%BE%D0%BB%D0%BE%D1%82%D0%B0%D1%8F%20%D0%B7%D0%B0%D1%8F%D0%B2%D0%BA%D0%B0%20%D0%B2%20Vizor',
    gh: 'https://github.com/Kerarty',
    pdf: 'assets/cv.pdf',
  },

  sheetStats: [
    { id: 'design', value: 0.8 },
    { id: 'balance', value: 0.85 },
    { id: 'proto', value: 0.9 },
    { id: 'docs', value: 0.75 },
  ],

  // вехи для читаемости кода
  CHOP_COST: 5,
  ENERGY_MAX: 30,
  ENERGY_REGEN_MS: 2000,
};
