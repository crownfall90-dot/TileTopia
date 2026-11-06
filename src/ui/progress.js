// Progress and profile UI helpers (E-1.4)
// Renders level circles, mastery grids, quests, and collection cards.

/** Generates circular SVG progress ring. */
export function ringSvg(frac) {
  const c = 2 * Math.PI * 26;
  return `<svg width="58" height="58" viewBox="0 0 58 58">` +
    `<circle cx="29" cy="29" r="26" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="5"/>` +
    `<circle cx="29" cy="29" r="26" fill="none" stroke="#f2b84b" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(2)} ${c.toFixed(2)}"/>` +
    `</svg>`;
}

/** Generates HTML markup for the game modes mastery statistics grid. */
export function renderMasteryGrid(byMode = {}) {
  const tile = (key, ic, name) => {
    const m = byMode[key] || {}, g = m.games || 0, w = m.wins || 0, rate = g ? Math.round(100 * w / g) : 0;
    const body = g ? `<small>${rate}% (${w}/${g}) · рек. ${m.best || 0}</small>` : '<small class="mnone">Сыграйте первую партию</small>';
    return `<div class="mcard${g ? '' : ' empty'}"><span class="mic">${ic}</span><div><b>${name}</b>${body}</div></div>`;
  };
  return `<div class="mgrid">${tile('bots', '🤖', 'Боты')}${tile('friends', '👥', 'Друзья')}${tile('online', '🌐', 'Онлайн')}</div>`;
}

/** Generates HTML markup for completed features summary (cities, roads, forts). */
export function renderBuildingStats(st = {}) {
  const maxCityText = st.maxCity ? ` <small>(рекорд: ${st.maxCity} карт)</small>` : '';
  return `<div class="sbuild">` +
    `<span>🏰 <b>${st.c || 0}</b> городов${maxCityText}</span>` +
    `<span>🛤 <b>${st.r || 0}</b> дорог</span>` +
    `<span>⛪ <b>${st.f || 0}</b> монастырей</span>` +
    `</div>`;
}

/** Generates HTML markup for a single collection card. */
export function renderCollectionCard(col, prog, figs, frames, wallet, figPreview, initial) {
  const nameInitial = (initial || '?').toUpperCase();
  const figItems = (col.figs || []).map(k => {
    const f = figs[k] || {name: k};
    const has = prog.figsDone && prog.figsDone.has(k);
    return `<span class="col-item${has ? ' has' : ''}"><img src="${figPreview(k)}" alt=""><span>${f.name}</span><i class="cchk">${has ? '✓' : '—'}</i></span>`;
  }).join('');

  const frameItems = (col.frames || []).map(k => {
    const f = frames[k] || {name: k};
    const has = prog.framesDone && prog.framesDone.has(k);
    return `<span class="col-item${has ? ' has' : ''}"><span class="av mini${f.ring ? ' fr' : ''}" style="--c:${wallet.color || '#ef5350'};${f.ring ? `--fr:${f.ring}` : ''}">${nameInitial}</span><span>${f.name}</span><i class="cchk">${has ? '✓' : '—'}</i></span>`;
  }).join('');

  const pct = Math.min(100, Math.round(100 * prog.done / prog.total));
  const actionBtn = prog.isClaimed
    ? '<span class="pill">Собрано</span>'
    : prog.isComplete
      ? `<button class="chip pri" data-claimcol="${col.id}">Забрать +${col.reward}</button>`
      : '<span class="pill lock">В процессе</span>';

  return `<div class="col-card${prog.isClaimed ? ' got' : prog.isComplete ? ' done' : ''}">` +
    `<div class="col-head"><span class="col-ic">${col.ic}</span><div class="col-info"><b>${col.name}</b><small>${col.desc}</small></div><span class="col-rew"><i class="coin"></i> +${col.reward}</span></div>` +
    `<div class="col-grid">${figItems}${frameItems}</div>` +
    `<div class="col-foot"><div class="xpbar"><i style="width:${pct}%"></i></div><small>${prog.done} / ${prog.total}</small>${actionBtn}</div>` +
    `</div>`;
}

