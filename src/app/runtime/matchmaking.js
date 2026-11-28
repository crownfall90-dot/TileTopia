/* ---------------- quick match ("Играть онлайн") ----------------
   Waiting rooms announce themselves in one shared log (room QMATCH): {t:'seek', code} every
   10 s while they wait, {t:'close', code} once they start or give up. A player looking for a
   game joins the room closest to filling or, if there is none, opens one and waits there. Two
   players who opened rooms at the same moment meet in the one with the smaller code. The
   room's creator starts the game a few seconds after the second player comes in (at once
   when it is full); from then on it is an ordinary online game. */
const MATCH_ROOM = 'QMATCH', SEEK_MS = 10000, SEEK_FRESH = 25000, START_IN = 3;
var mm = null; // var: renderLobby() looks at it before this line runs
async function quickMatch(create) {
  if (!FB) return toastAny('Онлайн-поиск недоступен — используйте «С друзьями»');
  if (net && net.gameId && phase !== 'end') return show('game');
  if (!(await serverReachable())) return noServer(() => quickMatch(create));
  stopMatch(true);
  leaveRoom();
  // want: the table size of the room this player opens if nobody is waiting; joining takes any room.
  mm = (typeof PG !== 'undefined' && PG.net && PG.net.matchmaking && PG.net.matchmaking.createMatchState)
    ? PG.net.matchmaking.createMatchState({want: setup.onN || 2, mode: setup.rules.mode, create: create === true})
    : {t0: Date.now(), want: setup.onN || 2, mode: setup.rules.mode, other: new Map(), seeks: new Map(), closed: new Set(), skip: new Set(), ready: false, es: null, timers: [], startAt: 0, lastSeek: 0, create: create === true};
  const me = mm;
  me.timers.push(setInterval(() => matchTick(me), 1000));
  (async () => {
    let tok; try { tok = await fbToken(); } catch (_) { return matchFail(me); }
    if (mm !== me) return;
    const es = me.es = new EventSource(`${FB.dbUrl}/rooms/${MATCH_ROOM}/msgs.json?auth=${tok}&orderBy=%22%24key%22&limitToLast=40`);
    const take = (v) => {
      if (!v || typeof v.m !== 'string') return;
      let m; try { m = JSON.parse(v.m); } catch (_) { return; }
      if (!/^[A-Z0-9]{5}$/.test(m.code || '')) return;
      if (m.t === 'close') me.closed.add(m.code);
      // any waiting room counts, whatever its mode and size: the room keeps its own rules
      if (m.t === 'seek' && m.id !== myId) {
        const ts = Number(v.ts);
        if (!Number.isFinite(ts) || ts <= 0) return;
        const previous = me.seeks.get(m.code);
        const firstTs = Math.min(ts, previous?.firstTs ?? ts);
        if (!previous || ts >= previous.ts) me.seeks.set(m.code, {ts, firstTs, n: +m.n || 1, want: Math.min(5, Math.max(2, +m.want || 2))});
        else previous.firstTs = firstTs;
      }
    };
    const put = e => {
      let d; try { d = JSON.parse(e.data); } catch (_) { return; }
      if (!d || !d.data) return;
      if (d.path === '/') Object.values(d.data).forEach(take);
      else if (d.path.split('/').length === 2) take(d.data);
      me.ready = true; matchDecide(me);
    };
    es.addEventListener('put', put); es.addEventListener('patch', put);
    es.onopen = () => setTimeout(() => { if (!me.ready && mm === me) { me.ready = true; matchDecide(me); } }, 1500);
    es.onerror = () => { if (!me.ready && mm === me) matchFail(me); };
  })();
  show('match'); matchRender();
  if (FB && registered()) loadFriends().then(renderLobbyFriends).catch(() => {});
}
function matchFail(me) { if (mm !== me) return; toastAny('Нет связи с сервером — проверьте интернет'); stopMatch(); show('menu'); }
const matchSay = (msg) => FIRE.send(MATCH_ROOM, msg).catch(() => {});
// Open rooms others wait in, the closest to starting first: one free seat, then two, and so on (any mode and size).
function matchOpen(me) {
  return PG.net.matchmaking.filterOpenRooms(me.seeks, me.closed, me.skip, Date.now(), SEEK_FRESH, net?.code);
}
function matchDecide(me) {
  if (mm !== me || !me.ready) return;
  const open = matchOpen(me);
  if (!net) {
    if (open.length && !me.create) return connect(open[0].code, false, true);
    connect(newCode(), true, true); net.max = me.want;
    me.lastSeek = 0; return matchTick(me);
  }
  // Waiting alone in our own room while others wait too: move to a room with more people,
  // or, between two lone players, the one with the larger code moves to the smaller.
  const seats = net.lobby ? net.lobby.seats : [];
  if (net.host && !me.create && seats.length <= 1 && !net.gameId && !(invited.code === net.code && invited.uids.size)) {
    const other = open.find(o => o.n > 1 || o.code < net.code);
    if (other) { matchSay({t: 'close', code: net.code}); return connect(other.code, false, true); }
  }
}
// A room turned out to be gone, full or already playing: forget it and look again.
function matchSkip(code) {
  if (!mm) return;
  mm.skip.add(code); leaveRoom(); matchRender(); matchDecide(mm);
}
function matchTick(me) {
  if (mm !== me) return;
  const sec = Math.floor((Date.now() - me.t0) / 1000);
  $('#mClock').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const seats = net && net.quick && net.lobby ? net.lobby.seats : [];
  // After a while the creator may fill the empty seats with bots; anyone else may go play bots.
  $('#mBots').hidden = sec < FILL_SECS || !!me.startAt;
  $('#mBots').textContent = net && net.host && seats.length >= 2 ? 'Добавить ботов и начать' : 'Пока сыграть с ботами';
  if (!net || !net.quick || net.gameId) return;
  if (net.host && !me.startAt && (Date.now() - me.lastSeek > SEEK_MS || me.lastN !== seats.length)) { me.lastN = seats.length; me.lastSeek = Date.now(); matchSay({t: 'seek', code: net.code, id: myId, want: me.want, mode: me.mode, n: seats.length}); }
  // We knocked but the room's creator never let us in (closed the app, or the room is full).
  if (!net.host && Date.now() - net.since * 1000 > 9000 && !seats.some(x => x.owner === myId)) return matchSkip(net.code);
  // Guest waiting alone or with unresponsive host for >= 10s: skip to own room
  if (!net.host && Date.now() - net.since * 1000 >= FILL_SECS * 1000 && seats.length < matchRoomSize(me)) return matchSkip(net.code);

  // H-5: if no human opponent found within ~10 seconds, auto-fill remaining seats with bots so player doesn't wait in empty room
  if (net.host && !me.startAt && sec >= FILL_SECS && seats.length < me.want) {
    const nextSeats = (PG.net && PG.net.matchmaking)
      ? PG.net.matchmaking.autoFillSeats(net.lobby && net.lobby.seats ? net.lobby.seats : seats, me.want, {owner: myId, uid: myUid(), name: myName(), st: myStatus(), fig: wallet.fig, col: wallet.color}, [], randomFig)
      : (net.lobby && net.lobby.seats ? net.lobby.seats.slice() : (seats.slice() || []));
    if (!nextSeats.some(x => x.owner === myId)) nextSeats.unshift({owner: myId, uid: myUid(), name: myName(), st: myStatus(), fig: wallet.fig, col: wallet.color, ready: true});
    while (nextSeats.length < me.want) nextSeats.push({owner: null, bot: true, ghost: 1, name: ghostName(nextSeats), fig: randomFig(), col: null, ready: true});
    // seats added by the module above carry no human-like name yet
    nextSeats.forEach(x => { if (x.bot && !x.owner && !x.ghost) { x.ghost = 1; x.name = ghostName(nextSeats.filter(y => y !== x)); } });
    publishLobby(nextSeats);
    me.startAt = Date.now() + 1500;
    matchSay({t: 'close', code: net.code});
  }

  if (net.host && me.startAt && Date.now() >= me.startAt) { me.startAt = Infinity; startOnline(net.lobby ? net.lobby.seats : seats); }
  matchRender();
}
const meLabel = (me, name) => (name = clean(name), me && name !== 'Вы' ? name + ' (вы)' : name);
const matchRoomSize = me => net?.quick && net.lobby?.max ? roomMax() : me.seeks.get(net?.code)?.want || me.want;
function matchRender() {
  if (!mm) return;
  const seats = net && net.quick && net.lobby ? net.lobby.seats : [], want = matchRoomSize(mm);
  if (net && net.host && seats.length >= want && !mm.startAt) {
    mm.startAt = Date.now() + START_IN * 1000;
    matchSay({t: 'close', code: net.code});
  }
  const status = (typeof PG !== 'undefined' && PG.net && PG.net.matchmaking)
    ? PG.net.matchmaking.formatMatchStatus({seatsCount: seats.length, wantCount: want, startAt: mm.startAt, now: Date.now()})
    : {
        full: seats.length >= want,
        left: mm.startAt && mm.startAt !== Infinity ? Math.max(0, Math.ceil((mm.startAt - Date.now()) / 1000)) : 0,
        title: (seats.length >= want)
          ? ((mm.startAt && mm.startAt !== Infinity && Math.ceil((mm.startAt - Date.now()) / 1000) > 0) ? `Старт через ${Math.ceil((mm.startAt - Date.now()) / 1000)}…` : 'Начинаем!')
          : (Math.max(0, seats.length - 1) ? `Найдено ${Math.max(0, seats.length - 1)} из ${want - 1}` : 'Ищем соперников…')
      };
  $('#mLoad').classList.toggle('found', status.full);
  $('#mTitle').textContent = status.title;
  const hasBot = seats.some(x => !x.owner);
  $('#mSub').textContent = status.full ? (hasBot && !seats.some(x => x.ghost) ? 'Соперников нет — играем с ботом (без кубков)' : 'Все игроки собрались') : `Партия на ${want} ${want < 5 ? 'игрока' : 'игроков'} начнётся, когда соберутся все`;
  const html = (typeof PG !== 'undefined' && PG.net && PG.net.matchmaking && PG.net.matchmaking.renderMatchSeatsHtml)
    ? PG.net.matchmaking.renderMatchSeatsHtml({seats, want, myId, myName: myName(), myColor: wallet.color, palette: PL0, cleanFn: clean, meLabelFn: meLabel})
    : (() => {
        const list = seats.map((x, i) => `<li><span class="av" style="--c:${validCol(x.col) ? x.col : PL0[i].col}">${(clean(x.name) || '?')[0]}</span>${meLabel(x.owner === myId, x.name)}${!x.owner && !x.ghost ? ' <span class="botpill">бот</span>' : ''}</li>`);
        if (!seats.length) list.push(`<li><span class="av" style="--c:${validCol(wallet.color) ? wallet.color : PL0[0].col}">${myName()[0]}</span>${meLabel(true, myName())}</li>`);
        while (list.length < want) list.push('<li class="wait"><span class="av">?</span>Ищем</li>');
        return list.join('');
      })();
  if ($('#mSeats').innerHTML !== html) $('#mSeats').innerHTML = html; // re-rendering restarts the pop-in
  // Nobody for our size yet, but a room of the same mode waits for another number of players.
  const alt = !status.full && seats.length <= 1 && Date.now() - mm.t0 > 4000 ? [...mm.other].filter(([c, o]) => !mm.closed.has(c) && !mm.skip.has(c) && Date.now() - o.ts < SEEK_FRESH && o.n < o.want).sort((a, b) => b[1].n - a[1].n)[0] : null;
  renderLobbyFriends();
  $('#mOther').hidden = !alt;
  if (alt) { $('#mOther').textContent = `Есть партия на ${alt[1].want} — присоединиться (${alt[1].n} из ${alt[1].want})`; $('#mOther').dataset.code = alt[0]; $('#mOther').dataset.want = alt[1].want; }
}
// keepRoom: the game is starting, so stay in the room; otherwise leave it (and close it if ours).
function stopMatch(keepRoom) {
  const me = mm; if (!me) return;
  mm = null;
  me.timers.forEach(clearInterval);
  if (me.es) me.es.close();
  if (!keepRoom && net && net.quick) { if (net.host && !net.gameId) matchSay({t: 'close', code: net.code}); if (!net.gameId) leaveRoom(); }
}
const _po = $('#playOnline'); if (_po) _po.onclick = () => openSetup('online');
$('#mCancel').onclick = $('#mBack').onclick = () => show('menu');
$('#mOther').onclick = () => {
  const b = $('#mOther'); if (!mm || !b.dataset.code) return;
  if (net && net.host && !net.gameId) matchSay({t: 'close', code: net.code});
  mm.want = +b.dataset.want; mm.startAt = 0; b.hidden = true;
  connect(b.dataset.code, false, true); matchRender();
};
$('#mBots').onclick = () => {
  const seats = net && net.quick && net.lobby ? net.lobby.seats.slice() : [];
  if (!net || !net.host || seats.length < 2) return openSetup('bots');
  while (seats.length < mm.want) seats.push({owner: null, name: BOT_NAMES.find(n => !seats.some(x => x.name === n)) || 'Бот', fig: randomFig(), col: null});
  mm.startAt = Infinity; matchSay({t: 'close', code: net.code}); startOnline(seats);
};

