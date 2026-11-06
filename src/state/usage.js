// What players use: a counter per screen and per button, per day, per player — and nothing else (no texts, no
// nicknames, no mail). The game counts locally (cheap, no network per tap), sends the day's counters to
// /usage/{day}/{uid} now and then, and the owner panel adds them up: how many players used each thing, how often,
// and what nobody touches. The same names also go to Firebase Analytics as the «feature_use» event.

/** Ids the owner panel knows by a Russian name (everything else is shown by its id, so new buttons appear by themselves). */
export const FEATURES = {
  'screen:menu': 'Экран: главная', 'screen:progress': 'Экран: задания и прогресс', 'screen:shop': 'Экран: витрина',
  'screen:friends': 'Экран: друзья', 'screen:profile': 'Экран: профиль', 'screen:rating': 'Экран: рейтинг',
  'screen:history': 'Экран: история партий', 'screen:settings': 'Экран: настройки', 'screen:items': 'Экран: мои предметы',
  'screen:inbox': 'Экран: уведомления и награды', 'screen:rules': 'Экран: правила', 'screen:setup': 'Экран: настройка партии',
  'screen:game': 'Экран: партия', 'screen:results': 'Экран: итоги партии', 'screen:lobby': 'Экран: комната', 'screen:match': 'Экран: поиск соперников',
  'btn:btnMainPlay': 'Кнопка «Играть»', 'btn:btnOpenModes': 'Кнопка «Режим»', 'btn:menuQuestBanner': 'Задания на главной',
  'btn:btnMenuHub': 'Меню справа вверху', 'btn:btnMenuNotif': 'Колокольчик', 'btn:mprof': 'Плашка профиля', 'btn:cupsBtn': 'Кубки под плашкой',
  'btn:menuGiftPill': 'Подарок на главной', 'hub:rating': 'Меню → Рейтинг', 'hub:rules': 'Меню → Как играть', 'hub:history': 'Меню → История', 'hub:settings': 'Меню → Настройки',
  'nav:menu': 'Нижняя панель: главная', 'nav:progress': 'Нижняя панель: задания', 'nav:friends': 'Нижняя панель: друзья', 'nav:shop': 'Нижняя панель: витрина',
  'ptab:road': 'Прогресс: путь', 'ptab:rewards': 'Прогресс: задания', 'ptab:cols': 'Прогресс: коллекции',
  'btn:ok': 'Поставить плитку', 'btn:rot': 'Повернуть плитку', 'btn:tip': 'Подсказка', 'btn:helpBtn': 'Очки и правила в партии', 'btn:sayBtn': 'Реакции в партии',
  'btn:zin': 'Приблизить поле', 'btn:zout': 'Отдалить поле', 'btn:ctr': 'К центру поля', 'btn:turnL': 'Повернуть поле', 'btn:view': 'Наклон камеры 2D/3D', 'btn:gameMenu': 'Меню партии',
  'btn:openGift': 'Ежедневный подарок', 'btn:itemsBtn': 'Мои предметы', 'btn:installBtn': 'Установка игры',
  'say:emote': 'Реакция: эмодзи', 'say:phrase': 'Реакция: фраза',
  'claim:quest': 'Награда за задание', 'claim:achievement': 'Награда за достижение', 'claim:weekly': 'Награда за недельную цель', 'claim:chest': 'Сундук недели',
  'claim:collection': 'Награда за коллекцию', 'claim:road': 'Награда с пути прогресса', 'claim:reroll': 'Замена задания',
  'buy:emote': 'Покупка: эмодзи', 'buy:phrase': 'Покупка: фраза', 'buy:daily': 'Покупка в дневной витрине', 'pick:daily': 'Выбор купленного в витрине',
  'deck:emote': 'Колода: эмодзи', 'deck:phrase': 'Колода: фраза',
  'mode:bots': 'Режим: с ботами', 'mode:local': 'Режим: на одном телефоне', 'mode:lobby': 'Режим: с друзьями (комната)', 'mode:online': 'Режим: онлайн', 'mode:duel': 'Режим: дуэль',
  'rules:fast': 'Правила: быстрая', 'rules:classic': 'Правила: классика', 'rules:big': 'Правила: большая', 'rules:epic': 'Правила: эпическая', 'rules:duel': 'Правила: дуэль',
};

