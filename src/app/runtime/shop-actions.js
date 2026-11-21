// Daily shop actions (buying & selecting items from daily 6-item showcase)

function showStallCategoryModal(info) {
  const old = document.getElementById('stallHintModal'); if (old) old.remove();
  const m = document.createElement('div');
  m.id = 'stallHintModal';
  m.className = 'over stall-hint-modal';
  m.style.position = 'fixed';
  m.innerHTML = '<div class="ocard stall-hint-card">'
    + '<div class="shm-head"><div class="shm-icon">' + (info.icon || 'ℹ️') + '</div><h3>' + clean(info.title) + '</h3></div>'
    + '<div class="shm-body">'
    + '<div class="shm-row"><b>Что это такое:</b><p>' + clean(info.what) + '</p></div>'
    + '<div class="shm-row"><b>Где увидят:</b><p>' + clean(info.where) + '</p></div>'
    + '</div>'
    + '<button class="cta wide shm-btn" id="shmClose">Понятно</button>'
    + '</div>';
  document.body.append(m);
  const close = () => { m.classList.add('fading'); setTimeout(() => m.remove(), 160); };
  m.onclick = e => { if (e.target === m || e.target.closest('#shmClose')) close(); };
}

function handleShopCardAction(kind, key, name, price, cardEl) {
  // Check banner requirement
  const isBannerPic = (kind === 'av' && key && key.startsWith('banner:')) || kind === 'banner';
  if (isBannerPic && !AV.owns(wallet, 'shape', 'rect')) {
    toastAny('Недоступно: сначала откройте форму баннера', 'bad');
    return;
  }
  if (!COINS.canPay(wallet, price)) {
    toastAny(COINS.lackText(wallet, price));
    return;
  }
  // Direct clean confirmation dialog
  confirmBox('Купить «' + clean(name) + '» за ' + COINS.priceText(price) + '?', 'Купить', () => {
    if (!COINS.canPay(wallet, price)) return toastAny(COINS.lackText(wallet, price));
    if (kind === 'emote' || kind === 'phrase') {
      buyReaction(kind, key);
    } else if (kind === 'av') {
      const parts = key.split(':');
      buyAvatarItem(parts[0], parts[1]);
    } else if (kind === 'fig') {
      const f = FIGS[key];
      COINS.pay(wallet, price);
      wallet.owned.push(key);
      beep('coin');
      pickFig(key);
      toastAny('Фигурка «' + (f ? f.name : key) + '» — ваша!');
    } else if (kind === 'frame') {
      const f = FRAMES[key];
      COINS.pay(wallet, price);
      wallet.frames = [...(wallet.frames || []), key];
      wallet.frame = key;
      beep('coin');
      saveWallet();
      renderShop();
      renderMenuProfile();
      toastAny('Рамка «' + (f ? f.name : key) + '» — ваша!');
    } else if (kind === 'status') {
      const st = PG.state.status.SHOP_STATUSES.find(s => s.id === key);
      const stName = st ? st.text : key;
      const fullKey = 'sh:' + key;
      COINS.pay(wallet, price);
      wallet.statuses = [...(wallet.statuses || []), fullKey];
      wallet.statusKey = fullKey;
      wallet.status = stName;
      beep('coin');
      saveWallet();
      renderShop();
      renderMenuProfile();
      toastAny('Статус «' + stName + '» надет!');
    }
  });
}