/* Quick phrases online: a fixed set of emoji and short lines (no free text, so nothing to
   moderate). They appear as a bubble under the sender's card for a few seconds. */
const {DEFAULT_EMOTES, DEFAULT_PHRASES} = PG.state.reactions;

const ALL_EMOTES = [
  '👑', '🧩', '🏰', '⚔️', '🛡️', '🌊',
  '🌉', '🌲', '🎲', '🏆', '💡', '🧐',
  '🍵', '🔥', '🤝', '🎯', '⏳', '😱',
  '🧱', '🥳', '😎', '😅', '👏', '❤️'
];

const ALL_PHRASES = [
  'Отличный ход!',
  'Мой замок!',
  'Так и планировал 😎',
  'Вот это поворот!',
  'Красивая карта!',
  'Удачи за столом! 🤝',
  'Секунду, считаю очки... ⏳',
  'Дзен превыше всего 🍵',
  'Неожиданный стык! 🧩',
  'Защищай границы! ⚔️',
  'Река к победе 🌊',
  'Почти получилось!',
  'Ну ты гроссмейстер! 👑',
  'Тут моя дорога 🛤️',
  'Ловушка захлопнулась 🏰',
  'Ещё партию? 🎮',
  'Рискнём на удачу! 🎲',
  'Красиво строишь!',
  'Я думал иначе... 🤔',
  'Всё под контролем!',
  'Спасибо за игру! ❤️',
  'Каждый тайл на счету 🎯',
  'Партия века! 🔥',
  'Приветствую в TileTopia! 👋'
];

