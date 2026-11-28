'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('G-4/S-5: fixed-seed 30/50/100-card and 2p/4p distributions validate s30=20, s40=25, and f2 behavior', async () => {
  const {deckList} = await import('../src/engine/tiles.js');
  const {key, allMoves, groupsOf, component, gid} = await import('../src/engine/board.js');
  const {completedAround, settle, doneMine} = await import('../src/engine/scoring.js');
  const {levelPick, figurePick} = await import('../src/engine/bots.js');
  const {QUESTS, dailyQuests, rerollQuest, matchScoreQuests} = await import('../src/state/progress.js');

  function runMatch(deckSize, meeplesCount, nPlayers, seed, p0Level = 'normal') {
    let s = seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const mode = deckSize <= 30 ? 'fast' : deckSize >= 100 ? 'epic' : 'classic';
    const d = deckList({mode, rivers: true, deck: deckSize, meeples: meeplesCount, tie: 'all'});
    for (let i = d.length - 1; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      [d[i], d[j]] = [d[j], d[i]];
    }
    const deck = d.slice(0, deckSize);
    const tiles = new Map([[key(0, 0), {x: 0, y: 0, type: deck.pop(), r: 0, seed: 1, by: 0}]]);
    const players = Array.from({length: nPlayers}, (_, i) => ({
      score: 0,
      meeples: meeplesCount,
      level: i === 0 ? p0Level : 'normal',
      fDone: 0,
    }));
    const meeples = [];
    let turn = 0;

    while (deck.length > 0) {
      const type = deck.pop();
      if (!allMoves(tiles, type).length) continue;
      const p = turn;
      const m = levelPick(tiles, meeples, type, p, nPlayers, rnd, players[p].level);
      if (!m) continue;
      const t = {x: m.x, y: m.y, type, r: m.r, seed: 1, by: p};
      tiles.set(key(t.x, t.y), t);

      const mine = players[p].meeples > 0 ? doneMine(tiles, meeples, t, p) : [];
      const skip = new Set(mine.flatMap(x => [...x.c.ids]));
      const resolve = (c, final) => {
        const {win, each, helped} = settle(tiles, c, final, nPlayers, 'all', p);
        win.forEach(i => {
          players[i].score += each;
          if (!final && c.kind === 'f') players[i].fDone++;
        });
        if (helped) players[p].score += 1;
        for (const mp of [...c.meeples]) {
          const idx = meeples.findIndex(x => x.gid === mp.gid);
          if (idx >= 0) { meeples.splice(idx, 1); players[mp.p].meeples++; }
        }
      };
      for (const c of completedAround(tiles, meeples, t)) {
        if (![...c.ids].some(id => skip.has(id))) resolve(c, false);
      }
      if (players[p].meeples > 0) {
        const opts = groupsOf(t).filter(g => component(tiles, meeples, t, g).meeples.length === 0).map(g => ({t, g})).concat(mine.map(x => ({t: x.t, g: x.g, done: true})));
        const ch = figurePick(tiles, meeples, opts, players[p].meeples, rnd, players[p].level);
        if (ch) { meeples.push({gid: gid(ch.t, ch.g), p, t: ch.t, g: ch.g}); players[p].meeples--; }
      }
      for (const x of mine) resolve(component(tiles, meeples, x.t, x.g), false);
      turn = (turn + 1) % nPlayers;
    }
    const seen = new Set();
    for (const mp of [...meeples]) {
      if (!meeples.includes(mp) || seen.has(mp.gid)) continue;
      const c = component(tiles, meeples, mp.t, mp.g);
      c.ids.forEach(id => seen.add(id));
      const {win, each} = settle(tiles, c, true, nPlayers, 'all', 0);
      win.forEach(i => { players[i].score += each; });
    }
    return players;
  }

  // Sample sizes across 30/50/100 cards and 2/4 players with fixed seeds
  const fast2p = Array.from({length: 20}, (_, i) => runMatch(30, 4, 2, 20000 + i * 97, 'hard')[0]);
  const fast4p = Array.from({length: 12}, (_, i) => runMatch(30, 4, 4, 30000 + i * 97, 'normal')[0]);
  const classic2p = Array.from({length: 15}, (_, i) => runMatch(50, 6, 2, 40000 + i * 97, 'normal')[0]);
  const classic4p = Array.from({length: 12}, (_, i) => runMatch(50, 6, 4, 50000 + i * 97, 'normal')[0]);
  const epic2p = Array.from({length: 10}, (_, i) => runMatch(100, 8, 2, 60000 + i * 97, 'normal')[0]);
  const epic4p = Array.from({length: 10}, (_, i) => runMatch(100, 8, 4, 70000 + i * 97, 'normal')[0]);

  assert.ok(fast2p.filter(p => p.score >= 20).length >= 4, 'fast 2p reaches s30=20 reliably');
  assert.ok(fast2p.filter(p => p.score >= 25).length >= 2, 'fast 2p reaches s40=25');
  assert.equal(fast2p.filter(p => p.score >= 40).length, 0, 'fast 2p never reached old s40=40 in 20-match hard sample');
  assert.ok(fast4p.every(p => p.score >= 0 && p.score <= 30), 'fast 4p scores stay compact');
  assert.ok(classic2p.filter(p => p.score >= 30).length >= 6, 'classic 2p reaches s30=30');
  assert.ok(classic4p.filter(p => p.score >= 20).length >= 4, 'classic 4p reaches >=20');
  assert.ok(epic2p.filter(p => p.score >= 40).length >= 8, 'epic 2p reaches s40=40');
  assert.ok(epic4p.filter(p => p.score >= 30).length >= 6, 'epic 4p reaches s30=30');

  // Verify matchScoreQuests uses actual deckSize (30 vs 50/100) and matches QUESTS labels
  assert.deepEqual(matchScoreQuests(25, 30), {s30: 1, s40: 1});
  assert.deepEqual(matchScoreQuests(24, 30), {s30: 1, s40: 0});
  assert.deepEqual(matchScoreQuests(25, 50), {s30: 0, s40: 0});
  assert.deepEqual(matchScoreQuests(40, 50), {s30: 1, s40: 1});

  const s40 = QUESTS.find(q => q.id === 's40');
  assert.ok(s40 && s40.t.includes('25 в быстрой'), 's40 quest describes 25 threshold for fast mode');

  const psSrc = fs.readFileSync(path.join(ROOT, 'src/app/runtime/progress-state.js'), 'utf8');
  assert.match(psSrc, /matchScoreQuests\(score,\s*deckMax\)/, 'progress-state uses matchScoreQuests with deckMax');

  // Verify free daily reroll always offers an escape when f2 rolls
  const qs = dailyQuests('2026-11-28');
  const rep = rerollQuest('2026-11-28', [...new Set([...qs, 'f2'])], 'f2');
  assert.ok(rep && rep !== 'f2', 'free daily reroll replaces f2 cleanly');
});

