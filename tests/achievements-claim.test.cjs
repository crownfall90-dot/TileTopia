// Regression: the «Забрать» button on the achievements screen pays out once (it had no click handler).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadPlaywright, instrumentedCopy, openGame} = require('./golden/harness.cjs');
const pw = loadPlaywright();

test('achievements screen: claiming pays the coin and marks the card as taken, once', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 120000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), null);
    const r = await page.evaluate(() => {
      const P = window.__pg, pr = P.prog(), w = P.wallet();
      Object.assign(pr.st, {games: 500, c: 500, r: 500, f: 500, tiles: 5000, figs: 500});
      P.show('achievements');
      const before = w.gold + (w.silver || 0) + (w.goldCoins || 0), n0 = document.querySelectorAll('#achievementsContent [data-claima]').length;
      const btn = document.querySelector('#achievementsContent [data-claima]'), id = btn.dataset.claima;
      btn.click();
      const after = w.gold + (w.silver || 0) + (w.goldCoins || 0);
      const n1 = document.querySelectorAll('#achievementsContent [data-claima]').length;
      const again = document.querySelector(`[data-claima="${id}"]`); if (again) again.click();
      return {n0, n1, paid: after - before, got: pr.ach[id], total: w.gold + (w.silver || 0) + (w.goldCoins || 0) - before};
    });
    assert.ok(r.n0 > 0, 'there are achievements to claim');
    assert.equal(r.n1, r.n0 - 1, 'the claimed card has no button any more');
    assert.ok(r.paid > 0 && r.got === 'got');
    assert.equal(r.total, r.paid, 'a second claim pays nothing');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
