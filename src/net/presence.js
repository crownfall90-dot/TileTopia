// Presence and online status helpers (E-1.5)

export const STATE_TEXT = {
  search: 'ищет соперников',
  online: 'играет онлайн',
  bots: 'играет с ботами',
  menu: 'в меню',
  off: 'не в сети',
};

/** Formats user presence payload to save in /presence/{uid}. */
export function formatPresenceRecord({
  name,
  state = 'menu',
  registered = false,
  dev = {},
  retention = {},
}) {
  return {
    t: {'.sv': 'timestamp'},
    n: String(name || 'Игрок').slice(0, 12),
    s: state,
    r: registered ? 1 : 0,
    ...dev,
    ...retention,
  };
}

/** Filters and sorts raw /presence node into an active online players list. */
export function filterActivePresence(raw = {}, myUid = null) {
  return Object.entries(raw)
    .map(([uid, v]) => ({uid, ...(v || {})}))
    .filter(x => x.s && x.n && x.s !== 'off')
    .sort((a, b) => (b.uid === myUid) - (a.uid === myUid) || (b.t || 0) - (a.t || 0));
}

/** Returns localized string for presence activity state. */
export function getPresenceStatus(state) {
  return STATE_TEXT[state] || 'не в сети';
}

/** Checks whether presence timestamp and state indicate an active online user. */
export function isOn(presence, maxAgeMs = 150000, now = Date.now()) {
  return !!presence && presence.s !== 'off' && now - (presence.t || 0) < maxAgeMs;
}

/** Human-friendly relative time text ("был(а) в сети 5 мин назад"). */
export function agoText(t, now = Date.now()) {
  if (!t) return 'не в сети';
  const m = Math.round((now - t) / 60000);
  if (m < 1) return 'был(а) в сети только что';
  if (m < 60) return 'был(а) в сети ' + m + ' мин назад';
  const h = Math.round(m / 60);
  if (h < 24) return 'был(а) в сети ' + h + ' ч назад';
  const d = Math.round(m / 1440);
  if (d === 1) return 'был(а) в сети вчера';
  if (d < 30) return 'был(а) в сети ' + d + ' дн назад';
  return 'был(а) в сети давно';
}

/** Renders online players popup list markup. */
export function renderOnlinePlayersDialogHtml({
  presenceList = [],
  myUid = '',
  registered = false,
  isFriendFn = () => false,
  cleanFn = s => s,
  stateTextMap = STATE_TEXT
} = {}) {
  const rows = presenceList.map(x => {
    const isMe = x.uid === myUid;
    const name = cleanFn(x.n) || 'Игрок';
    const status = stateTextMap[x.s] || 'в игре';
    const canAddFriend = (x.uid !== myUid && x.r && registered && !isFriendFn(x.uid));
    const addFriendBtn = canAddFriend ? `<button class="chip addf" data-addf="${x.uid}" aria-label="В друзья">＋</button>` : '';
    return `<li class="lead${isMe ? ' me' : ''}"><i>●</i><span>${name}${isMe ? ' (вы)' : ''}</span><small>${status}</small>${addFriendBtn}</li>`;
  }).join('');

  return `<div class="ocard olist"><h3>Сейчас в игре: ${presenceList.length}</h3><ul>${rows || '<li class="qnote">Никого</li>'}</ul><p class="shint">Список обновляется раз в минуту. Считаются все, у кого открыта игра, включая вас</p><button class="cta wide">Закрыть</button></div>`;
}