function showShopItemModal(kind, key, name, price) {
  const old = document.getElementById('shopItemModal');
  if (old) old.remove();

  const desc = (typeof PG !== 'undefined' && PG.ui && PG.ui.shop && PG.ui.shop.getItemDescription)
    ? PG.ui.shop.getItemDescription(kind, key, name)
    : { type: 'Предмет витрины', what: 'Уникальный предмет коллекции.', where: 'Виден другим игрокам.' };

  const canAfford = COINS.canPay(wallet, price);

  let prevHtml = '';
  if (kind === 'fig') {
    prevHtml = '<div class="stall-modal-fig-art"><img src="' + figPreview(key) + '" alt="' + name + '"></div>';
  } else if (kind === 'frame') {
    const ring = (FRAMES[key] && FRAMES[key].ring) || '';
    prevHtml = '<span class="av big' + (ring ? ' fr' : '') + '" style="--c:' + (wallet.color || '#3a7bd5') + ';' + (ring ? ('--fr:' + ring) : '') + ';width:64px;height:64px;font-size:24px">' + ((profileName()[0] || '?').toUpperCase()) + '</span>';
  } else if (kind === 'status') {
    prevHtml = '<span class="stchip stall-chip" style="font-size:15px;padding:7px 16px;max-width:92%;text-align:center">' + name + '</span>';
  } else if (kind === 'emote') {
    prevHtml = '<span style="font-size:48px;line-height:1">' + key + '</span>';
  } else if (kind === 'phrase') {
    prevHtml = '<div class="chat-bubble" style="font-size:14px;padding:8px 16px;max-width:90%;text-align:center">' + key + '</div>';
  } else {
    const parts = (key || '').split(':');
    const avKind = parts[0], avId = parts[1];
    if (avKind === 'shape') {
      prevHtml = '<span class="av big sh-' + avId + '" style="--c:' + (wallet.color || '#3a7bd5') + ';width:60px;height:60px;font-size:22px">' + ((profileName()[0] || '?').toUpperCase()) + '</span>';
    } else {
      const it = (avKind === 'banner' ? AV.BANNERS : AV.PICS)[avId];
      const shape = avKind === 'banner' ? ' sh-rect' : '';
      prevHtml = '<span class="av big' + shape + ' pic" style="--c:' + (wallet.color || '#3a7bd5') + ';--pic:url(' + (it ? it.src : '') + ');--pp:' + (it ? it.pos : 'center') + ';width:64px;height:64px"></span>';
    }
  }

  const modal = document.createElement('div');
  modal.id = 'shopItemModal';
  modal.className = 'over shop-item-modal';
  modal.style.position = 'fixed';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="ocard stall-modal-card">
      <div class="stall-modal-top">
        <div class="stall-modal-preview">${prevHtml}</div>
        <button class="iconbtn stall-modal-close" data-close-modal="1" aria-label="Закрыть">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="stall-modal-heading">
        <h3 class="stall-modal-title">${name}</h3>
        <span class="stall-modal-badge">${desc.type}</span>
      </div>
      <div class="stall-modal-details">
        <div class="stall-modal-block">
          <span class="stall-modal-lbl">Что это такое:</span>
          <p class="stall-modal-txt">${desc.what}</p>
        </div>
        <div class="stall-modal-block">
          <span class="stall-modal-lbl">Где увидят:</span>
          <p class="stall-modal-txt">${desc.where}</p>
        </div>
      </div>
      <div class="stall-modal-foot">
        ${(() => {
          let lbl = '';
          if (kind === 'frame') lbl = 'Примерить рамку';
          else if (kind === 'av') {
            const pk = (key || '').split(':')[0];
            if (pk === 'banner') lbl = 'Примерить баннер';
            else if (pk === 'shape') lbl = 'Примерить форму';
            else if (pk === 'pic') lbl = 'Примерить аватарку';
          }
          return lbl ? `<button class="ghostbtn stall-modal-try-btn" id="stallModalTryBtn" style="width:100%;margin-bottom:8px;border-color:rgba(242,184,75,0.6);color:#ffd875"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="display:inline-block;vertical-align:-3px;margin-right:6px"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>${lbl}</button>` : '';
        })()}
        <button class="cta wide stall-modal-buy-btn${!canAfford ? ' poor' : ''}" id="stallModalBuyBtn">
          <span class="stall-modal-buy-text">Купить</span><span class="stall-modal-buy-sep">·</span><span class="stall-modal-buy-price">${COINS.priceTag(price)}</span>
        </button>
        <button class="ghostbtn" data-close-modal="1">Назад</button>
      </div>
    </div>
  `;

  document.body.append(modal);

  const close = () => {
    document.removeEventListener('keydown', onKey);
    modal.remove();
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  modal.addEventListener('click', e => {
    if (e.target.closest('[data-close-modal]') || e.target === modal) {
      close();
      return;
    }
    const tryBtn = e.target.closest('#stallModalTryBtn');
    if (tryBtn) {
      close();
      if (kind === 'frame') {
        openBannerFitting(key, 'frame');
      } else if (kind === 'av') {
        const parts = (key || '').split(':');
        openBannerFitting(parts[1] || 'meadow', parts[0] || 'banner');
      }
      return;
    }
    const buyBtn = e.target.closest('#stallModalBuyBtn');
    if (buyBtn) {
      if (!COINS.canPay(wallet, price)) {
        toastAny(COINS.lackText(wallet, price));
        return;
      }
      close();
      if (kind === 'emote' || kind === 'phrase') {
        buyReaction(kind, key);
      } else if (kind === 'av') {
        const [k, id] = key.split(':');
        buyAvatarItem(k, id);
      } else if (kind === 'fig') {
        const f = FIGS[key];
        COINS.pay(wallet, price);
        wallet.owned.push(key);
        beep('coin');
        pickFig(key);
        toastAny('Фигурка «' + (f ? f.name : key) + '» — ваша!');
      } else if (kind === 'frame') {
        const f = FRAMES[key];
        COINS.pay(wallet, price);
        wallet.frames = [...(wallet.frames || []), key];
        wallet.frame = key;
        beep('coin');
        saveWallet();
        renderShop();
        renderMenuProfile();
        toastAny('Рамка «' + (f ? f.name : key) + '» — ваша!');
      } else if (kind === 'status') {
        const st = PG.state.status.SHOP_STATUSES.find(s => s.id === key);
        const stName = st ? st.text : key;
        const fullKey = 'sh:' + key;
        COINS.pay(wallet, price);
        wallet.statuses = [...(wallet.statuses || []), fullKey];
        wallet.statusKey = fullKey;
        wallet.status = stName;
        beep('coin');
        saveWallet();
        renderShop();
        renderMenuProfile();
        toastAny('Статус «' + stName + '» надет!');
      }
    }
  });
}

(function initDailyShop() {
  const STALL_CAT_INFO = {
    'stall-avatars': {
      icon: '🖼️',
      title: 'Прилавок картинок профиля',
      what: 'Аватарки, уникальные прямоугольные баннеры и новые формы обрамления аватара.',
      where: 'В главном меню, окне профиля и карточке игрока для всех соперников.'
    },
    'stall-figures': {
      icon: '♟️',
      title: 'Прилавок резных фигурок',
      what: 'Уникальные фигурки персонажей (миплы), которыми вы совершаете ходы и занимаете владения.',
      where: 'На игровом столе во время партий и на пьедестале в карточке профиля.'
    },
    'stall-frames': {
      icon: '👑',
      title: 'Прилавок благородных рамок',
      what: 'Художественные золотые, серебряные, резные и мистические оправы для аватара.',
      where: 'Вокруг вашего аватара в меню, профиле, чате и за игровым столом.'
    },
    'stall-statuses': {
      icon: '📜',
      title: 'Прилавок почётных статусов',
      what: 'Благородные титулы и почётные звания, подчёркивающие ваш опыт и характер.',
      where: 'Под вашим именем в главном меню, профиле и списке игроков в лобби.'
    },
    'stall-emotes': {
      icon: '🎭',
      title: 'Прилавок живых эмоций',
      what: 'Быстрые анимированные реакции для живого выражения эмоций в партии.',
      where: 'В круговом меню реакций во время онлайн и локальных партий.'
    },
    'stall-phrases': {
      icon: '💬',
      title: 'Прилавок крылатых фраз',
      what: 'Тактические реплики и остроумные цитаты для общения с соперниками.',
      where: 'В быстром чате во время партии над вашим аватаром.'
    }
  };

  document.addEventListener('click', e => {
    const hintBtn = e.target.closest('[data-stall-hint], .stall-hint-btn');
    if (hintBtn) {
      e.preventDefault();
      e.stopPropagation();
      let cat = hintBtn.dataset.stallHint || '';
      if (!cat) {
        const stallEl = hintBtn.closest('.shop-stall');
        if (stallEl) {
          const match = stallEl.className.match(/stall-[a-z]+/);
          if (match) cat = match[0];
        }
      }
      const info = STALL_CAT_INFO[cat] || {
        icon: 'ℹ️',
        title: 'О прилавке',
        what: 'Уникальные предметы для украшения профиля и игрового стола.',
        where: 'В вашем профиле и во время партий.'
      };
      showStallCategoryModal(info);
      return;
    }

    const buyBtn = e.target.closest('[data-daily-buy]');
    if (buyBtn) {
      const parts = buyBtn.dataset.dailyBuy.split('|');
      const kind = parts[0], key = kind === 'status' ? parts[1].replace(/^sh:/, '') : parts[1], price = +parts[2];
      const card = buyBtn.closest('[data-stall-card]');
      const cardName = card ? card.dataset.name : key;
      showShopItemModal(kind, key, cardName, price);
      return;
    }

    const stallCard = e.target.closest('[data-stall-card]');
    if (stallCard && !e.target.closest('[data-daily-pick]')) {
      const kind = stallCard.dataset.kind;
      const key = stallCard.dataset.key;
      const name = stallCard.dataset.name;
      const price = +stallCard.dataset.price;
      showShopItemModal(kind, key, name, price);
      return;
    }

    const pickBtn = e.target.closest('[data-daily-pick]');
    if (pickBtn) {
      const [kind, key] = pickBtn.dataset.dailyPick.split('|');
      if (kind === 'fig') {
        pickFig(key);
      } else if (kind === 'frame') {
        wallet.frame = key; saveWallet(); renderShop(); renderMenuProfile();
        toastAny('Рамка надета!');
      } else if (kind === 'status') {
        const fullKey = key.startsWith('sh:') ? key : 'sh:' + key;
        const st = PG.state.status.SHOP_STATUSES.find(s => s.id === key.replace('sh:', ''));
        wallet.statusKey = fullKey;
        if (st) wallet.status = st.text;
        saveWallet(); renderShop(); renderMenuProfile();
        toastAny('Статус надет!');
      }
      return;
    }

    // Top menu leaderboard button
    const rankBtn = e.target.closest('#btnMenuLeaderboard, #btnMenuRating, #btnMenuRatingCard');
    if (rankBtn) {
      show('rating');
    }
  });
})();

window.show = show; window.wallet = wallet; window.renderProfile = renderProfile; window.saveWallet = saveWallet;
window.openSetup = openSetup;
show(isApp ? 'menu' : 'game');
