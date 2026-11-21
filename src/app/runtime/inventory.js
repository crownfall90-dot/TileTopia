/* ---------------- statuses, my items ----------------
   A status is a short line under the nickname (see src/state/status.js). Ready ones are sold in the shop, a hand-written
   one costs 3000 gold; some are earned only. "My items" gathers everything the player owns: statuses, frames, figures. */
const ST = () => PG.state.status;
const stBadge = (t, cls = '') => `<span class="stchip${cls}">${t}</span>`;
function renderStatusShop() {
  const box = $('#stgrid'); if (!box) return;
  const own = ST().ownedStatuses(wallet), worn = wallet.statusKey || '';
  box.innerHTML = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.renderStatusShopHtml)
    ? PG.ui.shop.renderStatusShopHtml({shopStatuses: ST().SHOP_STATUSES, ownedStatuses: own, wornKey: worn, gold: wallet.gold, stars: wallet.stars, stBadgeFn: stBadge})
    : ST().SHOP_STATUSES.map(x => {
        const k = 'sh:' + x.id, has = own.includes(k), poor = !has && !COINS.canPay(wallet, x.price);
        return `<button class="stb${worn === k ? ' sel' : ''}${poor ? ' poor' : ''}" data-stb="${x.id}">${stBadge(x.text)}<small>${worn === k ? 'Надет' : has ? 'Надеть' : COINS.priceTag(x.price)}</small></button>`;
      }).join('');
}
const STATUS_ERR = {short: 'Слишком короткий статус', long: 'Не больше 15 символов', bad: 'Такой текст нельзя: выберите другой', owned: 'Такой статус у вас уже есть', gold: 'Не хватает золота'};
function afterStatusChange() { saveWallet(); renderStatusShop(); renderMenuProfile(); if (!$('#scr-items').hidden) renderItems(); presenceMark(true); syncRating(true); }
const _stg = $('#stgrid'); if (_stg) _stg.addEventListener('click', e => {
  const b = e.target.closest('[data-stb]'); if (!b) return;
  const x = ST().SHOP_STATUSES.find(q => q.id === b.dataset.stb), k = 'sh:' + x.id;
  if (ST().ownedStatuses(wallet).includes(k)) { ST().wearStatus(wallet, wallet.statusKey === k ? null : k); return afterStatusChange(); }
  if (!COINS.canPay(wallet, x.price)) return toastAny(COINS.lackText(wallet, x.price));
  confirmBox(`Купить статус «${x.text}» за ${COINS.priceText(x.price)}?`, 'Купить', () => {
    const r = ST().buyShopStatus(wallet, x.id);
    if (!r.ok) return toastAny(STATUS_ERR[r.reason] || 'Не получилось');
    ST().wearStatus(wallet, r.key); beep('coin');
    track('spend_virtual_currency', {item_name: 'status_' + x.id, virtual_currency_name: 'gold', value: x.price});
    afterStatusChange(); toastAny(`Статус «${x.text}» — ваш!`);
  });
});
$('#stBuy').onclick = () => {
  const inp = $('#stInput'), t = ST().cleanStatus(inp.value);
  if (String(inp.value).trim().length > ST().STATUS_MAX) return toastAny(STATUS_ERR.long);
  if (t.length < 2) return toastAny(STATUS_ERR.short);
  if (ST().isBadStatus(t)) return toastAny(STATUS_ERR.bad);
  if (!COINS.canPay(wallet, ST().CUSTOM_PRICE)) return toastAny(COINS.lackText(wallet, ST().CUSTOM_PRICE));
  confirmBox(`Свой статус «${t}» за ${COINS.priceText(ST().CUSTOM_PRICE)}?`, 'Купить', () => {
    const r = ST().buyCustomStatus(wallet, t);
    if (!r.ok) return toastAny(STATUS_ERR[r.reason] || 'Не получилось');
    ST().wearStatus(wallet, r.key); beep('coin'); inp.value = '';
    track('spend_virtual_currency', {item_name: 'status_custom', virtual_currency_name: 'gold', value: r.price});
    afterStatusChange(); toastAny('Статус надет');
  });
};
let itab = 'st';
let previewFrameKey = null;

