// Shop UI and interactions (E-1.4)
// Renders the shop screens: daily gifts, figures, avatar frames, and game locations.

/** Generates HTML markup for the daily gift chest card. */
export function renderGiftCard({giftReady, chestSvg, boosts = {}}) {
  const inv = [
    boosts.double ? `Двойное золото ×${boosts.double}` : '',
    boosts.meeple ? `+1 фигурка ×${boosts.meeple}` : '',
  ].filter(Boolean).join(' · ');

  return `<div class="chest${giftReady ? ' ready' : ''}">${chestSvg}</div>` +
    `<div class="gi"><b>Ежедневный подарок</b><small>${giftReady ? 'Золото, бонус на партию или фигурка' : 'Следующий подарок — завтра'}` +
    `${inv ? '<br>У вас: ' + inv : ''}</small></div>` +
    `${giftReady ? '<button class="cta" id="openGift">Открыть</button>' : ''}`;
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
