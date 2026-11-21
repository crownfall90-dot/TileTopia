// After the signing key change (docs/SIGNING-KEY-ROTATION.md) a copy signed with the old key cannot update in place.
// latest.json then says reinstall; the game walks the player through it: save to the profile, download, remove, install.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadPlaywright, instrumentedCopy, openGame} = require('./golden/harness.cjs');

const pw = loadPlaywright();

test('reinstall: only a confirmed save for the current account bypasses the warning', {skip: !pw && 'requires Playwright'}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), null);
    const result = await page.evaluate(async () => {
      let uid = 'A', completeSave, warnings = 0, settings = 0, offers = 0;
      const controller = PG.app.update.createReleaseController({
        doc: document, boot: {gone: true}, finishBoot() {},
        getPolicy: () => ({currentCode: 295}), getMatch: () => ({active: false}), notify() {},
        migration: {
          linkedUid: () => uid,
          saveProfile: () => new Promise(resolve => { completeSave = resolve; }),
          confirmRemoval: () => { warnings++; }, download() {}, openSettings: () => { settings++; },
          track: event => { if (event === 'reinstall_offer') offers++; }
        }
      });
      // Legacy manifests may omit the package. Android reports the certificate mismatch.
      const info = {code: 297, version: '1.0.297', url: 'release.apk', reinstall: true, mandatory: false};
      controller.offer(info, false);
      const click = id => document.querySelector(id).click();
      const save = () => document.querySelector('#rsSave').onclick();
      const switched = save();
      uid = 'B';
      completeSave(true);
      await switched;
      click('#rsGet');
      click('#rsDel');
      const afterSwitch = {warnings, settings};
      const saved = save();
      completeSave(true);
      await saved;
      controller.offer({...info}, false);
      click('#rsDel');
      const afterSave = {warnings, settings, offers};
      uid = null;
      click('#rsDel');
      return {afterSwitch, afterSave, afterLogout: {warnings, settings}};
    });
    assert.deepEqual(result, {
      afterSwitch: {warnings: 1, settings: 0}, afterSave: {warnings: 1, settings: 1, offers: 1},
      afterLogout: {warnings: 2, settings: 1}
    });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('reinstall: a release signed with another key opens the step-by-step reinstall, not the normal update', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 60000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), null);
    // the app's bridge, only the call this flow uses (set after start: the page decides at start whether it is the app)
    await page.evaluate(() => {
      document.querySelectorAll('body > .over,#boot').forEach(e => e.remove());
      window.__pg.show('menu', true);
      window.__settings = 0;
      window.AndroidApp = {
        openAppSettings() { window.__settings++; },
        startUpdate(url) { window.__download = url; }
      };
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
    await page.click('#upd');
    assert.equal(await page.evaluate(() => window.__download), 'u');
    await page.evaluate(() => window.onUpdateProgress(42));
    assert.equal(await page.locator('.prog i').evaluate(el => el.style.width), '42%');
    await page.evaluate(() => window.onUpdateError('Ошибка установки'));
    assert.equal(await page.locator('#manual').isVisible(), true);
    assert.equal(await page.locator('#manual').getAttribute('href'), 'u');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
