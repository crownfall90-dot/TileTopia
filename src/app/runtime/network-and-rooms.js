/* ---------------- online ----------------
   Phones in a room share one append-only log of messages named after the room code.
   The room creator ("host") keeps the seat list and runs the bots; every phone replays
   the same start + move messages, so all boards stay identical, and a player who closed
   the app can rejoin with the same code. The log lives in Firebase Realtime Database when
   the app is built with a Firebase config, otherwise on the public ntfy.sh relay. */
const myName = () => profileName();
const LIMIT_MSG = 'Сервер онлайн-игры исчерпал лимит для вашей сети на сегодня. Попробуйте с мобильного интернета или завтра';

// ntfy.sh: free, no setup, 250 messages a day per IP address.
const NTFY = {
  send(code, msg) {
    return fetch('https://ntfy.sh/puzzlegrad-' + code, {method: 'POST', body: JSON.stringify(msg)})
      .then(r => { if (r.status === 429) toastAny(LIMIT_MSG); });
  },
  listen(code, on) {
    const es = new EventSource('https://ntfy.sh/puzzlegrad-' + code + '/sse?since=all');
    es.onopen = on.open; es.onerror = on.error;
    es.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (_) { return; } if (d.event === 'message') on.msg({id: d.id, time: d.time, message: d.message}); };
    return () => es.close();
  },
};

// Firebase Realtime Database over REST with an anonymous account (rules: docs/firebase-rules.json).
const FB = window.FIREBASE || null;
let fbAuth = null;
// Session and REST calls live in src/net/firebase.js; fbAuth mirrors the session for the code that reads it.
const FBC = FB ? PG.net.createFirebase({apiKey: FB.apiKey, dbUrl: FB.dbUrl, storage: (() => { try { return localStorage; } catch (_) { return {getItem: () => null, setItem() {}}; } })(), fetch: (...a) => fetch(...a), onChange: a => { fbAuth = a; }}) : null;
function fbToken() { return FBC.token(); }
const FIRE = {
  async send(code, msg) {
    const tok = await fbToken(); // u: who really wrote it — the database rules make it equal to the writer's account id
    const r = await fetch(`${FB.dbUrl}/rooms/${code}/msgs.json?auth=${tok}`, {method: 'POST', body: JSON.stringify({m: JSON.stringify(msg), ts: {'.sv': 'timestamp'}, u: fbAuth && fbAuth.uid || undefined})});
    if (!r.ok) throw new Error('send ' + r.status);
  },
  listen(code, on) {
    let es = null, closed = false, pause = 2000;
    const emit = (id, v) => v && typeof v.m === 'string' && on.msg({id, time: (v.ts || Date.now()) / 1000, message: v.m, u: typeof v.u === 'string' ? v.u : ''});
    const start = async () => {
      let tok; try { tok = await fbToken(); } catch (_) { return on.error(); }
      if (closed) return;
      es = new EventSource(`${FB.dbUrl}/rooms/${code}/msgs.json?auth=${tok}`);
      es.onopen = () => { pause = 2000; on.open(); };
      // the browser retries a dropped stream by itself; one it gave up on (closed) is reopened here, waiting longer each time
      es.onerror = () => { on.error(); if (es.readyState === 2 && !closed) { setTimeout(() => { if (!closed) start(); }, pause); pause = Math.min(pause * 2, 30000); } };
      const put = e => {
        let d; try { d = JSON.parse(e.data); } catch (_) { return; }
        if (d.path === '/') Object.keys(d.data || {}).sort().forEach(k => emit(k, d.data[k]));
        else if (d.path.split('/').length === 2) emit(d.path.slice(1), d.data);
        else Object.keys(d.data || {}).sort().forEach(k => emit(k, d.data[k]));
      };
      es.addEventListener('put', put); es.addEventListener('patch', put);
      // Tokens live an hour: reconnect with a fresh one; already seen messages are skipped.
      es.addEventListener('auth_revoked', () => { es.close(); fbAuth.exp = 0; start(); });
    };
    start();
    return () => { closed = true; if (es) es.close(); };
  },
};
const TRANSPORT = FB ? FIRE : NTFY;

