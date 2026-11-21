// N-5 Rematch contract: in an online game, "Реванш" appears on the results card and screen.
// Host starting rematch invokes startOnline with the same seats; non-host sends a rematch offer.
'use strict';
const { gameSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');


test('rematch (N-5): game.html contains rematchClick, startRematch and handles rematch message', () => {
  const code = gameSource();

  // Verify functions exist
  assert.ok(code.includes('function rematchClick('), 'rematchClick function is defined');
  assert.ok(code.includes('function startRematch('), 'startRematch function is defined');

  // Verify buttons label dynamically changes for online
  assert.ok(code.includes("${net ? 'Реванш' : 'Ещё партию'}"), 'in-game results button uses Реванш for online');
  assert.ok(code.includes("ag.textContent = net ? 'Реванш' : 'Ещё партию'"), 'results screen button uses Реванш for online');

  // Verify message handling
  assert.ok(code.includes("m.t === 'rematch'"), 'onNet handles rematch message');
  assert.ok(code.includes("Принять реванш"), 'host receives rematch prompt');
  assert.ok(code.includes("Запрос на реванш отправлен"), 'guest gets confirmation feedback');

  // Multi-player rematch voting & 10s countdown
  assert.ok(code.includes('checkRematchVotes'), 'checks rematch votes and countdown');
  assert.ok(code.includes('net.rematchCountdown = 10'), '10s timer for rematch');
  assert.ok(code.includes('executeRematch'), 'executes rematch with agreed players');
});

test('lobby readiness: friends in room must press ready before host can start', () => {
  const code = gameSource();

  // Ready button exists for guest
  assert.ok(code.includes('id="lobbyReady"'), 'lobbyReady button in HTML');
  assert.ok(code.includes("m.t === 'ready'"), 'ready message handled in onNet');
  assert.ok(code.includes("m.t === 'hello' || m.t === 'ready'"), 'ready message authorized in netAuth');

  // Host prompt when not everyone ready
  assert.ok(code.includes('Прожмите готовность'), 'host sees Прожмите готовность while others not ready');
  assert.ok(code.includes('Начать игру'), 'host sees Начать игру when all ready');

  // Readiness pill indicators in player list
  assert.ok(code.includes('pill ok'), 'green pill for ready players');
  assert.ok(code.includes('pill wait'), 'gray pill for not ready players');

  // Guest sees themselves in room seats
  assert.ok(code.includes('(вы)'), 'self player indicator');
  assert.ok(code.includes('pending: true'), 'guest optimistically included in seats');
});

test('room header: cups game with friends displays рейтинговая игра under room', () => {
  const code = gameSource();

  assert.ok(code.includes("isCups ? 'рейтинговая игра' : 'онлайн'"), 'header subtitle shows рейтинговая игра for cups');
});

test('android workflow: announces update in telegram and pushes via FCM', () => {
  const wf = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'android.yml'), 'utf8');
  assert.ok(wf.includes('Notify players'), 'FCM push notification present');
  assert.ok(wf.includes('Announce in Telegram'), 'telegram announcement present');
  assert.ok(wf.includes('scripts/telegram-notify.py'), 'runs telegram-notify script');
});