function renderPlayerShowcaseHtml() {
  const S = ST();
  const worn = wallet.statusKey || '';
  const pName = profileName();
  const initial = (pName[0] || '?').toUpperCase();
  const effFrameKey = previewFrameKey !== null ? previewFrameKey : (wallet.frame || 'none');
  const frameObj = FRAMES[effFrameKey] || FRAMES.none;
  const isPreviewing = previewFrameKey !== null && previewFrameKey !== (wallet.frame || 'none');
  const ownFr = Object.keys(FRAMES).filter(k => k === 'none' || (wallet.frames || []).includes(k) || (!FRAMES[k].price && !FRAMES[k].earn));
  const canEquip = isPreviewing && ownFr.includes(effFrameKey);
  const statusTxt = worn && S.statusText(worn);
  const statusBadgeHtml = statusTxt ? stBadge(statusTxt) : '<span class="pst-none">без статуса</span>';
  const curFig = wallet.fig || 'classic';
  const figObj = FIGS[curFig] || FIGS.classic;

  return `<div class="player-showcase-card" id="playerShowcase">
    <div class="psc-top">
      <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Так вас видят в игре</span>
      ${canEquip ? `<button class="chip go psc-apply" data-applyframe="${effFrameKey}">Надеть эту рамку</button>` : isPreviewing ? `<button class="chip x psc-apply" data-resetframe="1">Сбросить примерку</button>` : ''}
    </div>
    <div class="psc-body">
      <div class="psc-av-wrap">
        <span class="av${frameObj.ring ? ' fr' : ''}${AV.look(wallet).cls}" style="--c:${wallet.color};${frameObj.ring ? `--fr:${frameObj.ring}` : ''}${AV.look(wallet).style}">${initial}</span>
      </div>
      <div class="psc-info">
        <div class="psc-name-line">
          <b class="psc-name">${clean(pName)}</b>
          <span class="psc-status">${statusBadgeHtml}</span>
        </div>
        <div class="psc-meta">
          <small class="psc-flabel">${frameObj.name}${isPreviewing ? ' · <b style="color:var(--brass)">примерка</b>' : ''}</small>
        </div>
      </div>
      <div class="psc-fig-wrap">
        <img src="${figPreview(curFig)}" class="psc-fig" alt="${figObj.name}">
        <small>${figObj.name}</small>
      </div>
    </div>
  </div>`;
}