// Players with an existing session mark themselves in /presence once a minute (and remove the mark
// when it goes to the background); the menu counts marks from the last 2.5 minutes.
// Rules for /presence are in docs/firebase-rules.json.
// Season titles (scripts/champions.py): every two weeks the best of each rating get a title in /titles/{uid}; the game
// turns it into a status to wear («Чемпион», «Чемпион ×2», «Призёр»…) and says so once. Checked with the presence mark.
let titlesAt = 0;
async function checkTitles() {
  if (!FB || !fbAuth.uid || Date.now() - titlesAt < 30 * 60000) return;
  titlesAt = Date.now();
  const t = await fbGet('titles/' + fbAuth.uid).catch(() => null);
  if (!t) return;
  const added = PG.state.status.grantTitles(wallet, t);
  if (!added.length) return;
  saveWallet();
  const txt = PG.state.status.statusText(added[added.length - 1]);
  toastAny(`🏆 Итоги сезона: вам присвоено звание «${txt}». Наденьте его в профиле!`);
}
async function presenceMark(on) {
  if (!FBC?.load()?.uid) return;
  try {
    const tok = await fbToken();
    if (!fbAuth.uid) return;
    if (on) checkTitles();
    const url = `${FB.dbUrl}/presence/${fbAuth.uid}.json?auth=${tok}`;
    const vs = versionSeen(), di = devInfo(), dev = {p: installKind(), v: vs.v, u: vs.t, ...(di.m ? {m: di.m, i: di.i} : {})};
    const ret = {fr: FRAMES[wallet.frame] ? wallet.frame : '', a: ACH.filter(x => PROG.ach[x.id] === 'got').length, lv: PROG.lvl || 1, w: (PROG.st && PROG.st.wins) || 0, g: (PROG.st && PROG.st.games) || 0, c: validCol(wallet.color) ? wallet.color : '', st: myStatus(), fs: wallet.firstSeen || today(), d1: (wallet.rd && wallet.rd[1]) ? 1 : 0, d7: (wallet.rd && wallet.rd[7]) ? 1 : 0};
    if (on) await fetch(url, {method: 'PUT', body: JSON.stringify({t: {'.sv': 'timestamp'}, n: profileName(), s: presenceState(), r: registered() ? 1 : 0, ...dev, ...ret})});
    else await fetch(url, {method: 'PUT', keepalive: true, body: JSON.stringify({t: {'.sv': 'timestamp'}, n: profileName(), s: 'off', ...dev, ...ret})});
  } catch (_) {}
}
// For the owner's stats: where this copy came from (github = APK, play, web) and when this device
// last moved to a new version, so each device counts once however many files it downloaded.
const installKind = () => isAndroid ? (AndroidApp.store ? AndroidApp.store() : 'github') : isWeb ? 'web' : 'mock';
// This phone's model and screen diagonal (app only), sent with the presence record for the owner's statistics.
let devInfoCache = null;
function devInfo() {
  if (devInfoCache) return devInfoCache;
  try { devInfoCache = isAndroid && AndroidApp.deviceInfo ? JSON.parse(AndroidApp.deviceInfo()) : {}; } catch (_) { devInfoCache = {}; }
  return devInfoCache;
}
function versionSeen() {
  // Kept outside the profile: it belongs to this device, not to the account.
  const v = appVersion();
  let seen = null; try { seen = JSON.parse(localStorage.getItem('verSeen')); } catch (_) {}
  if (!seen || seen.v !== v) { seen = {v, t: Date.now()}; try { localStorage.setItem('verSeen', JSON.stringify(seen)); } catch (_) {} }
  return seen;
}
// What this player is doing, shown in the "who is online" list.
function presenceState() {
  if (mm) return 'search';
  if (gameVisible && phase !== 'end' && players.length) return net ? 'online' : 'bots';
  return 'menu';
}
const STATE_TEXT = {search: 'ищет соперников', online: 'играет онлайн', bots: 'играет с ботами', menu: 'в меню'};
let presenceList = [], presenceSoon = 0;
async function presenceCount() {
  if (!FBC?.load()?.uid) return;
  try {
    const tok = await fbToken();
    const r = await fetch(`${FB.dbUrl}/presence.json?auth=${tok}&orderBy=%22t%22&startAt=${Date.now() - 150000}`);
    if (!r.ok) return;
    const all = (await r.json()) || {};
    presenceList = Object.entries(all).map(([uid, v]) => ({uid, ...v})).filter(x => x.s && x.n && x.s !== 'off').sort((a, b) => (b.uid === (fbAuth && fbAuth.uid)) - (a.uid === (fbAuth && fbAuth.uid)) || b.t - a.t);
    const n = presenceList.length;
    document.querySelectorAll('.onlineN').forEach(e => { e.hidden = true; });
    friendsDot();
  } catch (_) {}
}
let presenceTimer = 0;
function presenceTick() {
  clearTimeout(presenceTimer);
  if (document.hidden) return;
  presenceMark(true).then(presenceCount).then(inboxPoll).then(() => { if (typeof cloudPeek === 'function') { cloudPeek(); profileListen(); } }); // the inbox also has a live stream; this covers a dropped one
  presenceTimer = setTimeout(presenceTick, 60000);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(presenceTimer); presenceMark(false); } else presenceTick(); });
