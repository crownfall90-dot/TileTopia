// Shop UI and interactions (E-1.4)
// Renders the shop screens: daily gifts, figures, avatar frames, and game locations.

/** Generates HTML markup for the daily gift chest card. */
export function renderGiftCard({giftReady, chestSvg, boosts = {}, nextGiftTimeStr = ''}) {
  const inv = [
    boosts.double ? `Двойное золото ×${boosts.double}` : '',
    boosts.meeple ? `+1 фигурка ×${boosts.meeple}` : '',
  ].filter(Boolean).join(' · ');

  const statusLabel = giftReady
    ? '<span class="gstatus-ready">Готов к открытию ✨</span>'
    : `<span class="gstatus-wait">⏱ ${nextGiftTimeStr || 'Завтра'}</span>`;

  return `<div class="chest${giftReady ? ' ready' : ''}">${chestSvg}</div>` +
    `<div class="gi"><b>Ежедневный подарок</b>${statusLabel}<small>${giftReady ? 'Выберите 1 из 3 сундуков удачи!' : 'Следующий подарок — завтра'}` +
    `${inv ? '<br>У вас: ' + inv : ''}</small></div>` +
    `${giftReady ? '<button class="cta" id="openGift">Открыть</button>' : '<button class="ghostbtn sm" id="openGiftCalendar" title="Календарь наград">Календарь</button>'}`;
}

/** Generates HTML markup for the 3 Chests of Luck directly in the showcase. */
export function renderGiftTrioShowcase({
  giftReady = true,
  day = 0,
  streakDays = [15, 25, 'x2', 40, '+1♟', 60, '150👑'],
  options = [],
  chosenIdx = null,
  nextGiftTimeStr = '',
  chestSvg = '',
  chestOpenedSvg = '',
  boosts = {}
} = {}) {
  const inv = [
    boosts.double ? `Двойное золото ×${boosts.double}` : '',
    boosts.meeple ? `+1 фигурка ×${boosts.meeple}` : '',
  ].filter(Boolean).join(' · ');

  const chestsHtml = [0, 1, 2].map(idx => {
    const opt = options && options[idx];
    if (giftReady || chosenIdx === null) {
      return `
        <button class="gift-chest-btn idle" data-gidx="${idx}" aria-label="Сундук ${idx + 1}">
          <div class="gift-chest-art">${chestSvg}</div>
          <span class="gift-chest-name">Сундук ${idx + 1}</span>
          <span class="gift-chest-hint choose-hint">Выбрать 👆</span>
        </button>`;
    }

    const isChosen = idx === chosenIdx;
    if (isChosen) {
      return `
        <div class="gift-chest-btn opened chosen" data-gidx="${idx}">
          <div class="gift-prize-reveal">${opt ? opt.title : 'Ваш приз!'}</div>
          <div class="gift-chest-art">${chestOpenedSvg || chestSvg}</div>
          <span class="gift-chest-name">Сундук ${idx + 1}</span>
          <span class="gift-chest-hint chosen-hint">Ваш выбор 🏆</span>
        </div>`;
    }

    return `
      <div class="gift-chest-btn ghost" data-gidx="${idx}">
        <div class="gift-chest-art">${chestOpenedSvg || chestSvg}</div>
        <span class="gift-chest-name">Сундук ${idx + 1}</span>
        <span class="gift-chest-ghost-note">А здесь было:<br><b>${opt ? opt.title : '...'}</b></span>
      </div>`;
  }).join('');

  const calTrack = renderGiftCalendarHtml({
    streakDays,
    currentDay: day,
    isClaimedToday: !giftReady
  });

  const subText = giftReady
    ? 'Выберите один из трёх сундуков, чтобы забрать подарок дня!'
    : `Подарок на сегодня получен ✓ Следующий сундук через: <b id="giftCountdown" class="countdown-gold">${nextGiftTimeStr || 'завтра'}</b>`;

  return `
    <div class="gift-showcase-card">
      <div class="gift-showcase-header">
        <div class="gift-badge-pill">✨ ЕЖЕДНЕВНЫЙ ПОДАРОК ✨</div>
        <h3>Три сундука удачи</h3>
        <p class="gift-showcase-sub">${subText}</p>
      </div>
      <div class="gift-trio" id="giftTrio">
        ${chestsHtml}
      </div>
      <div class="gift-showcase-footer">
        <div class="gift-streak-header">
          <span>Серия посещений: <b>День ${day + 1} из 7</b></span>
          ${inv ? `<small class="gift-inv-badge">${inv}</small>` : ''}
        </div>
        ${calTrack}
      </div>
    </div>`;
}

