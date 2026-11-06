// Where a bot (or the turn clock, for a player who ran out of time) puts a card.
// random() is passed in so tests can make the choice reproducible; the game passes Math.random.
// Bot moves are sent as ordinary moves, so other phones never re-run this: changing it cannot split a game.
import * as SQB from './board.js';
import * as SQS from './scoring.js';
import * as HEX from './hex.js';

const {key} = SQB;
/** The square board, in the shape botsFor wants (hex.js already has it). */
const SQUARE = {
  allMoves: SQB.allMoves, groupsOf: SQB.groupsOf, component: SQB.component, roadPoints: SQS.roadPoints, featurePoints: SQS.featurePoints,
  neighbours: (tiles, x, y) => { let n = 0; for (let d = 0; d < 4; d++) if (tiles.get(key(x + SQB.DX[d], y + SQB.DY[d]))) n++; return n; },
  missing(tiles, c) {
    if (c.kind === 'f') return 9 - c.tiles.length;
    let open = 0;
    for (const t of c.tiles) for (const g of SQB.groupsOf(t)) if (c.ids.has(t.x + ',' + t.y + '|' + g.kind + g.edges.join(''))) for (const d of g.edges) if (!tiles.get(key(t.x + SQB.DX[d], t.y + SQB.DY[d]))) open++;
    return open;
  },
};

export const BOT_ARCHETYPES = {
  builder: {id: 'builder', label: 'Зодчий', desc: 'Упор на города и завершение построек'},
  roadman: {id: 'roadman', label: 'Дорожник', desc: 'Приоритет длинным дорогам и трактам'},
  monk: {id: 'monk', label: 'Хранитель', desc: 'Стремится окружать и закрывать монастыри'},
  balanced: {id: 'balanced', label: 'Тактик', desc: 'Сбалансированная универсальная стратегия'}
};

