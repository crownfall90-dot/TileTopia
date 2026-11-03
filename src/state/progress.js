// Progress rules: levels, daily quests and achievements. The game keeps the numbers in wallet.prog (PROG).
// Quest and achievement ids are stored in players' profiles: never rename or reuse one.

/** Experience needed to go from level l to l + 1. */
export const xpNeed = l => 50 + 50 * l;
export const QUESTS = [
  {id: 'c3', ic: '🏰', t: 'Достройте 3 города', k: 'c', n: 3, g: 15},
  {id: 'r3', ic: '🛤️', t: 'Достройте 3 дороги', k: 'r', n: 3, g: 10},
  {id: 'f1', ic: '⛪', t: 'Окружите крепость', k: 'f', n: 1, g: 15},
  {id: 'w1', ic: '🏆', t: 'Победите в партии', k: 'win', n: 1, g: 20},
  {id: 'g2', ic: '🎲', t: 'Сыграйте 2 партии', k: 'games', n: 2, g: 10},
  {id: 's30', ic: '⭐', t: 'Наберите 30 очков за партию (20 в быстрой)', k: 's30', n: 1, g: 15},
  {id: 'o1', ic: '🌍', t: 'Сыграйте онлайн', k: 'online', n: 1, g: 20},
  {id: 'p50', ic: '💎', t: 'Заработайте 50 очков за день', k: 'pts', n: 50, g: 15},
];
/** ok(stats, level) tells whether the achievement is earned. */
export const ACH = [
  {id: 'w1', ic: '🥇', t: 'Первая победа', d: 'Победите в партии', ok: s => s.wins >= 1, g: 20},
  {id: 'w10', ic: '🏅', t: 'Опытный правитель', d: '10 побед', ok: s => s.wins >= 10, g: 50},
  {id: 'w50', ic: '👑', t: 'Король Tiletopia', d: '50 побед', ok: s => s.wins >= 50, g: 150},
  {id: 'g25', ic: '🎲', t: 'Завсегдатай', d: 'Сыграйте 25 партий', ok: s => s.games >= 25, g: 40},
  {id: 'c10', ic: '🏰', t: 'Градостроитель', d: 'Достройте 10 городов', ok: s => s.c >= 10, g: 30},
  {id: 'c50', ic: '🏙️', t: 'Архитектор', d: 'Достройте 50 городов', ok: s => s.c >= 50, g: 80},
  {id: 'r20', ic: '🛤️', t: 'Дорожный мастер', d: 'Достройте 20 дорог', ok: s => s.r >= 20, g: 30},
  {id: 'f5', ic: '⛪', t: 'Хранитель крепостей', d: 'Окружите 5 крепостей', ok: s => s.f >= 5, g: 30},
  {id: 'b50', ic: '⭐', t: 'Полсотни', d: '50 очков за одну партию', ok: s => s.best >= 50, g: 40},
  {id: 'b80', ic: '🌟', t: 'Рекордсмен', d: '80 очков за одну партию', ok: s => s.best >= 80, g: 80},
  {id: 'o1', ic: '🌍', t: 'Покоритель сети', d: 'Победите в онлайн-партии', ok: s => s.owins >= 1, g: 40},
  {id: 'l5', ic: '🎖️', t: 'Пятый уровень', d: 'Достигните 5 уровня', ok: (s, lvl) => lvl >= 5, g: 50},
  {id: 'l10', ic: '💠', t: 'Десятый уровень', d: 'Достигните 10 уровня', ok: (s, lvl) => lvl >= 10, g: 100},
];

/** Weekly goals (R-7) and the big weekly chest reward. */
export const WEEKLY_QUESTS = [
  {id: 'w_win5', ic: '🏆', t: '5 побед за неделю', k: 'win', n: 5, g: 50},
  {id: 'w_games10', ic: '🎲', t: '10 партий за неделю', k: 'games', n: 10, g: 40},
  {id: 'w_c20', ic: '🏰', t: 'Достройте 20 городов за неделю', k: 'c', n: 20, g: 60},
];
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
    ogames: st.ogames || 0,
    owins: st.owins || 0,
    byMode: {
      bots: Object.assign({games: 0, wins: 0, best: 0}, byMode.bots),
      friends: Object.assign({games: 0, wins: 0, best: 0}, byMode.friends),
      online: Object.assign({games: 0, wins: 0, best: 0}, byMode.online),
      duel: Object.assign({games: 0, wins: 0, best: 0}, byMode.duel),
    }
  };
}

export function recordGameMode(st, mode, win, score) {
  const m = mode === 'online' || mode === 'friends' || mode === 'duel' ? mode : 'bots';
  if (!st.byMode) st.byMode = {};
  if (!st.byMode[m]) st.byMode[m] = {games: 0, wins: 0, best: 0};
  st.byMode[m].games++;
  if (win) st.byMode[m].wins++;
  st.byMode[m].best = Math.max(st.byMode[m].best || 0, score || 0);
}

export function addXp(prog, xp) {
  prog.xp += xp; let up = 0;
  while (prog.xp >= xpNeed(prog.lvl)) { prog.xp -= xpNeed(prog.lvl); prog.lvl++; up++; }
  return up;
}
