// src/net/rooms.js
// Online room code generation, color allocation, security authorization (S-2), and rules resolution.

export const BOT_NAMES = ['Бот Ёж', 'Бот Сова', 'Бот Лис', 'Бот Барсук'];

export function newCode(length = 5) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += A[(Math.random() * A.length) | 0];
  }
  return out;
}

export function assignColors(seats, palette = [], randomFn = Math.random) {
  const out = seats.map(x => ({...x, col: null}));
  const order = seats.map((x, i) => i).sort(() => randomFn() - 0.5);
  for (const i of order) {
    if (seats[i].col && !out.some(x => x.col === seats[i].col)) {
      out[i].col = seats[i].col;
    }
  }
  const free = palette.map(c => c.col || c).filter(c => !out.some(x => x.col === c)).sort(() => randomFn() - 0.5);
  out.forEach(x => {
    if (!x.col) x.col = free.pop();
  });
  return out;
}

export function roomMax(net, defaultMax = 5) {
  return Math.min(5, Math.max(2, (net && (net.max || (net.lobby && net.lobby.max))) || defaultMax));
}

export function ratedRules(mode, modesDict = {}) {
  const modeConfig = modesDict[mode] ? modesDict[mode].set : {};
  return {
    mode,
    ...modeConfig,
    rivers: true,
    timer: 60,
    hints: true,
    tie: 'all'
  };
}

