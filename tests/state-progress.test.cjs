// src/state/progress.js: levels and daily quests.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('progress: levels and achievements', async () => {
  const P = await import('../src/state/progress.js');
  const prog = {xp: 0, lvl: 1};
  assert.equal(P.addXp(prog, 500), 3);
  assert.deepEqual(prog, {xp: 50, lvl: 4});
  const earned = P.ACH.filter(a => a.ok({wins: 12, games: 30, c: 0, r: 0, f: 0, best: 55, owins: 0}, 5)).map(a => a.id);
  assert.deepEqual(earned, ['w1', 'w10', 'g25', 'b50', 'l5']);
});

test('progress: three different daily quests, every quest comes up evenly over a year', async () => {
  const P = await import('../src/state/progress.js');
  assert.deepEqual(P.dailyQuests('2026-10-30'), P.dailyQuests('2026-10-30'), 'the same on every phone');
  const seen = {}, d0 = Date.UTC(2026, 0, 1);
  for (let i = 0; i < 365; i++) {
    const q = P.dailyQuests(new Date(d0 + i * 864e5).toISOString().slice(0, 10));
    assert.equal(new Set(q).size, 3);
    q.forEach(id => { seen[id] = (seen[id] || 0) + 1; });
  }
  // 3 of N a day: about 365·3/N days each, none starved or stuck (the old pick gave «3 cities» all 365 days).
  const fair = 365 * 3 / P.QUESTS.length;
  for (const id of P.QUESTS.map(q => q.id)) assert.ok(seen[id] > fair * .5 && seen[id] < fair * 1.6, `${id}: ${seen[id]} days`);
});

test('progress: one free swap picks a quest not on today\'s list', async () => {
  const P = await import('../src/state/progress.js');
  const ids = P.dailyQuests('2026-11-06');
  const next = P.rerollQuest('2026-11-06', ids, ids[0]);
  assert.ok(next && !ids.includes(next) && P.QUESTS.some(q => q.id === next));
  assert.equal(P.rerollQuest('2026-11-06', ids, ids[0]), next, 'the same on every phone');
});

test('progress: tiered achievements read the new stats; weekly goals are three core ones and one extra', async () => {
  const P = await import('../src/state/progress.js');
  const st = P.normalizeStats({});
  for (const k of ['tiles', 'figs', 'bigc', 'longr', 'maxRoad', 'hardwin', 'duelwin', 'say', 'streak', 'bestStreak']) assert.equal(st[k], 0, k);
  const ws3 = P.ACH.find(a => a.id === 'ws3');
  assert.ok(ws3.ok({bestStreak: 3}) && !ws3.ok({bestStreak: 2}));
  assert.ok(P.ACH.every(a => !a.tier || ['bronze', 'silver', 'gold'].includes(a.tier)));
  assert.equal(new Set(P.ACH.map(a => a.id)).size, P.ACH.length, 'ids are unique');
  const wk = P.weeklyQuests('2026-W45');
  assert.equal(wk.length, 4);
  assert.deepEqual(wk.slice(0, 3), P.WEEKLY_QUESTS);
  assert.ok(P.WEEKLY_EXTRA.includes(wk[3]));
});

test('progress: quest thresholds adjusted for fast 30-card mode', async () => {
  const P = await import('../src/state/progress.js');
  const s30 = P.QUESTS.find(q => q.id === 's30');
  assert.ok(s30, 's30 quest exists');
  assert.ok(s30.t.includes('20 в быстрой'), 's30 mentions 20 points for fast mode');
});

test('progress: first win of the day and win streak pay extra gold', async () => {
  const P = await import('../src/state/progress.js');
  const base = {win: true, laid: 8, today: '2026-11-06', fw: ''};
  assert.deepEqual(P.winBonus({...base, streak: 1}), {gold: 30, first: 30, streakGold: 0});
  assert.deepEqual(P.winBonus({...base, streak: 3, fw: '2026-11-06'}), {gold: 20, first: 0, streakGold: 20});
  assert.equal(P.winBonus({...base, streak: 12, fw: '2026-11-06'}).streakGold, P.STREAK_GOLD_MAX, 'capped');
  assert.equal(P.winBonus({...base, win: false, streak: 0}).gold, 0, 'a loss pays nothing');
  assert.equal(P.winBonus({...base, laid: 3}).gold, 0, 'quitting early is not farming');
});
