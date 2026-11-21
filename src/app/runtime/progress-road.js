// The profile plate on the menu: avatar, nickname, level with its bar, gold. Taps open the profile.
function renderMenuQuestBanner() {
  const b = $('#menuQuestBanner'); if (!b) return;
  questsToday();
  const qList = PROG.q || [];
  const doneCount = qList.filter(q => {
    const Q = (QUESTS || []).find(x => x.id === q.id);
    return q.got || (Q && q.n >= Q.n);
  }).length;
  const readyGold = qList.filter(q => {
    const Q = (QUESTS || []).find(x => x.id === q.id);
    return !q.got && Q && q.n >= Q.n;
  }).reduce((sum, q) => sum + ((QUESTS || []).find(x => x.id === q.id) || {g: 0}).g, 0);
  const remGold = qList.filter(q => !q.got).reduce((sum, q) => sum + ((QUESTS || []).find(x => x.id === q.id) || {g: 0}).g, 0);

  const tEl = $('#mqTitle'), sEl = $('#mqSub');
  if (tEl) tEl.textContent = `${doneCount}/${qList.length}`;
  if (sEl) {
    if (readyGold > 0) sEl.textContent = `+${readyGold} 🪙`;
    else if (doneCount === qList.length && qList.length > 0) sEl.textContent = 'Готово 🎉';
    else sEl.textContent = 'Задания';
  }
}
/* The progress road as a map in the game's own style: level 1 top left, level 2 at the right edge, level 3 left again...
   a cobbled road winds from one to the next, rivers cross it under little bridges, villages, woods and a castle stand
   between. Everything is placed from a fixed seed, so the map is the same every time it is opened. */
