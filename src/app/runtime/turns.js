/* ---------------- turns ---------------- */
let meepleActed = false;
// A short clock for the figure after the turn's card was put down automatically.
function meepleClock(secs) {
  stopTimer();
  const end = Date.now() + secs * 1000, my = token, who = turn;
  timerId = setInterval(() => {
    if (my !== token || phase !== 'meeple') return stopTimer();
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    setClock(who, left, true);
    if (!left) { stopTimer(); if (meepleResolve) meepleResolve(null); }
  }, 250);
}
let autoMove = false, autoAway = false; // autoAway: the bot was already playing for this player // this move is played for a player who did not act in time
async function afterPlace(t, p, forced) {
  const my = token;
  // Score completed groups FIRST — so we can detect if this player's meeple returned.
  t.by = p;
  const meeplesBefore = players[p].meeples;
  const mine = players[p].meeples > 0 ? doneMine(t, p) : [];
  const touching = (players[p].meeples > 0 && typeof SC.touchingMine === 'function') ? SC.touchingMine(tiles, meeples, t, p) : [];
  await scoreAfter(t, p, new Set(mine.flatMap(m => [...m.c.ids])));
  if (my !== token) return;
  const meepleReturned = players[p].meeples > meeplesBefore;

  // opts: {t, g} pairs — anywhere on board if a meeple returned, otherwise placed tile + touching owned features
  const anyMode = meepleReturned && players[p].meeples > 0;
  const baseOpts = players[p].meeples > 0
    ? (anyMode ? claimableAll(p) : claimable(t, p).map(g => ({t, g})))
    : [];
  const mineOpts = players[p].meeples > 0 ? mine.map(m => ({t: m.t, g: m.g, done: true})) : [];
  const touchingOpts = players[p].meeples > 0 ? touching.filter(tc => !mineOpts.some(mo => gid(mo.t, mo.g) === gid(tc.t, tc.g)) && !baseOpts.some(bo => gid(bo.t, bo.g) === gid(tc.t, tc.g))).map(tc => ({t: tc.t, g: tc.g, done: tc.done})) : [];
  const opts = baseOpts.concat(mineOpts).concat(touchingOpts);
  let choice = null; // {t, g} or null
  if (forced !== undefined) {
    // a move from the network or the history: its figure counts only where the rules allow one (a changed client could
    // otherwise stand on a taken object, on any card, or with no figures left)
    choice = forced && forced.g && opts.some(o => gid(o.t, o.g) === gid(forced.t, forced.g)) ? forced : null;
  } else if (opts.length) {
    if (isLocal(p) && !(autoMove && autoAway)) {
      // Time ran out: the card was put down for you; 10 more seconds to place a figure.
      if (autoMove) { toast('Время вышло: карта на поле. 10 секунд на фишку'); meepleClock(10); }
      meepleActed = false;
      choice = await askMeeple(anyMode ? null : t, opts, p);
      stopTimer();
      if (autoMove && meepleActed) autoMove = false; // the player was there after all
    }
    else if (tut) choice = null; // the tutorial bot never claims anything
    else {
      // Bot: always use placed tile only, even in anyMode.
      // Bots never reinforce their own object (only free ones), so their play stays as it was.
      const botOpts = (anyMode ? claimable(t, p).map(g => ({t, g})) : opts).filter(o => o.done || !o.g || B.component(tiles, meeples, o.t, o.g).meeples.length === 0);
      choice = BOTS.figurePick(tiles, meeples, botOpts, players[p].meeples, Math.random, playerBotLevel(p), players[p] && players[p].persona);
    }
  }
  if (my !== token) return;
  if (forced === undefined) {
    const mt = choice ? choice.t : t;
    let mv;
    if (PG.game && PG.game.turns) {
      const formatted = PG.game.turns.formatMovePayload({
        n: applied++, p, x: t.x, y: t.y, r: t.r, seed: t.seed,
        choice, groupsOfFn: groupsOf, gidFn: gid,
        autoMove, autoAway, missedCount: players[p].missed, isNet: !!net
      });
      mv = formatted.move;
      players[p].missed = formatted.missed;
    } else {
      mv = {n: applied++, p, x: t.x, y: t.y, r: t.r, seed: t.seed,
        m: choice ? groupsOf(mt).findIndex(g => gid(mt, g) === gid(mt, choice.g)) : -1};
      if (choice && (mt.x !== t.x || mt.y !== t.y)) { mv.mtx = mt.x; mv.mty = mt.y; }
      if (autoMove && !(autoAway && players[p].missed === 0)) { if (net) mv.auto = 1; players[p].missed++; } else players[p].missed = 0;
    }
    autoAway = false;
    autoMove = false;
    gameLog.moves.push(mv);
    if (net) netSend({t: 'move', g: net.gameId, ...mv}); else saveGame();
  }
  players[p].stats.t++; if (choice) players[p].stats.m++;
  if (choice) { placeMeeple(choice.t, choice.g, p, true); if (!fast()) beep('meeple'); }
  // Finished objects of this move that nobody claimed score now: for the figure just put on one, otherwise "no points".
  const picked = choice && mine.find(m => gid(m.t, m.g) === gid(choice.t, choice.g));
  if (picked && !fast()) await wait(450);
  for (const m of mine) if (my === token) await resolveFeature(component(m.t, m.g), false, p);
  renderPlayers();
  if (my !== token) return;
  turn = (PG.game && PG.game.turns) ? PG.game.turns.nextTurnIndex(turn, players.length) : (turn + 1) % players.length;
  await wait(250);
  if (my === token) startTurn();
}
// Objects this move completed with no figures on them and built only by this player: a free figure
// may still be put on them, and then they score for that player at once.
// Scoring rules live in src/engine/scoring.js.
const doneMine = (t, p) => SC.doneMine(tiles, meeples, t, p);
const roadPoints = c => SC.roadPoints(tiles, c);
async function scoreAfter(t, p, skip) {
  for (const c of SC.completedAround(tiles, meeples, t)) if (!skip || ![...c.ids].some(i => skip.has(i))) await resolveFeature(c, false, p);
}
function featureConfetti(tile, color) {
  if (RM || fast() || (wallet && wallet.gfx === 'low') || !tile || !tile.el) return;
  const cf = document.createElement('div'); cf.className = 'feat-confetti';
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('span');
    s.style.setProperty('--c', color || '#f2b84b');
    s.style.setProperty('--dx', (Math.cos(i * Math.PI / 6) * 36).toFixed(1) + 'px');
    s.style.setProperty('--dy', (Math.sin(i * Math.PI / 6) * 36).toFixed(1) + 'px');
    cf.append(s);
  }
  tile.el.append(cf); setTimeout(() => cf.remove(), 800);
}
let lastBotReactAt = 0;
function botReact(win, each, kind, helped, placer) {
  if (fast() || tut || net || typeof showSay !== 'function' || Date.now() - lastBotReactAt < 10000) return;
  const bots = players.map((pl, idx) => (!pl.human && !pl.resigned) ? idx : -1).filter(idx => idx >= 0);
  if (!bots.length || Math.random() > 0.35) return;
  let speaker = -1, pool = [];
  if (helped && !players[placer].human) {
    speaker = placer;
    pool = ['🤝', '😅', 'Вот это поворот!'];
  } else if (win.some(i => !players[i].human) && each >= 6) {
    speaker = win.find(i => !players[i].human);
    pool = kind === 'c' ? ['Мой замок!', '👑', '🔥'] : kind === 'f' ? ['Дзен превыше всего 🍵', '🏆'] : ['Тут моя дорога 🛤️', '😎'];
  } else if (win.some(i => isMe(players[i])) && each >= 8) {
    speaker = bots[(Math.random() * bots.length) | 0];
    pool = ['Отличный ход!', '👏', 'Ну ты гроссмейстер! 👑', 'Красиво строишь!'];
  }
  if (speaker < 0 || !pool.length || typeof SAYS === 'undefined') return;
  const pick = pool[(Math.random() * pool.length) | 0];
  const idx = SAYS.indexOf(pick);
  if (idx < 0) return;
  lastBotReactAt = Date.now();
  const match = token;
  setTimeout(() => { if (match === token && phase !== 'end' && gameVisible) showSay(speaker, idx); }, 450);
}
async function resolveFeature(c, final, placer) {
  const {win, each, helped} = SC.settle(tiles, c, final, players.length, gameRules.tie, placer, rules2());
  c.tiles.forEach(x => x.el.classList.add('glow'));
  setTimeout(() => c.tiles.forEach(x => x.el.classList.remove('glow')), 1100);
  if (!win.length) { toast(`${KIND[c.kind]} ${{c: 'достроен', r: 'достроена', f: 'окружена'}[c.kind]} · фишек нет, очков нет`); await wait(600); return; }
  win.forEach(i => { const m = c.meeples.find(x => x.p === i); floatText(m.t, groupPos(m.t, m.g), '+' + each, players[i].col, each >= 8); });
  win.forEach(i => { players[i].score += each; players[i].stats[c.kind] += each; const b = players[i].best; if (!b || each > b.pts) players[i].best = {pts: each, kind: c.kind, n: c.tiles.length}; });
  if (!final) markDone(c, win);
  if (!final && !fast()) {
    const n = c.tiles.length;
    win.forEach(i => { if (meCounted() && isMe(players[i])) progress({[c.kind]: 1, pts: each, cityTiles: c.kind === 'c' ? n : 0, roadTiles: c.kind === 'r' ? n : 0, bigc: c.kind === 'c' && n >= 5 ? 1 : 0, longr: c.kind === 'r' && n >= 4 ? 1 : 0}); });
    if (win.length && c.tiles && c.tiles[0]) featureConfetti(c.tiles[0], players[win[0]].col);
    if (gameRules && gameRules.mode === 'epic' && (c.tiles.length >= 5 || c.tiles.some(x => TY(x.type) && TY(x.type).rare))) {
      setTimeout(() => toastAny(`🌟 Событие в Большой игре: ${KIND[c.kind]} завершён! (${c.tiles.length} карт)`), 500);
    }
  }
  if (!fast()) beep(each >= 8 ? 'big' : 'score');
  const done = {c: 'достроен', r: 'достроена', f: 'окружена'}[c.kind];
  // Whoever finishes an object for somebody else gets 1 point of respect.
  if (helped) {
    players[placer].score += 1;
    const ht = c.tiles.find(x => x.by === placer) || c.tiles[0];
    floatText(ht, [0, -.12], '+1 респект', players[placer].col);
  }
  const help = helped ? ` · помог${isMe(players[placer]) ? 'ли вы' : ': ' + players[placer].name} (+1 респект)` : '';
  const share = win.length > 1 ? ` (спорный, ${gameRules.tie === 'split' ? 'поровну' : 'каждому'})` : '';
  toast(`${KIND[c.kind]} ${final ? 'не достроен' : done}${help} · ${win.map(i => players[i].name).join(' и ')} +${each}${share}`);
  [...c.meeples].forEach(removeMeeple);
  renderPlayers(helped ? [...win, placer] : win);
  if (!final) botReact(win, each, c.kind, helped, placer);
  await wait(final ? 700 : 950);
}
// The history is in: show where the game stands (the last card put down), not how it got there.
// Catching up on a game's history lasts while old moves keep arriving (over the network they trickle in), and ends
// once none has come for a moment: then the camera goes to the last placed tile.
let catchT = 0;
function catchKeep() { catchUp = true; clearTimeout(catchT); catchT = setTimeout(catchEnd, 900); }
function catchEnd() { clearTimeout(catchT); if (!catchUp) return; catchUp = false; focusLast(); }
function focusLast(center = false) {
  const t = lastPlaced; if (!t || !t.el) return;
  if (center) {
    const [x, y] = cellXY(t.x, t.y);
    tweenCam({px: -x * T, py: -y * T}, 350);
  } else ensureVisible(t.x, t.y);
  t.el.classList.add('glow'); setTimeout(() => t.el.classList.remove('glow'), 1500);
}
/* Calm: the water keeps flowing only while something is going on. A few seconds after the last touch or move the
   ambient animations are paused (no repainting, so the phone can cool down) and wake up on the next touch or turn. */
