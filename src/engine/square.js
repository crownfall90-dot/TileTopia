// src/engine/square.js
// Shapes of the classic (four-sided) cards: where the roads, rivers, towns and the monastery run on a card, in the
// card's own frame (not turned). The same scheme as Classic 2.0 (src/engine/hex.js shapes), so one Blender generator
// renders both sets (scripts/gen-square-defs.mjs → tools/blender_generators/square_shapes.json) and the game paints
// the owner colours on exactly these shapes. Unit: the card's side = 1, origin in the middle, x right, y down.
// The rules stay in board.js / scoring.js; only the pictures come from here.
import {TYPES} from './tiles.js';

export const N = 4;
export const V = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // sides N E S W
export const GEO = {
  R: .5,                        // half the card's width
  road: .115, water: .146, bank: .21,
  hand: [0, .26, .3],           // how far a path runs straight in from a side, by the turn (90°, 180°)
  wind: 30,                     // a straight river bends into an S: its heading in the middle, degrees off straight
  wall: [0, .1, .16, .2],       // how far a town wall bulges toward the open sides, by the number of sides it closes
  plaza: .085, fort: [.22, .2], pond: .16,
};
/** Card types with a Blender render of their own; the others (lake, mine, cliff, big bridge) keep the older picture. */
export const RENDERED = new Set(Object.keys(TYPES).filter(id => !/[bx]/.test(TYPES[id].e) && !TYPES[id].lake && !TYPES[id].bridge && !['rMine', 'rEnd'].includes(id)));
const mid = d => [V[d][0] * .5, V[d][1] * .5];
export const corner = k => [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]][k % 4];   // corner k starts side k
const turnOf = (a, b) => Math.min((b - a + 4) % 4, (a - b + 4) % 4);
/** A path from side a to side b (a cubic square to both sides), or with wind an S-bend of two cubics. */
export function sidePath(a, b, wind = 0) {
  const h = GEO.hand[turnOf(a, b)], P0 = mid(a), P3 = mid(b);
  if (!wind) return [P0, [P0[0] - V[a][0] * h, P0[1] - V[a][1] * h], [P3[0] - V[b][0] * h, P3[1] - V[b][1] * h], P3];
  const tx = -V[a][0], ty = -V[a][1], q = wind * Math.PI / 180, dx = tx * Math.cos(q) - ty * Math.sin(q), dy = tx * Math.sin(q) + ty * Math.cos(q), k = .16, e = .18;
  return [P0, [P0[0] + tx * e, P0[1] + ty * e], [-dx * k, -dy * k], [0, 0], [dx * k, dy * k], [P3[0] - tx * e, P3[1] - ty * e], P3];
}
/** The town: along the card's edge on town sides, a curved wall across every gap, a tower on each wall, the keep. */
export function townShape(e) {
  const town = [0, 1, 2, 3].filter(d => e[d] === 'c');
  if (!town.length) return null;
  if (town.length === 4) return {from: corner(0), segs: [1, 2, 3, 0].map(k => ({to: corner(k)})), walls: [], towers: [], keep: [0, 0], n: 4};
  const s0 = town.find(d => e[(d + 3) % 4] !== 'c'), segs = [], walls = [], towers = [];
  for (let i = s0, n = 0; n < 4;) {
    if (e[i % 4] === 'c') { segs.push({to: corner((i + 1) % 4)}); i++; n++; continue; }
    let L = 0; while (e[(i + L) % 4] !== 'c') L++;
    let ux = 0, uy = 0; for (let k = 0; k < L; k++) { ux += V[(i + k) % 4][0]; uy += V[(i + k) % 4][1]; }
    const ul = Math.hypot(ux, uy) || 1, c = [ux / ul * GEO.wall[L], uy / ul * GEO.wall[L]], from = corner(i % 4), to = corner((i + L) % 4);
    segs.push({c, to}); walls.push([from, c, to]);
    towers.push([(from[0] + 2 * c[0] + to[0]) / 4, (from[1] + 2 * c[1] + to[1]) / 4]);
    i += L; n += L;
  }
  let x = 0, y = 0; town.forEach(d => { x += V[d][0]; y += V[d][1]; });
  const L = Math.hypot(x, y), f = town.length === 1 ? .3 : .16;
  // two opposite sides (a street across the card): the keep sits off the middle so the street stays free
  return {from: corner(s0), segs, walls, towers, keep: L < .01 ? [0, 0] : [x / L * f, y / L * f], n: town.length};
}
export function inTown(t, p) {
  if (!t) return false;
  const pts = [t.from];
  for (const s of t.segs) {
    const a = pts[pts.length - 1];
    if (!s.c) pts.push(s.to);
    else for (let k = 1; k <= 12; k++) { const u = k / 12, v = 1 - u; pts.push([v * v * a[0] + 2 * v * u * s.c[0] + u * u * s.to[0], v * v * a[1] + 2 * v * u * s.c[1] + u * u * s.to[1]]); }
  }
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) inside = !inside; }
  return inside;
}
/** Everything drawn on card type id (its own frame), as in hex.js shapes; null for a card without a render. */
export function shapes(id) {
  const t = TYPES[id];
  if (!t || !RENDERED.has(id)) return null;
  const e = t.e, side = k => [0, 1, 2, 3].filter(d => e[d] === k);
  const town = townShape(e), r = side('r'), w = side('w'), out = {roads: [], rivers: [], town, fort: t.fort ? [0, 0] : null, plaza: null, spring: null, bridge: null, boulders: null};
  if (r.length === 2) out.roads.push({edges: r, path: sidePath(r[0], r[1])});
  else for (const d of r) {
    const a = mid(d);
    let end = [0, 0], kind = r.length >= 3 ? 'plaza' : t.end || 'plaza';
    if (t.fort) { kind = 'fort'; const k = 1 - GEO.fort[1] / .5; end = [a[0] * (1 - k), a[1] * (1 - k)]; }
    else if (town) {
      kind = 'gate';
      const tip = [town.keep[0] - a[0], town.keep[1] - a[1]];
      for (let k = 1; k <= 60; k++) { const p = [a[0] + tip[0] * k / 60, a[1] + tip[1] * k / 60]; end = p; if (inTown(town, p)) break; }
    }
    out.roads.push({edges: [d], path: [a, end], end: kind});
  }
  if (r.length >= 3) out.plaza = [0, 0];
  if (t.end === 'boulders' || t.rocks) out.boulders = [0, 0];
  if (w.length === 2) out.rivers.push({edges: w, path: sidePath(w[0], w[1], turnOf(w[0], w[1]) === 2 && !r.length && !town ? GEO.wind : 0)});
  else if (w.length === 1) { out.rivers.push({edges: w, path: [mid(w[0]), [0, 0]]}); out.spring = [0, 0]; }
  if (w.length === 2 && r.length === 2) out.bridge = {at: [0, 0], along: r};
  return out;
}