/** Generates HTML markup for Rewards tab (daily quests, weekly quests, achievements). */
export function renderRewardsTabHtml({
  progQuests = [],
  questDefs = [],
  canReroll = false,
  progWeekly = [],
  weeklyDefs = [],
  weeklyChestGold = 100,
  weeklyChestClaimed = false,
  achDefs = [],
  progAch = {},
  progStats = {},
  progLvl = 1,
  rewardReady = false,
}) {
  const rank = (done, got) => got ? 2 : done ? 0 : 1;
  const qDone = q => { const Q = questDefs.find(x => x.id === q.id); return Q && q.n >= Q.n; };
  const qRows = [...progQuests].sort((a, b) => rank(qDone(a), a.got) - rank(qDone(b), b.got)).map(q => {
    const Q = questDefs.find(x => x.id === q.id) || {ic: '🎯', t: 'Задание', n: 1, g: 10};
    const done = q.n >= Q.n;
    const swap = canReroll && !q.got && !done ? `<button class="qre" data-reroll="${q.id}" title="Заменить задание (раз в день)" aria-label="Заменить задание">↻</button>` : '';
    return `<div class="quest${q.got ? ' got' : done ? ' done' : ''}"><span class="qi">${Q.ic}</span><span class="qt"><b>${Q.t}</b><div class="xpbar"><i style="width:${100 * q.n / Q.n}%"></i></div><small>${q.n} / ${Q.n} · <i class="coin"></i> ${Q.g}</small></span>${swap}${q.got ? '<span class="pill">Получено</span>' : done ? `<button class="chip pri" data-claimq="${q.id}">Забрать</button>` : ''}</div>`;
  }).join('');

  const aRows = [...achDefs].sort((a, b) => rank(a.ok(progStats, progLvl), progAch[a.id] === 'got') - rank(b.ok(progStats, progLvl), progAch[b.id] === 'got')).map(a => {
    const ok = a.ok(progStats, progLvl), got = progAch[a.id] === 'got';
    return `<div class="quest${got ? ' got' : ok ? ' done' : ' lock'}${a.tier ? ' tier-' + a.tier : ''}"><span class="qi">${a.ic}</span><span class="qt"><b>${a.t}</b><small>${a.d} · <i class="coin"></i> ${a.g}</small></span>${got ? '<span class="pill">Получено</span>' : ok ? `<button class="chip pri" data-claima="${a.id}">Забрать</button>` : ''}</div>`;
  }).join('');

  const wqDone = q => { const WQ = weeklyDefs.find(x => x.id === q.id); return WQ && q.n >= WQ.n; };
  const wqRows = [...progWeekly].sort((a, b) => rank(wqDone(a), a.got) - rank(wqDone(b), b.got)).map(q => {
    const WQ = weeklyDefs.find(x => x.id === q.id) || {ic: '🎯', t: 'Цель', n: 1, g: 10};
    const done = q.n >= WQ.n;
    return `<div class="quest${q.got ? ' got' : done ? ' done' : ''}"><span class="qi">${WQ.ic}</span><span class="qt"><b>${WQ.t}</b><div class="xpbar"><i style="width:${Math.min(100, 100 * q.n / WQ.n)}%"></i></div><small>${q.n} / ${WQ.n} · <i class="coin"></i> ${WQ.g}</small></span>${q.got ? '<span class="pill">Получено</span>' : done ? `<button class="chip pri" data-claimwq="${q.id}">Забрать</button>` : ''}</div>`;
  }).join('');

  const allWqGot = progWeekly.length > 0 && progWeekly.every(q => q.got);
  const chestRow = `<div class="quest weekly-chest${weeklyChestClaimed ? ' got' : allWqGot ? ' done' : ''}"><span class="qi">🎁</span><span class="qt"><b>Большой сундук недели</b><small>${weeklyChestClaimed ? 'Сундук недели открыт' : allWqGot ? 'Все цели недели достигнуты!' : 'Выполните все ${progWeekly.length} цели недели'} · <i class="coin"></i> ${weeklyChestGold}</small></span>${weeklyChestClaimed ? '<span class="pill">Получено</span>' : allWqGot ? '<button class="chip pri" data-claimwchest="1">Забрать +100</button>' : '<span class="pill lock">Заперт</span>'}</div>`;
  const wqGot = progWeekly.filter(q => q.got).length;

  const qGot = progQuests.filter(q => q.got).length;
  const nearQ = progQuests.filter(q => !q.got).map(q => ({q, Q: questDefs.find(x => x.id === q.id)})).filter(x => x.Q).sort((a, b) => (a.Q.n - a.q.n) / a.Q.n - (b.Q.n - b.q.n) / b.Q.n)[0];
  const goalLine = rewardReady ? '<div class="goalline ready">🎁 Есть награды: заберите их ниже</div>' : nearQ ? `<div class="goalline">🎯 Ближайшая цель: <b>${nearQ.Q.t}</b> · ${nearQ.q.n}/${nearQ.Q.n}</div>` : '<div class="goalline">✅ Все задания на сегодня выполнены</div>';

  return `${goalLine}<div class="h3 sec">Задания на сегодня<em>${qGot} / ${progQuests.length}</em></div>${qRows}<div class="h3 sec">Недельные цели<em>${wqGot} / ${progWeekly.length}</em></div>${wqRows}${chestRow}`;
}

