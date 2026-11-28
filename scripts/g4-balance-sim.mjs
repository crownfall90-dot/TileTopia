import {deckList} from '../src/engine/tiles.js';
import {key, allMoves, groupsOf, component, gid} from '../src/engine/board.js';
import {completedAround, settle, doneMine} from '../src/engine/scoring.js';
import {levelPick, figurePick} from '../src/engine/bots.js';
import {QUESTS, dailyQuests, rerollQuest} from '../src/state/progress.js';

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function runMatch(deckSize, meeplesCount, nPlayers, seed, p0Level = 'normal', p0Persona = 'balanced') {
  const rnd = makeRng(seed);
  const mode = deckSize <= 30 ? 'fast' : deckSize >= 100 ? 'epic' : 'classic';
  const rules = {mode, rivers: true, deck: deckSize, meeples: meeplesCount, tie: 'all'};
  const d = deckList(rules);
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
    persona: i === 0 ? p0Persona : ['builder', 'roadman', 'monk', 'balanced'][i % 4],
    stats: {c: 0, r: 0, f: 0, tiles: 0, figs: 0, bigc: 0, longr: 0, midPts: 0, finalPts: 0, helpPts: 0}
  }));
  const meeples = [];
  let turn = 0;

  while (deck.length > 0) {
    const type = deck.pop();
    if (!allMoves(tiles, type).length) continue;
    const p = turn;
    const m = levelPick(tiles, meeples, type, p, nPlayers, rnd, players[p].level, players[p].persona);
    if (!m) continue;
    const t = {x: m.x, y: m.y, type, r: m.r, seed: 1, by: p};
    tiles.set(key(t.x, t.y), t);
    players[p].stats.tiles++;

    const mine = players[p].meeples > 0 ? doneMine(tiles, meeples, t, p) : [];
    const skip = new Set(mine.flatMap(x => [...x.c.ids]));
    const resolve = (c, final) => {
      const {win, each, helped} = settle(tiles, c, final, nPlayers, rules.tie, p);
      if (win.length) {
        win.forEach(i => {
          players[i].score += each;
          if (!final) {
            players[i].stats[c.kind]++;
            players[i].stats.midPts += each;
            if (c.kind === 'c' && c.tiles.length >= 5) players[i].stats.bigc++;
            if (c.kind === 'r' && c.tiles.length >= 4) players[i].stats.longr++;
          } else {
            players[i].stats.finalPts += each;
          }
        });
        if (helped) {
          players[p].score += 1;
          players[p].stats.helpPts += 1;
        }
      }
      for (const mp of [...c.meeples]) {
        const idx = meeples.findIndex(x => x.gid === mp.gid);
        if (idx >= 0) { meeples.splice(idx, 1); players[mp.p].meeples++; }
      }
    };

    for (const c of completedAround(tiles, meeples, t)) {
      if (![...c.ids].some(id => skip.has(id))) resolve(c, false);
    }

    if (players[p].meeples > 0) {
      const baseOpts = groupsOf(t).filter(g => component(tiles, meeples, t, g).meeples.length === 0).map(g => ({t, g}));
      const opts = baseOpts.concat(mine.map(x => ({t: x.t, g: x.g, done: true})));
      const ch = figurePick(tiles, meeples, opts, players[p].meeples, rnd, players[p].level, players[p].persona);
      if (ch) {
        meeples.push({gid: gid(ch.t, ch.g), p, t: ch.t, g: ch.g});
        players[p].meeples--;
        players[p].stats.figs++;
      }
    }
    for (const x of mine) resolve(component(tiles, meeples, x.t, x.g), false);
    turn = (turn + 1) % nPlayers;
  }

  const seen = new Set();
  for (const mp of [...meeples]) {
    if (!meeples.includes(mp) || seen.has(mp.gid)) continue;
    const c = component(tiles, meeples, mp.t, mp.g);
    c.ids.forEach(id => seen.add(id));
    const {win, each} = settle(tiles, c, true, nPlayers, rules.tie, 0);
    win.forEach(i => {
      players[i].score += each;
      players[i].stats.finalPts += each;
    });
  }
  return players;
}

