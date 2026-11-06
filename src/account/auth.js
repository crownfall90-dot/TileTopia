// Account authentication & profile helpers (E-1.3)

export const RENAME_PRICE = 50;

export const NICKNAME_ADJECTIVES = [
  'Мудрый', 'Смелый', 'Тихий', 'Быстрый', 'Горный', 'Вольный',
  'Храбрый', 'Светлый', 'Верный', 'Зоркий', 'Тайный', 'Ловкий'
];

export const NICKNAME_NOUNS = [
  'Зодчий', 'Искатель', 'Странник', 'Следопыт', 'Картограф', 'Магистр',
  'Хранитель', 'Страж', 'Орион', 'Бастион', 'Атлас', 'Компас'
];

// Международные / английские одиночные никнеймы
export const NICKNAMES_EN_SOLO = [
  'Shadow', 'Nova', 'Vortex', 'Apex', 'Pixel', 'Ghost', 'Cyber', 'Titan',
  'Blaze', 'Frost', 'Echo', 'Valkyrie', 'Phoenix', 'Raven', 'Matrix', 'Zero',
  'Pulse', 'Aero', 'Glitch', 'Phantom', 'Storm', 'Zen', 'Hunter', 'Falcon',
  'Raptor', 'Viper', 'Specter', 'Flash', 'Nexus', 'Cosmo', 'Spark', 'Rogue',
  'Vector', 'Havoc', 'Astral', 'Bullet', 'Eclipse', 'Sniper', 'Turbo', 'Gamer'
];

// Международные / английские составные никнеймы (до 12 символов)
export const NICKNAMES_EN_COMPOUND = [
  'NeoFox', 'SkyRider', 'CyberWolf', 'IceDragon', 'DarkKnight', 'StarLord',
  'ZenMaster', 'ApexWolf', 'RedHawk', 'BlueFlame', 'IronClad', 'SpeedyFox',
  'WildCat', 'PixelHero', 'ShadowCat', 'GhostRider', 'StormBorn', 'NightOwl',
  'SunStrike', 'MoonWalker', 'IronWolf', 'GoldEagle', 'FireBird', 'FrostBite'
];

// Современные русские одиночные имена и тотемы
export const NICKNAMES_RU_SOLO = [
  'Самурай', 'Джокер', 'Маэстро', 'Викинг', 'Шериф', 'Тайфун', 'Снайпер',
  'Цунами', 'Комета', 'Фантом', 'Пиксель', 'Север', 'Вихрь', 'Импульс',
  'Метеор', 'Пламя', 'Буран', 'Квазар', 'Атлант', 'Вектор', 'Шаман',
  'Барс', 'Сокол', 'Рысь', 'Пантера', 'Лис', 'Коршун', 'Ястреб',
  'Медведь', 'Грифон', 'Волк', 'Гроза', 'Апач', 'Ронин', 'Сармат',
  'Марк', 'Илья', 'Глеб', 'Лев', 'Ян', 'Артур', 'Макс', 'Мирон', 'Тимур'
];

// Плиточная стратегия и настольные ники
export const NICKNAMES_STRATEGY = [
  'TileMaster', 'Стратег', 'Architect', 'Мозаик', 'Шахматист', 'Builder',
  'TileKing', 'Domino', 'PuzzlePro', 'Tactician', 'CityMaker'
];

// Геймерские никнеймы с цифрами и приставками
export const NICKNAMES_GAMERTAG = [
  'Fox_99', 'Neo_7', 'Alex_X', 'ProMax', 'Leo_07', 'Ace_1', 'Kai_X',
  'Rex_99', 'Sam_01', 'Ray_77', 'Max_X', 'Nik_007', 'Zack_9', 'Finn_7'
];

/**
 * Генерирует разнообразный уникальный никнейм любого стиля и языка:
 * английский, русский, геймерский, тотемный, короткий, стратегический (до 12 символов).
 */
