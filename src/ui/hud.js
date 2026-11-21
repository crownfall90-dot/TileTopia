// src/ui/hud.js
// HUD rendering: player list bar, ownership SVG layer, and city path geometry

/**
 * Computes SVG path for city boundaries on tile edges
 */
export function cityD(E, S = 100) {
  const city = [0, 1, 2, 3].filter(d => E[d] === 'c'), k = city.length, C = S / 2;
  const corner = [[0, 0], [S, 0], [S, S], [0, S]], mid = [[S / 2, 0], [S, S / 2], [S / 2, S], [0, S / 2]];
  const pt = p => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  if (k === 4) return {fill: `M0 0H${S}V${S}H0Z`, wall: ''};
  if (k === 1) {
    const i = city[0], rot = ([x, y]) => { let dx = x - C, dy = y - C; for (let n = 0; n < i; n++) [dx, dy] = [-dy, dx]; return [C + dx, C + dy]; };
    const A = rot([0, 0]), B = rot([S, 0]), K = rot([S / 2, S * 0.64]);
    return {fill: `M${pt(A)}L${pt(B)}Q${pt(K)} ${pt(A)}Z`, wall: `M${pt(B)}Q${pt(K)} ${pt(A)}`};
  }
  const s0 = city.find(d => E[(d + 3) % 4] !== 'c');
  let fill = `M${pt(corner[s0])}`, wall = '', i = s0, n = 0;
  while (n < 4) {
    if (E[i] === 'c') { fill += `L${pt(corner[(i + 1) % 4])}`; i = (i + 1) % 4; n++; continue; }
    let L = 0; while (E[(i + L) % 4] !== 'c') L++;
    const from = corner[i], to = corner[(i + L) % 4], p = L === 1 ? mid[i] : corner[(i + 1) % 4], f = L === 1 ? 0.88 : 0.86;
    const K = [p[0] + (C - p[0]) * f, p[1] + (C - p[1]) * f];
    fill += `Q${pt(K)} ${pt(to)}`; wall += `M${pt(from)}Q${pt(K)} ${pt(to)}`;
    i = (i + L) % 4; n += L;
  }
  return {fill: fill + 'Z', wall};
}

/**
 * Generates an SVG data-URI showing colored ownership ribbons on roads, cities, and forts
 */
export function ownSvg(t, list, typeEdges = null) {
  const mid = [[50, 0], [100, 50], [50, 100], [0, 50]];
  let out = '';
  const strokes = (d, cols, w, extra = '') => cols.map((c, i) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="${cols.length > 1 ? 'butt' : 'round'}"${cols.length > 1 ? ` stroke-dasharray="7 ${7 * (cols.length - 1)}" stroke-dashoffset="${-7 * i}"` : ''} ${extra}/>`).join('');

  for (const it of list) {
    const base = it.edges.map(d => (d - (t.r || 0) + 4) % 4);
    if (it.kind === 'r') {
      const [a, b] = base.map(e => mid[e].join(' '));
      const d = base.length === 2 ? `M${a}Q50 50 ${b}` : `M${a}L50 50`;
      out += `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="10" stroke-linecap="round"/>` + strokes(d, it.cols, 6.5);
    } else if (it.kind === 'c') {
      const g = cityD(typeEdges || ['c', 'f', 'f', 'f'], 100);
      out += `<path d="${g.fill}" fill="${it.cols[0]}" fill-opacity="${it.cols.length > 1 ? 0.12 : 0.22}"/>`;
      if (g.wall) out += `<path d="${g.wall}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="7" stroke-linecap="round"/>` + strokes(g.wall, it.cols, 4.5);
      else out += strokes('M3 3H97V97H3Z', it.cols, 4.5);
    } else if (it.kind === 'f') {
      const d = 'M50 20A30 30 0 1 1 49.9 20Z';
      out += `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="7"/>` + strokes(d, it.cols, 4.5);
    }
  }
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${out}</svg>`);
}

/**
 * Generates HTML string for the in-game players list header (#players)
 */
export function renderPlayersListHtml(players, ctx) {
  const {turn, phase, bump, isMe, myRing, meeplesTotal, turnTag, clockHtml} = ctx;
  return (players || []).map((p, i) => {
    const activeClass = (i === turn && phase !== 'end') ? ' active' : '';
    const bumpClass = (bump && bump.includes(i)) ? ' bump' : '';
    const outClass = p.resigned ? ' out' : '';
    const uid = ctx.contactUid ? ctx.contactUid(p) : p.uid;
    const uidAttr = (uid && !isMe(p)) ? ` data-pl="${String(uid).replace(/[^\w-]/g, '').slice(0, 64)}"${p.uid ? '' : ' data-guest="1"'} data-n="${p.name}" data-c="${p.col}"` : '';
    const ringStyle = (isMe(p) && myRing()) ? ` fr" style="--fr:${myRing()}` : '';
    const dispName = p.resigned ? 'сдался' : p.missed >= 1 ? '🤖 ' + p.name : p.name;
    const botPill = !p.human && !p.ghost ? ' <span class="botpill">бот</span>' : '';
    const stLine = p.st ? `<span class="pst">${p.st}</span>` : '';
    const totalMeeples = meeplesTotal || 6;
    const meeplesHtml = Array.from({length: totalMeeples}, (_, k) => `<i${k < p.meeples ? '' : ' class="off"'}></i>`).join('');
    const clk = clockHtml ? clockHtml(i) : '';

    return `<div${uidAttr} class="pl${activeClass}${bumpClass}${outClass}" style="--c:${p.col}"><span class="tg">${turnTag(i)}</span><span class="av${ringStyle}">${p.init}</span><span class="pi"><span class="nm">${dispName}${botPill}</span>${stLine}<span class="pline"><b class="sc">${p.score}</b><span class="mp">${meeplesHtml}</span></span></span>${clk}</div>`;
  }).join('');
}
