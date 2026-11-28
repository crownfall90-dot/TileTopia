// Edit the profile: colour (free, any time) and nickname (the usual rename).

function openBannerFitting(initialId, initialKind = 'banner') {
  let curKind = initialKind || 'banner';
  let curId = initialId || '';
  if (!curId) {
    if (curKind === 'banner') curId = wallet.banner || 'meadow';
    else if (curKind === 'pic') curId = wallet.avatar || 'peasant';
    else if (curKind === 'shape') curId = wallet.avShape || 'round';
    else if (curKind === 'frame') curId = (wallet.frame && wallet.frame !== 'none' && FRAMES[wallet.frame]) ? wallet.frame : 'gold';
  }
  let curView = 'profile'; // 'profile' | 'rival'
  const old = $('#bannerFittingModal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'bannerFittingModal';
  modal.className = 'over banner-fitting-modal';
  modal.style.position = 'fixed';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const render = () => {
    // Resolve active banner for preview
    const previewBannerId = (curKind === 'banner' && curId) ? curId : (wallet.banner || 'meadow');
    const curB = AV.BANNERS[previewBannerId] || AV.BANNERS.meadow;

    // Resolve active avatar, shape, and frame for preview
    const previewPicId = (curKind === 'pic') ? curId : wallet.avatar;
    const previewShape = (curKind === 'shape') ? curId : (curKind === 'banner' ? 'rect' : (wallet.avShape || 'round'));
    const previewFrame = (curKind === 'frame') ? curId : wallet.frame;

    const ring = previewFrame && FRAMES[previewFrame] ? FRAMES[previewFrame].ring : myRing();
    const frameStyle = ring ? `--fr:${ring};` : '';
    const col = wallet.color || '#3a7bd5';
    const name = profileName();
    const initial = (name[0] || '?').toUpperCase();
    const need = xpNeed(PROG.lvl);
    const pct = Math.max(0, Math.min(100, 100 * PROG.xp / need));
    const st = PROG.st = normalizeStats(PROG.st);
    const rate = st.games ? Math.round(100 * st.wins / st.games) : 0;
    const achGot = ACH.filter(a => PROG.ach[a.id] === 'got').length;

    // Check ownership and equipped status for the currently selected item
    let isOwned = false, isEquipped = false, itemPrice = 0, itemName = '', itemEarn = '';
    if (curKind === 'banner') {
      const bObj = AV.BANNERS[curId] || AV.BANNERS.meadow;
      itemName = bObj.name;
      itemPrice = bObj.price;
      isOwned = AV.owns(wallet, 'banner', curId);
      isEquipped = (wallet.banner === curId && wallet.avShape === 'rect');
    } else if (curKind === 'pic') {
      const pObj = AV.PICS[curId] || AV.PICS.peasant;
      itemName = pObj.name;
      itemPrice = pObj.price;
      isOwned = AV.owns(wallet, 'pic', curId);
      isEquipped = (wallet.avatar === curId);
    } else if (curKind === 'shape') {
      const sObj = AV.SHAPES[curId] || AV.SHAPES.round;
      itemName = sObj.name;
      itemPrice = sObj.price;
      isOwned = (curId === 'round' || AV.owns(wallet, 'shape', curId));
      isEquipped = ((wallet.avShape || 'round') === curId);
    } else if (curKind === 'frame') {
      const fObj = FRAMES[curId] || FRAMES.gold;
      itemName = fObj.name;
      itemPrice = fObj.price || 0;
      itemEarn = fObj.earn || '';
      isOwned = (curId === 'none' || (wallet.frames || []).includes(curId) || (!fObj.price && !fObj.earn));
      isEquipped = ((wallet.frame || 'none') === curId);
    }

    const canAfford = COINS.canPay(wallet, itemPrice);

    // Build stage previews
    let stageHtml = '';
    const picObj = previewPicId ? AV.PICS[previewPicId] : null;
    const picStyle = picObj ? `--pic:url(${picObj.src});--pp:${picObj.pos || '50% 16%'};` : '';
    const shapeCls = previewShape === 'rect' ? ' banner-crest' : (previewShape === 'square' ? ' sh-square' : ' sh-round');
    const avPreviewCls = `av big${shapeCls}${ring ? ' fr' : ''}${picObj ? ' pic' : ''}`;
    const rivalAvCls = `pl-v2-av${previewShape === 'rect' ? ' crest' : (previewShape === 'square' ? ' sh-square' : ' sh-round')}${ring ? ' fr' : ''}${picObj ? ' pic' : ''}`;
    const avPreviewStyle = `--c:${col};${frameStyle}${picStyle}`;
    const stText = myStatus();
    const statusPillHtml = stText
      ? `<span class="pl-v2-status-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffd875" stroke-width="2.5" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <em class="fst">${stText}</em></span>`
      : '';

    if (curView === 'profile') {
      stageHtml = `
        <div class="bf-profile-card">
          <!-- Minimalist Banner Hero: ONLY Avatar, Nickname & Status -->
          <div class="pctop with-banner" style="--banner-bg:url(${curB.src});--banner-pos:${curB.pos || 'center'}">
            <div class="prof-banner-shade"></div>
            <div class="prof-hero-row">
              <span class="${avPreviewCls}" style="${avPreviewStyle}">${initial}</span>
              <div class="pwho">
                <div class="pnick-row">
                  <b class="pnick">${name}</b>
                  ${statusPillHtml}
                </div>
              </div>
            </div>
          </div>

          <!-- Below Banner: Clean Stats Podium -->
          <div class="pclvl">
            <div class="lvl-badge"><b>${PROG.lvl}</b><small>УР.</small></div>
            <div class="pi">
              <div class="xp-meta"><b class="pl1">Уровень ${PROG.lvl}</b><span class="xp-count">${PROG.xp} / ${need} XP</span></div>
              <div class="xpbar"><i style="width:${pct.toFixed(1)}%"></i></div>
            </div>
          </div>
          <div class="pchips">
            <div class="pchip-item cups-item"><b>${PROG.cups || 0}</b> <small>Кубков</small></div>
            <div class="pchip-item ach-item"><b>${achGot}</b> <small>Наград</small></div>
          </div>
        </div>
      `;
    } else {
      stageHtml = `
        <div class="bf-rival-card pl-dialog-v2">
          <!-- Minimalist Regal Banner Hero for Rivals -->
          <div class="pl-hero-banner with-art" style="--banner-bg:url(${curB.src});--banner-pos:${curB.pos || 'center'}">
            <div class="pl-hero-shade"></div>
            <div class="pl-hero-row">
              <div class="pl-v2-av-box" style="--pl-c:${col}">
                <span class="${rivalAvCls}" style="${avPreviewStyle}">${initial}</span>
                <span class="pl-v2-lvl">${PROG.lvl || 1}</span>
              </div>
              <div class="pl-v2-identity">
                <div class="pl-v2-name-row">
                  <h3 class="pl-v2-name">${name}</h3>
                  ${statusPillHtml}
                </div>
                <div class="pl-v2-presence-row">
                  <span class="pl-v2-badge on"><i class="pl-v2-dot"></i> <span>В сети</span></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 4-Stat Podium for Rivals -->
          <div class="pl-v2-stats">
            <div class="pl-v2-stat"><b class="pl-v2-stat-val">${PROG.cups || 0}</b><small class="pl-v2-stat-lbl">Кубки</small></div>
            <div class="pl-v2-stat"><b class="pl-v2-stat-val">${st.wins}</b><small class="pl-v2-stat-lbl">Победы</small></div>
            <div class="pl-v2-stat"><b class="pl-v2-stat-val">${rate}%</b><small class="pl-v2-stat-lbl">Винрейт</small></div>
            <div class="pl-v2-stat"><b class="pl-v2-stat-val">${achGot}</b><small class="pl-v2-stat-lbl">Награды</small></div>
          </div>
        </div>
      `;
    }

    // Build carousel for the active category
    let carouselHtml = '';
    if (curKind === 'banner') {
      carouselHtml = Object.entries(AV.BANNERS).map(([bId, b]) => {
        const owned = AV.owns(wallet, 'banner', bId);
        const equipped = (wallet.banner === bId && wallet.avShape === 'rect');
        const sel = (bId === curId);
        return `
          <button class="bf-card${sel ? ' sel' : ''}${equipped ? ' on' : ''}" data-bid="${bId}" type="button">
            <div class="bf-thumb" style="background-image:url(${b.src});background-position:${b.pos || 'center'}">
              ${equipped ? '<span class="bf-tag eq">Надет</span>' : (owned ? '<span class="bf-tag ow">Куплен</span>' : `<span class="bf-tag pr">${COINS.priceTag(b.price)}</span>`)}
            </div>
            <span class="bf-name">${b.name}</span>
          </button>
        `;
      }).join('');
    } else if (curKind === 'pic') {
      carouselHtml = Object.entries(AV.PICS).map(([pId, p]) => {
        const owned = AV.owns(wallet, 'pic', pId);
        const equipped = (wallet.avatar === pId);
        const sel = (pId === curId);
        return `
          <button class="bf-card${sel ? ' sel' : ''}${equipped ? ' on' : ''}" data-pid="${pId}" type="button">
            <div class="bf-thumb" style="background-image:url(${p.src});background-position:${p.pos || 'center'};background-size:cover">
              ${equipped ? '<span class="bf-tag eq">Надет</span>' : (owned ? '<span class="bf-tag ow">Куплен</span>' : `<span class="bf-tag pr">${COINS.priceTag(p.price)}</span>`)}
            </div>
            <span class="bf-name">${p.name}</span>
          </button>
        `;
      }).join('');
    } else if (curKind === 'shape') {
      carouselHtml = Object.entries(AV.SHAPES).map(([sId, s]) => {
        const owned = (sId === 'round' || AV.owns(wallet, 'shape', sId));
        const equipped = ((wallet.avShape || 'round') === sId);
        const sel = (sId === curId);
        return `
          <button class="bf-card${sel ? ' sel' : ''}${equipped ? ' on' : ''}" data-sid="${sId}" type="button">
            <div class="bf-thumb" style="display:grid;place-items:center;background:rgba(255,255,255,0.06)">
              <span class="av big${sId === 'rect' ? ' sh-rect' : (sId === 'square' ? ' sh-square' : '')}" style="--c:${col};width:42px;height:42px">${initial}</span>
              ${equipped ? '<span class="bf-tag eq">Надета</span>' : (owned ? '<span class="bf-tag ow">Куплена</span>' : `<span class="bf-tag pr">${COINS.priceTag(s.price)}</span>`)}
            </div>
            <span class="bf-name">${s.name}</span>
          </button>
        `;
      }).join('');
    } else if (curKind === 'frame') {
      carouselHtml = Object.entries(FRAMES).filter(([fId]) => fId !== 'none').map(([fId, f]) => {
        const owned = (wallet.frames || []).includes(fId) || (!f.price && !f.earn);
        const equipped = ((wallet.frame || 'none') === fId);
        const sel = (fId === curId);
        return `
          <button class="bf-card${sel ? ' sel' : ''}${equipped ? ' on' : ''}" data-fid="${fId}" type="button">
            <div class="bf-thumb" style="display:grid;place-items:center;background:rgba(255,255,255,0.06)">
              <span class="av big fr" style="--c:${col};--fr:${f.ring || ''};width:42px;height:42px">${initial}</span>
              ${equipped ? '<span class="bf-tag eq">Надета</span>' : (owned ? '<span class="bf-tag ow">Куплена</span>' : `<span class="bf-tag pr">${f.earn ? '🔒' : COINS.priceTag(f.price || 0)}</span>`)}
            </div>
            <span class="bf-name">${f.name}</span>
          </button>
        `;
      }).join('');
    }

    // Action button
    let actionBtnHtml = '';
    if (isEquipped) {
      actionBtnHtml = `<button class="ghostbtn bf-action-btn" id="bfUnequipBtn">Снять</button>`;
    } else if (isOwned) {
      actionBtnHtml = `<button class="cta wide bf-action-btn" id="bfEquipBtn">Надеть «${itemName}»</button>`;
    } else if (itemEarn) {
      actionBtnHtml = `<button class="ghostbtn bf-action-btn" disabled>🔒 ${itemEarn}</button>`;
    } else if (curKind === 'banner' && !AV.owns(wallet, 'shape', 'rect')) {
      actionBtnHtml = `<button class="cta wide bf-action-btn lock" id="bfNeedShapeBtn">Открыть форму баннера (2500 🪙)</button>`;
    } else {
      actionBtnHtml = `<button class="cta wide bf-action-btn${!canAfford ? ' poor' : ''}" id="bfBuyBtn" ${!canAfford ? 'disabled' : ''}>Купить за ${COINS.priceTag(itemPrice)} и надеть</button>`;
    }

    modal.innerHTML = `
      <div class="ocard bf-modal-card">
        <div class="bf-top">
          <div class="bf-title-row">
            <div class="bf-title-wrap">
              <h3 class="bf-title">Примерка: ${itemName || 'Предмет'}</h3>
              <p class="bf-sub">Посмотрите, как фон и образ преображают профиль и как его видят другие</p>
            </div>
            <button class="iconbtn bf-close" id="bfCloseBtn" aria-label="Закрыть">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="bf-tabs">
            <button class="bf-tab${curView === 'profile' ? ' active' : ''}" data-view="profile">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>В моем профиле</span>
            </button>
            <button class="bf-tab${curView === 'rival' ? ' active' : ''}" data-view="rival">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>В карточке соперника</span>
            </button>
          </div>
        </div>

        <div class="bf-stage">${stageHtml}</div>

        <div class="bf-carousel-wrap">
          <div class="bf-cat-tabs" style="display:flex;gap:6px;margin-bottom:8px;overflow-x:auto">
            <button class="chip${curKind === 'banner' ? ' pri' : ''}" data-cat="banner">Баннеры</button>
            <button class="chip${curKind === 'pic' ? ' pri' : ''}" data-cat="pic">Аватарки</button>
            <button class="chip${curKind === 'shape' ? ' pri' : ''}" data-cat="shape">Формы</button>
            <button class="chip${curKind === 'frame' ? ' pri' : ''}" data-cat="frame">Рамки</button>
          </div>
          <div class="bf-carousel" id="bfCarousel">${carouselHtml}</div>
        </div>

        <div class="bf-foot">
          ${actionBtnHtml}
        </div>
      </div>
    `;

    const closeBtn = modal.querySelector('#bfCloseBtn');
    if (closeBtn) closeBtn.onclick = () => modal.remove();

    modal.querySelectorAll('.bf-tab').forEach(t => {
      t.onclick = () => {
        curView = t.dataset.view;
        render();
      };
    });

    modal.querySelectorAll('[data-cat]').forEach(b => {
      b.onclick = () => {
        curKind = b.dataset.cat;
        if (curKind === 'banner') curId = wallet.banner || 'meadow';
        else if (curKind === 'pic') curId = wallet.avatar || 'peasant';
        else if (curKind === 'shape') curId = wallet.avShape || 'round';
        else if (curKind === 'frame') curId = (wallet.frame && wallet.frame !== 'none' && FRAMES[wallet.frame]) ? wallet.frame : 'gold';
        render();
      };
    });

    modal.querySelectorAll('.bf-card').forEach(c => {
      c.onclick = () => {
        if (c.dataset.bid) curId = c.dataset.bid;
        else if (c.dataset.pid) curId = c.dataset.pid;
        else if (c.dataset.sid) curId = c.dataset.sid;
        else if (c.dataset.fid) curId = c.dataset.fid;
        render();
      };
    });

    const equipBtn = modal.querySelector('#bfEquipBtn');
    if (equipBtn) {
      equipBtn.onclick = () => {
        if (curKind === 'banner') {
          wallet.avShape = 'rect';
          wallet.banner = curId;
        } else if (curKind === 'pic') {
          wallet.avatar = curId;
        } else if (curKind === 'shape') {
          wallet.avShape = curId;
        } else if (curKind === 'frame') {
          wallet.frame = curId;
        }
        beep('coin');
        saveWallet();
        renderProfile();
        renderMenuProfile();
        if (typeof renderShop === 'function') renderShop();
        if (typeof renderItems === 'function') renderItems();
        toastAny(`«${itemName}» надето!`);
        render();
      };
    }

    const unequipBtn = modal.querySelector('#bfUnequipBtn');
    if (unequipBtn) {
      unequipBtn.onclick = () => {
        if (curKind === 'banner') wallet.banner = '';
        else if (curKind === 'pic') wallet.avatar = '';
        else if (curKind === 'shape') wallet.avShape = 'round';
        else if (curKind === 'frame') wallet.frame = 'none';
        saveWallet();
        renderProfile();
        renderMenuProfile();
        if (typeof renderShop === 'function') renderShop();
        if (typeof renderItems === 'function') renderItems();
        toastAny('Предмет снят');
        render();
      };
    }

    const buyBtn = modal.querySelector('#bfBuyBtn');
    if (buyBtn) {
      buyBtn.onclick = () => {
        if (itemEarn) return;
        if (!COINS.canPay(wallet, itemPrice)) return toastAny(COINS.lackText(wallet, itemPrice));
        if (curKind === 'banner') {
          const res = AV.buy(wallet, 'banner', curId);
          if (!res.ok) return;
          wallet.avShape = 'rect';
          wallet.banner = curId;
        } else if (curKind === 'pic') {
          const res = AV.buy(wallet, 'pic', curId);
          if (!res.ok) return;
          wallet.avatar = curId;
        } else if (curKind === 'shape') {
          const res = AV.buy(wallet, 'shape', curId);
          if (!res.ok) return;
          wallet.avShape = curId;
        } else if (curKind === 'frame') {
          COINS.pay(wallet, itemPrice);
          wallet.frames = [...(wallet.frames || []), curId];
          wallet.frame = curId;
        }
        beep('coin');
        saveWallet();
        renderProfile();
        renderMenuProfile();
        if (typeof renderShop === 'function') renderShop();
        if (typeof renderItems === 'function') renderItems();
        toastAny(`Куплено и надето: ${itemName}`);
        render();
      };
    }

    const needShapeBtn = modal.querySelector('#bfNeedShapeBtn');
    if (needShapeBtn) {
      needShapeBtn.onclick = () => {
        if (!COINS.canPay(wallet, 2500)) return toastAny(COINS.lackText(wallet, 2500));
        COINS.pay(wallet, 2500);
        wallet.avShapes = [...(wallet.avShapes || []), 'rect'];
        wallet.avShape = 'rect';
        beep('coin');
        saveWallet();
        toastAny('Форма баннера открыта!');
        render();
      };
    }
  };

  render();
  document.body.append(modal);
}

function editProfile() {
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  const lk = AV.look(wallet), ring = myRing();
  box.innerHTML = `<div class="ocard prof"><div class="pav${ring ? ' fr' : ''}${lk.cls}" id="epAv" style="--c:${wallet.color};${ring ? `--fr:${ring};` : ''}${lk.style}">${(profileName()[0] || '?').toUpperCase()}</div><h3>Редактировать профиль</h3><p>Цвет игрока — в профиле и по умолчанию в партиях</p><span id="epAnchor"></span>
    <button class="cta wide" id="epName">Сменить никнейм · <i class="coin" style="display:inline-block;width:12px;height:12px"></i> ${RENAME_PRICE}</button><button class="ghostbtn" id="epLook">Образ, аватарка и рамка</button><button class="ghostbtn" id="epOk">Готово</button></div>`;
  document.body.append(box);
  colorPick(box.querySelector('#epAnchor'), box.querySelector('#epAv'));
  const done = () => { box.remove(); renderProgress(); renderAccount(); renderMenuProfile(); };
  box.querySelector('#epOk').onclick = done;
  box.querySelector('#epName').onclick = () => { done(); renameDialog(); };
  box.querySelector('#epLook').onclick = () => { done(); openBannerFitting(wallet.banner || 'meadow'); };
  box.onclick = e => { if (e.target === box) done(); };
}
function renderHistory(el) {
  el = el || $('#historyList') || $('#ptab');
  if (!el) return;
  const rows = (() => { const a = jsonRead(GAME_HISTORY_KEY, []); return Array.isArray(a) ? a.filter(x => x && Array.isArray(x.players)) : []; })();
  if (typeof PG !== 'undefined' && PG.ui && PG.ui.progress && PG.ui.progress.renderHistoryHtml) {
    el.innerHTML = PG.ui.progress.renderHistoryHtml(rows, isFriend);
    el.querySelectorAll('.hadd').forEach(b => { b.onclick = () => { b.disabled = true; addFriend(b.dataset.uid, b.dataset.n, 'history'); }; });
    return;
  }
  if (!rows.length) { el.innerHTML = '<p class="shint">Здесь появятся ваши партии — сыграйте первую</p>'; return; }
  const when = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  const wins = rows.filter(r => {
    if (r.reason === 'draw' || r.reason === 'cancel') return false;
    const ps = (Array.isArray(r.players) ? r.players.slice() : []).sort((a, b) => (a.resigned ? 1 : 0) - (b.resigned ? 1 : 0) || (b.score || 0) - (a.score || 0));
    return Boolean(ps[0] && ps[0].me && !ps[0].resigned);
  }).length;
  const sum = `<div class="hsum"><b>${rows.length}</b> последних партий · 🏆 <b>${wins}</b> побед · онлайн <b>${rows.filter(r => /^o:/.test(r.id)).length}</b></div>`;
  el.innerHTML = sum + rows.map(r => {
    const ps = (Array.isArray(r.players) ? r.players.slice() : []).sort((a, b) => (a.resigned ? 1 : 0) - (b.resigned ? 1 : 0) || (b.score || 0) - (a.score || 0));
    const me = ps.findIndex(p => p.me), myPlayer = me >= 0 ? ps[me] : null, online = /^o:/.test(r.id);
    const head = r.reason === 'draw' ? 'Ничья' : (myPlayer && myPlayer.resigned) || r.reason === 'cancel' ? 'Поражение' : me === 0 ? '🏆 Победа' : me > 0 ? `${me + 1}-е место` : 'Партия';
    const who = ps.map(p => `<span class="hp${p.me ? ' me' : ''}"${online && p.uid && !p.me && !p.bot ? ` data-pl="${String(p.uid).replace(/[^\w-]/g, '').slice(0, 64)}" data-n="${clean(p.name)}" data-c="${validCol(p.col) ? p.col : ''}"` : ''}><i style="--c:${validCol(p.col) ? p.col : '#5b6684'}"></i>${clean(p.name)}${p.resigned ? ' <small style="color:var(--muted)">(сдался)</small>' : ''} <b>${+p.score || 0}</b>${online && p.uid && !p.me && !p.bot && !isFriend(p.uid) ? `<button class="chip hadd" data-uid="${String(p.uid).replace(/[^\w-]/g, '').slice(0, 64)}" data-n="${clean(p.name)}">+ в друзья</button>` : ''}</span>`).join('');
    return `<div class="quest hrow"><span class="qi">${online ? '🌐' : '🤖'}</span><span class="qt"><b>${head}</b><small>${when(r.at)} · ${online ? 'онлайн' : 'офлайн'}</small><span class="hps">${who}</span></span></div>`;
  }).join('');
  el.querySelectorAll('.hadd').forEach(b => { b.onclick = () => { b.disabled = true; addFriend(b.dataset.uid, b.dataset.n, 'history'); }; });
}
// "How to play": four panes behind tabs instead of one long page.
$('#rtabs').onclick = e => {
  const b = e.target.closest('[data-rt]'); if (!b) return;
  document.querySelectorAll('#rtabs button').forEach(x => x.setAttribute('aria-pressed', x === b));
  document.querySelectorAll('#scr-rules .rpane').forEach(p => { p.hidden = p.dataset.rp !== b.dataset.rt; });
  $('#scr-rules').scrollTop = 0;
};
function renderProgress() {
  renderProfile();
  renderTasks();
  const sheet = $('#roadQuestsSheet'); if (sheet && !sheet.hidden) renderRoadQuestsInSheet();
}
// The progress screen may have no tabs (the full-screen road): a missing element must not stop the game from starting.
if ($('#ptabs')) $('#ptabs').onclick = e => {
  const b = e.target.closest('[data-pt]'); if (!b) return;
  ptab = b.dataset.pt; roadScroll = ptab === 'road';
  renderTasks();
};

function onProgressClick(e) {
  const road = e.target.closest('[data-claimroad]');
  if (road) return claimRoadMilestone(road.dataset.claimroad);
  const q = e.target.closest('[data-claimq]'), a = e.target.closest('[data-claima]'), wq = e.target.closest('[data-claimwq]'), wch = e.target.closest('[data-claimwchest]');
  if (e.target.closest('[data-claimrq]')) {
    const rq = challengeNow(), RQ = challengeDef(); if (!RQ || rq.got || rq.n < RQ.n) return;
    rq.got = true; COINS.give(wallet, RQ.s, 'star'); beep('coin'); saveWallet(); renderProgress(); renderMenuProfile();
    toastAny(`Испытание пройдено! +${RQ.s} ${RQ.s === 1 ? 'звезда' : 'звезды'}`, 'ok', 'Награда'); return;
  }
  const rr = e.target.closest('[data-reroll]');
  if (rr) {   // one free swap a day: the quest goes, a fresh one (not on today's list) takes its place
    const it = PROG.q.find(x => x.id === rr.dataset.reroll);
    if (!it || it.got || PROG.qre === PROG.day) return;
    const next = PG.state.progress.rerollQuest(PROG.day, PROG.q.map(x => x.id), it.id); if (!next) return;
    Object.assign(it, {id: next, n: 0, got: false}); PROG.qre = PROG.day;
    saveWallet(); renderProgress(); toastAny('Задание заменено'); return;
  }
  if (q) { const it = PROG.q.find(x => x.id === q.dataset.claimq), Q = QUESTS.find(x => x.id === it.id); if (it.got || it.n < Q.n) return; it.got = true; wallet.gold += Q.g; toastAny(`Задание выполнено! +${Q.g} тайлов`); }
  else if (a) { const A = ACH.find(x => x.id === a.dataset.claima); if (PROG.ach[A.id] === 'got' || !A.ok(PROG.st, PROG.lvl)) return; PROG.ach[A.id] = 'got'; COINS.give(wallet, A.g, A.coin === 'star' ? 'star' : 'tile'); toastAny(`Достижение «${A.t}»! +${A.g} ${A.coin === 'star' ? '⭐' : 'тайлов'}`); }
  else if (wq) { const it = (PROG.wq || []).find(x => x.id === wq.dataset.claimwq), WQ = WEEKLY_ALL.find(x => x.id === it.id); if (!it || !WQ || it.got || it.n < WQ.n) return; it.got = true; wallet.gold += WQ.g; toastAny(`Цель недели выполнена! +${WQ.g} тайлов`); }
  else if (wch) { if (PROG.wchest || !PROG.wq || !PROG.wq.length || !PROG.wq.every(x => x.got)) return; PROG.wchest = true; wallet.gold += WEEKLY_CHEST_GOLD || 100; toastAny('Большой сундук недели открыт! +100 тайлов 🎉'); }
  else return;
  beep('coin'); saveWallet(); progressDot(); renderProgress(); if (typeof renderAchievements === 'function' && !$('#scr-achievements').hidden) renderAchievements(); renderMenuProfile(); renderMenuQuestBanner();
}
$('#ptab').addEventListener('click', onProgressClick);
if ($('#roadQuestsSheetBody')) $('#roadQuestsSheetBody').addEventListener('click', onProgressClick);
if ($('#achievementsContent')) $('#achievementsContent').addEventListener('click', onProgressClick);
/* Rating: cups from online games (1st +30, 2nd +15, 3rd +5, draw +10) in /leaders, top 50.
   The database rules let a player raise their own score by at most 30 a minute, so a big
   backlog goes up in steps. */
// board 'hex' is the Classic 2.0 rating: its own cups (PROG.hcups), its own upload mark (PROG.hup), its own node.
async function syncRating(force, board) {
  const hex = board === 'hex', have = hex ? PROG.hcups || 0 : PROG.cups, sent = hex ? PROG.hup || 0 : PROG.up;
  if (!FB || (sent >= have && !force)) return;
  try {
    const tok = await fbToken(), target = Math.min(have, sent + 10);
    const r = await fetch(`${FB.dbUrl}/${hex ? 'leaders_hex' : 'leaders'}/${fbAuth.uid}.json?auth=${tok}`, {method: 'PUT', body: JSON.stringify({n: profileName(), st: myStatus(), fr: FRAMES[wallet.frame] ? wallet.frame : '', av: (wallet.avatar && AV.PICS[wallet.avatar]) ? wallet.avatar : '', sh: wallet.avShape || 'round', bn: (wallet.avShape === 'rect' && wallet.banner && AV.BANNERS[wallet.banner]) ? wallet.banner : '', c: validCol(wallet.color) ? wallet.color : '', r: target, w: PROG.st.owins, t: {'.sv': 'timestamp'}})});
    if (r.ok) {
      if (hex) PROG.hup = target; else PROG.up = target;
      saveWallet(); progressDot();
      if (target < have) setTimeout(() => syncRating(false, board), 61000);
      if (hex) return;
      try {
        const tr = await fetch(`${FB.dbUrl}/leaders.json?auth=${tok}&orderBy=%22r%22&limitToLast=10`);
        if (tr.ok) {
          const top10uids = Object.keys((await tr.json()) || {});
          const inTop = top10uids.includes(fbAuth.uid);
          if (!inTop) PROG.topSeen = false;
          PROG.inTop10 = inTop && !PROG.topSeen;
          saveWallet(); progressDot();
        }
      } catch (_) {}
    }
  } catch (_) {}
}
let topScope = 'all', topBoard = 'classic';

async function renderTop(customEl) {
  const el = customEl || $('#ratingContent') || $('#ptab');
  if (!el) return;
  const me = (fbAuth && fbAuth.uid) ? fbAuth.uid : 'me_player';
  const myName = profileName();
  const mySt = myStatus() || '';
  const hexBoard = topBoard === 'hex';
  const myCups = (PROG && (hexBoard ? PROG.hcups : PROG.cups)) || 0;   // never a made-up number: a new player has 0 cups
  const curWeek = (PG.state.progress && PG.state.progress.weekId) ? PG.state.progress.weekId() : 'Сезон 1';

  let rows = [];
  try {
    if (FB) {
      const tok = await fbToken();
      const r = await fetch(`${FB.dbUrl}/${hexBoard ? 'leaders_hex' : 'leaders'}.json?auth=${tok}&orderBy=%22r%22&limitToLast=50`);
      if (r.ok) {
        rows = Object.entries((await r.json()) || {}).map(([uid, v]) => ({uid, ...v})).filter(x => x.r > 0).sort((a, b) => b.r - a.r);
      }
    }
  } catch (_) {}

  // The board shows real players only. Where it cannot be loaded (no network, the database says no) it is just the
  // player themself, with the real cups — never invented rivals or a made-up first place.
  const boardLoaded = rows.length > 0;
  // Ensure user is in rows
  if (!rows.some(x => x.uid === me)) {
    rows.push({ uid: me, n: myName, st: mySt, r: myCups, fr: wallet.frame || 'none', c: wallet.color || '#3a7bd5' });
    rows.sort((a, b) => b.r - a.r);
  }

  const mine = rows.findIndex(x => x.uid === me);

  const av = (x, i) => {
    const ring = (x.fr && FRAMES[x.fr]) ? FRAMES[x.fr].ring : (i === 0 ? FRAMES.gold.ring : (i === 1 ? FRAMES.royal.ring : (i === 2 ? FRAMES.emerald.ring : '')));
    const col = validCol(x.c) ? x.c : PALETTE[i % PALETTE.length].col;
    const initial = (clean(x.n) || '?')[0].toUpperCase();
    return `<span class="av${ring ? ' fr' : ''}" style="--c:${col};${ring ? `--fr:${ring}` : ''}">${initial}</span>`;
  };
  const stBadge = st => {
    const v = PG.state.status.shownStatus(st);
    return v ? `<span class="st-rank-badge">${v}</span>` : '';
  };

  // Top 3 Podium (2nd, 1st, 3rd)
  const podium = [1, 0, 2].map(i => {
    const p = rows[i];
    if (!p) return '<div class="pod empty"></div>';
    const place = i + 1;
    const crown = place === 1 ? '👑' : (place === 2 ? '🥈' : '🥉');
    const isMe = p.uid === me;
    return `
      <div class="pod p${place}${isMe ? ' me' : ''}" data-pl="${p.uid}" data-n="${clean(p.n)}" data-st="${p.st || ''}" data-cups="${p.r}" data-fr="${p.fr || ''}" data-c="${p.c || ''}">
        <span class="pod-crown">${crown}</span>
        ${av(p, i)}
        <b class="pod-name">${clean(p.n)}${isMe ? ' (вы)' : ''}</b>
        ${stBadge(p.st)}
        <div class="pod-cups">🏆 ${p.r}</div>
        <div class="ped"><i>${place}</i></div>
      </div>
    `;
  }).join('');

  // 4th to 20th places
  const list = rows.slice(3, 20).map((x, k) => {
    const rank = k + 4;
    const isMe = x.uid === me;
    return `
      <div class="lead tile-lead-card${isMe ? ' me' : ''}" data-pl="${x.uid}" data-n="${clean(x.n)}" data-st="${x.st || ''}" data-cups="${x.r}" data-fr="${x.fr || ''}" data-c="${x.c || ''}">
        <i class="rank-num">${rank}</i>
        ${av(x, k + 3)}
        <div class="lead-player-info">
          <div class="lead-name-row">
            <b>${clean(x.n)}${isMe ? ' (вы)' : ''}</b>
          </div>
          ${stBadge(x.st)}
        </div>
        <div class="lead-cups-badge">
          <span class="cup-ic">🏆</span>
          <b>${x.r}</b>
        </div>
      </div>
    `;
  }).join('');

  const myRow = (mine >= 20)
    ? `<div class="lead tile-lead-card me myrank" data-pl="${rows[mine].uid}" data-n="${clean(rows[mine].n)}" data-st="${rows[mine].st || ''}" data-cups="${rows[mine].r}" data-fr="${rows[mine].fr || ''}" data-c="${rows[mine].c || ''}"><i class="rank-num">${mine + 1}</i>${av(rows[mine], mine)}<div class="lead-player-info"><div class="lead-name-row"><b>Вы</b></div>${stBadge(rows[mine].st)}</div><div class="lead-cups-badge"><span class="cup-ic">🏆</span><b>${rows[mine].r}</b></div></div>`
    : '';

  const boardTabs = `<div class="scope-tabs board-tabs"><button class="chip${hexBoard ? '' : ' pri'}" id="topBoardClassic">Классика</button><button class="chip${hexBoard ? ' pri' : ''}" id="topBoardHex">Классика 2.0</button></div>`;
  const scopeTabs = `<div class="scope-tabs"><button class="chip${topScope === 'all' ? ' pri' : ''}" id="topScopeAll">Все игроки (Топ-20)</button><button class="chip${topScope === 'friends' ? ' pri' : ''}" id="topScopeFriends">Среди друзей</button></div>`;
  const seasonTag = `<div style="text-align:center;color:var(--muted);font-size:12px;margin-bottom:8px">Лига · Сезон <b>${curWeek}</b></div>`;

  const emptyNote = rows.length < 4 ? `<p class="qnote" style="text-align:center">${boardLoaded ? 'Пока вас мало в таблице — играйте онлайн и поднимайтесь выше.' : 'Таблица игроков сейчас недоступна. Здесь ваши кубки; общий рейтинг появится, когда связь вернётся.'}</p>` : '';
  el.innerHTML = boardTabs + seasonTag + scopeTabs + `<div class="podium">${podium}</div>` + `<div class="leader-tile-list">${list}</div>` + myRow + emptyNote + '<p class="qnote">Нажмите на игрока, чтобы посмотреть профиль · За победу в рейтинге +10 🏆</p>';

  const btnAll = el.querySelector('#topScopeAll'), btnFriends = el.querySelector('#topScopeFriends');
  if (btnAll) btnAll.onclick = () => { topScope = 'all'; renderTop(); };
  if (btnFriends) btnFriends.onclick = () => { topScope = 'friends'; renderTop(); };
  const bc = el.querySelector('#topBoardClassic'), bh = el.querySelector('#topBoardHex');
  if (bc) bc.onclick = () => { topBoard = 'classic'; renderTop(customEl); };
  if (bh) bh.onclick = () => { topBoard = 'hex'; renderTop(customEl); };

  // A tap on a player row or podium card opens the player card: the global [data-pl] handler does it
}
questsToday(); progressDot();