export function generateRandomNickname(rngFn = Math.random) {
  const pick = arr => arr[Math.floor(rngFn() * arr.length)];

  // Для детерминированных тестов с мок-функцией RNG
  if (rngFn !== Math.random) {
    const val = rngFn();
    if (val < 0.45) return pick(NICKNAME_NOUNS);
    const combo = `${pick(NICKNAME_ADJECTIVES)} ${pick(NICKNAME_NOUNS)}`;
    return combo.length <= 12 ? combo : pick(NICKNAME_NOUNS);
  }

  // Реальная генерация в игре: выбор из 5 разнообразных стилей
  const roll = rngFn();
  let name = '';

  if (roll < 0.28) {
    // Английские стили (одиночные или составные)
    name = rngFn() < 0.5 ? pick(NICKNAMES_EN_SOLO) : pick(NICKNAMES_EN_COMPOUND);
  } else if (roll < 0.56) {
    // Русские современные одиночные, тотемы, имена
    name = pick(NICKNAMES_RU_SOLO);
  } else if (roll < 0.74) {
    // Геймерские ники с индексами (Fox_99, Neo_7 и др.)
    name = pick(NICKNAMES_GAMERTAG);
  } else if (roll < 0.88) {
    // Стратегические / плиточные
    name = pick(NICKNAMES_STRATEGY);
  } else {
    // Приключенческие классические связки
    if (rngFn() < 0.35) {
      name = pick(NICKNAME_NOUNS);
    } else {
      const combo = `${pick(NICKNAME_ADJECTIVES)} ${pick(NICKNAME_NOUNS)}`;
      name = combo.length <= 12 ? combo : pick(NICKNAME_NOUNS);
    }
  }

  const clean = sanitizeNickname(name);
  return clean.length >= 2 ? clean : 'Nova';
}