if (FB) setTimeout(() => {
  if (FBC.load()?.uid) ensureGuestName().then(presenceTick);
  else presenceTick();
}, 1500);
if (FB) setTimeout(() => { try { profileListen(); } catch (_) {} }, 3000);

function netSend(msg) {
  return TRANSPORT.send(net.code, msg).catch(() => toast('Нет связи — проверьте интернет'));
}
let openMatchTimer = 0;
function leaveRoom() {
  clearRematchTimer();
  if (net && net.openMatch && typeof FIRE !== 'undefined' && FIRE && typeof FIRE.send === 'function') {
    FIRE.send(MATCH_ROOM, {t: 'close', code: net.code}).catch(() => {});
  }
  clearInterval(openMatchTimer);
  if (net && net.close) net.close();
  if (net) netUp(net);
  net = null;
}
/* Connection to the table (phase 1.3 of the roadmap): a short drop shows a quiet "reconnecting" line over the board;
   one longer than 30 s asks "Retry / To the menu". The game itself is never lost: moves are kept on the server and
   replayed without animation when the stream comes back. */
const NET_DIALOG_AFTER = 30000;
function netDown(me) {
  if (me.down) return;
  me.down = Date.now(); $('#netBad').hidden = false; track('net_down');
  clearTimeout(me.downT);
  me.downT = setTimeout(() => {
    if (net !== me || !me.down) return;
    confirmBox('Связь с игрой потеряна<br><small>Партия сохранена на сервере. Проверьте интернет и попробуйте снова — ходы подтянутся сами</small>', 'Повторить', () => netRetry(me), 'В меню', () => { show('menu'); });
  }, NET_DIALOG_AFTER);
}
function netUp(me) {
  clearTimeout(me.downT); if (!me.down) return;
  me.down = null; $('#netBad').hidden = true;
  const box = document.getElementById('confirmBox'); if (box && box.dismiss && /Связь с игрой потеряна/.test(box.textContent)) box.dismiss(false);
  track('net_back');
}
// Retry: open the stream again from scratch (seen messages are skipped, so nothing is applied twice).
function netRetry(me) {
  if (net !== me) return;
  if (me.close) me.close();
  me.down = null; netDown(me);
  me.close = TRANSPORT.listen(me.code, {open: () => net === me && netUp(me), error: () => {}, msg: d => { if (net === me) onNet(d); }});
}
addEventListener('offline', () => { if (net && net.gameId) netDown(net); });
// Before going online: one request to the game server with a time limit (Wi-Fi alone proves nothing).
async function serverReachable(ms = 6000) {
  if (!FB) return true;
  const ac = typeof AbortController === 'function' ? new AbortController() : null, t = setTimeout(() => ac && ac.abort(), ms);
  try { const r = await fetch(`${FB.dbUrl}/config/maintenance.json`, ac ? {signal: ac.signal, cache: 'no-store'} : {cache: 'no-store'}); return r.status < 500; }
  catch (_) { return false; }
  finally { clearTimeout(t); }
}
function noServer(retry) { confirmBox('Нет связи с игровым сервером<br><small>Проверьте интернет. Игра с ботами и на одном телефоне работает без сети</small>', 'Повторить', retry, 'Закрыть'); }
function connect(code, asHost, quick) {
  leaveRoom();
  const me = net = {code, host: false, hostId: null, seen: new Set(), uidOf: new Map(), secure: false, lobby: null, gameId: null, since: Date.now() / 1000, quick: !!quick, openMatch: !!quick, openMatchSince: quick ? Date.now() : 0};
  let opened = false;
  net.close = TRANSPORT.listen(code, {
    open() {
      if (net !== me) return;
      if (opened) return netUp(me); // back after a drop: the stream sends everything again, seen messages are skipped
      opened = true;
      (asHost ? netSend({t: 'host', id: myId}) : Promise.resolve()).then(() => netSend({t: 'hello', v2: 1, st: myStatus(), id: myId, uid: myUid(), reg: registered() ? 1 : 0, name: myName(), fig: wallet.fig, col: wallet.color}));
      if (!asHost) setTimeout(() => { if (net === me && !net.hostId) { if (me.quick) return matchSkip(code); toastAny('Комната не найдена — проверьте код'); leaveRoom(); renderLobby(); } }, 6000);
    },
    error() {
      if (net !== me) return;
      if (!opened) { toastAny('Нет связи с сервером комнат'); leaveRoom(); renderLobby(); if (me.quick) stopMatch(); return; }
      netDown(me);
    },
    msg(d) { if (net === me) onNet(d); },
  });
  renderLobby();
}
// max: how many seats the creator chose for the room.
function publishLobby(seats) { netSend({t: 'lobby', seats, rules: setup.rules, max: roomMax(), openMatch: !!net.openMatch}); }
const roomMax = () => (PG.net && PG.net.rooms) ? PG.net.rooms.roomMax(net, 5) : Math.min(5, Math.max(2, (net && (net.max || net.lobby && net.lobby.max)) || 5));
/* Who may say what in a room (audit S-2). Every message carries d.u, the account id of the phone that wrote it (the
   database rules force it to be true). The first time a phone says hello its client id is tied to that account id;
   after that only the same account can speak for that client. Moves and the rest of a seat's messages must come from
   the seat's owner; a move marked auto (another phone plays for a player who ran out of time) and the bots' moves
   may come from any player in the room. Rooms started by a new version (start.sec = 1) are "secure": messages without
   d.u are dropped there; older rooms keep working as before. Returns false: ignore the message (never stop the game). */