/** Generates HTML for the 7-day reward calendar track. */
export function renderGiftCalendarHtml({streakDays = [15, 25, 'x2', 40, '+1♟', 60, '150👑'], currentDay = 0, isClaimedToday = false}) {
  const cells = streakDays.map((reward, i) => {
    const isDone = i < currentDay || (i === currentDay && isClaimedToday);
    const isCurrent = i === currentDay && !isClaimedToday;
    const isSpecial = i === 6;
    let label = '';
    if (typeof reward === 'number') {
      label = `<i class="coin"></i>${reward}`;
    } else if (reward === 'x2') {
      label = '⚡ ×2';
    } else if (reward === '+1♟') {
      label = '♟️ +1';
    } else {
      label = `${reward}`;
    }
    return `<div class="gcal-day${isDone ? ' done' : ''}${isCurrent ? ' now' : ''}${isSpecial ? ' mega' : ''}">` +
      `<span class="gcal-num">День ${i + 1}</span>` +
      `<span class="gcal-rew">${isDone ? '✓' : label}</span>` +
      `</div>`;
  }).join('');
  return `<div class="gcal-track">${cells}</div>`;
}

/** Generates HTML markup for figure buttons grid. */
export function renderFiguresGrid({figs, wallet, figPreview}) {
  return Object.entries(figs).map(([k, f]) => {
    const own = (wallet.owned || []).includes(k);
    const sel = wallet.fig === k;
    const tag = sel ? 'Выбрана' : own ? 'Выбрать' : `<i class="coin"></i>${f.price}`;
    return `<button class="fig${sel ? ' sel' : ''}${!own && (wallet.gold || 0) < f.price ? ' poor' : ''}" data-fig="${k}">` +
      `<img src="${figPreview(k)}" alt=""><span>${f.name}</span><small>${tag}</small></button>`;
  }).join('');
}

/** Generates HTML markup for avatar frames grid. */
export function renderFramesGrid({frames, wallet, initial}) {
  const fname = (initial || '?').toUpperCase();
  return Object.entries(frames).map(([k, f]) => {
    const own = (!f.price && !f.earn) || (wallet.frames || []).includes(k);
    const sel = (wallet.frame || 'none') === k;
    return `<button class="frb${sel ? ' sel' : ''}${!own && (f.earn || (wallet.gold || 0) < f.price) ? ' poor' : ''}" data-fr="${k}">` +
      `<span class="av${f.ring ? ' fr' : ''}" style="--c:${wallet.color};${f.ring ? `--fr:${f.ring}` : ''}">${fname}</span>` +
      `<span>${f.name}</span><small>${sel ? 'Выбрана' : own ? 'Выбрать' : f.earn ? '🔒 ' + f.earn : `<i class="coin"></i>${f.price}`}</small></button>`;
  }).join('');
}

/** Generates HTML markup for game locations grid. */
export function renderLocationsGrid(locs) {
  return locs.map(l => `<div class="loc${l.open ? '' : ' locked'}">` +
    `<svg viewBox="0 0 160 90" aria-hidden="true">${l.art}</svg>` +
    `<span class="badge">${l.open ? 'Открыта' : 'Скоро'}</span>` +
    `<div class="li"><b>${l.name}</b><small>${l.desc}</small></div></div>`
  ).join('');
}

/** Generates HTML markup for status buttons grid in status shop. */
export function renderStatusShopHtml({shopStatuses, ownedStatuses = [], wornKey = '', gold = 0, stBadgeFn}) {
  const badge = stBadgeFn || (t => `<span class="stchip">${t}</span>`);
  return (shopStatuses || []).map(x => {
    const k = 'sh:' + x.id;
    const has = ownedStatuses.includes(k);
    const poor = !has && gold < x.price;
    return `<button class="stb${wornKey === k ? ' sel' : ''}${poor ? ' poor' : ''}" data-stb="${x.id}">${badge(x.text)}<small>${wornKey === k ? 'Надет' : has ? 'Надеть' : `<i class="coin"></i>${x.price}`}</small></button>`;
  }).join('');
}