test('p50 (pts): counts mid-game, final incomplete, and +1 respect once; skips replay and opponent-only points', async () => {
  const {featureProgressDelta} = await import('../src/state/progress.js');

  // 1. Normal completion: mid-game win + final incomplete win, each counted once
  const seen = new Set();
  const mid = featureProgressDelta({
    kind: 'c', tilesCount: 5, each: 10, final: false, win: [0], helped: false, placer: 0, meIdx: 0,
    isFast: false, counted: true, seenIds: seen, featureKey: 'mid:0,0|c0123'
  });
  assert.deepEqual(mid, {c: 1, cityTiles: 5, bigc: 1, pts: 10});

  const fin = featureProgressDelta({
    kind: 'c', tilesCount: 3, each: 3, final: true, win: [0], helped: false, placer: 0, meIdx: 0,
    isFast: false, counted: true, seenIds: seen, featureKey: 'final:1,0|c0'
  });
  assert.deepEqual(fin, {pts: 3}, 'final incomplete feature adds pts only, not completed count');

  // 2. Restore / replay / duplicate event guard
  const replayed = featureProgressDelta({
    kind: 'c', tilesCount: 5, each: 10, final: false, win: [0], helped: false, placer: 0, meIdx: 0,
    isFast: true, counted: true, seenIds: new Set(), featureKey: 'mid:0,0|c0123'
  });
  assert.equal(replayed, null, 'replay (fast mode) credits 0 progress');

  const duplicate = featureProgressDelta({
    kind: 'c', tilesCount: 5, each: 10, final: false, win: [0], helped: false, placer: 0, meIdx: 0,
    isFast: false, counted: true, seenIds: seen, featureKey: 'mid:0,0|c0123'
  });
  assert.equal(duplicate, null, 'duplicate settlement of same featureKey credits 0');

  // 3. Opponent-only points and +1 respect
  const oppOnly = featureProgressDelta({
    kind: 'r', tilesCount: 4, each: 4, final: false, win: [1], helped: false, placer: 1, meIdx: 0,
    isFast: false, counted: true, seenIds: seen, featureKey: 'mid:2,0|r13'
  });
  assert.equal(oppOnly, null, 'opponent-only scoring gives 0 pts to me');

  const helpedOther = featureProgressDelta({
    kind: 'c', tilesCount: 4, each: 8, final: false, win: [1], helped: true, placer: 0, meIdx: 0,
    isFast: false, counted: true, seenIds: seen, featureKey: 'mid:3,0|c01'
  });
  assert.deepEqual(helpedOther, {pts: 1}, 'helping opponent finish feature adds +1 respect pt once');

  const helpedDuplicate = featureProgressDelta({
    kind: 'c', tilesCount: 4, each: 8, final: false, win: [1], helped: true, placer: 0, meIdx: 0,
    isFast: false, counted: true, seenIds: seen, featureKey: 'mid:3,0|c01'
  });
  assert.equal(helpedDuplicate, null, '+1 respect cannot double-count on same featureKey');

  const turnsSrc = fs.readFileSync(path.join(ROOT, 'src/app/runtime/turns.js'), 'utf8');
  assert.match(turnsSrc, /featureProgressDelta\(/, 'turns.js delegates resolveFeature progress to featureProgressDelta');
});