function netAuth(d, m) {
  if (PG.net && PG.net.rooms) return PG.net.rooms.netAuth(d, m, net, players);
  const u = typeof d.u === 'string' ? d.u : '', ids = net.uidOf;
  if (!u) return !net.secure;
  const bind = id => {
    if (typeof id !== 'string') return false;
    const b = ids.get(id);
    if (!b || !net.gameId) { ids.set(id, u); return true; } // before the start an account may change (guest signed in)
    return b === u;
  };
  const hostUid = net.hostId ? ids.get(net.hostId) : '';
  if (m.t === 'host') return !net.hostId || m.id === net.hostId ? bind(m.id) : false;
  if (m.t === 'hello' || m.t === 'ready') return bind(m.id);
  if (m.t === 'lobby' || m.t === 'start') {
    if (hostUid && u !== hostUid) return false;
    if (m.t === 'start' && m.sec === 1) net.secure = true;
    return true;
  }
  if (m.g !== net.gameId || typeof m.p !== 'number' && m.t !== 'ver' && m.t !== 'upd' && m.t !== 'upresume') return true;
  const seat = typeof m.p === 'number' ? players[m.p] : null;
  const room = new Set(players.filter(x => x.owner).map(x => ids.get(x.owner)).filter(Boolean));
  if (hostUid) room.add(hostUid);
  if (!seat) return room.has(u) || !net.secure; // ver / upd / upresume: anyone in the room
  if (!seat.owner || (m.t === 'move' && m.auto)) return room.has(u) || !net.secure; // a bot seat is run by the room's creator
  const owner = ids.get(seat.owner);
  return owner ? owner === u : !net.secure;
}
// The transport binds a client ID to the account that actually posted its messages, including guest accounts.
function roomContactUid(seat) {
  return seat && ((net && net.uidOf && net.uidOf.get(seat.owner || seat.prevOwner)) || seat.uid);
}
function onNet(d) {
  if (net.seen.has(d.id)) return;
  net.seen.add(d.id);
  let m; try { m = JSON.parse(d.message); } catch (_) { return; }
  const live = d.time >= net.since - 2;
  if (!m || typeof m !== 'object' || !netAuth(d, m)) return;
  if (m.t === 'host') { if (!net.hostId) { net.hostId = m.id; net.host = m.id === myId; } return renderLobby(); }
  if (m.t === 'hello' && net.host) { (net.peerV2 = net.peerV2 || new Map()).set(m.id, m.v2 === 1); }
  if (m.t === 'hello' && net.host && !net.gameId) {
    const seats = net.lobby ? net.lobby.seats.slice() : [];
    const s = seats.find(x => x.owner === m.id);
    const uid = m.reg ? (d.u || (typeof m.uid === 'string' && m.uid.slice(0, 64)) || null) : null;
    const stv = PG.state.status.shownStatus(m.st);
    if (s) { if (s.name !== clean(m.name) || s.fig !== m.fig || s.col !== m.col || s.uid !== uid || (s.st || '') !== stv) { s.name = clean(m.name); s.fig = m.fig; s.col = m.col; s.uid = uid; s.st = stv; publishLobby(seats); } }
    else if (seats.length < roomMax()) { seats.push({owner: m.id, uid, name: clean(m.name), fig: m.fig, col: m.col, st: stv, ready: false}); publishLobby(seats); }
    return;
  }
  if (m.t === 'ready' && net.host && !net.gameId) {
    const seats = net.lobby ? net.lobby.seats.slice() : [];
    const s = seats.find(x => x.owner === m.id);
    if (s) { s.ready = !!m.ready; publishLobby(seats); renderLobby(); }
    return;
  }
  if (m.t === 'lobby') {
    net.lobby = m;
    if (!net.host) {
      Object.assign(setup.rules, m.rules);
      if (m.max) net.max = m.max;
      net.openMatch = !!m.openMatch;
    }
    return renderLobby();
  }
  if (m.t === 'start') {
    if (net.gameId === d.id) return;
    // Quick match: a room that started without us is no use — look for another one.
    if (net.quick && !m.seats.some(x => x.owner === myId)) return matchSkip(net.code);
    net.gameId = d.id;
    // "Online" (rated) or a friends' room: told by the game's creator in the start message, so a friend who came in by an
    // invitation, or who returns to the game later, plays the same kind of game. Games started before this carried no
    // flag: then what this phone remembered about the game is used.
    const was = lastOnline();
    net.quick = typeof m.quick === 'boolean' ? m.quick : !!(was && was.code === net.code && was.q);
    startGame({seats: m.seats.map((x, i) => ({name: clean(x.name) || 'Игрок ' + (i + 1), human: !!x.owner, ghost: !!x.ghost, st: PG.state.status.shownStatus(x.st), owner: x.owner, uid: typeof x.uid === 'string' ? String(x.uid).replace(/[^\w-]/g, '').slice(0, 64) : null, fig: FIGS[x.fig] ? x.fig : 'classic', botlvl: x.botlvl || 'normal', col: validCol(x.col) ? x.col : PL0[i % PL0.length].col})), rules: m.rules, deck: m.deck, seed: m.seed, online: d.id, noIntro: !live});
    if (!m.seats.some(x => x.owner === myId)) toast('Партия уже идёт — вы смотрите');
    else { try { localStorage.setItem('lastGame', JSON.stringify({code: net.code, at: Date.now(), q: net.quick ? 1 : 0})); } catch (_) {} updAnnounce(); } // to come back after a restart
    return show('game');
  }
  if (m.t === 'move') { if (!live) m.old = true; return onMove(m); }
  if (m.g === net.gameId && phase !== 'end') {
    if (m.t === 'upd') { if (live) { updOpen(m.c); if (appCode() >= m.c) updAnnounce(); } return; }
    if (m.t === 'ver') { if (live && net.upd && typeof m.c === 'number' && m.c >= net.upd.c) { net.upd.ready.add(m.o); updCheck(); } return; }
    if (m.t === 'upresume') { if (live && net.upd && m.c >= net.upd.c) updEnd('Партия продолжается'); return; }
  }
  if (m.t === 'rematch') {
    if (net) {
      net.rematchVotes = net.rematchVotes || new Set();
      const voterId = m.id || (typeof m.p === 'number' && players[m.p] && players[m.p].owner) || ('p' + m.p);
      if (!net.rematchVotes.has(voterId)) {
        net.rematchVotes.add(voterId);
        const playerName = clean(m.name) || (typeof m.p === 'number' && players[m.p] && clean(players[m.p].name)) || 'Соперник';
        const humans = players.filter(p => p.human);
        if (!isPlayerBlocked(d.u || roomContactUid(players[m.p]))) toastAny(`${playerName} предлагает реванш! (${net.rematchVotes.size}/${humans.length})`);
      }
      updateRematchUI();
      checkRematchVotes();
    }
    return;
  }
  if (m.g !== net.gameId || !players[m.p] || phase === 'end') return;
  if (m.t === 'resign') return onResign(m.p);
  if (m.t === 'here') { players[m.p].missed = 0; return renderPlayers(); }
  if (m.t === 'peek') return live && showPeek(m);
  if (m.t === 'say') {
    const uid = d.u || roomContactUid(players[m.p]);
    return live && !isPlayerBlocked(uid) && showSay(m.p, m.i, uid);
  }
  if (m.t === 'draw') return onDrawOffer(m, d.u || roomContactUid(players[m.p]));
  if (m.t === 'drawReply') return onDrawReply(m);
}
/* Others see where you are about to put the card, before you confirm it: while the card is held, its place and
   turn are sent (at most ~3 times a second, only when they change) and shown to the rest as a tinted, unconfirmed card. */
