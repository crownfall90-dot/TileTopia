// src/net/matchmaking.js
// Quick matchmaking state, open room discovery, wait timers, and H-5 bot fallback.

export const MATCH_ROOM = 'QMATCH';
export const SEEK_MS = 10000;
export const SEEK_FRESH = 25000;
export const START_IN = 3;

export function createMatchState({want = 2, mode = 'classic', create = false, now = Date.now()} = {}) {
  return {
    t0: now,
    want: Math.min(5, Math.max(2, want)),
    mode,
    other: new Map(),
    seeks: new Map(),
    closed: new Set(),
    skip: new Set(),
    ready: false,
    es: null,
    timers: [],
    startAt: 0,
    lastSeek: 0,
    create: create === true
  };
}

export function filterOpenRooms(seeks, closed, skip, now = Date.now(), freshMs = SEEK_FRESH, currentCode = null) {
  return [...seeks]
    .filter(([c, o]) => !closed.has(c) && !skip.has(c) && (now - o.ts < freshMs) && o.n < o.want && (!currentCode || c !== currentCode))
    .sort((a, b) => (a[1].want - a[1].n) - (b[1].want - b[1].n) || (a[1].firstTs ?? a[1].ts) - (b[1].firstTs ?? b[1].ts) || a[0].localeCompare(b[0]))
    .map(([code, o]) => ({code, n: o.n}));
}

export function shouldAutoFillBots({isHost, startAt, elapsedSec, seatsCount, wantCount, thresholdSec = 10}) {
  return Boolean(isHost && !startAt && elapsedSec >= thresholdSec && seatsCount < wantCount);
}

export function autoFillSeats(currentSeats = [], wantCount = 2, mySeat = null, botNames = [], randomFigFn = () => 'classic') {
  const nextSeats = currentSeats.slice();
  if (mySeat && !nextSeats.some(x => x.owner === mySeat.owner)) {
    nextSeats.unshift({...mySeat, ready: true});
  }
  while (nextSeats.length < wantCount) {
    const bName = (botNames || []).find(n => !nextSeats.some(x => x.name === n)) || ('Бот ' + (nextSeats.length + 1));
    nextSeats.push({
      owner: null,
      bot: true,
      name: bName,
      fig: typeof randomFigFn === 'function' ? randomFigFn() : 'classic',
      col: null,
      ready: true
    });
  }
  return nextSeats;
}

export function formatMatchStatus({seatsCount, wantCount, startAt, now = Date.now()}) {
  const full = seatsCount >= wantCount;
  const left = startAt && startAt !== Infinity ? Math.max(0, Math.ceil((startAt - now) / 1000)) : 0;
  const others = Math.max(0, seatsCount - 1);

  let title = 'Ищем соперников…';
  if (full) {
    title = left ? `Старт через ${left}…` : 'Начинаем!';
  } else if (others > 0) {
    title = `Найдено ${others} из ${wantCount - 1}`;
  }

  return {full, left, title};
}

export function renderMatchSeatsHtml({
  seats = [],
  want = 2,
  myId = '',
  myName = 'Вы',
  myColor = '#ef5350',
  palette = [],
  cleanFn = (s => s),
  meLabelFn = (isMe, name) => isMe ? `${name} (вы)` : name
}) {
  const validCol = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  const list = seats.map((x, i) => {
    const fallbackCol = palette[i] && (palette[i].col || palette[i]) ? (palette[i].col || palette[i]) : '#5b6684';
    const col = validCol(x.col) ? x.col : fallbackCol;
    const initial = (cleanFn(x.name) || '?')[0];
    const isMe = x.owner === myId;
    const label = meLabelFn(isMe, x.name);
    const botPill = (!x.owner && !x.ghost) ? ' <span class="botpill">бот</span>' : '';
    return `<li><span class="av" style="--c:${col}">${initial}</span>${label}${botPill}</li>`;
  });

  if (!seats.length) {
    const col = validCol(myColor) ? myColor : '#ef5350';
    const initial = (myName || '?')[0];
    const label = meLabelFn(true, myName);
    list.push(`<li><span class="av" style="--c:${col}">${initial}</span>${label}</li>`);
  }

  while (list.length < want) {
    list.push('<li class="wait"><span class="av">?</span>Ищем</li>');
  }

  return list.join('');
}
