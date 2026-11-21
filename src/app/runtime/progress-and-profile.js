// Wiring for Road Quests Sheet and Quests Dot
function toggleRoadQuestsSheet(open) {
  const sheet = $('#roadQuestsSheet');
  if (!sheet) return;
  if (open) {
    sheet.hidden = false;
    renderRoadQuestsInSheet();
  } else {
    sheet.hidden = true;
    renderProgressRoad();
  }
}

function renderRoadQuestsInSheet() {
  const body = $('#roadQuestsSheetBody');
  if (body) body.innerHTML = rewardsHtml();
}
// Daily quests, weekly goals with the big chest, achievements: the list in the quests sheet of the progress screen.
// Days left of the challenge: the first one of a week ends on Wednesday, the second on Sunday.
function challengeLeftText() {
  const d = new Date(), wd = (d.getDay() + 6) % 7, left = wd < 3 ? 3 - wd : 7 - wd;
  return left <= 1 ? 'последний день' : `ещё ${left} дн.`;
}
function rewardsHtml() {
  questsWeekly();
  return PG.ui.progress.renderRewardsTabHtml({
    progQuests: PROG.q || [], questDefs: QUESTS, canReroll: PROG.qre !== PROG.day,
    progWeekly: PROG.wq || [], weeklyDefs: WEEKLY_ALL, weeklyChestGold: WEEKLY_CHEST_GOLD || 100, weeklyChestClaimed: !!PROG.wchest,
    challenge: challengeNow(), challengeDef: challengeDef(), challengeLeft: challengeLeftText(),
    achDefs: ACH, progAch: PROG.ach || {}, progStats: PROG.st || {}, progLvl: PROG.lvl || 1, rewardReady: rewardReady()
  });
}

setTimeout(() => {
  const bRoadQ = document.getElementById('btnRoadQuests');
  if (bRoadQ) bRoadQ.onclick = () => toggleRoadQuestsSheet(true);
  const bCloseRoadQ = document.getElementById('btnCloseRoadQuests');
  if (bCloseRoadQ) bCloseRoadQ.onclick = () => toggleRoadQuestsSheet(false);
}, 100);

function renderProgressRoad() {
  const track = $('#ptab');
  if (!track || ptab !== 'road') return;
  const myLvl = PROG.lvl || 1, myCups = (PROG.cups || 0) + (PROG.hcups || 0), claimed = wallet.roadClaimed || [];
  const need = xpNeed(myLvl), pct = Math.max(0, Math.min(100, 100 * PROG.xp / need));
  const unlocked = m => myLvl >= m.lvl && myCups >= m.cups;
  const next = PROGRESS_ROAD_MILESTONES.find(m => !unlocked(m));
  const head = `<div class="rd-head"><div class="rd-lvl"><b>${myLvl}</b><small>уровень</small></div><div class="rd-info"><b>Прогресс</b>`
    + `<div class="xpbar"><i style="width:${pct.toFixed(1)}%"></i></div><small>${PROG.xp} / ${need} опыта до ${myLvl + 1} уровня · 🏆 ${myCups}</small></div></div>`
    + `<p class="rd-next">${next ? `Следующая награда: <b>${next.title}</b> — ${next.lvl} уровень и ${next.cups} 🏆` : 'Вы прошли всю дорогу, дальше — новые сезоны'}</p>`;
  track.innerHTML = head + roadMapHtml(PROGRESS_ROAD_MILESTONES, unlocked, claimed);
  roadBridges();
  if (roadScroll) {   // opening the tab: bring the level the player is at into view
    roadScroll = false;
    const el = track.querySelector('.rd-player-marker') || track.querySelector('.rd-n.current-milestone') || track.querySelector('.rd-n.unlocked') || track.querySelector('.rd-n.next');
    if (el) requestAnimationFrame(() => el.scrollIntoView({block: 'center', behavior: 'smooth'}));
  }
}

