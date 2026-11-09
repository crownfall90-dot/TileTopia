// The progress road: starts from level 1 (cups: 0), then each next stage is +5 levels and +250 cups.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('progress road: begins at level 1 and each next stage is +5 levels and +250 cups', () => {
  const src = fs.readFileSync(__dirname + '/../web/game.html', 'utf8');
  const m = [...src.matchAll(/id: 'm\d+', lvl: (\d+), cups: (\d+),/g)].map(x => [+x[1], +x[2]]);
  assert.ok(m.length >= 10, 'the road has its stages');
  assert.deepEqual(m[0], [1, 0], 'starts at level 1 with 0 cups for new players');
  m.slice(1).forEach(([lvl, cups], i) => {
    assert.equal(lvl, 5 * (i + 1));
    assert.equal(cups, 250 * (i + 1));
  });
});

test('rating: a tap on a player is left to the global player-card handler (no second modal)', () => {
  const src = fs.readFileSync(__dirname + '/../web/game.html', 'utf8');
  assert.ok(!/showPlayerInspectModal|playerInspectModal/.test(src), 'the old simple card is gone');
  assert.ok(!/сброс в понедельник/.test(src), 'the rating is not reset');
});

test('progress road: the top stages also pay stars, claimed through the one coin module', () => {
  const src = fs.readFileSync(__dirname + '/../web/game.html', 'utf8');
  const stars = [...src.matchAll(/id: '(m\d+)'[^\n]*?stars: (\d+)/g)].map(x => [x[1], +x[2]]);
  assert.deepEqual(stars, [['m30', 1], ['m40', 2], ['m45', 2], ['m50', 3]], 'stars on the four top stages');
  assert.match(src, /if \(m\.reward\.stars\) COINS\.give\(wallet, m\.reward\.stars, 'star'\)/, 'the stars are given by COINS.give');
  assert.ok(!/\d+ монет\b/.test(src), 'no «монет» left: the currency is tiles');
});