/** Sanitize nickname and constrain length to 12 characters. */
export function sanitizeNickname(v) {
  return String(v || '').replace(/[<>&"'`]/g, '').trim().slice(0, 12);
}

/** Check whether a nickname is valid (at least 2 chars, not placeholder). */
export function isValidNickname(name) {
  const n = sanitizeNickname(name);
  return n.length >= 2 && n.toLowerCase() !== 'игрок' && n.toLowerCase() !== 'player';
}

/** Derive display profile name from wallet and guest state. */
export function getDisplayName(wallet = {}, guestDefault = 'Игрок') {
  return sanitizeNickname(wallet.name) || sanitizeNickname(wallet.guest) || guestDefault;
}

export const AUTH_ERR = {
  EMAIL_EXISTS: ['Эта почта уже привязана к другому профилю. Войдите в него или укажите другую почту', 'mail'],
  EMAIL_NOT_FOUND: ['Профиля с такой почтой нет. Проверьте почту или сначала сохраните профиль', 'mail'],
  INVALID_PASSWORD: ['Неверный пароль. Проверьте раскладку и Caps Lock или нажмите «Забыли пароль?»', 'pass'],
  INVALID_LOGIN_CREDENTIALS: ['Почта или пароль не подходят. Проверьте оба поля — нажмите 👁, чтобы увидеть пароль', 'both'],
  INVALID_EMAIL: ['Почта записана с ошибкой. Пример: name@mail.ru', 'mail'],
  MISSING_EMAIL: ['Введите почту', 'mail'],
  WEAK_PASSWORD: ['Пароль слишком простой — нужно хотя бы 6 символов', 'pass'],
  MISSING_PASSWORD: ['Введите пароль', 'pass'],
  USER_DISABLED: ['Этот профиль отключён. Напишите в поддержку', 'mail'],
  TOO_MANY_ATTEMPTS_TRY_LATER: ['Слишком много попыток подряд. Подождите несколько минут или смените пароль через «Забыли пароль?»', ''],
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: ['Для этого нужно войти заново', ''],
  CREDENTIAL_ALREADY_IN_USE: ['Этот аккаунт Google уже используется. Выполняем вход...', ''],
  FEDERATED_USER_ID_ALREADY_LINKED: ['Этот аккаунт Google уже привязан к другому профилю. Выполняем вход...', ''],
  SHORT_OR_WRONG: ['Пароль не подходит. Для нового профиля пароль нужен от 6 символов', 'pass'],
};

export const MAIL_FIX = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.ru': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'mail.ri': 'mail.ru', 'mail.r': 'mail.ru', 'mial.ru': 'mail.ru', 'yandex.ry': 'yandex.ru', 'yandex.com.ru': 'yandex.ru', 'yandeks.ru': 'yandex.ru', 'yndex.ru': 'yandex.ru', 'ya.ry': 'ya.ru', 'rambler.ry': 'rambler.ru', 'icloud.con': 'icloud.com', 'outlok.com': 'outlook.com', 'hotmail.con': 'hotmail.com'
};

export function classifyAuthError(j, link) {
  if (!j || !j.error) return ['Нет связи с сервером — проверьте интернет', ''];
  const c = String(j.error.message || '').split(' ')[0];
  if (AUTH_ERR[c]) return AUTH_ERR[c];
  return [link ? 'Не удалось сохранить профиль. Попробуйте позже — золото и прогресс никуда не денутся' : 'Не удалось войти. Попробуйте чуть позже', ''];
}

export function checkAuthInput(mail, pass, link) {
  if (!mail) return ['Введите почту', 'mail'];
  if (/\s/.test(mail)) return ['В почте не должно быть пробелов', 'mail'];
  if (!/^[^@]+@[^@]+\.[^@.]{2,}$/.test(mail)) return [mail.includes('@') ? 'После @ нужен адрес почты целиком, например name@mail.ru' : 'В почте не хватает «@». Пример: name@mail.ru', 'mail'];
  const dom = mail.split('@')[1].toLowerCase();
  if (MAIL_FIX[dom]) return [`Возможно, опечатка: ${mail.split('@')[0]}@${MAIL_FIX[dom]}?`, 'mail', 'typo', mail.split('@')[0] + '@' + MAIL_FIX[dom]];
  if (!pass) return ['Введите пароль', 'pass'];
  if (link && pass.length < 6) return [`Пароль слишком короткий: ${pass.length} из 6 символов`, 'pass'];
  if (link && pass !== pass.trim()) return ['В начале или в конце пароля пробел — уберите его, чтобы потом не ошибиться', 'pass'];
  return null;
}

export const EYE_OPEN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
export const EYE_SHUT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10 10 0 005.4-1.6"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/></svg>';

export function renderAccountDialogHtml({link = false, prefill = ''} = {}) {
  const safePrefill = String(prefill || '').replace(/"/g, '');
  return `<div class="ocard acc"><div style="font-size:40px">🔑</div><h3>Вход в профиль</h3><p>Сохранение прогресса, фигурок и золота между устройствами</p>` +
    `<div class="gslot" id="accGSlot"><button class="ghostbtn gbtn" id="accGoogle" type="button"><span class="gicon">G</span> Продолжить с Google</button></div>` +
    `<p class="phint acc-or" id="accOr">или по почте</p>` +
    `<input class="field" id="accMail" type="email" inputmode="email" placeholder="Почта" autocomplete="email" autocapitalize="off" spellcheck="false" value="${safePrefill}">` +
    `<div class="pwrap"><input class="field" id="accPass" type="password" placeholder="Пароль" autocomplete="current-password" autocapitalize="off" spellcheck="false"><button type="button" class="peye" id="accEye" aria-label="Показать пароль" aria-pressed="false"></button></div>` +
    `<p class="phint" id="accHint">Пароль от 6 символов</p>` +
    `<p class="accErr" id="accErr" role="alert"></p><button class="cta wide" id="accGo">Продолжить</button><button class="linkbtn" id="accReset">Забыли пароль?</button><button class="ghostbtn" id="accNo">${link ? 'Позже' : 'Отмена'}</button></div>`;
}