function claimRoadMilestone(id) {
  const m = PROGRESS_ROAD_MILESTONES.find(x => x.id === id);
  if (!m) return;
  const myLvl = PROG.lvl || 1, myCups = (PROG.cups || 0) + (PROG.hcups || 0);
  const isUnlocked = myLvl >= m.lvl && myCups >= m.cups;
  wallet.roadClaimed = wallet.roadClaimed || [];
  if (!isUnlocked || wallet.roadClaimed.includes(id)) return;
  wallet.roadClaimed.push(id);
  if (m.reward.gold) wallet.gold += m.reward.gold;
  if (m.reward.stars) COINS.give(wallet, m.reward.stars, 'star');
  if (m.reward.status) {
    if (!wallet.statuses) wallet.statuses = [];
    if (!wallet.statuses.includes(m.reward.status)) wallet.statuses.push(m.reward.status);
  }
  if (m.reward.frame && !(wallet.frames || []).includes(m.reward.frame)) {
    wallet.frames = [...(wallet.frames || []), m.reward.frame];
  }
  if (m.reward.fig && !(wallet.owned || []).includes(m.reward.fig)) {
    wallet.owned = [...(wallet.owned || []), m.reward.fig];
  }
  // emoji / phrase rewards: collected, and straight into the deck while it has room
  for (const kind of ['emote', 'phrase']) {
    const id = m.reward[kind], R = PG.state.reactions;
    if (!id || !R.grant(wallet, kind, id)) continue;
    const key = kind === 'emote' ? 'emotes' : 'phrases', cur = R.deck(wallet, kind);
    if (cur.length < 5 && !cur.includes(id)) wallet[key] = [...cur, id];
    R.claimCollections(wallet);
    renderSayBox();
  }
  beep('coin');
  saveWallet();
  toastAny(`Награда «${m.title}» получена! 🎉`);
  renderProgress();
  renderMenuProfile();
  progressDot();
}