// The map is drawn 360 wide and stretched to the screen: turn each bridge to the road's direction as it looks on screen.
function roadBridges() {
  const map = document.querySelector('.rd-map'); if (!map || !map.clientWidth) return;
  const sx = map.clientWidth / 360;
  map.querySelectorAll('.rd-bridge').forEach(b => b.style.setProperty('--a', (Math.atan2(+b.dataset.dy, +b.dataset.dx * sx) * 180 / Math.PI).toFixed(1) + 'deg'));
}
addEventListener('resize', roadBridges);
function roadMapHtml(ms, unlockedFn, claimed) {
  const W = 360, ROW = 186, TOP = 130, n = ms.length, H = TOP + (n - 1) * ROW + 280;
  const P = ms.map((m, i) => ({x: i % 2 ? 284 : 76, y: TOP + i * ROW}));
  const cub = (p0, c1, c2, p1, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1]]; };
  const segs = [];
  for (let i = 0; i < n - 1; i++) {
    const d = P[i + 1].x > P[i].x ? 1 : -1;
    segs.push([[P[i].x, P[i].y], [P[i].x + d * 125, P[i].y + 6], [P[i + 1].x - d * 125, P[i + 1].y - 6], [P[i + 1].x, P[i + 1].y]]);
  }
  const head = [[-10, P[0].y - 72], [34, P[0].y - 72], [44, P[0].y], [P[0].x, P[0].y]];                    // in from the top-left corner
  const tail = [[P[n - 1].x, P[n - 1].y], [P[n - 1].x, P[n - 1].y + 60], [180, P[n - 1].y + 130], [180, H + 40]];   // and on to new seasons
  const all = [head, ...segs, tail];
  const pathD = c => `M${c[0][0]} ${c[0][1]}C${c[1][0]} ${c[1][1]} ${c[2][0]} ${c[2][1]} ${c[3][0]} ${c[3][1]}`;
  const samples = []; all.forEach(c => { for (let k = 0; k <= 36; k++) samples.push(cub(c[0], c[1], c[2], c[3], k / 36)); });
  const myLvl = (typeof PROG !== 'undefined' && PROG.lvl) || 1;
  const myCups = ((typeof PROG !== 'undefined' && PROG.cups) || 0) + ((typeof PROG !== 'undefined' && PROG.hcups) || 0);
  let curIdx = 0;
  for (let i = 0; i < n; i++) {
    if (unlockedFn(ms[i])) curIdx = i;
  }
  let playerX = P[curIdx].x, playerY = P[curIdx].y;
  let partialWalked = '';
  if (curIdx < n - 1) {
    const nextMs = ms[curIdx + 1], prevMs = ms[curIdx];
    const lvlFrac = Math.max(0, Math.min(1, (myLvl - prevMs.lvl) / Math.max(1, nextMs.lvl - prevMs.lvl)));
    const cupsFrac = Math.max(0, Math.min(1, (myCups - prevMs.cups) / Math.max(1, nextMs.cups - prevMs.cups)));
    const progressFrac = Math.max(0, Math.min(0.92, (lvlFrac + cupsFrac) / 2));
    if (progressFrac > 0.03) {
      const seg = segs[curIdx];
      const pt = cub(seg[0], seg[1], seg[2], seg[3], progressFrac);
      playerX = pt[0];
      playerY = pt[1];
      const p0 = seg[0], p1 = seg[1], p2 = seg[2], p3 = seg[3];
      const lerp = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
      const p01 = lerp(p0, p1, progressFrac), p12 = lerp(p1, p2, progressFrac), p23 = lerp(p2, p3, progressFrac);
      const p012 = lerp(p01, p12, progressFrac);
      const p0123 = lerp(p012, lerp(p12, p23, progressFrac), progressFrac);
      partialWalked = 'C' + p01[0].toFixed(1) + ' ' + p01[1].toFixed(1) + ' ' + p012[0].toFixed(1) + ' ' + p012[1].toFixed(1) + ' ' + p0123[0].toFixed(1) + ' ' + p0123[1].toFixed(1);
    }
  }
  let last = curIdx;
  let walked = segs.slice(0, Math.max(0, curIdx)).map(pathD).join('');
  if (partialWalked) {
    walked += 'M' + P[curIdx].x + ' ' + P[curIdx].y + partialWalked;
  }
  // rivers cross the road in the middle of three of its stretches, under a little plank bridge
  const rivers = [];
  [1, 4, 7].filter(k => k < segs.length).forEach(k => {
    const c = segs[k], m = cub(c[0], c[1], c[2], c[3], .5), t1 = cub(c[0], c[1], c[2], c[3], .53), t0 = cub(c[0], c[1], c[2], c[3], .47);
    // the river crosses the road square-on at the bridge, then bends away to both edges of the map
    const tx = t1[0] - t0[0], ty = t1[1] - t0[1], tl = Math.hypot(tx, ty) || 1, px = -ty / tl, py = tx / tl, s0 = py > 0 ? 1 : -1;
    const a = [m[0] - px * 46 * s0, m[1] - py * 46 * s0], b = [m[0] + px * 46 * s0, m[1] + py * 46 * s0];
    const r1 = [[-24, m[1] - 70], [40, m[1] - 70], [a[0] - px * 40 * s0, a[1] - py * 40 * s0], [m[0], m[1]]];
    const r2 = [[m[0], m[1]], [b[0] + px * 40 * s0, b[1] + py * 40 * s0], [320, m[1] + 70], [384, m[1] + 70]];
    rivers.push({r1, r2, m, dx: tx, dy: ty});
  });
  const riverSamples = []; rivers.forEach(r => [r.r1, r.r2].forEach(c => { for (let k = 0; k <= 30; k++) riverSamples.push(cub(c[0], c[1], c[2], c[3], k / 30)); }));
  const riverD = r => `M${r.r1[0][0]} ${r.r1[0][1]}C${r.r1[1][0]} ${r.r1[1][1]} ${r.r1[2][0]} ${r.r1[2][1]} ${r.r1[3][0]} ${r.r1[3][1]}C${r.r2[1][0]} ${r.r2[1][1]} ${r.r2[2][0]} ${r.r2[2][1]} ${r.r2[3][0]} ${r.r2[3][1]}`;
  let svg = `<svg class="rd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`;
  const stroke = (d, w, col, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" ${extra}/>`;
  for (const r of rivers) {
    const d = riverD(r);
    svg += stroke(d, 44, 'rgba(30,70,20,.35)') + stroke(d, 38, '#a8975f') + stroke(d, 35, '#d6c48e') + stroke(d, 31, 'rgba(240,252,255,.85)') + stroke(d, 29, '#46b3d3') + stroke(d, 22, '#2f93c8') + stroke(d, 12, '#2276b8') + stroke(d, 2, 'rgba(235,250,255,.7)', 'stroke-dasharray="6 14"');
  }
  const road = all.map(pathD).join('');
  // a paved road: a soft verge, a kerb of stones, cobbles in rows, worn lighter down the middle
  svg += stroke(road, 40, 'rgba(40,70,20,.28)') + stroke(road, 32, '#6e5434') + stroke(road, 30, '#b59a68', 'stroke-dasharray="7 3"') + stroke(road, 25, '#cfb27a')
    + stroke(road, 23, '#bfa06a', 'stroke-dasharray="5 4"') + stroke(road, 17, '#dcc493', 'stroke-dasharray="6 3" stroke-dashoffset="3"') + stroke(road, 9, 'rgba(240,226,190,.75)') + stroke(road, 2, 'rgba(120,95,55,.35)', 'stroke-dasharray="2 9"');
  if (walked) svg += stroke(walked, 4, '#f2b84b', 'stroke-dasharray="1 9" opacity=".95"');
  svg += '</svg>';
  // scenery: sprites of the game (houses, trees, hay, rocks, a keep), placed where there is room
  const R = rng(20261106), dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const placed = [], spr = [];
  const nodeBox = P.map(q => q);
  const free = (x, y, r) => samples.every(q => dist(q, [x, y]) > r + 14) && riverSamples.every(q => dist(q, [x, y]) > r + 26)
    && nodeBox.every(q => Math.abs(x - q.x) > 86 + r * .3 || y < q.y - 100 || y > q.y + 62) && placed.every(q => dist(q, [x, y]) > (r + q[2]) * .85) && x > 12 && x < W - 12 && y > 70 && y < H - 8;   // nothing tall at the very top, where it would be cut
  // a sprite stands on (x, y) and rises above it: the middle of its picture must be free too (tall buildings)
  const BIG = {keep: 1.25, abbey: 1.25, tower: 1.3, mine: 1.4};
  const put = (k, x, y, r) => { const d = SPR[k], sc = BIG[k] || 1.7, mid = d ? d.h * sc * .5 : 0; if (!free(x, y, r) || (mid > 30 && !free(x, y - mid, r * .6))) return false; placed.push([x, y, r], [x, y - mid, r]); if (d) spr.push({k, x, y, w: Math.round(d.w * sc), h: Math.round(d.h * sc)}); return true; };
  // every reward stands somewhere of its own, never the same as the one before: by the road, in a village, at a
  // monastery, at a fortress, at a mine, by a watchtower. The scene sits beside the reward, toward the middle of the map.
  const SCENES = ['camp', 'village', 'bridge', 'abbey', 'mine', 'fort', 'citadel'];
  const near = (k, cx, cy, r, spread = 44) => { for (let t = 0; t < 90; t++) if (put(k, cx + (R() - .5) * spread, cy + (R() - .5) * spread, r)) return true; return false; };
  P.forEach((q, i) => {
    const side = q.x < W / 2 ? 1 : -1, cx = q.x + side * 10, cy = q.y + 118, sc = SCENES[i % SCENES.length];
    if (sc === 'camp') {
      near('rock', q.x + side * 36, q.y + 32, 8, 16);
      near('bush', q.x - side * 34, q.y + 28, 8, 16);
      near('hay', cx, cy - 10, 10, 20);
    } else if (sc === 'village') {
      ['house', 'house3', 'house2', 'hay'].forEach((k, j) => near(k, cx + (j % 2 ? 24 : -18), cy + (j < 2 ? -16 : 22), k === 'hay' ? 10 : 18, 24));
    } else if (sc === 'bridge') {
      near('pine', cx - 24, cy - 10, 12, 20);
      near('poplar', cx + 26, cy + 16, 12, 20);
      near('bush', cx, cy + 28, 8, 16);
    } else if (sc === 'abbey') {
      near('abbey', cx, cy, 26);
      near('poplar', cx + 28, cy - 14, 12, 18);
      near('bush', cx - 28, cy + 24, 8, 16);
    } else if (sc === 'mine') {
      near('mine', cx, cy, 22);
      near('boulders', cx + 26, cy + 18, 14, 20);
      near('rock', cx - 24, cy + 20, 8, 16);
    } else if (sc === 'fort') {
      near('tower', cx, cy - 4, 22);
      near('house4', cx + 24, cy + 28, 16, 20);
      near('hay', cx - 22, cy + 24, 10, 18);
    } else if (sc === 'citadel') {
      near('keep', cx, cy - 6, 28);
      near('house4', cx + 26, cy + 32, 16, 20);
      near('bush', cx - 28, cy + 28, 8, 16);
    }
  });
  for (let t = 0; t < 700 && spr.length < 90; t++) {
    const x = 10 + R() * (W - 20), y = 10 + R() * (H - 20), v = R();
    const k = v < .34 ? 'pine' : v < .56 ? 'oak' : v < .66 ? 'birch' : v < .73 ? 'poplar' : v < .88 ? 'bush' : v < .95 ? 'rock' : 'hay';
    put(k, x, y, k === 'bush' || k === 'rock' || k === 'hay' ? 9 : 14);
  }
  spr.sort((a, b) => a.y - b.y);
  const sprHtml = spr.map(o => `<i class="rd-spr s-${o.k}" style="left:${(100 * o.x / W).toFixed(2)}%;top:${o.y}px;width:${o.w}px;height:${o.h}px"></i>`).join('');
  // the bridge lies along the road; its angle on screen depends on how wide the map is drawn (roadBridges sets it)
  const bridges = rivers.map(r => `<i class="rd-bridge" data-dx="${r.dx.toFixed(2)}" data-dy="${r.dy.toFixed(2)}" style="left:${(100 * r.m[0] / W).toFixed(2)}%;top:${Math.round(r.m[1])}px"></i>`).join('');
  // the levels
  const curFig = (typeof wallet !== 'undefined' && wallet.fig) || 'classic';
  const playerFigUrl = typeof figPreview === 'function' ? figPreview(curFig) : '';
  const playerMarkerHtml = '<div class="rd-player-marker" style="left:' + (100 * playerX / W).toFixed(2) + '%;top:' + playerY.toFixed(1) + 'px">'
    + '<div class="rd-player-bubble"><span class="rd-player-dot"></span><b>Вы здесь</b><small>' + myLvl + ' ур.</small></div>'
    + '<div class="rd-player-fig">' + (playerFigUrl ? '<img src="' + playerFigUrl + '" alt="">' : '<span style="font-size:20px">👤</span>') + '</div></div>';
  const nodes = ms.map((m, i) => {
    const open = unlockedFn(m), got = claimed.includes(m.id), q = P[i];
    const isCur = i === curIdx;
    const cls = got ? 'claimed' : open ? 'unlocked' : 'locked';
    const herePill = isCur ? '<span class="rd-here-pill">📍 Вы здесь</span>' : '';
    const act = got ? '<span class="rd-tag">✓ Получено</span>' : open ? `<button class="chip pri" data-claimroad="${m.id}">Забрать</button>` : `<span class="rd-tag">🔒 ${m.lvl} ур. и ${m.cups} 🏆</span>`;
    return `<div class="rd-n ${cls}${isCur ? ' current-milestone' : ''}${i === last + 1 || (last === n - 1 && i === n - 1) ? ' next' : ''}" style="left:${(100 * q.x / W).toFixed(2)}%;top:${q.y}px">`
      + `<div class="rd-sign"><b>${m.title}</b><small>${m.desc}</small>${herePill}</div>`
      + `<span class="rd-med"><em>${m.lvl}</em>${got ? '✓' : m.ic}</span>${act}</div>`;
  }).join('');
  return `<div class="rd-map" style="height:${H}px">${svg}${bridges}${sprHtml}${playerMarkerHtml}${nodes}</div>`;
}
let roadScroll = false;
function renderAchievements() {
  const el = $('#achievementsContent');
  if (!el || !PG.ui.progress || !PG.ui.progress.renderAchievementsHtml) return;
  el.innerHTML = PG.ui.progress.renderAchievementsHtml({
    achDefs: ACH,
    progAch: PROG.ach || {},
    progStats: PROG.st || {},
    progLvl: PROG.lvl || 1
  });
}
