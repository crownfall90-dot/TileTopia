// src/state/config.js: default seats, palette, modes, rules, settings rows. Keys are saved in players' setups and wallets.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('config: palette, modes, rules and settings keep their keys', async () => {
  const C = await import('../src/state/config.js');
  assert.equal(C.PALETTE.length, 7, 'seven colours (turquoise was removed)');
  assert.ok(C.PL0.length === 5 && C.PL0[0].human === true && C.PL0.slice(1).every(p => !p.human));
  assert.ok(C.validCol('#ef5350') && !C.validCol('#2ec4d6'));
  assert.deepEqual(Object.keys(C.MODES), ['fast', 'classic', 'epic']);
  assert.deepEqual(C.RULES.map(r => r.k), ['mode', 'deck', 'rivers', 'meeples', 'timer', 'hints', 'cups']);
  const keys = C.PREFS.map(r => r.k);
  for (const k of ['sound', 'music', 'coach', 'view', 'speed', 'alert', 'zones', 'gfx', 'notify']) assert.ok(keys.includes(k), 'setting ' + k);
  for (const [, ks] of C.PREF_GROUPS) for (const k of ks) assert.ok(keys.includes(k), 'group member ' + k);
  assert.equal(C.STREAK_GOLD.length, 7);
});

// A game is one turn per card, and a turn takes about 18 s (look, place, maybe a figure, the others watch):
// 30 cards ≈ 9 minutes, 50 ≈ 15, 100 ≈ 30. Every mode must be playable with and without rivers.
test('config: game sizes keep the playing time (fast ≈ 9, classic ≈ 15, big ≈ 30 minutes)', async () => {
  const C = await import('../src/state/config.js');
  const {deckList} = await import('../src/engine/tiles.js');
  const TURN_SECONDS = 18, minutes = m => C.MODES[m].set.deck * TURN_SECONDS / 60;
  assert.ok(minutes('fast') <= 10 && minutes('classic') <= 16 && minutes('epic') <= 31, 'times: ' + ['fast', 'classic', 'epic'].map(minutes));
  assert.ok(C.MODES.fast.set.deck < C.MODES.classic.set.deck && C.MODES.classic.set.deck < C.MODES.epic.set.deck);
  for (const m of Object.keys(C.MODES)) for (const rivers of [true, false]) assert.ok(deckList({mode: m, rivers}).length >= C.MODES[m].set.deck, `${m} has enough cards (rivers ${rivers})`);
  for (const r of C.RULES.filter(x => x.k === 'deck' || x.k === 'meeples')) for (const m of Object.values(C.MODES)) assert.ok(r.opts.some(([v]) => v === m.set[r.k]), 'the mode value is one of the options of ' + r.k);
});
