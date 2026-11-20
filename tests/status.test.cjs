// Statuses: the 15-character limit, the filter, purchase prices, wearing, and the earned ones (month, achievements, "Олд").
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadPlaywright, instrumentedCopy, openGame} = require('./golden/harness.cjs');
const pw = loadPlaywright();

test('status module: clean, filter, buy, wear, earned', async () => {
  const S = await import('../src/state/status.js');
  assert.equal(S.cleanStatus('  <b>Привет</b>   мир  '), 'bПривет/b мир');
  assert.equal(S.cleanStatus('x'.repeat(40)).length, 15);
  assert.ok(S.isBadStatus('пиздец'), 'rude word');
  assert.ok(S.isBadStatus('F u c k'), 'spaced out');
  assert.ok(S.isBadStatus('хуй'), 'plain');
  assert.ok(!S.isBadStatus('Стратег'), 'a good one passes');
  assert.ok(!S.isBadStatus('Мастер пазлов'), 'a good one passes');
  assert.equal(S.shownStatus('<script>'), 'script', 'markup is stripped');
  for (const x of [...S.SHOP_STATUSES, ...S.EXCLUSIVE_STATUSES]) assert.ok(x.text.length <= S.STATUS_MAX && !S.isBadStatus(x.text), 'ready status fits: ' + x.text);
  const w = {gold: 3500, stars: 4, statuses: []};
  assert.equal(S.buyCustomStatus(w, 'Я').reason, 'short');
  assert.equal(S.buyCustomStatus(w, 'a'.repeat(16)).reason, 'long');
  assert.equal(S.buyCustomStatus(w, 'пиздец').reason, 'bad');
  let r = S.buyCustomStatus(w, 'Мой статус');
  assert.ok(r.ok); assert.equal(w.stars, 1, 'a price from 2000 is paid in stars: 3000 = 3 stars'); assert.equal(w.gold, 3500, 'no tiles taken');
  assert.equal(S.buyCustomStatus(w, 'Мой статус').reason, 'owned');
  assert.equal(S.buyCustomStatus(w, 'Другой текст').reason, 'gold');
  assert.ok(S.wearStatus(w, r.key)); assert.equal(w.status, 'Мой статус');
  assert.ok(!S.wearStatus(w, 'sh:strategist'), 'cannot wear what is not owned');
  assert.ok(S.wearStatus(w, null)); assert.equal(w.status, '');
  r = S.buyShopStatus(w, 'newbie'); assert.ok(r.ok); assert.equal(w.gold, 3500 - r.price);
  assert.equal(S.buyShopStatus(w, 'newbie').reason, 'owned');
  assert.equal(S.buyShopStatus(w, 'king').reason, 'gold');
  // earned
  const p = {lvl: 30, ach: {a: 'got', b: 'got'}, qdays: {}};
  for (let d = 1; d <= 31; d++) p.qdays['2026-10-' + String(d).padStart(2, '0')] = 1;
  const e = {statuses: [], firstSeen: '2026-10-31'};
  const got = S.grantEarned(e, p, 2, '2026-11-02');
  assert.deepEqual(got.sort(), ['ex:allach', 'ex:flawless', 'ex:legend', 'ex:old']);
  assert.deepEqual(S.grantEarned(e, p, 2, '2026-11-02'), [], 'given once');
  delete p.qdays['2026-10-15'];
  assert.ok(!S.grantEarned({statuses: [], firstSeen: '2027-02-01'}, p, 3, '2026-11-02').includes('ex:flawless'), 'a missed day breaks the month');
  assert.ok(!S.grantEarned({statuses: [], firstSeen: '2027-02-01'}, {lvl: 5, ach: {}}, 3, '2026-11-02').includes('ex:old'), 'new player is not "Олд"');
  assert.ok(S.flawlessMonth({'2026-02-01': 1, ...Object.fromEntries(Array.from({length: 28}, (_, i) => ['2026-02-' + String(i + 1).padStart(2, '0'), 1]))}, '2026-02'), 'February has 28 days');
});

test('screens: shop statuses and "my items" open without errors', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 120000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), null);
    const r = await page.evaluate(() => {
      const P = window.__pg, w = P.wallet(); w.gold = 5000;
      document.querySelector('#stBuy'); P.show('shop');
      // the status grid left the shop with the daily-rotation redesign: the shop only has to open
      P.show('items');
      const tabs = ['st', 'fr', 'fg', 'lc'].map(t => { document.querySelector(`#itabs [data-it="${t}"]`).click(); return document.querySelector('#itemsBody').innerText.length > 20; });
      return {tabs};
    });
    assert.deepEqual(r.tabs, [true, true, true, true]);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('profile: the account action opens sign-out confirmation and rating scopes can be switched', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 120000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), null, () => {
      window.FIREBASE = {apiKey: 'test', dbUrl: 'https://tiletopia.test'};
      localStorage.setItem('fbAuth', JSON.stringify({
        uid: 'test-player', email: 'a.long.tiletopia.player.address@example.invalid', idToken: 'test-token', exp: Date.now() + 3600000,
      }));
    });
    await page.setViewportSize({width: 320, height: 568});
    await page.locator('#boot').waitFor({state: 'detached'});
    await page.evaluate(() => window.__pg.show('profile'));
    const signOut = page.locator('#profile').getByRole('button', {name: 'Выйти из аккаунта'});
    await signOut.click();
    await page.locator('#confirmBox').getByText('Выйти из аккаунта?', {exact: true}).waitFor();
    await page.locator('#confirmBox [data-a=n]').click();
    await signOut.waitFor();

    await page.evaluate(() => window.__pg.show('settings', true));
    const email = page.locator('#scr-settings #acct .sacct-email-txt');
    await email.waitFor();
    assert.equal(await email.textContent(), 'a.long.tiletopia.player.address@example.invalid');
    assert.ok(await email.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'the full email fits in the account card');
    await page.locator('#scr-settings #acLogout').waitFor();

    for (const [screen, tabs] of [['items', '#itabs'], ['rules', '#rtabs']]) {
      await page.evaluate(name => window.__pg.show(name, true), screen);
      const buttons = page.locator(`${tabs} button`);
      await buttons.first().waitFor();
      assert.deepEqual(await buttons.evaluateAll(nodes => nodes.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent)), [], `${screen} labels fit on a narrow screen`);
    }

    await page.evaluate(() => window.__pg.show('progress'));
    await page.locator('#scr-progress #ptab .rd-map').waitFor();
    await page.evaluate(() => window.__pg.show('rating'));
    const all = page.locator('#scr-rating #topScopeAll');
    const friends = page.locator('#scr-rating #topScopeFriends');
    const selected = page.locator('.pri');
    await all.and(selected).waitFor();
    await friends.click();
    await friends.and(selected).waitFor();
    await all.click();
    await all.and(selected).waitFor();
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
