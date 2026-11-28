// src/ui/results.js
// Post-game and in-game results screen: winner title, podium, breakdown table, and summary line

/**
 * Returns title for results header
 */
export function winTitle(winner, final, isMeWinner = false) {
  if (!winner) return '';
  if (!final) return 'Лидирует ' + winner.name;
  return isMeWinner ? 'Победа!' : 'Победил ' + winner.name;
}

/**
 * Generates podium HTML for #podium
 */
export function renderPodiumHtml(podiumEntries, meepleImgFn) {
  return podiumEntries.map(([p, place, h]) => {
    const isFirst = place === 1 ? ' first' : '';
    const img = meepleImgFn ? meepleImgFn(p.i) : '';
    const botPill = !p.human ? ' <span class="botpill">бот</span>' : '';
    return `<div class="pc${isFirst}">${img}<b>${p.name}${botPill}</b><span class="pts">${p.score}</span><div class="blk" style="height:${h}px">${place}</div></div>`;
  }).join('');
}

/**
 * The only points outside object scoring come from finishing another player's object.
 * Old history rows may have a total without a breakdown.
 */
export function scoreBreakdown(player) {
  const {score, stats} = player;
  if (!stats) return null;
  const {c, r, f} = stats;
  if (![score, c, r, f].every(value => Number.isSafeInteger(value) && value >= 0)) return null;
  const help = score - c - r - f;
  return help >= 0 ? {c, r, f, help} : null;
}

/**
 * Generates breakdown table HTML for #bd
 */
export function renderBreakdownTableHtml(rankedPlayers) {
  return rankedPlayers.map(p => {
    const botPill = !p.human ? ' <span class="botpill">бот</span>' : '';
    const breakdown = scoreBreakdown(p);
    return `<tr style="--c:${p.col}"><td><span class="dot"></span>${p.name}${botPill}</td><td>${breakdown?.c ?? '—'}</td><td>${breakdown?.r ?? '—'}</td><td>${breakdown?.f ?? '—'}</td><td>${breakdown?.help ?? '—'}</td><td>${p.stats?.t ?? '—'}</td><td>${p.score}</td></tr>`;
  }).join('');
}

/**
 * Generates summary stats line HTML for #sumline
 */
export function renderSummaryLineHtml({tilesCount, movesCount, figsCount, deckCount}) {
  return `<span><b>${tilesCount}</b>карт на поле</span><span><b>${movesCount}</b>ходов</span><span><b>${figsCount}</b>фишек выставлено</span><span><b>${deckCount}</b>карт в стопке</span>`;
}

const BEST_KIND = {c: ['город', 'города'], r: ['дорога', 'дороги'], f: ['монастырь', 'монастыря']};
const cards = n => n % 10 === 1 && n % 100 !== 11 ? 'карты' : 'карт';
/**
 * The biggest single score of the game: "Лучший ход: Аня — город из 7 карт, +14".
 * @param {{name: string, col: string, best?: {pts: number, kind: string, n: number}}[]} players
 * @returns {string} HTML, or '' when nobody has scored an object.
 */
export function renderBestMoveHtml(players) {
  let top = null;
  for (const p of players) if (p.best && p.best.pts > 0 && (!top || p.best.pts > top.best.pts)) top = p;
  if (!top) return '';
  const k = BEST_KIND[top.best.kind] || ['объект'];
  const what = top.best.kind === 'f' ? k[0] : `${k[0]} из ${top.best.n} ${cards(top.best.n)}`;
  return `<div class="bestmove" style="--c:${top.col}"><span>Лучший ход</span><b>${top.name}</b> — ${what}, +${top.best.pts}</div>`;
}
