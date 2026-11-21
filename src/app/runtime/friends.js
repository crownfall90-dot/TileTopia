/* ---------------- friends ----------------
   Everyone has a 6-letter friend code (/fcodes/{code} → uid). A request goes to the other player's
   inbox (/inbox/{uid}/{from}_f); accepting adds each other to /friends/{uid}. Friends are mutual when
   both lists hold each other. A room invite is /inbox/{uid}/{from}_r with the room code.
   Online / offline comes from /presence. Rules: docs/firebase-rules.json. */
const FRIEND_MAX = 50, INVITE_TTL = 15 * 60000;
var inboxEs = null, invited = {code: null, uids: new Set(), joined: new Set(), at: {}}, friendsBack = 'menu'; inbox = inbox || {}; friends = friends || [];
function fbUrl(path) { return FBC.url(path); }
function fbGet(path) { return FBC.get(path); }
function fbPut(path, v) { return FBC.put(path, v); }
function fbDel(path) { return FBC.del(path); }
const myUid = () => fbAuth && fbAuth.uid;
// Each local entry belongs to one Firebase identity. Separate keys also keep concurrent tabs' edits independent.
function blockKey(uid) {
  const me = myUid();
  return me && uid !== me && /^[\w-]{1,128}$/.test(uid || '') ? 'blockedPlayer/' + me + '/' + uid : '';
}
function isPlayerBlocked(uid) {
  const key = blockKey(uid);
  try { return !!key && localStorage.getItem(key) !== null; } catch (_) { return false; }
}
function renderBlockedPlayers() {
  const section = $('#fBlocked'), list = $('#fBlockedList');
  if (!section || !list) return;
  list.replaceChildren();
  const prefix = 'blockedPlayer/' + myUid() + '/';
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const uid = key.slice(prefix.length);
      if (!blockKey(uid)) continue;
      const li = document.createElement('li'); li.className = 'lead frow';
      const label = document.createElement('b'); label.className = 'fwho'; label.textContent = localStorage.getItem(key) || 'Игрок';
      const button = document.createElement('button'); button.className = 'chip'; button.textContent = 'Разблокировать';
      button.onclick = () => setPlayerBlocked(uid, label.textContent, false);
      li.append(label, button); list.append(li);
    }
  } catch (_) {}
  section.hidden = !list.childElementCount;
}
function setPlayerBlocked(uid, name, blocked) {
  const key = blockKey(uid);
  if (!key) return false;
  try {
    if (blocked) localStorage.setItem(key, clean(name) || 'Игрок');
    else localStorage.removeItem(key);
  } catch (_) { toastAny('Не удалось сохранить блокировку на устройстве'); return false; }
  if (blocked) {
    friends = friends.filter(f => f.uid !== uid);
    for (const k of [uid + '_f', uid + '_r']) {
      if (inbox[k]) { delete inbox[k]; fbDel('inbox/' + myUid() + '/' + k).catch(() => {}); }
    }
    invited.uids.delete(uid); invited.joined.delete(uid);
    if (invited.declined) invited.declined.delete(uid);
    document.querySelectorAll('[data-contact-from]').forEach(el => { if (el.dataset.contactFrom === uid) el.remove(); });
  } else if (registered()) loadFriends().then(() => { renderFriends(); renderLobbyFriends(); friendsDot(); }).catch(() => {});
  renderFriends(); friendsDot(); updateNotifBadge();
  if (!$('#scr-inbox').hidden) renderInbox();
  if (!$('#scr-lobby').hidden) renderLobby();
  renderLobbyFriends();
  toastAny(blocked ? 'Игрок заблокирован на этом устройстве' : 'Игрок разблокирован');
  return true;
}
const isOn = p => (typeof PG !== 'undefined' && PG.net && PG.net.presence && PG.net.presence.isOn)
  ? PG.net.presence.isOn(p)
  : (!!p && p.s !== 'off' && Date.now() - (p.t || 0) < 150000);