/* The whole nickname is always shown on the main screen: a long one gets a smaller font (down to 10 px), never "…". */
function fitNick(b) {
  if (!b) return;
  b.style.fontSize = '';
  requestAnimationFrame(() => {
    let px = parseFloat(getComputedStyle(b).fontSize) || 15;
    while (b.scrollWidth > b.clientWidth + 1 && px > 10) { px -= .5; b.style.fontSize = px + 'px'; }
  });
}
addEventListener('resize', () => fitNick(document.querySelector('#mprof .mpi b')));
function renderMenuProfile() {
  const el = $('#mprof'); if (!el) return;
  try { earnedCheck(); } catch (_) {}
  const need = xpNeed(PROG.lvl), name = profileName(), pct = Math.max(0, Math.min(100, 100 * PROG.xp / need));
  // The plate says who you are and how far to the next level, in words: «Уровень 3», «120 / 200 опыта», a bar.
  const lk = AV.look(wallet);
  const isBannerShape = (wallet.avShape === 'rect');
  const curBanner = isBannerShape && wallet.banner && AV.BANNERS[wallet.banner] && AV.owns(wallet, 'banner', wallet.banner) ? AV.BANNERS[wallet.banner] : null;
  el.classList.toggle('has-banner', isBannerShape && !!curBanner);
  if (isBannerShape && curBanner) {
    el.style.setProperty('--banner-bg', `url(${curBanner.src})`);
    el.style.setProperty('--banner-pos', curBanner.pos || 'center');
  } else {
    el.style.removeProperty('--banner-bg');
    el.style.removeProperty('--banner-pos');
  }
  el.innerHTML = `<div class="mprof-shade"></div><span class="av${myRing() ? ' fr' : ''}${lk.cls}" style="--c:${wallet.color};${myRing() ? `--fr:${myRing()}` : ''}${lk.style}">${(name[0] || '?').toUpperCase()}</span>`
    + `<span class="mpi"><b>${name}</b><span class="mpl"><em>Уровень ${PROG.lvl}</em><small>${PROG.xp} / ${need} опыта</small></span>`
    + `<i class="mxp" role="progressbar" aria-valuemin="0" aria-valuemax="${need}" aria-valuenow="${PROG.xp}" aria-label="Опыт до уровня ${PROG.lvl + 1}"><i style="width:${pct.toFixed(1)}%"></i></i></span>`;
  fitNick(el.querySelector('.mpi b'));
  // Under the plate: trophies (to the rating) and gold (to the shop).
  const st = $('#mstat');
  const tiles = COINS.balance(wallet, 'tile'), stars = COINS.balance(wallet, 'star');

  // Under the plate: the two currencies, plain (to the shop), then the trophies (to the rating).
  if (st) st.innerHTML = `<button class="mpg menu-cur-trio" data-go="shop" title="Витрина и кошелёк" aria-label="Тайлы: ${tiles}, Звёзды: ${stars}">`
    + `<span class="mcur-item c-tile" title="Тайлы"><i class="coin c-tile"></i><b>${tiles}</b></span>`
    + `<span class="mcur-sep"></span>`
    + `<span class="mcur-item c-star" title="Звёзды"><i class="coin c-star"></i><b>${stars}</b></span>`
    + `</button>`
    + `<button class="mpc" data-go="rating" title="Рейтинг игроков" aria-label="Кубки: ${PROG.cups || 0}. Открыть рейтинг"><svg class="cup-svg-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd875" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M6 3h12v7a6 6 0 0 1-12 0V3z"/><path d="M12 16v4"/><path d="M8 20h8"/></svg> <b class="cupsN">${PROG.cups || 0}</b><small>кубков</small><i>›</i></button>`;
  renderMenuQuestBanner();
}
function renderProfile() {
  const need = xpNeed(PROG.lvl), name = profileName();
  const isGuest = !(fbAuth && fbAuth.email);
  const mail = !isGuest ? String(fbAuth.email).replace(/[<>&"]/g, '') : 'Гостевой профиль';
  const profEl = $('#profile');
  if (profEl) {
    const isBannerShape = (wallet.avShape === 'rect');
    const curBanner = isBannerShape && wallet.banner && AV.BANNERS[wallet.banner] && AV.owns(wallet, 'banner', wallet.banner) ? AV.BANNERS[wallet.banner] : null;
    const bannerSrc = curBanner ? curBanner.src : (isBannerShape ? 'tiles/rC.webp' : '');
    const bannerPos = curBanner ? (curBanner.pos || 'center') : 'center';

    profEl.classList.toggle('has-banner', isBannerShape && !!curBanner);
    if (isBannerShape && curBanner) {
      profEl.style.setProperty('--banner-bg', `url(${bannerSrc})`);
      profEl.style.setProperty('--banner-pos', bannerPos);
    } else {
      profEl.style.removeProperty('--banner-bg');
      profEl.style.removeProperty('--banner-pos');
    }

    const lk = AV.look(wallet);
    const avCls = isBannerShape
      ? `av big banner-crest${myRing() ? ' fr' : ''}`
      : `av big${myRing() ? ' fr' : ''}${lk.cls}`;
    const avStyle = isBannerShape
      ? `--c:${wallet.color};${myRing() ? `--fr:${myRing()};` : ''}`
      : `--c:${wallet.color};${myRing() ? `--fr:${myRing()};` : ''}${lk.style}`;

    const pct = Math.max(0, Math.min(100, 100 * PROG.xp / need));
    const achGot = ACH.filter(a => PROG.ach[a.id] === 'got').length;
    const hasBanner = isBannerShape && !!curBanner;
    const bannerHeroStyle = hasBanner ? `style="--banner-bg:url(${bannerSrc});--banner-pos:${bannerPos}"` : '';

    profEl.innerHTML = `
      <div class="pctop${hasBanner ? ' with-banner' : ''}" ${bannerHeroStyle}>
        <div class="prof-banner-shade"></div>
        <div class="prof-hero-row">
          <span class="${avCls}" style="${avStyle}">${(name[0] || '?').toUpperCase()}</span>
          <div class="pwho">
            <div class="pnick-row">
              <b class="pnick">${name}</b>
              ${myStatus() ? `<em class="fst">${myStatus()}</em>` : ''}
            </div>
          </div>
          <button class="iconbtn prof-banner-btn" id="profBannerTry" aria-label="Примерить баннер" title="Примерить баннер">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="7" cy="15" r="1.5"/>
            </svg>
          </button>
          <button class="iconbtn prof-edit-btn" id="profEdit" aria-label="Редактировать профиль" title="Настроить профиль">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="pclvl">
        <div class="lvl-badge">
          <b>${PROG.lvl}</b>
          <small>УР.</small>
        </div>
        <div class="pi">
          <div class="xp-meta">
            <b class="pl1">Уровень ${PROG.lvl}</b>
            <span class="xp-count">${PROG.xp} / ${need} XP</span>
          </div>
          <div class="xpbar"><i style="width:${pct.toFixed(1)}%"></i></div>
          <small class="xp-sub">До ${PROG.lvl + 1} уровня осталось ${Math.max(0, need - PROG.xp)} опыта</small>
        </div>
      </div>

      <div class="pchips">
        <div class="pchip-item cups-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="pc-svg cup-svg">
            <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M6 3h12v7a6 6 0 0 1-12 0V3z"/><path d="M12 16v4"/><path d="M8 20h8"/>
          </svg>
          <div class="pchip-text">
            <b>${PROG.cups || 0}</b>
            <small>Кубков</small>
          </div>
        </div>
        <div class="pchip-item ach-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="pc-svg ach-svg">
            <circle cx="12" cy="14" r="6"/><path d="M8.5 8.5L7 3l5 3 5-3-1.5 5.5"/>
          </svg>
          <div class="pchip-text">
            <b>${achGot} <span class="tot">/ ${ACH.length}</span></b>
            <small>Наград</small>
          </div>
        </div>
      </div>

      <div class="pcoins" data-go="shop" title="Открыть Витрину">
        <div class="pcoin-card cu">
          <i class="coin c-tile"></i>
          <div class="pcoin-info">
            <b>${COINS.balance(wallet, 'tile')}</b>
            <small>Тайлы</small>
          </div>
        </div>
        <div class="pcoin-card au">
          <i class="coin c-star"></i>
          <div class="pcoin-info">
            <b>${COINS.balance(wallet, 'star')}</b>
            <small>Звёзды</small>
          </div>
        </div>
      </div>

      ${FB ? `<div class="pacts">${isGuest
        ? '<button class="pact-btn guest-btn" data-hacct="in"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Войти или создать профиль</span><i class="pact-arr">›</i></button>'
        : '<button class="pact-btn logout-btn" data-hacct="out"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span>Выйти из аккаунта</span></button>'
      }</div>` : ''}
    `;
    const pe = $('#profEdit');
    if (pe) pe.onclick = editProfile;
    const pbt = $('#profBannerTry');
    if (pbt) pbt.onclick = () => openBannerFitting(wallet.banner || 'meadow');
    profEl.querySelectorAll('[data-hacct]').forEach(b => {
      b.onclick = () => {
        if (b.dataset.hacct === 'out') {
          confirmBox('Выйти из аккаунта?<br><small style="font-weight:500;color:var(--muted)">Прогресс сохранится в аккаунте. На этом устройстве начнётся новая игра, а войти можно будет в любой аккаунт</small>', 'Выйти', signOut);
        } else {
          accountDialog('login');
        }
      };
    });
  }

  const st = PROG.st = normalizeStats(PROG.st);
  const rate = st.games ? Math.round(100 * st.wins / st.games) : 0;
  const bm = st.byMode || {};
  const statsEl = $('#stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="sbig">
        <div class="sbig-card"><b>${st.games}</b><small>партий</small></div>
        <div class="sbig-card highlight"><b>${st.wins}</b><small>побед</small></div>
        <div class="sbig-card"><b>${rate}%</b><small>винрейт</small></div>
        <div class="sbig-card"><b>${st.best}</b><small>рекорд</small></div>
      </div>
      <div class="smastery">
        <div class="sec-title"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> <span>Мастерство по режимам</span></div>
        ${PG.ui.progress.renderMasteryGrid(bm)}
      </div>
      ${PG.ui.progress.renderBuildingStats(st)}
    `;
  }
}

function renderTasks() {
  questsToday();
  if (ptab !== 'road') { ptab = 'road'; setTimeout(() => toggleRoadQuestsSheet(true)); }
  document.querySelectorAll('#ptabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.pt === ptab));
  ptabsDot();
  const el = $('#ptab');
  if (ptab === 'road') renderProgressRoad();
  else if (ptab === 'rewards') {
    questsWeekly();
    el.innerHTML = (typeof PG !== 'undefined' && PG.ui && PG.ui.progress && PG.ui.progress.renderRewardsTabHtml)
      ? PG.ui.progress.renderRewardsTabHtml({
          progQuests: PROG.q || [],
          questDefs: QUESTS,
          canReroll: PROG.qre !== PROG.day,
          progWeekly: PROG.wq || [],
          weeklyDefs: WEEKLY_ALL,
          weeklyChestGold: WEEKLY_CHEST_GOLD || 100,
          weeklyChestClaimed: !!PROG.wchest,
          achDefs: ACH,
          progAch: PROG.ach || {},
          progStats: PROG.st || {},
          progLvl: PROG.lvl || 1,
          rewardReady: rewardReady()
        })
      : (() => {
          const rank = (done, got) => got ? 2 : done ? 0 : 1;
          const qDone = q => q.n >= QUESTS.find(x => x.id === q.id).n;
          const qRows = [...PROG.q].sort((a, b) => rank(qDone(a), a.got) - rank(qDone(b), b.got)).map(q => {
            const Q = QUESTS.find(x => x.id === q.id), done = q.n >= Q.n;
            return `<div class="quest${q.got ? ' got' : done ? ' done' : ''}"><span class="qi">${Q.ic}</span><span class="qt"><b>${Q.t}</b><div class="xpbar"><i style="width:${100 * q.n / Q.n}%"></i></div><small>${q.n} / ${Q.n} · <i class="coin"></i> ${Q.g}</small></span>${q.got ? '<span class="pill">Получено</span>' : done ? `<button class="chip pri" data-claimq="${q.id}">Забрать</button>` : ''}</div>`;
          }).join('');
          const aRows = [...ACH].sort((a, b) => rank(a.ok(PROG.st, PROG.lvl), PROG.ach[a.id] === 'got') - rank(b.ok(PROG.st, PROG.lvl), PROG.ach[b.id] === 'got')).map(a => {
            const ok = a.ok(PROG.st, PROG.lvl), got = PROG.ach[a.id] === 'got';
            return `<div class="quest${got ? ' got' : ok ? ' done' : ' lock'}"><span class="qi">${a.ic}</span><span class="qt"><b>${a.t}</b><small>${a.d} · <i class="coin"></i> ${a.g}</small></span>${got ? '<span class="pill">Получено</span>' : ok ? `<button class="chip pri" data-claima="${a.id}">Забрать</button>` : ''}</div>`;
          }).join('');
          const wqDone = q => { const WQ = WEEKLY_ALL.find(x => x.id === q.id); return WQ && q.n >= WQ.n; };
          const wqList = PROG.wq || [];
          const wqRows = [...wqList].sort((a, b) => rank(wqDone(a), a.got) - rank(wqDone(b), b.got)).map(q => {
            const WQ = WEEKLY_ALL.find(x => x.id === q.id) || {ic: '🎯', t: 'Цель', n: 1, g: 10};
            const done = q.n >= WQ.n;
            return `<div class="quest${q.got ? ' got' : done ? ' done' : ''}"><span class="qi">${WQ.ic}</span><span class="qt"><b>${WQ.t}</b><div class="xpbar"><i style="width:${Math.min(100, 100 * q.n / WQ.n)}%"></i></div><small>${q.n} / ${WQ.n} · <i class="coin"></i> ${WQ.g}</small></span>${q.got ? '<span class="pill">Получено</span>' : done ? `<button class="chip pri" data-claimwq="${q.id}">Забрать</button>` : ''}</div>`;
          }).join('');
          const allWqGot = wqList.length > 0 && wqList.every(q => q.got);
          const chestClaimed = !!PROG.wchest;
          const chestRow = `<div class="quest weekly-chest${chestClaimed ? ' got' : allWqGot ? ' done' : ''}"><span class="qi">🎁</span><span class="qt"><b>Большой сундук недели</b><small>${chestClaimed ? 'Сундук недели открыт' : allWqGot ? 'Все цели недели достигнуты!' : 'Выполните все ${wqList.length} цели недели'} · <i class="coin"></i> ${WEEKLY_CHEST_GOLD || 100}</small></span>${chestClaimed ? '<span class="pill">Получено</span>' : allWqGot ? '<button class="chip pri" data-claimwchest="1">Забрать +100</button>' : '<span class="pill lock">Заперт</span>'}</div>`;
          const wqGot = wqList.filter(q => q.got).length;

          const qGot = PROG.q.filter(q => q.got).length, aGot = ACH.filter(a => PROG.ach[a.id] === 'got').length;
          const nearQ = PROG.q.filter(q => !q.got).map(q => ({q, Q: QUESTS.find(x => x.id === q.id)})).filter(x => x.Q).sort((a, b) => (a.Q.n - a.q.n) / a.Q.n - (b.Q.n - b.q.n) / b.Q.n)[0];
          const goalLine = rewardReady() ? '<div class="goalline ready">🎁 Есть награды: заберите их ниже</div>' : nearQ ? `<div class="goalline">🎯 Ближайшая цель: <b>${nearQ.Q.t}</b> · ${nearQ.q.n}/${nearQ.Q.n}</div>` : '<div class="goalline">✅ Все задания на сегодня выполнены</div>';
          return `${goalLine}<div class="h3 sec">Задания на сегодня<em>${qGot} / ${PROG.q.length}</em></div>${qRows}<div class="h3 sec">Недельные цели<em>${wqGot} / ${wqList.length}</em></div>${wqRows}${chestRow}<div class="h3 sec">Достижения<em>${aGot} / ${ACH.length}</em></div>${aRows}`;
        })();
  } else if (ptab === 'rewards') { renderProgressRoad(); toggleRoadQuestsSheet(true); }
  else if (ptab === 'hist') renderHistory(el);
  else { ptab = 'road'; renderProgressRoad(); }
}