/** The bots for one kind of board (square: board.js, six-sided: hex.js). */
export function botsFor(geo) {
  const {allMoves, groupsOf, component, roadPoints: roadPts, featurePoints: featPts} = geo;
  const roadPoints = (tiles, c) => roadPts(tiles, c), featurePoints = (tiles, c, f) => featPts(tiles, c, f);
  const neighbours = (tiles, m) => geo.neighbours(tiles, m.x, m.y);

  /** Bots like spots with many neighbours, with some randomness. */
  function botPick(tiles, type, random) {
    let best = null, bs = -1e9;
    for (const m of allMoves(tiles, type)) { const s = neighbours(tiles, m) * 1.5 + random() * 2.5; if (s > bs) { bs = s; best = m; } }
    return best;
  }

  /** For a player whose clock ran out: next to their own unfinished objects first (finishing one is best), never to
   *  the benefit of an opponent who leads an object, otherwise somewhere compact. players: how many seats. */
  function helperPick(tiles, meeples, type, p, players, random, sharp = 1, persona = null) {
    let best = null, bs = -1e9;
    for (const m of allMoves(tiles, type)) {
      const t = {x: m.x, y: m.y, type, r: m.r, seed: 1};
      tiles.set(key(t.x, t.y), t); // tried in place, removed below
      let s = random() * .6 / sharp;
      for (const g of groupsOf(t)) {
        if (g.kind === 'f') {
          if (persona === 'monk') s += 4;
          continue;
        }
        const c = component(tiles, meeples, t, g);
        if (!c.meeples.length) continue;
        const cnt = Array.from({length: players}, () => 0); c.meeples.forEach(x => cnt[x.p]++);
        const mx = Math.max(...cnt), shared = cnt.filter(n => n === mx).length > 1;
        const worth = c.complete ? (c.kind === 'c' ? c.tiles.length * 2 : roadPoints(tiles, c)) : c.tiles.length * .8;
        let affinity = 1.0;
        if (persona === 'builder' && c.kind === 'c') affinity = 1.45;
        else if (persona === 'roadman' && c.kind === 'r') affinity = 1.45;
        if (cnt[p] === mx) s += (6 + worth * (shared ? .5 : 1.5) + (c.complete ? 8 * sharp : 0)) * affinity;
        else s -= 5 + worth * 1.2 + (c.complete ? 8 : 0);
      }
      tiles.delete(key(t.x, t.y));
      s += neighbours(tiles, m) * .15;
      if (s > bs) { bs = s; best = m; }
    }
    return best || botPick(tiles, type, random);
  }

  const NOUN = {c: 'ваш город', r: 'вашу дорогу', f: 'ваш монастырь'};
  const FREE = {c: 'Город без хозяина', r: 'Дорога без хозяина'};
  const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many;
  const pts = n => `${n} ${plural(n, 'очко', 'очка', 'очков')}`;
  /** What is still missing: open sides of a town or road, empty cells round a fort. */
  const missing = (tiles, c) => geo.missing(tiles, c);
  /** The least a feature brings once finished: an open town or road needs at least one more card. */
  const atLeast = (kind, v, miss) => kind === 'f' ? v : v + (miss ? (kind === 'c' ? 2 : 1) : 0);
  const left = (kind, n) => kind === 'f' ? `осталось окружить ${n} ${plural(n, 'клетку', 'клетки', 'клеток')}` : `осталось закрыть ${n} ${plural(n, 'край', 'края', 'краёв')}`;

  /** The coach: the best spot for player p's card, and why, in words a player understands, with the points at stake
   *  and what is left to finish. Deterministic (the same board always gives the same advice). Finishing your own town
   *  or road counts most, then growing it, then a fresh feature you can claim (only with a figure in hand); handing
   *  points to an opponent counts against. Returns {x, y, r, why} or null when the card fits nowhere. */
  function hintPick(tiles, meeples, type, p, players, haveFigure) {
    let best = null;
    for (const m of allMoves(tiles, type)) {
      const t = {x: m.x, y: m.y, type, r: m.r, seed: 1};
      tiles.set(key(t.x, t.y), t); // tried in place, removed below
      let s = neighbours(tiles, m) * .4, why = null, wv = 0;
      const say = (v, text) => { if (v > wv) { wv = v; why = text; } };
      for (const g of groupsOf(t)) {
        const c = component(tiles, meeples, t, g), v0 = featurePoints(tiles, c, false), miss = c.complete ? 0 : missing(tiles, c);
        if (!c.meeples.length) {
          // a figure can only go on a feature nobody holds, on the card just placed
          if (haveFigure && !c.complete) { const v = 2.5 + Math.min(v0, 12) * .25; s += v; say(v, g.kind === 'f' ? `Монастырь — поставьте фишку: окружите картами — +${pts(v0)}, ${left(g.kind, miss)}` : `${FREE[g.kind]} — поставьте фишку: достроите — минимум +${pts(atLeast(g.kind, v0, miss))}, ${left(g.kind, miss)}`); }
          continue;
        }
        const cnt = Array.from({length: players}, () => 0); c.meeples.forEach(x => cnt[x.p]++);
        const mx = Math.max(...cnt), mine = cnt[p] === mx;
        // two parts with figures of different players are glued by this card: say who leads the joined object
        const other = Math.max(0, ...cnt.filter((n, i) => i !== p));
        const contest = mine && other > 0 ? `Склейка с чужой фишкой: у вас ${cnt[p]} ${plural(cnt[p], 'фишка', 'фишки', 'фишек')}, у соперника ${other} — ${cnt[p] > other ? 'объект ваш' : 'очки получите оба'}. ` : '';
        if (mine && c.complete) { const v = 10 + v0 * 1.5; s += v; say(v, `${contest}Достроит ${NOUN[g.kind]} — +${pts(v0)} прямо сейчас`); }
        else if (mine) { const v = 2 + c.tiles.length * .4 + (miss <= 1 ? 2 : 0) + (contest ? 1.5 : 0); s += v; say(v, `${contest}Продолжит ${NOUN[g.kind]}: достроите — минимум +${pts(atLeast(g.kind, v0, miss))}, ${left(g.kind, miss)}`); }
        else s -= c.complete ? 3 + v0 : 1 + c.tiles.length * .3;
      }
      tiles.delete(key(t.x, t.y));
      if (!best || s > best.s) best = {x: m.x, y: m.y, r: m.r, s, why};
    }
    if (!best) return null;
    return {x: best.x, y: best.y, r: best.r, why: best.why || 'Своих объектов рядом нет — здесь карта удобно ляжет рядом с другими'};
  }

  /** Coach text for one figure option: what this town / road / fort is worth and what is left to finish it. */
  function featureNote(tiles, meeples, t, g) {
    const c = component(tiles, meeples, t, g), v0 = featurePoints(tiles, c, false), miss = c.complete ? 0 : missing(tiles, c);
    return c.complete ? `+${pts(v0)} сразу` : g.kind === 'f' ? `окружите — +${pts(v0)}, ${left(g.kind, miss)}` : `достроите — минимум +${pts(atLeast(g.kind, v0, miss))}, ${left(g.kind, miss)}`;
  }

  /* ---- bot levels: easy = the old compact-and-random play; normal looks at the objects (own, rival, finished);
     hard looks at them more sharply and spends figures more readily. ---- */

  /** Where a bot puts a card, by level. Always one of allMoves. */
  function levelPick(tiles, meeples, type, p, players, random, level, persona = null) {
    if (level === 'easy') return botPick(tiles, type, random);
    return helperPick(tiles, meeples, type, p, players, random, level === 'hard' ? 3 : 1, persona);
  }

  /** Which object a bot claims with a figure (or null: keep the figure). opts: {t, g, done?}. left: figures it still has.
   *  Worth: a city 2 per card, a road 1 per card, a fort about 5, plus a finishing bonus; the fewer figures are left, the
   *  more an object must be worth, so a bot does not run out of figures in the first ten cards. */
  function figurePick(tiles, meeples, opts, left, random, level, persona = null) {
    if (level === 'easy') {
      if (!opts.length || random() >= .55) return null;
      const cs = opts.filter(o => !o.done && o.g && o.g.kind !== 'r');
      return cs.length && random() < .7 ? cs[(random() * cs.length) | 0] : opts[(random() * opts.length) | 0];
    }
    let best = null, bs = 0;
    for (const o of opts) {
      if (o.done) continue;
      const c = component(tiles, meeples, o.t, o.g);
      if (c.meeples.length) continue;
      const n = c.tiles.length;
      let v = c.kind === 'c' ? n * 2 + 2 : c.kind === 'r' ? n + 1 : 5;
      if (c.complete) v += 4;
      if (persona === 'builder' && c.kind === 'c') v *= 1.45;
      else if (persona === 'roadman' && c.kind === 'r') v *= 1.45;
      else if (persona === 'monk' && c.kind === 'f') v *= 1.45;
      v *= .85 + random() * .3;
      if (v > bs) { bs = v; best = o; }
    }
    const need = left <= 1 ? 9 : left <= 2 ? 6 : left <= 4 ? 4 : 2.5;
    return best && bs >= need * (level === 'hard' ? .75 : 1) ? best : null;
  }

  return {botPick, helperPick, hintPick, featureNote, levelPick, figurePick};
}

export const BOT_LEVELS = ['easy', 'normal', 'hard'];
const SQ = botsFor(SQUARE);
export const {botPick, helperPick, hintPick, featureNote, levelPick, figurePick} = SQ;
/** The same bots on six-sided tiles (Classic 2.0). */
export const hex = botsFor(HEX);

/** G-3: Adaptive difficulty helper. Proposes hard after 3 wins, easy after 3 losses. */
export function checkAdaptiveDifficulty(streak = {w: 0, l: 0}, won, currentLevel = 'normal') {
  const w = won ? (streak.w || 0) + 1 : 0;
  const l = !won ? (streak.l || 0) + 1 : 0;
  let offer = null;
  if (w >= 3 && currentLevel !== 'hard') {
    offer = 'hard';
  } else if (l >= 3 && currentLevel !== 'easy') {
    offer = 'easy';
  }
  return { offer, streak: { w, l } };
}
