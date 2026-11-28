/* ---------------- progress: level, daily quests, achievements, rating ----------------
   Counted games are the ones that pay gold: you alone against bots, or online. */
const meCounted = () => { const me = players.findIndex(isMe); return me >= 0 && (!!net || (localHumans() === 1 && !players.every(p => p.human))); };
const {xpNeed, QUESTS, ACH, WEEKLY_QUESTS, WEEKLY_CHEST_GOLD, weekId, normalizeStats, recordGameMode} = PG.state.progress;
// every weekly goal there can be (three core ones and the extra of each week), to look a goal up by its id
const WEEKLY_ALL = [...WEEKLY_QUESTS, ...(PG.state.progress.WEEKLY_EXTRA || [])];
const PROG = Object.assign({xp: 0, lvl: 1, st: {}, day: '', q: [], ach: {}, cups: 0, up: 0, hcups: 0, hup: 0, cupsSeen: 0, inTop10: false, topSeen: false}, wallet.prog);
PROG.st = normalizeStats(PROG.st);
wallet.prog = PROG;
function questsWeekly() {
  const curWeek = (PG.state.progress && PG.state.progress.weekId) ? PG.state.progress.weekId() : 'w1';
  if (PROG.week === curWeek && PROG.wq && PROG.wq.length) return;
  PROG.week = curWeek;
  PROG.wq = PG.state.progress.weeklyQuests(curWeek).map(q => ({id: q.id, n: 0, got: false}));
  PROG.wchest = false;
}
// The challenge (src/state/progress.js CHALLENGES): a new one twice a week, whether the old was done or not.
function challengeNow() {
  const P = PG.state.progress, fn = P.challengePeriod();
  if (PROG.rfn !== fn || !PROG.rq) { PROG.rfn = fn; PROG.rq = {id: P.challengeOf(fn).id, n: 0, got: false}; }
  return PROG.rq;
}
const challengeDef = () => PG.state.progress.CHALLENGES.find(x => x.id === challengeNow().id);
// Three quests a day, the same for the whole day.
function questsToday() {
  if (PROG.day === today() && (PROG.q || []).every(q => QUESTS.some(x => x.id === q.id))) return;   // a quest that no longer exists: pick the day again
  PROG.day = today(); PROG.q = PG.state.progress.dailyQuests(PROG.day).map(id => ({id, n: 0, got: false}));
}
// Earned statuses and frames: a day counts when every daily task is done; the month is checked in grantEarned.
function markQuestDay() {
  if (!PROG.q || !PROG.q.length || !PROG.day) return;
  if (PROG.q.every(q => { const Q = QUESTS.find(x => x.id === q.id); return Q && q.n >= Q.n; })) {
    PROG.qdays = PROG.qdays || {}; PROG.qdays[PROG.day] = 1;
    const keep = Object.keys(PROG.qdays).sort().slice(-70); PROG.qdays = Object.fromEntries(keep.map(k => [k, 1]));
  }
}
function earnedCheck() {
  if (!wallet) return;
  const S = PG.state.status, got = S.grantEarned(wallet, PROG, ACH.length, today());
  const {EARNED_FRAMES} = PG.state.catalog, fr = [];
  wallet.frames = Array.isArray(wallet.frames) ? wallet.frames : [];
  for (const [k, ok] of Object.entries(EARNED_FRAMES)) if (ok(PROG, ACH.length) && !wallet.frames.includes(k)) { wallet.frames.push(k); fr.push(k); }
  if (!got.length && !fr.length) return;
  saveWallet();
  const names = got.map(k => `«${S.statusText(k)}»`).concat(fr.map(k => `рамка «${FRAMES[k].name}»`));
  // Quietly grant earned items without intrusive toast on boot (visible in profile/shop)
}
// The status shown to others: the worn one, checked again (a text from another phone is never trusted).
const myStatus = () => PG.state.status.shownStatus(wallet.status || '');
const stTag = t => { const v = PG.state.status.shownStatus(t); return v ? `<em class="fst">${v}</em>` : ''; };
function progress(d) {
  questsToday();
  questsWeekly();
  if (d.cityTiles) PROG.st.maxCity = Math.max(PROG.st.maxCity || 0, d.cityTiles);
  if (d.roadTiles) PROG.st.maxRoad = Math.max(PROG.st.maxRoad || 0, d.roadTiles);
  for (const [k, v] of Object.entries(d)) {
    if (k in PROG.st && !['best', 'maxCity', 'maxRoad', 'byMode', 'streak', 'bestStreak'].includes(k)) PROG.st[k] += v;
    PROG.q.forEach(q => { const Q = QUESTS.find(x => x.id === q.id); if (Q && Q.k === k && !q.got) q.n = Math.min(Q.n, q.n + v); });
    if (PROG.wq) {
      PROG.wq.forEach(q => { const WQ = WEEKLY_ALL.find(x => x.id === q.id); if (WQ && WQ.k === k && !q.got) q.n = Math.min(WQ.n, q.n + v); });
      const rq = challengeNow(), RQ = challengeDef(); if (RQ && RQ.k === k && !rq.got) rq.n = Math.min(RQ.n, rq.n + v);
    }
  }
  markQuestDay(); earnedCheck();
  saveWallet(); progressDot(); renderMenuQuestBanner();
}
// place: 0 = first … ; -1 = draw.
function gameDone(place, score) {
  const win = place === 0;
  PROG.st.best = Math.max(PROG.st.best, score);
  const mode = net ? (net.quick ? 'online' : 'friends') : 'bots';
  recordGameMode(PROG.st, mode, win, score);
  if (!net && mode === 'bots') {
    const curLevel = botLevel();
    if (!wallet.botStreak) wallet.botStreak = { w: 0, l: 0 };
    const adapt = PG.engine.bots.checkAdaptiveDifficulty(wallet.botStreak, win, curLevel);
    wallet.botStreak = adapt.streak;
    if (adapt.offer) {
      setTimeout(() => {
        if (adapt.offer === 'hard') {
          confirmBox('Отличная серия побед над ботами (3 подряд)! Хотите повысить сложность на «Сложные»?<br><small style="color:var(--muted)">Вы всегда можете изменить сложность в настройках партии.</small>', 'Повысить', () => {
            wallet.botlvl = 'hard';
            wallet.botStreak = { w: 0, l: 0 };
            saveWallet();
            toastAny('Сложность ботов: Сложные');
          }, 'Оставить', () => {
            wallet.botStreak = { w: 0, l: 0 };
            saveWallet();
          });
        } else if (adapt.offer === 'easy') {
          confirmBox('Сложно играть против ботов? Хотите переключить сложность на «Лёгкие»?<br><small style="color:var(--muted)">Вы всегда можете изменить сложность в настройках партии.</small>', 'Переключить', () => {
            wallet.botlvl = 'easy';
            wallet.botStreak = { w: 0, l: 0 };
            saveWallet();
            toastAny('Сложность ботов: Лёгкие');
          }, 'Оставить', () => {
            wallet.botStreak = { w: 0, l: 0 };
            saveWallet();
          });
        }
      }, 2500);
    }
  }
  // Funnel markers: the owner's panel and Analytics show where newcomers stop.
  { const n = PROG.st.games + 1; if (n <= 3) track(['first_game_done', 'second_game_done', 'third_game_done'][n - 1], {win: win ? 1 : 0, score}); }
  PROG.st.streak = win ? (PROG.st.streak || 0) + 1 : 0;
  PROG.st.bestStreak = Math.max(PROG.st.bestStreak || 0, PROG.st.streak);
  const hard = !net && win && typeof botLevel === 'function' && botLevel() === 'hard';
  const sq = (PG.state.progress && PG.state.progress.matchScoreQuests)
    ? PG.state.progress.matchScoreQuests(score, deckMax)
    : {s30: score >= (deckMax <= 30 ? 20 : 30) ? 1 : 0, s40: score >= (deckMax <= 30 ? 25 : 40) ? 1 : 0};
  progress({games: 1, win: win ? 1 : 0, wins: win ? 1 : 0, s30: sq.s30, s40: sq.s40, online: net ? 1 : 0, ogames: net ? 1 : 0, owins: net && win ? 1 : 0, hardwin: hard ? 1 : 0});
  // Experience: a share for taking part, more for the place and for the points, half again online. A game where this
  // player laid fewer than 6 cards gives nothing (quitting early is not farming).
  const me = players.find(isMe), laid = me && me.stats ? me.stats.t || 0 : 6;
  const xp = laid < 6 ? 0 : Math.round((10 + (place < 0 ? 15 : [30, 20, 10, 5, 5][place] || 5) + Math.min(40, score >> 1)) * (net ? 1.5 : 1));
  const up = PG.state.progress.addXp(PROG, xp); wallet.gold += 20 * up;
  // first win of the day and wins in a row pay a little extra gold
  const wb = PG.state.progress.winBonus({win, streak: PROG.st.streak, laid, today: today(), fw: wallet.fwDay});
  if (wb.gold) {
    wallet.gold += wb.gold; if (wb.first) wallet.fwDay = today();
    setTimeout(() => toastAny(`${wb.first ? 'Первая победа дня' : 'Серия побед'}: +${wb.gold} тайлов${wb.first && wb.streakGold ? ` (серия ×${PROG.st.streak})` : wb.streakGold ? ` · ${PROG.st.streak} подряд` : ''}`), 2600);
  }
  // Cups: quick online games, and a private room whose creator turned "for cups" on (at most 5 such games a day:
  // nobody can farm cups with a friend). No cups if any bot is in the game.
  const hasBots = players.some(p => !p.human);
  const privCups = !!(net && !net.quick && gameRules.cups && players.filter(p => p.human).length >= 2 && !hasBots);
  if (privCups) { const d = today(); if (PROG.pc && PROG.pc.d === d) PROG.pc.n++; else PROG.pc = {d, n: 1}; }
  const rated = !!(!hasBots && net && (net.quick || (privCups && PROG.pc.n <= 5)));
  const CUP_TABLE_BY_PLAYERS = { 2: [10, -7], 3: [10, 2, -7], 4: [10, 4, -3, -7], 5: [10, 5, 0, -4, -8] };
  const rawDelta = rated ? ((CUP_TABLE_BY_PLAYERS[players.length] || CUP_TABLE_BY_PLAYERS[4])[place] ?? (place === 0 ? 10 : -5)) : 0;
  // Classic 2.0 has a rating of its own: its cups go to a separate board (/leaders_hex).
  const hexRated = !!(gameRules && gameRules.mode === 'hex');
  const curCups = hexRated ? (PROG.hcups || 0) : (PROG.cups || 0);
  const cups = (curCups + rawDelta < 0) ? -curCups : rawDelta;
  if (rated && hexRated) { PROG.hcups = (PROG.hcups || 0) + cups; syncRating(false, 'hex'); }
  else if (rated) { PROG.cups += cups; syncRating(); }
  saveWallet(); progressDot();
  // experience and a new level are shown by the results board itself (rewardChips)
  const fresh = ACH.filter(a => !PROG.ach[a.id] && a.ok(PROG.st, PROG.lvl));
  if (fresh.length) setTimeout(() => toastAny(`Достижение: ${fresh[0].t}`), 3600);
  return {rated, cups, hex: hexRated, xp, up, lvl: PROG.lvl, place};
}
const rewardReady = () => {
  questsToday();
  questsWeekly();
  const qDot = PROG.q.some(q => !q.got && q.n >= QUESTS.find(x => x.id === q.id).n);
  const wqDot = PROG.wq && (PROG.wq.some(q => !q.got && q.n >= (WEEKLY_ALL.find(x => x.id === q.id) || {}).n) || (!PROG.wchest && PROG.wq.every(q => q.got))) || (() => { const rq = challengeNow(), RQ = challengeDef(); return !!(RQ && !rq.got && rq.n >= RQ.n); })();
  const aDot = ACH.some(a => a.ok(PROG.st, PROG.lvl) && PROG.ach[a.id] !== 'got');
  return qDot || wqDot || aDot || !!PROG.inTop10;
};
function ptabsDot() {
  questsToday();
  questsWeekly();
  const qDot = PROG.q.some(q => !q.got && q.n >= QUESTS.find(x => x.id === q.id).n);
  const wqDot = PROG.wq && (PROG.wq.some(q => !q.got && q.n >= (WEEKLY_ALL.find(x => x.id === q.id) || {}).n) || (!PROG.wchest && PROG.wq.every(q => q.got))) || (() => { const rq = challengeNow(), RQ = challengeDef(); return !!(RQ && !rq.got && rq.n >= RQ.n); })();
  const aDot = ACH.some(a => a.ok(PROG.st, PROG.lvl) && PROG.ach[a.id] !== 'got');
  const tDot = !!PROG.inTop10;
  document.querySelectorAll('#ptabs button').forEach(b => {
    const pt = b.dataset.pt;
    b.classList.toggle('hasdot', pt === 'rewards' ? (qDot || wqDot || aDot) : pt === 'top' ? tDot : false);
  });
}
// road begins at level 1 (cups: 0), then every next stage: +5 levels and +250 cups
const PROGRESS_ROAD_MILESTONES = [
  { id: 'm1', lvl: 1, cups: 0, title: 'Старт', desc: 'Первый шаг на Дороге прогресса · +30 тайлов', reward: { gold: 30 }, ic: '🚩' },
  { id: 'm5', lvl: 5, cups: 250, title: 'Новичок', desc: '+50 тайлов и эмодзи 😎', reward: { gold: 50, emote: '😎' }, ic: '🌱' },
  { id: 'm10', lvl: 10, cups: 500, title: 'Следопыт', desc: 'Статус «Следопыт» и +80 тайлов', reward: { status: 'Следопыт', gold: 80 }, ic: '🧭' },
  { id: 'm15', lvl: 15, cups: 750, title: 'Зодчий', desc: '+120 тайлов и эмодзи 🏰', reward: { gold: 120, emote: '🏰' }, ic: '🏰' },
  { id: 'm20', lvl: 20, cups: 1000, title: 'Изумруд', desc: 'Рамка «Изумруд» и +150 тайлов', reward: { frame: 'emerald', gold: 150 }, ic: '💎' },
  { id: 'm25', lvl: 25, cups: 1250, title: 'Мастер', desc: '+200 тайлов и фраза «Красиво строишь!»', reward: { gold: 200, phrase: 'Красиво строишь!' }, ic: '⭐' },
  { id: 'm30', lvl: 30, cups: 1500, title: 'Магистр', desc: 'Фигурка «Архимаг», +250 тайлов и +1 звезда', reward: { fig: 'wizard', gold: 250, stars: 1 }, ic: '🧙‍♂️' },
  { id: 'm35', lvl: 35, cups: 1750, title: 'Золотой сундук', desc: '+350 тайлов', reward: { gold: 350 }, ic: '🎁' },
  { id: 'm40', lvl: 40, cups: 2000, title: 'Гроссмейстер', desc: 'Статус «Гроссмейстер», +300 тайлов, фраза и +2 звезды', reward: { status: 'Гроссмейстер', gold: 300, stars: 2, phrase: 'Ну ты гроссмейстер! 👑' }, ic: '👑' },
  { id: 'm45', lvl: 45, cups: 2250, title: 'Легенда', desc: '+400 тайлов, статус «Легенда» и +2 звезды', reward: { status: 'Легенда', gold: 400, stars: 2 }, ic: '⚔️' },
  { id: 'm50', lvl: 50, cups: 2500, title: 'Чемпион', desc: 'Кубок Чемпиона, рамка, +600 тайлов и +3 звезды', reward: { frame: 'gold', gold: 600, stars: 3, emote: '🏆' }, ic: '🏆' },
].filter(m => m.lvl <= 30);   // the road goes up to level 30 for now

function progressDot() {
  const b = $('#progBtn');
  const myLvl = PROG.lvl || 1, myCups = (PROG.cups || 0) + (PROG.hcups || 0);
  const claimed = wallet.roadClaimed || [];
  const roadReady = PROGRESS_ROAD_MILESTONES.some(m => (myLvl >= m.lvl && myCups >= m.cups) && !claimed.includes(m.id));
  const hasDot = rewardReady() || roadReady;
  if (b) b.classList.toggle('hasdot', hasDot);
  const dotEl = $('#progNavDot');
  if (dotEl) dotEl.hidden = !hasDot;
  ptabsDot();
  if (typeof updateNotifBadge === 'function') updateNotifBadge();
}
let ptab = 'road';
function ring(frac) { return PG.ui.progress.ringSvg(frac); }
