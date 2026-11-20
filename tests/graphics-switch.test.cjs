// Graphics changes affect the sides and effects of cards already on the table without restarting the game.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const games = require('./golden/games.json');
const {loadPlaywright, instrumentedCopy, openGame, SNAPSHOT, waitEnd} = require('./golden/harness.cjs');

const pw = loadPlaywright();

test('graphics switch: economy hides tile sides without changing the played game', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 120000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), null);
    await page.evaluate(g => { window.__pg.startGame(g.cfg, g.moves); window.__pg.show('game'); }, games[0]);
    await waitEnd(page, 60000);
    const look = () => page.evaluate(() => {
      const tiles = [...document.querySelectorAll('#world > .tile')];
      const shownSides = selector => tiles.flatMap(tile => [...tile.querySelectorAll(selector)])
        .filter(side => !side.hidden && getComputedStyle(side).display !== 'none').length;
      return {
        raisedSides: shownSides('.sd:is(.n, .e, .w)'),
        frontSides: shownSides('.sd.s'),
        faces: tiles.map(tile => tile.querySelector('.face').outerHTML),
      };
    });
    const pick = i => page.evaluate(i => document.querySelector(`#prefs [data-pref=gfx] button[data-i="${i}"]`).click(), i);
    const game = await page.evaluate(SNAPSHOT);
    await pick(0);
    const high = await look();
    assert.ok(high.raisedSides > 0, 'high graphics shows the exposed side walls');
    assert.ok(high.frontSides > 0, 'high graphics shows the front walls');
    await pick(1);
    const low = await look();
    assert.equal(low.raisedSides, 0, 'economy graphics hides the non-front side walls');
    assert.equal(low.frontSides, high.frontSides, 'front walls stay visible');
    assert.deepEqual(low.faces, high.faces, 'tile faces and their contents stay the same');
    await pick(0);
    const back = await look();
    assert.deepEqual(back, high, 'switching back restores the original table appearance');
    assert.deepEqual(await page.evaluate(SNAPSHOT), game, 'the game itself is untouched');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
