// Game configuration data: default seats, the colour palette, game modes and rules, settings rows, streak gold.
// Pure data; names and keys are stored in saved setups and wallets, so do not rename them.

export const PL0 = [
  {name:'Вы',col:'#ef5350',human:true},
  {name:'Маша',col:'#4c8dff',human:false,persona:'builder'},
  {name:'Дима',col:'#f7c948',human:false,persona:'roadman'},
  {name:'Лёша',col:'#3fc27a',human:false,persona:'monk'},
  {name:'Катя',col:'#b06cf0',human:false,persona:'balanced'},
];

export const PALETTE = [
  {col: '#ef5350', name: 'Красный'}, {col: '#4c8dff', name: 'Синий'}, {col: '#f7c948', name: 'Жёлтый'}, {col: '#3fc27a', name: 'Зелёный'},
  {col: '#b06cf0', name: 'Фиолетовый'}, {col: '#ff8c42', name: 'Оранжевый'}, {col: '#ff6fae', name: 'Розовый'},
];

export const MODES = {
  fast: {label: 'Быстрая', desc: '30 плиток · ~8 мин · 4 мипла', set: {deck: 30, meeples: 4}},
  classic: {label: 'Классика', desc: '50 плиток · ~15 мин · 6 миплов', set: {deck: 50, meeples: 6}},
  epic: {label: 'Большая', desc: '100 плиток · ~30 мин · 8 миплов', set: {deck: 100, meeples: 8}},
  duel: {label: 'Дуэль 1×1', desc: '30 плиток · 20 с на ход · 2 игрока · 5 миплов', set: {deck: 30, meeples: 5, timer: 20}},
};

export const RULES = [
  {k: 'mode', label: 'Режим', opts: Object.entries(MODES).map(([k, m]) => [k, m.label])},
  {k: 'deck', label: 'Плиток в стопке', opts: [[30, '30'], [50, '50'], [100, '100']]},
  {k: 'rivers', label: 'Реки', opts: [[true, 'Есть'], [false, 'Нет']]},
  {k: 'meeples', label: 'Миплов у игрока', opts: [[4, '4'], [5, '5'], [6, '6'], [8, '8']]},
  {k: 'timer', label: 'Время на ход', opts: [[0, 'Без'], [20, '20 с'], [30, '30 с'], [60, '60 с']]},
  {k: 'hints', label: 'Подсветка мест', opts: [[true, 'Вкл'], [false, 'Выкл']]},
  {k: 'cups', label: 'Игра на кубки', opts: [[false, 'Нет'], [true, 'Да']], room: true},
];

export const PREFS = [
  {k: 'sound', ic: '🔊', label: 'Звуки', hint: 'Звуковые эффекты', opts: [[true, 'Вкл'], [false, 'Выкл']]},
  {k: 'music', ic: '🎵', label: 'Музыка', hint: 'Фоновая музыка', opts: [[true, 'Вкл'], [false, 'Выкл']]},
  {k: 'view', ic: '🧊', label: 'Вид поля', hint: '3D перспектива или вид сверху', opts: [['3d', '3D'], ['top', 'Сверху']]},
  {k: 'botlvl', ic: '🤖', label: 'Сложность ботов', hint: 'Сложность алгоритма ботов', opts: [['easy', 'Лёгкие'], ['normal', 'Обычные'], ['hard', 'Сложные']]},
  {k: 'speed', ic: '⚡', label: 'Скорость ботов', hint: 'Скорость анимации ходов', opts: [['normal', 'Обычная'], ['fast', 'Быстрая']]},
  {k: 'alert', ic: '⏰', label: 'Подсветка хода', hint: 'Сигнал и вибрация на вашем ходу', opts: [[true, 'Вкл'], [false, 'Выкл']]},
  {k: 'coach', ic: '💡', label: 'Подсказки', hint: 'Советы по размещению плиток', opts: [['on', 'Всегда'], ['tip', 'По кнопке'], ['off', 'Выкл']]},
  {k: 'zones', ic: '🎨', label: 'Цвет владельца', hint: 'Подсветка своих городов и дорог', opts: [[true, 'Вкл'], [false, 'Выкл']]},
  {k: 'gfx', ic: '✨', label: 'Графика', hint: 'Оптимизация производительности', opts: [['high', 'Красивая'], ['low', 'Экономная']]},
  {k: 'notify', ic: '🔔', label: 'Уведомления', hint: 'Новости и обновления игры', opts: [[true, 'Вкл'], [false, 'Выкл']], app: true},
  {k: 'stats', ic: '📊', label: 'Статистика', hint: 'Анонимные числа о том, чем пользуются в игре. Без текстов и имён', opts: [[true, 'Вкл'], [false, 'Выкл']]},
];

export const PREF_GROUPS = [['Звук', ['sound', 'music']], ['Игра', ['coach', 'view', 'botlvl', 'speed', 'alert', 'zones']], ['Экран', ['gfx']], ['Уведомления', ['notify']], ['Данные', ['stats']]];

export const STREAK_GOLD = [10, 15, 20, 25, 35, 50, 100];

export const validCol = c => PALETTE.some(x => x.col === c);
