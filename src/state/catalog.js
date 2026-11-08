// Shop catalogue: figures (price in gold), locations with their artwork, the daily-chest picture.
// Names are stored in players' wallets (wallet.owned / wallet.fig): never rename a figure key.

export const FIGS = {
  classic: {name: 'Классика', price: 0, ic: '🧩'},
  peasant: {name: 'Крестьянин', price: 150, ic: '🌾'},
  monk: {name: 'Монах', price: 300, ic: '🙏'},
  knight: {name: 'Рыцарь', price: 600, ic: '⚔️'},
  archer: {name: 'Лучник', price: 900, ic: '🏹'},
  wizard: {name: 'Архимаг', price: 1200, ic: '🧙'},
  ninja: {name: 'Теневой ниндзя', price: 1600, ic: '🥷'},
  paladin: {name: 'Паладин света', price: 2100, ic: '🛡️'},
  king: {name: 'Король', price: 1500, ic: '👑'},
  queen: {name: 'Королева', price: 2500, ic: '👸'},
};

/** Avatar frames: a ring round the player's own avatar (menu plate, profile, own plate in a game). Looks only. */
export const FRAMES = {
  none: {name: 'Без рамки', price: 0, ring: ''},
  gold: {name: 'Золото', price: 200, ring: 'linear-gradient(135deg,#fff1b8,#f2b84b 45%,#a8701a)'},
  forest: {name: 'Лес', price: 350, ring: 'linear-gradient(135deg,#b7f08a,#3fae4f 50%,#1f5e2c)'},
  sea: {name: 'Море', price: 350, ring: 'linear-gradient(135deg,#bfefff,#3fa9e8 50%,#1b4f9c)'},
  ice: {name: 'Лёд', price: 450, ring: 'conic-gradient(from 45deg,#ffffff,#b8e6ff,#7cc4f0,#e8f8ff,#9fd8ff,#ffffff)'},
  sakura: {name: 'Сакура', price: 500, ring: 'linear-gradient(135deg,#ffe3ee,#ff9ec0 50%,#d65a8c)'},
  emerald: {name: 'Изумруд', price: 600, ring: 'conic-gradient(#d6ffe9,#34d399,#0f7a52,#34d399,#d6ffe9)'},
  royal: {name: 'Королевская', price: 700, ring: 'conic-gradient(#f7c948,#b06cf0,#f7c948,#b06cf0,#f7c948)'},
  sunset: {name: 'Закат', price: 800, ring: 'linear-gradient(160deg,#ffd36e,#ff8a5b 45%,#c0398f 75%,#4c3a9b)'},
  neon: {name: 'Неон', price: 900, ring: 'conic-gradient(#00f5ff,#ff2bd6,#7a5cff,#00f5ff)'},
  fire: {name: 'Пламя', price: 1000, ring: 'conic-gradient(from 20deg,#ffe08a,#ff8c42,#ef5350,#ff8c42,#ffe08a)'},
  lava: {name: 'Лава', price: 1300, ring: 'conic-gradient(from 90deg,#2b0a05,#ff4d1a,#ffb347,#ff4d1a,#2b0a05,#a81d0a,#2b0a05)'},
  rainbow: {name: 'Радуга', price: 1600, ring: 'conic-gradient(#ff5d5d,#ffb84d,#fff35c,#5ee07a,#4dc3ff,#8a6bff,#ff5dc8,#ff5d5d)'},
  carbon: {name: 'Карбон', price: 1800, ring: 'conic-gradient(#0d0f14,#4b5568,#0d0f14,#4b5568,#0d0f14)'},
  // Earned only (not sold): `earn` is the condition shown to the player.
  puzzle: {name: 'Плитка', price: 0, earn: 'Достигните 10 уровня', ring: 'conic-gradient(#4c8dff 0 25%,#3fc27a 0 50%,#b06cf0 0 75%,#f2994a 0)'},
  galaxy: {name: 'Галактика', price: 0, earn: 'Получите все достижения', ring: 'conic-gradient(from 200deg,#0b0f33,#5b3fd1,#c06cff,#2a1b7a,#0b0f33,#7ad7ff,#0b0f33)'},
  // Эксклюзивные переливающиеся голографические рамки:
  holo: {name: 'Голография', price: 1200, ring: 'conic-gradient(from 0deg, #ff007f, #7f00ff, #00ffff, #00ff7f, #ffff00, #ff7f00, #ff007f)', anim: 'holo'},
  prismatic: {name: 'Призма', price: 1500, ring: 'conic-gradient(from 45deg, #e0c3fc, #8ec5fc, #fbc2eb, #a1c4fd, #c2e9fb, #e0c3fc)', anim: 'prismatic'},
  aurora: {name: 'Северное сияние', price: 1800, ring: 'conic-gradient(from 180deg, #00f2fe, #4facfe, #00ff87, #60efe6, #00f2fe)', anim: 'aurora'},
  // rare frames: dear ones are paid in stars (src/state/coins.js)
  obsidian: {name: 'Обсидиан', price: 1400, ring: 'conic-gradient(from 30deg,#0b0b12,#3d2b5a,#0b0b12,#5a3b7a,#0b0b12)'},
  starlight: {name: 'Звёздный свет', price: 2000, ring: 'conic-gradient(from 0deg,#fff8d6,#ffd66b,#ffffff,#9fd8ff,#fff8d6,#ffd66b,#fff8d6)', anim: 'prismatic'},
  phoenix: {name: 'Феникс', price: 3000, ring: 'conic-gradient(from 90deg,#ffef9a,#ff9c2a,#e8311f,#7a0d3a,#e8311f,#ff9c2a,#ffef9a)', anim: 'holo'},
  cyber: {name: 'Киберпанк', price: 2100, ring: 'conic-gradient(from 90deg, #ff0055, #00ffff, #ffea00, #00e5ff, #ff0055)', anim: 'cyber'},
  cosmic: {name: 'Космос', price: 2400, ring: 'conic-gradient(from 45deg, #ff00cc, #333399, #00ffff, #ff0066, #ff00cc)', anim: 'cosmic'},
};
/** Frames given for an achievement: {frame key: check(prog, achCount)}. */
export const EARNED_FRAMES = {
  puzzle: prog => prog && prog.lvl >= 10,
  galaxy: (prog, achCount) => achCount > 0 && Object.values((prog && prog.ach) || {}).filter(v => v === 'got').length >= achCount,
};

