// "Classic 2.0": the same game on six-sided tiles. A tile's six sides join six neighbours, so a town or a road can turn
// in more ways and a monastery is surrounded by six tiles. Same API as board.js + scoring.js (the game switches between
// the two by the rules' mode), so the game loop, bots, saves and online moves work unchanged.
//
// Coordinates: flat-top hexes in axial coordinates (x = q, y = r). Sides clockwise from the top:
// 0 N, 1 NE, 2 SE, 3 S, 4 SW, 5 NW. A tile turned r times has its type's side (d - r) facing d.
// On the table a tile's centre is at (x * √3/2, y + x/2) tile heights (cellXY).
// Changing anything here changes every Classic 2.0 game.

export const N = 6;
export const DX = [0, 1, 1, 0, -1, -1], DY = [-1, -1, 0, 1, 1, 0];
/** Unit vectors from a tile's centre to the middle of each side, on screen (y down). */
export const V = [[0, -1], [.866, -.5], [.866, .5], [0, 1], [-.866, .5], [-.866, -.5]];
export const ARROW = ['↑', '↗', '↘', '↓', '↙', '↖'];
export const key = (x, y) => x + ',' + y;
export const cellXY = (x, y) => [x * Math.sqrt(3) / 2, y + x / 2];
/** Width of a tile (corner to corner) in tile heights (side to side). */
export const WIDTH = 2 / Math.sqrt(3);

// Sides: c town, r road, w river, f field.
export const TYPES = {
  hC1: {e: 'cfffff', n: 6, name: 'Край города'},
  hC1r: {e: 'cfrfrf', n: 4, name: 'Город и дорога'},
  hC1t: {e: 'cffrff', n: 2, name: 'Город и тупик'},
  hC2: {e: 'ccffff', n: 4, name: 'Угол города'},
  hC2s: {e: 'cfcfff', n: 2, name: 'Город за поворотом'},
  hC2o: {e: 'cffcff', n: 2, name: 'Городская улица'},
  hC2r: {e: 'ccfrfr', n: 3, name: 'Город с дорогой'},
  hC3: {e: 'cccfff', n: 3, name: 'Большой город'},
  hC3r: {e: 'cccfrf', n: 2, name: 'Город с воротами'},
  hC4: {e: 'ccccff', n: 2, name: 'Крепкий город'},
  hC5: {e: 'cccccf', n: 1, name: 'Почти столица'},
  hC6: {e: 'cccccc', n: 1, name: 'Столица'},
  hRS: {e: 'rffrff', n: 6, name: 'Прямая дорога'},
  hRB: {e: 'rfrfff', n: 6, name: 'Изгиб дороги'},
  hRT: {e: 'rrffff', n: 2, name: 'Крутой поворот'},
  hR3: {e: 'rfrfrf', n: 3, name: 'Развилка'},
  hR4: {e: 'rrfrrf', n: 1, name: 'Перекрёсток'},
  hRE: {e: 'rfffff', n: 2, end: 'boulders', name: 'Тупик у валунов'},
  hF: {e: 'ffffff', n: 4, fort: true, name: 'Монастырь'},
  hFR: {e: 'fffrff', n: 3, fort: true, name: 'Монастырь у дороги'},
  hG: {e: 'ffffff', n: 2, rocks: true, name: 'Луг'},
  hWS: {e: 'wffwff', n: 3, name: 'Река'},
  hWB: {e: 'wfwfff', n: 3, name: 'Излучина реки'},
  hWBr: {e: 'wrfwrf', n: 2, name: 'Мост через реку'},
  hWE: {e: 'wfffff', n: 1, name: 'Исток реки'},
  hWC: {e: 'wfcwff', n: 1, name: 'Город у реки'},
};
export const isHex = type => !!TYPES[type];

/** The cards of one stack for these rules, in TYPES order (shuffled by the caller). */
export function deckList(rules) {
  const d = [];
  for (const id in TYPES) {
    const t = TYPES[id];
    if (!rules.rivers && t.e.includes('w')) continue;
    for (let i = 0; i < t.n; i++) d.push(id);
  }
  return d;
}

