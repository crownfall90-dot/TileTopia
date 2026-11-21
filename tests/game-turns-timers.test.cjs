// tests/game-turns-timers.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');

test('game/timers: resolveTurnDuration and time calculations', async () => {
  const timers = await import('../src/game/timers.js');

  // resolveTurnDuration
  assert.equal(timers.resolveTurnDuration({away: true, timerSecs: 30, isNet: true}), 2);
  assert.equal(timers.resolveTurnDuration({away: false, timerSecs: 20, isNet: false}), 20);
  assert.equal(timers.resolveTurnDuration({away: false, timerSecs: 0, isNet: true}), 60);
  assert.equal(timers.resolveTurnDuration({away: false, timerSecs: 0, isNet: false}), 0);

  // calcTimeLeft
  const now = 100000;
  assert.equal(timers.calcTimeLeft(now + 9100, now), 10);
  assert.equal(timers.calcTimeLeft(now + 9001, now), 10);
  assert.equal(timers.calcTimeLeft(now + 9000, now), 9);
  assert.equal(timers.calcTimeLeft(now - 500, now), 0);

  // isLowTime & isUrgentTime
  assert.equal(timers.isLowTime(10), true);
  assert.equal(timers.isLowTime(1), true);
  assert.equal(timers.isLowTime(11), false);
  assert.equal(timers.isLowTime(0), false);

  assert.equal(timers.isUrgentTime(5), true);
  assert.equal(timers.isUrgentTime(1), true);
  assert.equal(timers.isUrgentTime(6), false);
  assert.equal(timers.isUrgentTime(0), false);

  // shouldWarnIdle
  assert.equal(timers.shouldWarnIdle({
    alertEnabled: true,
    left: 8,
    isLocal: true,
    phase: 'place',
    idleDurationMs: 3000
  }), true);

  assert.equal(timers.shouldWarnIdle({
    alertEnabled: false,
    left: 8,
    isLocal: true,
    phase: 'place',
    idleDurationMs: 3000
  }), false);

  assert.equal(timers.shouldWarnIdle({
    alertEnabled: true,
    left: 12,
    isLocal: true,
    phase: 'place',
    idleDurationMs: 3000
  }), false);

  assert.equal(timers.shouldWarnIdle({
    alertEnabled: true,
    left: 8,
    isLocal: false,
    phase: 'place',
    idleDurationMs: 3000
  }), false);
});

test('game/timers: createCountdown state and controls', async () => {
  const timers = await import('../src/game/timers.js');

  let simulatedNow = 1000;
  const ticks = [];
  let expired = false;

  const cd = timers.createCountdown({
    durationSecs: 5,
    onTick: left => ticks.push(left),
    onExpire: () => { expired = true; },
    nowFn: () => simulatedNow
  });

  cd.start();
  assert.equal(cd.isRunning(), true);
  assert.equal(cd.getTimeLeft(), 5);

  simulatedNow += 2000;
  cd.tick();
  assert.equal(cd.getTimeLeft(), 3);

  cd.pause();
  simulatedNow += 5000; // paused time should not reduce left time
  cd.tick();
  assert.equal(cd.getTimeLeft(), 3);

  cd.resume();
  simulatedNow += 3000;
  cd.tick();
  assert.equal(cd.getTimeLeft(), 0);
  assert.equal(expired, true);
  assert.equal(cd.isRunning(), false);

  cd.stop();
});

test('game/turns: nextTurnIndex and bot level resolution', async () => {
  const turns = await import('../src/game/turns.js');

  // nextTurnIndex
  assert.equal(turns.nextTurnIndex(0, 3), 1);
  assert.equal(turns.nextTurnIndex(2, 3), 0);
  assert.equal(turns.nextTurnIndex(0, 0), 0);

  // softStart & resolveBotLevel
  assert.equal(turns.isSoftStart('normal', 0), true);
  assert.equal(turns.isSoftStart('normal', 2), true);
  assert.equal(turns.isSoftStart('normal', 3), false);
  assert.equal(turns.isSoftStart('hard', 0), false);

  assert.equal(turns.resolveBotLevel('normal', 0), 'easy');
  assert.equal(turns.resolveBotLevel('normal', 2), 'easy');
  assert.equal(turns.resolveBotLevel('normal', 3), 'normal');
  assert.equal(turns.resolveBotLevel('hard', 0), 'hard');
  assert.equal(turns.resolveBotLevel('invalid', 5), 'normal');

  // isPlayerAway
  assert.equal(turns.isPlayerAway(0), false);
  assert.equal(turns.isPlayerAway(1), true);
  assert.equal(turns.isPlayerAway(3), true);
});

test('game/turns: drawNextValidCard skips invalid placements', async () => {
  const turns = await import('../src/game/turns.js');

  const deck = ['validTile', 'impossible2', 'impossible1'];
  const hasPlacement = type => type === 'validTile';

  const card = turns.drawNextValidCard(deck, hasPlacement);
  assert.deepEqual(card, {type: 'validTile', r: 0});
  assert.deepEqual(deck, []);

  const emptyDeck = [];
  assert.equal(turns.drawNextValidCard(emptyDeck, () => true), null);
});

test('game/turns: formatMovePayload and turn status formatting', async () => {
  const turns = await import('../src/game/turns.js');

  // formatMovePayload normal
  const choice = {t: {x: 2, y: 3}, g: 'c0'};
  const groupsOfFn = () => ['c0', 'r0'];
  const gidFn = (t, g) => `${t.x},${t.y}:${g}`;

  const payload = turns.formatMovePayload({
    n: 4,
    p: 1,
    x: 2,
    y: 3,
    r: 1,
    seed: 42,
    choice,
    groupsOfFn,
    gidFn,
    autoMove: false,
    autoAway: false,
    missedCount: 0,
    isNet: true
  });

  assert.deepEqual(payload.move, {
    n: 4,
    p: 1,
    x: 2,
    y: 3,
    r: 1,
    seed: 42,
    m: 0
  });
  assert.equal(payload.missed, 0);

  // formatMovePayload with auto-move in net game
  const autoPayload = turns.formatMovePayload({
    n: 5,
    p: 0,
    x: 1,
    y: 0,
    r: 0,
    seed: 123,
    choice: null,
    autoMove: true,
    autoAway: false,
    missedCount: 1,
    isNet: true
  });
  assert.equal(autoPayload.move.auto, 1);
  assert.equal(autoPayload.missed, 2);

  // formatTurnStatusText
  assert.equal(turns.formatTurnStatusText({isAway: true}), 'За вас ходит бот <button class="chip" id="imHere">Вернуться</button>');
  assert.equal(turns.formatTurnStatusText({turnPlayerName: 'Боб', isLocal: false}), 'Ходит <b>Боб</b>…');
  assert.equal(turns.formatTurnStatusText({turnPlayerName: 'Алиса', isLocal: true, localHumansCount: 2}), 'Ход: <b>Алиса</b>. Выберите клетку с «+»');
  assert.equal(turns.formatTurnStatusText({turnPlayerName: 'Алиса', isLocal: true, showHints: false}), '<b>Ваш ход.</b> Выберите клетку рядом с плитками');
});