const SAYS = [...ALL_EMOTES, ...ALL_PHRASES];
// A message stays on screen SAY_MS; its author cannot send the next one before it is gone (everyone ignores a faster one).
const SAY_MS = 3200, sayUntil = {};
let sayAt = 0;
const isText = x => /[а-яёА-ЯЁ]/i.test(x);
function renderSayBox() {
  const chosenEm = PG.state.reactions.deck(wallet, 'emote'), chosenTx = PG.state.reactions.deck(wallet, 'phrase');
  $('#sayBox').innerHTML = `<div class="sy-lock">Подождите: прошлое сообщение ещё на экране</div>` +
    `<div class="sy-top"><span class="sy-h">Эмоции</span><span class="sy-cnt">${chosenEm.length}/5</span></div>` +
    `<div class="sy-e sy-deck">${chosenEm.map(x => `<button class="e" data-say="${SAYS.indexOf(x)}" title="${x}">${x}</button>`).join('')}</div>` +
    `<div class="sy-top" style="margin-top:10px"><span class="sy-h">Фразы</span><span class="sy-cnt">${chosenTx.length}/5</span></div>` +
    `<div class="sy-t sy-deck">${chosenTx.map(x => `<button data-say="${SAYS.indexOf(x)}" title="${x}">${x}</button>`).join('')}</div>` +
    `<div class="sy-footer"><button type="button" class="sy-deck-btn" id="syDeckBtn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>Выбрать реакции в «Моих предметах»</button></div>`;
  const sdb = document.getElementById('syDeckBtn');
  if (sdb) sdb.onclick = () => { $('#sayBox').hidden = true; show('items'); itab = 'em'; renderItems(); };
}
renderSayBox();
const sayLocked = () => Date.now() < sayAt;
function sayLockUi() {
  const on = sayLocked(); $('#sayBox').classList.toggle('lock', on);
  const b = $('#sayBtn'); b.classList.remove('cool'); if (on) { void b.offsetWidth; b.style.setProperty('--ms', (sayAt - Date.now()) + 'ms'); b.classList.add('cool'); }
}
$('#sayBtn').onclick = e => { e.stopPropagation(); const box = $('#sayBox'); box.hidden = !box.hidden; if (!box.hidden) box.classList.toggle('lock', sayLocked()); };
document.addEventListener('pointerdown', e => { if (!e.target.closest('#sayBox,#sayBtn')) $('#sayBox').hidden = true; });
$('#sayBox').addEventListener('click', e => {
  const b = e.target.closest('[data-say]'); if (!b || sayLocked()) return;
  const me = players.findIndex(isMe); if (me < 0) return;
  $('#sayBox').hidden = true;
  sayAt = Date.now() + SAY_MS; sayLockUi(); setTimeout(() => { $('#sayBox').classList.remove('lock'); $('#sayBtn').classList.remove('cool'); }, SAY_MS);
  if (meCounted()) progress({say: 1});
  if (net) {
    netSend({t: 'say', g: net.gameId, p: me, i: +b.dataset.say});
  } else {
    showSay(me, +b.dataset.say);
    const botIdxs = players.map((p, i) => !isMe(p) && !p.human ? i : -1).filter(i => i >= 0);
    if (botIdxs.length && Math.random() < 0.45) {
      const bIdx = botIdxs[Math.floor(Math.random() * botIdxs.length)];
      const botReplyPool = ['👑', '🔥', '🤝', '🎯', '🥳', '😎', '👏', '❤️', 'Отличный ход!', 'Красиво строишь!'];
      const botReplies = botReplyPool.map(x => SAYS.indexOf(x)).filter(idx => idx >= 0);
      const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
      setTimeout(() => { if (typeof phase !== 'undefined' && phase !== 'end') showSay(bIdx, reply); }, 1200 + Math.random() * 800);
    }
  }
});
function showSay(p, i, uid) {
  const txt = SAYS[i], card = playersEl.children[p]; if (!txt || !card) return;
  if ((sayUntil[p] || 0) > Date.now()) return;
  sayUntil[p] = Date.now() + SAY_MS - 400;
  const r = card.getBoundingClientRect(), b = document.createElement('div'), cx = Math.min(innerWidth - 60, Math.max(60, r.left + r.width / 2)), cy = r.bottom + 32; // under the turn clock, never over it
  b.className = 'bubble' + (isText(txt) ? '' : ' e'); b.textContent = txt; b.style.setProperty('--c', players[p].col);
  if (uid) b.dataset.contactFrom = uid;
  b.style.left = cx + 'px'; b.style.top = cy + 'px';
  document.body.append(b); setTimeout(() => b.remove(), SAY_MS + 100);
  if (!isText(txt) && !RM) for (let k = 0; k < 8; k++) {
    const sp = document.createElement('i'); sp.className = 'spark'; sp.textContent = txt;
    if (uid) sp.dataset.contactFrom = uid;
    sp.style.cssText = `left:${cx - 8}px;top:${cy + 10}px;--dx:${((k - 3) * 16 + (Math.random() - .5) * 14) | 0}px;--dy:${(-30 - Math.random() * 50) | 0}px;--rt:${((Math.random() - .5) * 90) | 0}deg;animation-delay:${k * 70}ms`;
    document.body.append(sp); setTimeout(() => sp.remove(), 1900 + k * 70);
  }
  if (!isMe(players[p])) beep('chat');
}