const at = (tiles, x, y) => tiles.get(key(x, y));
export const opp = d => (d + 3) % 6;
/** The side of a placed tile facing direction d. */
export const edgeAt = (t, d) => TYPES[t.type].e[(d - t.r + 6) % 6];

export function fits(tiles, type, r, x, y) {
  if (at(tiles, x, y)) return false;
  let n = 0;
  for (let d = 0; d < 6; d++) {
    const nb = at(tiles, x + DX[d], y + DY[d]); if (!nb) continue; n++;
    if (edgeAt(nb, opp(d)) !== TYPES[type].e[(d - r + 6) % 6]) return false;
  }
  return n > 0;
}
export function emptyCells(tiles) {
  const m = new Map();
  for (const t of tiles.values()) for (let d = 0; d < 6; d++) { const x = t.x + DX[d], y = t.y + DY[d]; if (!at(tiles, x, y)) m.set(key(x, y), {x, y}); }
  return [...m.values()];
}
/** Turns of a card that fit; turns giving the same picture (a six-way symmetric card) count once. */
export function legalRots(tiles, type, x, y) {
  const e = TYPES[type].e, seen = new Set(), out = [];
  for (let r = 0; r < 6; r++) {
    const look = [0, 1, 2, 3, 4, 5].map(d => e[(d - r + 6) % 6]).join('');
    if (seen.has(look)) continue; seen.add(look);
    if (fits(tiles, type, r, x, y)) out.push(r);
  }
  return out;
}
export function allMoves(tiles, type) { const out = []; for (const c of emptyCells(tiles)) for (const r of legalRots(tiles, type, c.x, c.y)) out.push({x: c.x, y: c.y, r}); return out; }
export function hasPlacement(tiles, type) { for (const c of emptyCells(tiles)) if (legalRots(tiles, type, c.x, c.y).length) return true; return false; }
/** Occupied neighbours of a cell. */
export const neighbours = (tiles, x, y) => { let n = 0; for (let d = 0; d < 6; d++) if (at(tiles, x + DX[d], y + DY[d])) n++; return n; };

/** Features of one tile: all its town sides are one town; two road sides are one road, one or three and more are
 *  separate roads ending in the middle (a crossroads or a dead end); a monastery. Rivers are not features. */
export function groupsOf(t) {
  const by = {c: [], r: []};
  for (let d = 0; d < 6; d++) { const k = edgeAt(t, d); if (by[k]) by[k].push(d); }
  const gs = [];
  if (by.c.length) gs.push({kind: 'c', edges: by.c});
  if (by.r.length === 2) gs.push({kind: 'r', edges: by.r}); else by.r.forEach(d => gs.push({kind: 'r', edges: [d]}));
  if (TYPES[t.type].fort) gs.push({kind: 'f', edges: []});
  return gs;
}
export const gid = (t, g) => key(t.x, t.y) + '|' + g.kind + g.edges.join('');
/** A monastery and its six neighbours: complete when all seven cells are taken. */
export function fortComp(tiles, meeples, t) {
  const ts = [t];
  for (let d = 0; d < 6; d++) { const n = at(tiles, t.x + DX[d], t.y + DY[d]); if (n) ts.push(n); }
  const id = key(t.x, t.y) + '|f';
  return {kind: 'f', tiles: ts, complete: ts.length === 7, ids: new Set([id]), meeples: meeples.filter(m => m.gid === id)};
}
export function component(tiles, meeples, t, g) {
  if (g.kind === 'f') return fortComp(tiles, meeples, t);
  const ids = new Set(), ts = new Set(), st = [[t, g]];
  let open = false;
  while (st.length) {
    const [a, ag] = st.pop(), id = gid(a, ag);
    if (ids.has(id)) continue;
    ids.add(id); ts.add(a);
    for (const d of ag.edges) {
      const nb = at(tiles, a.x + DX[d], a.y + DY[d]);
      if (!nb) { open = true; continue; }
      const ng = groupsOf(nb).find(q => q.kind === ag.kind && q.edges.includes(opp(d)));
      if (ng) st.push([nb, ng]);
    }
  }
  return {kind: g.kind, tiles: [...ts], complete: !open, ids, meeples: meeples.filter(m => ids.has(m.gid))};
}
export const claimable = (tiles, meeples, t, p = null, v2 = false) => groupsOf(t).filter(g => {
  const c = component(tiles, meeples, t, g);
  if (c.complete) return false;
  if (c.meeples.length === 0) return true;
  return !!v2 && p != null && c.meeples.every(m => m.p === p) && !meeples.some(m => m.gid === gid(t, g));
});
export const claimableAll = (tiles, meeples, p = null, v2 = false) => { const r = []; for (const t of tiles.values()) for (const g of claimable(tiles, meeples, t, p, v2)) r.push({t, g}); return r; };