/** Generates HTML markup for statuses tab in "My items". */
export function renderItemsStatusesHtml({shopStatuses = [], exclusiveStatuses = [], ownedStatuses = [], wornKey = '', statusTextFn, stBadgeFn}) {
  const badge = stBadgeFn || ((t, cls = '') => `<span class="stchip${cls}">${t}</span>`);
  const textFn = statusTextFn || (k => k);
  const counted = shopStatuses.length + exclusiveStatuses.filter(x => !x.soon).length;
  const have = ownedStatuses.filter(k => !k.startsWith('cu:')).length;
  const mine = ownedStatuses.map(k => ({k, t: textFn(k), ex: k.startsWith('ex:'), cu: k.startsWith('cu:')}));
  const lockedEx = exclusiveStatuses.filter(x => !ownedStatuses.includes('ex:' + x.id));

  return `<div class="icount">Собрано <b>${have}</b> из ${counted}${ownedStatuses.length > have ? ` · своих: ${ownedStatuses.length - have}` : ''}</div>`
    + `<div class="itnow">Сейчас: ${wornKey && textFn(wornKey) ? badge(textFn(wornKey)) + '<button class="chip x" data-unwear>Снять</button>' : '<small>статус не надет</small>'}</div>`
    + (mine.length ? `<div class="h3 sec">Мои статусы</div><div class="stgrid">${mine.map(m => `<button class="stb${wornKey === m.k ? ' sel' : ''}${m.ex ? ' ex' : ''}" data-iwear="${m.k}">${badge(m.t, m.ex ? ' ex' : '')}<small>${wornKey === m.k ? 'Надет' : m.ex ? 'Эксклюзив · надеть' : m.cu ? 'Свой · надеть' : 'Надеть'}</small></button>`).join('')}</div>` : '<p class="shint">Пока нет статусов. Купите в магазине или получите за достижения.</p>')
    + (lockedEx.length ? `<div class="h3 sec">Эксклюзивные</div><div class="exlist">${lockedEx.map(x => `<div class="exrow${x.soon ? ' soon' : ''}"><span class="exic">${x.ic}</span><span><b>${x.text}</b><small>${x.how}</small></span><i>🔒</i></div>`).join('')}</div>` : '')
    + '<button class="ghostbtn wide" data-ishop>Купить статусы в магазине</button>';
}

/** Generates HTML markup for frames tab in "My items". */
export function renderItemsFramesHtml({frames = {}, ownedFrames = [], wornFrame = 'none', previewFrame = null, color = '#ef5350', profileInitial = '?'}) {
  const ownFr = Object.keys(frames).filter(k => k === 'none' || ownedFrames.includes(k) || (!frames[k].price && !frames[k].earn));
  const total = Object.keys(frames).length - 1;
  const have = ownFr.filter(k => k !== 'none').length;
  const lock = Object.entries(frames).filter(([k]) => !ownFr.includes(k));
  const initial = (profileInitial || '?').toUpperCase();
  const effectiveWorn = previewFrame || wornFrame || 'none';

  return `<div class="icount">Собрано <b>${have}</b> из ${total}</div><div class="frgrid">${ownFr.map(k => {
    const f = frames[k];
    const sel = effectiveWorn === k;
    const isPre = previewFrame === k && wornFrame !== k;
    return `<button class="frb${sel ? ' sel' : ''}" data-ifr="${k}"><span class="av${f.ring ? ' fr' : ''}" style="--c:${color};${f.ring ? `--fr:${f.ring}` : ''}">${initial}</span><span>${f.name}</span><small>${isPre ? 'Примерка' : sel ? 'Надета' : 'Надеть'}</small></button>`;
  }).join('')}</div>`
    + (lock.length ? `<div class="h3 sec">Ещё не открыты (нажмите для примерки)</div><div class="frgrid">${lock.map(([k, f]) => {
      const isPre = previewFrame === k;
      return `<button class="frb lockd${isPre ? ' sel' : ''}" data-pfr="${k}" title="Нажмите для примерки"><span class="av fr" style="--c:${color};--fr:${f.ring}">${initial}</span><span>${f.name}</span><small>${isPre ? 'Примерка' : (f.earn ? '🔒 ' + f.earn : `<i class="coin"></i>${f.price}`)}</small></button>`;
    }).join('')}</div>` : '')
    + '<button class="ghostbtn wide" data-ishop>В магазин</button>';
}

/** Generates HTML markup for figures tab in "My items". */
export function renderItemsFigsHtml({figs = {}, ownedFigs = [], selectedFig = 'classic', figPreviewFn = () => ''}) {
  const ownF = Object.keys(figs).filter(k => ownedFigs.includes(k));
  const lock = Object.keys(figs).filter(k => !ownedFigs.includes(k));

  return `<div class="icount">Собрано <b>${ownF.length}</b> из ${Object.keys(figs).length}</div><div class="figgrid">${ownF.map(k => `<button class="fig${selectedFig === k ? ' sel' : ''}" data-ifig="${k}"><img src="${figPreviewFn(k)}" alt=""><b>${figs[k].name}</b><small>${selectedFig === k ? 'Выбрана' : 'Выбрать'}</small></button>`).join('')}</div>`
    + (lock.length ? `<div class="h3 sec">Ещё не куплены</div><div class="figgrid">${lock.map(k => `<div class="fig poor lockd"><img src="${figPreviewFn(k)}" alt="" style="filter:grayscale(1) brightness(.6)"><b>${figs[k].name}</b><small><i class="coin"></i>${figs[k].price}</small></div>`).join('')}</div>` : '')
    + '<button class="ghostbtn wide" data-ishop>В магазин</button>';
}

