// Classic 2.0: the six-sided board (src/engine/hex.js) and its bots.
const test = require('node:test');
const assert = require('node:assert');

const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const put = (tiles, x, y, type, r = 0, by) => { const t = {x, y, type, r, by}; tiles.set(x + ',' + y, t); return t; };

test('hex: every card has six sides, neighbours are mutual, the deck is big enough', async () => {
  const H = await import('../src/engine/hex.js');
  for (const [id, t] of Object.entries(H.TYPES)) assert.match(t.e, /^[crwf]{6}$/, id);
  for (let d = 0; d < 6; d++) { assert.equal(H.DX[d] + H.DX[H.opp(d)], 0); assert.equal(H.DY[d] + H.DY[H.opp(d)], 0); }
  // neighbours are one tile height apart on the table
  for (let d = 0; d < 6; d++) { const [x, y] = H.cellXY(H.DX[d], H.DY[d]); assert.ok(Math.abs(Math.hypot(x, y) - 1) < 1e-9, 'side ' + d); }
  assert.ok(H.deckList({rivers: false}).length >= 50 && H.deckList({rivers: true}).length > H.deckList({rivers: false}).length);
});

test('hex: sides must match; a town closed by two cards scores 2 per card; a monastery needs all six neighbours', async () => {
  const H = await import('../src/engine/hex.js');
  const tiles = new Map();
  put(tiles, 0, 0, 'hC1');                                    // town on the north side
  assert.ok(!H.fits(tiles, 'hRS', 0, 0, -1), 'a road does not meet a town');
  assert.ok(H.legalRots(tiles, 'hC1', 0, -1).includes(3), 'a town side turned south meets it');
  const top = put(tiles, 0, -1, 'hC1', 3, 0);
  const [done] = H.completedAround(tiles, [], top);
  assert.equal(done.kind, 'c'); assert.equal(done.tiles.length, 2);
  const meeple = {gid: H.gid(top, H.groupsOf(top)[0]), p: 0};
  const c = H.component(tiles, [meeple], top, H.groupsOf(top)[0]);
  assert.deepEqual(H.settle(tiles, c, false, 2, 'all', 0), {pts: 4, win: [0], each: 4, helped: false});
  const mon = new Map(); const f = put(mon, 0, 0, 'hF');
  for (let d = 0; d < 5; d++) put(mon, H.DX[d], H.DY[d], 'hG');
  assert.equal(H.fortComp(mon, [], f).complete, false);
  const last = put(mon, H.DX[5], H.DY[5], 'hG');
  assert.equal(H.completedAround(mon, [], last).filter(x => x.kind === 'f').length, 1);
  assert.equal(H.featurePoints(mon, H.fortComp(mon, [], f), false), 9);
});

test('hex: a whole game of bots plays legal moves to the end', async () => {
  const H = await import('../src/engine/hex.js'), {hex: bots} = await import('../src/engine/bots.js');
  const random = seeded(42), deck = H.deckList({rivers: true});
  for (let i = deck.length - 1; i > 0; i--) { const j = (random() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const tiles = new Map(), meeples = [], left = [6, 6, 6];
  put(tiles, 0, 0, deck.pop());
  let placed = 1, p = 0;
  while (deck.length) {
    const type = deck.pop();
    if (!H.hasPlacement(tiles, type)) continue;
    const m = bots.levelPick(tiles, meeples, type, p, 3, random, 'hard');
    assert.ok(H.fits(tiles, type, m.r, m.x, m.y), 'legal move');
    const t = put(tiles, m.x, m.y, type, m.r, p); placed++;
    const opts = left[p] ? H.claimable(tiles, meeples, t, p).map(g => ({t, g})) : [];
    const o = bots.figurePick(tiles, meeples, opts, left[p], random, 'hard');
    if (o) { meeples.push({gid: H.gid(o.t, o.g), p, t: o.t, g: o.g}); left[p]--; }
    for (const c of H.completedAround(tiles, meeples, t)) c.meeples.forEach(x => { meeples.splice(meeples.indexOf(x), 1); left[x.p]++; });
    p = (p + 1) % 3;
  }
  assert.ok(placed > 40, 'most cards find a place: ' + placed);
  assert.ok(bots.hintPick(tiles, meeples, 'hRS', 0, 3, true), 'the coach finds a spot');
});