let peekT = 0, peekLast = '', peekEl = null, peekDeg = 0;
function peekSend() {
  if (!net || !net.gameId || tut || !['place', 'ai'].includes(phase) || !sel || !current || !(isLocal(turn) || (net.host && !players[turn].human))) return; // own card, or a bot the room creator runs
  const msg = {t: 'peek', g: net.gameId, p: turn, n: applied, x: sel.x, y: sel.y, r: current.r}, key = msg.n + ':' + msg.x + ',' + msg.y + ',' + msg.r;
  if (key === peekLast || peekT) return;
  peekT = setTimeout(() => {
    peekT = 0;
    if (!net || !['place', 'ai'].includes(phase) || !sel || !current) return;
    const k = applied + ':' + sel.x + ',' + sel.y + ',' + current.r; if (k === peekLast) return;
    peekLast = k; TRANSPORT.send(net.code, {...msg, n: applied, x: sel.x, y: sel.y, r: current.r}).catch(() => {});
  }, 350);
}
function peekClear() { if (peekEl) { peekEl.remove(); peekEl = null; } clearTimeout(peekT); peekT = 0; peekLast = ''; }
function showPeek(m) {
  if (phase !== 'remote' || !current || m.n !== applied || m.p !== turn || isLocal(m.p) || !Number.isInteger(m.x) || !Number.isInteger(m.y) || !(m.r >= 0 && m.r < NDIR())) return;
  if (tiles.has(key(m.x, m.y)) || Math.abs(m.x) > 80 || Math.abs(m.y) > 80) return;
  if (!peekEl) { peekDeg = m.r * ROT(); peekEl = tileEl({x: m.x, y: m.y, type: current.type, r: m.r}); peekEl.classList.add('ghost', 'peek'); world.append(peekEl); }
  else peekDeg += (((m.r * ROT() - peekDeg) % 360) + 540) % 360 - 180; // turn the short way
  peekEl.style.setProperty('--pc', players[m.p].col);
  const [pl, pt] = cellLT(m.x, m.y); peekEl.style.left = pl + 'px'; peekEl.style.top = pt + 'px';
  const f = peekEl.querySelector('.face'); if (f) f.style.setProperty('--r', peekDeg + 'deg');
}
function onMove(m) {
  if (m.g !== net.gameId || m.n < applied || queue.some(q => q.n === m.n)) return;
  queue.push(m);
  // This turn was already played earlier (e.g. before an app restart): take it from the history.
  if (m.n === applied && m.p === turn && ['place', 'handover', 'ai'].includes(phase)) cancelTurn();
  if (phase === 'remote') pumpRemote();
}
function cancelTurn() {
  peekClear(); turnTok++; stopTimer(); clearSlots();
  if (ghost) { ghost.remove(); ghost = null; }
  $('#over').hidden = true; phase = 'remote';
}
function waitRemote() {
  phase = 'remote'; okBtn.disabled = rotBtn.disabled = true;
  setStatus(net ? `Ходит <b>${players[turn].name}</b>…` : 'Восстанавливаем партию…');
  pumpRemote(); startWatch(); watchClock();
}
// Everyone at the table sees the clock of the player whose turn it is (this phone only shows it here;
// the player's own phone plays the card when it runs out, or another phone does after a while).
function watchClock() {
  stopTimer();
  const pl = players[turn]; if (!net || !pl || !pl.human || pl.resigned) return;
  const secs = pl.missed >= 1 ? 2 : gameRules.timer || 60;
  const my = token, who = turn; let end = Date.now() + secs * 1000, last = Date.now();
  const tick = () => {
    if (my !== token || who !== turn || phase !== 'remote') return stopTimer();
    const now = Date.now(); if (updHold()) end += now - last; last = now;
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    setClock(who, left, left <= 10);
  };
  tick(); timerId = setInterval(tick, 250);
}
/* An online turn never stalls. If the player whose turn it is (or the room creator, who runs
   the bots) has gone, another phone plays a bot move in their name: the creator checks first,
   the other people later, one after another, so two phones rarely do it at once (and the
   second move for the same turn is ignored everywhere). Moves played this way carry auto:1;
   after two of them in a row the player counts as away until they move again or say "here". */