export const LOCS = [
  {id: 'village', name: 'Деревня', desc: 'Дороги, города, реки и монастыри', open: true, art: '<rect width="160" height="90" fill="#7cb85a"/><path d="M0 60Q40 40 80 58T160 52V90H0z" fill="#5f9e40"/><path d="M0 70L160 64" stroke="#e2c690" stroke-width="7"/><path d="M110 0Q100 40 120 90" stroke="#3b88cf" stroke-width="9" fill="none"/><g fill="#c1452f"><path d="M28 40l10-10 10 10z"/><path d="M50 44l9-9 9 9z"/></g><g fill="#eadcbc"><rect x="30" y="40" width="16" height="10"/><rect x="52" y="44" width="14" height="9"/></g><path d="M130 30h12v24h-12z" fill="#b7ae9b"/><path d="M136 18l8 4-8 4z" fill="#e04a3a"/>'},
  {id: 'city', name: 'Мегаполис', desc: 'Проспекты, кварталы, метро и небоскрёбы', open: false, art: '<rect width="160" height="90" fill="#1d2550"/><circle cx="130" cy="18" r="8" fill="#f4e7b0"/><g fill="#2f3a72"><rect x="8" y="40" width="22" height="50"/><rect x="34" y="22" width="18" height="68"/><rect x="56" y="48" width="24" height="42"/><rect x="84" y="12" width="20" height="78"/><rect x="108" y="34" width="22" height="56"/><rect x="134" y="52" width="20" height="38"/></g><g fill="#ffd36b"><rect x="38" y="30" width="4" height="4"/><rect x="45" y="40" width="4" height="4"/><rect x="88" y="22" width="4" height="4"/><rect x="96" y="36" width="4" height="4"/><rect x="88" y="50" width="4" height="4"/><rect x="12" y="50" width="4" height="4"/><rect x="114" y="44" width="4" height="4"/><rect x="62" y="58" width="4" height="4"/></g>'},
  {id: 'siberia', name: 'Сибирь', desc: 'Зимники, остроги и замёрзшие реки', open: false, art: '<rect width="160" height="90" fill="#a9c7e8"/><path d="M0 60L40 22L70 52L100 18L160 64V90H0z" fill="#e8f1fb"/><path d="M40 22L52 34L44 34L36 30zM100 18L114 32L104 30z" fill="#fff"/><g fill="#2d5a46"><path d="M20 78l8-22 8 22z"/><path d="M120 80l9-26 9 26z"/><path d="M140 84l7-18 7 18z"/></g><path d="M0 82h160v8H0z" fill="#fff"/><g fill="#fff"><circle cx="70" cy="10" r="1.6"/><circle cx="20" cy="16" r="1.4"/><circle cx="140" cy="10" r="1.6"/><circle cx="90" cy="40" r="1.2"/></g>'},
  {id: 'jungle', name: 'Джунгли', desc: 'Тропы, руины, реки и пирамиды', open: false, art: '<rect width="160" height="90" fill="#1f5a3a"/><path d="M60 90L80 40L100 90z" fill="#8f8a6a"/><path d="M66 74h28M70 64h20M74 54h12" stroke="#6d684e" stroke-width="3"/><g fill="#2e8a4e"><ellipse cx="18" cy="30" rx="30" ry="12" transform="rotate(-25 18 30)"/><ellipse cx="146" cy="24" rx="32" ry="12" transform="rotate(25 146 24)"/><ellipse cx="20" cy="80" rx="30" ry="10" transform="rotate(20 20 80)"/><ellipse cx="140" cy="78" rx="30" ry="10" transform="rotate(-20 140 78)"/></g><path d="M0 0Q30 40 10 90" stroke="#3a9e5a" stroke-width="3" fill="none"/>'},
];

