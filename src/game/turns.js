// src/game/turns.js
// Turn transitions, bot level resolution, move payload assembly, and card drawing.

export function nextTurnIndex(currentTurn, totalPlayers) {
  if (!totalPlayers || totalPlayers <= 0) return 0;
  return (currentTurn + 1) % totalPlayers;
}

export function isSoftStart(walletBotLvl, gamesCount) {
  return walletBotLvl === 'normal' && (gamesCount || 0) < 3;
}

export function resolveBotLevel(walletBotLvl, gamesCount, allowedLevels = ['easy', 'normal', 'hard']) {
  if (isSoftStart(walletBotLvl, gamesCount)) return 'easy';
  if (Array.isArray(allowedLevels) && allowedLevels.includes(walletBotLvl)) return walletBotLvl;
  return 'normal';
}

export function isPlayerAway(missedCount) {
  return (missedCount || 0) >= 1;
}

export function drawNextValidCard(deck, hasPlacementFn) {
  if (!Array.isArray(deck) || typeof hasPlacementFn !== 'function') return null;
  while (deck.length) {
    const type = deck.pop();
    if (hasPlacementFn(type)) {
      return {type, r: 0};
    }
  }
  return null;
}

export function formatMovePayload({
  n,
  p,
  x,
  y,
  r,
  seed,
  choice,
  groupsOfFn,
  gidFn,
  autoMove = false,
  autoAway = false,
  missedCount = 0,
  isNet = false
}) {
  const mt = choice ? choice.t : {x, y};
  let mIndex = -1;
  if (choice && typeof groupsOfFn === 'function' && typeof gidFn === 'function') {
    const groups = groupsOfFn(mt) || [];
    mIndex = groups.findIndex(g => gidFn(mt, g) === gidFn(mt, choice.g));
  }
  const mv = {
    n,
    p,
    x,
    y,
    r,
    seed,
    m: mIndex
  };
  if (choice && (mt.x !== x || mt.y !== y)) {
    mv.mtx = mt.x;
    mv.mty = mt.y;
  }
  let newMissed = 0;
  if (autoMove && !(autoAway && missedCount === 0)) {
    if (isNet) mv.auto = 1;
    newMissed = missedCount + 1;
  } else {
    newMissed = 0;
  }
  return {move: mv, missed: newMissed};
}

export function formatTurnStatusText({
  turnPlayerName,
  isLocal,
  localHumansCount = 1,
  isAway = false,
  showHints = true
}) {
  if (isAway) {
    return 'За вас ходит бот <button class="chip" id="imHere">Вернуться</button>';
  }
  if (!isLocal) {
    return `Ходит <b>${turnPlayerName}</b>…`;
  }
  const turn = localHumansCount > 1 ? `Ход: <b>${turnPlayerName}</b>.` : '<b>Ваш ход.</b>';
  const next = showHints ? 'Выберите клетку с «+»' : 'Выберите клетку рядом с плитками';
  return `${turn} ${next}`;
}