/** Events that are about the game working or about security, never about what a player does: they need no consent. */
export const ESSENTIAL_LOG = new Set(['error', 'maintenance', 'reinstall_offer', 'reinstall_download', 'reinstall_remove', 'wallet_sig_mismatch', 'google_error', 'google_redirect', 'net_down', 'net_back']);
/** May this event, or a usage counter, be recorded? Statistics only with the player's consent (stats === true). */
export const mayRecord = (kind, stats) => stats === true || (kind != null && ESSENTIAL_LOG.has(kind));

const KEY = /^[a-z0-9:_-]{1,32}$/i;
export const isFeatureId = id => typeof id === 'string' && KEY.test(id);

/** The id of what was tapped, from its markup: a data-* name and value, else the element id. null when it is not worth counting. */
export function featureOf(el) {
  if (!el || !el.closest) return null;
  const b = el.closest('[data-claimq],[data-claima],[data-claimwq],[data-claimwchest],[data-claimcol],[data-claimroad],[data-reroll],[data-rbuy],[data-daily-buy],[data-daily-pick],[data-toggle-emote],[data-toggle-phrase],[data-hub-action],[data-pt],[data-mode-action],[data-setmode],[data-nav],[data-go],[data-say],button[id],a[id]');
  if (!b) return null;
  const d = b.dataset || {};
  const id = k => isFeatureId(k) ? k : null;
  if (d.claimq != null) return 'claim:quest';
  if (d.claima != null) return 'claim:achievement';
  if (d.claimwq != null) return 'claim:weekly';
  if (d.claimwchest != null) return 'claim:chest';
  if (d.claimcol != null) return 'claim:collection';
  if (d.claimroad != null) return 'claim:road';
  if (d.reroll != null) return 'claim:reroll';
  if (d.rbuy) return id('buy:' + d.rbuy);
  if (d.dailyBuy != null) return 'buy:daily';
  if (d.dailyPick != null) return 'pick:daily';
  if (d.toggleEmote != null) return 'deck:emote';
  if (d.togglePhrase != null) return 'deck:phrase';
  if (d.say != null) return /[а-яё]/i.test(b.title || b.textContent || '') ? 'say:phrase' : 'say:emote';
  if (d.hubAction) return id('hub:' + d.hubAction);
  if (d.pt) return id('ptab:' + d.pt);
  if (d.modeAction) return id('mode:' + d.modeAction);
  if (d.setmode) return id('rules:' + d.setmode);
  if (d.nav) return id('nav:' + d.nav);
  if (b.id) return id('btn:' + b.id);
  if (d.go) return id('go:' + d.go);
  return null;
}

/** Counters of one day, kept in the phone's storage between sessions: {d: 'YYYY-MM-DD', c: {id: n}}. */
export function bump(state, id, day, n = 1) {
  if (!isFeatureId(id)) return state;
  const s = state && state.d === day ? state : {d: day, c: {}, sent: 0};
  if (!(id in s.c) && Object.keys(s.c).length >= 120) return s;      // a hard cap: the day's record stays small
  s.c[id] = Math.min(5000, (s.c[id] || 0) + n);
  s.dirty = true;
  return s;
}

/** What is sent: {id: n} for the day, only when something changed since the last send. null = nothing to send. */
export function payload(state) {
  if (!state || !state.dirty || !state.c) return null;
  return {...state.c};
}

/**
 * The owner's view. days = [{day, users: {uid: {id: n}}}]. Returns, for every feature seen or known:
 * users (how many different players used it), taps (how many times), share (of the players active in the period),
 * and the known features nobody used.
 */
export function summarize(days, known = FEATURES) {
  const active = new Set(), per = new Map();
  for (const d of days) for (const [uid, c] of Object.entries(d.users || {})) {
    active.add(uid);
    for (const [id, n] of Object.entries(c || {})) {
      if (!isFeatureId(id) || typeof n !== 'number') continue;
      const r = per.get(id) || {id, users: new Set(), taps: 0};
      r.users.add(uid); r.taps += n; per.set(id, r);
    }
  }
  const total = active.size;
  const rows = [...per.values()].map(r => ({id: r.id, name: known[r.id] || r.id, users: r.users.size, taps: r.taps, share: total ? r.users.size / total : 0, known: !!known[r.id]}))
    .sort((a, b) => b.users - a.users || b.taps - a.taps);
  const unused = Object.keys(known).filter(id => !per.has(id)).map(id => ({id, name: known[id]}));
  return {players: total, rows, unused};
}
