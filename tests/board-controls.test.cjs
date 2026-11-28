'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const games = require('./golden/games.json');
const {loadPlaywright, openGame, instrumentedCopy, SNAPSHOT, waitEnd} = require('./golden/harness.cjs');

const pw = loadPlaywright();

test('board: keyboard selects a legal slot and places the tile, with opt-in counters', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 90000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), null);
    const g = structuredClone(games[3]);
    g.cfg.seats[0].human = true;
    g.cfg.noIntro = true;
    await page.evaluate(g => { window.__pg.startGame(g.cfg, g.moves.slice(0, 51)); window.__pg.show('game'); }, g);
    await page.waitForFunction(() => window.__pg.state().phase === 'place');

    const board = page.locator('#board');
    await board.press('ArrowRight');
    assert.equal(await page.locator('#world .slot.sel').count(), 1);
    assert.equal(await page.evaluate(() => localStorage.getItem('usage')), null);

    await page.evaluate(() => { window.__pg.wallet().stats = true; });
    await board.press('ArrowLeft');
    await board.press('r');
    const before = await page.evaluate(() => window.__pg.state().tiles.size);
    await board.press('Enter');
    await page.waitForFunction(n => window.__pg.state().tiles.size === n + 1, before);
    const counts = await page.evaluate(() => JSON.parse(localStorage.getItem('usage')).c);
    assert.equal(counts['turn:slot'], 1);
    assert.equal(counts['turn:placed'], 1);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('object markers distinguish same-initial players and preserve scored ownership on both boards', {skip: !pw, timeout: 60000}, async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const browser = await pw.chromium.launch();
  const file = instrumentedCopy();
  try {
    const html = fs.readFileSync(file, 'utf8');
    const end = html.lastIndexOf('})();');
    const hook = `window.__ownersTest = {
      claim() {
        const t = at(0, 0), g = groupsOf(t).find(group => group.kind === 'r');
        placeMeeple(t, g, 1, false); placeMeeple(t, g, 0, false);
        updateOwnership();
      },
      score() {
        const {t, g} = meeples[0], c = component(t, g);
        markDone(c, [0]);
        [...meeples].forEach(removeMeeple);
        updateOwnership();
      },
      hide() { wallet.zones = false; markOwn(); updateOwnership(); },
    };`;
    fs.writeFileSync(file, html.slice(0, end) + hook + '\n' + html.slice(end));
    const {page, errors} = await openGame(browser, file, 42);
    for (const [mode, type] of [['classic', 'fortR'], ['hex', 'hFR']]) {
      const cfg = structuredClone(games[0].cfg);
      cfg.seats = cfg.seats.map((seat, i) => ({...seat, human: true, name: ['Лена', 'Лев'][i]}));
      cfg.rules = {...cfg.rules, mode};
      cfg.deck = [type, type];
      cfg.noIntro = true;
      await page.evaluate(cfg => {
        window.__pg.wallet().zones = true;
        window.__pg.startGame(cfg);
        window.__pg.show('game');
        window.__ownersTest.claim();
      }, cfg);

      const marker = page.getByRole('button', {name: 'Дорога · Лена, Лев', exact: true});
      assert.deepEqual(await marker.locator('span').allTextContents(), ['Л1', 'Л2']);
      await marker.click();
      const dialog = page.getByRole('dialog', {name: 'Дорога'});
      assert.match(await dialog.textContent(), /Фишки на объекте: Лена, Лев/);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.isVisible(), false);

      await page.evaluate(() => window.__ownersTest.score());
      await page.locator('#view').evaluate(el => el.click());
      await page.getByRole('button', {name: 'Дорога · Лена', exact: true}).press('Enter');
      assert.match(await dialog.textContent(), /Очки получили: Лена/);
      await dialog.getByRole('button', {name: 'Закрыть'}).click();
      await page.evaluate(() => window.__ownersTest.hide());
      assert.equal(await page.locator('.ownership-marker').count(), 0);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    fs.rmSync(path.dirname(file), {recursive: true});
  }
});

test('canceling and reopening the match chronicle preserves the final board and results', {skip: !pw, timeout: 60000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), 42);
    const g = structuredClone(games[0]);
    g.moves = g.moves.slice(0, 5);
    g.cfg.deck = g.cfg.deck.slice(-(g.moves.length + 1));
    await page.evaluate(g => { window.__pg.startGame(g.cfg, g.moves); window.__pg.show('game'); }, g);
    await waitEnd(page, 20000);
    const before = await page.evaluate(SNAPSHOT);
    const button = page.locator('#timelapseBtn');
    await button.click();
    await page.locator('#tlSkip').click();
    assert.deepEqual(await page.evaluate(SNAPSHOT), before);
    assert.equal(await page.locator('#world .replay-tile').count(), 0);
    await button.click();
    await page.locator('#tlStep').waitFor();
    await page.waitForFunction(() => !document.getElementById('tlStep'));
    assert.deepEqual(await page.evaluate(SNAPSHOT), before);
    assert.equal(await button.isVisible(), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