/* ---- scoring ---- */
export const roadPoints = (tiles, c) => c.tiles.length;
/** Towns 2 per tile (1 when unfinished at the end), a surrounded monastery 9 (1 per tile at the end), roads 1 per tile. */
export const featurePoints = (tiles, c, final) =>
  c.kind === 'c' ? c.tiles.length * (final ? 1 : 2) : c.kind === 'f' ? (final ? c.tiles.length : 9) : roadPoints(tiles, c);
/** Who scores a feature: as in the classic game (scoring.js settle). */
export function settle(tiles, c, final, players, tie, placer, v2 = false) {
  const pts = featurePoints(tiles, c, final);
  const cnt = Array.from({length: players}, () => 0); c.meeples.forEach(m => cnt[m.p]++);
  const mx = Math.max(...cnt);
  if (!mx) return {pts, win: [], each: 0, helped: false};
  let win = cnt.map((n, i) => n === mx ? i : -1).filter(i => i >= 0);
  if (v2 && win.length > 1) {
    const cards = win.map(i => c.tiles.filter(x => x.by === i).length), best = Math.max(...cards);
    win = win.filter((_, k) => cards[k] === best);
  }
  const each = win.length > 1 && tie === 'split' ? Math.floor(pts / win.length) : pts;
  const helped = !final && placer != null && !win.includes(placer);
  return {pts, win, each, helped};
}
/** The tile itself and its six neighbours: where a monastery finished by tile t can be. */
const around = (tiles, t) => [t, ...[0, 1, 2, 3, 4, 5].map(d => at(tiles, t.x + DX[d], t.y + DY[d])).filter(Boolean)];
export function completedAround(tiles, meeples, t) {
  const evs = [], seen = new Set();
  const consider = (tt, g) => { if (seen.has(gid(tt, g))) return; const c = component(tiles, meeples, tt, g); c.ids.forEach(i => seen.add(i)); if (c.complete) evs.push(c); };
  groupsOf(t).forEach(g => g.kind !== 'f' && consider(t, g));
  for (const n of around(tiles, t)) if (TYPES[n.type].fort) consider(n, {kind: 'f', edges: []});
  return evs;
}
export function doneMine(tiles, meeples, t, p) {
  const out = [], seen = new Set();
  const consider = (tt, g) => {
    if (seen.has(gid(tt, g))) return;
    const c = component(tiles, meeples, tt, g); c.ids.forEach(i => seen.add(i));
    if (c.complete && !c.meeples.length && c.tiles.every(x => x.by === p || x.by == null)) out.push({t: tt, g, c});
  };
  groupsOf(t).forEach(g => g.kind !== 'f' && consider(t, g));
  for (const n of around(tiles, t)) { const g = TYPES[n.type].fort && groupsOf(n).find(x => x.kind === 'f'); if (g) consider(n, g); }
  return out;
}
/** Open sides of a town or road, empty cells round a monastery (the coach's "still missing"). */
export function missing(tiles, c) {
  if (c.kind === 'f') return 7 - c.tiles.length;
  let open = 0;
  for (const t of c.tiles) for (const g of groupsOf(t)) if (c.ids.has(gid(t, g))) for (const d of g.edges) if (!at(tiles, t.x + DX[d], t.y + DY[d])) open++;
  return open;
}
