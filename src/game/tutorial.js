// src/game/tutorial.js
// Scripted tutorial steps, deck, bot moves, and coach card renderer.

export const TUT_STEPS = [
  {ic: '👆', t: 'Тапните по рамке', p: 'Сюда ляжет ваша карта', wait: 'select', only: [0, -1]},
  {ic: '✅', t: 'Нажмите «Поставить»', p: 'Город сошёлся с городом', wait: 'placed', hl: '#ok'},
  {ic: '🧍', t: 'Поставьте фишку на город', p: 'Фишка делает город вашим', wait: 'meepleDone', hl: '#mrow .chip:not(.skip)'},
  {ic: '🏰', t: 'Город достроен: +4 очка!', p: 'Фишка вернулась к вам. Теперь ходит бот', wait: 'bot'},
  {ic: '✋', t: 'Проведите пальцем по полю', p: 'Так поле двигается', wait: 'pan', hand: true},
  {ic: '🔍', t: 'Нажмите «+»', p: 'Или разведите два пальца — поле приблизится', wait: 'zoom', hl: '#zin'},
  {ic: '👆', t: 'Тапните по рамке', p: 'Продолжим дорогу бота', wait: 'select', only: [1, 1]},
  {ic: '🔄', t: 'Поверните карту', p: 'Кнопка ↻ меняет поворот', wait: 'rotate', hl: '#rot'},
  {ic: '✅', t: 'Нажмите «Поставить»', p: 'Дорога повернула вправо', wait: 'placed', hl: '#ok', r: 2},
  {ic: '🧍', t: 'Поставьте фишку на дорогу', p: 'Достроите дорогу — получите очки', wait: 'meepleDone', hl: '#mrow .chip:not(.skip)'},
  {ic: '🤝', t: 'Бот закроет один конец', p: 'Чужой ход тоже может вам помочь', wait: 'bot'},
  {ic: '👆', t: 'Закройте второй конец', p: 'Тапните по рамке справа', wait: 'select', only: [2, 1]},
  {ic: '✅', t: 'Нажмите «Поставить»', p: 'Дорога будет закончена', wait: 'placed', hl: '#ok'},
  {ic: '🛤️', t: 'Дорога достроена!', p: 'Стопка кончилась — считаем очки', wait: 'end'},
  {ic: '🏆', t: 'Вы победили! +30 золота', p: 'У кого больше очков, тот и выиграл', btn: 'Играть', done: true},
];

export const TUT_DECK = ['rEnd', 'rRock', 'rC', 'rS', 'cap', 'cap'];

export const TUT_BOT = [
  {x: 1, y: 0, r: 0},
  {x: 1, y: -1, r: 2}
];

export function createTutorialState() {
  return {
    i: 0,
    bot: TUT_BOT.slice()
  };
}

export function getTutorialStep(tutState, steps = TUT_STEPS) {
  if (!tutState || typeof tutState.i !== 'number') return null;
  return steps[tutState.i] || null;
}

export function isTutorialAllowed(tutState, x, y, steps = TUT_STEPS) {
  const step = getTutorialStep(tutState, steps);
  if (!step || !step.only) return true;
  return step.only[0] === x && step.only[1] === y;
}

export function shouldAdvanceStep(currentStep, eventName) {
  if (!currentStep) return false;
  return currentStep.wait === eventName;
}

export function renderCoachCardHtml(step, stepIndex, totalSteps = TUT_STEPS.length) {
  if (!step) return '';
  const progressPercent = totalSteps > 1 ? (100 * stepIndex / (totalSteps - 1)).toFixed(0) : '0';
  return `<span class="cic">${step.ic}</span><span class="ctx"><b>${step.t}</b><small>${step.p}</small></span>${step.btn ? `<button class="cta" id="tutNext">${step.btn}</button>` : ''}${step.hand ? '<i class="swipe"></i>' : ''}<span class="cbar"><i style="width:${progressPercent}%"></i></span>`;
}

export function createTutorialConfig(profileName, walletColor, walletFig, validColFn = () => false, palette = [], tutDeck = TUT_DECK) {
  const rules = {mode: 'fast', deck: 0, rivers: true, meeples: 7, timer: 0, hints: true, tie: 'all'};
  const myCol = validColFn(walletColor) ? walletColor : (palette[0] && (palette[0].col || palette[0])) || '#ef5350';
  const botCol1 = (palette[1] && (palette[1].col || palette[1])) || '#42a5f5';
  const botCol2 = (palette[2] && (palette[2].col || palette[2])) || '#66bb6a';
  const botCol = walletColor === botCol1 ? botCol2 : botCol1;

  const seats = [
    {name: profileName, human: true, fig: walletFig, col: myCol},
    {name: 'Бот Ёж', human: false, fig: 'classic', col: botCol}
  ];

  return {
    tut: 1,
    seats,
    rules,
    deck: tutDeck.slice(),
    seed: 7,
    noIntro: true
  };
}

export function advanceTutorialStep(tutState, wallet, steps = TUT_STEPS) {
  if (!tutState) return {done: false, nextStep: null};
  const current = steps[tutState.i];
  if (current && current.done) {
    if (wallet) {
      wallet.tut = true;
      wallet.gold = (wallet.gold || 0) + 30;
    }
    return {
      done: true,
      reward: 30,
      sound: 'coin',
      trackEvent: 'tutorial_complete'
    };
  }
  tutState.i++;
  return {
    done: false,
    stepIndex: tutState.i,
    nextStep: steps[tutState.i] || null
  };
}

export function renderTutorialOfferDialogHtml(hasFb = false) {
  return `<div class="ocard"><div style="font-size:44px">🏰</div><h3>Добро пожаловать в Puzzlegrad!</h3><p>Новичок? Короткое обучение, затем вы придумаете никнейм — так создаётся профиль</p><button class="cta wide" data-t="go">Начать · обучение</button>${hasFb ? '<button class="ghostbtn" data-t="login">У меня есть профиль — войти</button>' : ''}<button class="linkbtn" data-t="no">Пропустить обучение</button></div>`;
}

export function renderAskProfileDialogHtml(walletColor = '#ef5350') {
  return `<div class="ocard prof"><div class="pav" id="pav" style="--c:${walletColor}">?</div><h3>Создайте профиль</h3><p>Придумайте никнейм и выберите цвет — их увидят соперники и рейтинг</p><div style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><input class="field" id="profName" maxlength="12" placeholder="Никнейм" autocomplete="off" style="flex:1"><button type="button" class="iconbtn" id="profDice" title="Случайное имя" style="width:44px;height:44px;border-radius:10px;background:var(--surface-hover);font-size:20px;border:1px solid var(--line);cursor:pointer;flex:0 0 auto">🎲</button></div><button class="cta wide" id="profOk" disabled>Готово</button><button class="ghostbtn" id="profLogin">У меня уже есть профиль — войти</button></div>`;
}