// Profile picture tab: the shape (round for everyone, square and banner bought) and the worn portrait / banner.
function avPickerHtml() {
  const ini = (profileName()[0] || '?').toUpperCase(), ring = myRing(), base = `--c:${wallet.color};${ring ? `--fr:${ring};` : ''}`;
  const av = (cls, style) => `<span class="av${ring ? ' fr' : ''}${cls}" style="${base}${style}">${ini}</span>`;
  const shapeBtn = k => { const o = AV.owns(wallet, 'shape', k), x = AV.SHAPES[k]; return `<button class="${(wallet.avShape || 'round') === k ? 'sel' : ''}" data-avfit="shape|${k}">${av(k === 'round' ? '' : ' sh-' + k, '')}<span>${x.name}</span>${o ? '' : `<small>${COINS.priceTag(x.price)}</small>`}</button>`; };
  const picBtn = (kind, k, it, shape) => `<button class="${(kind === 'pic' ? wallet.avatar : wallet.banner) === k ? 'sel' : ''}" data-avfit="${kind}|${k}">${av(` pic${shape}`, `--pic:url(${it.src});--pp:${it.pos};`)}<span>${it.name}</span></button>`;
  const mine = (kind, P, shape) => Object.entries(P).filter(([k]) => AV.owns(wallet, kind, k)).map(([k, it]) => picBtn(kind, k, it, shape)).join('');
  const none = kind => `<button class="${(kind === 'pic' ? wallet.avatar : wallet.banner) ? '' : 'sel'}" data-avwear="${kind}|">${av(kind === 'banner' ? ' sh-rect' : '', '')}<span>Без картинки</span></button>`;
  return `<div class="avpick"><div class="h3 sec">Форма</div><div class="avsh">${['round', 'square', 'rect'].map(shapeBtn).join('')}</div>`
    + `<div class="h3 sec">Аватарки</div><div class="avpics">${none('pic')}${mine('pic', AV.PICS, '')}</div>`
    + `<div class="h3 sec">Баннеры</div><div class="avpics">${none('banner')}${mine('banner', AV.BANNERS, ' sh-rect')}</div>`
    + `<small class="rs-note">Новые аватарки, баннеры и формы — в витрине, на прилавке «Картинки профиля».</small></div>`;
}
function buyAvatarItem(kind, id) {
  const P = kind === 'shape' ? AV.SHAPES : kind === 'banner' ? AV.BANNERS : AV.PICS, it = P[id]; if (!it || AV.owns(wallet, kind, id)) return;
  if (!COINS.canPay(wallet, it.price)) return toastAny(COINS.lackText(wallet, it.price));
  const what = kind === 'shape' ? `форму «${it.name}»` : kind === 'banner' ? `баннер «${it.name}»` : `аватарку «${it.name}»`;
  confirmBox(`Купить ${what} за ${COINS.priceText(it.price)}?`, 'Купить', () => {
    if (!AV.buy(wallet, kind, id).ok) return;
    AV.wear(wallet, kind, id); if (kind === 'banner') AV.wear(wallet, 'shape', 'rect');
    beep('coin'); track('spend_virtual_currency', {item_name: 'av_' + kind + '_' + id, virtual_currency_name: 'gold', value: it.price});
    saveWallet(); renderShop(); renderMenuProfile(); if (!$('#scr-items') || !$('#scr-items').hidden) renderItems();
    toastAny(`Куплено: ${it.name}`);
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-avfit],[data-avbuy],[data-avwear]'); if (!b) return;
  if (b.dataset.avfit) {
    const [k, id] = b.dataset.avfit.split('|');
    openBannerFitting(id, k);
    return;
  }
  if (b.dataset.avbuy) { const [k, id] = b.dataset.avbuy.split('|'); return buyAvatarItem(k, id); }
  const [k, id] = b.dataset.avwear.split('|'); AV.wear(wallet, k, id); if (k === 'banner' && id) AV.wear(wallet, 'shape', 'rect');
  saveWallet(); renderMenuProfile(); renderItems();
});