let calmT = 0, calmAt = 0;
function wake(force) {
  const now = Date.now(); if (!force && now - calmAt < 400) return; calmAt = now;
  const root = document.documentElement; if (root.classList.contains('calm')) root.classList.remove('calm');
  clearTimeout(calmT); calmT = setTimeout(() => root.classList.add('calm'), 3500);
}
['pointerdown', 'pointermove', 'wheel', 'keydown'].forEach(ev => document.addEventListener(ev, () => wake(), {passive: true, capture: true}));
function startTurn() {
  wake(true);
  if (!gameVisible) { pendingStart = true; return; }
  pendingStart = false; current = null; sel = null; stopTimer(); tipBtn.hidden = true;
  // Skip impossible cards silently. The finite deck is consumed once, so this cannot loop forever.
  while (deck.length) {
    if (PG.game && PG.game.turns) { current = PG.game.turns.drawNextValidCard(deck, hasPlacement); break; }
    const ty = deck.pop(); if (hasPlacement(ty)) { current = {type: ty, r: 0}; break; }
  }
  renderDeck();
  if (!current) return endGame();
  renderTray(); drawFx(); renderPlayers(); turnTok++;
  if (queue.some(q => q.n === applied)) return waitRemote();
  if (isLocal(turn)) {
    if (localHumans() > 1) return handOver();
    beginHumanTurn();
  }
  else if (runsBot(turn)) { phase = 'ai'; okBtn.disabled = rotBtn.disabled = true; aiTurn(); }
  else waitRemote();
}
let timerId = 0;
function stopTimer() {
  clearInterval(timerId); idleWarn();
  if (!clk) return;
  const c = playersEl.children[clk.who], el = c && c.querySelector('.clk'); clk = null;
  if (el) el.remove();
}
// Turn clock for people (bots are quick anyway). When it runs out the card goes to a random fitting spot.
// "Hurry up" alert: in the last 10 s of a turn, if the player has done nothing for a moment, the screen edges pulse
// red; in the last 5 s the phone also buzzes lightly every second.
function haptic(type = 'light') {
  if (typeof PG !== 'undefined' && PG.app && PG.app.telegram && PG.app.telegram.telegramHaptic(type)) return;
  try {
    if (navigator.vibrate) navigator.vibrate(type === 'error' || type === 'warning' ? [50, 40, 50] : 40);
  } catch (_) {}
}
let lastAct = Date.now(), buzzedAt = -1;
['pointerdown', 'pointermove', 'wheel', 'keydown'].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, {passive: true, capture: true}));
function idleWarn(left) {
  const g = $('#edgeglow');
  if (left == null) { g.classList.remove('warn', 'hard'); buzzedAt = -1; return; }
  if (!g.classList.contains('warn')) { g.classList.remove('on'); g.style.setProperty('--c', '#ff5a4d'); g.classList.add('warn'); }
  g.classList.toggle('hard', left <= 5);
  if (left <= 5 && buzzedAt !== left) { buzzedAt = left; haptic(left <= 1 ? 'warning' : 'light'); }
}
function startTimer() {
  stopTimer(); lastAct = Date.now();
  // Online a turn always has a clock, so one silent player can't hold up the table;
  // someone who already missed two turns gets a few seconds before the bot moves for them.
  const away = (PG.game && PG.game.turns) ? PG.game.turns.isPlayerAway(players[turn].missed) : players[turn].missed >= 1;
  const secs = (PG.game && PG.game.timers)
    ? PG.game.timers.resolveTurnDuration({away, timerSecs: gameRules.timer, isNet: !!net})
    : (away ? 2 : gameRules.timer || (net ? 60 : 0));
  if (!secs) return;
  const my = token, who = turn;
  let end = Date.now() + secs * 1000, last = Date.now();
  const tick = () => {
    if (my !== token || who !== turn || !['place', 'meeple', 'handover'].includes(phase)) return stopTimer();
    const now = Date.now();
    if (phase === 'handover' || (paused && !net) || updHold()) { end += now - last; last = now; return; }
    last = now;
    const left = (PG.game && PG.game.timers) ? PG.game.timers.calcTimeLeft(end, now) : Math.max(0, Math.ceil((end - Date.now()) / 1000));
    setClock(who, left, left <= 10);
    const shouldWarn = (PG.game && PG.game.timers)
      ? PG.game.timers.shouldWarnIdle({alertEnabled: wallet.alert, left, isLocal: isLocal(who), phase, idleDurationMs: now - lastAct})
      : (wallet.alert && left > 0 && left <= 10 && isLocal(who) && ['place', 'meeple'].includes(phase) && now - lastAct > 2500);
    if (shouldWarn) idleWarn(left); else idleWarn();
    if (left > 0) return;
    if (isLocal(who)) useCount('turn:timeout');
    stopTimer(); if (away) toast('За вас сходил бот');
    if (phase === 'meeple' && meepleResolve) return meepleResolve(null);
    const m = helperPick(current.type, who);
    autoMove = true; autoAway = away; selectSlot(m.x, m.y); setRot(m.r); okBtn.onclick();
  };
  tick(); timerId = setInterval(tick, 250);
}
function turnAlert() {
  if (!wallet.alert) return;
  const g = $('#edgeglow'); g.style.setProperty('--c', players[turn].col);
  g.classList.remove('on'); void g.offsetWidth; g.classList.add('on');
  haptic('light');
}
function beginHumanTurn() {
  beep('turn'); turnAlert();
  phase = 'place'; renderSlots(); okBtn.disabled = true; rotBtn.disabled = false; startTimer(); showTip();
  if (players[turn].missed >= 1) return setStatus('За вас ходит бот <button class="chip" id="imHere">Вернуться</button>');
  if (!coachTurn()) {
    setStatus(PG.game.turns.formatTurnStatusText({turnPlayerName: players[turn].name, isLocal: true,
      localHumansCount: localHumans(), showHints: Boolean(gameRules.hints)}));
  }
}
// Several people on one phone: the next player simply gets the turn (the status line and the player strip show whose it is);
// there is no "pass the phone" screen over the board any more.
function handOver() { $('#over').hidden = true; beginHumanTurn(); }
// Bot choices live in src/engine/bots.js.
// Soft start for a newcomer: the first three games against bots are against "easy" ones (unless the player chose a level
// themselves); from the fourth game the chosen level applies and one note says so.
const softStart = () => (PG.game && PG.game.turns) ? PG.game.turns.isSoftStart(wallet.botlvl, PROG.st.games) : (wallet.botlvl === 'normal' && PROG.st.games < 3);
const botLevel = () => (PG.game && PG.game.turns) ? PG.game.turns.resolveBotLevel(wallet.botlvl, PROG.st.games, PG.engine.bots.BOT_LEVELS) : (softStart() ? 'easy' : PG.engine.bots.BOT_LEVELS.includes(wallet.botlvl) ? wallet.botlvl : 'normal');
const playerBotLevel = p => (players[p] && players[p].botlvl) || botLevel();
const botPick = (type, p) => BOTS.levelPick(tiles, meeples, type, p, players.length, Math.random, playerBotLevel(p), players[p] && players[p].persona);
const helperPick = (type, p) => BOTS.helperPick(tiles, meeples, type, p, players.length, Math.random);
async function aiTurn() {
  const p = turn, my = token, tt = turnTok;
  setStatus(`Ходит <b>${players[p].name}</b>…`);
  const k = wallet.speed === 'fast' ? .35 : 1;
  await wait(900 * k); if (my !== token || tt !== turnTok) return;
  let best = botPick(current.type, p);
  if (tut && tut.bot.length) { const m = tut.bot.shift(); if (fits(current.type, m.r, m.x, m.y)) best = m; }
  await ensureVisible(best.x, best.y); if (my !== token || tt !== turnTok) return;
  sel = {x: best.x, y: best.y}; setRot(best.r); placeGhost();
  await wait(650 * k); if (my !== token || tt !== turnTok) return;
  const t = {x: best.x, y: best.y, type: current.type, r: current.r, seed: (Math.random() * 1e9) | 0};
  await dropAt(t); if (my !== token) return;
  afterPlace(t, p); tutEvent('bot');
}
// reason: undefined — the deck ran out; 'draw' — everyone agreed to a draw; 'resign' — only one person is left.
async function endGame(reason) {
  if (net) try { localStorage.removeItem('lastGame'); } catch (_) {}
  setTimeout(() => tutEvent('end'), 1800);
  if (phase === 'end' || ending) return;
  ending = true;
  markGameFinished(gameKey()); if (!net) clearSave(); historySave(reason, false);
  if (reason) { token++; turnTok++; stopTimer(); if (ghost) { ghost.remove(); ghost = null; } if (meepleResolve) { meepleResolve = null; mrow.hidden = true; prow.hidden = false; } }
  const my = token;
  phase = 'end'; clearSlots(); renderPlayers(); okBtn.disabled = rotBtn.disabled = true; renderTray();
  if (!reason) {
    setStatus('Стопка закончилась — досчитываем недостроенное');
    await wait(500);
    if (my !== token) return;
    const seen = new Set();
    for (const m of [...meeples]) {
      if (my !== token) return;
      if (!meeples.includes(m) || seen.has(m.gid)) continue;
      const c = component(m.t, m.g); c.ids.forEach(i => seen.add(i));
      await resolveFeature(c, true);
    }
  }
  if (my !== token) return;
  if (!net) clearSave();
  const gold = payout(reason);
  if (!tut) try {
    useCount('match:result');
    if (!reason || reason === 'deck') useCount('match:deck_end');
    const me = players.findIndex(isMe), ord = ranked();
    track('game_end', {mode: net ? (net.quick ? 'online' : 'friends') : humanCount() > 1 ? 'local' : 'bots', players: players.length, place: me >= 0 ? ord.findIndex(x => x.i === me) + 1 : 0, score: me >= 0 ? players[me].score : 0, rules: gameRules.mode || 'classic', reason: reason || 'deck', length: gameLog ? gameLog.moves.length : 0});
  } catch (_) {}
  renderResults(true, gold);
  const order = ranked(), top = order[0];
  const meIdx = players.findIndex(isMe);
  beep(reason === 'draw' || meIdx < 0 || order[0].i === meIdx || order[0].score === players[meIdx].score ? 'win' : 'lose');
  const over = $('#over');
  const title = reason === 'draw' ? 'Ничья' : winTitle(top, true);
  const sub = reason === 'draw' ? 'Все игроки согласились на ничью' : reason === 'resign' ? 'Соперники сдались' : `${top.score} очков · стопка закончилась`;
  lastGold = gold;
  const myPlace = meIdx >= 0 ? order.findIndex(x => x.i === meIdx) : -1, won = reason !== 'draw' && myPlace === 0;
  const medal = reason === 'draw' ? '🤝' : myPlace < 0 ? '🏁' : ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][myPlace];
  const rows = order.slice(0, 5).map((p, k) => `<li class="${p.i === meIdx ? 'me' : ''}" style="--c:${p.col};--d:${k * 90}ms"><span class="n">${k + 1}</span><i></i><b>${p.name}</b><span class="v">${p.score}</span></li>`).join('');
  const myCol = (players[meIdx] && players[meIdx].col) || wallet.color || '#f2b84b';
  const confetti = won ? `<div class="confetti">${Array.from({length: 22}, (_, k) => `<span style="left:${(k * 4.6 + (k % 3) * 3) % 100}%;--dl:${(k % 7) * 120}ms;--cc:${[myCol, '#f2b84b', '#ffffff', myCol, '#ffd75e'][k % 5]}"></span>`).join('')}</div>` : '';
  // Offer guests to secure their progress with an account
  const needsSave = FB && !fbAuth && !registered();
  const saveCard = needsSave && (PROG.st.games >= 1) && !wallet.saveDismissed ? `<button class="ghostbtn savecard" id="saveProg"><b>🏰 Сохранить прогресс</b><small>Войдите через Google в 1 клик, чтобы не потерять фигурки, ${wallet.gold} 💰 тайлов и кубки</small></button>` : '';
  const hasMoves = gameLog && Array.isArray(gameLog.moves) && gameLog.moves.length > 0;
  over.innerHTML = `<div class="ocard fin">${confetti}<div class="medal">${medal}</div><h3>${title}</h3><p>${sub}</p><ol class="standings">${rows}</ol>${rewardChips(gold)}${xpLine()}${saveCard}<button class="cta wide" id="again2">${net ? 'Реванш' : 'Ещё партию'}</button>${hasMoves ? '<button class="ghostbtn" id="timelapseBtn">🎬 Хроника партии</button>' : ''}<button class="ghostbtn" data-go="results">Подробные итоги</button></div>`;
  over.hidden = false;
  historySave(reason, true);
  $('#again2').onclick = () => rematchClick();
  const tlBtn = $('#timelapseBtn');
  if (tlBtn) tlBtn.onclick = () => playTimelapse(over);
  const sp = $('#saveProg'); if (sp) sp.onclick = () => { wallet.saveAsked = true; saveWallet(); over.hidden = true; track('save_prompt_tap'); wallet.name ? accountDialog('link') : askProfile(); };
  if (saveCard) { wallet.saveAsked = true; saveWallet(); }
  setStatus('Партия окончена'); $('.tray').classList.add('ended');
}
let stopTimelapse = null;
async function playTimelapse(over) {
  const moves = gameLog?.moves?.slice();
  if (stopTimelapse || !moves?.length) return;
  const origin = at(0, 0);
  if (!origin) return;
  const replay = new Map();
  const add = tile => {
    const t = {...tile, el: tileEl(tile)};
    t.el.classList.add('replay-tile');
    replay.set(key(t.x, t.y), t);
    world.append(t.el);
    const hasTile = (x, y) => replay.has(key(x, y));
    walls(t, hasTile);
    for (let side = 0; side < NDIR(); side++) {
      const neighbor = replay.get(key(...nbXY(t.x, t.y, side)));
      if (neighbor) walls(neighbor, hasTile);
    }
    return t;
  };
  const match = token, previousCam = {...cam}, trigger = $('#timelapseBtn');
  over.hidden = true;
  const hud = document.createElement('div');
  hud.className = 'timelapse-hud';
  hud.innerHTML = `<span>Хроника партии · <b id="tlStep">0</b> / ${moves.length}</span><button type="button" class="chip" id="tlSkip">Закрыть</button>`;
  board.append(hud);
  world.classList.add('replaying');
  const close = hud.querySelector('#tlSkip');
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); stop(); } };
  const stop = () => {
    if (stopTimelapse !== stop) return;
    stopTimelapse = null;
    document.removeEventListener('keydown', onKey);
    hud.remove();
    for (const t of replay.values()) t.el.remove();
    world.classList.remove('replaying');
    if (token === match) {
      camAnim++; inertia++;
      Object.assign(cam, previousCam); applyCam();
      over.hidden = false;
      if (gameVisible) trigger?.focus({preventScroll: true});
    }
  };
  stopTimelapse = stop;
  close.onclick = stop;
  document.addEventListener('keydown', onKey);
  close.focus({preventScroll: true});
  const step = hud.querySelector('#tlStep');
  camAnim++; inertia++;
  Object.assign(cam, {px: 0, py: 0}); applyCam();
  try {
    let last = add(origin);
    for (const [i, move] of moves.entries()) {
      if (stopTimelapse !== stop || token !== match || !gameVisible) return;
      const source = at(move.x, move.y);
      if (source && source !== origin && !replay.has(key(source.x, source.y))) {
        last.el.classList.remove('last-move');
        last = add(source);
        last.el.classList.add('last-move');
        if (!RM) ensureVisible(last.x, last.y);
      }
      step.textContent = String(i + 1);
      await wait(RM ? 120 : 95);
    }
    await wait(650);
  } finally {
    stop();
  }
}
const winTitle = (p, final) => isMe(p) ? (final ? 'Вы победили!' : 'Вы лидируете') : `${final ? 'Побеждает' : 'Лидирует'} ${p.name}`;
const ranked = () => players.map((p, i) => ({...p, i})).sort((a, b) => {
  if (a.resigned !== b.resigned) return a.resigned ? 1 : -1;
  if (b.score !== a.score) return b.score - a.score;
  const aFeat = (a.stats?.c || 0) + (a.stats?.r || 0) + (a.stats?.f || 0);
  const bFeat = (b.stats?.c || 0) + (b.stats?.r || 0) + (b.stats?.f || 0);
  if (bFeat !== aFeat) return bFeat - aFeat;
  if (b.meeples !== a.meeples) return b.meeples - a.meeples;
  return a.i - b.i;
});
