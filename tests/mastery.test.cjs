// Tests for R-11 Mastery stats
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadPlaywright, instrumentedCopy, openGame} = require('./golden/harness.cjs');
const pw = loadPlaywright();

test('behavioral: progress UI renders mastery with proper DOM elements (R-11)', async () => {
  const {renderMasteryGrid} = await import('../src/ui/progress.js');

  const masteryHtml = renderMasteryGrid({
    bots: {games: 10, wins: 8, best: 70}
  });
  assert.ok(masteryHtml.includes('mgrid'));
  assert.ok(masteryHtml.includes('Боты'));
  assert.ok(masteryHtml.includes('80% (8/10) · рек. 70'));
  assert.ok(!masteryHtml.includes('Дуэль'), 'no duel tile');
});

test('progress: normalizeStats and recordGameMode (R-11)', async () => {
  const P = await import('../src/state/progress.js');
  
  // Normalizing empty / legacy stats
  const norm = P.normalizeStats({games: 5, wins: 3, best: 42});
  assert.equal(norm.games, 5);
  assert.equal(norm.wins, 3);
  assert.equal(norm.best, 42);
  assert.equal(norm.maxCity, 0);
  assert.ok(norm.byMode.bots);
  assert.ok(norm.byMode.friends);
  assert.ok(norm.byMode.online);

  // Record games by mode
  P.recordGameMode(norm, 'bots', true, 50);
  assert.equal(norm.byMode.bots.games, 1);
  assert.equal(norm.byMode.bots.wins, 1);
  assert.equal(norm.byMode.bots.best, 50);

  P.recordGameMode(norm, 'bots', false, 30);
  assert.equal(norm.byMode.bots.games, 2);
  assert.equal(norm.byMode.bots.wins, 1);
  assert.equal(norm.byMode.bots.best, 50);

  P.recordGameMode(norm, 'online', true, 65);
  assert.equal(norm.byMode.online.games, 1);
  assert.equal(norm.byMode.online.wins, 1);
  assert.equal(norm.byMode.online.best, 65);

  P.recordGameMode(norm, 'friends', true, 48);
  assert.equal(norm.byMode.friends.games, 1);
  assert.equal(norm.byMode.friends.wins, 1);
  assert.equal(norm.byMode.friends.best, 48);
});