const pct = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(arr.length * q))];
const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

const matrix = [
  {label: '30-card 2p (normal vs normal)', deck: 30, m: 4, np: 2, games: 60, lv: 'normal', baseSeed: 10000},
  {label: '30-card 2p (hard vs normal)',   deck: 30, m: 4, np: 2, games: 60, lv: 'hard',   baseSeed: 20000},
  {label: '30-card 4p (normal)',           deck: 30, m: 4, np: 4, games: 40, lv: 'normal', baseSeed: 30000},
  {label: '50-card 2p (normal vs normal)', deck: 50, m: 6, np: 2, games: 60, lv: 'normal', baseSeed: 40000},
  {label: '50-card 4p (normal)',           deck: 50, m: 6, np: 4, games: 40, lv: 'normal', baseSeed: 50000},
  {label: '100-card 2p (normal vs normal)',deck: 100, m: 8, np: 2, games: 40, lv: 'normal', baseSeed: 60000},
  {label: '100-card 4p (normal)',          deck: 100, m: 8, np: 4, games: 40, lv: 'normal', baseSeed: 70000},
];

for (const cfg of matrix) {
  const p0s = [];
  for (let i = 0; i < cfg.games; i++) {
    const ps = runMatch(cfg.deck, cfg.m, cfg.np, cfg.baseSeed + i * 97, cfg.lv);
    p0s.push(ps[0]);
  }
  const sc = p0s.map(x => x.score).sort((a, b) => a - b);
  const rate = fn => Math.round(100 * p0s.filter(fn).length / p0s.length) + '%';
  const mean = k => (p0s.reduce((s, p) => s + p.stats[k], 0) / p0s.length).toFixed(2);
  console.log(`${cfg.label} [N=${cfg.games}, seed=${cfg.baseSeed}+i*97]: min=${sc[0]} p25=${pct(sc,.25)} med=${pct(sc,.5)} avg=${avg(sc)} p75=${pct(sc,.75)} max=${sc[sc.length-1]} | >=20:${rate(p=>p.score>=20)} >=25:${rate(p=>p.score>=25)} >=30:${rate(p=>p.score>=30)} >=40:${rate(p=>p.score>=40)} | midPts=${mean('midPts')} finalPts=${mean('finalPts')} c=${mean('c')} r=${mean('r')} f=${mean('f')}`);
}

// Measure f2 ("Окружите 2 монастыря") over a typical day of 30-card games + free reroll impact
console.log('\n--- f2 daily completion in 30-card 2p (normal / monk-focused) + reroll ---');
for (const persona of ['balanced', 'monk']) {
  for (const gamesPerDay of [2, 3, 5]) {
    const days = 100;
    let f1Pass = 0, f2Pass = 0;
    for (let d = 0; d < days; d++) {
      let totalF = 0;
      for (let g = 0; g < gamesPerDay; g++) {
        const ps = runMatch(30, 4, 2, 80000 + d * 100 + g * 13, 'normal', persona);
        totalF += ps[0].stats.f;
      }
      if (totalF >= 1) f1Pass++;
      if (totalF >= 2) f2Pass++;
    }
    console.log(`30-card ${gamesPerDay} games/day (${persona}, N=${days} days): f>=1: ${f1Pass}%, f>=2 (f2): ${f2Pass}%`);
  }
}

// Reroll availability when f2 rolls in daily quests over 365 days
let f2Days = 0, rerollToNonF2 = 0;
for (let i = 0; i < 365; i++) {
  const day = new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10);
  const qs = dailyQuests(day);
  if (qs.includes('f2')) {
    f2Days++;
    const rep = rerollQuest(day, qs, 'f2');
    if (rep && rep !== 'f2') rerollToNonF2++;
  }
}
console.log(`Daily quest roll (365d): f2 appears on ${f2Days}/365 days (${Math.round(100*f2Days/365)}%); free reroll replaces f2 cleanly on ${rerollToNonF2}/${f2Days} days (${Math.round(100*rerollToNonF2/f2Days)}%).`);