function agoText(t) {
  return (typeof PG !== 'undefined' && PG.net && PG.net.presence && PG.net.presence.agoText)
    ? PG.net.presence.agoText(t)
    : (() => {
      if (!t) return 'не в сети';
      const m = Math.round((Date.now() - t) / 60000);
      if (m < 1) return 'был(а) в сети только что';
      return 'был(а) в сети ' + (m < 60 ? m + ' мин назад' : m < 1440 ? Math.round(m / 60) + ' ч назад' : Math.round(m / 1440) + ' дн назад');
    })();
}
// Friends are only for finished profiles: a nickname and an e-mail account (or another sign-in
// later). The database rules check the same: an account with an e-mail and a saved /profiles entry.
function registered() { return !!(fbAuth && fbAuth.email && wallet.name); }
// After signing in to another account: drop the old friends and listen to the new inbox.
function socialReset() {
  friends = []; inbox = {}; fcodeErr = '';
  inboxShown.clear();
  invited = {code: null, uids: new Set(), joined: new Set(), at: {}};
  document.querySelectorAll('[data-contact-from], #plBox').forEach(el => el.remove());
  if (inboxEs) { inboxEs.close(); inboxEs = null; }
  if (registered()) { inboxListen(); inboxPoll(); loadFriends().then(friendsDot).catch(() => {}); }
  friendsDot(); if (!$('#scr-friends').hidden) openFriends();
  // An invite opened before the profile was saved is shown now.
  if (registered() && wallet.pendingFriend) { const c = wallet.pendingFriend; delete wallet.pendingFriend; saveWallet(); setTimeout(() => friendInvite(c), 700); }
}
// An invite link ?friend=CODE: a card "X invites you to be friends" with an Accept button.
async function friendInvite(code) {
  if (!FB) return;
  if (!registered()) {
    wallet.pendingFriend = code; saveWallet(); friendsBack = 'menu'; show('friends');
    return toastAny('Сохраните профиль — и сможете принять приглашение в друзья');
  }
  let uid = null, name = '';
  try {
    uid = await fbGet('fcodes/' + code);
    if (isPlayerBlocked(uid)) return toastAny('Игрок заблокирован');
    if (uid) { const p = await fbGet('presence/' + uid).catch(() => null); name = clean(p && p.n); }
    await loadFriends().catch(() => {});
  } catch (e) { return toastAny(e.message === 'rules' ? 'Друзья пока недоступны: сервер ещё не обновлён' : 'Нет связи — откройте ссылку ещё раз'); }
  if (!uid) return toastAny('Приглашение не найдено — попросите друга прислать ссылку заново');
  if (isPlayerBlocked(uid)) return toastAny('Игрок заблокирован');
  if (uid === myUid()) return toastAny('Это ваша ссылка — отправьте её другу');
  if (friends.some(f => f.uid === uid && f.mutual)) { friendsBack = 'menu'; show('friends'); return toastAny(`${name || 'Игрок'} уже у вас в друзьях`); }
  document.querySelectorAll('.over.finv').forEach(x => x.remove());
  const box = document.createElement('div'); box.className = 'over finv'; box.style.position = 'fixed';
  box.dataset.contactFrom = uid;
  box.innerHTML = (typeof PG !== 'undefined' && PG.net && PG.net.friends && PG.net.friends.renderFriendInviteDialogHtml)
    ? PG.net.friends.renderFriendInviteDialogHtml(name)
    : `<div class="ocard"><div style="font-size:44px">🤝</div><h3>${name || 'Игрок'} приглашает вас в друзья</h3><p>Вы увидите, когда друг в сети, и сможете звать друг друга в комнату одной кнопкой</p><button class="cta wide" data-a="ok">Принять</button><button class="ghostbtn" data-a="no">Не сейчас</button></div>`;
  document.body.append(box);
  box.onclick = async e => {
    const b = e.target.closest('[data-a]'); if (!b) return; box.remove();
    if (b.dataset.a !== 'ok') return;
    friendsBack = 'menu'; show('friends');
    await addFriend(uid, name, code);
  };
}
// My friend code, made once per account.
// fcodeErr: 'rules' — the database rules for friends are not published yet; 'net' — no connection.
let fcodeErr = '';
// The code is permanent: /fcodeOf/{uid} remembers it on the server, so a phone that lost its save
// (or never finished saving) gets the same code back instead of a second one.
async function friendCode() {
  fcodeErr = '';
  try {
    await fbToken();
    const keep = c => { wallet.fcode = c; wallet.fcodeUid = myUid(); saveWallet(); return c; };
    const remember = c => fbPut('fcodeOf/' + myUid(), c).then(() => { wallet.fcodeKept = myUid(); saveWallet(); }).catch(() => {});
    if (wallet.fcode && wallet.fcodeUid === myUid()) {
      if (wallet.fcodeKept !== myUid()) remember(wallet.fcode); // codes made before /fcodeOf existed
      return wallet.fcode;
    }
    const mine = await fbGet('fcodeOf/' + myUid()).catch(e => { if (e.message === 'rules') return null; throw e; });
    if (mine) { wallet.fcodeKept = myUid(); return keep(mine); }
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 4; i++) {
      const c = Array.from({length: 6}, () => A[(Math.random() * A.length) | 0]).join('');
      if (await fbGet('fcodes/' + c)) continue; // taken by someone else
      await fbPut('fcodes/' + c, myUid()); keep(c); await remember(c); return c;
    }
  } catch (e) { fcodeErr = e.message === 'rules' ? 'rules' : 'net'; }
  if (!fcodeErr) fcodeErr = 'net';
}
async function loadFriends() {
  const me = myUid(); if (!me) return;
  const list = (await fbGet('friends/' + me)) || {};
  const loaded = await Promise.all(Object.entries(list).filter(([uid]) => !isPlayerBlocked(uid)).slice(0, FRIEND_MAX).map(async ([uid, v]) => {
    const [back, p] = await Promise.all([fbGet(`friends/${uid}/${me}`).catch(() => null), fbGet('presence/' + uid).catch(() => null)]);
    let lastT = (p && p.t) || 0;
    if (!lastT) {
      const l = await fbGet('leaders/' + uid).catch(() => null);
      if (l && l.t) lastT = l.t;
      else if (v && v.t) lastT = v.t;
    }
    const pres = p ? {...p, t: p.t || lastT} : (lastT ? {t: lastT, s: 'off'} : null);
    return {uid, n: clean(p && p.n) || clean(v.n) || 'Игрок', st: PG.state.status.shownStatus(p && p.st), c: validCol(p && p.c) ? p.c : undefined, mutual: !!back, p: pres, on: !!back && isOn(p)};
  }));
  if (myUid() !== me) return;
  friends = loaded.filter(f => !isPlayerBlocked(f.uid));
  friends.sort((a, b) => b.on - a.on || b.mutual - a.mutual || ((b.p && b.p.t) || 0) - ((a.p && a.p.t) || 0));
}
const isFriend = uid => friends.some(f => f.uid === uid);
async function addFriend(uid, name, via) {
  const me = myUid();
  if (!uid || uid === me) return toastAny('Это ваш код');
  if (isPlayerBlocked(uid)) return toastAny('Игрок заблокирован');
  if (friends.length >= FRIEND_MAX) return toastAny('Друзей уже ' + FRIEND_MAX);
  if (!registered()) return show('friends');
  try {
    const p = await fbGet('presence/' + uid).catch(() => null), n = clean(name) || clean(p && p.n) || 'Игрок';
    if (myUid() !== me || isPlayerBlocked(uid)) return;
    await fbPut(`friends/${me}/${uid}`, {n, t: {'.sv': 'timestamp'}});
    if (myUid() !== me || isPlayerBlocked(uid)) return;
    // "v" is the invite code from a link: the inviter's game accepts such a request by itself.
    await fbPut(`inbox/${uid}/${me}_f`, {k: 'f', n: profileName(), t: {'.sv': 'timestamp'}, ...(via ? {v: via} : {})});
    toastAny(via ? `Приглашение принято: ${n}` : `Заявка отправлена: ${n}`); beep('tap'); track(via ? 'friend_invite_accept' : 'friend_request');
    await loadFriends(); renderFriends();
  } catch (e) {
    fbDel(`friends/${me}/${uid}`);
    toastAny(/401/.test(e.message) ? 'Этот игрок ещё не сохранил профиль — дружить можно только с сохранёнными' : 'Не получилось — проверьте интернет');
  }
}
async function addByCode(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length === 5) return toastAny('Это код комнаты — введите его в «С друзьями»');
  if (code.length !== 6) return toastAny('Код друга — 6 символов');
  try { const uid = await fbGet('fcodes/' + code); if (!uid) return toastAny('Нет игрока с таким кодом'); await addFriend(uid); }
  catch (e) { toastAny(e.message === 'rules' ? 'Друзья пока недоступны: сервер ещё не обновлён' : 'Не получилось — проверьте интернет'); }
}
async function acceptFriend(from) {
  const me = myUid(), x = inbox[from + '_f']; if (!x || isPlayerBlocked(from)) return;
  try {
    await fbPut(`friends/${me}/${from}`, {n: clean(x.n) || 'Игрок', t: {'.sv': 'timestamp'}});
    if (myUid() !== me || isPlayerBlocked(from)) return;
    await fbPut(`inbox/${from}/${me}_f`, {k: 'ok', n: profileName(), t: {'.sv': 'timestamp'}});
  } catch (_) { return toastAny('Не получилось — проверьте интернет'); }
  delete inbox[from + '_f']; fbDel(`inbox/${me}/${from}_f`);
  toastAny(`${clean(x.n)} теперь ваш друг`); await loadFriends(); renderFriends(); friendsDot(); updateNotifBadge(); if (!$('#scr-inbox').hidden) renderInbox();
}
// "Not now" / dismissing a room invitation tells the inviter (a note in their inbox under my key: no new rules needed).
function declineInvite(key) {
  if (!key || !key.endsWith('_r') || !FB || !registered()) return;
  const x = inbox[key], from = key.slice(0, -2); if (!x || x.k !== 'r') return;
  fbPut(`inbox/${from}/${myUid()}_r`, {k: 'no', code: String(x.code || ''), n: profileName(), t: {'.sv': 'timestamp'}}).catch(() => {});
}
function dropInbox(key) { delete inbox[key]; fbDel(`inbox/${myUid()}/${key}`); renderFriends(); friendsDot(); updateNotifBadge(); if (!$('#scr-inbox').hidden) renderInbox(); }
async function removeFriend(uid) { await fbDel(`friends/${myUid()}/${uid}`); friends = friends.filter(f => f.uid !== uid); renderFriends(); }
// A room to invite into: the current one, or a new private room (a search for opponents is dropped).
function ensureRoom() {
  if (mm) stopMatch(false);
  if (!net || net.quick || (net.gameId && phase !== 'end')) { connect(newCode(), true); net.max = Math.max(2, setup.onN || 2); friendsBack = 'lobby'; }
  return net.code;
}
// Invite a friend to my room; without a room, open one first.
const INVITE_GAP = 5000, inviteAt = {};
async function inviteFriend(uid, targetName) {
  if (isPlayerBlocked(uid)) return toastAny('Игрок заблокирован');
  const f = friends.find(x => x.uid === uid), name = f ? f.n : clean(targetName);
  if (!uid || !name) return;
  const wait = INVITE_GAP - (Date.now() - (inviteAt[uid] || 0));
  if (wait > 0) return toastAny(`Приглашать можно раз в 5 секунд — подождите ${Math.ceil(wait / 1000)} с`);
  inviteAt[uid] = Date.now();
  if (mm) { if (!net) return toastAny('Секунду — комната создаётся'); } else ensureRoom();
  track('friend_invite');
  const room = net, me = myUid();
  try { await fbPut(`inbox/${uid}/${me}_r`, {k: 'r', code: room.code, n: profileName(), t: {'.sv': 'timestamp'}}); }
  catch (_) { return toastAny('Не получилось — проверьте интернет'); }
  if (net !== room || myUid() !== me || isPlayerBlocked(uid)) return;
  toastAny(`Приглашение отправлено: ${name}`);
  if (invited.code !== net.code) invited = {code: net.code, uids: new Set(), joined: new Set(), at: {}};
  invited.uids.add(uid); (invited.at = invited.at || {})[uid] = Date.now(); if (invited.declined) invited.declined.delete(uid); renderFriends();
  if (!$('#scr-lobby').hidden) renderLobby();
}
function joinInvite(key) {
  const x = inbox[key]; if (!x || isPlayerBlocked(key.slice(0, -2))) return;
  dropInbox(key);
  if (net && net.gameId && phase !== 'end') leaveRoom();
  connect(x.code, false); show('lobby');
}
// Incoming: friend requests, "accepted" notes and room invites.
let inboxShown = new Set();
function onInbox(all) {
  const me = myUid(); inbox = {};
  for (const [k, v] of Object.entries(all || {})) {
    if (!v || typeof v !== 'object') continue;
    const from = k.slice(0, -2);
    if (isPlayerBlocked(from)) { fbDel(`inbox/${me}/${k}`).catch(() => {}); continue; }
    if (v.k === 'no') { // the friend declined my room invitation
      const uid = k.slice(0, -2);
      if (invited.code && String(v.code || '') === invited.code && invited.uids.has(uid) && !inboxShown.has(k + v.t)) { inboxShown.add(k + v.t); (invited.declined = invited.declined || new Set()).add(uid); const f = friends.find(q => q.uid === uid); toastAny(`${f ? f.n : clean(v.n)} отказался(ась) от приглашения`); if (!$('#scr-lobby').hidden) renderLobby(); }
      fbDel(`inbox/${me}/${k}`); continue;
    }
    if (v.k === 'ok') { if (!inboxShown.has(k + v.t)) { inboxShown.add(k + v.t); toastAny(`${clean(v.n)} принял(а) заявку в друзья`); loadFriends().then(renderFriends); } fbDel(`inbox/${me}/${k}`); continue; }
    if (v.k === 'r' && Date.now() - (v.t || 0) > INVITE_TTL) { fbDel(`inbox/${me}/${k}`); continue; }
    // A request from someone I already asked: we are friends now.
    if (v.k === 'f' && (isFriend(from) || (v.v && wallet.fcode && v.v === wallet.fcode))) { inbox[k] = v; acceptFriend(from); continue; }
    inbox[k] = v;
    if (!inboxShown.has(k + v.t)) { inboxShown.add(k + v.t); popInbox(k, v); }
  }
  friendsDot(); renderFriends(); updateNotifBadge(); if (!$('#scr-inbox').hidden) renderInbox();
}
function popInbox(k, v) {
  if (v.k === 'f') {
    const fromUid = k.slice(0, -2);
    const safeName = clean(v.n) || 'Игрок';
    document.querySelectorAll('.over.friend-req-pop').forEach(x => x.remove());
    const box = document.createElement('div');
    box.className = 'over friend-req-pop';
    box.dataset.contactFrom = fromUid;
    box.style.position = 'fixed';
    box.innerHTML = `
      <div class="ocard" style="max-width:340px;text-align:center;padding:24px 20px">
        <div style="margin:0 auto 12px;width:56px;height:56px;border-radius:50%;background:rgba(96,165,250,0.15);border:1.5px solid rgba(96,165,250,0.4);display:flex;align-items:center;justify-content:center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
        </div>
        <h3 style="margin:0 0 6px;font-size:18px">${safeName} хочет дружить</h3>
        <p style="font-size:13px;color:var(--muted);margin:0 0 18px;line-height:1.4">Игрок отправил вам заявку в друзья. Примите, чтобы видеть статус в сети и играть вместе.</p>
        <button class="cta wide" data-fpop="acc" style="margin-bottom:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="vertical-align:-2px;margin-right:4px"><path d="M20 6L9 17l-5-5"/></svg>
          Принять дружбу
        </button>
        <button class="ghostbtn wide" data-fpop="later">Позже</button>
        <button class="chip" data-fpop="profile">Профиль игрока</button>
      </div>
    `;
    box.onclick = e => {
      const b = e.target.closest('[data-fpop]');
      if (!b) {
        if (e.target === box) box.remove();
        return;
      }
      box.remove();
      if (b.dataset.fpop === 'profile') return openPlayer(fromUid, safeName);
      if (b.dataset.fpop === 'acc') {
        acceptFriend(fromUid).then(() => {
          updateNotifBadge();
          if (!$('#scr-inbox').hidden) renderInbox();
        });
      }
    };
    document.body.append(box);
    beep('turn');
    updateNotifBadge();
    return;
  }
  if (v.k !== 'r') return;
  const busy = (gameVisible && phase !== 'end' && players.length) || tut;
  if (busy) return toastAny(`${clean(v.n)} зовёт в комнату — загляните в «Друзья»`);
  document.querySelectorAll('.over.invite').forEach(x => x.remove());
  const box = document.createElement('div'); box.className = 'over invite'; box.style.position = 'fixed';
  box.dataset.contactFrom = k.slice(0, -2);
  box.innerHTML = `<div class="ocard"><div style="font-size:42px">🎲</div><h3>${clean(v.n)} зовёт играть</h3><p>Комната ${clean(v.code)}</p><button class="cta wide" data-a="go">Войти в комнату</button><button class="ghostbtn" data-a="no">Не сейчас</button><button class="chip" data-a="profile">Профиль игрока</button></div>`;
  box.onclick = e => {
    const b = e.target.closest('[data-a]'); if (!b) return; box.remove();
    if (b.dataset.a === 'profile') openPlayer(k.slice(0, -2), v.n);
    else if (b.dataset.a === 'go') joinInvite(k);
    else { declineInvite(k); dropInbox(k); }
  };
  document.body.append(box); beep('turn');
}
async function inboxPoll() {
  if (!FB || !registered()) return;
  const me = myUid();
  try { await fbToken(); const all = await fbGet('inbox/' + me); if (myUid() === me) onInbox(all); } catch (_) {}
}
async function inboxListen() {
  if (!FB || inboxEs || !registered()) return;
  const me = myUid();
  try {
    await fbToken(); const url = await fbUrl('inbox/' + me);
    if (myUid() !== me || inboxEs) return;
    const es = inboxEs = new EventSource(url);
    const again = () => { es.close(); if (inboxEs === es) inboxEs = null; setTimeout(inboxListen, 15000); };
    es.addEventListener('put', inboxPoll); es.addEventListener('patch', inboxPoll);
    es.addEventListener('auth_revoked', () => { fbAuth.exp = 0; again(); }); es.onerror = again;
  } catch (_) { setTimeout(inboxListen, 30000); }
}
const friendsOnline = () => friends.filter(f => f.on).length;
/* Quick invite: a sheet with the friends who are online and a "call" button for each, from the search for
   opponents, the game setup and the room. The first invite opens a private room
   (same number of players) and takes the host there; friends get a card to join with one tap. */
const onLobbyScreen = () => !$('#scr-lobby').hidden;
function friendsDot() {
  const b = $('#friendsBtn'); if (!b) return;
  b.classList.toggle('hasdot', Object.values(inbox).some(v => v.k === 'f' || v.k === 'r'));
  const hasOnline = friendsOnline() > 0;
  const d = $('#fNavDot'); if (d) d.hidden = !hasOnline;
  const sd = $('#fScreenOnlineDot'); if (sd) sd.hidden = !hasOnline;
  const legacy = b.querySelector('.fnum'); if (legacy) { legacy.hidden = !hasOnline; legacy.textContent = ''; }
  b.title = hasOnline ? 'Друзья в сети' : '';
}
