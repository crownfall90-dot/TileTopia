// Three coins: copper (wallet.gold), silver, gold; prices in copper are paid in the bigger coin; one-way exchange.
const test = require('node:test');
const assert = require('node:assert/strict');

test('coins: prices, paying and the exchange', async () => {
  const C = await import('../src/state/coins.js');
  assert.deepEqual(C.priceCoin(600), {c: 'copper', n: 600});
  assert.deepEqual(C.priceCoin(1200), {c: 'silver', n: 12});
  assert.deepEqual(C.priceCoin(2500), {c: 'gold', n: 3});
  const w = {gold: 1250};
  assert.equal(C.canPay(w, 1200), false, 'copper does not pay a silver price');
  assert.equal(C.exchange(w, 'silver', 10), 10); assert.deepEqual([w.gold, w.silver], [250, 10]);
  assert.equal(C.exchange(w, 'silver', 10), 2, 'only what the copper allows'); assert.deepEqual([w.gold, w.silver], [50, 12]);
  assert.ok(C.pay(w, 1200)); assert.equal(w.silver, 0);
  assert.equal(C.pay(w, 1200), false); assert.equal(w.silver, 0, 'nothing taken when short');
  w.silver = 25; assert.equal(C.exchange(w, 'gold', 5), 2); assert.deepEqual([w.silver, w.goldCoins], [5, 2]);
  assert.match(C.lackText({gold: 10}, 2100), /Не хватает 3 золота/);
});