function renderItems() {
  const box = $('#itemsBody'); if (!box) return;
  document.querySelectorAll('#itabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.it === itab));
  const S = ST(), own = S.ownedStatuses(wallet), worn = wallet.statusKey || '';
  const showcase = renderPlayerShowcaseHtml();
  if (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.renderItemsStatusesHtml) {
    let tabContent = '';
    if (itab === 'st') {
      tabContent = PG.ui.shop.renderItemsStatusesHtml({shopStatuses: S.SHOP_STATUSES, exclusiveStatuses: S.EXCLUSIVE_STATUSES, ownedStatuses: own, wornKey: worn, statusTextFn: k => S.statusText(k), stBadgeFn: stBadge});
    } else if (itab === 'fr') {
      tabContent = PG.ui.shop.renderItemsFramesHtml({frames: FRAMES, ownedFrames: wallet.frames || [], wornFrame: wallet.frame, previewFrame: previewFrameKey, color: wallet.color, profileInitial: profileName()[0]});
    } else if (itab === 'fg') {
      tabContent = PG.ui.shop.renderItemsFigsHtml({figs: FIGS, ownedFigs: wallet.owned, selectedFig: wallet.fig, figPreviewFn: figPreview});
    } else if (itab === 'em') {
      const allE = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.ALL_EMOTES) ? PG.ui.shop.ALL_EMOTES : ALL_EMOTES;
      const allP = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.ALL_PHRASES) ? PG.ui.shop.ALL_PHRASES : ALL_PHRASES;
      tabContent = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.renderItemsEmotesHtml)
        ? PG.ui.shop.renderItemsEmotesHtml({
            allEmotes: allE,
            allPhrases: allP,
            selectedEmotes: PG.state.reactions.deck(wallet, 'emote'),
            selectedPhrases: PG.state.reactions.deck(wallet, 'phrase'),
            maxEmotes: 5,
            maxPhrases: 5,
            wallet
          })
        : '<p>Загрузка реакций...</p>';
    } else if (itab === 'av') {
      tabContent = avPickerHtml();
    } else {
      tabContent = PG.ui.shop.renderItemsLocsHtml(LOCS);
    }
    box.innerHTML = showcase + tabContent;
    return;
  }
  if (itab === 'st') {
    const counted = S.SHOP_STATUSES.length + S.EXCLUSIVE_STATUSES.filter(x => !x.soon).length, have = own.filter(k => !k.startsWith('cu:')).length;
    const mine = own.map(k => ({k, t: S.statusText(k), ex: k.startsWith('ex:'), cu: k.startsWith('cu:')}));
    const lockedEx = S.EXCLUSIVE_STATUSES.filter(x => !own.includes('ex:' + x.id));
    box.innerHTML = showcase + `<div class="icount">Собрано <b>${have}</b> из ${counted}${own.length > have ? ` · своих: ${own.length - have}` : ''}</div>`
      + `<div class="itnow">Сейчас: ${worn && S.statusText(worn) ? stBadge(S.statusText(worn)) + '<button class="chip x" data-unwear>Снять</button>' : '<small>статус не надет</small>'}</div>`
      + (mine.length ? `<div class="h3 sec">Мои статусы</div><div class="stgrid">${mine.map(m => `<button class="stb${worn === m.k ? ' sel' : ''}${m.ex ? ' ex' : ''}" data-iwear="${m.k}">${stBadge(m.t, m.ex ? ' ex' : '')}<small>${worn === m.k ? 'Надет' : m.ex ? 'Эксклюзив · надеть' : m.cu ? 'Свой · надеть' : 'Надеть'}</small></button>`).join('')}</div>` : '<p class="shint">Пока нет статусов. Купите в магазине или получите за достижения.</p>')
      + (lockedEx.length ? `<div class="h3 sec">Эксклюзивные</div><div class="exlist">${lockedEx.map(x => `<div class="exrow${x.soon ? ' soon' : ''}"><span class="exic">${x.ic}</span><span><b>${x.text}</b><small>${x.how}</small></span><i>🔒</i></div>`).join('')}</div>` : '')
      + '<button class="ghostbtn wide" data-ishop>Купить статусы в магазине</button>';
  } else if (itab === 'fr') {
    const ownFr = Object.keys(FRAMES).filter(k => k === 'none' || (wallet.frames || []).includes(k) || (!FRAMES[k].price && !FRAMES[k].earn));
    const total = Object.keys(FRAMES).length - 1, have = ownFr.filter(k => k !== 'none').length;
    const lock = Object.entries(FRAMES).filter(([k, f]) => !ownFr.includes(k));
    const effFr = previewFrameKey || wallet.frame || 'none';
    box.innerHTML = showcase + `<div class="icount">Собрано <b>${have}</b> из ${total}</div><div class="frgrid">${ownFr.map(k => { const f = FRAMES[k], sel = effFr === k; return `<button class="frb${sel ? ' sel' : ''}" data-ifr="${k}"><span class="av${f.ring ? ' fr' : ''}" style="--c:${wallet.color};${f.ring ? `--fr:${f.ring}` : ''}">${(profileName()[0] || '?').toUpperCase()}</span><span>${f.name}</span><small>${sel ? 'Надета' : 'Надеть'}</small></button>`; }).join('')}</div>`
      + (lock.length ? `<div class="h3 sec">Ещё не открыты (нажмите для примерки)</div><div class="frgrid">${lock.map(([k, f]) => `<button class="frb lockd${previewFrameKey === k ? ' sel' : ''}" data-pfr="${k}" title="Нажмите для примерки"><span class="av fr" style="--c:#2a3254;--fr:${f.ring}">?</span><span>${f.name}</span><small>${previewFrameKey === k ? 'Примерка' : (f.earn ? '🔒 ' + f.earn : COINS.priceTag(f.price))}</small></button>`).join('')}</div>` : '')
      + '<button class="ghostbtn wide" data-ishop>В магазин</button>';
  } else if (itab === 'fg') {
    const ownF = Object.keys(FIGS).filter(k => wallet.owned.includes(k)), lock = Object.keys(FIGS).filter(k => !wallet.owned.includes(k));
    box.innerHTML = showcase + `<div class="icount">Собрано <b>${ownF.length}</b> из ${Object.keys(FIGS).length}</div><div class="figgrid">${ownF.map(k => `<button class="fig${wallet.fig === k ? ' sel' : ''}" data-ifig="${k}"><img src="${figPreview(k)}" alt=""><b>${FIGS[k].name}</b><small>${wallet.fig === k ? 'Выбрана' : 'Выбрать'}</small></button>`).join('')}</div>`
      + (lock.length ? `<div class="h3 sec">Ещё не куплены</div><div class="figgrid">${lock.map(k => `<div class="fig poor lockd"><img src="${figPreview(k)}" alt="" style="filter:grayscale(1) brightness(.6)"><b>${FIGS[k].name}</b><small>${COINS.priceTag(FIGS[k].price)}</small></div>`).join('')}</div>` : '')
      + '<button class="ghostbtn wide" data-ishop>В магазин</button>';
  } else {
    box.innerHTML = showcase + `<div class="icount">Открыто <b>${LOCS.filter(l => l.open).length}</b> из ${LOCS.length}</div><div class="locgrid">${LOCS.map(l => `<div class="loccard${l.open ? ' active' : ' locked'}"><div class="locart"><svg viewBox="0 0 160 90" aria-hidden="true">${l.art}</svg><span class="locbadge ${l.open ? 'open' : 'soon'}">${l.open ? '✓ Активна' : 'Скоро'}</span></div><div class="locinfo"><b>${l.name}</b><small>${l.desc || ''}</small></div></div>`).join('')}</div>`;
  }
}
$('#itabs').addEventListener('click', e => { const b = e.target.closest('[data-it]'); if (!b) return; itab = b.dataset.it; previewFrameKey = null; renderItems(); });
$('#itemsBody').addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-ishop]')) return show('shop');
  if (t.closest('[data-applyframe]')) {
    const k = t.closest('[data-applyframe]').dataset.applyframe;
    wallet.frame = k; previewFrameKey = null; saveWallet(); renderItems(); renderMenuProfile();
    const d = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.getItemDescription) ? PG.ui.shop.getItemDescription('frame', k) : null;
    toastAny(d && d.where ? ('Рамка надета. Где увидят: ' + d.where) : 'Рамка надета'); return;
  }
  if (t.closest('[data-resetframe]')) {
    previewFrameKey = null; renderItems(); return;
  }
  if (t.closest('[data-unwear]')) { ST().wearStatus(wallet, null); return afterStatusChange(); }
  const rb = t.closest('[data-rbuy]'); if (rb) return buyReaction(rb.dataset.rbuy, rb.dataset.rid);
  const te = t.closest('[data-toggle-emote]');
  if (te) {
    const em = te.dataset.toggleEmote;
    if (!PG.state.reactions.isOwned(wallet, 'emote', em)) return buyReaction('emote', em);
    let cur = PG.state.reactions.deck(wallet, 'emote').slice();
    if (cur.includes(em)) {
      if (cur.length <= 1) { toastAny('В колоде должна остаться хотя бы 1 эмоция'); return; }
      cur = cur.filter(x => x !== em);
    } else {
      if (cur.length >= 5) { toastAny('В колоде максимум 5 эмодзи. Снимите один, чтобы взять другой'); return; }
      cur.push(em);
    }
    wallet.emotes = cur;
    saveWallet();
    renderItems();
    renderSayBox();
    if (cur.includes(em)) {
      const d = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.getItemDescription) ? PG.ui.shop.getItemDescription('emote', em) : null;
      if (d && d.where) toastAny('Эмодзи в колоде. Где увидят: ' + d.where);
    }
    return;
  }
  const tp = t.closest('[data-toggle-phrase]');
  if (tp) {
    const ph = tp.dataset.togglePhrase;
    if (!PG.state.reactions.isOwned(wallet, 'phrase', ph)) return buyReaction('phrase', ph);
    let cur = PG.state.reactions.deck(wallet, 'phrase').slice();
    if (cur.includes(ph)) {
      if (cur.length <= 1) { toastAny('В колоде должна остаться хотя бы 1 фраза'); return; }
      cur = cur.filter(x => x !== ph);
    } else {
      if (cur.length >= 5) { toastAny('В колоде максимум 5 фраз. Снимите одну, чтобы взять другую'); return; }
      cur.push(ph);
    }
    wallet.phrases = cur;
    saveWallet();
    renderItems();
    renderSayBox();
    if (cur.includes(ph)) {
      const d = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.getItemDescription) ? PG.ui.shop.getItemDescription('phrase', ph) : null;
      if (d && d.where) toastAny('Фраза в колоде. Где увидят: ' + d.where);
    }
    return;
  }
  if (t.closest('[data-reset-deck]')) {
    wallet.emotes = DEFAULT_EMOTES.slice();
    wallet.phrases = DEFAULT_PHRASES.slice();
    saveWallet();
    renderItems();
    renderSayBox();
    toastAny('Сброшено на базовую колоду (3 эмодзи + 3 фразы)');
    return;
  }
  const w = t.closest('[data-iwear]'); if (w) {
    const next = wallet.statusKey === w.dataset.iwear ? null : w.dataset.iwear;
    ST().wearStatus(wallet, next);
    afterStatusChange();
    if (next) {
      const d = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.getItemDescription) ? PG.ui.shop.getItemDescription('status', next) : null;
      if (d && d.where) toastAny('Статус надет. Где увидят: ' + d.where);
    }
    return;
  }
  const pf = t.closest('[data-pfr]');
  if (pf) {
    previewFrameKey = pf.dataset.pfr;
    renderItems();
    const frName = (FRAMES[previewFrameKey] && FRAMES[previewFrameKey].name) || 'Рамка';
    toastAny(`Примерка: «${frName}»`);
    return;
  }
  const f = t.closest('[data-ifr]');
  if (f) {
    wallet.frame = f.dataset.ifr;
    previewFrameKey = null;
    saveWallet();
    renderItems();
    renderMenuProfile();
    const frName = (FRAMES[wallet.frame] && FRAMES[wallet.frame].name) || 'Рамка';
    const d = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.getItemDescription) ? PG.ui.shop.getItemDescription('frame', wallet.frame, frName) : null;
    toastAny(d && d.where ? ('Рамка «' + frName + '» надета. Где увидят: ' + d.where) : ('Рамка «' + frName + '» надета'));
    return;
  }
  const g = t.closest('[data-ifig]'); if (g) {
    wallet.fig = g.dataset.ifig;
    saveWallet();
    renderItems();
    const d = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.getItemDescription) ? PG.ui.shop.getItemDescription('fig', g.dataset.ifig) : null;
    if (d && d.where) toastAny('Где увидят: ' + d.where);
    return;
  }
});
const _ib = $('#itemsBtn'); if (_ib) _ib.onclick = () => { show('items'); renderItems(); };
const fRow = (f, btn, sub) => PG.net.friends.renderFriendRow(f, btn, sub);
function fillOnline(sec, title, list, show, inRoom, room) {
  if (!sec) return;
  const on = show ? friends.filter(f => f.on && !inRoom.has(f.uid)) : [];
  sec.hidden = !on.length;
  if (!on.length) return;
  title.textContent = 'Друзья онлайн';
  const html = on.map(f => fRow(f, `<button class="chip go" data-linv="${f.uid}">${
    room && invited.code === room && invited.joined.has(f.uid) ? '✓ Принял' :
    room && invited.code === room && invited.uids.has(f.uid) ? 'Ещё раз' : 'Позвать'
  }</button>`, STATE_TEXT[f.p && f.p.s] || 'в игре')).join('');
  if (list.innerHTML !== html) list.innerHTML = html; // matchRender ticks every second: don't swallow taps
}
function renderLobbyFriends() {
  const ok = FB && registered(), seats = net && net.lobby ? net.lobby.seats : [];
  const inRoom = new Set(seats.map(x => x.uid).filter(Boolean));
  fillOnline($('#lobbyOnline'), $('#lobbyOnlineTitle'), $('#lobbyOnlineList'), ok && net && !net.quick && !(net.gameId && phase !== 'end') && seats.length < roomMax(), inRoom, net && net.code);
  fillOnline($('#mOnline'), $('#mOnlineTitle'), $('#mOnlineList'), ok && !!mm && !(net && net.gameId) && seats.length < mm.want, inRoom, net && net.quick ? net.code : null);
  updateLobbyOnlineBadge();
}
function renderFriends() {
  const box = $('#flist'); if (!box || $('#scr-friends').hidden) return;
  renderBlockedPlayers();
  const gate = !FB || !registered();
  $('#fGate').hidden = !gate; $('#fMine').hidden = gate; $('#fJoinRow').hidden = gate; $('#fRoom').hidden = gate;
  if (!FB) { $('#fGate').innerHTML = '<p>Друзья доступны в приложении с интернетом</p>'; box.innerHTML = ''; return; }
  if (gate) {
    const step = !wallet.name ? ['Придумайте никнейм', 'fgName'] : ['Войти или создать профиль', 'fgLogin'];
    $('#fGate').innerHTML = `<div style="font-size:40px">🤝</div><h3>Друзья — для сохранённых профилей</h3><p>Нужны никнейм и сохранённый профиль — почта с паролем или вход через Google. Так друзья точно найдут именно вас, даже после переустановки игры</p><button class="cta wide" id="${step[1]}">${step[0]}</button>${wallet.name ? '' : '<button class="ghostbtn" id="fgLogin">У меня есть профиль — войти</button>'}`;
    box.innerHTML = ''; return;
  }
  const has = wallet.fcode && wallet.fcodeUid === myUid();
  $('#fcode').innerHTML = has ? [...wallet.fcode].map(c => `<span>${c}</span>`).join('') : fcodeErr ? '' : '<span>…</span>';
  $('#fErr').hidden = has || !fcodeErr; $('#fCopy').hidden = !has; $('#fTap').hidden = !has;
  if (!has && fcodeErr) $('#fErr').firstChild.textContent = fcodeErr === 'rules' ? 'Друзья пока недоступны: сервер игры ещё не обновлён. Скоро заработает.' : 'Нет связи с сервером — проверьте интернет.';
  const room = net && !net.quick && !(net.gameId && phase !== 'end') ? net.code : null;
  if (room) {
    $('#fRoom').hidden = false;
    $('#fRoom').innerHTML = `<span>Ваша комната <b>${room}</b></span><button class="chip go" data-froom>В комнату</button>`;
  } else {
    $('#fRoom').hidden = true;
    $('#fRoom').innerHTML = '';
  }
  const reqs = Object.entries(inbox).filter(([, v]) => v.k === 'f'), invs = Object.entries(inbox).filter(([, v]) => v.k === 'r');
  const on = friends.filter(f => f.on), off = friends.filter(f => f.mutual && !f.on), wait = friends.filter(f => !f.mutual);
  box.innerHTML = (typeof PG !== 'undefined' && PG.net && PG.net.friends && PG.net.friends.renderFriendsListHtml)
    ? PG.net.friends.renderFriendsListHtml({invs, reqs, on, off, wait, room, invited, stateTextMap: STATE_TEXT, agoTextFn: agoText, cleanFn: clean})
    : (() => {
        let h = '';
        if (invs.length) h += `<div class="h3">Зовут играть</div><ul class="flist">${invs.map(([k, v]) => fRow({n: clean(v.n), c: '#f2b84b'}, `<button class="chip go" data-fjoin="${k}">Войти</button><button class="chip x" data-fdrop="${k}" aria-label="Отклонить">✕</button>`, 'комната ' + clean(v.code))).join('')}</ul>`;
        if (reqs.length) h += `<div class="h3">Заявки в друзья</div><ul class="flist">${reqs.map(([k, v]) => fRow({n: clean(v.n), c: '#f2b84b'}, `<button class="chip go" data-facc="${k.slice(0, -2)}">Принять</button><button class="chip x" data-fdrop="${k}" aria-label="Отклонить">✕</button>`, 'хочет дружить')).join('')}</ul>`;
        h += `<div class="h3"><span class="fdot on"></span>В сети</div><ul class="flist">${on.map(f => fRow(f, `<button class="chip go" data-finv="${f.uid}">${room && invited.code === room && invited.joined.has(f.uid) ? '✓ Принял' : room && invited.code === room && invited.uids.has(f.uid) ? 'Ещё раз' : 'Позвать'}</button>`, STATE_TEXT[f.p.s] || 'в игре')).join('') || '<li class="qnote">Никого из друзей нет в сети</li>'}</ul>`;
        if (off.length) h += `<div class="h3"><span class="fdot off"></span>Не в сети</div><ul class="flist">${off.map(f => fRow(f, `<button class="chip x" data-fdel="${f.uid}" aria-label="Удалить из друзей">✕</button>`, agoText(f.p && f.p.t))).join('')}</ul>`;
        if (wait.length) h += `<div class="h3">Ждут ответа</div><ul class="flist">${wait.map(f => fRow(f, `<button class="chip x" data-fdel="${f.uid}" aria-label="Отменить заявку">✕</button>`, (f.p && f.p.t) ? agoText(f.p.t) : 'заявка отправлена')).join('')}</ul>`;
        if (!friends.length && !reqs.length) h += '<p class="shint">Добавьте друга по коду выше</p>';
        return h;
      })();
  renderLobbyFriends();
}
let friendsTimer = 0;
async function openFriends() {
  renderFriends(); clearTimeout(friendsTimer);
  if (!FB || !registered()) return;
  try { await friendCode(); } catch (_) {}
  await Promise.all([loadFriends().catch(() => {}), inboxPoll()]);
  renderFriends(); friendsDot();
  friendsTimer = setTimeout(() => { if (!$('#scr-friends').hidden) openFriends(); }, 30000);
}
$('#scr-friends').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if ('froom' in d) show('lobby');
  else if ('fcreate' in d) createRoom();
  else if (d.finv) inviteFriend(d.finv);
  else if (d.facc) acceptFriend(d.facc);
  else if (d.fjoin) joinInvite(d.fjoin);
  else if (d.fdrop) { declineInvite(d.fdrop); dropInbox(d.fdrop); }
  else if (d.fdel) { const f = friends.find(x => x.uid === d.fdel); const nm = f ? f.n : 'игрока'; confirmBox(f && !f.mutual ? `Отменить заявку для ${nm}?` : `Удалить ${nm} из друзей?`, 'Удалить', () => removeFriend(d.fdel)); }
});
