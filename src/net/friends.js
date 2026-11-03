// Friends and invitations helpers (E-1.5)

export const INVITE_TTL = 120000; // 2 minutes

/** Validates and formats 6-character friend code. */
export function cleanFriendCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

/** Formats room invite payload sent to friend's inbox. */
export function formatInvitePayload(myUid, myName, roomCode, timestamp = Date.now()) {
  return {
    k: 'r',
    u: myUid,
    n: String(myName || 'Игрок').slice(0, 12),
    code: String(roomCode || '').slice(0, 8),
    t: timestamp,
  };
}

/** Formats friend request payload. */
export function formatFriendRequestPayload(myUid, myName, friendCode = null, timestamp = Date.now()) {
  const req = {
    k: 'f',
    u: myUid,
    n: String(myName || 'Игрок').slice(0, 12),
    t: timestamp,
  };
  if (friendCode) req.v = cleanFriendCode(friendCode);
  return req;
}

/** Generates HTML markup for a single friend row in friends list. */
export function renderFriendRow(f, actionBtn = '', subText = '') {
  const st = f.st ? `<em class="fst">${f.st}</em>` : '';
  const col = f.c || (f.on ? '#3fc27a' : '#5b6684');
  const initial = (f.n || '?')[0].toUpperCase();
  const plAttrs = f.uid ? ` data-pl="${String(f.uid).replace(/[^\w-]/g, '').slice(0, 64)}" data-n="${String(f.n || '').replace(/[<>&"']/g, '')}" data-c="${col}"` : '';
  return `<li class="lead frow${f.on ? ' on' : ''}"${plAttrs} style="cursor:pointer">` +
    `<span class="av" style="--c:${col}">${initial}</span>` +
    `<span class="fwho"><b>${f.n}</b>${st}<small>${subText}</small></span>` +
    `${actionBtn}</li>`;
}

/** Generates HTML markup for friends list sections (invites, requests, online, offline, waiting). */
export function renderFriendsListHtml({
  invs = [],
  reqs = [],
  on = [],
  off = [],
  wait = [],
  room = null,
  invited = {},
  stateTextMap = {},
  agoTextFn = () => 'не в сети',
  cleanFn = (t => t || 'Игрок')
}) {
  const fRow = (f, btn, sub) => renderFriendRow(f, btn, sub);
  let h = '';
  if (invs.length) {
    h += `<div class="h3 fsec-hdr"><span>🎮</span><b>Зовут играть</b><em>${invs.length}</em></div><ul class="flist">${invs.map(([k, v]) => fRow({n: cleanFn(v.n), c: '#f2b84b', uid: v.u}, `<button class="chip go" data-fjoin="${k}">Войти</button><button class="chip x" data-fdrop="${k}" aria-label="Отклонить">✕</button>`, 'комната ' + cleanFn(v.code))).join('')}</ul>`;
  }
  if (reqs.length) {
    h += `<div class="h3 fsec-hdr"><span>📩</span><b>Заявки в друзья</b><em>${reqs.length}</em></div><ul class="flist">${reqs.map(([k, v]) => fRow({n: cleanFn(v.n), c: '#f2b84b', uid: v.u}, `<button class="chip go" data-facc="${k.slice(0, -2)}">Принять</button><button class="chip x" data-fdrop="${k}" aria-label="Отклонить">✕</button>`, 'хочет дружить')).join('')}</ul>`;
  }
  h += `<div class="h3 fsec-hdr"><span class="fdot on"></span><b>В сети</b></div><ul class="flist">${on.map(f => fRow(f, `<button class="chip go" data-finv="${f.uid}">${room && invited.code === room && invited.joined && invited.joined.has(f.uid) ? '✓ Принял' : room && invited.code === room && invited.uids && invited.uids.has(f.uid) ? 'Ещё раз' : 'Позвать'}</button>`, (f.p && stateTextMap[f.p.s]) || 'в игре')).join('') || '<li class="qnote fempty-note">Никого из друзей нет в сети</li>'}</ul>`;
  if (off.length) {
    h += `<div class="h3 fsec-hdr"><span class="fdot off"></span><b>Не в сети</b></div><ul class="flist">${off.map(f => fRow(f, `<button class="chip x" data-fdel="${f.uid}" aria-label="Удалить из друзей">✕</button>`, agoTextFn(f.p && f.p.t))).join('')}</ul>`;
  }
  if (wait.length) {
    h += `<div class="h3 fsec-hdr"><span>⏳</span><b>Ждут ответа</b><em>${wait.length}</em></div><ul class="flist">${wait.map(f => fRow(f, `<button class="chip x" data-fdel="${f.uid}" aria-label="Отменить заявку">✕</button>`, 'заявка отправлена')).join('')}</ul>`;
  }
  if (!on.length && !off.length && !wait.length && !reqs.length) {
    h += '<p class="shint">Добавьте друга по коду выше</p>';
  }
  return h;
}

/** Formats friend invitation dialog modal markup. */
export function renderFriendInviteDialogHtml(name) {
  const safeName = String(name || 'Игрок').replace(/[<>&"']/g, '');
  return `<div class="ocard"><div style="font-size:44px">🤝</div><h3>${safeName} приглашает вас в друзья</h3><p>Вы увидите, когда друг в сети, и сможете звать друг друга в комнату одной кнопкой</p><button class="cta wide" data-a="ok">Принять</button><button class="ghostbtn" data-a="no">Не сейчас</button></div>`;
}

/** Generates random 6-character friend code. */
export function generateRandomFriendCode(alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', length = 6, randomFn = Math.random) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[(randomFn() * alphabet.length) | 0];
  }
  return out;
}
