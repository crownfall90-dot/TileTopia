/* ---------------- art ---------------- */
// Tile and sprite art live in src/render/art.js.
const {cv, SPR, sprite, TILE_URL, DRAWN, injectArt, injectHexArt} = PG.render.createArt({S, V, PL0, MEEPLE_D});
/* ---------------- rules ---------------- */
const G = (PG.game && PG.game.createGameState) ? PG.game.createGameState() : {
  tiles: new Map(), deck: [], meeples: [], players: [], turn: 0, phase: 'idle', current: null, sel: null
};
let tiles = G.tiles, deck = G.deck, meeples = G.meeples, players = G.players, turn = G.turn, phase = G.phase, current = G.current, sel = G.sel;
let ghost = G.ghost, ghostDeg = G.ghostDeg, trayDeg = G.trayDeg, slotEls = G.slotEls, token = G.token, gameVisible = G.gameVisible, pendingStart = G.pendingStart;
// Board rules live in src/engine/board.js; these wrappers pass it the current game state.
// Classic 2.0 (rules.mode 'hex') plays on six-sided tiles: src/engine/hex.js has the same API as board.js and
// scoring.js, so useGeo() switches the rules, the bots and the drawing for one game; the square game is untouched.
const HX = PG.engine.hex, HW = T * HX.WIDTH;   // HW: a six-sided tile's width on the table (its height is T)
let HEX = false, B = PG.engine.board, SC = PG.engine.scoring, BOTS = PG.engine.bots, edgeAt = B.edgeAt, groupsOf = B.groupsOf, gid = B.gid;
const key = B.key;
function useGeo(hex) {
  HEX = !!hex; B = HEX ? HX : PG.engine.board; SC = HEX ? HX : PG.engine.scoring; BOTS = HEX ? PG.engine.bots.hex : PG.engine.bots;
  edgeAt = B.edgeAt; groupsOf = B.groupsOf; gid = B.gid; boundsCache = null;
  document.documentElement.classList.toggle('hexg', HEX);
  if (HEX) injectHexArt();
}
const TY = id => TYPES[id] || HX.TYPES[id];
const NDIR = () => HEX ? 6 : 4, ROT = () => HEX ? 60 : 90, VV = () => HEX ? HX.V : V;
const nbXY = (x, y, d) => HEX ? [x + HX.DX[d], y + HX.DY[d]] : [x + DX[d], y + DY[d]];
/** Centre of a cell on the table, in tile heights; and the left/top of a tile or slot there, in px. */
const cellXY = (x, y) => HEX ? HX.cellXY(x, y) : [x, y];
const cellLT = (x, y) => { const [X, Y] = cellXY(x, y); return [X * T - (HEX ? HW : T) / 2, Y * T - T / 2]; };
const at = (x, y) => tiles.get(key(x, y));
const fits = (type, r, x, y) => B.fits(tiles, type, r, x, y);
const emptyCells = () => B.emptyCells(tiles);
const legalRots = (type, x, y) => B.legalRots(tiles, type, x, y);
const allMoves = type => B.allMoves(tiles, type);
const hasPlacement = type => B.hasPlacement(tiles, type);
const fortComp = t => B.fortComp(tiles, meeples, t);
const component = (t, g) => B.component(tiles, meeples, t, g);
function groupPos(t, g) {
  if (HEX) return hexGroupPos(g);
  if (PG.game && PG.game.world) return PG.game.world.groupPos(t, g);
  if (g.kind === 'f') return [0.24, 0.18];
  if (g.kind === 'c') {
    if (g.edges.length === 1) { const [x, y] = V[g.edges[0]]; return [x * .3, y * .3]; }
    let sx = 0, sy = 0; g.edges.forEach(d => { sx += V[d][0]; sy += V[d][1]; });
    return [sx * .16 + .06, sy * .16 + .08];
  }
  const a = V[g.edges[0]];
  if (g.edges.length === 2) { const b = V[g.edges[1]]; return [(a[0]*.4225 + b[0]*.1225) * .5, (a[1]*.4225 + b[1]*.1225) * .5]; }
  return [a[0] * .3, a[1] * .3];
}
// Where a figure stands on a six-sided tile: in its town, on its road, by the monastery.
function hexGroupPos(g) {
  const v = HX.V;
  if (g.kind === 'f') return [.2, .16];
  if (g.kind === 'c') { let sx = 0, sy = 0; g.edges.forEach(d => { sx += v[d][0]; sy += v[d][1]; }); const L = Math.hypot(sx, sy); return L < .01 ? [.14, .12] : [sx / L * .27, sy / L * .27]; }
  const a = v[g.edges[0]];
  if (g.edges.length === 2) { const b = v[g.edges[1]]; return [(a[0] + b[0]) * .18 + a[0] * .14, (a[1] + b[1]) * .18 + a[1] * .14]; }
  return [a[0] * .3, a[1] * .3];
}
// Rules v2 (rv = 2): a player may add figures to an object held only by their own figures; equal figures are decided by cards laid.
const rules2 = () => !!(gameRules && gameRules.rv === 2);
const claimable = (t, p) => B.claimable(tiles, meeples, t, p, rules2());
const claimableAll = p => B.claimableAll(tiles, meeples, p, rules2());
const label = g => g.kind === 'r' && g.edges.length === 1 ? 'Дорога ' + (HEX ? HX.ARROW : ARROW)[g.edges[0]] : KIND[g.kind];