export const CHEST_SVG = '<svg viewBox="0 0 64 56" width="76" height="66" aria-hidden="true" class="chest-svg-3d"><defs><linearGradient id="chw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b86928"/><stop offset="50%" stop-color="#8d4a19"/><stop offset="100%" stop-color="#5a2d0c"/></linearGradient><linearGradient id="chg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff8d6"/><stop offset="40%" stop-color="#f5ba42"/><stop offset="100%" stop-color="#9e5d0d"/></linearGradient><filter id="chglo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs><rect x="5" y="21" width="54" height="32" rx="5" fill="url(#chw)" stroke="#3e1d06" stroke-width="1.5"/><path d="M5 22 Q32 -2 59 22 Z" fill="url(#chw)" stroke="#3e1d06" stroke-width="1.5"/><rect x="5" y="21" width="54" height="5" fill="#4d2407" opacity=".4"/><rect x="11" y="7" width="7" height="46" fill="url(#chg)" rx="1.5"/><rect x="46" y="7" width="7" height="46" fill="url(#chg)" rx="1.5"/><rect x="5" y="38" width="54" height="4" fill="url(#chg)"/><circle cx="14.5" cy="27" r="1.2" fill="#543105"/><circle cx="14.5" cy="44" r="1.2" fill="#543105"/><circle cx="49.5" cy="27" r="1.2" fill="#543105"/><circle cx="49.5" cy="44" r="1.2" fill="#543105"/><g filter="url(#chglo)"><rect x="25" y="23" width="14" height="15" rx="3" fill="url(#chg)" stroke="#683d06" stroke-width="1.2"/><circle cx="32" cy="29" r="2.2" fill="#301602"/><rect x="31.2" y="29" width="1.6" height="4.5" fill="#301602"/></g></svg>';

export const CHEST_OPEN_SVG = '<svg viewBox="0 0 64 56" width="76" height="66" aria-hidden="true" class="chest-svg-3d open"><defs><radialGradient id="chgld" cx="50%" cy="30%" r="65%"><stop offset="0%" stop-color="#ffffff"/><stop offset="35%" stop-color="#ffe485"/><stop offset="70%" stop-color="#f5ba42" stop-opacity=".7"/><stop offset="100%" stop-color="#d48a1c" stop-opacity="0"/></radialGradient><linearGradient id="chw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b86928"/><stop offset="50%" stop-color="#8d4a19"/><stop offset="100%" stop-color="#5a2d0c"/></linearGradient><linearGradient id="chg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff8d6"/><stop offset="40%" stop-color="#f5ba42"/><stop offset="100%" stop-color="#9e5d0d"/></linearGradient></defs><circle cx="32" cy="16" r="26" fill="url(#chgld)"/><g opacity=".9"><path d="M32 0 L34 16 L32 18 L30 16 Z" fill="#fff" opacity=".8"/><path d="M16 8 L28 18 L26 20 L14 10 Z" fill="#ffd56b" opacity=".7"/><path d="M48 8 L36 18 L38 20 L50 10 Z" fill="#ffd56b" opacity=".7"/></g><path d="M5 13 Q32 -8 59 13 Q32 2 5 13 Z" fill="url(#chw)" stroke="#3e1d06" stroke-width="1.5"/><rect x="11" y="2" width="7" height="13" fill="url(#chg)" rx="1"/><rect x="46" y="2" width="7" height="13" fill="url(#chg)" rx="1"/><rect x="5" y="21" width="54" height="32" rx="5" fill="url(#chw)" stroke="#3e1d06" stroke-width="1.5"/><ellipse cx="32" cy="22" rx="23" ry="5.5" fill="#f5c04e"/><ellipse cx="32" cy="22" rx="16" ry="3.2" fill="#fffef0" opacity=".9"/><rect x="11" y="21" width="7" height="32" fill="url(#chg)" rx="1.5"/><rect x="46" y="21" width="7" height="32" fill="url(#chg)" rx="1.5"/><rect x="5" y="38" width="54" height="4" fill="url(#chg)"/><rect x="25.5" y="24" width="13" height="13" rx="3" fill="url(#chg)" stroke="#683d06" stroke-width="1.2"/><circle cx="32" cy="29.5" r="2" fill="#301602"/></svg>';

