/* ---------------- setup ---------------- */

function makeDeck(rules) {
  const d = rules.mode === 'hex' ? HX.deckList(rules) : deckList(rules);
  for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
  return rules.deck ? d.slice(0, rules.deck) : d;
}
// Offline game on this phone.
function newGame() {
  if (net) leaveRoom();
  let firstHuman = true;
  const numSeats = setup.n;
  const seats = setup.seats.slice(0, numSeats).map((s, i) => {
    const fig = s.human ? (firstHuman ? wallet.fig : 'classic') : randomFig();
    if (s.human) firstHuman = false;
    return {name: i ? s.name : profileName(), st: i ? '' : myStatus(), human: s.human, fig, col: s.col};
  });
  // An "extra figure" gift gives you one more figure in a game against bots.
  let bonus = -1;
  if (wallet.boosts.meeple > 0 && seats.some(x => !x.human) && seats.filter(x => x.human).length === 1) {
    bonus = seats.findIndex(x => x.human); wallet.boosts.meeple--; saveWallet();
  }
  startGame({seats, rules: {...setup.rules, rv: 2}, deck: makeDeck(setup.rules), seed: (Math.random() * 1e9) | 0, bonus, loc: wallet.loc || 'village'});
  if (bonus >= 0) toastAny('Подарок: +1 фигурка в этой партии');
}
// Everything random about a game is in cfg, so every phone in an online room builds the same game.
function startGame(cfg, replay = []) {
  clearRematchTimer(); if (net) net.rematchVotes = null;
  if (!cfg.online) cfg = {...cfg, localId: cfg.localId || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2))};
  ending = false; $('.tray').classList.remove('ended');
  token++; turnTok++; stopTimer(); closeGameMenu(); clearInterval(watchId);
  if (!replay.length && !cfg.tut && !cfg.noIntro && !cfg.online && wallet.botlvl === 'normal' && PROG.st.games === 3 && !wallet.softNote) {
    wallet.softNote = true; saveWallet(); setTimeout(() => toastAny('Боты стали сильнее: теперь «Обычные». Сложность меняется в настройках'), 1800);
  }
  if (!replay.length && !cfg.tut && !cfg.noIntro) {
    const mode = cfg.online ? (net && net.quick ? 'online' : 'friends') : cfg.seats.filter(s => s.human).length > 1 ? 'local' : 'bots';
    useCount('match:start');
    useCount(`match:mode_${mode}`);
    track('game_start', {mode, players: cfg.seats.length, rules: (cfg.rules && cfg.rules.mode) || 'classic'});
  }
  tut = null; tutShow();
  const locId = (cfg && cfg.loc) || wallet.loc || 'village';
  const gameScr = $('#scr-game');
  if (gameScr) gameScr.dataset.loc = locId;
  $('#boardTools').open = false;
  $('#sayBtn').hidden = false; $('#sayBox').hidden = true;
  queue = replay.map(m => ({...m, old: true})); applied = 0; clearTimeout(catchT); catchUp = replay.length > 0; lastPlaced = null; markOwn();
  gameLog = {cfg, moves: replay.slice()};
  if (meepleResolve) { meepleResolve = null; mrow.hidden = true; prow.hidden = false; }
  buildMini(); useGeo(cfg.rules && cfg.rules.mode === 'hex');
  world.innerHTML = '';
  ghost = null; slotEls = []; meeples = []; doneFeats = []; turn = 0; phase = 'idle';
  const rules = gameRules = cfg.rules;
  players = cfg.seats.map((s, i) => { const name = clean(s.name) || 'Игрок ' + (i + 1); return {name, init: name[0].toUpperCase(), col: validCol(s.col) ? s.col : PL0[i].col, human: s.human, ghost: !!s.ghost, st: PG.state.status.shownStatus(s.st), owner: s.owner, uid: s.uid || null, fig: FIGS[s.fig] ? s.fig : 'classic', botlvl: s.botlvl || (s.human ? null : (wallet.botlvl || 'normal')), score: 0, stats: {c: 0, r: 0, f: 0, t: 0, m: 0}, meeples: rules.meeples, missed: 0}; });
  if (cfg.bonus >= 0 && players[cfg.bonus]) players[cfg.bonus].meeples++;
  paintFigures();
  if (!net) saveGame();
  world.classList.toggle('nohint', !rules.hints);
  playersEl.style.gridTemplateColumns = `repeat(${players.length},1fr)`;
  const h = humanCount(), b = players.length - h;
  if (net) {
    const hasBots = players.some(p => !p.human);
    const isCups = !hasBots && !!(net.quick || (gameRules && gameRules.cups) || (rules && rules.cups));
    const sub = `${isCups ? 'рейтинговая игра' : 'онлайн'}${hasBots && net.quick && !players.some(p => p.ghost) ? ' (с ботом)' : ''} · ${players.length} ${players.length < 5 ? 'игрока' : 'игроков'}`;
    $('.room').innerHTML = `<b>${net.quick ? 'Онлайн' : 'Комната ' + net.code}</b><span><i></i>${sub}</span>`;
  }
  else if (window.AndroidApp || window.WEBAPP) $('.room').innerHTML = `<b>${b ? (h > 1 ? 'Люди и боты' : 'С ботами') : 'Один телефон'}</b><span>${players.length} ${players.length < 5 ? 'игрока' : 'игроков'}</span>`;
  deck = cfg.deck.slice(); deckMax = deck.length;
  // First card from the top of the stack goes in the middle of the table.
  const first = {x: 0, y: 0, type: deck.pop(), r: 0, seed: cfg.seed};
  // Tutorial: the first piece counts as the player's own, so the town they close on move one can take a figure at once.
  if (cfg.tut) first.by = 0;
  tiles = new Map([[key(0, 0), first]]); G.tiles = tiles;
  first.el = tileEl(first); world.append(first.el); resizeTable();
  $('#over').hidden = true;
  // The first card's neighbours sit about 136 px per unit of zoom from the centre; keep them clear of the zoom buttons
  // on the right edge (48 px) on narrow phones, never above the usual 1.05.
  const maxZoom = matchMedia('(orientation: landscape) and (max-height: 440px)').matches ? .8 : 1.05;
  Object.assign(cam, {px: 0, py: 0, z: Math.max(.7, Math.min(maxZoom, (document.documentElement.clientWidth / 2 - 54) / 136)), tilt: wallet.view === 'top' ? 22 : 55}); applyCam();
  $('#boardAngle').textContent = wallet.view === 'top' ? '2D' : '3D';
  renderPlayers(); renderResults(false);
  if (replay.length || cfg.noIntro) { toast(`Первая карта из стопки: ${TY(first.type).name}`); return startTurn(); }
  const my = token;
  introThen(first, () => { if (my !== token) return; toast(`Первая карта из стопки: ${TY(first.type).name}`); startTurn(); });
}
/* Opening of a new game: the stack is shuffled in the middle of the table, then its top card
   flies to the centre and becomes the first piece. Purely visual: the order is in cfg.deck. */
