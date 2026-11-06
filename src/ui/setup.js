// src/ui/setup.js
// Setup screen helpers: mode cards, custom rule rows, and seats list HTML.

export const SETUP_ICONS = {
  fast: '⚡',
  classic: '⚖️',
  epic: '🏰'
};

export function renderModeCardsHtml(modes, selectedMode, locked = false) {
  if (!modes) return '';
  return `<div class="modecards">${Object.entries(modes).map(([k, m]) => {
    const isPressed = selectedMode === k;
    const icon = SETUP_ICONS[k] || '🎮';
    const desc = m.desc ? m.desc.split(' · ').slice(0, 2).join(' · ') : '';
    const disabledAttr = locked ? ' disabled' : '';
    return `<button class="mcard" data-setmode="${k}" aria-pressed="${isPressed}"${disabledAttr}><i>${icon}</i><b>${m.label}</b><small>${desc}</small></button>`;
  }).join('')}</div>`;
}

export function renderRuleRowsHtml(rules, currentRules = {}, {isOnline = false, isRoom = false} = {}) {
  if (!Array.isArray(rules)) return '';
  return rules
    .filter(r => r.k !== 'mode' && (!r.room || isRoom))
    .map(r => {
      const optsHtml = r.opts.map(([v, l], i) => {
        if (isOnline && r.k === 'timer' && !v) return '';
        const isPressed = currentRules[r.k] === v || (isOnline && r.k === 'timer' && v === 60 && !currentRules.timer);
        return `<button data-i="${i}" aria-pressed="${isPressed}">${l}</button>`;
      }).join('');
      return `<div class="opt"><span>${r.label}</span><span class="mseg" data-k="${r.k}">${optsHtml}</span></div>`;
    }).join('');
}

export const SETUP_MODES = {
  bots: {title: 'Игра с ботами', go: 'Начать партию', hint: 'Одиночная игра против ботов.'},
  local: {title: 'На одном телефоне', go: 'Начать партию', hint: 'Передавайте устройство перед каждым ходом.'},
  online: {title: 'Игра онлайн', go: 'Начать игру', hint: '', seg: 'Игроков в матче'},
  friends: {title: 'Комната для друзей', go: 'Создать комнату', hint: '', seg: 'Вместимость комнаты'},
};

export function getSetupHeroMeta(mode) {
  const hm = {
    bots: ['#3fc27a', '🤖', 'Против компьютера', 'Тренировка: боты ходят сами'],
    local: ['#b06cf0', '📱', 'На одном телефоне', 'Передавайте телефон по очереди'],
    online: ['gold', '🌐', 'Рейтинг и кубки', 'Соперники со всего мира'],
    friends: ['#4c8dff', '👥', 'Игра с друзьями', 'Код комнаты — друзьям']
  };
  return hm[mode] || ['#4c8dff', '🧩', '', ''];
}

export function formatProfileName(seats, wallet, cleanFn = s => (s || '').trim()) {
  const old = cleanFn(seats && seats[0] && seats[0].name);
  return cleanFn(wallet && wallet.name) || cleanFn(wallet && wallet.guest) || (old && old !== 'Вы' && old !== 'Игрок' ? old : '') || 'nickname';
}

export function adjustSeatsForMode(seats, mode, defaultBots = []) {
  if (!Array.isArray(seats) || (mode !== 'bots' && mode !== 'local')) return;
  seats.forEach((x, i) => {
    x.human = mode === 'local' || i === 0;
    const botName = defaultBots[i] ? defaultBots[i].name : 'Бот ' + (i + 1);
    if (mode === 'local' && i && x.name === botName) x.name = 'Игрок ' + (i + 1);
    if (mode === 'bots' && i && x.name === 'Игрок ' + (i + 1)) x.name = botName;
  });
}

export function renderSwatchesHtml(cur, taken = [], palette = []) {
  if (!Array.isArray(palette)) return '';
  return `<span class="swatches">${palette.map(c => `<button class="sw${c.col === cur ? ' on' : ''}" style="--c:${c.col}" data-sw="${c.col}" ${taken.includes(c.col) ? 'disabled' : ''} aria-label="${c.name}"></button>`).join('')}</span>`;
}

export function renderSetupMeHtml(pName, walletColor, palette = []) {
  const initial = (pName || '?')[0] || '?';
  const swHtml = renderSwatchesHtml(walletColor, [], palette);
  const infoHtml = `<span class="av" style="--c:${walletColor}">${initial}</span><b>${pName}</b><small>изменить — в настройках</small>`;
  return {infoHtml, swHtml};
}

export function renderSetupSeatsHtml(seats, count, {profileName = 'nickname', colorEdit = -1, palette = []} = {}) {
  if (!Array.isArray(seats)) return '';
  const slice = seats.slice(0, count);
  return slice.map((s, i) => {
    const rawName = i ? s.name : profileName;
    const nameVal = (rawName || '').replace(/"/g, '&quot;');
    const taken = slice.filter((_, j) => j !== i).map(x => x.col);
    const sw = colorEdit === i ? renderSwatchesHtml(s.col, taken, palette) : '';
    const bot = s.human ? '' : '<span class="botmark" title="Бот">🤖 бот</span>';
    return `<li class="seat"><button class="av colbtn" style="--c:${s.col}" data-col="${i}" aria-label="Цвет игрока ${i + 1}">${i + 1}</button><span class="who"><input id="pn${i}" value="${nameVal}" maxlength="12" aria-label="Имя игрока ${i + 1}"${i ? '' : ' readonly'}></span>${bot}${sw}</li>`;
  }).join('');
}