let watchId = 0;
function startWatch() {
  clearInterval(watchId);
  if (!net || !net.gameId || phase === 'end') return;
  const n = applied, who = turn; let t0 = Date.now();
  watchId = setInterval(() => {
    if (!net || applied !== n || turn !== who || phase !== 'remote') return clearInterval(watchId);
    if (updHold()) { t0 += 1000; return; }
    if (queue.some(q => q.n === applied) || Date.now() - t0 < watchDelay(who)) return;
    clearInterval(watchId); autoMoveFor(who);
  }, 1000);
}
function watchDelay(who) {
  const p = players[who];
  const base = !p.human ? 12000 : p.missed >= 1 ? 9000 : ((gameRules.timer || 60) + 12) * 1000;
  const watchers = players.map((x, i) => ({x, i})).filter(o => o.x.owner && o.i !== who && !o.x.resigned)
    .sort((a, b) => (b.x.owner === net.hostId) - (a.x.owner === net.hostId) || a.i - b.i);
  const rank = watchers.findIndex(o => o.x.owner === myId);
  return rank < 0 ? Infinity : base + rank * 20000;
}
function autoMoveFor(who) {
  if (!current) return;
  const m = helperPick(current.type, who); if (!m) return;
  const t = {x: m.x, y: m.y, type: current.type, r: m.r};
  const botOpts = players[who].meeples > 0 ? claimable(t, who).map(g => ({t, g})).filter(o => B.component(tiles, meeples, o.t, o.g).meeples.length === 0) : [];
  const o = botOpts.length && Math.random() < .55 ? botOpts[(Math.random() * botOpts.length) | 0] : null;
  netSend({t: 'move', g: net.gameId, n: applied, p: who, x: m.x, y: m.y, r: m.r, seed: (Math.random() * 1e9) | 0, m: o ? groupsOf(t).findIndex(q => gid(t, q) === gid(t, o.g)) : -1, auto: 1});
}
$('#status').addEventListener('click', e => {
  if (!e.target.closest('#imHere')) return;
  imBack();
});
async function pumpRemote() {
  if (phase !== 'remote' || !gameVisible) return;
  const i = queue.findIndex(q => q.n === applied);
  if (i < 0) return;
  const mv = queue.splice(i, 1)[0], my = token; peekClear();
  if (!current || mv.p !== turn || !fits(current.type, mv.r, mv.x, mv.y)) { toastAny('Партия разошлась между телефонами — чаще всего у игроков разные версии игры. Обновите приложение и начните новую'); return; }
  phase = 'busy'; applied++; // reserve before yielding: a duplicate delivery is already obsolete
  if (mv.old) catchKeep(); else catchEnd();
  if (catchUp) await new Promise(r => setTimeout(r)); // let the screen breathe while a long history goes in
  if (my !== token) return;
  if (mv.auto) { if (++players[mv.p].missed === 1 && !fast()) toast(`${players[mv.p].name} пропустил ход — за него играет бот`); } else players[mv.p].missed = 0;
  if (!fast()) await ensureVisible(mv.x, mv.y);
  if (my !== token) return;
  sel = {x: mv.x, y: mv.y}; setRot(mv.r); placeGhost();
  await wait(350); if (my !== token) return;
  const t = {x: mv.x, y: mv.y, type: current.type, r: mv.r, seed: mv.seed};
  await dropAt(t); if (my !== token) return;
  const mt = (mv.mtx != null && mv.mty != null) ? at(mv.mtx, mv.mty) : t;
  afterPlace(t, mv.p, mv.m >= 0 && mt ? {t: mt, g: groupsOf(mt)[mv.m]} : null);
}
