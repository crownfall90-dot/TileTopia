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
    await page.evaluate(() => { document.querySelectorAll('body > .over,#boot').forEach(e => e.remove()); window.__settings = 0; window.AndroidApp = {openAppSettings() { window.__settings++; }}; });
    await page.evaluate(() => window.onUpdateAvailable({code: 999, version: '1.0.999', notes: 'x', url: 'https://example.invalid/Tiletopia.apk', reinstall: true}, false));
    const box = await page.waitForSelector('#reinst');
    const t = await box.textContent();
    for (const want of ['Новое приложение Tiletopia', 'Сохраните прогресс', 'Скачайте новую версию', 'Удалите эту версию', 'Установите скачанный файл']) assert.ok(t.includes(want), want);
    assert.equal(await page.evaluate(() => !!document.querySelector('#upd')), false, 'no in-place update button');
    // without a profile the first tap on "remove" only warns; the second opens the system page
    await page.click('#rsDel');
    assert.equal(await page.evaluate(() => window.__settings), 0);
    await page.click('#rsDel');
    assert.equal(await page.evaluate(() => window.__settings), 1);
    await page.click('#rsLater');
    assert.equal(await page.evaluate(() => !!document.getElementById('reinst')), false);
    // the same key: the usual update dialog
    await page.evaluate(() => window.onUpdateAvailable({code: 999, version: '1.0.999', notes: 'x', url: 'u', reinstall: false}, true));
    await page.waitForSelector('#upd');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
