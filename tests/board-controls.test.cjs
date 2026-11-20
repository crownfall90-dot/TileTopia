'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const games = require('./golden/games.json');
const {loadPlaywright, openGame, instrumentedCopy} = require('./golden/harness.cjs');

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
