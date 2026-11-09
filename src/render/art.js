// Card and sprite art, drawn on canvases at start-up (no image files): tile faces, houses, trees, figures.
// createArt receives the few game constants it needs; injectArt puts the pictures into the page as CSS classes
// (.t-<card type>, .s-<sprite>).
import {TYPES} from '../engine/tiles.js';
import {TYPES as HTYPES, shapes as hexShapes, GEO as HGEO} from '../engine/hex.js';
import {rng, hash} from '../engine/rng.js';

/** S: tile art size in px; V: direction vectors; PL0: default seats (figure colours); MEEPLE_D: figure outline.
 *  K: pixels per art pixel of the card faces (1 in the game; the 3D tile export draws them sharper). */
export function createArt({S, V, PL0, MEEPLE_D, K = 1}) {
function cv(w, h, k = 2) { const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); const g = c.getContext('2d'); g.scale(k, k); return [c, g]; }

function cityPaths(E) {
  const city = [0,1,2,3].filter(d => E[d] === 'c'), k = city.length;
  if (!k) return null;
  const corner = [[0,0],[S,0],[S,S],[0,S]], mid = [[S/2,0],[S,S/2],[S/2,S],[0,S/2]], C = S / 2;
  const fill = new Path2D(), wall = new Path2D(), towers = [];
  // the middle of a wall curve (a quadratic from p through kk to q): a round tower stands there
  const qmid = (p, kk, q) => [(p[0] + 2 * kk[0] + q[0]) / 4, (p[1] + 2 * kk[1] + q[1]) / 4];
  if (k === 4) { fill.rect(0, 0, S, S); return {fill, wall: null, towers}; }
  if (k === 1) {
    const i = city[0];
    const rot = ([x, y]) => { let dx = x - C, dy = y - C; for (let n = 0; n < i; n++) [dx, dy] = [-dy, dx]; return [C + dx, C + dy]; };
    const A = rot([0,0]), B = rot([S,0]), K = rot([S/2, S*0.64]);
    fill.moveTo(...A); fill.lineTo(...B); fill.quadraticCurveTo(...K, ...A);
    wall.moveTo(...B); wall.quadraticCurveTo(...K, ...A);
    return {fill, wall, towers: [qmid(B, K, A)]};
  }
  const s = city.find(d => E[(d + 3) % 4] !== 'c');
  fill.moveTo(...corner[s]);
  let i = s, n = 0;
  while (n < 4) {
    if (E[i] === 'c') { fill.lineTo(...corner[(i + 1) % 4]); i = (i + 1) % 4; n++; continue; }
    let L = 0; while (E[(i + L) % 4] !== 'c') L++;
    const from = corner[i], to = corner[(i + L) % 4];
    const p = L === 1 ? mid[i] : corner[(i + 1) % 4], f = L === 1 ? 0.88 : 0.86;
    const K = [p[0] + (C - p[0]) * f, p[1] + (C - p[1]) * f];
    fill.quadraticCurveTo(...K, ...to); wall.moveTo(...from); wall.quadraticCurveTo(...K, ...to);
    towers.push(qmid(from, K, to));
    i = (i + L) % 4; n += L;
  }
  fill.closePath();
  return {fill, wall, towers};
}

