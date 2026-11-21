/* ---------------- hud ---------------- */
const playersEl = $('#players'), statusEl = $('#status'), toastEl = $('#toast'), okBtn = $('#ok'), rotBtn = $('#rot');
const prow = $('#prow'), mrow = $('#mrow'), tface = $('#tface'), ct = $('#ct'), cname = $('#cname');
// Who owns what: every road, city and fort with figures on it is painted in its owners' colours
// along the object itself, from end to end, as an SVG layer on top of each tile's picture.
// Contested objects alternate the colours of everyone who has figures on them.
let ownDirty = true;
const markOwn = () => { ownDirty = true; };
function cityD(E, S) {
  if (PG.ui && PG.ui.hud) return PG.ui.hud.cityD(E, S);
  const city = [0,1,2,3].filter(d => E[d] === 'c'), k = city.length, C = S / 2;
  const corner = [[0,0],[S,0],[S,S],[0,S]], mid = [[S/2,0],[S,S/2],[S/2,S],[0,S/2]];
  const pt = p => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  if (k === 4) return {fill: `M0 0H${S}V${S}H0Z`, wall: ''};
  if (k === 1) {
    const i = city[0], rot = ([x, y]) => { let dx = x - C, dy = y - C; for (let n = 0; n < i; n++) [dx, dy] = [-dy, dx]; return [C + dx, C + dy]; };
    const A = rot([0, 0]), B = rot([S, 0]), K = rot([S / 2, S * .64]);
    return {fill: `M${pt(A)}L${pt(B)}Q${pt(K)} ${pt(A)}Z`, wall: `M${pt(B)}Q${pt(K)} ${pt(A)}`};
  }
  const s0 = city.find(d => E[(d + 3) % 4] !== 'c');
  let fill = `M${pt(corner[s0])}`, wall = '', i = s0, n = 0;
  while (n < 4) {
    if (E[i] === 'c') { fill += `L${pt(corner[(i + 1) % 4])}`; i = (i + 1) % 4; n++; continue; }
    let L = 0; while (E[(i + L) % 4] !== 'c') L++;
    const from = corner[i], to = corner[(i + L) % 4], p = L === 1 ? mid[i] : corner[(i + 1) % 4], f = L === 1 ? .88 : .86;
    const K = [p[0] + (C - p[0]) * f, p[1] + (C - p[1]) * f];
    fill += `Q${pt(K)} ${pt(to)}`; wall += `M${pt(from)}Q${pt(K)} ${pt(to)}`;
    i = (i + L) % 4; n += L;
  }
  return {fill: fill + 'Z', wall};
}
function ownSvg(t, list) {
  if (HEX) return hexOwnSvg(t, list, HX);
  // classic cards rendered from src/engine/square.js shapes: the colours lie on those shapes, as on Classic 2.0
  if (PG.engine.square && PG.engine.square.RENDERED.has(t.type)) return hexOwnSvg(t, list, PG.engine.square);
  if (PG.ui && PG.ui.hud) return PG.ui.hud.ownSvg(t, list, TYPES[t.type] ? TYPES[t.type].e : null);
  const mid = [[50,0],[100,50],[50,100],[0,50]];
  let out = '';
  // Several claimants: dashes of each colour in turn.
  const strokes = (d, cols, w, extra = '') => cols.map((c, i) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="${cols.length > 1 ? 'butt' : 'round'}"${cols.length > 1 ? ` stroke-dasharray="7 ${7 * (cols.length - 1)}" stroke-dashoffset="${-7 * i}"` : ''} ${extra}/>`).join('');
  for (const it of list) {
    const base = it.edges.map(d => (d - t.r + 4) % 4);
    if (it.kind === 'r') {
      const [a, b] = base.map(e => mid[e].join(' '));
      const d = base.length === 2 ? `M${a}Q50 50 ${b}` : `M${a}L50 50`;
      out += `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="10" stroke-linecap="round"/>` + strokes(d, it.cols, 6.5);
    } else if (it.kind === 'c') {
      const g = cityD(TYPES[t.type].e, 100);
      out += `<path d="${g.fill}" fill="${it.cols[0]}" fill-opacity="${it.cols.length > 1 ? .12 : .22}"/>`;
      if (g.wall) out += `<path d="${g.wall}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="7" stroke-linecap="round"/>` + strokes(g.wall, it.cols, 4.5);
      else out += strokes('M3 3H97V97H3Z', it.cols, 4.5);
    } else if (it.kind === 'f') {
      const d = 'M50 20A30 30 0 1 1 49.9 20Z';
      out += `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="7"/>` + strokes(d, it.cols, 4.5);
    }
  }
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${out}</svg>`);
}
// Who holds what on a card (classic and Classic 2.0 alike), drawn in the card type's own frame on the shapes the renders
// are built from (src/engine/hex.js, src/engine/square.js): the road and the town keep their own colours. A road gets a thin
// dashed line in its holder's colour down the middle, a town a dashed line along the inside of its wall and a pennant on
// every wall tower, a monastery a dashed ring. Several holders: the dashes take their colours in turn.
function hexOwnSvg(t, list, M) {
  const R = M.GEO.R, S = M.shapes(t.type), NS = M.N, P = p => p[0].toFixed(4) + ' ' + p[1].toFixed(4);
  const line = path => path.length === 4 ? `M${P(path[0])}C${P(path[1])} ${P(path[2])} ${P(path[3])}` : `M${P(path[0])}L${P(path[1])}`;
  const D = .055, G = .035, W = .03;
  const dashes = (d, cols) => `<path d="${d}" fill="none" stroke="rgba(20,16,10,.45)" stroke-width="${W + .014}" stroke-dasharray="${D + .01} ${G - .01}" stroke-dashoffset=".005"/>`
    + cols.map((c, i) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${W}" stroke-dasharray="${D} ${(D + G) * cols.length - D}" stroke-dashoffset="${-(D + G) * i}"/>`).join('');
  const pennant = (p, c) => `<path d="M${P(p)}v-.13" stroke="#3b2a18" stroke-width=".016" stroke-linecap="round"/><path d="M${p[0].toFixed(4)} ${(p[1] - .13).toFixed(4)}l.08 .03l-.08 .03Z" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width=".006"/>`;
  let out = '';
  for (const it of list) {
    const base = it.edges.map(d => (d - t.r + NS) % NS).sort();
    if (it.kind === 'r') {
      const road = S.roads.find(x => x.edges.slice().sort().join() === base.join());
      if (road) out += dashes(line(road.path), it.cols);
    } else if (it.kind === 'c' && S.town) {
      const T6 = S.town, k = T6.keep, inw = (p, f = .07) => { const dx = k[0] - p[0], dy = k[1] - p[1], L = Math.hypot(dx, dy) || 1; return [p[0] + dx / L * f, p[1] + dy / L * f]; };
      if (T6.walls.length) {
        out += dashes(T6.walls.map(([a, c, b]) => `M${P(inw(a, .1))}Q${P(inw(c))} ${P(inw(b, .1))}`).join(''), it.cols);
        T6.towers.forEach((p, i) => { out += pennant(inw(p, .04), it.cols[i % it.cols.length]); });
      } else out += pennant(k, it.cols[0]);
    } else if (it.kind === 'f') {
      out += dashes('M0 -.27A.27 .27 0 1 1 -.001 -.27Z', it.cols);
    }
  }
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-R} -.5 ${2 * R} 1" preserveAspectRatio="none">${out}</svg>`);
}
/* Finished and scored features stay in their owners' colours and get little banners of
   those colours on a few of their pieces (around the keep for a fortress). */
