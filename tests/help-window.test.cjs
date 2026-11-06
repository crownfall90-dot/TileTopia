// "Points and rules" window in a game: opens from the header button, shows what each object is worth, switches to the
// rules and closes; it must work in any game without touching it.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const games = require('./golden/games.json');
const {loadPlaywright, instrumentedCopy, openGame, SNAPSHOT} = require('./golden/harness.cjs');

const pw = loadPlaywright();

test('help window: points per object and the rules, in a running game', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 60000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const {page, errors} = await openGame(browser, instrumentedCopy(), null);
    const cfg = JSON.parse(JSON.stringify(games[0].cfg)); cfg.seats[0] = {...cfg.seats[0], human: true}; cfg.noIntro = true;
    await page.evaluate(c => { window.__pg.startGame(c, []); window.__pg.show('game'); }, cfg);
    await page.waitForFunction(() => window.__pg.state().phase === 'place', null, {timeout: 20000});
    const before = await page.evaluate(SNAPSHOT);
    await page.click('#helpBtn');
    const text = () => page.textContent('#helpBox');
    let t = await text();
    for (const want of ['Город', 'Дорога', 'Монастырь', '2 очка за каждую карту города', '9 очков', 'Классика']) assert.ok(t.includes(want), 'points tab shows ' + want);
    await page.click('[data-ht=rules]');
    t = await text();
    for (const want of ['Цель', 'Ваш ход', 'Конец игры']) assert.ok(t.includes(want), 'rules tab shows ' + want);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => !!document.getElementById('helpBox')), false, 'Escape closes it');
    await page.click('#helpBtn'); await page.click('[data-hx]');
    assert.equal(await page.evaluate(() => !!document.getElementById('helpBox')), false, 'the button closes it');
    assert.deepEqual(await page.evaluate(SNAPSHOT), before, 'the game is untouched');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
