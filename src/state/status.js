// Player statuses: a short line (up to 15 characters) shown in the profile, in the friends list, on the player plates
// of an online game and in the rating. Bought in the shop, written by hand (3000 gold a new text) or earned.
// Pure functions: the game keeps the wallet and the gold.

export const STATUS_MAX = 15;
export const CUSTOM_PRICE = 3000;
/** Players who first opened the game before this date get the exclusive "Олд" status. */
export const OLD_BEFORE = '2027-01-01';

/** Statuses sold in the shop: id → text and price in gold. Ids are stored in wallets, never rename them. */
export const SHOP_STATUSES = [
  {id: 'newbie', text: 'Новичок', price: 200},
  {id: 'dreamer', text: 'Мечтатель', price: 250},
  {id: 'baron', text: 'Плиточный барон', price: 300},
  {id: 'chaos', text: 'Зодчий хаоса', price: 350},
  {id: 'wherecastle', text: 'Где мой замок?', price: 400},
  {id: 'sleeper', text: 'Сплю на плитке', price: 450},
  {id: 'ninja', text: 'Мипл-ниндзя', price: 500},
  {id: 'roads', text: 'Шеф дороги', price: 550},
  {id: 'notouch', text: 'Не тыкай', price: 600},
  {id: 'puddleking', text: 'Царь лужи', price: 650},
  {id: 'monk', text: 'В монастыре', price: 700},
  {id: 'forgotrot', text: 'Забыл повернуть', price: 750},
  {id: 'tilemaster', text: 'Плиточник PRO', price: 800},
  {id: 'nopanic', text: 'Без паники', price: 850},
  {id: 'gost', text: 'Всё по ГОСТу', price: 900},
  {id: 'deadend', text: 'Король тупиков', price: 950},
  {id: 'builderhero', text: 'Строю как могу', price: 1000},
  {id: 'genius', text: 'Случайный гений', price: 1100},
  {id: 'bushlord', text: 'Барон кустов', price: 1200},
  {id: 'sofaknight', text: 'Рыцарь дивана', price: 1300},
  {id: 'tactician', text: 'Тактик от бога', price: 1400},
  {id: 'thinking', text: 'Думаю ход...', price: 1500},
  {id: 'allplanned', text: 'Всё по плану', price: 1600},
  {id: 'traktor', text: 'Трактор в поле', price: 1700},
  {id: 'groza', text: 'Гроза огородов', price: 1800},
  {id: 'cat', text: 'Кот на столе', price: 1900},
  {id: 'tea', text: 'Ушёл пить чай', price: 2000},
  {id: 'chill', text: 'На чилле', price: 600},
  {id: 'oops', text: 'Ой, не туда', price: 700},
  {id: 'brick', text: 'Кирпич судьбы', price: 850},
  {id: 'boss', text: 'Биг Босс', price: 1200},
  {id: 'greed', text: 'Жадный мипл', price: 1350},
  {id: 'king', text: 'Король стола', price: 2500},
];

/** Statuses that cannot be bought: earned only. `how` is shown as the condition. */
export const EXCLUSIVE_STATUSES = [
  {id: 'flawless', text: 'Безупречный', how: 'Выполните все задания дня каждый день месяца без пропусков', ic: '🌙'},
  {id: 'allach', text: 'Коллекционер', how: 'Получите все достижения', ic: '🏆'},
  {id: 'legend', text: 'Легенда', how: 'Достигните 30 уровня', ic: '👑'},
  {id: 'old', text: 'Олд', how: 'Играли в Tiletopia до 2027 года', ic: '🗿'},
  {id: 'champion', text: 'Чемпион', how: 'Скоро: первое место в рейтинге недели', ic: '🥇', soon: true},
];