let doneFeats = [];
function flagSprite(col) {
  const k = 'fl' + col.slice(1);
  if (!SPR[k]) {
    sprite(k, 13, 24, (g, w, h) => {
      const sh = g.createRadialGradient(4, h - 1.5, 0, 4, h - 1.5, 4); sh.addColorStop(0, 'rgba(0,0,0,.3)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, h - 4, 9, 4);
      g.fillStyle = '#5a3d24'; g.fillRect(3.3, 2, 1.4, h - 3);
      g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(4, 2, 1.5, 0, 7); g.fill();
      g.fillStyle = col; g.beginPath(); g.moveTo(4.7, 3); g.quadraticCurveTo(8, 2, 12.5, 4.5); g.quadraticCurveTo(9, 6.5, 12.5, 9.5); g.quadraticCurveTo(8, 8, 4.7, 10.5); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.moveTo(8.5, 3.2); g.quadraticCurveTo(10.5, 3.6, 12.5, 4.5); g.quadraticCurveTo(9, 6.5, 12.5, 9.5); g.quadraticCurveTo(10.5, 8.6, 8.5, 8.4); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(4.7, 3.4, 3, 1);
    });
    const st = document.createElement('style'); st.textContent = `.s-${k}{background-image:url(${SPR[k].url})}`; document.head.appendChild(st);
  }
  return k;
}
function markDone(c, cols) {
  doneFeats.push({ids: c.ids, cols}); markOwn();
  let spots = [];
  if (c.kind === 'f') {
    const center = c.tiles.find(t => c.ids.has(key(t.x, t.y) + '|f'));
    if (center) spots = (HEX ? [[-.3, -.26], [.3, -.26], [.3, .26], [-.3, .26]] : [[-.36, -.36], [.36, -.36], [.36, .36], [-.36, .36]]).map(p => [center, p]);
  } else {
    const ts = c.tiles, step = Math.max(1, Math.ceil(ts.length / 6));
    for (let i = 0; i < ts.length; i += step) {
      const t = ts[i], g = groupsOf(t).find(q => c.ids.has(gid(t, q)));
      if (!g) continue;
      const [x, y] = groupPos(t, g);
      spots.push([t, [x + (c.kind === 'r' ? .1 : .14), y - .06]]);
    }
  }
  spots.forEach(([t, [x, y]], i) => {
    const b = addSprite(t.el, flagSprite(cols[i % cols.length]), x, y, 'flag', fast() ? null : .1 + i * .08, 1.35);
    b.dataset.flag = '1';
  });
}
function updateOwnership() {
  if (!ownDirty) return;
  ownDirty = false;
  for (const t of tiles.values()) if (t.own) { t.el.querySelector('.face').style.backgroundImage = ''; t.own = false; }
  if (!wallet.zones || !players.length) return;
  const perTile = new Map(), done = new Set();
  for (const m of meeples) {
    if (done.has(m.gid)) continue;
    const c = component(m.t, m.g); c.ids.forEach(i => done.add(i));
    const cols = [...new Set(c.meeples.map(x => x.p))].map(p => players[p].col);
    for (const id of c.ids) {
      const [k, rest] = id.split('|'), t = tiles.get(k);
      if (!t) continue;
      if (!perTile.has(t)) perTile.set(t, []);
      perTile.get(t).push({kind: rest[0], edges: rest.slice(1).split('').map(Number), cols});
    }
  }
  for (const f of doneFeats) for (const id of f.ids) {
    const [k, rest] = id.split('|'), t = tiles.get(k);
    if (!t || rest[0] === 'f') continue;
    if (!perTile.has(t)) perTile.set(t, []);
    perTile.get(t).push({kind: rest[0], edges: rest.slice(1).split('').map(Number), cols: f.cols});
  }
  for (const [t, list] of perTile) {
    t.el.querySelector('.face').style.backgroundImage = `url("${ownSvg(t, list)}"), url(${TILE_URL[t.type]})` + (DRAWN[t.type] ? `, url(${DRAWN[t.type]})` : '');
    t.own = true;
  }
}
// Out of the game after a skipped turn: a bot plays for you until you come back.
function checkKicked() {
  const me = players.findIndex(isMe), box = document.getElementById('kickBox');
  const out = me >= 0 && players[me].missed >= 1 && phase !== 'end' && gameVisible && !tut;
  if (!out) { if (box) box.remove(); return; }
  if (box) return;
  const b = document.createElement('div'); b.className = 'over'; b.id = 'kickBox'; b.style.position = 'fixed';
  b.innerHTML = `<div class="ocard"><div style="font-size:42px">💤</div><h3>Из-за бездействия вы вышли из партии</h3><p>Пока вас нет, за вас играет бот</p><button class="cta wide" id="kickBack">Вернуться в партию</button><button class="ghostbtn" data-go="menu">В меню</button></div>`;
  document.body.append(b);
  b.querySelector('#kickBack').onclick = () => imBack();
  b.querySelector('[data-go]').addEventListener('click', () => b.remove());
}
function imBack() {
  const me = players.findIndex(isMe); if (me < 0) return;
  players[me].missed = 0; if (net) netSend({t: 'here', g: net.gameId, p: me});
  const b = document.getElementById('kickBox'); if (b) b.remove();
  renderPlayers(); if (phase === 'place' && turn === me) { stopTimer(); beginHumanTurn(); }
}
let clk = null; // the running turn clock, shown in the active player's card
const turnTag = i => isMe(players[i]) ? 'ваш ход' : 'ходит';
const clkHtml = i => clk && clk.who === i ? `<span class="clk${clk.low ? ' low' : ''}">${clock(clk.left)}</span>` : '';
function setClock(who, left, low) {
  clk = {who, left, low};
  const c = playersEl.children[who]; if (!c) return;
  let el = c.querySelector('.clk');
  if (!el) { el = document.createElement('span'); el.className = 'clk'; c.append(el); }
  const t = clock(left); if (el.textContent !== t) el.textContent = t; // ticks 4 times a second: touch the page once a second
  if (el.classList.contains('low') !== !!low) el.classList.toggle('low', !!low);
}
function renderPlayers(bump = []) {
  setTimeout(checkKicked);
  updateOwnership();
  playersEl.innerHTML = (PG.ui && PG.ui.hud)
    ? PG.ui.hud.renderPlayersListHtml(players, {turn, phase, bump, isMe, myRing, meeplesTotal: gameRules.meeples, turnTag, clockHtml: clkHtml, contactUid: roomContactUid})
    : players.map((p, i) => `<div${p.uid && !isMe(p) ? ` data-pl="${String(p.uid).replace(/[^\w-]/g, '').slice(0, 64)}" data-n="${p.name}" data-c="${p.col}"` : ''} class="pl${i === turn && phase !== 'end' ? ' active' : ''}${bump.includes(i) ? ' bump' : ''}${p.resigned ? ' out' : ''}" style="--c:${p.col}"><span class="tg">${turnTag(i)}</span><span class="av${isMe(p) && myRing() ? ` fr" style="--fr:${myRing()}` : ''}">${p.init}</span><span class="pi"><span class="nm">${p.resigned ? 'сдался' : p.missed >= 1 ? '🤖 ' + p.name : p.name}${!p.human && !p.ghost ? ' <span class="botpill">бот</span>' : ''}</span><span class="pline"><b class="sc">${p.score}</b><span class="mp">${Array.from({length: gameRules.meeples}, (_, k) => `<i${k < p.meeples ? '' : ' class="off"'}></i>`).join('')}</span></span></span>${clkHtml(i)}</div>`).join('');
}
const setStatus = h => statusEl.innerHTML = h;
let toastT;
function toast(txt) { if (fast()) return; toastEl.textContent = txt; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2000); }
let deckMax = 0;
function renderDeck() {
  if (deck.length > deckMax || !phase || phase === 'idle') deckMax = Math.max(deck.length, deckMax);
  $('#deckN').textContent = deck.length;
  const bar = $('#deckBar');
  if (bar) bar.style.width = (deckMax ? 100 * deck.length / deckMax : 0) + '%';
  const stack = $('.dstack');
  if (stack) {
    if (HEX) {
      stack.innerHTML = '<defs><linearGradient id="dkHexG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3e374"/><stop offset="1" stop-color="#4f9a3b"/></linearGradient></defs>'
        + '<g transform="translate(0, 10)" opacity=".5"><polygon points="28,2 48,13 48,35 28,46 8,35 8,13" fill="#3a602b" stroke="#1f3617" stroke-width="1.8"/></g>'
        + '<g transform="translate(0, 5)" opacity=".8"><polygon points="28,2 48,13 48,35 28,46 8,35 8,13" fill="#4d8239" stroke="#1f3617" stroke-width="1.8"/></g>'
        + '<g transform="translate(0, 0)"><polygon points="28,2 48,13 48,35 28,46 8,35 8,13" fill="url(#dkHexG)" stroke="#224219" stroke-width="1.8"/>'
        + '<path d="M28 2 L28 24 M28 24 L48 35" fill="none" stroke="#ecdca8" stroke-width="3.5" stroke-linecap="round"/><circle cx="28" cy="24" r="3.5" fill="#e57373"/></g>';
    } else {
      stack.innerHTML = '<defs><linearGradient id="dkSqG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8e378"/><stop offset="1" stop-color="#559e3f"/></linearGradient></defs>'
        + '<g transform="translate(0, 8)" opacity=".5"><polygon points="28,4 50,16 28,28 6,16" fill="#3d662c" stroke="#1f3617" stroke-width="1.8"/><polygon points="6,16 28,28 28,34 6,22" fill="#29461e"/><polygon points="50,16 28,28 28,34 50,22" fill="#1f3617"/></g>'
        + '<g transform="translate(0, 4)" opacity=".8"><polygon points="28,4 50,16 28,28 6,16" fill="#4d8239" stroke="#1f3617" stroke-width="1.8"/><polygon points="6,16 28,28 28,34 6,22" fill="#345826"/><polygon points="50,16 28,28 28,34 50,22" fill="#28441d"/></g>'
        + '<g transform="translate(0, 0)"><polygon points="28,4 50,16 28,28 6,16" fill="url(#dkSqG)" stroke="#224219" stroke-width="1.8"/><polygon points="6,16 28,28 28,33 6,21" fill="#3d662c"/><polygon points="50,16 28,28 28,33 50,21" fill="#2c4c1f"/>'
        + '<path d="M17 10 Q28 20 39 22" fill="none" stroke="#ecdca8" stroke-width="3.5" stroke-linecap="round"/></g>';
    }
  }
}
function renderTray() {
  if (!current) { tface.className = 'face'; cname.innerHTML = ''; return; }
  tface.style.transition = 'none'; trayDeg = current.r * ROT(); tface.style.setProperty('--r', (trayDeg + cam.rot) + 'deg');
  tface.className = 'face t-' + current.type; void tface.offsetWidth; tface.style.transition = '';
  const solo = isLocal(turn) && localHumans() === 1;
  ct.style.setProperty('--c', solo ? 'transparent' : players[turn].col);
  cname.innerHTML = `<b>${TY(current.type).name}</b><small>${solo ? 'Ваша карта' : 'Карта: ' + players[turn].name}</small>`;
  // whose turn it is, big on the left: that player's own figure in their colour
  const tf = $('#turnFig'); tf.style.setProperty('--c', players[turn].col); const curFig = (players[turn] && players[turn].fig) || 'classic'; tf.innerHTML = `<img src="${figPreview(curFig)}" alt="${players[turn].name}"><small>${players[turn].name}</small>`;
  if (!RM) ct.animate([{transform: 'rotateX(26deg) translateY(26px) scale(.7)', opacity: 0}, {transform: 'rotateX(26deg)', opacity: 1}], {duration: 320, easing: 'cubic-bezier(.3,1.4,.5,1)'});
}
function setRot(nr) {
  const delta = ((nr - current.r) + NDIR()) % NDIR();
  trayDeg += delta * ROT(); ghostDeg += delta * ROT(); current.r = nr;
  tface.style.setProperty('--r', (trayDeg + cam.rot) + 'deg');
  if (ghost) ghost.querySelector('.face').style.setProperty('--r', ghostDeg + 'deg');
  peekSend();
}
// Hint frames are plain, unanimated 3D squares in empty cells: animating each of them
// (or merging them into one big layer that standing houses and trees cut through)
// made the board stutter once many frames were shown.
function clearSlots() { slotEls.forEach(x => x.remove()); slotEls = []; }
function renderSlots() {
  clearSlots();
  const slots = document.createDocumentFragment();
  for (const c of emptyCells()) {
    if (!legalRots(current.type, c.x, c.y).length || (tut && !tutAllows(c.x, c.y))) continue;
    const el = document.createElement('div'); el.className = 'slot' + (HEX ? ' hex' : '') + (tut ? ' tutpulse' : ''); el.dataset.x = c.x; el.dataset.y = c.y;
    const [l, tp] = cellLT(c.x, c.y); el.style.left = l + 'px'; el.style.top = tp + 'px';
    slots.append(el); slotEls.push(el);
  }
  world.append(slots);
}
function placeGhost() {
  if (!ghost) { ghostDeg = current.r * ROT(); ghost = tileEl({x: sel.x, y: sel.y, type: current.type, r: current.r}); ghost.classList.add('ghost'); world.append(ghost); }
  const [gl, gt] = cellLT(sel.x, sel.y); ghost.style.left = gl + 'px'; ghost.style.top = gt + 'px';
}
function markTileSeams(x, y) {
  ghost.querySelector('.tile-seams')?.remove();
  const width = HEX ? HW : T;
  const lines = VV().flatMap(([nx, ny], side) => {
    const [adjacentX, adjacentY] = nbXY(x, y, side);
    if (!at(adjacentX, adjacentY)) return [];
    const cx = width / 2 + nx * (T / 2 - 4);
    const cy = T / 2 + ny * (T / 2 - 4);
    return `<path d="M${cx - ny * 13} ${cy + nx * 13}L${cx + ny * 13} ${cy - nx * 13}"/>`;
  });
  if (lines.length) ghost.insertAdjacentHTML('beforeend', `<svg class="tile-seams" viewBox="0 0 ${width} ${T}" aria-hidden="true">${lines.join('')}</svg>`);
}
function selectSlot(x, y) {
  if (tut && !tutAllows(x, y)) return;
  setTimeout(() => tutEvent('select'));
  const rots = legalRots(current.type, x, y); if (!rots.length) return;
  sel = {x, y};
  setRot(rots.includes(current.r) ? current.r : rots[0]);
  slotEls.forEach(s => s.classList.toggle('sel', +s.dataset.x === x && +s.dataset.y === y));
  placeGhost(); markTileSeams(x, y); okBtn.disabled = false; peekSend();
  setStatus(rots.length > 1 ? 'Края совпали. Можно повернуть или <b>поставить</b>' : 'Края совпали. Нажмите <b>«Поставить»</b>');
}
function rotate() {
  if (phase !== 'place' || !current) return;
  beep('rotate'); tutEvent('rotate');
  if (!sel) return setRot((current.r + 1) % NDIR());
  const rots = legalRots(current.type, sel.x, sel.y);
  if (rots.length < 2) { useCount('turn:rotate_locked'); toast('При другом повороте края не совпадут. Можно выбрать другую клетку.'); return; }
  setRot(rots[(rots.indexOf(current.r) + 1) % rots.length]);
}
rotBtn.onclick = rotate;
board.addEventListener('keydown', e => {
  if (e.target !== board || !gameVisible || phase !== 'place' || paused || e.altKey || e.ctrlKey || e.metaKey) return;
  if (document.querySelector('.over:not(#over):not([hidden])')) return;
  if (e.code === 'KeyR') {
    rotate();
  } else if (e.key === 'Enter') {
    if (!e.repeat) okBtn.click();
  } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && slotEls.length) {
    const step = e.key === 'ArrowRight' ? 1 : -1;
    let index = slotEls.findIndex(s => s.classList.contains('sel'));
    if (index < 0 && step < 0) index = 0;
    const slot = slotEls[(slotEls.length + index + step) % slotEls.length];
    const x = +slot.dataset.x, y = +slot.dataset.y;
    useCount('turn:slot');
    selectSlot(x, y);
    ensureVisible(x, y);
  } else return;
  e.preventDefault();
});
/* "Points and rules" window, from the button in the game header: what each object is worth and what has to be done to
   get it, plus the rules, in any game (also online; the turn clock keeps running there). Not a placement hint. */
