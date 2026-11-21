// Tests for Task 4 (R-5, R-12, R-7, R-6, R-8): Reasons to return
'use strict';
const { gameSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RULES_PATH = path.join(__dirname, '..', 'docs', 'firebase-rules.json');

test('R-5: menu quest banner exists and is wired in game.html', () => {
  const code = gameSource();

  // Verify markup in #scr-menu
  assert.ok(code.includes('id="menuQuestBanner"'), 'menuQuestBanner button exists');
  assert.ok(code.includes('id="mqTitle"'), 'mqTitle text element exists');
  assert.ok(code.includes('id="mqSub"'), 'mqSub text element exists');

  // Verify rendering logic
  assert.ok(code.includes('function renderMenuQuestBanner()'), 'renderMenuQuestBanner function defined');
  assert.ok(code.includes('renderMenuQuestBanner();'), 'renderMenuQuestBanner called on menu profile update');

  // Verify click handler switches to progress rewards tab
  assert.ok(code.includes("ptab = 'rewards'; show('progress');") || code.includes("ptab = 'rewards'"), 'clicking banner sets ptab to rewards');
});

test('R-12: streak freeze preserves streak on 1 missed day per week', async () => {
  const P = await import('../src/state/progress.js');

  const curWeek = P.weekId(new Date('2026-11-01T12:00:00Z'));
  const todayStr = '2026-11-01';

  // Scenario 1: Yesterday was missed (last active 2026-10-30, diff = 2 days), freeze available
  const st1 = {n: 4, last: '2026-10-30', freezeWeek: ''};
  assert.equal(P.canFreezeStreak(st1, todayStr, curWeek), true, 'Freeze applies for 1 missed day');

  // Scenario 2: Freeze was already used in this calendar week
  const st2 = {n: 5, last: '2026-10-30', freezeWeek: curWeek};
  assert.equal(P.canFreezeStreak(st2, todayStr, curWeek), false, 'Freeze not allowed twice in same week');

  // Scenario 3: More than 1 day missed (last active 2026-10-29, diff = 3 days)
  const st3 = {n: 4, last: '2026-10-29', freezeWeek: ''};
  assert.equal(P.canFreezeStreak(st3, todayStr, curWeek), false, 'Freeze does not apply for 2+ missed days');

  // Scenario 4: Consecutive day login (diff = 1 day)
  const st4 = {n: 4, last: '2026-10-31', freezeWeek: ''};
  assert.equal(P.canFreezeStreak(st4, todayStr, curWeek), false, 'Normal daily login does not trigger freeze');
});

test('R-7: weekly quests and chest reward tracking', async () => {
  const P = await import('../src/state/progress.js');

  assert.ok(Array.isArray(P.WEEKLY_QUESTS), 'WEEKLY_QUESTS is defined');
  assert.equal(P.WEEKLY_QUESTS.length, 3, 'There are 3 weekly goals');

  const winGoal = P.WEEKLY_QUESTS.find(q => q.k === 'win');
  assert.ok(winGoal, 'Win goal exists');
  assert.equal(winGoal.n, 5, '5 wins goal');

  const gamesGoal = P.WEEKLY_QUESTS.find(q => q.k === 'games');
  assert.ok(gamesGoal, 'Games goal exists');
  assert.equal(gamesGoal.n, 10, '10 games goal');

  const citiesGoal = P.WEEKLY_QUESTS.find(q => q.k === 'c');
  assert.ok(citiesGoal, 'Cities goal exists');
  assert.equal(citiesGoal.n, 20, '20 cities goal');

  assert.equal(P.WEEKLY_CHEST_GOLD, 100, 'Weekly chest gives 100 gold');

  // Verify weekId format YYYY-Www
  const wid = P.weekId(new Date('2026-11-01'));
  assert.match(wid, /^\d{4}-W\d{2}$/, 'weekId matches YYYY-Www format');
});

test('R-8: rating friends scope filter and R-6 season tag', () => {
  const code = gameSource();

  // Verify friends scope tabs in renderTop
  assert.ok(code.includes('id="topScopeAll"'), 'topScopeAll button exists');
  assert.ok(code.includes('id="topScopeFriends"'), 'topScopeFriends button exists');
  assert.ok(code.includes("topScope === 'friends'"), 'friends filtering implemented in renderTop');

  // Verify season indicator
  assert.ok(code.includes('Лига · Сезон'), 'Season header shown in rating');

  // Verify docs/firebase-rules.json allows season field
  const rules = fs.readFileSync(RULES_PATH, 'utf8');
  assert.ok(rules.includes("!newData.hasChild('s')") && rules.includes("newData.child('s').isString()"), 'firebase rules validate season string');
});