const BAD_STEMS = ['хуй', 'хуе', 'хуя', 'хуи', 'пизд', 'бляд', 'блят', 'ебан', 'ебат', 'ебл', 'ебу', 'еба', 'сука', 'суки', 'мудак', 'мудил', 'пидор', 'пидар', 'гондон', 'залуп', 'шлюх', 'долбо', 'уебок', 'уёбок', 'педик', 'нацист', 'гитлер', 'фашист', 'негр', 'чурк', 'убей', 'убью', 'fuck', 'shit', 'bitch', 'cunt', 'nigg', 'faggot', 'whore', 'dick', 'cock', 'rape', 'nazi', 'hitler', 'porn', 'порн', 'секс', 'sex'];
const LOOK = {a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у', 0: 'о', 3: 'з', 4: 'ч', 6: 'б', ё: 'е'};

/** Removes markup, control characters and repeated spaces; at most STATUS_MAX characters. */
export function cleanStatus(t) {
  return String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f<>&"'`\\‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, STATUS_MAX).trim();
}

/** True when the text has a rude word (compared without case, spaces, punctuation and look-alike letters). */
export function isBadStatus(t) {
  const s = cleanStatus(t).toLowerCase();
  const plain = [...s].map(ch => LOOK[ch] || ch).join('').replace(/[^a-zа-я]/g, '');
  const plainRaw = s.replace(/[^a-zа-яё]/g, '');
  const latin = s.replace(/[^a-z]/g, '');
  return BAD_STEMS.some(w => plain.includes(w) || plainRaw.includes(w) || latin.includes(w));
}

/** The text to show for somebody's status (also for texts that came from other phones): empty when not fit to show. */
export function shownStatus(t) {
  const s = cleanStatus(t);
  return s && !isBadStatus(s) ? s : '';
}

const all = () => [...SHOP_STATUSES.map(x => ({...x, key: 'sh:' + x.id})), ...EXCLUSIVE_STATUSES.map(x => ({...x, key: 'ex:' + x.id}))];
/** Text of an owned status key: 'sh:…' and 'ex:…' come from the lists, 'cu:text' is a hand-written one. */
export function statusText(key) {
  if (typeof key !== 'string') return '';
  if (key.startsWith('cu:')) return shownStatus(key.slice(3));
  const f = all().find(x => x.key === key);
  return f ? f.text : '';
}

export function ownedStatuses(wallet) {
  const own = wallet && Array.isArray(wallet.statuses) ? wallet.statuses : [];
  return own.filter(k => statusText(k));
}

/** Buys a ready status from the shop. Returns {ok, reason}; changes the wallet only on success. */
export function buyShopStatus(wallet, id) {
  const f = SHOP_STATUSES.find(x => x.id === id);
  if (!f) return {ok: false, reason: 'unknown'};
  wallet.statuses = Array.isArray(wallet.statuses) ? wallet.statuses : [];
  if (wallet.statuses.includes('sh:' + id)) return {ok: false, reason: 'owned'};
  if ((wallet.gold || 0) < f.price) return {ok: false, reason: 'gold'};
  wallet.gold -= f.price; wallet.statuses.push('sh:' + id);
  return {ok: true, key: 'sh:' + id, price: f.price};
}

/** Buys a hand-written status for CUSTOM_PRICE gold. */
export function buyCustomStatus(wallet, text) {
  const t = cleanStatus(text);
  if (t.length < 2) return {ok: false, reason: 'short'};
  if (String(text).trim().length > STATUS_MAX) return {ok: false, reason: 'long'};
  if (isBadStatus(t)) return {ok: false, reason: 'bad'};
  wallet.statuses = Array.isArray(wallet.statuses) ? wallet.statuses : [];
  if (wallet.statuses.includes('cu:' + t)) return {ok: false, reason: 'owned'};
  if ((wallet.gold || 0) < CUSTOM_PRICE) return {ok: false, reason: 'gold'};
  wallet.gold -= CUSTOM_PRICE; wallet.statuses.push('cu:' + t);
  return {ok: true, key: 'cu:' + t, price: CUSTOM_PRICE};
}

/** Puts an owned status on (key) or takes it off (null). Returns true on success. */
export function wearStatus(wallet, key) {
  if (key == null) { wallet.statusKey = ''; wallet.status = ''; return true; }
  if (!ownedStatuses(wallet).includes(key)) return false;
  wallet.statusKey = key; wallet.status = statusText(key); return true;
}

const pad = n => String(n).padStart(2, '0');
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1..12
/** True when every day of the month 'YYYY-MM' has a mark in qdays. */
export function flawlessMonth(qdays, ym) {
  const [y, m] = ym.split('-').map(Number), n = daysIn(y, m);
  for (let d = 1; d <= n; d++) if (!(qdays && qdays[`${ym}-${pad(d)}`])) return false;
  return true;
}
const prevMonth = today => { let [y, m] = today.split('-').map(Number); m--; if (m < 1) { m = 12; y--; } return `${y}-${pad(m)}`; };

/**
 * Gives the earned statuses (and the earned frames) the player has a right to. Pure about the date: pass today
 * as 'YYYY-MM-DD'. prog: {lvl, ach, qdays}. Returns the list of newly given keys.
 */
export function grantEarned(wallet, prog, achCount, today) {
  wallet.statuses = Array.isArray(wallet.statuses) ? wallet.statuses : [];
  const got = [], give = k => { if (!wallet.statuses.includes(k)) { wallet.statuses.push(k); got.push(k); } };
  const ach = prog && prog.ach ? prog.ach : {};
  if (wallet.firstSeen && wallet.firstSeen < OLD_BEFORE) give('ex:old');
  if (prog && prog.lvl >= 30) give('ex:legend');
  if (achCount > 0 && Object.values(ach).filter(v => v === 'got').length >= achCount) give('ex:allach');
  const qd = prog && prog.qdays;
  if (qd && flawlessMonth(qd, prevMonth(today))) give('ex:flawless');
  return got;
}
