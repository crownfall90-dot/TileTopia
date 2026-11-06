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
    <p class="shint" style="margin:-2px 0 10px">Локации меняют оформление игрового поля, архитектуру городов и атмосферу королевства.</p>
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

/** Deterministically selects 6 gold-only items for the day: 2 figures, 2 frames, 2 statuses. */
export function getDailyShopItems(figs = {}, frames = {}, statuses = [], date = new Date()) {
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

  const pickedFigs = shuffle(figList).slice(0, 2);
  const pickedFrames = shuffle(frameList).slice(0, 2);
  const pickedStatuses = shuffle(statusList).slice(0, 2);

  return [...pickedFigs, ...pickedFrames, ...pickedStatuses];
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
    }

    const canAfford = gold >= item.price;
    let btnHtml = '';
    if (isEquipped) {
      btnHtml = `<button class="dsh-btn equipped" disabled>Надето</button>`;
    } else if (isOwned) {
      btnHtml = `<button class="dsh-btn select" data-daily-pick="${item.kind}:${item.key}">Выбрать</button>`;
    } else {
      btnHtml = `<button class="dsh-btn buy${!canAfford ? ' poor' : ''}" data-daily-buy="${item.kind}:${item.key}:${item.price}"><i class="coin"></i><b>${item.price}</b></button>`;
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
          <p>6 товаров · Обновление в 09:00</p>
        </div>
        <div class="dsh-timer-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 15 15"/></svg>
          <span>До смены: <b>${timeStr}</b></span>
        </div>
      </div>
      <div class="daily-shop-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}
