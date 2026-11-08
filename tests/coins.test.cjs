// Two currencies: tiles (wallet.gold) and stars (wallet.stars). No exchange. Old three-coin wallets are moved once.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('coins: prices are paid in tiles, the dearest ones in stars', async () => {
  const C = await import('../src/state/coins.js');
  assert.deepEqual(C.priceCoin(600), {c: 'tile', n: 600});
  assert.deepEqual(C.priceCoin(1200), {c: 'tile', n: 1200}, 'no silver any more: 1200 is 1200 tiles');
  assert.deepEqual(C.priceCoin(2000), {c: 'star', n: 2});
  assert.deepEqual(C.priceCoin(2500), {c: 'star', n: 3});
  const w = {gold: 1250, stars: 2};
  assert.equal(C.canPay(w, 1200), true);
  assert.equal(C.canPay(w, 3000), false, '3 stars needed: has 2');
  assert.equal(C.pay(w, 1200), true); assert.equal(w.gold, 50);
  assert.equal(C.pay(w, 3000), false); assert.equal(w.stars, 2, 'nothing taken when short');
  assert.ok(C.pay(w, 2000)); assert.equal(w.stars, 0);
  assert.match(C.lackText({gold: 10}, 2100), /Не хватает 3 звёзд/);
  assert.match(C.lackText({gold: 10}, 100), /Не хватает 90 тайлов/);
  assert.equal(typeof C.exchange, 'undefined', 'the exchange is gone for good');
  assert.equal(typeof C.RATE, 'undefined');
});

test('coins: give adds tiles or stars', async () => {
  const C = await import('../src/state/coins.js');
  const w = {gold: 5};
  assert.equal(C.give(w, 10), 10); assert.equal(w.gold, 15);
  assert.equal(C.give(w, 3, 'star'), 3); assert.equal(w.stars, 3);
  assert.equal(C.give(w, -4), 0); assert.equal(w.gold, 15, 'a negative amount gives nothing');
});

test('coins: an old three-coin wallet becomes two currencies, once', async () => {
  const C = await import('../src/state/coins.js');
  const w = {gold: 250, silver: 7, goldCoins: 2};
  assert.equal(C.migrate(w), true);
  assert.deepEqual([w.gold, w.stars], [250 + 700, 2], 'a silver is worth 100 tiles; a gold coin is a star');
  assert.ok(!('silver' in w) && !('goldCoins' in w));
  assert.equal(C.migrate(w), false, 'a second call moves nothing');
  assert.deepEqual([w.gold, w.stars], [950, 2]);
  const plain = {gold: 40};
  assert.equal(C.migrate(plain), false); assert.equal(plain.gold, 40);
});

test('coins: a saved wallet is migrated on load, and the game has no exchange left', async () => {
  const {loadWallet} = await import('../src/state/wallet.js');
  const mem = {wallet: JSON.stringify({gold: 100, silver: 3, goldCoins: 1, owned: ['classic']})};
  const st = {getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }};
  const w = loadWallet(st, () => true, '#ef5350');
  assert.deepEqual([w.gold, w.stars], [400, 1]);
  const html = fs.readFileSync(__dirname + '/../web/game.html', 'utf8');
  assert.ok(!/data-exch|renderExchange|id="exch"/.test(html), 'no exchange in the page');
  assert.ok(!/class="coin (copper|silver|gold)"/.test(html), 'no old coins in the page');
});

test('coins: achievements pay tiles (bronze, silver medals) or stars (gold medals)', async () => {
  const P = await import('../src/state/progress.js');
  for (const a of P.ACH) {
    if (a.coin === undefined) continue;
    assert.ok(a.coin === 'tile' || a.coin === 'star', a.id + ' pays tiles or stars');
    assert.ok(a.g > 0);
    if (a.tier === 'gold') assert.equal(a.coin, 'star', a.id + ': a gold medal pays stars');
  }
});
