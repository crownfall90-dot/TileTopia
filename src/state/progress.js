// Progress rules: levels, daily quests and achievements. The game keeps the numbers in wallet.prog (PROG).
// Quest and achievement ids are stored in players' profiles: never rename or reuse one.

/** Experience needed to go from level l to l + 1. */
export const xpNeed = l => 50 + 50 * l;
export const QUESTS = [
  {id: 'c3', ic: '🏰', t: 'Достройте 3 города', k: 'c', n: 3, g: 15},
  {id: 'r3', ic: '🛤️', t: 'Достройте 3 дороги', k: 'r', n: 3, g: 10},
  {id: 'f1', ic: '⛪', t: 'Окружите монастырь', k: 'f', n: 1, g: 15},
  {id: 'w1', ic: '🏆', t: 'Победите в партии', k: 'win', n: 1, g: 20},
  {id: 'g2', ic: '🎲', t: 'Сыграйте 2 партии', k: 'games', n: 2, g: 10},
  {id: 's30', ic: '⭐', t: 'Наберите 30 очков за партию (20 в быстрой)', k: 's30', n: 1, g: 15},
  {id: 'o1', ic: '🌍', t: 'Сыграйте онлайн', k: 'online', n: 1, g: 20},
  {id: 'p50', ic: '💎', t: 'Заработайте 50 очков за день', k: 'pts', n: 50, g: 15},
  {id: 't25', ic: '🧩', t: 'Выложите 25 плиток', k: 'tiles', n: 25, g: 10},
  {id: 'm4', ic: '🧍', t: 'Поставьте 4 фишки', k: 'figs', n: 4, g: 10},
  {id: 'bc5', ic: '🏯', t: 'Достройте город из 5 плиток и больше', k: 'bigc', n: 1, g: 20},
  {id: 'lr4', ic: '🛣️', t: 'Достройте дорогу из 4 плиток и больше', k: 'longr', n: 1, g: 15},
  {id: 'hw1', ic: '🔥', t: 'Победите сложных ботов', k: 'hardwin', n: 1, g: 30},
  {id: 's40', ic: '🌟', t: 'Наберите 40 очков за партию', k: 's40', n: 1, g: 25},
  {id: 'say3', ic: '💬', t: 'Отправьте 3 реакции в партиях', k: 'say', n: 3, g: 10},
  {id: 'f2', ic: '⛪', t: 'Окружите 2 монастыря', k: 'f', n: 2, g: 25},
  {id: 'c5', ic: '🏰', t: 'Достройте 5 городов', k: 'c', n: 5, g: 25},
];
/** One free quest swap a day: the quest the player swaps out is replaced by one not on today's list. */
export function rerollQuest(day, ids, outId) {
  const free = QUESTS.map(q => q.id).filter(id => !ids.includes(id));
  if (!free.length) return null;
  let h = 7; for (const ch of day + ':' + outId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  h = (h * 1103515245 + 12345) >>> 0;
  return free[(h >>> 16) % free.length];
}
/** ok(stats, level) tells whether the achievement is earned. */
export const ACH = [
  {id: 'w1', ic: '🥇', t: 'Первая победа', d: 'Победите в партии', ok: s => s.wins >= 1, g: 20},
  {id: 'w10', ic: '🏅', t: 'Опытный правитель', d: '10 побед', ok: s => s.wins >= 10, g: 50},
  {id: 'w50', ic: '👑', t: 'Король Tiletopia', d: '50 побед', ok: s => s.wins >= 50, g: 150},
  {id: 'g25', ic: '🎲', t: 'Завсегдатай', d: 'Сыграйте 25 партий', ok: s => s.games >= 25, g: 40},
  {id: 'c10', ic: '🏰', t: 'Градостроитель', d: 'Достройте 10 городов', ok: s => s.c >= 10, g: 30},
  {id: 'c50', ic: '🏙️', t: 'Архитектор', d: 'Достройте 50 городов', ok: s => s.c >= 50, g: 80},
  {id: 'r20', ic: '🛤️', t: 'Дорожный мастер', d: 'Достройте 20 дорог', ok: s => s.r >= 20, g: 30},
  {id: 'f5', ic: '⛪', t: 'Хранитель монастырей', d: 'Окружите 5 монастырей', ok: s => s.f >= 5, g: 30},
  {id: 'b50', ic: '⭐', t: 'Полсотни', d: '50 очков за одну партию', ok: s => s.best >= 50, g: 40},
  {id: 'b80', ic: '🌟', t: 'Рекордсмен', d: '80 очков за одну партию', ok: s => s.best >= 80, g: 80},
  {id: 'o1', ic: '🌍', t: 'Покоритель сети', d: 'Победите в онлайн-партии', ok: s => s.owins >= 1, g: 40},
  {id: 'l5', ic: '🎖️', t: 'Пятый уровень', d: 'Достигните 5 уровня', ok: (s, lvl) => lvl >= 5, g: 50},
  {id: 'l10', ic: '💠', t: 'Десятый уровень', d: 'Достигните 10 уровня', ok: (s, lvl) => lvl >= 10, g: 100},
  // tiers: bronze → silver → gold along one stat (shown as the medal colour); silver medals pay in silver coins,
  // gold medals in gold coins (coin; g is then a number of those coins, src/state/coins.js)
  {id: 'ws3', tier: 'bronze', ic: '🔥', t: 'В ударе', d: '3 победы подряд', ok: s => (s.bestStreak || 0) >= 3, g: 40},
  {id: 'ws5', tier: 'gold', ic: '☄️', t: 'Неудержимый', d: '5 побед подряд', ok: s => (s.bestStreak || 0) >= 5, g: 1, coin: 'star'},
  {id: 'g100', tier: 'silver', ic: '🎲', t: 'Ветеран стола', d: 'Сыграйте 100 партий', ok: s => s.games >= 100, g: 400, coin: 'tile'},
  {id: 'c100', tier: 'gold', ic: '🏰', t: 'Великий зодчий', d: 'Достройте 100 городов', ok: s => s.c >= 100, g: 2, coin: 'star'},
  {id: 'r50', tier: 'silver', ic: '🛤️', t: 'Строитель трактов', d: 'Достройте 50 дорог', ok: s => s.r >= 50, g: 200, coin: 'tile'},
  {id: 'r150', tier: 'gold', ic: '🛣️', t: 'Владыка дорог', d: 'Достройте 150 дорог', ok: s => s.r >= 150, g: 2, coin: 'star'},
  {id: 'f15', tier: 'silver', ic: '⛪', t: 'Настоятель', d: 'Окружите 15 монастырей', ok: s => s.f >= 15, g: 200, coin: 'tile'},
  {id: 'f40', tier: 'gold', ic: '🔔', t: 'Епископ', d: 'Окружите 40 монастырей', ok: s => s.f >= 40, g: 2, coin: 'star'},
  {id: 't500', tier: 'silver', ic: '🧩', t: 'Мастер мозаики', d: 'Выложите 500 плиток', ok: s => (s.tiles || 0) >= 500, g: 200, coin: 'tile'},
  {id: 't2000', tier: 'gold', ic: '🗺️', t: 'Великий картограф', d: 'Выложите 2000 плиток', ok: s => (s.tiles || 0) >= 2000, g: 3, coin: 'star'},
  {id: 'm100', tier: 'silver', ic: '🧍', t: 'Полководец', d: 'Поставьте 100 фишек', ok: s => (s.figs || 0) >= 100, g: 200, coin: 'tile'},
  {id: 'mc10', tier: 'silver', ic: '🏙️', t: 'Столица', d: 'Достройте город из 10 плиток', ok: s => (s.maxCity || 0) >= 10, g: 200, coin: 'tile'},
  {id: 'mc15', tier: 'gold', ic: '🌆', t: 'Мегаполис', d: 'Достройте город из 15 плиток', ok: s => (s.maxCity || 0) >= 15, g: 1, coin: 'star'},
  {id: 'mr8', tier: 'silver', ic: '🛣️', t: 'Великий тракт', d: 'Достройте дорогу из 8 плиток', ok: s => (s.maxRoad || 0) >= 8, g: 200, coin: 'tile'},
  {id: 'b100', tier: 'gold', ic: '💫', t: 'Легенда стола', d: '100 очков за одну партию', ok: s => s.best >= 100, g: 2, coin: 'star'},
  {id: 'hw5', tier: 'silver', ic: '🤖', t: 'Гроза ботов', d: '5 побед над сложными ботами', ok: s => (s.hardwin || 0) >= 5, g: 300, coin: 'tile'},
  {id: 'o10', tier: 'gold', ic: '🌐', t: 'Чемпион сети', d: '10 побед онлайн', ok: s => s.owins >= 10, g: 2, coin: 'star'},
  {id: 'say50', tier: 'bronze', ic: '💬', t: 'Душа компании', d: 'Отправьте 50 реакций', ok: s => (s.say || 0) >= 50, g: 40},
  {id: 'l20', tier: 'gold', ic: '👑', t: 'Двадцатый уровень', d: 'Достигните 20 уровня', ok: (s, lvl) => lvl >= 20, g: 3, coin: 'star'},
];

/** Weekly goals (R-7) and the big weekly chest reward. */
export const WEEKLY_QUESTS = [
  {id: 'w_win5', ic: '🏆', t: '5 побед за неделю', k: 'win', n: 5, g: 50},
  {id: 'w_games10', ic: '🎲', t: '10 партий за неделю', k: 'games', n: 10, g: 40},
  {id: 'w_c20', ic: '🏰', t: 'Достройте 20 городов за неделю', k: 'c', n: 20, g: 60},
];
/** Extra weekly goals: one of them joins the three above each week, the same for everyone that week. */
export const WEEKLY_EXTRA = [
  {id: 'w_tiles150', ic: '🧩', t: 'Выложите 150 плиток за неделю', k: 'tiles', n: 150, g: 50},
  {id: 'w_f3', ic: '⛪', t: 'Окружите 3 монастыря за неделю', k: 'f', n: 3, g: 50},
  {id: 'w_bigc3', ic: '🏯', t: '3 больших города за неделю', k: 'bigc', n: 3, g: 60},
  {id: 'w_hard2', ic: '🔥', t: '2 победы над сложными ботами', k: 'hardwin', n: 2, g: 60},
];
/** The goals of a week: the three core ones and one extra, picked by the week id. */
export function weeklyQuests(week) {
  let h = 0; for (const ch of String(week)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [...WEEKLY_QUESTS, WEEKLY_EXTRA[h % WEEKLY_EXTRA.length]];
}
/* Challenges: one rare, long task every two weeks that pays in stars (the rare coin). Much harder than a weekly goal;
   the player has the whole two weeks for it. The same challenge for everyone in those two weeks. */
export const CHALLENGES = [
  {id: 'r_win20', ic: '🏆', t: 'Испытание: 20 побед', k: 'win', n: 20, s: 2},
  {id: 'r_c60', ic: '🏰', t: 'Испытание: достройте 60 городов', k: 'c', n: 60, s: 2},
  {id: 'r_hard8', ic: '🔥', t: 'Испытание: 8 побед над сложными ботами', k: 'hardwin', n: 8, s: 3},
  {id: 'r_tiles600', ic: '🧩', t: 'Испытание: выложите 600 плиток', k: 'tiles', n: 600, s: 1},
  {id: 'r_f10', ic: '⛪', t: 'Испытание: окружите 10 монастырей', k: 'f', n: 10, s: 2},
  {id: 'r_bigc10', ic: '🏯', t: 'Испытание: 10 больших городов', k: 'bigc', n: 10, s: 2},
  {id: 'r_games40', ic: '🎲', t: 'Испытание: сыграйте 40 партий', k: 'games', n: 40, s: 1},
];
/** The two weeks a week belongs to ('2026-F23') and that fortnight's challenge. */
export function fortnightId(week) { const m = /^(\d+)-W(\d+)$/.exec(String(week)); return m ? `${m[1]}-F${Math.ceil(+m[2] / 2)}` : 'F0'; }
export function challengeOf(fortnight) {
  let h = 0; for (const ch of String(fortnight)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CHALLENGES[h % CHALLENGES.length];
}
export const WEEKLY_CHEST_GOLD = 100;

/** ISO-like week identifier: 'YYYY-Www' */
export function weekId(d = new Date()) {
  const target = new Date(typeof d === 'string' || typeof d === 'number' ? d : d.getTime());
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - (target.getDay() + 6) % 7);
  const week1 = new Date(target.getFullYear(), 0, 4);
  const w = 1 + Math.round(((target.getTime() - week1.getTime()) / 864e5 - 3 + (week1.getDay() + 6) % 7) / 7);
  return target.getFullYear() + '-W' + String(w).padStart(2, '0');
}

/** Returns true if a missed day can be saved by the weekly streak freeze (R-12). */
export function canFreezeStreak(st, todayStr, curWeek) {
  if (!st || !st.last || !st.n || st.n < 1) return false;
  if (st.freezeWeek && st.freezeWeek === curWeek) return false;
  const d0 = new Date(st.last + 'T00:00:00Z').getTime();
  const d1 = new Date(todayStr + 'T00:00:00Z').getTime();
  const diffDays = Math.round((d1 - d0) / 864e5);
  return diffDays === 2;
}

/** Three quests a day, the same on every phone for that date (day: 'YYYY-MM-DD').
 *  The pick uses the high bits of the generator: its low bits repeat with a short period, and taking them made
 *  «Достройте 3 города» come up every single day. */
export function dailyQuests(day) {
  let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = QUESTS.slice(), pick = [];
  while (pick.length < 3) { h = (h * 1103515245 + 12345) >>> 0; pick.push(pool.splice((h >>> 16) % pool.length, 1)[0].id); }
  return pick;
}

/** Adds experience to prog ({xp, lvl}); returns how many levels were gained. */
// Mastery stats (R-11)
export function normalizeStats(st = {}) {
  const byMode = st.byMode || {};
  return {
    games: st.games || 0,
    wins: st.wins || 0,
    c: st.c || 0,
    r: st.r || 0,
    f: st.f || 0,
    best: st.best || 0,
    maxCity: st.maxCity || 0,
    maxRoad: st.maxRoad || 0,
    tiles: st.tiles || 0,
    figs: st.figs || 0,
    bigc: st.bigc || 0,
    longr: st.longr || 0,
    hardwin: st.hardwin || 0,
    say: st.say || 0,
    streak: st.streak || 0,
    bestStreak: st.bestStreak || 0,
    ogames: st.ogames || 0,
    owins: st.owins || 0,
    byMode: {
      bots: Object.assign({games: 0, wins: 0, best: 0}, byMode.bots),
      friends: Object.assign({games: 0, wins: 0, best: 0}, byMode.friends),
      online: Object.assign({games: 0, wins: 0, best: 0}, byMode.online),
    }
  };
}

export function recordGameMode(st, mode, win, score) {
  const m = mode === 'online' || mode === 'friends' ? mode : 'bots';
  if (!st.byMode) st.byMode = {};
  if (!st.byMode[m]) st.byMode[m] = {games: 0, wins: 0, best: 0};
  st.byMode[m].games++;
  if (win) st.byMode[m].wins++;
  st.byMode[m].best = Math.max(st.byMode[m].best || 0, score || 0);
}

/**
 * Gold on top of a finished game, the habit-forming kind top games use: the first win of the day pays a bonus, and
 * every further win in a row pays more (capped). A game the player barely played (laid < 6 cards) pays nothing.
 * stats = PROG.st (streak is already updated for this game), fw = the day of the last first-win bonus.
 */
export const FIRST_WIN_GOLD = 30, STREAK_GOLD_STEP = 10, STREAK_GOLD_MAX = 50;
export function winBonus({win, streak = 0, laid = 0, today = '', fw = ''}) {
  if (!win || laid < 6) return {gold: 0, first: 0, streakGold: 0};
  const first = fw !== today ? FIRST_WIN_GOLD : 0;
  const streakGold = streak >= 2 ? Math.min(STREAK_GOLD_MAX, STREAK_GOLD_STEP * (streak - 1)) : 0;
  return {gold: first + streakGold, first, streakGold};
}

export function addXp(prog, xp) {
  prog.xp += xp; let up = 0;
  while (prog.xp >= xpNeed(prog.lvl)) { prog.xp -= xpNeed(prog.lvl); prog.lvl++; up++; }
  return up;
}
