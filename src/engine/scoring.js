// Scoring: what a finished (or, at the end, unfinished) feature is worth and who gets it.
// Pure: the game shows the result (floating points, toasts, sounds) itself.
import {TYPES} from './tiles.js';
import {DX, DY, key, edgeAt, groupsOf, gid, component} from './board.js';

const at = (tiles, x, y) => tiles.get(key(x, y));

/** A road with a whole big bridge on it (two halves joined bridge to bridge): every other piece counts double,
 *  each bridge half 1. Otherwise 1 per piece. */
export function roadPoints(tiles, c) {
  const halves = c.tiles.filter(t => TYPES[t.type].bridge);
  const whole = halves.some(t => { const d = [0, 1, 2, 3].find(k => edgeAt(t, k) === 'b'), n = at(tiles, t.x + DX[d], t.y + DY[d]); return n && edgeAt(n, (d + 2) % 4) === 'b'; });
  return whole ? (c.tiles.length - halves.length) * 2 + halves.length : c.tiles.length;
}

/** Points of a feature: towns 2 per card (1 when unfinished at the end), forts 9 (1 per card at the end), roads as above. */
export const featurePoints = (tiles, c, final) =>
  c.kind === 'c' ? c.tiles.length * (final ? 1 : 2) : c.kind === 'f' ? (final ? c.tiles.length : 9) : roadPoints(tiles, c);

/**
 * Who scores a feature. Most figures wins; a tie gives everyone the points ('all') or splits them ('split').
 * Whoever finished somebody else's feature (placer not among the winners) gets 1 point of respect.
 * Returns {pts, win: [player indexes], each, helped}; win is empty when the feature has no figures.
 */
export function settle(tiles, c, final, players, tie, placer, v2 = false) {
  const pts = featurePoints(tiles, c, final);
  const cnt = Array.from({length: players}, () => 0); c.meeples.forEach(m => cnt[m.p]++);
  const mx = Math.max(...cnt);
  if (!mx) return {pts, win: [], each: 0, helped: false};
  let win = cnt.map((n, i) => n === mx ? i : -1).filter(i => i >= 0);
  // Rules v2: equal figures are decided by who laid more cards of the feature (the starting card is nobody's).
  if (v2 && win.length > 1) {
    const cards = win.map(i => c.tiles.filter(x => x.by === i).length), best = Math.max(...cards);
    win = win.filter((_, k) => cards[k] === best);
  }
  const each = win.length > 1 && tie === 'split' ? Math.floor(pts / win.length) : pts;
  const helped = !final && placer != null && !win.includes(placer);
  return {pts, win, each, helped};
}

/** Features finished by putting card t down: its towns and roads, and forts around it (the card's own included). */
export function completedAround(tiles, meeples, t) {
  const evs = [], seen = new Set();
  const consider = (tt, g) => { if (seen.has(gid(tt, g))) return; const c = component(tiles, meeples, tt, g); c.ids.forEach(i => seen.add(i)); if (c.complete) evs.push(c); };
  groupsOf(t).forEach(g => g.kind !== 'f' && consider(t, g));
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = at(tiles, t.x + dx, t.y + dy); if (n && TYPES[n.type].fort) consider(n, {kind: 'f', edges: []}); }
  return evs;
}

/** Features finished by card t that player p built entirely alone and nobody holds: p may put a free figure there.
 *  The starting card belongs to nobody (no `by`), so a road or town through it still counts as built alone. */
export function doneMine(tiles, meeples, t, p) {
  const out = [], seen = new Set();
  const consider = (tt, g) => {
    if (seen.has(gid(tt, g))) return;
    const c = component(tiles, meeples, tt, g); c.ids.forEach(i => seen.add(i));
    if (c.complete && !c.meeples.length && c.tiles.every(x => x.by === p || x.by == null)) out.push({t: tt, g, c});
  };
  groupsOf(t).forEach(g => g.kind !== 'f' && consider(t, g));
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = at(tiles, t.x + dx, t.y + dy); const g = n && TYPES[n.type].fort && groupsOf(n).find(x => x.kind === 'f'); if (g) consider(n, g); }
  return out;
}
/** Uncompleted or completed features touched by card t that player p placed/built and nobody holds.
 *  Allows a player to put a meeple on an uncompleted object they placed previously (e.g. an uncompleted monastery). */
export function touchingMine(tiles, meeples, t, p) {
  const out = [], seen = new Set();
  const consider = (tt, g) => {
    if (seen.has(gid(tt, g))) return;
    const c = component(tiles, meeples, tt, g); c.ids.forEach(i => seen.add(i));
    if (!c.meeples.length && (tt.by === p || c.tiles.some(x => x.by === p))) {
      out.push({t: tt, g, c, done: c.complete});
    }
  };
  // 1. Adjacent monasteries placed by player p or contributed to
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const n = at(tiles, t.x + dx, t.y + dy);
      const g = n && TYPES[n.type] && TYPES[n.type].fort && groupsOf(n).find(x => x.kind === 'f');
      if (g) consider(n, g);
    }
  }
  return out;
}