function drawTile(id) {
  const def = TYPES[id], E = def.e, R = rng(hash(id));
  const [c, g] = cv(S, S, K);
  const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, '#80be56'); gr.addColorStop(1, '#62a242');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 14; i++) { const x = R()*S, y = R()*S, r = 18 + R()*30, rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, R() < .5 ? 'rgba(40,90,25,.2)' : 'rgba(200,230,120,.16)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2*r, 2*r); }
  for (let i = 0; i < 700; i++) { g.fillStyle = R() < .5 ? 'rgba(230,255,170,.10)' : 'rgba(25,70,20,.14)'; g.fillRect(R()*S, R()*S, 1.6, 2.6); }
  g.strokeStyle = 'rgba(40,95,30,.55)'; g.lineWidth = 1.2;
  for (let i = 0; i < 38; i++) { const x = R()*S, y = R()*S; g.beginPath(); g.moveTo(x - 2.5, y - 3); g.lineTo(x, y); g.lineTo(x + 2.5, y - 3.5); g.stroke(); }
  for (let i = 0; i < 12; i++) { g.fillStyle = ['#fff6d8','#ffd75e','#f3a6c8'][i % 3]; g.beginPath(); g.arc(R()*S, R()*S, 1.7, 0, 7); g.fill(); }
  const mid = [[S/2,0],[S,S/2],[S/2,S],[0,S/2]], C = [S/2, S/2];
  const idx = k => [0,1,2,3].filter(d => E[d] === k);
  const strip = (a, b, layers) => {
    for (const [w, col, dash] of layers) {
      g.beginPath(); g.moveTo(...mid[a]);
      if (b == null) g.lineTo(...C); else g.quadraticCurveTo(C[0], C[1], ...mid[b]);
      g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'butt'; g.setLineDash(dash || []); g.stroke();
    }
    g.setLineDash([]);
  };
  // Rivers meander: two cubic curves through a point near the middle, leaving each edge at a
  // right angle so neighbouring pieces join; reeds and stones line the banks.
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const cub = (p0, p1, p2, p3, t) => { const a = lerp(p0, p1, t), b = lerp(p1, p2, t), c2 = lerp(p2, p3, t), d = lerp(a, b, t), e = lerp(b, c2, t); return [lerp(d, e, t), [e[0] - d[0], e[1] - d[1]]]; };
  const riverPath = (a, b) => {
    const A = mid[a], ia = [-V[a][0], -V[a][1]];
    if (b == null) { const M = [C[0] + (R() - .5) * 16, C[1] + (R() - .5) * 16]; return [[A, [A[0] + ia[0] * S * .22, A[1] + ia[1] * S * .22], [M[0] - ia[0] * 22 + ia[1] * S * .12, M[1] - ia[1] * 22 - ia[0] * S * .12], M]]; }
    const B = mid[b], ib = [-V[b][0], -V[b][1]];
    const M = id === 'wBr' ? [C[0], C[1]] : [C[0] + (R() - .5) * S * .24, C[1] + (R() - .5) * S * .24];
    let tx = B[0] - A[0] + (ib[0] - ia[0]) * 0, ty = B[1] - A[1]; const L = Math.hypot(tx, ty) || 1; tx = tx / L * S * .2; ty = ty / L * S * .2;
    return [[A, [A[0] + ia[0] * S * .26, A[1] + ia[1] * S * .26], [M[0] - tx, M[1] - ty], M], [M, [M[0] + tx, M[1] + ty], [B[0] + ib[0] * S * .26, B[1] + ib[1] * S * .26], B]];
  };
  const strokeSegs = (segs, w, col, dash) => { g.beginPath(); g.moveTo(...segs[0][0]); segs.forEach(q => g.bezierCurveTo(...q[1], ...q[2], ...q[3])); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'butt'; g.lineJoin = 'round'; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); };
  const along = (segs, fn) => segs.forEach((q, i) => { for (let t = .06; t < .96; t += .08) { const [pt, d] = cub(...q, t), L = Math.hypot(...d) || 1; fn(pt, [-d[1] / L, d[0] / L], (i + t) / segs.length); } });
  // Something drawn sharp, then laid down soft: shrunk and blown back up (works on every WebView, unlike ctx.filter).
  const soft = (draw, k = 4) => {
    const P = g.canvas.width; // S at K = 1
    const [t, tg] = cv(P, P, 1); tg.setTransform(g.getTransform()); draw(tg);
    const [m, mg] = cv(P / 2, P / 2, 1); mg.drawImage(t, 0, 0, P / 2, P / 2);
    const [n, ng] = cv(P / k, P / k, 1); ng.drawImage(m, 0, 0, P / k, P / k);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(n, 0, 0, P, P); g.restore();
  };
  // A river: grass darkened by the damp, a sandy bank, a thin line of foam, clear shallows by the banks and a deep
  // channel in the middle; glints run with the current, reeds and stones line the banks.
  const water = segs => {
    // The river is a ribbon, not a pipe: each bank swells and narrows on its own, but both ends are exactly the
    // standard mouth (and leave the edge straight), so every neighbour still joins.
    const ph = [R() * 6.28, R() * 6.28, R() * 6.28, R() * 6.28], amp = id === 'wBr' ? .12 : .32;
    const swell = (t, k) => 1 + amp * Math.sin(Math.PI * t) ** 2 * (.55 + .45 * Math.sin(ph[k] + t * 7.3) * Math.sin(ph[k + 2] + t * 3.1));
    const P = []; segs.forEach((q, i) => { for (let k = i ? 1 : 0; k <= 28; k++) { const t = k / 28, [pt, d] = cub(...q, t), L = Math.hypot(...d) || 1; P.push([pt, [-d[1] / L, d[0] / L], (i + t) / segs.length]); } });
    const ribbon = (q, h, col) => {
      q.beginPath();
      P.forEach(([[x, y], [nx, ny], t], k) => { const f = swell(t, 0); q[k ? 'lineTo' : 'moveTo'](x + nx * h * f, y + ny * h * f); });
      for (let k = P.length - 1; k >= 0; k--) { const [[x, y], [nx, ny], t] = P[k], f = swell(t, 1); q.lineTo(x - nx * h * f, y - ny * h * f); }
      q.closePath(); q.fillStyle = col; q.fill();
    };
    water.half = (t, sd) => swell(t, sd > 0 ? 0 : 1);
    soft(q => ribbon(q, 25, 'rgba(30,70,20,.45)'));
    for (const [h, col] of [[20, '#a8975f'], [18.5, '#d6c48e'], [16.5, '#bba872'], [15, 'rgba(240,252,255,.8)'], [14, '#46b3d3'], [11.5, '#2f93c8'], [8, '#2276b8'], [4.5, '#1c64a6']]) ribbon(g, h, col);
    soft(q => ribbon(q, 4, 'rgba(120,205,240,.55)'), 2);
    along(segs, ([x, y], [nx, ny], gt) => {
      const tx = ny, ty = -nx;
      for (const sd of [-1, 1]) {
        const r1 = R(), f = water.half(gt, sd);
        if (r1 < .35) { const bx = x + nx * sd * 21 * f, by = y + ny * sd * 21 * f; g.strokeStyle = r1 < .2 ? '#3f7d2c' : '#56932f'; g.lineWidth = 1.4; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(bx + k * 1.5, by + 3); g.lineTo(bx + k * 2.6, by - 4 - R() * 3); g.stroke(); } }
        else if (r1 < .45) { const ex = x + nx * sd * 16 * f, ey = y + ny * sd * 16 * f, rr = R(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(ex + .8, ey + 1, 2.8, 2, rr, 0, 7); g.fill(); g.fillStyle = '#9c968a'; g.beginPath(); g.ellipse(ex, ey, 2.6, 1.8, rr, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(ex - .7, ey - .6, 1.1, .7, rr, 0, 7); g.fill(); }
      }
      // glints along the current, more of them in the fast middle
      const o = (R() - .5) * 16, L = 3 + R() * 5, gx = x + nx * o, gy = y + ny * o;
      g.strokeStyle = `rgba(235,250,255,${(.35 + R() * .4).toFixed(2)})`; g.lineWidth = 1.3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(gx - tx * L, gy - ty * L); g.quadraticCurveTo(gx + nx * 1.2, gy + ny * 1.2, gx + tx * L, gy + ty * L); g.stroke(); g.lineCap = 'butt';
      if (R() < .3) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x + nx * (R() - .5) * 18, y + ny * (R() - .5) * 18, .9, 0, 7); g.fill(); }
    });
  };
  // Roads keep their shape (the owner colouring follows it) but get verges, two wheel ruts and pebbles.
  const ROAD = [[26,'rgba(60,90,30,.35)'],[22,'#80653e'],[18,'#d9bf88'],[12,'#c7a874'],[8,'#e2cb98'],[2,'rgba(150,120,70,.45)',[2,7]]];
  const roadPts = (a, b, fn) => { const A = mid[a], B = b == null ? C : mid[b]; for (let t = .08; t < .95; t += .07) { const u = 1 - t, x = b == null ? A[0] + (B[0] - A[0]) * t : u * u * A[0] + 2 * u * t * C[0] + t * t * B[0], y = b == null ? A[1] + (B[1] - A[1]) * t : u * u * A[1] + 2 * u * t * C[1] + t * t * B[1]; fn(x, y); } };
  const pebbles = (a, b) => roadPts(a, b, (x, y) => { if (R() < .55) { g.fillStyle = R() < .5 ? 'rgba(120,96,60,.55)' : 'rgba(250,236,200,.7)'; g.beginPath(); g.arc(x + (R() - .5) * 14, y + (R() - .5) * 14, .9 + R() * .9, 0, 7); g.fill(); } if (R() < .3) { g.strokeStyle = '#4f8e33'; g.lineWidth = 1.2; const sx = x + (R() < .5 ? -12 : 12) * (Math.abs(mid[a][0] - C[0]) < 1 ? 1 : 0), sy = y + (R() < .5 ? -12 : 12) * (Math.abs(mid[a][1] - C[1]) < 1 ? 1 : 0); g.beginPath(); g.moveTo(sx - 2, sy + 2); g.lineTo(sx, sy - 3); g.lineTo(sx + 2, sy + 2); g.stroke(); } });
  const w = idx('w');
  if (w.length === 2) water(riverPath(w[0], w[1])); else w.forEach(d => water(riverPath(d, null)));
  if (w.length === 1) {
    // A spring: water wells up from a mossy rock outcrop on the closed side, fills a clear round pool with rings and
    // sparkles, and spills into the river on the open side. Reeds and flowers dot the bank.
    const d0 = w[0], ux = V[d0][0], uy = V[d0][1], px = -uy, py = ux;
    const at = (f, o) => [C[0] + ux * f + px * o, C[1] + uy * f + py * o];
    // damp bank around the pool
    g.fillStyle = 'rgba(70,110,40,.35)'; g.beginPath(); g.ellipse(...at(-4, 0), 40, 34, 0, 0, 7); g.fill();
    // pool: sandy rim, deep water, bright centre
    [[31,'#a8975f'],[29.5,'#d6c48e'],[27,'#bba872'],[25.5,'rgba(240,252,255,.85)'],[24,'#46b3d3'],[19,'#2f93c8'],[13,'#2276b8'],[7,'#1b5c9c']].forEach(([r, col]) => { g.beginPath(); g.ellipse(...at(-8, 0), r, r * .9, 0, 0, 7); g.fillStyle = col; g.fill(); });
    g.strokeStyle = 'rgba(235,250,255,.8)'; g.lineWidth = 1.4; [5, 10, 15].forEach((r, k) => { g.globalAlpha = 1 - k * .25; g.beginPath(); g.ellipse(...at(-8, 0), r, r * .88, 0, 0, 7); g.stroke(); }); g.globalAlpha = 1;
    // bubbles and sparkles
    g.fillStyle = 'rgba(255,255,255,.85)'; [[-12,-4,2.4],[-3,2,1.8],[-9,5,1.4],[-14,2,1.2],[-5,-7,1.2]].forEach(([f, o, r]) => { g.beginPath(); g.arc(...at(f, o), r, 0, 7); g.fill(); });
    // rock outcrop behind the pool: stacked boulders with moss on top
    const rocks = [[-44,-20,15,11,'#7d776b'],[-48,-3,17,13,'#8d8779'],[-44,15,15,11,'#7d776b'],[-38,-9,12,10,'#a39d90'],[-38,8,12,10,'#a39d90'],[-30,-26,9,7,'#8d8779'],[-30,24,9,7,'#8d8779']];
    rocks.forEach(([f, o, rx, ry, col]) => { const [x, y] = at(f, o); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + 2, y + 3, rx, ry * .85, 0, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(x - 3, y - 3, rx * .55, ry * .45, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(90,150,60,.75)'; g.beginPath(); g.ellipse(x + rx * .25, y - ry * .5, rx * .55, ry * .3, 0, 0, 7); g.fill(); });
    // water trickling from the rocks into the pool
    g.strokeStyle = '#8fd0f6'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(...at(-34, 0)); g.quadraticCurveTo(...at(-26, 2), ...at(-20, 0)); g.stroke(); g.lineCap = 'butt';
    // reeds and flowers on the bank
    [[-14,34],[-26,38],[-6,-36],[-22,-38],[16,38],[22,-40]].forEach(([f, o], k) => { const [x, y] = at(f, o); g.strokeStyle = '#4f8a2c'; g.lineWidth = 1.8; for (let j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(x + j * 2, y + 4); g.lineTo(x + j * 4, y - 9 - R() * 3); g.stroke(); } if (k % 2) { g.fillStyle = ['#f4d35e', '#fff', '#f08fb0'][k % 3]; g.beginPath(); g.arc(x + 4, y - 4, 2.2, 0, 7); g.fill(); } });
  }
  if (def.lake) {
    // A lake over the whole card: water to the very edges, open on every river side; only the corners (and the closed
    // side of the three-way lake) stay as land with a sandy shore, reeds and stones. Flow streaks run out to every
    // river, lily pads and lotuses float on the water.
    const base = document.createElement('canvas'); base.width = c.width; base.height = c.height; base.getContext('2d').drawImage(c, 0, 0);
    const dead = [0, 1, 2, 3].filter(d => E[d] !== 'w'), RR = 50, MOUTH = 20, LIP = 24, rot = dead.length ? dead[0] * Math.PI / 2 : 0;
    const deep = g.createRadialGradient(C[0] - 10, C[1] - 12, 6, C[0], C[1], 120); deep.addColorStop(0, '#1b5c9c'); deep.addColorStop(.45, '#2276b8'); deep.addColorStop(.8, '#2f93c8'); deep.addColorStop(1, '#46b3d3');
    g.fillStyle = deep; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(225,245,255,.28)'; g.lineWidth = 1.2; g.lineCap = 'round';
    for (let k = 0; k < 10; k++) { const x = 20 + R() * (S - 40), y = 20 + R() * (S - 40); g.beginPath(); g.ellipse(x, y, 8 + R() * 9, 3 + R() * 3, (R() - .5) * .5, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(14 + R() * (S - 28), 14 + R() * (S - 28), .8 + R() * .9, 0, 7); g.fill(); }
    // The land, in the card's own frame turned so that a closed side is on top: one piece between every two river
    // mouths, running along the card's edge outside and round the corner (or along the closed side) inside. Every
    // mouth is as wide as a plain river (water 28, banks 40 across) so a neighbouring river runs straight in.
    const W = [0, 1, 2, 3].filter(e => E[(e + (dead.length ? dead[0] : 0)) % 4] === 'w'), M = [[S / 2, 0], [S, S / 2], [S / 2, S], [0, S / 2]];
    const loc = (e, u, v) => { const t = V[(e + 1) % 4]; return [M[e][0] + t[0] * u - V[e][0] * v, M[e][1] + t[1] * u - V[e][1] * v]; };
    const corner = e => loc(e, S / 2, 0); // the corner after side e, going round clockwise
    const quad = (p0, p1, p2, n) => Array.from({length: n}, (_, k) => { const t = (k + 1) / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; });
    const spline = P => { const out = []; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; for (let k = 1; k <= 8; k++) { const t = k / 8, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } } return out; };
    const land = new Path2D(), pieces = [];
    W.forEach((a, i) => {
      const b = W[(i + 1) % W.length], sides = []; for (let e = (a + 1) % 4; e !== b; e = (e + 1) % 4) sides.push(e);
      const outer = [loc(a, MOUTH, -6), ...[a, ...sides].map(e => { const [x, y] = corner(e); return [x + Math.sign(x - C[0]) * 9, y + Math.sign(y - C[1]) * 9]; }), loc(b, -MOUTH, -6)];
      // inside, from mouth b back to mouth a along a round shore: about 80 px from the middle, drawn in towards a
      // closed side, with a gentle wobble so it never looks ruled
      const ang = q => Math.atan2(q[1] - C[1], q[0] - C[0]), from = loc(b, -MOUTH - 9, LIP + 4), to = loc(a, MOUTH + 9, LIP + 4);
      let tb = ang(from), ta = ang(to); while (tb <= ta) tb += 2 * Math.PI;
      const closedAt = [0, 1, 2, 3].filter(e => !W.includes(e)).map(e => Math.atan2(V[e][1], V[e][0]));
      const radius = th => 80 - closedAt.reduce((m, c) => Math.max(m, 30 * Math.max(0, Math.cos(th - c)) ** 1.5), 0) + 3.5 * Math.sin(th * 5 + a * 1.7);
      const n = Math.max(2, Math.ceil((tb - ta) / .32)), pts = [];
      for (let k = 1; k < n; k++) { const th = tb - (tb - ta) * k / n; pts.push([C[0] + Math.cos(th) * radius(th), C[1] + Math.sin(th) * radius(th)]); }
      // each mouth leaves the edge straight for a few pixels, then opens out like a funnel into the lake
      const inner = [loc(b, -MOUTH, 0), ...spline([loc(b, -MOUTH, 0), loc(b, -MOUTH, 8), from, ...pts, to, loc(a, MOUTH, 8), loc(a, MOUTH, 0)])];
      const all = [...outer, ...inner]; land.moveTo(...all[0]); all.slice(1).forEach(q => land.lineTo(...q)); land.closePath();
      pieces.push({inner, mid: outer.reduce((m, q) => [m[0] + q[0] / outer.length, m[1] + q[1] / outer.length], [0, 0])});
    });
    // clear turquoise shallows along every shore, the bank's shadow on the water, a soft light from the sky
    const inLand = q => { q.translate(C[0], C[1]); q.rotate(rot); q.translate(-C[0], -C[1]); };
    soft(q => { inLand(q); q.lineJoin = 'round'; q.lineWidth = 46; q.strokeStyle = 'rgba(95,205,222,.85)'; q.stroke(land); });
    soft(q => { q.fillStyle = 'rgba(255,255,255,.22)'; q.beginPath(); q.ellipse(C[0] - 22, C[1] - 26, 34, 14, -.5, 0, 7); q.fill(); });
    soft(q => { q.translate(2, 4); inLand(q); q.fillStyle = 'rgba(8,40,70,.55)'; q.fill(land); }, 8);
    // is a point on open water, well clear of the land and of the mouths? (undo the card's rotation first)
    const probe = document.createElement('canvas').getContext('2d');
    const onWater = (x, y) => {
      const dx = x - C[0], dy = y - C[1], cx = dx * Math.cos(rot) + dy * Math.sin(rot) + C[0], cy = -dx * Math.sin(rot) + dy * Math.cos(rot) + C[1];
      const offMouths = w.every(d => { const v = (x - mid[d][0]) * -V[d][0] + (y - mid[d][1]) * -V[d][1], u = Math.abs((x - mid[d][0]) * V[d][1] - (y - mid[d][1]) * V[d][0]); return v > LIP + 22 || u < MOUTH - 8; });
      return offMouths && [[0, 0], [16, 0], [-16, 0], [0, 16], [0, -16], [11, 11], [-11, 11], [11, -11], [-11, -11]].every(([ox, oy]) => !probe.isPointInPath(land, cx + ox, cy + oy));
    };
    const clearOfRivers = (x, y) => w.every(d => { const ax = mid[d][0] - C[0], ay = mid[d][1] - C[1], L = Math.hypot(ax, ay), t = Math.max(0, Math.min(1, ((x - C[0]) * ax + (y - C[1]) * ay) / (L * L))); return Math.hypot(x - C[0] - ax * t, y - C[1] - ay * t) > 15; });
    let pads = 0;
    for (let tries = 0; tries < 160 && pads < 9; tries++) {
      const x = 22 + R() * (S - 44), y = 22 + R() * (S - 44);
      if (!onWater(x, y) || !clearOfRivers(x, y)) continue;
      const rr = 7 + R() * 5, a0 = R() * 6.28;
      g.fillStyle = 'rgba(0,40,80,.28)'; g.beginPath(); g.ellipse(x + 1.5, y + 2, rr, rr * .8, 0, 0, 7); g.fill();
      g.save(); g.translate(x, y); g.scale(1, .82);
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, rr, a0 + .3, a0 + 6.28 - .3); g.closePath();
      const lg = g.createRadialGradient(-rr * .3, -rr * .3, 1, 0, 0, rr); lg.addColorStop(0, '#7cc65a'); lg.addColorStop(1, '#2f8a3e');
      g.fillStyle = lg; g.fill(); g.strokeStyle = '#256b30'; g.lineWidth = 1; g.stroke();
      g.strokeStyle = 'rgba(210,245,170,.5)'; g.lineWidth = .7; for (let v = 0; v < 4; v++) { const q = a0 + 1 + v * 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(q) * rr * .85, Math.sin(q) * rr * .85); g.stroke(); }
      g.restore();
      if (pads % 3 === 1) {
        const pink = pads % 2 === 1;
        for (let k = 0; k < 8; k++) { const q = k / 8 * 6.28; g.fillStyle = k % 2 ? (pink ? '#f7b4d2' : '#ffffff') : (pink ? '#ec7fb0' : '#e9f2ff'); g.beginPath(); g.ellipse(x + Math.cos(q) * 3.4, y - 1 + Math.sin(q) * 2.8, 3.6, 1.8, q, 0, 7); g.fill(); }
        g.fillStyle = '#ffd75e'; g.beginPath(); g.arc(x, y - 1, 1.8, 0, 7); g.fill();
      }
      pads++;
    }
    // the land goes back (built above), then a sandy shore along its edge
    g.save(); g.translate(C[0], C[1]); g.rotate(rot); g.translate(-C[0], -C[1]);
    // the bank, as on a river (dark edge, dry sand, wet sand, foam): stroked on the line, then the grass laid back
    // over its land half so only the water half shows
    g.lineJoin = 'round';
    for (const [lw, col] of [[12, 'rgba(240,252,255,.85)'], [10, '#bba872'], [7, '#d6c48e'], [3, '#a8975f']]) { g.lineWidth = lw; g.strokeStyle = col; g.stroke(land); }
    g.save(); g.clip(land); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(base, 0, 0); g.restore();
    // damp, darker grass right by the water
    g.save(); g.clip(land); soft(q => { q.lineWidth = 16; q.strokeStyle = 'rgba(30,70,20,.5)'; q.stroke(land); }, 4); g.restore();
    g.restore();
    // reeds, cattails and stones along the shore
    const shore = [];
    for (const {inner, mid: m} of pieces) for (let k = 0; k < 10; k++) {
      // a point on the shore, pushed 7 px out over the water (away from the land's middle)
      const i = 1 + ((R() * (inner.length - 2)) | 0), [x, y] = inner[i], [x0, y0] = inner[i - 1], [x1, y1] = inner[i + 1];
      let nx = y1 - y0, ny = x0 - x1; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      if (nx * (x - m[0]) + ny * (y - m[1]) < 0) { nx = -nx; ny = -ny; }
      // reeds stand upright on the card as drawn, so turn the point back into the card's frame
      const px = x + nx * 7 - C[0], py = y + ny * 7 - C[1];
      shore.push([px * Math.cos(rot) - py * Math.sin(rot) + C[0], px * Math.sin(rot) + py * Math.cos(rot) + C[1]]);
    }
    for (const [bx, by] of shore) {
      if (bx < 4 || by < 4 || bx > S - 4 || by > S - 4) continue;
      const lean = (R() - .5) * 5, tall = 12 + R() * 9;
      g.strokeStyle = R() < .5 ? '#3f7d2c' : '#56932f'; g.lineWidth = 1.5; g.lineCap = 'round';
      for (let j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(bx + j * 2.4, by + 3); g.quadraticCurveTo(bx + j * 2.8 + lean * .4, by - tall * .5, bx + j * 3 + lean, by - tall + Math.abs(j) * 3); g.stroke(); }
      if (R() < .45) { g.strokeStyle = '#4c8a30'; g.beginPath(); g.moveTo(bx + 1, by + 3); g.lineTo(bx + 1 + lean * .6, by - tall - 3); g.stroke(); g.fillStyle = '#7a4f2c'; g.beginPath(); g.ellipse(bx + 1 + lean * .6, by - tall - 6, 1.9, 4.4, 0, 0, 7); g.fill(); }
    }
    g.lineCap = 'butt';
    for (let k = 0; k < 14; k++) { const [bx, by] = shore[(R() * shore.length) | 0]; g.fillStyle = k % 3 ? '#a39d90' : '#8a8476'; g.beginPath(); g.ellipse(bx + (R() - .5) * 10, by + 6 + R() * 4, 3.5 + R() * 2, 2.4, R(), 0, 7); g.fill(); }
    // the mouths: the plain river's own bands right at the edge, its channel melting softly into the lake
    const BANDS = [[40, '#a8975f', 4], [37, '#d6c48e', 4], [33, '#bba872', 4], [30, 'rgba(240,252,255,.8)', 4], [28, 'rgba(70,179,211,1)', LIP + 4], [23, 'rgba(47,147,200,1)', LIP + 12], [16, 'rgba(34,118,184,1)', LIP + 18], [9, 'rgba(28,100,166,1)', LIP + 22]];
    const mouth = (d, q, cut) => {
      const A = mid[d], ix = -V[d][0], iy = -V[d][1], at = v => [A[0] + ix * v, A[1] + iy * v];
      const fade = (q, col, v) => { const gr = q.createLinearGradient(...A, ...at(v)); gr.addColorStop(0, col); gr.addColorStop(.3, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); return gr; };
      const band = (q, lw, col, v, cut) => { q.beginPath(); q.moveTo(...A); q.lineTo(...at(cut ? Math.min(v, cut) : v)); q.lineWidth = lw; q.lineCap = 'butt'; q.strokeStyle = col.startsWith('#') ? col : fade(q, col, v); q.stroke(); };
      (cut ? BANDS : BANDS.slice(4)).forEach(([lw, col, v]) => band(q, lw, col, v, cut));
    };
    soft(q => w.forEach(d => mouth(d, q)), 4);
    w.forEach(d => mouth(d, g, 5));
  }
  const r = idx('r');
  if (r.length === 2) { strip(r[0], r[1], ROAD); pebbles(r[0], r[1]); } else r.forEach(d => { strip(d, null, ROAD); pebbles(d, null); });
  if (def.end === 'cliff') { /* the chasm is painted below */ }
  else if (def.end) { g.beginPath(); g.ellipse(C[0], C[1], 22, 18, 0, 0, 7); g.fillStyle = '#c7a874'; g.fill(); g.beginPath(); g.ellipse(C[0], C[1], 17, 13, 0, 0, 7); g.fillStyle = '#d9bf88'; g.fill(); }
  else if (r.length >= 3 || (r.length === 1 && !def.fort && !def.bridge)) {
    g.beginPath(); g.arc(C[0], C[1], 15, 0, 7); g.fillStyle = '#7a603b'; g.fill();
    g.beginPath(); g.arc(C[0], C[1], 12, 0, 7); g.fillStyle = '#d9bf88'; g.fill();
    g.beginPath(); g.arc(C[0], C[1], 5, 0, 7); g.fillStyle = '#5a6e7c'; g.fill(); g.strokeStyle = '#8b8478'; g.lineWidth = 2.5; g.stroke();
  }
  if (def.rocks) for (let k = 0; k < 10; k++) { g.fillStyle = 'rgba(110,100,85,.35)'; g.beginPath(); g.ellipse(30 + R() * 132, 30 + R() * 132, 3 + R() * 4, 2 + R() * 2, R() * 3, 0, 7); g.fill(); }
  if (id === 'wBr') {
    // small humpbacked wooden bridge: shadow on the water, planks, side beams, posts and rails
    g.fillStyle = 'rgba(0,30,60,.35)'; g.beginPath(); g.ellipse(C[0] + 3, C[1] + 5, 32, 17, 0, 0, 7); g.fill();
    const pl = g.createLinearGradient(0, C[1] - 15, 0, C[1] + 15); pl.addColorStop(0, '#c08a4d'); pl.addColorStop(.5, '#a8743f'); pl.addColorStop(1, '#8a5a2e');
    g.fillStyle = pl; g.fillRect(C[0] - 32, C[1] - 14, 64, 28);
    g.fillStyle = 'rgba(60,35,15,.55)'; for (let x = C[0] - 30; x < C[0] + 32; x += 5.5) g.fillRect(x, C[1] - 14, 1.2, 28);
    g.fillStyle = 'rgba(255,230,190,.25)'; g.fillRect(C[0] - 32, C[1] - 14, 64, 4);
    for (const y of [C[1] - 17, C[1] + 13]) { g.fillStyle = '#5d3c1d'; g.fillRect(C[0] - 34, y, 68, 4); g.fillStyle = '#7e532a'; g.fillRect(C[0] - 34, y, 68, 1.5); for (let x = C[0] - 33; x <= C[0] + 30; x += 15.5) { g.fillStyle = '#4a2f17'; g.fillRect(x, y - 3, 4, 7); } }
  }
  if (id === 'brHalf') {
    // one half of a big stone bridge over a wide water: the other half is the same piece turned round
    const lake = new Path2D(); lake.moveTo(S, S * .14); lake.bezierCurveTo(S * .6, S * .12, S * .38, S * .3, S * .4, S * .5); lake.bezierCurveTo(S * .38, S * .7, S * .6, S * .88, S, S * .86); lake.closePath();
    g.save(); g.fillStyle = '#cdbf86'; g.lineWidth = 12; g.strokeStyle = '#cdbf86'; g.stroke(lake); g.fill(lake); g.restore();
    const wg = g.createLinearGradient(S * .4, 0, S, 0); wg.addColorStop(0, '#4a9fe3'); wg.addColorStop(1, '#2a6fb4'); g.fillStyle = wg; g.fill(lake);
    g.save(); g.clip(lake); g.strokeStyle = 'rgba(225,245,255,.5)'; g.lineWidth = 1.2; for (let k = 0; k < 9; k++) { const x = S * .5 + R() * S * .48, y = S * .2 + R() * S * .6; g.beginPath(); g.arc(x, y, 4 + R() * 3, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } g.restore();
    g.strokeStyle = '#3f7d2c'; g.lineWidth = 1.4; for (let k = 0; k < 8; k++) { const t = R(), x = S * .42 + Math.sin(t * 3.14) * -4, y = S * (.25 + t * .5); g.beginPath(); g.moveTo(x - 8, y + 3); g.lineTo(x - 9 - R() * 2, y - 5); g.stroke(); }
    // arches: dark half-moons under both parapets, then the deck, paving and parapets with copings
    g.fillStyle = 'rgba(0,25,55,.45)'; for (const x of [S * .62, S * .9]) for (const sy of [-1, 1]) { g.beginPath(); g.ellipse(x, C[1] + sy * 22, 13, 9, 0, 0, 7); g.fill(); }
    const dk = g.createLinearGradient(0, C[1] - 18, 0, C[1] + 18); dk.addColorStop(0, '#d6ccb6'); dk.addColorStop(.5, '#c2b69c'); dk.addColorStop(1, '#a89b80');
    g.fillStyle = dk; g.fillRect(S * .36, C[1] - 18, S * .64, 36);
    g.strokeStyle = 'rgba(80,70,55,.35)'; g.lineWidth = .8; for (let x = S * .36 + 6; x < S; x += 9) { g.beginPath(); g.moveTo(x, C[1] - 12); g.lineTo(x, C[1] + 12); g.stroke(); }
    g.beginPath(); g.moveTo(S * .36, C[1]); g.lineTo(S, C[1]); g.stroke();
    for (const y of [C[1] - 21, C[1] + 15]) { g.fillStyle = '#8f8470'; g.fillRect(S * .34, y, S * .66, 6); g.fillStyle = '#e4dbc6'; g.fillRect(S * .34, y, S * .66, 2); for (let x = S * .34; x < S; x += 12) { g.fillStyle = 'rgba(60,50,40,.35)'; g.fillRect(x, y, 1, 6); } }
    g.fillStyle = '#7d725f'; g.fillRect(S * .33, C[1] - 23, 6, 46);
  }
  if (def.end === 'cliff') {
    // A torn card: the far half is simply not there. The kept half ends in a crumbling edge (soil, roots, loose stones)
    // the far half is made transparent, the 3D rim is built in CSS.
    const d0 = r[0], H = S / 2 + 3;
    g.save(); g.translate(C[0], C[1]); g.rotate(Math.atan2(-V[d0][1], -V[d0][0]));
    const void_ = new Path2D(); void_.rect(0, -H, H, 2 * H);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fill(void_); g.globalCompositeOperation = 'source-over';
    // crumbling rim along the tear, drawn on the kept side
    for (const [w2, col] of [[10, 'rgba(60,40,22,.55)'], [6, '#7a5a38'], [3, '#a98255']]) { g.strokeStyle = col; g.lineWidth = w2; g.beginPath(); g.moveTo(-w2 / 2 + 1, -H); g.lineTo(-w2 / 2 + 1, H); g.stroke(); }
    for (let y = -H + 4; y < H; y += 7 + R() * 5) { g.fillStyle = R() < .5 ? '#8a6a44' : '#5e4630'; g.beginPath(); g.moveTo(-1, y - 3); g.lineTo(-6 - R() * 7, y + R() * 3); g.lineTo(-1, y + 4); g.closePath(); g.fill(); }
    for (let y = -H + 10; y < H; y += 14 + R() * 12) { g.strokeStyle = '#4f8e33'; g.lineWidth = 1.2; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(-9 - R() * 4, y + k * 2); g.lineTo(-13 - R() * 4, y + k * 2 + 3 + R() * 3); g.stroke(); } }
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#a39d90' : '#8a8476'; g.beginPath(); g.ellipse(-12 - R() * 14, (R() - .5) * 150, 2.4 + R() * 2.4, 1.8 + R() * 1.2, R() * 3, 0, 7); g.fill(); }
    g.restore();
  }
  const cp = cityPaths(E);
  if (cp) {
    // Town, as on the icon and the banner: warm cobbles, lanes from every town edge to the square, houses of every
    // size along the lanes (gabled roofs turned to the street), gardens and gazebos in the gaps; a market (stalls under
    // striped awnings) round the well of a two-sided town, round a keep with corner towers in a big one; a crenellated
    // wall with round towers. The square, the stalls and the keep sit where tools/blender_generators/generate_tiles.py
    // puts them in 3D, so keep their rules in step (town_layout there).
    const city = idx('c'), Kp = g.getTransform().a;
    const tc = city.length === 4 ? C : (() => {
      const m = city.reduce((o, d) => [o[0] + mid[d][0], o[1] + mid[d][1]], [0, 0]).map(v => v / city.length);
      const f = city.length === 1 ? .72 : .5;   // a small town keeps its keep deep inside, clear of the wall tower
      return [C[0] + (m[0] - C[0]) * f, C[1] + (m[1] - C[1]) * f];
    })();
    const big = city.length >= 3, SQ = big ? 30 : 24, STALL_R = big ? 25 : 21, KEEP = big ? 1 : city.length > 1 ? .78 : .62;
    const stalls = city.length > 1 ? [45, 135, 225, 315].map(a => [tc[0] + Math.cos(a * Math.PI / 180) * STALL_R, tc[1] + Math.sin(a * Math.PI / 180) * STALL_R, a]) : [];
    const lanes = city.map(d => {
      const side = d % 2 ? 1 : -1, k2 = [(mid[d][0] + tc[0]) / 2 + V[d][1] * 6 * side, (mid[d][1] + tc[1]) / 2 - V[d][0] * 6 * side], pts = [];
      for (let i = 0; i <= 14; i++) { const t = i / 14, u = 1 - t; pts.push([u * u * mid[d][0] + 2 * u * t * k2[0] + t * t * tc[0], u * u * mid[d][1] + 2 * u * t * k2[1] + t * t * tc[1]]); }
      return pts;
    });
    const laneDist = (x, y) => Math.min(...lanes.map(pts => Math.min(...pts.map(([px, py]) => Math.hypot(px - x, py - y)))));
    g.save(); g.clip(cp.fill);
    g.fillStyle = '#c4a67c'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = ['rgba(120,96,64,.32)', 'rgba(250,236,206,.42)', 'rgba(170,140,100,.35)'][i % 3];
      g.beginPath(); g.ellipse(R() * S, R() * S, 1.9 + R(), 1.3 + R() * .6, R() * 3, 0, 7); g.fill();
    }
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [lw, col, dash] of [[12, 'rgba(120,92,60,.45)'], [9, '#e0cba3'], [2, 'rgba(160,130,90,.5)', [2, 4]]]) {
      for (const pts of lanes) { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.lineWidth = lw; g.strokeStyle = col; g.setLineDash(dash || []); g.stroke(); }
    }
    g.setLineDash([]);
    // every town has its keep: a stone square with a courtyard, four round corner towers and a banner
    // (smaller in a small town); tools/blender_generators/generate_tiles.py builds it on the same spot (p_keep)
    const keep = (kx, ky, k) => {
      g.save(); g.translate(kx, ky); g.scale(k, k);
      g.fillStyle = 'rgba(30,18,8,.35)'; g.fillRect(-9, -7.5, 20, 20);
      g.fillStyle = '#7d7464'; g.fillRect(-10.5, -10.5, 21, 21);
      g.fillStyle = '#cfc4ad'; g.fillRect(-9, -9, 18, 18);
      g.fillStyle = '#b0a58e'; g.fillRect(-5, -5, 10, 10);
      g.fillStyle = '#7d7464'; for (let k3 = -8; k3 <= 8; k3 += 4) { g.fillRect(k3 - .8, -10.5, 1.6, 1.6); g.fillRect(k3 - .8, 8.9, 1.6, 1.6); g.fillRect(-10.5, k3 - .8, 1.6, 1.6); g.fillRect(8.9, k3 - .8, 1.6, 1.6); }
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const tx = sx * 10, ty = sy * 10;
        g.fillStyle = '#6d665a'; g.beginPath(); g.arc(tx, ty, 4.6, 0, 7); g.fill();
        const rg = g.createRadialGradient(tx - 1, ty - 1.2, .4, tx, ty, 3.8); rg.addColorStop(0, '#f08a68'); rg.addColorStop(.6, '#c8503a'); rg.addColorStop(1, '#8f3020');
        g.fillStyle = rg; g.beginPath(); g.arc(tx, ty, 3.6, 0, 7); g.fill();
      }
      // the banner seen from above: a swallow-tailed cloth with its shadow and a gold finial
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(1.2, .2); g.quadraticCurveTo(4.5, -.6, 8.2, 1); g.lineTo(6.6, 2.4); g.lineTo(8.2, 3.8); g.quadraticCurveTo(4.5, 4.6, 1.2, 3.6); g.fill();
      g.fillStyle = '#d9361f'; g.beginPath(); g.moveTo(0, -1.2); g.quadraticCurveTo(3.5, -2.2, 7.2, -.4); g.lineTo(5.6, 1); g.lineTo(7.2, 2.4); g.quadraticCurveTo(3.5, 3.4, 0, 2.2); g.fill();
      g.fillStyle = '#f2c14e'; g.fillRect(0, -1.3, .9, 3.6); g.beginPath(); g.arc(0, -1.4, .9, 0, 7); g.fill();
      g.restore();
    };
    const square = city.length > 1;
    if (square) {   // the square: a paved round with the keep in the middle
      g.fillStyle = 'rgba(120,92,60,.4)'; g.beginPath(); g.arc(tc[0], tc[1], SQ + 1.5, 0, 7); g.fill();
      g.fillStyle = '#e4d2ad'; g.beginPath(); g.arc(tc[0], tc[1], SQ, 0, 7); g.fill();
      g.strokeStyle = 'rgba(150,120,80,.35)'; g.lineWidth = .7; for (let r2 = 5; r2 < SQ; r2 += 4.5) { g.beginPath(); g.arc(tc[0], tc[1], r2, 0, 7); g.stroke(); }
    } else {        // a small town: a little paved yard round its keep
      g.fillStyle = 'rgba(120,92,60,.4)'; g.beginPath(); g.arc(tc[0], tc[1], 11.5, 0, 7); g.fill();
      g.fillStyle = '#e4d2ad'; g.beginPath(); g.arc(tc[0], tc[1], 10.5, 0, 7); g.fill();
    }
    keep(tc[0], tc[1], KEEP);
    if (square) {
      // market stalls round the square: a striped awning over a counter, turned to the middle
      const AWN = [['#d9433a', '#f4ece0'], ['#3f78c8', '#eef2f8'], ['#e0a83a', '#fbf2dc'], ['#3fa060', '#eef8f0']];
      stalls.forEach(([sx, sy, a], i) => {
        const [c1, c2] = AWN[i % AWN.length];
        g.save(); g.translate(sx, sy); g.rotate(a * Math.PI / 180 + Math.PI / 2);
        g.fillStyle = 'rgba(30,18,8,.3)'; g.fillRect(-4.6 + 1.3, -3.2 + 1.6, 9.2, 6.4);
        for (let k3 = 0; k3 < 6; k3++) { g.fillStyle = k3 % 2 ? c2 : c1; g.fillRect(-4.6 + k3 * 9.2 / 6, -3.2, 9.2 / 6 + .05, 6.4); }
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-4.6, .4, 9.2, 2.8);
        g.strokeStyle = 'rgba(40,20,10,.5)'; g.lineWidth = .6; g.strokeRect(-4.6, -3.2, 9.2, 6.4);
        g.restore();
      });
    }
    const ROOFS = [['#d0573e', '#913222'], ['#d97a43', '#9c4c25'], ['#b4472f', '#76291b'], ['#6a8098', '#3d4e60'], ['#d1a24a', '#8d6620'], ['#9a6440', '#62391f']];
    const homes = [];
    for (let y = 5, row = 0; y < S; y += 16, row++) for (let x = row % 2 ? 5 : 13; x < S; x += 16) {
      const px = x + (R() - .5) * 6, py = y + (R() - .5) * 6;
      if (!g.isPointInPath(cp.fill, px * Kp, py * Kp)) continue;
      if (cp.wall) { g.lineWidth = 20; if (g.isPointInStroke(cp.wall, px * Kp, py * Kp)) continue; }
      if (laneDist(px, py) < 9 || Math.hypot(px - tc[0], py - tc[1]) < (square ? SQ + 7 : 18)) continue;
      homes.push([px, py]);
    }
    for (const [px, py] of homes) {
      const r0 = R();
      if (r0 < .07) {   // a gazebo: an eight-sided roof on a little green
        g.fillStyle = '#6fb050'; g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill();
        g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); for (let k3 = 0; k3 < 8; k3++) { const q = k3 / 8 * 6.283 + .39; g[k3 ? 'lineTo' : 'moveTo'](px + 1.4 + Math.cos(q) * 5, py + 1.8 + Math.sin(q) * 5); } g.fill();
        g.fillStyle = '#9a5a34'; g.beginPath(); for (let k3 = 0; k3 < 8; k3++) { const q = k3 / 8 * 6.283 + .39; g[k3 ? 'lineTo' : 'moveTo'](px + Math.cos(q) * 5, py + Math.sin(q) * 5); } g.fill();
        g.strokeStyle = 'rgba(255,225,180,.55)'; g.lineWidth = .5; for (let k3 = 0; k3 < 8; k3++) { const q = k3 / 8 * 6.283 + .39; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(q) * 5, py + Math.sin(q) * 5); g.stroke(); }
        g.fillStyle = '#f2b84b'; g.beginPath(); g.arc(px, py, 1, 0, 7); g.fill();
        continue;
      }
      if (r0 < .17) {   // a garden: a fruit tree
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(px + 1.6, py + 2, 6, 0, 7); g.fill();
        g.fillStyle = '#3f7f33'; g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill();
        g.fillStyle = '#5fa547'; g.beginPath(); g.arc(px - 1.5, py - 1.5, 3.8, 0, 7); g.fill();
        g.fillStyle = '#d8423a'; g.beginPath(); g.arc(px + 2.4, py + .8, .9, 0, 7); g.fill();
        continue;
      }
      // turned to the nearest lane, so the town reads as streets, not as a grid; small cottages to long rows
      let best = null, bd = 1e9;
      for (const pts of lanes) for (const q of pts) { const dd = Math.hypot(q[0] - px, q[1] - py); if (dd < bd) { bd = dd; best = q; } }
      const ang = best ? Math.atan2(best[1] - py, best[0] - px) + Math.PI / 2 : 0;
      const sz = R(), ww = sz < .3 ? 9 + R() * 2 : sz < .8 ? 12 + R() * 3 : 16 + R() * 3, hh = 8 + R() * 2.5, [lt, dk] = ROOFS[(R() * ROOFS.length) | 0];
      g.save(); g.translate(px, py); g.rotate(Math.round(ang / (Math.PI / 2)) * Math.PI / 2 + (R() - .5) * .35);
      g.fillStyle = 'rgba(30,18,8,.32)'; g.fillRect(-ww / 2 + 1.8, -hh / 2 + 2.2, ww, hh);
      g.fillStyle = lt; g.fillRect(-ww / 2, -hh / 2, ww, hh / 2);
      g.fillStyle = dk; g.fillRect(-ww / 2, 0, ww, hh / 2);
      g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = .5;
      for (let k3 = -ww / 2 + 2.5; k3 < ww / 2; k3 += 2.5) { g.beginPath(); g.moveTo(k3, -hh / 2); g.lineTo(k3, hh / 2); g.stroke(); }
      g.fillStyle = 'rgba(255,240,215,.55)'; g.fillRect(-ww / 2, -.55, ww, 1.1);
      g.strokeStyle = 'rgba(40,20,10,.45)'; g.lineWidth = .7; g.strokeRect(-ww / 2, -hh / 2, ww, hh);
      if (R() < .4) { g.fillStyle = '#7a5038'; g.fillRect(ww * .18, -hh / 2 + 1, 2.4, 2.6); g.fillStyle = '#3c2a1e'; g.fillRect(ww * .18, -hh / 2 + 1, 2.4, .8); }
      g.restore();
    }
    if (cp.wall) soft(q => { q.lineWidth = 24; q.strokeStyle = 'rgba(50,30,12,.38)'; q.stroke(cp.wall); }, 4);
    g.restore();
    if (cp.wall) {
      g.lineJoin = 'round'; g.lineCap = 'round';
      // a crenellated stone wall: shadow, merlons, the stone body, the walkway, mortar lines
      for (const [lw, col, dash] of [[16, 'rgba(0,0,0,.3)'], [14.5, '#55504a', [3.2, 2.6]], [10.5, '#8f8675'], [7, '#e6dcc6'], [7, '#b3a890', [2.6, 3.4]], [1, 'rgba(70,60,48,.5)']]) { g.setLineDash(dash || []); g.lineWidth = lw; g.strokeStyle = col; g.stroke(cp.wall); }
      g.setLineDash([]);
      for (const [tx, ty] of cp.towers) {   // a round tower seen from above: stone ring, battlements, a red cone roof
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(tx + 1.8, ty + 2.4, 8.5, 0, 7); g.fill();
        g.fillStyle = '#6d665a'; g.beginPath(); g.arc(tx, ty, 8.5, 0, 7); g.fill();
        g.fillStyle = '#d7cdb7'; g.beginPath(); g.arc(tx, ty, 7, 0, 7); g.fill();
        g.fillStyle = '#6d665a';
        for (let k3 = 0; k3 < 8; k3++) { const q = k3 / 8 * 6.283; g.fillRect(tx + Math.cos(q) * 6.6 - 1, ty + Math.sin(q) * 6.6 - 1, 2, 2); }
        const rg = g.createRadialGradient(tx - 1.6, ty - 1.8, .5, tx, ty, 5.4);
        rg.addColorStop(0, '#f08a68'); rg.addColorStop(.6, '#c8503a'); rg.addColorStop(1, '#8f3020');
        g.fillStyle = rg; g.beginPath(); g.arc(tx, ty, 5.2, 0, 7); g.fill();
      }
    }
  }
  if (def.fort) {
    // Monastery (the card the game scores with 9 when all 8 neighbours are laid): a low stone enclosure with a gate
    // to the south, a church with a cross-shaped roof and an apse, a bell tower with a cross, a cloister round
    // a garden with a fountain, a vegetable plot. tools/blender_generators/generate_tiles.py builds it in 3D on the
    // same spots (p_monastery), so keep the two in step.
    const rr = (x, y, w2, h2, rad) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w2, h2, rad) : g.rect(x, y, w2, h2); };
    const roof = (x, y, w2, h2, vertical, lt, dk) => {   // a gabled roof seen from above: lit and shaded halves, ridge
      g.fillStyle = 'rgba(30,18,8,.32)'; g.fillRect(x + 2, y + 2.6, w2, h2);
      if (vertical) { g.fillStyle = lt; g.fillRect(x, y, w2 / 2, h2); g.fillStyle = dk; g.fillRect(x + w2 / 2, y, w2 / 2, h2); g.fillStyle = 'rgba(255,240,215,.6)'; g.fillRect(x + w2 / 2 - .6, y, 1.2, h2); }
      else { g.fillStyle = lt; g.fillRect(x, y, w2, h2 / 2); g.fillStyle = dk; g.fillRect(x, y + h2 / 2, w2, h2 / 2); g.fillStyle = 'rgba(255,240,215,.6)'; g.fillRect(x, y + h2 / 2 - .6, w2, 1.2); }
      g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = .5;
      if (vertical) for (let k3 = 3; k3 < h2; k3 += 3) { g.beginPath(); g.moveTo(x, y + k3); g.lineTo(x + w2, y + k3); g.stroke(); }
      else for (let k3 = 3; k3 < w2; k3 += 3) { g.beginPath(); g.moveTo(x + k3, y); g.lineTo(x + k3, y + h2); g.stroke(); }
      g.strokeStyle = 'rgba(40,20,10,.5)'; g.lineWidth = .7; g.strokeRect(x, y, w2, h2);
    };
    const [cx, cy] = C;
    // enclosure: shadow, stone wall, the green inside, gravel paths, the gate
    g.fillStyle = 'rgba(0,0,0,.25)'; rr(cx - 42, cy - 40, 88, 88, 14); g.fill();
    g.fillStyle = '#8f8675'; rr(cx - 44, cy - 44, 88, 88, 14); g.fill();
    g.fillStyle = '#d8ceb6'; rr(cx - 41, cy - 41, 82, 82, 12); g.fill();
    g.fillStyle = '#86c062'; rr(cx - 38, cy - 38, 76, 76, 10); g.fill();
    g.fillStyle = '#e2d3ae'; g.fillRect(cx - 3.5, cy + 14, 7, 30); g.fillRect(cx - 34, cy + 2, 68, 6);
    g.fillStyle = '#e2d3ae'; g.fillRect(cx - 6, cy + 38, 12, 8);   // the gate
    g.fillStyle = '#6d4a2e'; g.fillRect(cx - 6, cy + 41, 2, 4); g.fillRect(cx + 4, cy + 41, 2, 4);
    // vegetable plot: dark soil, rows of greens
    g.fillStyle = '#7a5a3a'; g.fillRect(cx - 34, cy + 12, 24, 24);
    for (let r2 = 0; r2 < 4; r2++) for (let k3 = 0; k3 < 6; k3++) { g.fillStyle = (r2 + k3) % 3 ? '#5fa547' : '#9bd060'; g.beginPath(); g.arc(cx - 31 + k3 * 3.8, cy + 15.5 + r2 * 5.6, 1.4, 0, 7); g.fill(); }
    // cloister: a slate-roofed walk round a little garden with a fountain
    g.fillStyle = 'rgba(30,18,8,.3)'; g.fillRect(cx + 10 + 2, cy + 12 + 2.5, 26, 26);
    g.fillStyle = '#6a8098'; g.fillRect(cx + 10, cy + 12, 26, 26);
    g.fillStyle = '#3d4e60'; g.fillRect(cx + 10, cy + 24, 26, 14);
    g.fillStyle = '#7cc05a'; g.fillRect(cx + 16, cy + 18, 14, 14);
    g.fillStyle = '#8f8778'; g.beginPath(); g.arc(cx + 23, cy + 25, 3.4, 0, 7); g.fill();
    g.fillStyle = '#2f7fc0'; g.beginPath(); g.arc(cx + 23, cy + 25, 2, 0, 7); g.fill();
    // church: transept across, nave along, a round apse to the north
    g.fillStyle = 'rgba(30,18,8,.3)'; g.beginPath(); g.arc(cx + 2, cy - 31.5, 10, 0, 7); g.fill();
    const ap = g.createRadialGradient(cx - 3, cy - 36, 1, cx, cy - 33, 10); ap.addColorStop(0, '#e06a4c'); ap.addColorStop(1, '#8f3020');
    g.fillStyle = ap; g.beginPath(); g.arc(cx, cy - 33, 10, Math.PI, 0); g.fill();
    roof(cx - 10, cy - 33, 20, 46, true, '#cf5a40', '#8f3020');
    roof(cx - 26, cy - 22, 52, 15, false, '#cf5a40', '#8f3020');
    // bell tower at the west front of the nave: a pyramid roof and a gold cross
    const bx = cx, by = cy + 15;
    g.fillStyle = 'rgba(30,18,8,.35)'; g.fillRect(bx - 7 + 2, by - 7 + 2.6, 14, 14);
    g.fillStyle = '#b7ab92'; g.fillRect(bx - 7, by - 7, 14, 14);
    for (const [pts, col] of [[[[bx - 6, by - 6], [bx + 6, by - 6], [bx, by]], '#7a8ea4'], [[[bx + 6, by - 6], [bx + 6, by + 6], [bx, by]], '#4a5b6e'], [[[bx + 6, by + 6], [bx - 6, by + 6], [bx, by]], '#3d4e60'], [[[bx - 6, by + 6], [bx - 6, by - 6], [bx, by]], '#6a8098']]) {
      g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill();
    }
    g.fillStyle = '#f2c14e'; g.fillRect(bx - .6, by - 3, 1.2, 6); g.fillRect(bx - 2.2, by - 1.4, 4.4, 1.2);
    // two trees in the corners of the yard
    for (const [tx, ty] of [[cx + 30, cy - 30], [cx - 30, cy - 30]]) {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(tx + 1.6, ty + 2, 6, 0, 7); g.fill();
      g.fillStyle = '#3f7f33'; g.beginPath(); g.arc(tx, ty, 6, 0, 7); g.fill();
      g.fillStyle = '#5fa547'; g.beginPath(); g.arc(tx - 1.5, ty - 1.5, 3.8, 0, 7); g.fill();
    }
  }
  if (def.end === 'cliff') return c.toDataURL('image/png'); // the chasm is a real hole, so this card needs transparency and no frame
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, S - 3, S - 3);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(2, S - 2); g.lineTo(2, 2); g.lineTo(S - 2, 2); g.stroke();
  return c.toDataURL('image/jpeg', .88);
}