const cardBack = () => HEX ? '<i class="cback hex"></i>' : '<i class="cback sq"></i>';
function introThen(first, done) {
  // The game screen opens right after startGame(): begin on the next frame, once it is visible.
  requestAnimationFrame(() => requestAnimationFrame(() => introRun(first, done)));
}
function introRun(first, done) {
  const br = board.getBoundingClientRect();
  if (RM || !gameVisible || br.width < 10) return done();
  first.el.style.visibility = 'hidden';
  const box = document.createElement('div'); box.className = 'shuffle';
  box.innerHTML = Array.from({length: 8}, () => cardBack()).join('');
  board.append(box);
  const cards = [...box.children];
  cards.forEach((c, i) => c.style.transform = `translate(${-i}px,${-i * 1.6}px)`);
  beep('rotate');
  // two riffles: the stack splits left and right and falls back together
  const riffle = (k) => Promise.all(cards.map((c, i) => c.animate([
    {transform: `translate(${-i}px,${-i * 1.6}px)`},
    {transform: `translate(${(i % 2 ? 1 : -1) * (46 + i * 3)}px,${-i * 1.6 - 8}px) rotate(${(i % 2 ? 1 : -1) * (10 + i)}deg)`, offset: .45},
    {transform: `translate(${-i}px,${-i * 1.6}px)`}], {duration: 520, delay: k * 40 + i * 25, easing: 'cubic-bezier(.4,0,.2,1)'}).finished));
  riffle(0).then(() => { beep('rotate'); return riffle(1); }).then(() => {
    const top = cards[cards.length - 1], a = top.getBoundingClientRect(), f = first.el.querySelector('.face').getBoundingClientRect();
    const dx = f.left + f.width / 2 - (a.left + a.width / 2), dy = f.top + f.height / 2 - (a.top + a.height / 2), sc = Math.max(.6, f.width / a.width);
    const fl = top.animate([{transform: top.style.transform}, {transform: `translate(${dx}px,${dy - 40}px) scale(${sc * 1.1}) rotate(8deg)`, offset: .6}, {transform: `translate(${dx}px,${dy}px) scale(${sc})`, opacity: .9}], {duration: 560, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards'});
    cards.slice(0, -1).forEach(c => c.animate([{opacity: 1}, {opacity: 0}], {duration: 400, delay: 200, fill: 'forwards'}));
    return fl.finished;
  }).then(() => {
    box.remove(); first.el.style.visibility = '';
    first.el.animate([{transform: 'translateZ(30px)', opacity: .4}, {transform: 'translateZ(0)', opacity: 1}], {duration: 260, easing: 'cubic-bezier(.5,0,.8,.4)'});
    beep('place'); setTimeout(done, 320);
  }).catch(() => { box.remove(); first.el.style.visibility = ''; done(); });
}
// Every turn the next card leaves the stack in the corner and lands in the tray.
function drawFx() {
  if (RM || fast() || !gameVisible) return;
  const from = $('.dstack').getBoundingClientRect(), to = ct.getBoundingClientRect();
  if (!from.width || !to.width) return;
  const c = document.createElement('div'); c.className = 'flycard'; c.innerHTML = cardBack();
  c.style.left = from.left + 'px'; c.style.top = from.top + 'px'; document.body.append(c);
  const dx = to.left - from.left + (to.width - 22) / 2, dy = to.top - from.top + (to.height - 22) / 2, sc = to.width / 22;
  c.animate([{transform: 'translate(0,0) scale(1)'}, {transform: `translate(${dx * .5}px,${dy * .5 - 60}px) scale(${sc * .7}) rotate(-12deg)`, offset: .5}, {transform: `translate(${dx}px,${dy}px) scale(${sc})`, opacity: .2}], {duration: 520, easing: 'cubic-bezier(.4,0,.3,1)'}).finished.then(() => c.remove(), () => c.remove());
}
// The menu plays a small game of Classic 2.0 on its own: players lay six-sided cards in turn, each card drops onto
// the table with its player's colour, and once the little kingdom is built it fades and a new one begins.
// It is only scenery: the cards follow the rules (src/engine/hex.js) but nothing is scored or saved.
let demoT = 0, demoOn = false;
function buildMini() {
  if (demoOn) return;
  demoOn = true; injectHexArt(); demoGame();
}
function demoGame() {
  const mini = $('#mini'), board = new Map(), dist = (x, y) => (Math.abs(x) + Math.abs(y) + Math.abs(x + y)) / 2;
  mini.innerHTML = ''; mini.classList.add('demo'); mini.classList.remove('fade');
  const deck = HX.deckList({rivers: true});
  for (let i = deck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
  let turnNo = 0;
  const shown = () => !$('#scr-menu').hidden && !document.hidden;
  const sides = t => t.el.querySelectorAll('.sd').forEach((sd, d) => {
    // Keep bottom extrusion sides (d=1,2,3) visible so 3D depth never vanishes
    if (d === 1 || d === 2 || d === 3) { sd.hidden = false; return; }
    sd.hidden = board.has(HX.key(t.x + HX.DX[d], t.y + HX.DY[d]));
  });
  const lay = (t, col) => {
    const el = document.createElement('div'); el.className = 'tile hex';
    const [X, Y] = HX.cellXY(t.x, t.y); el.style.left = (X * T - HW / 2) + 'px'; el.style.top = (Y * T - T / 2) + 'px';
    el.style.setProperty('--pc', col);
    el.innerHTML = HEX_SIDES + `<div class="face t-${t.type}" style="--r:${t.r * 60}deg"></div>`;
    t.el = el; board.set(HX.key(t.x, t.y), t); mini.append(el);
    for (const n of board.values()) sides(n);
    if (RM) return;
    el.animate([{transform: 'translateZ(160px) rotateZ(-14deg)', opacity: 0}, {transform: 'translateZ(160px) rotateZ(-14deg)', opacity: 1, offset: .15},
      {transform: 'translateZ(-4px) rotateZ(0)', offset: .8}, {transform: 'translateZ(0)'}], {duration: 700, easing: 'cubic-bezier(.45,0,.75,.45)'});
    el.classList.add('mdrop'); setTimeout(() => el.classList.remove('mdrop'), 1300);
  };
  const step = () => {
    if (!demoOn) return;
    if (!shown()) { demoT = setTimeout(step, 1000); return; }
    const col = PL0[turnNo % 4].col;
    if (!board.size) { lay({x: 0, y: 0, type: deck.pop(), r: (Math.random() * 6) | 0}, col); turnNo++; demoT = setTimeout(step, 1100); return; }
    // the next card from the stack that has a place near the middle; the closer to the middle and to more cards, the better
    let move = null;
    for (let k = 0; k < 12 && deck.length && !move; k++) {
      const type = deck.pop();
      const ms = HX.allMoves(board, type).filter(m => dist(m.x, m.y) <= 1);
      if (ms.length) { const sc = m => HX.neighbours(board, m.x, m.y) * 2 - dist(m.x, m.y) * 1.5 + Math.random(); move = {...ms.reduce((a, b) => sc(b) > sc(a) ? b : a), type}; }
    }
    if (move) { lay(move, col); turnNo++; demoT = setTimeout(step, 1250); return; }
    // the kingdom is built: hold it a moment, fade it out and start a new game
    demoT = setTimeout(() => { mini.classList.add('fade'); demoT = setTimeout(() => { if (demoOn) demoGame(); }, 900); }, 2600);
  };
  demoT = setTimeout(step, 400);
}
let lastGold = null;
// What the match gave: cups (rated online games), gold, experience, a new level.
function rewardChips(g) {
  if (!g) return '';
  const rw = g.rw || {}, sign = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
  const chips = [];
  if (rw.rated) { const cupCls = rw.cups < 0 ? ' neg' : rw.cups === 0 ? ' zero' : ''; chips.push(`<div class="rchip cup${cupCls}" style="--i:0"><b>🏆 ${sign(rw.cups)}</b><small>${rw.hex ? 'кубков Классики 2.0' : 'кубков'} · всего ${rw.hex ? PROG.hcups || 0 : PROG.cups}</small></div>`); }
  else if (net && players.some(p => !p.human)) chips.push(`<div class="rchip dim" style="--i:0"><b>🏆 —</b><small>${players.some(p => p.ghost) ? 'партия без рейтинга' : 'без кубков: игра с ботом'}</small></div>`);
  else if (net && !net.quick) chips.push(`<div class="rchip dim" style="--i:0"><b>🏆 —</b><small>без кубков: игра с друзьями</small></div>`);
  chips.push(`<div class="rchip gold${g.delta < 0 ? ' neg' : ''}" style="--i:1"><b><i class="coin"></i> ${sign(g.delta)}</b><small>тайлов · всего ${wallet.gold}</small></div>`);
  if (rw.xp) chips.push(`<div class="rchip xp" style="--i:2"><b>⭐ +${rw.xp}</b><small>опыта · уровень ${rw.lvl}</small></div>`);
  return `<div class="rchips">${chips.join('')}</div>${rw.up ? `<div class="lvlup">🎉 Новый уровень ${rw.lvl}! +${20 * rw.up} тайлов</div>` : ''}`;
}
// Progress to the next level, shown under the reward chips of a finished game.
function xpLine() {
  const need = xpNeed(PROG.lvl), pc = Math.max(0, Math.min(100, Math.round(PROG.xp / need * 100)));
  return `<div class="xpline"><div class="xpbar"><i style="width:${pc}%"></i></div><small>Уровень ${PROG.lvl} · ещё ${Math.max(0, need - PROG.xp)} опыта до следующего</small></div>`;
}
function renderResults(final, gold) {
  const o = ranked();
  if (!gold && final) gold = lastGold;
  $('#goldres').hidden = true;
  $('#rres').hidden = !gold; if (gold) $('#rres').innerHTML = rewardChips(gold);
  $('#rk').textContent = final ? 'Партия окончена' : 'Счёт идущей партии';
  $('#rt').textContent = (PG.ui && PG.ui.results) ? PG.ui.results.winTitle(o[0], final, isMe(o[0])) : winTitle(o[0], final);
  const pod = [[o[1], 2, 70], [o[0], 1, 100], [o[2], 3, 50]].filter(x => x[0]).map(([p, n, h]) => [{...p, name: clean(p.name)}, n, h]);
  $('#podium').innerHTML = (PG.ui && PG.ui.results)
    ? PG.ui.results.renderPodiumHtml(pod, meepleImg)
    : pod.map(([p, n, h]) => `<div class="pc${n === 1 ? ' first' : ''}">${meepleImg(p.i)}<b>${clean(p.name)}${!p.human && !p.ghost ? ' <span class="botpill">бот</span>' : ''}</b><span class="pts">${p.score}</span><div class="blk" style="height:${h}px">${n}</div></div>`).join('');
  const oClean = o.map(p => ({...p, name: clean(p.name)}));
  $('#bd').innerHTML = (PG.ui && PG.ui.results)
    ? PG.ui.results.renderBreakdownTableHtml(oClean)
    : o.map(p => `<tr style="--c:${p.col}"><td><span class="dot"></span>${clean(p.name)}${!p.human && !p.ghost ? ' <span class="botpill">бот</span>' : ''}</td><td>${p.stats.c}</td><td>${p.stats.r}</td><td>${p.stats.f}</td><td>${p.stats.t || 0}</td><td>${p.score}</td></tr>`).join('');
  const moves = players.reduce((n, p) => n + (p.stats.t || 0), 0), figs = players.reduce((n, p) => n + (p.stats.m || 0), 0);
  $('#sumline').innerHTML = (PG.ui && PG.ui.results)
    ? PG.ui.results.renderSummaryLineHtml({tilesCount: tiles.size, movesCount: moves, figsCount: figs, deckCount: deck.length})
    : `<span><b>${tiles.size}</b>карт на поле</span><span><b>${moves}</b>ходов</span><span><b>${figs}</b>фишек выставлено</span><span><b>${deck.length}</b>карт в стопке</span>`;
  { const bm = $('#bestmove'); if (bm) { const h = PG.ui && PG.ui.results && PG.ui.results.renderBestMoveHtml ? PG.ui.results.renderBestMoveHtml(oClean) : ''; bm.innerHTML = h; bm.hidden = !h; } }
  const ag = $('#again'); if (ag) { ag.textContent = net ? 'Реванш' : 'Ещё партию'; ag.disabled = false; }
}