export function netAuth(d, m, net, players = []) {
  if (!net) return true;
  const u = typeof d.u === 'string' ? d.u : '';
  const ids = net.uidOf;
  if (!u) return !net.secure;

  const bind = id => {
    if (typeof id !== 'string') return false;
    const b = ids.get(id);
    if (!b || !net.gameId) {
      ids.set(id, u);
      return true;
    }
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
  if (m.g !== net.gameId || (typeof m.p !== 'number' && m.t !== 'ver' && m.t !== 'upd' && m.t !== 'upresume')) {
    return true;
  }
  const seat = typeof m.p === 'number' ? players[m.p] : null;
  const room = new Set(players.filter(x => x.owner).map(x => ids.get(x.owner)).filter(Boolean));
  if (hostUid) room.add(hostUid);
  if (!seat) return room.has(u) || !net.secure;
  if (!seat.owner || (m.t === 'move' && m.auto)) return room.has(u) || !net.secure;
  const owner = ids.get(seat.owner);
  return owner ? owner === u : !net.secure;
}

export function isLobbyAllReady(seats, hostId) {
  const others = (seats || []).filter(x => x.owner && x.owner !== hostId);
  return others.length === 0 || others.every(x => x.ready);
}

export function computePendingInvites(invited, seats = [], friends = [], net = null, inviteLateMs = 30000, now = Date.now()) {
  if (!net || !invited || invited.code !== net.code || !invited.uids) return [];
  return [...invited.uids].filter(uid => !seats.some(x => x.uid === uid)).map(uid => {
    const f = (friends || []).find(q => q.uid === uid);
    const at = (invited.at || {})[uid] || 0;
    return {
      uid,
      n: f ? f.n : 'Друг',
      st: f ? f.st : '',
      c: f && f.c,
      late: !!at && now - at > inviteLateMs,
      declined: !!(invited.declined && invited.declined.has(uid))
    };
  });
}

export function formatCupsBadge(cups, isHost) {
  const className = 'cupsbadge' + (cups ? ' on' : '') + (isHost ? ' host' : '');
  const title = cups ? '🏆 Игра на кубки' : '🤝 Без кубков';
  const subtitle = isHost
    ? (cups ? 'Кубки начисляются · нажмите для смены' : 'Кубки не меняются · нажмите для смены')
    : (cups ? 'Рейтинговая игра' : 'Без рейтинга');
  const innerHtml = `<div class="cupsbadge-main"><b>${title}</b><small>${subtitle}</small></div><div class="cups-switch" aria-hidden="true"><span class="cups-switch-track"><span class="cups-switch-knob">${cups ? '🏆' : '🤝'}</span></span></div>`;
  return {className, innerHtml};
}

export const BOT_LVL_LABELS = {
  easy: 'Лёгкий',
  normal: 'Обычный',
  hard: 'Сложный'
};

export function renderRoomSeatsHtml({
  seats = [],
  pend = [],
  myId = '',
  myUid = '',
  hostId = '',
  isHost = false,
  registered = false,
  isFriendFn = () => false,
  validColFn = () => false,
  cleanFn = s => s,
  stTagFn = () => '',
  palette = []
} = {}) {
  const seatsHtml = seats.length ? seats.map((x, i) => {
    const isMe = x.owner === myId;
    const isBot = !x.owner;
    const isRoomHost = x.owner === hostId;
    const safeUid = String(x.uid || '').replace(/[^\w-]/g, '').slice(0, 64);
    const safeName = cleanFn(x.name);
    const initial = (safeName || '?')[0];
    const colVal = validColFn(x.col) ? x.col : (palette[i % palette.length] ? (palette[i % palette.length].col || palette[i % palette.length]) : '#3fc27a');
    const dataAttrs = (x.uid && !isMe) ? ` data-pl="${safeUid}" data-n="${safeName}" data-c="${validColFn(x.col) ? x.col : ''}"` : '';

    const botLvl = x.botlvl || 'normal';
    const botLvlName = BOT_LVL_LABELS[botLvl] || 'Обычный';
    const whoHtml = `<b>${safeName}${isMe ? ' (вы)' : ''}</b>${stTagFn(x.st)}<small>${isBot ? `Бот · ${botLvlName.toLowerCase()}` : isRoomHost ? 'Создатель комнаты' : (x.ready ? '✓ Готов к игре' : 'Ждём готовности')}</small>`;
    
    const canAddFriend = (!isMe && !isBot && x.uid && x.uid !== myUid && !isFriendFn(x.uid) && registered);
    const addFriendBtn = canAddFriend ? `<button class="chip addf" data-addf="${safeUid}" data-n="${safeName}" aria-label="В друзья">＋</button>` : '';

    let actionOrPill;
    if (isHost && !isMe) {
      if (isBot) {
        actionOrPill = `<button class="chip botlvl-chip" data-botlvl="${i}" title="Нажмите, чтобы сменить сложность">🤖 ${botLvlName}</button><button class="chip" data-kick="${i}">Убрать</button>`;
      } else {
        actionOrPill = `<button class="chip" data-kick="${i}">Убрать</button>`;
      }
    } else if (isBot) {
      actionOrPill = `<span class="pill botpill">🤖 ${botLvlName}</span>`;
    } else if (isRoomHost) {
      actionOrPill = '<span class="pill host">Создатель</span>';
    } else if (x.ready) {
      actionOrPill = '<span class="pill ok">✓ Готов</span>';
    } else {
      actionOrPill = '<span class="pill wait">Не готов</span>';
    }

    return `<li${dataAttrs}><span class="av" style="--c:${colVal}">${initial}</span><span class="who">${whoHtml}</span>${addFriendBtn}${actionOrPill}</li>`;
  }).join('') : '<li class="empty"><span class="who"><b>Подключаемся…</b></span></li>';

  const pendHtml = pend.map(p => {
    const safeName = cleanFn(p.n);
    const initial = (safeName || '?')[0];
    const colVal = validColFn(p.c) ? p.c : '#5b6684';
    const statusText = p.declined ? 'Отказался' : p.late ? 'Не отвечает' : 'Приглашён · ждём ответа';
    return `<li class="inv${p.late || p.declined ? ' late' : ''}${p.declined ? ' no' : ''}"><span class="av" style="--c:${colVal}">${initial}</span><span class="who"><b>${safeName}</b>${stTagFn(p.st)}<small>${statusText}</small></span><button class="chip go" data-linv="${p.uid}">Ещё раз</button><button class="chip x" data-idrop="${p.uid}" aria-label="Убрать из приглашённых">✕</button></li>`;
  }).join('');

  return {seatsHtml, pendHtml};
}

export function formatLobbyButtons({
  isHost,
  seatsCount,
  others = [],
  allReady,
  isReady,
  inLobby,
  isQuick
}) {
  if (isHost) {
    if (seatsCount < 2) {
      return {
        hostBtn: {hidden: !inLobby, disabled: true, text: 'Нужно хотя бы 2 игрока'},
        readyBtn: {hidden: true}
      };
    }
    if (!allReady && !isQuick) {
      const readyCount = others.filter(x => x.ready).length;
      const text = others.length > 1 ? `Прожмите готовность (${readyCount}/${others.length})` : 'Прожмите готовность';
      return {
        hostBtn: {hidden: !inLobby, disabled: true, text},
        readyBtn: {hidden: true}
      };
    }
    return {
      hostBtn: {hidden: !inLobby, disabled: false, text: 'Начать игру'},
      readyBtn: {hidden: true}
    };
  } else {
    if (!inLobby || isQuick) {
      return {
        hostBtn: {hidden: true},
        readyBtn: {hidden: true}
      };
    }
    return {
      hostBtn: {hidden: true},
      readyBtn: {
        hidden: false,
        text: isReady ? '✓ Готов (отменить)' : 'Готов',
        className: isReady ? 'cta wide alt' : 'cta wide',
        hintText: isReady ? 'Вы готовы · ожидание старта…' : 'Нажмите «Готов» для подтверждения'
      }
    };
  }
}