/* Classic 2.0: the six-sided cards are pictures rendered in Blender (tools/blender_generators/generate_hex_tiles.py,
   shipped in assets/hex/). Only the river masks are drawn here: the water of every river card, white on transparent,
   so a slow glint can run over the water and nowhere else (src/ui/styles.css .hexwater). */
function hexWaterMask(id) {
  const sh = hexShapes(id), H = 96, W = H * 2 / Math.sqrt(3), [c, g] = cv(W, H, 1);
  g.translate(W / 2, H / 2); g.scale(H, H); g.strokeStyle = g.fillStyle = '#fff'; g.lineCap = 'round';
  for (const r of sh.rivers) {
    const P = r.path; g.beginPath(); g.moveTo(...P[0]);
    if (P.length === 2) g.lineTo(...P[1]); else for (let k = 1; k < P.length; k += 3) g.bezierCurveTo(...P[k], ...P[k + 1], ...P[k + 2]);
    g.lineWidth = HGEO.water * .8; g.stroke();
  }
  if (sh.spring) { g.beginPath(); g.arc(...sh.spring, HGEO.pond * .85, 0, 7); g.fill(); }
  return c.toDataURL();
}

const SPR = {};
function sprite(name, w, h, draw) { const [c, g] = cv(w, h, 4); draw(g, w, h); SPR[name] = {url: c.toDataURL(), w, h}; }
function drawSprites() {
  // Small helpers: a filled polygon with an optional outline, a vertical/diagonal gradient, a soft contact shadow.
  const poly = (g, pts, fill, line) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillStyle = fill; g.fill(); if (line) { g.strokeStyle = line; g.lineWidth = .45; g.stroke(); } };
  const lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
  const blob = (g, x, y, r, c0, c1) => { const gr = g.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const shadow = (g, x, y, rx, ry, a = .28) => { const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, `rgba(10,20,5,${a})`); gr.addColorStop(1, 'rgba(10,20,5,0)'); g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, 7); g.fill(); g.restore(); };
  const OUT = 'rgba(45,28,16,.55)';

  /* Houses in a three-quarter view: a front wall, a gabled side, a tiled roof, windows that glow. */
  const house = ({wall, wallD, roof, roofD, frame, chimney, win = '#ffd877'}) => (g) => {
    shadow(g, 12.5, 24.6, 12, 2.2);
    poly(g, [[15, 13], [21, 11], [21, 22.2], [15, 24.2]], lin(g, 15, 0, 21, 0, [[0, wallD], [1, wall]]), OUT);   // side wall
    poly(g, [[15, 13], [18, 5], [21, 11]], wallD, OUT);                                                        // gable
    poly(g, [[3, 13], [15, 13], [15, 24.2], [3, 24.2]], lin(g, 0, 13, 0, 24, [[0, wall], [1, wallD]]), OUT);    // front wall
    if (frame) { g.strokeStyle = frame; g.lineWidth = .9; g.beginPath(); [[3.4, 17.5, 14.6, 17.5], [5.5, 13, 5.5, 24], [12.5, 13, 12.5, 24], [5.5, 13, 9, 17.5], [12.5, 13, 9, 17.5]].forEach(([x0, y0, x1, y1]) => { g.moveTo(x0, y0); g.lineTo(x1, y1); }); g.stroke(); }
    // door with an arch and a step
    g.fillStyle = '#4a2f1b'; g.beginPath(); g.moveTo(7.6, 24.2); g.lineTo(7.6, 20); g.arc(9.2, 20, 1.6, Math.PI, 0); g.lineTo(10.8, 24.2); g.fill();
    g.fillStyle = 'rgba(255,220,150,.35)'; g.fillRect(8, 20.5, .5, 3.2); g.fillStyle = '#d9c7a2'; g.fillRect(7, 24, 4.6, .9);
    // windows: warm light, a frame and a sill
    const win1 = (x, y, ww, hh) => { g.fillStyle = '#3a2a1c'; g.fillRect(x - .5, y - .5, ww + 1, hh + 1); g.fillStyle = win; g.fillRect(x, y, ww, hh); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x, y, ww * .45, hh * .4); g.fillStyle = '#3a2a1c'; g.fillRect(x + ww / 2 - .2, y, .4, hh); g.fillRect(x, y + hh / 2 - .2, ww, .4); g.fillStyle = '#e8dcc0'; g.fillRect(x - .8, y + hh + .3, ww + 1.6, .7); };
    win1(12, 19, 2.2, 2.6); win1(4.3, 19, 2.2, 2.6);
    poly(g, [[17.2, 15], [19.2, 14.4], [19.2, 17], [17.2, 17.6]], win, 'rgba(58,42,28,.9)');                   // side window
    // roof: tiles in rows, darker toward the ridge, a light ridge line and eaves
    poly(g, [[1.6, 13.8], [16, 13.8], [19, 4.4], [4.6, 4.4]], lin(g, 0, 4, 0, 14, [[0, roofD], [1, roof]]), OUT);
    g.save(); g.beginPath(); g.moveTo(1.6, 13.8); g.lineTo(16, 13.8); g.lineTo(19, 4.4); g.lineTo(4.6, 4.4); g.closePath(); g.clip();
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = .45;
    for (let k = 1; k < 5; k++) { const y = 13.8 - k * 1.9, dx = (13.8 - y) * .32; g.beginPath(); g.moveTo(1.6 + dx, y); g.lineTo(16 + dx, y); g.stroke(); for (let x = 2.5 + dx + (k % 2) * 1.2; x < 16 + dx; x += 2.4) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + .5, y + 1.9); g.stroke(); } }
    g.restore();
    g.strokeStyle = 'rgba(255,230,200,.45)'; g.lineWidth = .7; g.beginPath(); g.moveTo(4.8, 4.5); g.lineTo(18.8, 4.5); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .8; g.beginPath(); g.moveTo(1.6, 14); g.lineTo(16, 14); g.stroke();
    if (chimney) {
      poly(g, [[11, 8.6], [13, 8.6], [13, 2.2], [11, 2.2]], lin(g, 11, 0, 13, 0, [[0, '#9b6a4f'], [1, '#6f4835']]), OUT);
      g.fillStyle = '#5a3a2a'; g.fillRect(10.6, 1.6, 2.8, 1);
      g.fillStyle = 'rgba(235,235,240,.55)'; [[12.4, .9, 1.1], [13.8, -.2, 1.4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y + 1, r, 0, 7); g.fill(); });
    }
  };
  sprite('house', 24, 26, house({wall: '#f1e4c6', wallD: '#c9b590', roof: '#cf4d32', roofD: '#8f2f1f', chimney: true}));
  sprite('house2', 24, 26, house({wall: '#efe0bf', wallD: '#c2ab83', roof: '#b4462d', roofD: '#7a2a1c', frame: '#6b4426'}));
  sprite('house3', 24, 26, house({wall: '#d9d3c7', wallD: '#a59d8f', roof: '#5f7488', roofD: '#3a4a5a', chimney: true}));
  sprite('house4', 24, 26, house({wall: '#ecd9b0', wallD: '#bfa477', roof: '#d6a94a', roofD: '#9a7326', frame: '#7a5232'}));

  /* Trees and field things, lit from the upper left. */
  sprite('pine', 24, 42, (g, w, h) => {
    shadow(g, w / 2, h - 1.6, 9, 2);
    g.fillStyle = lin(g, w / 2 - 2, 0, w / 2 + 2, 0, [[0, '#7a5434'], [1, '#4a3020']]); g.fillRect(w / 2 - 1.8, h - 11, 3.6, 10);
    for (let i = 3; i >= 0; i--) {
      const top = 1 + i * 7.6, bot = top + 16.5, hw = 4.8 + i * 2.7;
      // the tip, then the ragged lower edge from the right corner to the left one
      const pts = [[w / 2, top]]; for (let k = 4; k >= -4; k--) pts.push([w / 2 + hw * k / 4, bot - (k % 2 ? 1.6 : 0)]);
      poly(g, pts, lin(g, w / 2 - hw, 0, w / 2 + hw, 0, [[0, ['#3f8a45', '#3a8040', '#35763b', '#2f6b35'][i]], [.55, ['#2b6a33', '#28622f', '#245a2b', '#215228'][i]], [1, '#173f1d']]), 'rgba(15,40,18,.5)');
      g.fillStyle = 'rgba(190,240,140,.22)'; g.beginPath(); g.moveTo(w / 2, top + 1); g.lineTo(w / 2 - hw * .8, bot - 1); g.lineTo(w / 2 - hw * .3, bot - 1.5); g.closePath(); g.fill();
    }
  });
  sprite('oak', 28, 36, (g, w, h) => {
    shadow(g, w / 2, h - 1.6, 11, 2.3);
    poly(g, [[w / 2 - 2.2, h - 1.5], [w / 2 - 1.3, h - 13], [w / 2 - 4, h - 17], [w / 2 - 2.6, h - 17.6], [w / 2, h - 14.5], [w / 2 + 2.5, h - 18], [w / 2 + 3.6, h - 17.2], [w / 2 + 1.4, h - 13], [w / 2 + 2.4, h - 1.5]], lin(g, w / 2 - 2, 0, w / 2 + 2, 0, [[0, '#7a5434'], [1, '#4a3020']]), 'rgba(40,25,12,.6)');
    [[w / 2, h - 21, 10.5, '#4f9e4c', '#22592a'], [w / 2 - 6.5, h - 19.5, 6.8, '#58a853', '#285f2c'], [w / 2 + 6.5, h - 20, 7, '#4c9a48', '#225628'], [w / 2 - 4, h - 26.5, 7.2, '#64b35c', '#2c6630'], [w / 2 + 4, h - 27, 7, '#5cab55', '#29602d'], [w / 2, h - 30, 5.6, '#7cc66c', '#356f36']]
      .forEach(([x, y, r, c0, c1]) => blob(g, x, y, r, c0, c1));
    g.fillStyle = 'rgba(220,255,180,.35)'; [[w / 2 - 5, h - 29, 1.4], [w / 2 + 2, h - 32, 1.1], [w / 2 - 8, h - 22, 1]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    g.fillStyle = '#d8423a'; [[w / 2 + 6, h - 18], [w / 2 - 3, h - 23], [w / 2 + 2, h - 26]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, .9, 0, 7); g.fill(); });
  });
  sprite('birch', 20, 36, (g, w, h) => {
    shadow(g, w / 2, h - 1.5, 8, 1.8);
    g.fillStyle = '#efece4'; g.fillRect(w / 2 - 1.3, h - 22, 2.6, 21); g.fillStyle = '#b9b4a6'; g.fillRect(w / 2 + .5, h - 22, .8, 21);
    g.fillStyle = '#2a2a2a'; [[h - 6, 1.6], [h - 11, 1.1], [h - 15, 1.8], [h - 19, 1]].forEach(([y, l]) => g.fillRect(w / 2 - 1.3, y, l, .7));
    [[w / 2, h - 24, 6.4, '#a6d66a', '#4e8a33'], [w / 2 - 4, h - 20, 4.6, '#9bcf62', '#4a8530'], [w / 2 + 4, h - 21, 4.6, '#9bcf62', '#46802e'], [w / 2, h - 29.5, 4.8, '#b8e27a', '#5a9a3a']].forEach(([x, y, r, c0, c1]) => blob(g, x, y, r, c0, c1));
  });
  sprite('bush', 16, 11, (g, w, h) => {
    shadow(g, w / 2, h - 1.2, 7.5, 1.5);
    [[4.5, 6.8, 3.8], [11.5, 7, 3.6], [8, 5, 4.4]].forEach(([x, y, r]) => blob(g, x, y, r, '#6fb85e', '#2b6a2e'));
    g.fillStyle = '#e8584e'; [[5, 5.5], [9.6, 4], [12, 6.6], [7.4, 7.5]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, .6, 0, 7); g.fill(); });
  });
  sprite('rock', 15, 10, (g, w, h) => {
    shadow(g, w / 2, h - 1, 7, 1.4, .35);
    poly(g, [[1.5, 9], [3, 4.5], [6.5, 2], [10.5, 2.8], [13.5, 6], [13, 9]], lin(g, 2, 2, 12, 9, [[0, '#c3c0b8'], [.6, '#8f8b82'], [1, '#6a665e']]), 'rgba(40,38,34,.55)');
    poly(g, [[6.5, 2], [10.5, 2.8], [9, 5.5], [5.5, 5]], 'rgba(255,255,255,.25)');
    g.fillStyle = 'rgba(90,140,60,.7)'; g.beginPath(); g.ellipse(4.6, 8.2, 2.4, .9, 0, 0, 7); g.fill();
  });
  sprite('hay', 15, 14, (g, w, h) => {
    shadow(g, w / 2, h - 1.2, 7, 1.6);
    g.fillStyle = lin(g, 2, 2, 13, 13, [[0, '#f3d47a'], [.6, '#d7a945'], [1, '#a67a26']]);
    g.beginPath(); g.moveTo(1.5, h - 1.5); g.quadraticCurveTo(1.5, 1.5, w / 2, 1.5); g.quadraticCurveTo(w - 1.5, 1.5, w - 1.5, h - 1.5); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,80,20,.45)'; g.lineWidth = .4; for (let i = 0; i < 9; i++) { const x = 3 + i * 1.2; g.beginPath(); g.moveTo(x, h - 2); g.lineTo(x + (i - 4) * .4, 4); g.stroke(); }
    g.strokeStyle = '#8a5a22'; g.lineWidth = .8; g.beginPath(); g.moveTo(2.2, h - 6); g.quadraticCurveTo(w / 2, h - 4.4, w - 2.2, h - 6); g.stroke();
  });

  sprite('poplar', 14, 40, (g, w, h) => {
    shadow(g, w / 2, h - 1.4, 6, 1.5);
    g.fillStyle = '#5a3d24'; g.fillRect(w / 2 - 1, h - 7, 2, 6);
    g.fillStyle = lin(g, 1, 0, w - 1, 0, [[0, '#6fb04f'], [.5, '#3f8a3a'], [1, '#1f5226']]);
    g.beginPath(); g.moveTo(w / 2, 1); g.bezierCurveTo(w + 1, 10, w - .5, h - 9, w / 2, h - 5); g.bezierCurveTo(.5, h - 9, -1, 10, w / 2, 1); g.fill();
    g.strokeStyle = 'rgba(20,60,25,.35)'; g.lineWidth = .5; for (let y = 8; y < h - 8; y += 4) { g.beginPath(); g.moveTo(w / 2 - 3, y + 2); g.quadraticCurveTo(w / 2, y, w / 2 + 3, y + 2); g.stroke(); }
  });
  const rock = (g, cx, cy, rw, rh, c0, c1) => {
    poly(g, [[cx - rw, cy], [cx - rw * .8, cy - rh * .6], [cx - rw * .2, cy - rh], [cx + rw * .5, cy - rh * .85], [cx + rw, cy - rh * .3], [cx + rw * .9, cy]], lin(g, cx - rw, cy - rh, cx + rw, cy, [[0, c0], [.55, c1], [1, '#5b574f']]), 'rgba(40,38,34,.6)');
    poly(g, [[cx - rw * .2, cy - rh], [cx + rw * .5, cy - rh * .85], [cx + rw * .15, cy - rh * .45], [cx - rw * .45, cy - rh * .55]], 'rgba(255,255,255,.28)');
  };
  sprite('boulders', 32, 22, (g, w, h) => {
    shadow(g, w / 2, h - 2, 15, 2.6, .35);
    rock(g, 9, h - 2.5, 8, 11, '#c9c5bb', '#958f84'); rock(g, 23, h - 2.2, 8.5, 13, '#bdb8ad', '#888277'); rock(g, 16, h - 1.6, 7, 8, '#d3cfc6', '#a29c90');
    g.fillStyle = 'rgba(90,140,60,.75)'; [[5, h - 2.6], [28, h - 2.4], [16, h - 1.8]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 2.6, 1, 0, 0, 7); g.fill(); });
  });
  sprite('mine', 40, 32, (g, w, h) => {
    shadow(g, w / 2, h - 2, 19, 3, .35);
    // rocky hill
    poly(g, [[1, h - 2], [5, h - 13], [12, h - 24], [21, h - 30], [30, h - 24], [37, h - 12], [39, h - 2]], lin(g, 2, h - 30, 38, h - 2, [[0, '#b7b0a2'], [.5, '#8c8578'], [1, '#5f5a50']]), 'rgba(40,36,30,.6)');
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(12, h - 24); g.lineTo(21, h - 30); g.lineTo(18, h - 20); g.closePath(); g.fill();
    g.fillStyle = 'rgba(90,140,60,.8)'; [[6, h - 12, 3], [33, h - 13, 2.6], [24, h - 27, 2.2]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    // dark entrance with a timber frame
    g.fillStyle = '#17120f'; g.beginPath(); g.moveTo(13, h - 2); g.lineTo(13, h - 13); g.quadraticCurveTo(20, h - 19, 27, h - 13); g.lineTo(27, h - 2); g.fill();
    g.fillStyle = '#7a5130'; g.fillRect(12, h - 15, 2.4, 13); g.fillRect(25.6, h - 15, 2.4, 13); g.fillStyle = '#8c5f38'; g.fillRect(11, h - 16.5, 18, 2.6);
    g.fillStyle = '#5a3a20'; g.fillRect(11, h - 14, 18, .8);
    // rails and a lantern
    g.strokeStyle = '#6b6b70'; g.lineWidth = .7; g.beginPath(); g.moveTo(16.5, h - 2); g.lineTo(18, h - 9); g.moveTo(23.5, h - 2); g.lineTo(22, h - 9); g.stroke();
    g.strokeStyle = '#6e4a2a'; g.lineWidth = .8; for (let y = h - 3; y > h - 9; y -= 2) { g.beginPath(); g.moveTo(16 + (h - y) * .1, y); g.lineTo(24 - (h - y) * .1, y); g.stroke(); }
    g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(30, h - 12, 1.3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,210,90,.35)'; g.beginPath(); g.arc(30, h - 12, 3, 0, 7); g.fill();
  });
  // Where a road runs out into an empty cell: a scatter of stones and gravel on the track, so it reads as "the road goes on".
  sprite('gravel', 40, 14, (g, w, h) => {
    const R = rng(77);
    g.fillStyle = 'rgba(120,96,60,.35)'; g.beginPath(); g.ellipse(w / 2, h - 4, 17, 4.6, 0, 0, 7); g.fill();
    for (let k = 0; k < 16; k++) { g.fillStyle = k % 3 ? 'rgba(235,222,190,.9)' : 'rgba(110,90,58,.7)'; g.beginPath(); g.ellipse(6 + R() * (w - 12), h - 3 - R() * 5, .9 + R() * 1.1, .6 + R() * .7, R() * 3, 0, 7); g.fill(); }
    for (const [x, y, rx, ry, c0, c1] of [[10, h - 3, 4.6, 3.2, '#bdb8ad', '#8d887c'], [27, h - 3.5, 5.4, 3.8, '#c9c5bb', '#97917f'], [19, h - 2.2, 3.2, 2.2, '#d3cfc6', '#a29c90'], [33, h - 2.4, 3, 2, '#b4afa4', '#868072']]) {
      const lg = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry); lg.addColorStop(0, c0); lg.addColorStop(1, c1);
      g.fillStyle = 'rgba(30,25,15,.3)'; g.beginPath(); g.ellipse(x + 1, y + 1, rx, ry * .8, 0, 0, 7); g.fill();
      g.fillStyle = lg; g.beginPath(); g.ellipse(x, y - ry * .3, rx, ry, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - rx * .25, y - ry * .7, rx * .45, ry * .3, 0, 0, 7); g.fill();
    }
    g.strokeStyle = '#4f8e33'; g.lineWidth = .9; for (const x of [3, 37, 22]) { for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k, h - 1.5); g.lineTo(x + k * 1.6, h - 5.5); g.stroke(); } }
  });
  /* Stone keep: coursed masonry, a shaded right side, battlements with depth, slits, a gate, a flag. */
  sprite('tower', 38, 60, (g) => {
    shadow(g, 19, 58.2, 16, 2.6, .32);
    poly(g, [[6, 58.5], [7.5, 54], [30.5, 54], [32, 58.5]], '#8d8676', OUT);                                    // plinth
    poly(g, [[8, 54.5], [8, 17], [30, 17], [30, 54.5]], lin(g, 8, 0, 30, 0, [[0, '#d5ccb8'], [.55, '#b9b09c'], [.62, '#9a917f'], [1, '#7f7767']]), OUT);
    g.save(); g.beginPath(); g.rect(8, 17, 22, 37.5); g.clip();
    g.strokeStyle = 'rgba(60,50,40,.35)'; g.lineWidth = .5;
    for (let y = 20, k = 0; y < 55; y += 3.2, k++) { g.beginPath(); g.moveTo(8, y); g.lineTo(30, y); g.stroke(); for (let x = 8 + (k % 2) * 2.6; x < 30; x += 5.2) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 3.2); g.stroke(); } }
    g.fillStyle = 'rgba(80,120,50,.35)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(9 + i * 1.6, 54 - (i % 3) * 2, 1.6, 2.6, 0, 0, 7); g.fill(); }  // moss
    g.restore();
    // battlements: merlons with a lit top face
    poly(g, [[6.5, 17.5], [6.5, 14.5], [31.5, 14.5], [31.5, 17.5]], '#a49b88', OUT);
    for (let x = 6.5; x < 31; x += 5) { poly(g, [[x, 14.6], [x, 9.5], [x + 3.4, 9.5], [x + 3.4, 14.6]], lin(g, x, 0, x + 3.4, 0, [[0, '#d8cfbc'], [1, '#9c937f']]), OUT); g.fillStyle = '#eee6d4'; g.fillRect(x, 9.5, 3.4, .9); }
    // arrow slits and a lit window
    [[13, 23], [24, 23], [13, 34]].forEach(([x, y]) => { g.fillStyle = '#231b16'; g.fillRect(x, y, 1.6, 5); g.fillRect(x - .9, y + 1.8, 3.4, 1.2); });
    g.fillStyle = '#231b16'; g.beginPath(); g.moveTo(21.5, 38); g.lineTo(21.5, 34.5); g.arc(23.2, 34.5, 1.7, Math.PI, 0); g.lineTo(24.9, 38); g.fill();
    g.fillStyle = '#ffd877'; g.beginPath(); g.moveTo(22, 37.6); g.lineTo(22, 34.6); g.arc(23.2, 34.6, 1.2, Math.PI, 0); g.lineTo(24.4, 37.6); g.fill();
    // gate: stone arch, planks, iron bands
    g.fillStyle = '#8a8270'; g.beginPath(); g.moveTo(12.5, 54.5); g.lineTo(12.5, 46); g.arc(18.5, 46, 6, Math.PI, 0); g.lineTo(24.5, 54.5); g.fill();
    g.fillStyle = lin(g, 13.5, 0, 23.5, 0, [[0, '#6a4426'], [1, '#43291a']]); g.beginPath(); g.moveTo(13.6, 54.5); g.lineTo(13.6, 46.4); g.arc(18.5, 46.4, 4.9, Math.PI, 0); g.lineTo(23.4, 54.5); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .4; for (let x = 15.2; x < 23; x += 1.6) { g.beginPath(); g.moveTo(x, 54.5); g.lineTo(x, 43); g.stroke(); }
    g.fillStyle = '#2b2b2e'; g.fillRect(13.6, 47.5, 9.8, .8); g.fillRect(13.6, 51.5, 9.8, .8); g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(20.8, 50.2, .55, 0, 7); g.fill();
    // a banner on a pole: swallow-tailed, waving, a gold band at the hoist, a lit fold and a shaded one, a gold finial
    g.strokeStyle = '#3a2c20'; g.lineWidth = 1; g.beginPath(); g.moveTo(19, 10); g.lineTo(19, 1.2); g.stroke();
    const banner = new Path2D();
    banner.moveTo(19.4, 1.4); banner.bezierCurveTo(22.5, .2, 25.5, 2.6, 31, 1.2); banner.lineTo(28.2, 4); banner.lineTo(31, 6.8);
    banner.bezierCurveTo(25.5, 8.2, 22.5, 5.8, 19.4, 7); banner.closePath();
    const bg = g.createLinearGradient(19.4, 0, 31, 0); bg.addColorStop(0, '#c8341f'); bg.addColorStop(.45, '#ec5a3e'); bg.addColorStop(1, '#b02c19');
    g.fillStyle = bg; g.fill(banner);
    g.save(); g.clip(banner);
    g.fillStyle = 'rgba(255,230,200,.35)'; g.beginPath(); g.ellipse(23.4, 3.6, 1.4, 4, -.15, 0, 7); g.fill();
    g.fillStyle = 'rgba(60,10,5,.28)'; g.beginPath(); g.ellipse(27.2, 4.4, 1.3, 4, .12, 0, 7); g.fill();
    g.fillStyle = '#f2c14e'; g.fillRect(19.4, 0, 1.3, 9);
    g.restore();
    g.strokeStyle = 'rgba(80,15,8,.55)'; g.lineWidth = .35; g.stroke(banner);
    g.fillStyle = '#f6d36a'; g.beginPath(); g.arc(19, .9, 1, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(18.7, .6, .35, 0, 7); g.fill();
  });
  const meeple = (fill, stroke) => (g, w, h) => {
    const p = new Path2D(MEEPLE_D); g.save(); g.translate(1, 1); g.scale((w - 2) / 100, (h - 2) / 110);
    g.fillStyle = fill; g.fill(p); g.save(); g.clip(p);
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(36, 32, 20, 40, -.3, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 84, 100, 30); g.restore();
    g.lineWidth = 6; g.strokeStyle = stroke; g.stroke(p); g.restore();
  };
  PL0.forEach((p, i) => sprite('m' + i, 20, 22, meeple(p.col, 'rgba(0,0,0,.4)')));
  sprite('mg', 20, 22, meeple('rgba(255,255,255,.7)', '#f2b84b'));
}
const TILE_URL = {}, DRAWN = {};
function injectArt() {
  drawSprites();
  let css = '';
  // The cards are the Blender renders in assets/tiles/ (tools/blender_generators/generate_tiles.py, seen from above),
  // the same pictures as Classic 2.0; the drawn face lies under each, for a page whose app has no tiles/ folder yet.
  for (const id in TYPES) { const drawn = DRAWN[id] = drawTile(id); TILE_URL[id] = `tiles/${id}.webp`; css += `.t-${id}{background-image:url(tiles/${id}.webp),url(${drawn})}`; }
  for (const k in SPR) css += `.s-${k}{background-image:url(${SPR[k].url})}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
}
// Classic 2.0: the card pictures come from assets/hex/ (loaded only when a card shows up); the river glints get their masks.
let hexDone = false;
function injectHexArt() {
  if (hexDone) return; hexDone = true;
  let css = '';
  for (const id in HTYPES) {
    TILE_URL[id] = `hex/${id}.webp`; css += `.t-${id}{background-image:url(hex/${id}.webp)}`;
    if (HTYPES[id].e.includes('w')) { const m = hexWaterMask(id); css += `.tile .face.t-${id}::after{-webkit-mask-image:url(${m});mask-image:url(${m})}`; }
  }
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
}


  return {cv, drawTile, SPR, sprite, TILE_URL, DRAWN, injectArt, injectHexArt};
}