function helpWindow(tab = 'pts') {
  const old = document.getElementById('helpBox'); if (old) old.remove();
  const r = gameRules, mode = (MODES[r.mode] || MODES.classic).label, tie = r.tie === 'split' ? 'очки делятся поровну' : 'очки получает каждый из них';
  const item = (cls, ttl, todo, pts) => `<div class="hitem"><span class="rimg ${cls}"></span><div><b>${ttl}</b><p>${todo}</p><em>${pts}</em></div></div>`;
  const pts = `<div class="hnow">В этой партии: <b>${mode}</b> · фишек у игрока: <b>${r.meeples}</b> · если фишек поровну — ${tie}${net && !players.some(p => !p.human) && (net.quick || r.cups) ? ' · <b>игра на кубки</b>' : ''}</div>
    ${item(HEX ? 't-hC2' : 't-c2', '🏰 Город', 'Закройте картами все края города — чтобы со всех сторон он был окружён.', '2 очка за каждую карту города · недостроенный в конце игры — 1 за карту')}
    ${item(HEX ? 't-hRB' : 't-rS', '🛤 Дорога', 'Доведите дорогу до конца с обеих сторон: до города, перекрёстка, тупика или замкните её в кольцо.', '1 очко за каждую карту дороги · с целым большим мостом ×2')}
    ${item(HEX ? 't-hF' : 't-fort', '⛪ Монастырь', HEX ? 'Окружите монастырь шестью плитками — со всех его сторон.' : 'Окружите монастырь картами со всех 8 сторон, включая углы.', '9 очков · недостроенный в конце — 1 за каждую карту рядом')}
    ${HEX ? '' : item('t-brHalf', '🌉 Большой мост', 'Соедините две половины моста друг с другом — дорога через него становится ценнее.', 'каждая карта дороги вокруг — вдвое, сами половины — по 1')}
    <div class="hitem"><span class="hic">🧍</span><div><b>Фишка</b><p>Поставьте её на город, дорогу или монастырь на только что положенной карте, пока объект ещё ничей или на нём стоят только ваши фишки: так можно усилить свой объект. Очки получает тот, у кого на объекте больше фишек; если фишек поровну — у кого больше своих карт на объекте; если и так поровну — очки каждому лидеру. После очков фишка возвращается.</p><em>Одна фишка за ход, по желанию</em></div></div>
    <div class="hitem"><span class="hic">🤝</span><div><b>Респект</b><p>Достроили объект, на котором стоят только чужие фишки.</p><em>+1 очко вам</em></div></div>`;
  const rules = `<div class="hitem"><span class="hic">🎯</span><div><b>Цель</b><p>Стройте карту из общей стопки. Когда стопка кончилась — больше очков значит победа.</p></div></div>
    <div class="hitem"><span class="hic">🃏</span><div><b>Ваш ход</b><p>Возьмите карту, приложите её к полю так, чтобы края совпали (город с городом, дорога с дорогой, река с рекой), поверните при необходимости и по желанию поставьте фишку.</p></div></div>
    ${HEX ? '<div class="hitem"><span class="hic">🌊</span><div><b>Реки</b><p>Река должна продолжаться рекой. Исток — начало реки, по мосту дорога пересекает реку.</p></div></div>' : `<div class="hitem"><span class="hic">🌊</span><div><b>Реки и озёра</b><p>Река должна продолжаться рекой. Озеро занимает всю карту и впадает во все стороны реки. Исток — начало реки.</p></div></div>
    <div class="hitem"><span class="hic">🚧</span><div><b>Обрыв и мосты</b><p>У обрыва дорога обрывается: за ним можно ставить только обрыв. Половина большого моста стыкуется только с другой половиной.</p></div></div>`}
    <div class="hitem"><span class="hic">⏱</span><div><b>Время хода</b><p>${r.timer || net ? `На ход — ${r.timer || 60} секунд. Когда время выходит, ход делает бот.` : 'В этой партии время хода не ограничено.'}</p></div></div>
    <div class="hitem"><span class="hic">🏁</span><div><b>Конец игры</b><p>Недостроенные объекты приносят по 1 очку за карту. Побеждает набравший больше всех очков.</p></div></div>`;
  const box = document.createElement('div'); box.className = 'over'; box.id = 'helpBox'; box.style.position = 'fixed';
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Очки и правила');
  box.innerHTML = `<div class="ocard helpcard"><h3>Очки и правила</h3><div class="seg htabs"><button data-ht="pts" aria-pressed="${tab === 'pts'}">Очки</button><button data-ht="rules" aria-pressed="${tab === 'rules'}">Правила</button></div><div class="hbody">${tab === 'pts' ? pts : rules}</div><button class="cta wide" data-hx>Понятно</button></div>`;
  document.body.append(box);
  const close = () => { document.removeEventListener('keydown', keys); box.remove(); }, keys = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', keys);
  box.onclick = e => { if (e.target === box || e.target.closest('[data-hx]')) return close(); const t = e.target.closest('[data-ht]'); if (t) { close(); helpWindow(t.dataset.ht); } };
  track('help_open');
}
$('#helpBtn').onclick = () => { boardTools.open = false; helpWindow(); };
// The hint button: on your own turn (not online, not in the tutorial, when the table plays with hints) it picks the
// best spot for the card, turns the card to fit and says why. The choice lives in src/engine/bots.js.
const tipBtn = $('#tip');
const coachOn = () => !net && !tut && gameRules.hints !== false && wallet.coach !== 'off';
const tipOk = () => phase === 'place' && !!current && coachOn() && isLocal(turn) && !(players[turn].missed >= 1);
const tipFor = () => BOTS.hintPick(tiles, meeples, current.type, turn, players.length, players[turn].meeples > 0);
// "Always" coach: at the start of your turn the best spot glows and the reason is written above the card;
// nothing is chosen for you.
function coachTurn() {
  if (wallet.coach !== 'on' || !tipOk()) return false;
  const m = tipFor(); if (!m) return false;
  const el = slotEls.find(e => +e.dataset.x === m.x && +e.dataset.y === m.y); if (el) el.classList.add('tip');
  ensureVisible(m.x, m.y);
  setStatus(`💡 ${m.why}. Место подсвечено`);
  return true;
}
const showTip = () => { tipBtn.hidden = !tipOk(); };
tipBtn.onclick = () => {
  if (!tipOk()) return;
  const m = tipFor();
  if (!m) return;
  selectSlot(m.x, m.y); setRot(m.r); ensureVisible(m.x, m.y);
  useCount('turn:hint');
  setStatus(`💡 ${m.why} · <b>«Поставить»</b>`);
  track('hint_used');
};
okBtn.onclick = async () => {
  if (phase !== 'place' || !sel) return;
  // the turn the coach asks for, and in the right rotation (the next step builds on it)
  if (tut && (tutStep().wait !== 'placed' || (tutStep().r != null && current.r !== tutStep().r))) { const h = $('#rot'); h.classList.remove('tutpulse'); void h.offsetWidth; h.classList.add('tutpulse'); return; }
  phase = 'busy'; okBtn.disabled = rotBtn.disabled = true; clearSlots(); showTip();
  if (!autoMove) useCount('turn:placed');
  tutEvent('placed');
  const t = {x: sel.x, y: sel.y, type: current.type, r: current.r, seed: (Math.random() * 1e9) | 0};
  if (meCounted() && isMe(players[turn]) && !tut) progress({tiles: 1});
  const my = token; await dropAt(t); if (my !== token) return; afterPlace(t, turn);
};
function tap(x, y) {
  const el = document.elementFromPoint(x, y); if (!el) return;
  const gm = el.closest('.gm'); if (gm && meepleResolve) { meepleActed = true; meepleResolve(meepleOpts[+gm.dataset.i]); return; }
  if (phase !== 'place') return;
  if (el.closest('.tile.ghost')) return rotate();
  const s = el.closest('.slot');
  if (s) { useCount('turn:slot'); selectSlot(+s.dataset.x, +s.dataset.y); }
}
async function dropAt(t) {
  const match = token;
  peekClear();
  sel = {x: t.x, y: t.y};
  if (!ghost) placeGhost();
  const preview = ghost;
  preview.classList.remove('ghost');
  if (!(RM || fast() || wallet.gfx === 'low')) {
    await preview.animate([{transform: 'translateZ(8px)'}, {transform: 'translateZ(0)'}], {duration: 140, easing: 'ease-in'}).finished.catch(() => {});
  }
  if (token !== match) return;
  preview.remove(); ghost = null; lastPlaced = t;
  $('#lastMoveBtn').hidden = false;
  t.el = tileEl(t); world.append(t.el); tiles.set(key(t.x, t.y), t); resizeTable(); wallsAround(t); markOwn();
  if (!fast()) beep('place');
  if (!fast()) { const pf = document.createElement('i'); pf.className = 'puff'; t.el.append(pf); setTimeout(() => pf.remove(), 600); }
  if (!fast()) { t.el.classList.add('puzzle-lock'); setTimeout(() => { if (t.el) t.el.classList.remove('puzzle-lock'); }, 350); }
  if (!fast() && gameRules && gameRules.mode === 'epic' && TY(t.type) && TY(t.type).rare) toastAny(`✨ Редкая карта на поле: ${TY(t.type).name}!`);
  current = null; sel = null; renderDeck();
}
let meepleResolve = null, meepleOpts = [];
function askMeeple(mainTile, opts, p) {
  meepleOpts = opts; phase = 'meeple'; tutEvent('meeple');
  const anyMode = mainTile == null;
  const gms = opts.map((o, i) => { const [x, y] = groupPos(o.t, o.g); const b = addSprite(o.t.el, 'mg', x, y, 'gm', null, 1.25); b.dataset.i = i; return b; });
  const choices = anyMode ? '' : opts.map((o, i) => {
    const timing = o.done ? 'Очки сразу' : 'Очки при завершении';
    const note = !o.done && coachOn() && isLocal(p) ? BOTS.featureNote(tiles, meeples, o.t, o.g) : '';
    return `<button class="chip" data-i="${i}">${meepleImg(p)}<span>${label(o.g)}<small>${[timing, note].filter(Boolean).join(' · ')}</small></span></button>`;
  }).join('');
  mrow.innerHTML = `${choices ? `<div class="meeple-choices" role="group" aria-label="Объект для фишки">${choices}</div>` : ''}<button class="chip skip" data-i="-1" ${tut ? 'hidden' : ''}>Без фишки</button>`;
  const action = anyMode ? 'Фишка вернулась. Выберите объект на поле' : 'Выберите объект для фишки';
  setStatus(`${action}. В запасе <b>${players[p].meeples}</b>`);
  prow.hidden = true; mrow.hidden = false;
  return new Promise(res => {
    meepleResolve = o => { meepleResolve = null; setTimeout(() => tutEvent('meepleDone')); gms.forEach(b => b.remove()); mrow.hidden = true; prow.hidden = false; res(o); };
    const highlight = event => {
      const index = event?.target.closest('[data-i]')?.dataset.i;
      gms.forEach((marker, i) => marker?.classList.toggle('hl', index != null && +index === i));
    };
    mrow.onpointerover = mrow.onfocusin = highlight;
    mrow.onpointerleave = mrow.onfocusout = () => highlight();
  });
}
mrow.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b || !meepleResolve) return; meepleActed = true; const i = +b.dataset.i; if (tut && i < 0) return; meepleResolve(i < 0 ? null : meepleOpts[i]); });
