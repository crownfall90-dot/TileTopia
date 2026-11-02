// Shop catalogue: figures (price in gold), locations with their artwork, the daily-chest picture.
// Names are stored in players' wallets (wallet.owned / wallet.fig): never rename a figure key.

export const FIGS = {
  classic: {name: 'Классика', price: 0},
  peasant: {name: 'Крестьянин', price: 150},
  monk: {name: 'Монах', price: 300},
  knight: {name: 'Рыцарь', price: 600},
  archer: {name: 'Лучник', price: 900},
  king: {name: 'Король', price: 1500},
  queen: {name: 'Королева', price: 2500},
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
  puzzle: {name: 'Пазл', price: 0, earn: 'Достигните 10 уровня', ring: 'conic-gradient(#4c8dff 0 25%,#3fc27a 0 50%,#b06cf0 0 75%,#f2994a 0)'},
  galaxy: {name: 'Галактика', price: 0, earn: 'Получите все достижения', ring: 'conic-gradient(from 200deg,#0b0f33,#5b3fd1,#c06cff,#2a1b7a,#0b0f33,#7ad7ff,#0b0f33)'},
};
/** Frames given for an achievement: {frame key: check(prog, achCount)}. */
export const EARNED_FRAMES = {
  puzzle: prog => prog && prog.lvl >= 10,
  galaxy: (prog, achCount) => achCount > 0 && Object.values((prog && prog.ach) || {}).filter(v => v === 'got').length >= achCount,
};

export const LOCS = [
  {id: 'village', name: 'Деревня', desc: 'Дороги, города, реки и крепости', open: true, art: '<rect width="160" height="90" fill="#7cb85a"/><path d="M0 60Q40 40 80 58T160 52V90H0z" fill="#5f9e40"/><path d="M0 70L160 64" stroke="#e2c690" stroke-width="7"/><path d="M110 0Q100 40 120 90" stroke="#3b88cf" stroke-width="9" fill="none"/><g fill="#c1452f"><path d="M28 40l10-10 10 10z"/><path d="M50 44l9-9 9 9z"/></g><g fill="#eadcbc"><rect x="30" y="40" width="16" height="10"/><rect x="52" y="44" width="14" height="9"/></g><path d="M130 30h12v24h-12z" fill="#b7ae9b"/><path d="M136 18l8 4-8 4z" fill="#e04a3a"/>'},
  {id: 'city', name: 'Мегаполис', desc: 'Проспекты, кварталы, метро и небоскрёбы', open: false, art: '<rect width="160" height="90" fill="#1d2550"/><circle cx="130" cy="18" r="8" fill="#f4e7b0"/><g fill="#2f3a72"><rect x="8" y="40" width="22" height="50"/><rect x="34" y="22" width="18" height="68"/><rect x="56" y="48" width="24" height="42"/><rect x="84" y="12" width="20" height="78"/><rect x="108" y="34" width="22" height="56"/><rect x="134" y="52" width="20" height="38"/></g><g fill="#ffd36b"><rect x="38" y="30" width="4" height="4"/><rect x="45" y="40" width="4" height="4"/><rect x="88" y="22" width="4" height="4"/><rect x="96" y="36" width="4" height="4"/><rect x="88" y="50" width="4" height="4"/><rect x="12" y="50" width="4" height="4"/><rect x="114" y="44" width="4" height="4"/><rect x="62" y="58" width="4" height="4"/></g>'},
  {id: 'siberia', name: 'Сибирь', desc: 'Зимники, остроги и замёрзшие реки', open: false, art: '<rect width="160" height="90" fill="#a9c7e8"/><path d="M0 60L40 22L70 52L100 18L160 64V90H0z" fill="#e8f1fb"/><path d="M40 22L52 34L44 34L36 30zM100 18L114 32L104 30z" fill="#fff"/><g fill="#2d5a46"><path d="M20 78l8-22 8 22z"/><path d="M120 80l9-26 9 26z"/><path d="M140 84l7-18 7 18z"/></g><path d="M0 82h160v8H0z" fill="#fff"/><g fill="#fff"><circle cx="70" cy="10" r="1.6"/><circle cx="20" cy="16" r="1.4"/><circle cx="140" cy="10" r="1.6"/><circle cx="90" cy="40" r="1.2"/></g>'},
  {id: 'jungle', name: 'Джунгли', desc: 'Тропы, руины, реки и пирамиды', open: false, art: '<rect width="160" height="90" fill="#1f5a3a"/><path d="M60 90L80 40L100 90z" fill="#8f8a6a"/><path d="M66 74h28M70 64h20M74 54h12" stroke="#6d684e" stroke-width="3"/><g fill="#2e8a4e"><ellipse cx="18" cy="30" rx="30" ry="12" transform="rotate(-25 18 30)"/><ellipse cx="146" cy="24" rx="32" ry="12" transform="rotate(25 146 24)"/><ellipse cx="20" cy="80" rx="30" ry="10" transform="rotate(20 20 80)"/><ellipse cx="140" cy="78" rx="30" ry="10" transform="rotate(-20 140 78)"/></g><path d="M0 0Q30 40 10 90" stroke="#3a9e5a" stroke-width="3" fill="none"/>'},
];

