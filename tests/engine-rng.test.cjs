// src/engine/rng.js: the numbers every phone in an online game must agree on. Frozen values: if they change,
// old and new versions of the game build different games from the same seed.
'use strict';
const { gameSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

test('engine/rng: frozen sequence and hash', async () => {
  const {rng, hash} = await import('../src/engine/rng.js');
  const r = rng(12345);
  assert.deepEqual([r(), r(), r()], [0.9797282677609473, 0.3067522644996643, 0.484205421525985]);
  assert.equal(hash('3,-2'), 8027717);
  assert.equal(hash('Пазл'), 38958876);
});

test('game.html takes rng and hash from the bundle, not its own copy', () => {
  const html = gameSource();
  assert.ok(html.includes('const {rng, hash} = PG.engine;'));
  assert.ok(!html.includes('const rng = seed =>'));
});
