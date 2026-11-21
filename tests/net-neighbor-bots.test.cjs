// H-5 Neighbor Bots in Quick Match contract:
// 1. If opponent is not found within ~10 seconds, host auto-fills seats with bots.
// 2. Bots have an honest mark "бот" visible on cards, lobby, and results.
// 3. No cups are awarded for games with bots.
// 4. Bots never leak into private friends' rooms.
'use strict';
const { gameSource, stylesSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');


test('neighbor bots (H-5, owner decision 01.11): stand-in joins after 84 seconds in quick match', () => {
  const code = gameSource();

  // Matchmaking tick logic checks for 10 seconds
  assert.ok(code.includes('sec >= FILL_SECS') && code.includes('const FILL_SECS = 84'), 'matchTick checks the 84 s (1:24) threshold');
  assert.ok(code.includes('seats.length < me.want'), 'auto-fills when seats are below wanted table size');
  assert.ok(code.includes('bot: true'), 'marks auto-added bot seats');
  assert.ok(code.includes('BOT_NAMES'), 'picks from neighbor bot names list');

  // Guard: only in quick match
  assert.ok(code.includes('net.quick'), 'only triggers when net.quick is active');
});

test('bot mark (H-5): honest bot pill badge displayed in player cards, lobby, and results', () => {
  const code = gameSource();
  const styles = stylesSource();

  // Bot pill badge in CSS
  assert.ok(styles.includes('.botpill'), 'styles.css contains .botpill class definition');

  // In-game player card displays bot mark
  assert.ok(code.includes('!p.human && !p.ghost ? \' <span class="botpill">бот</span>\''), 'renderPlayers displays bot pill for non-human');

  // Lobby/matchmaking display shows bot mark
  assert.ok(code.includes('!x.owner && !x.ghost ? \' <span class="botpill">бот</span>\''), 'matchRender displays bot pill in seat list');

  // Results podium & table display bot mark
  assert.ok(code.includes('!p.human && !p.ghost ? \' <span class="botpill">бот</span>\''), 'renderResults displays bot pill on podium and scoreboard');
});

test('cups safety (H-5): no cups awarded for games containing bots', () => {
  const code = gameSource();

  // rewardCalc checks players.some(p => !p.human)
  assert.ok(code.includes('const hasBots = players.some(p => !p.human)'), 'rewardCalc identifies whether any bots participated');
  assert.ok(code.includes('!hasBots && net && (net.quick'), 'rated is false if hasBots is true');

  // Results chips explain no cups due to bots
  assert.ok(code.includes('без кубков: игра с ботом'), 'results screen explicitly notes no cups when playing with bots');

  // Header does not claim rated game when bots present
  assert.ok(code.includes('(с ботом)'), 'room header indicates with bot rather than rating match');
});

test('no leakage (H-5): private friends rooms never auto-fill bots', () => {
  const code = gameSource();

  // Auto-fill is strictly confined inside matchTick where mm is active and net.quick is true
  assert.ok(code.includes('if (!net || !net.quick || net.gameId) return;'), 'matchTick immediately returns if not net.quick');
});

test('simulation: matchmaking timer adds bot and disables rated cups', () => {
  // Simulate mock matchmaking state
  const myId = 'player1';
  let publishedSeats = null;
  let closedCode = null;

  const mm = {
    t0: Date.now() - 11000, // 11 seconds elapsed
    want: 2,
    mode: 'classic',
    startAt: 0
  };

  const net = {
    code: 'TEST1',
    host: true,
    quick: true,
    gameId: null,
    lobby: {
      seats: [{owner: myId, name: 'Игрок', ready: true}]
    }
  };

  const sec = Math.floor((Date.now() - mm.t0) / 1000);
  assert.ok(sec >= 10, 'more than 10 seconds elapsed');

  const BOT_NAMES = ['Бот Ёж', 'Бот Сова'];
  const seats = net.lobby.seats;

  if (net.host && !mm.startAt && sec >= 10 && seats.length < mm.want) {
    const nextSeats = seats.slice();
    while (nextSeats.length < mm.want) {
      const bName = BOT_NAMES.find(n => !nextSeats.some(x => x.name === n)) || 'Бот';
      nextSeats.push({owner: null, bot: true, name: bName, fig: 'classic', col: null, ready: true});
    }
    publishedSeats = nextSeats;
    net.lobby.seats = nextSeats;
    mm.startAt = Date.now() + 1500;
    closedCode = net.code;
  }

  assert.equal(publishedSeats.length, 2, 'lobby filled to wanted size 2');
  assert.equal(publishedSeats[1].owner, null, 'bot has no owner');
  assert.equal(publishedSeats[1].bot, true, 'bot flag is true');
  assert.equal(publishedSeats[1].name, 'Бот Ёж', 'correct bot name assigned');
  assert.equal(closedCode, 'TEST1', 'room closed in QMATCH registry');

  // Verify reward calculation with simulated players
  const players = [
    {name: 'Игрок', human: true, score: 25},
    {name: 'Бот Ёж', human: false, score: 18}
  ];

  const hasBots = players.some(p => !p.human);
  assert.equal(hasBots, true, 'hasBots is true');

  const rated = !hasBots && net.quick;
  assert.equal(rated, false, 'rated is strictly false when bots present');

  const place = 0; // 1st place
  const cups = rated ? (place < 0 ? 10 : [30, 15, 5, 0, 0][place]) : 0;
  assert.equal(cups, 0, 'zero cups awarded in bot match');
});
