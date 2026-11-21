// Rules v2: a player may add figures to an object held only by their own figures (one per card and feature); equal
// figures are decided by who laid more cards of the object; a rival's figure still blocks; v1 is unchanged.
'use strict';
const { gameSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

test('engine: rules v2 reinforcement and card tie-break', async () => {
  const {key, claimable, component, groupsOf, gid} = await import('../src/engine/board.js');
  const {settle} = await import('../src/engine/scoring.js');
  // a vertical road: end - straight - straight - (open) ; cards laid by player 0 (two) and 1 (one)
  const mk = (x, y, type, r, by) => ({x, y, type, r, seed: 1, ...(by === undefined ? {} : {by})});
  const tiles = new Map();
  for (const t of [mk(0, 0, 'rS', 0), mk(0, 1, 'rS', 0, 0), mk(0, 2, 'rS', 0, 1), mk(0, 3, 'rS', 0, 0)]) tiles.set(key(t.x, t.y), t);
  const roadOf = t => groupsOf(t).find(g => g.kind === 'r');
  const t0 = tiles.get(key(0, 0)), t1 = tiles.get(key(0, 1)), t3 = tiles.get(key(0, 3));
  const m0 = [{p: 0, gid: gid(t0, roadOf(t0))}];
  assert.equal(claimable(tiles, m0, t1, 0, false).length, 0, 'v1: an occupied road is closed even to its owner');
  assert.equal(claimable(tiles, m0, t1, 0, true).filter(g => g.kind === 'r').length, 1, 'v2: the owner may reinforce');
  assert.equal(claimable(tiles, m0, t1, 1, true).filter(g => g.kind === 'r').length, 0, 'v2: a rival may not take part');
  const m1 = m0.concat([{p: 0, gid: gid(t1, roadOf(t1))}]);
  assert.equal(claimable(tiles, m1, t1, 0, true).filter(g => g.kind === 'r').length, 0, 'one figure per card and feature');
  // tie-break by cards: one figure each; player 0 laid 2 cards of the road, player 1 laid 1
  const c = component(tiles, [{p: 0, gid: gid(t0, roadOf(t0))}, {p: 1, gid: gid(t3, roadOf(t3))}], t0, roadOf(t0));
  assert.deepEqual(settle(tiles, c, true, 2, 'all', 0, false).win, [0, 1], 'v1: equal figures -> both');
  assert.deepEqual(settle(tiles, c, true, 2, 'all', 0, true).win, [0], 'v2: more cards wins');
  c.meeples.push({p: 1, gid: 'x'}); // now 2 figures for player 1 against 1
  assert.deepEqual(settle(tiles, c, true, 2, 'all', 0, true).win, [1], 'v2: more figures first');
});

test('source: draw is accepted at once when the others are away; resume offer survives a stale room', async () => {
  const src = gameSource();
  assert.match(src, /activeHumans\(\)\.every\(i => i === m\.p \|\| players\[i\]\.missed >= 1\)/);
  assert.match(src, /activeHumans\(\)\.every\(i => d\.yes\.has\(i\) \|\| players\[i\]\.missed >= 1\)/);
  assert.match(src, /lg = lastOnline\(\) && \(!net \|\| !gameVisible\)/);
});
