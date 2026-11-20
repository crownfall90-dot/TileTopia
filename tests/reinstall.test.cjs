// After the signing key change (docs/SIGNING-KEY-ROTATION.md) a copy signed with the old key cannot update in place.
// latest.json then says reinstall; the game walks the player through it: save to the profile, download, remove, install.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadPlaywright, instrumentedCopy, openGame} = require('./golden/harness.cjs');

const pw = loadPlaywright();

test('reinstall: a release signed with another key opens the step-by-step reinstall, not the normal update', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 60000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), null);
    // the app's bridge, only the call this flow uses (set after start: the page decides at start whether it is the app)
    await page.evaluate(() => {
      document.querySelectorAll('body > .over,#boot').forEach(e => e.remove());
      window.__pg.show('menu', true);
      window.__settings = 0;
      window.AndroidApp = {openAppSettings() { window.__settings++; }};
    });
    const url = 'https://example.invalid/Tiletopia.apk';
    await page.route(url, r => r.fulfill({status: 204}));
    await page.evaluate(url => window.onUpdateAvailable({code: 999, version: '1.0.999', notes: 'x', url, reinstall: true}, false), url);
    const box = await page.waitForSelector('#reinst');
    const t = await box.textContent();
    for (const want of ['Новое приложение Tiletopia', 'Сохраните прогресс', 'Скачайте новую версию', 'Удалите старую версию', 'Установите скачанный файл']) assert.ok(t.includes(want), want);
    assert.equal(await page.evaluate(() => !!document.querySelector('#upd')), false, 'no in-place update button');
    assert.equal(await page.locator('#reinst li.ok').count(), 0, 'a guest is never shown as saved');
    assert.equal(await page.locator('#rsDel').isDisabled(), true, 'start the download first');
    await Promise.all([page.waitForRequest(url), page.click('#rsGet')]);
    await page.click('#rsDel');
    assert.equal(await page.evaluate(() => window.__settings), 0);
    await page.locator('#confirmBox [data-a=y]').click();
    assert.equal(await page.evaluate(() => window.__settings), 1);
    await page.click('#rsLater');
    await page.locator('#reinst').waitFor({state: 'detached'});
    // the same key: the usual update dialog
    await page.evaluate(() => window.onUpdateAvailable({code: 999, version: '1.0.999', notes: 'x', url: 'u', reinstall: false}, true));
    await page.waitForSelector('#upd');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