/** Generates HTML markup for locations tab in "My items". */
export function renderItemsLocsHtml(locs = []) {
  const openCount = locs.filter(l => l.open).length;
  return `<div class="icount">Открыто <b>${openCount}</b> из ${locs.length}</div>
    <p class="shint" style="margin:-2px 0 10px">Локации меняют оформление игрового поля, архитектуру городов и атмосферу игры.</p>
    <div class="locgrid">${locs.map(l => `
      <div class="loccard${l.open ? ' active' : ' locked'}">
        <div class="locart">
          <svg viewBox="0 0 160 90" aria-hidden="true">${l.art}</svg>
          <span class="locbadge ${l.open ? 'open' : 'soon'}">${l.open ? '✓ Активна' : 'В разработке'}</span>
        </div>
        <div class="locinfo">
          <b>${l.name}</b>
          <small>${l.desc || ''}</small>
        </div>
      </div>`).join('')}</div>`;
}


/** Returns YYYY-MM-DD for the daily shop, where a new day starts at 09:00 AM. */
export function getDailyShopKey(date = new Date()) {
  const d = new Date(date);
  if (d.getHours() < 9) {
    d.setDate(d.getDate() - 1);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formatted time string until next 09:00 AM. */
export function getTimeUntilNext9AM(now = new Date()) {
  const next = new Date(now);
  if (now.getHours() >= 9) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(9, 0, 0, 0);
  const diffMs = Math.max(0, next - now);
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hours} ч. ${mins} мин.`;
}

/** How many of each kind the daily showcase offers. */
export const DAILY_COUNTS = {fig: 2, frame: 2, status: 4, emote: 4};

/**
 * The daily showcase: 2 figures, 2 frames, 4 statuses and 4 emoji for gold, a new set at 09:00. The order is the same
 * for everyone that day; a player sees only what they do not own yet (wallet), so what they bought gives its place
 * to the next item of the day's order.
 */
export function getDailyShopItems(figs = {}, frames = {}, statuses = [], date = new Date(), wallet = null) {
  const key = getDailyShopKey(date);
  let seed = 0;
  for (let i = 0; i < key.length; i++) {
    seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  }
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const figList = Object.entries(figs)
    .filter(([k, v]) => v.price > 0)
    .map(([k, v]) => ({ kind: 'fig', key: k, name: v.name, price: v.price }));

  const frameList = Object.entries(frames)
    .filter(([k, v]) => v.price > 0 && !v.earn)
    .map(([k, v]) => ({ kind: 'frame', key: k, name: v.name, price: v.price, ring: v.ring }));

  const statusList = statuses
    .filter(s => s.price > 0)
    .map(s => ({ kind: 'status', key: 'sh:' + s.id, id: s.id, name: s.text, price: s.price }));

  const emoteList = R.ALL_EMOTES
    .filter(e => R.price('emote', e) > 0)
    .map(e => ({ kind: 'emote', key: e, name: R.RARITY[R.rarity('emote', e)].name, price: R.price('emote', e), rarity: R.rarity('emote', e) }));

  const w = wallet || {};
  const owned = {
    fig: it => (w.owned || []).includes(it.key),
    frame: it => (w.frames || []).includes(it.key),
    status: it => (w.statuses || []).includes(it.key),
    emote: it => R.isOwned(w, 'emote', it.key),
  };
  // shuffled first (the same order for everyone that day), then what this player owns is skipped
  const pick = (list, kind) => shuffle(list).filter(it => !wallet || !owned[kind](it)).slice(0, DAILY_COUNTS[kind]);
  return [...pick(figList, 'fig'), ...pick(frameList, 'frame'), ...pick(statusList, 'status'), ...pick(emoteList, 'emote')];
}

/** Generates HTML markup for the 6-item daily shop showcase. */
export function renderDailyShopShowcase({ items = [], wallet = {}, figPreview = () => '', initial = '?', frames = {}, now = new Date() }) {
  const fname = (initial || '?').toUpperCase();
  const timeStr = getTimeUntilNext9AM(now);
  const gold = wallet.gold || 0;

  const cardsHtml = items.map(item => {
    let previewHtml = '';
    let isOwned = false;
    let isEquipped = false;
    let kindLabel = '';
    let kindClass = '';

    if (item.kind === 'fig') {
      kindLabel = 'Фигурка';
      kindClass = 'k-fig';
      isOwned = (wallet.owned || []).includes(item.key);
      isEquipped = wallet.fig === item.key;
      previewHtml = `<div class="dsh-visual"><img src="${figPreview(item.key)}" alt="" style="width:48px;height:62px;display:block;margin:0 auto"></div>`;
    } else if (item.kind === 'frame') {
      kindLabel = 'Рамка';
      kindClass = 'k-frame';
      isOwned = (!item.price) || (wallet.frames || []).includes(item.key);
      isEquipped = (wallet.frame || 'none') === item.key;
      const ring = item.ring || (frames[item.key] && frames[item.key].ring) || '';
      previewHtml = `<div class="dsh-visual"><span class="av${ring ? ' fr' : ''}" style="--c:${wallet.color || '#3a7bd5'};${ring ? `--fr:${ring}` : ''};width:48px;height:48px;font-size:20px">${fname}</span></div>`;
    } else if (item.kind === 'status') {
      kindLabel = 'Статус';
      kindClass = 'k-status';
      const k = item.key;
      isOwned = (wallet.statuses || []).includes(k);
      isEquipped = (wallet.statusKey === k) || (wallet.status && wallet.status === item.name);
      previewHtml = `<div class="dsh-visual"><span class="stchip dsh-chip">${item.name}</span></div>`;
    } else if (item.kind === 'emote') {
      kindLabel = 'Эмодзи';
      kindClass = 'k-emote' + (item.rarity ? ' r-' + item.rarity : '');
      isOwned = R.isOwned(wallet, 'emote', item.key);
      previewHtml = `<div class="dsh-visual"><span class="dsh-emote">${item.key}</span></div>`;
    }

    const canAfford = gold >= item.price;
    let btnHtml = '';
    if (isEquipped) {
      btnHtml = `<button class="dsh-btn equipped" disabled>Надето</button>`;
    } else if (isOwned) {
      btnHtml = `<button class="dsh-btn select" data-daily-pick="${item.kind}|${item.key}">Выбрать</button>`;
    } else {
      // '|' between the parts: a status key has a ':' of its own (sh:id)
      btnHtml = `<button class="dsh-btn buy${!canAfford ? ' poor' : ''}" data-daily-buy="${item.kind}|${item.key}|${item.price}"><i class="coin"></i><b>${item.price}</b></button>`;
    }

    return `
      <div class="dsh-tile-card ${kindClass}">
        <div class="dsh-tile-inner">
          <div class="dsh-top-row">
            <span class="dsh-tag ${kindClass}">${kindLabel}</span>
          </div>
          ${previewHtml}
          <div class="dsh-info">
            <b class="dsh-name">${item.name}</b>
          </div>
          <div class="dsh-action">
            ${btnHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="daily-shop-card">
      <div class="dsh-header">
        <div class="dsh-title-box">
          <div class="dsh-badge"><span>⭐ Ежедневная витрина</span></div>
          <h3>Товары дня</h3>
          <p>${items.length ? `${items.length} ${items.length % 10 === 1 && items.length % 100 !== 11 ? 'товар' : items.length % 10 >= 2 && items.length % 10 <= 4 && (items.length % 100 < 12 || items.length % 100 > 14) ? 'товара' : 'товаров'} · ` : ''}Обновление в 09:00</p>
        </div>
        <div class="dsh-timer-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 15 15"/></svg>
          <span>До смены: <b>${timeStr}</b></span>
        </div>
      </div>
      ${cardsHtml ? `<div class="daily-shop-grid">${cardsHtml}</div>` : '<div class="dsh-empty">Всё из сегодняшней витрины уже ваше. Новые товары — в 09:00</div>'}
    </div>
  `;
}

// Emoji and phrases live in state/reactions.js (prices, ownership); re-exported here for game.html.
import * as R from '../state/reactions.js';
export const {DEFAULT_EMOTES, DEFAULT_PHRASES, ALL_EMOTES, ALL_PHRASES, SAYS} = R;

const RARITY_CLASS = {base: '', common: ' r-common', rare: ' r-rare', epic: ' r-epic'};
const coin = '<i class="coin" style="display:inline-block;vertical-align:-3px"></i>';

/** The shop section «Эмодзи и фразы»: what is not bought yet, by rarity, with a price; a counter of the collection. */
export function renderReactionShopHtml({wallet = {}}) {
  const pr = R.progress(wallet), gold = wallet.gold || 0;
  const card = (kind, id) => {
    const p = R.price(kind, id), rar = R.rarity(kind, id), poor = gold < p;
    const body = kind === 'emote' ? `<span class="rs-em">${id}</span>` : `<span class="rs-ph">${id}</span>`;
    const earn = R.EARN[kind][id];
    return `<button class="rs-item ${kind}${RARITY_CLASS[rar]}${poor ? ' poor' : ''}" data-rbuy="${kind}" data-rid="${id}">${body}<small class="rs-rar">${R.RARITY[rar].name}</small><b class="rs-price">${coin} ${p}</b>${earn ? `<small class="rs-earn">или: ${earn}</small>` : ''}</button>`;
  };
  const left = kind => (kind === 'emote' ? R.ALL_EMOTES : R.ALL_PHRASES).filter(id => !R.isOwned(wallet, kind, id));
  const block = (kind, title) => {
    const ids = left(kind), c = pr[kind];
    const head = `<div class="rs-head"><span>${title}</span><span class="rs-cnt${c.have === c.total ? ' full' : ''}">Собрано ${c.have} / ${c.total}</span></div>`;
    if (!ids.length) return head + `<div class="rs-done">Коллекция собрана ✨</div>`;
    return head + `<div class="rs-grid ${kind}">${ids.map(id => card(kind, id)).join('')}</div>`
      + `<small class="rs-note">Соберите все — +${R.COLLECTION_REWARD[kind]} золота</small>`;
  };
  return `<div class="rshop">${block('emote', 'Эмодзи')}${block('phrase', 'Фразы')}</div>`;
}

/** Generates HTML markup for Emotes and Phrases customization tab in "My items". */
export function renderItemsEmotesHtml({
  allEmotes = ALL_EMOTES,
  allPhrases = ALL_PHRASES,
  selectedEmotes = DEFAULT_EMOTES,
  selectedPhrases = DEFAULT_PHRASES,
  maxEmotes = 5,
  maxPhrases = 5,
  wallet = null
}) {
  const own = (kind, id) => !wallet || R.isOwned(wallet, kind, id);
  const pr = wallet ? R.progress(wallet) : null;
  const curEm = selectedEmotes && selectedEmotes.length ? selectedEmotes : DEFAULT_EMOTES;
  const curPh = selectedPhrases && selectedPhrases.length ? selectedPhrases : DEFAULT_PHRASES;

  const summaryHtml = `
    <div class="deck-summary-card">
      <div class="deck-header">
        <div class="deck-title">
          <span class="deck-icon">⚡</span>
          <div>
            <b>Колода реакций для партий</b>
            <small>Ставьте в колоду до ${maxEmotes} своих эмоций и ${maxPhrases} фраз — они под рукой в партии. Новые — в Витрине и за награды</small>
          </div>
        </div>
        <button class="ghostbtn sm" data-reset-deck>Сброс</button>
      </div>

      <div class="deck-slots-box">
        <div class="deck-slot-group">
          <div class="deck-slot-title">
            <span>Эмоции для быстрых ответов</span>
            <span class="deck-count ${curEm.length === maxEmotes ? 'full' : ''}">${curEm.length} / ${maxEmotes}</span>
          </div>
          <div class="deck-active-emotes">
            ${curEm.map(em => `<span class="deck-active-chip e" data-toggle-emote="${em}" title="Нажмите, чтобы убрать">${em}</span>`).join('')}
            ${Array.from({length: Math.max(0, maxEmotes - curEm.length)}).map(() => '<span class="deck-empty-chip">+</span>').join('')}
          </div>
        </div>

        <div class="deck-slot-group">
          <div class="deck-slot-title">
            <span>Фразы для чата</span>
            <span class="deck-count ${curPh.length === maxPhrases ? 'full' : ''}">${curPh.length} / ${maxPhrases}</span>
          </div>
          <div class="deck-active-phrases">
            ${curPh.map(ph => `<span class="deck-active-chip t" data-toggle-phrase="${ph}" title="Нажмите, чтобы убрать">${ph}</span>`).join('')}
            ${Array.from({length: Math.max(0, maxPhrases - curPh.length)}).map(() => '<span class="deck-empty-chip t">+</span>').join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  const emotesGridHtml = `
    <div class="h3 sec" style="display:flex;justify-content:space-between;align-items:center">
      <span>${pr ? `Эмоции · собрано ${pr.emote.have} из ${pr.emote.total}` : `Все эмоции (${allEmotes.length})`}</span>
      <small style="color:var(--muted);font-weight:normal">🔒 — купить в Витрине</small>
    </div>
    <div class="emotes-catalog-grid">
      ${allEmotes.map(em => {
        const isSel = curEm.includes(em);
        if (!own('emote', em)) return `
          <button class="em-cat-btn lockd" data-rbuy="emote" data-rid="${em}" title="Купить за ${R.price('emote', em)} золота">
            <span class="em-icon">${em}</span>
            <span class="em-badge lock">🔒</span>
            <span class="em-price">${R.price('emote', em)}</span>
          </button>
        `;
        return `
          <button class="em-cat-btn${isSel ? ' sel' : ''}" data-toggle-emote="${em}" title="${em}">
            <span class="em-icon">${em}</span>
            <span class="em-badge">${isSel ? '✓' : '+'}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  const phrasesGridHtml = `
    <div class="h3 sec" style="margin-top:20px;display:flex;justify-content:space-between;align-items:center">
      <span>${pr ? `Фразы · собрано ${pr.phrase.have} из ${pr.phrase.total}` : `Все реплики (${allPhrases.length})`}</span>
      <small style="color:var(--muted);font-weight:normal">🔒 — купить в Витрине</small>
    </div>
    <div class="phrases-catalog-list">
      ${allPhrases.map(ph => {
        const isSel = curPh.includes(ph);
        if (!own('phrase', ph)) return `
          <button class="ph-cat-btn lockd" data-rbuy="phrase" data-rid="${ph}">
            <span class="ph-text">${ph}</span>
            <span class="ph-badge lock">🔒 ${R.price('phrase', ph)} ${coin}</span>
          </button>
        `;
        return `
          <button class="ph-cat-btn${isSel ? ' sel' : ''}" data-toggle-phrase="${ph}">
            <span class="ph-text">${ph}</span>
            <span class="ph-badge">${isSel ? '✓ В колоде' : '+ Добавить'}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  return summaryHtml + emotesGridHtml + phrasesGridHtml;
}

/** Deterministically picks up to `cap` items from a list using a daily seed. */
export function getStallUnownedItems(list, seedKey, cap = 6) {
  if (!Array.isArray(list) || !list.length) return [];
  let seed = 0;
  for (let i = 0; i < seedKey.length; i++) {
    seed = (seed * 31 + seedKey.charCodeAt(i)) >>> 0;
  }
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, cap);
}

/**
 * Renders the 5 separate counters (stalls) in the shop:
 * figures, frames, statuses, emojis, and phrases (max 6 items per counter, 3 on top and 3 on bottom).
 */
export function renderShopStallsShowcase({
  figs = {},
  frames = {},
  statuses = [],
  wallet = {},
  figPreview = () => '',
  initial = '?',
  date = new Date()
} = {}) {
  const dateKey = getDailyShopKey(date);
  const gold = wallet.gold || 0;
  const fname = (initial || '?').toUpperCase();
  const w = wallet || {};

  // 1. Фигурки: некупленные
  const figPool = Object.entries(figs)
    .filter(([k, v]) => v.price > 0 && !(w.owned || []).includes(k))
    .map(([k, v]) => ({ kind: 'fig', key: k, name: v.name, price: v.price }));
  const figItems = getStallUnownedItems(figPool, dateKey + ':fig', 6);

  // 2. Рамки: некупленные
  const framePool = Object.entries(frames)
    .filter(([k, v]) => v.price > 0 && !v.earn && !(w.frames || []).includes(k))
    .map(([k, v]) => ({ kind: 'frame', key: k, name: v.name, price: v.price, ring: v.ring }));
  const frameItems = getStallUnownedItems(framePool, dateKey + ':frame', 6);

  // 3. Статусы: некупленные
  const statusPool = (statuses || [])
    .filter(s => s.price > 0 && !(w.statuses || []).includes('sh:' + s.id))
    .map(s => ({ kind: 'status', key: 'sh:' + s.id, id: s.id, name: s.text, price: s.price }));
  const statusItems = getStallUnownedItems(statusPool, dateKey + ':status', 6);

  // 4. Эмодзи: некупленные
  const emotePool = R.ALL_EMOTES
    .filter(e => R.price('emote', e) > 0 && !R.isOwned(w, 'emote', e))
    .map(e => ({ kind: 'emote', key: e, name: R.RARITY[R.rarity('emote', e)].name, price: R.price('emote', e), rarity: R.rarity('emote', e) }));
  const emoteItems = getStallUnownedItems(emotePool, dateKey + ':emote', 6);

  // 5. Фразы: некупленные
  const phrasePool = R.ALL_PHRASES
    .filter(p => R.price('phrase', p) > 0 && !R.isOwned(w, 'phrase', p))
    .map(p => ({ kind: 'phrase', key: p, name: R.RARITY[R.rarity('phrase', p)].name, price: R.price('phrase', p), rarity: R.rarity('phrase', p) }));
  const phraseItems = getStallUnownedItems(phrasePool, dateKey + ':phrase', 6);

  const renderSingleStall = ({
    stallClass,
    icon,
    title,
    sub,
    items,
    totalPoolSize,
    emptyText,
    renderCardFn
  }) => {
    let cardsHtml = '';
    if (items.length) {
      cardsHtml = `<div class="stall-grid stall-3x2">${items.map(renderCardFn).join('')}</div>`;
    } else {
      cardsHtml = `<div class="stall-empty-sign"><span>🏆</span><p>${emptyText}</p></div>`;
    }

    return `
      <div class="shop-stall ${stallClass}">
        <div class="stall-canopy">
          <div class="stall-canopy-stripe"></div>
          <div class="stall-signboard">
            <span class="stall-icon">${icon}</span>
            <div class="stall-titles">
              <h3 class="stall-title">${title}</h3>
              <p class="stall-sub">${sub} · <small>в наличии: ${items.length}</small></p>
            </div>
            <div class="stall-badge">До 6 товаров</div>
          </div>
        </div>
        <div class="stall-counter">
          <div class="stall-shelf-edge"></div>
          ${cardsHtml}
          <div class="stall-counter-woodbase"></div>
        </div>
      </div>
    `;
  };

  // 1. Прилавок резных фигурок
  const figStallHtml = renderSingleStall({
    stallClass: 'stall-figures',
    icon: '♟️',
    title: 'Прилавок фигурок',
    sub: 'Персонажи для партий',
    items: figItems,
    totalPoolSize: figPool.length,
    emptyText: 'Все фигурки в вашей коллекции! Новые персонажи появятся в обновлениях.',
    renderCardFn: item => {
      const canAfford = gold >= item.price;
      return `
        <div class="stall-item fig-stall-card">
          <div class="fig-pedestal-wrap">
            <div class="fig-shadow"></div>
            <img class="fig-art" src="${figPreview(item.key)}" alt="${item.name}">
            <div class="fig-pedestal-wood"></div>
          </div>
          <b class="stall-item-name">${item.name}</b>
          <button class="stall-buy-btn${!canAfford ? ' poor' : ''}" data-daily-buy="fig|${item.key}|${item.price}">
            <i class="coin"></i> <b>${item.price}</b>
          </button>
        </div>
      `;
    }
  });

  // 2. Прилавок рамок мастера
  const frameStallHtml = renderSingleStall({
    stallClass: 'stall-frames',
    icon: '🖼️',
    title: 'Прилавок рамок',
    sub: 'Оправы для аватара профиля',
    items: frameItems,
    totalPoolSize: framePool.length,
    emptyText: 'Все рамки собраны! Примеряйте в профиле.',
    renderCardFn: item => {
      const canAfford = gold >= item.price;
      const ring = item.ring || (frames[item.key] && frames[item.key].ring) || '';
      return `
        <div class="stall-item frame-stall-card">
          <div class="frame-cushion-wrap">
            <span class="av${ring ? ' fr' : ''}" style="--c:${wallet.color || '#3a7bd5'};${ring ? `--fr:${ring}` : ''};width:46px;height:46px;font-size:18px">${fname}</span>
          </div>
          <b class="stall-item-name">${item.name}</b>
          <button class="stall-buy-btn${!canAfford ? ' poor' : ''}" data-daily-buy="frame|${item.key}|${item.price}">
            <i class="coin"></i> <b>${item.price}</b>
          </button>
        </div>
      `;
    }
  });

  // 3. Прилавок благородных статусов
  const statusStallHtml = renderSingleStall({
    stallClass: 'stall-statuses',
    icon: '🏷️',
    title: 'Прилавок статусов',
    sub: 'Статусы и подписи для профиля',
    items: statusItems,
    totalPoolSize: statusPool.length,
    emptyText: 'Все статусы из лавки уже у вас! Примеряйте в профиле.',
    renderCardFn: item => {
      const canAfford = gold >= item.price;
      return `
        <div class="stall-item status-stall-card">
          <div class="status-plate-wrap">
            <span class="stchip stall-chip">${item.name}</span>
          </div>
          <button class="stall-buy-btn${!canAfford ? ' poor' : ''}" data-daily-buy="status|${item.key}|${item.price}">
            <i class="coin"></i> <b>${item.price}</b>
          </button>
        </div>
      `;
    }
  });

  // 4. Прилавок живых эмоций
  const emoteStallHtml = renderSingleStall({
    stallClass: 'stall-emotes',
    icon: '😄',
    title: 'Прилавок эмодзи',
    sub: 'Быстрые эмодзи для реакций в партиях',
    items: emoteItems,
    totalPoolSize: emotePool.length,
    emptyText: 'Все эмодзи собраны! Полный набор реакций в вашем распоряжении.',
    renderCardFn: item => {
      const canAfford = gold >= item.price;
      const rarClass = item.rarity ? ' r-' + item.rarity : '';
      return `
        <div class="stall-item emote-stall-card${rarClass}">
          <div class="emote-token-wrap">
            <span class="stall-emote-icon">${item.key}</span>
            <small class="stall-rar-tag">${item.name}</small>
          </div>
          <button class="stall-buy-btn${!canAfford ? ' poor' : ''}" data-daily-buy="emote|${item.key}|${item.price}">
            <i class="coin"></i> <b>${item.price}</b>
          </button>
        </div>
      `;
    }
  });

  // 5. Прилавок крылатых фраз
  const phraseStallHtml = renderSingleStall({
    stallClass: 'stall-phrases',
    icon: '💬',
    title: 'Прилавок фраз',
    sub: 'Реплики для чата в партиях',
    items: phraseItems,
    totalPoolSize: phrasePool.length,
    emptyText: 'Все фразы открыты!',
    renderCardFn: item => {
      const canAfford = gold >= item.price;
      const rarClass = item.rarity ? ' r-' + item.rarity : '';
      return `
        <div class="stall-item phrase-stall-card${rarClass}">
          <div class="phrase-scroll-wrap">
            <span class="stall-phrase-text">«${item.key}»</span>
            <small class="stall-rar-tag">${item.name}</small>
          </div>
          <button class="stall-buy-btn${!canAfford ? ' poor' : ''}" data-daily-buy="phrase|${item.key}|${item.price}">
            <i class="coin"></i> <b>${item.price}</b>
          </button>
        </div>
      `;
    }
  });

  return `
    <div class="shop-stalls-container">
      ${figStallHtml}
      ${frameStallHtml}
      ${statusStallHtml}
      ${emoteStallHtml}
      ${phraseStallHtml}
    </div>
  `;
}