export const CHEST_SVG = '<svg viewBox="0 0 64 56" width="72" height="63" aria-hidden="true"><rect x="6" y="22" width="52" height="30" rx="4" fill="#9a5b2c"/><rect x="6" y="22" width="52" height="7" fill="#7b4521"/><path d="M6 22 Q32 0 58 22 Z" fill="#b36a32"/><rect x="28" y="14" width="8" height="38" fill="#f2b84b"/><rect x="26" y="26" width="12" height="10" rx="2" fill="#ffd36b" stroke="#8a5a12" stroke-width="1.5"/><rect x="6" y="38" width="52" height="3" fill="#f2b84b"/></svg>';

/** Collections (R-9): themed sets of figurines and frames with completion rewards. */
export const COLLECTIONS = [
  {
    id: 'court',
    name: 'Королевский двор',
    desc: 'Рыцарь, король, королева и рамка «Королевская»',
    ic: '👑',
    figs: ['knight', 'king', 'queen'],
    frames: ['royal'],
    reward: 300
  },
  {
    id: 'folk',
    name: 'Жители королевства',
    desc: 'Крестьянин, монах, лучник и рамка «Лес»',
    ic: '🏹',
    figs: ['peasant', 'monk', 'archer'],
    frames: ['forest'],
    reward: 200
  },
  {
    id: 'elements',
    name: 'Силы стихий',
    desc: 'Четыре стихии: рамки «Золото», «Лес», «Море» и «Пламя»',
    ic: '✨',
    figs: [],
    frames: ['gold', 'forest', 'sea', 'fire'],
    reward: 250
  }
];

/** Check completion of a collection against wallet {owned: [...], frames: [...], colClaimed: [...]}. */
export function collectionProgress(col, wallet) {
  const ownedFigs = wallet && Array.isArray(wallet.owned) ? wallet.owned : ['classic'];
  const ownedFrames = wallet && Array.isArray(wallet.frames) ? wallet.frames : [];
  const claimed = wallet && Array.isArray(wallet.colClaimed) ? wallet.colClaimed : [];

  const figTotal = col.figs.length;
  const frameTotal = col.frames.length;
  const total = figTotal + frameTotal;

  const figsDone = col.figs.filter(k => ownedFigs.includes(k));
  const framesDone = col.frames.filter(k => ownedFrames.includes(k) || k === 'none');
  const done = figsDone.length + framesDone.length;

  return {
    id: col.id,
    name: col.name,
    desc: col.desc,
    ic: col.ic,
    reward: col.reward,
    total,
    done,
    isComplete: done >= total,
    isClaimed: claimed.includes(col.id),
    figsDone: new Set(figsDone),
    framesDone: new Set(framesDone),
  };
}