/** Generates HTML markup for the dedicated Achievements screen. */
export function renderAchievementsHtml({
  achDefs = [],
  progAch = {},
  progStats = {},
  progLvl = 1,
} = {}) {
  const rank = (done, got) => got ? 2 : done ? 0 : 1;
  const readyCount = achDefs.filter(a => !progAch[a.id] && a.ok(progStats, progLvl)).length;
  const gotCount = achDefs.filter(a => progAch[a.id] === 'got').length;
  const totalCount = achDefs.length;

  const tierNames = { 1: 'Бронза', 2: 'Серебро', 3: 'Золото', 4: 'Платина' };

  const aRows = [...achDefs].sort((a, b) => {
    const rA = rank(a.ok(progStats, progLvl), progAch[a.id] === 'got');
    const rB = rank(b.ok(progStats, progLvl), progAch[b.id] === 'got');
    if (rA !== rB) return rA - rB;
    return (a.tier || 1) - (b.tier || 1);
  }).map(a => {
    const ok = a.ok(progStats, progLvl), got = progAch[a.id] === 'got';
    const tierName = tierNames[a.tier] || '';
    const tierTag = tierName ? `<span class="ach-tier-tag tier-${a.tier}">${tierName}</span>` : '';
    const statusPill = got
      ? '<span class="pill ach-done-pill">Получено ✓</span>'
      : ok
      ? `<button class="chip pri ach-claim-btn" data-claima="${a.id}">Забрать +${a.g} <i class="coin"></i></button>`
      : '<span class="pill lock">В процессе</span>';

    return `
      <div class="quest ach-card${got ? ' got' : ok ? ' done ready-glow' : ' lock'}${a.tier ? ' tier-' + a.tier : ''}">
        <span class="qi ach-qi">${a.ic}</span>
        <span class="qt ach-qt">
          <div class="ach-row-head">
            <b>${a.t}</b>
            ${tierTag}
          </div>
          <small class="ach-desc">${a.d}</small>
          <div class="ach-reward-val"><i class="coin"></i> +${a.g} монет</div>
        </span>
        <div class="ach-action-wrap">
          ${statusPill}
        </div>
      </div>`;
  }).join('');

  const summaryHeader = `
    <div class="ach-header-card">
      <div class="ach-header-left">
        <span class="ach-trophy-icon">🎖️</span>
        <div>
          <h3>Зал славы королевства</h3>
          <p>Собрано <b>${gotCount}</b> из <b>${totalCount}</b> достижений${readyCount ? ` · <b class="ach-ready-notice">${readyCount} готово к получению!</b>` : ''}</p>
        </div>
      </div>
    </div>`;

  return `${summaryHeader}<div class="ach-list">${aRows}</div>`;
}

/** Generates HTML markup for match history tab. */
export function renderHistoryHtml(rows = [], isFriendFn = () => false) {
  if (!rows.length) return '<p class="shint">Здесь появятся ваши партии — сыграйте первую</p>';
  const when = t => {
    const d = new Date(t), p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const wins = rows.filter(r => {
    if (r.reason === 'draw' || r.reason === 'cancel') return false;
    const ps = (Array.isArray(r.players) ? r.players.slice() : []).sort((a, b) => (a.resigned ? 1 : 0) - (b.resigned ? 1 : 0) || (b.score || 0) - (a.score || 0));
    return Boolean(ps[0] && ps[0].me && !ps[0].resigned);
  }).length;
  const sum = `<div class="hsum"><b>${rows.length}</b> последних партий · 🏆 <b>${wins}</b> побед · онлайн <b>${rows.filter(r => /^o:/.test(r.id)).length}</b></div>`;

  return sum + rows.map(r => {
    const ps = (Array.isArray(r.players) ? r.players.slice() : []).sort((a, b) => (a.resigned ? 1 : 0) - (b.resigned ? 1 : 0) || (b.score || 0) - (a.score || 0));
    const me = ps.findIndex(p => p.me);
    const myPlayer = me >= 0 ? ps[me] : null;
    const online = /^o:/.test(r.id);
    const head = r.reason === 'draw' ? 'Ничья'
      : (myPlayer && myPlayer.resigned) || r.reason === 'cancel' ? 'Поражение'
      : me === 0 ? '🏆 Победа'
      : me > 0 ? `${me + 1}-е место`
      : 'Партия';
    const who = ps.map(p => {
      const cleanName = String(p.name || 'Игрок').replace(/[<>&"]/g, '');
      const validCol = typeof p.col === 'string' && /^#[0-9a-f]{6}$/i.test(p.col) ? p.col : '';
      const uidStr = String(p.uid || '').replace(/[^\w-]/g, '').slice(0, 64);
      const isFr = isFriendFn(p.uid);
      const plData = (online && p.uid && !p.me && !p.bot) ? ` data-pl="${uidStr}" data-n="${cleanName}" data-c="${validCol}"` : '';
      const addBtn = (online && p.uid && !p.me && !p.bot && !isFr) ? `<button class="chip hadd" data-uid="${uidStr}" data-n="${cleanName}">+ в друзья</button>` : '';
      const resignedTag = p.resigned ? ' <small style="color:var(--muted)">(сдался)</small>' : '';
      return `<span class="hp${p.me ? ' me' : ''}"${plData}><i style="--c:${validCol || '#5b6684'}"></i>${cleanName}${resignedTag} <b>${+p.score || 0}</b>${addBtn}</span>`;
    }).join('');
    return `<div class="quest hrow"><span class="qi">${online ? '🌐' : '🤖'}</span><span class="qt"><b>${head}</b><small>${when(r.at)} · ${online ? 'онлайн' : 'офлайн'}</small><span class="hps">${who}</span></span></div>`;
  }).join('');
}
