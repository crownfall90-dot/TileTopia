// Progress and profile UI helpers (E-1.4)
// Renders level circles, mastery grids, and quests.

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
  // one card: the icon tile, the title, a bar with the count in it, and on the right the reward, the claim button or a tick
  const card = ({ic, title, n, need, reward, coin = 'tile', got, claim, swap = '', kind = 'q'}) => {
    const done = n >= need, pct = Math.min(100, 100 * n / need);
    const side = got ? '<span class="qk-got" aria-label="Получено">✓</span>'
      : done ? `<button class="qk-claim" ${claim}>Забрать<small><i class="coin ${coin}"></i>${reward}</small></button>`
      : `<span class="qk-rew"><i class="coin ${coin}"></i><b>${reward}</b></span>`;
    return `<div class="qk qk-${kind}${got ? ' got' : done ? ' done' : ''}"><span class="qk-ic">${ic}</span><span class="qk-body"><b>${title}</b>`
      + `<span class="qk-bar"><i style="width:${pct.toFixed(0)}%"></i><em>${Math.min(n, need)} / ${need}</em></span></span>${side}${swap}</div>`;
  };
  const qDone = q => { const Q = questDefs.find(x => x.id === q.id); return Q && q.n >= Q.n; };
  const qRows = [...progQuests].sort((a, b) => rank(qDone(a), a.got) - rank(qDone(b), b.got)).map(q => {
    const Q = questDefs.find(x => x.id === q.id) || {ic: '🎯', t: 'Задание', n: 1, g: 10};
    const swap = canReroll && !q.got && q.n < Q.n ? `<button class="qre" data-reroll="${q.id}" title="Заменить задание (раз в день)" aria-label="Заменить задание">↻</button>` : '';
    return card({ic: Q.ic, title: Q.t, n: q.n, need: Q.n, reward: Q.g, got: q.got, claim: `data-claimq="${q.id}"`, swap});
  }).join('');

  const wqDone = q => { const WQ = weeklyDefs.find(x => x.id === q.id); return WQ && q.n >= WQ.n; };
  const wqRows = [...progWeekly].sort((a, b) => rank(wqDone(a), a.got) - rank(wqDone(b), b.got)).map(q => {
    const WQ = weeklyDefs.find(x => x.id === q.id) || {ic: '🎯', t: 'Цель', n: 1, g: 10};
    return card({ic: WQ.ic, title: WQ.t, n: q.n, need: WQ.n, reward: WQ.g, got: q.got, claim: `data-claimwq="${q.id}"`, kind: 'w'});
  }).join('');

  const allWqGot = progWeekly.length > 0 && progWeekly.every(q => q.got);
  const wqGot = progWeekly.filter(q => q.got).length;
  const pips = progWeekly.map(q => `<i class="${q.got ? 'on' : ''}"></i>`).join('');
  const chestRow = `<div class="qk-chest${weeklyChestClaimed ? ' got' : allWqGot ? ' done' : ''}"><span class="qk-chest-ic">${weeklyChestClaimed ? '🧰' : '🎁'}</span>`
    + `<span class="qk-body"><b>Большой сундук недели</b><small>${weeklyChestClaimed ? 'Открыт — новый на следующей неделе' : allWqGot ? 'Все цели недели достигнуты!' : `Выполните все ${progWeekly.length} цели недели`}</small><span class="qk-pips">${pips}</span></span>`
    + (weeklyChestClaimed ? '<span class="qk-got">✓</span>' : allWqGot ? `<button class="qk-claim" data-claimwchest="1">Открыть<small><i class="coin tile"></i>${weeklyChestGold}</small></button>` : `<span class="qk-rew lock"><i class="coin tile"></i><b>${weeklyChestGold}</b></span>`) + '</div>';

  const qGot = progQuests.filter(q => q.got).length;
  const nearQ = progQuests.filter(q => !q.got).map(q => ({q, Q: questDefs.find(x => x.id === q.id)})).filter(x => x.Q).sort((a, b) => (a.Q.n - a.q.n) / a.Q.n - (b.Q.n - b.q.n) / b.Q.n)[0];
  const goalLine = rewardReady ? '<div class="goalline ready">🎁 Есть награды: заберите их ниже</div>' : nearQ ? `<div class="goalline">🎯 Ближайшая цель: <b>${nearQ.Q.t}</b> · ${nearQ.q.n}/${nearQ.Q.n}</div>` : '<div class="goalline">✅ Все задания на сегодня выполнены</div>';
  const ringSvg = (got, all, label) => { const f = all ? got / all : 0, C = 2 * Math.PI * 22; return `<span class="qk-ring"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" class="bg"/><circle cx="26" cy="26" r="22" class="fg" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}"/></svg><b>${got}/${all}</b><small>${label}</small></span>`; };
  const hero = `<div class="qk-hero">${ringSvg(qGot, progQuests.length, 'сегодня')}${ringSvg(wqGot, progWeekly.length, 'неделя')}<div class="qk-hero-txt">${goalLine}<small>Новые задания каждый день · одно можно заменить ↻</small></div></div>`;

  return `${hero}<div class="h3 sec">Задания на сегодня<em>${qGot} / ${progQuests.length}</em></div><div class="qk-list">${qRows}</div><div class="h3 sec">Недельные цели<em>${wqGot} / ${progWeekly.length}</em></div><div class="qk-list">${wqRows}${chestRow}</div>`;
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

  const tierNames = { 1: 'Бронза', 2: 'Серебро', 3: 'Золото', 4: 'Платина', bronze: 'Бронза', silver: 'Серебро', gold: 'Золото' };

  const aRows = [...achDefs].sort((a, b) => {
    const rA = rank(a.ok(progStats, progLvl), progAch[a.id] === 'got');
    const rB = rank(b.ok(progStats, progLvl), progAch[b.id] === 'got');
    if (rA !== rB) return rA - rB;
    return ({bronze:1,silver:2,gold:3}[a.tier] || a.tier || 1) - ({bronze:1,silver:2,gold:3}[b.tier] || b.tier || 1);
  }).map(a => {
    const ok = a.ok(progStats, progLvl), got = progAch[a.id] === 'got';
    const tierName = tierNames[a.tier] || '';
    const tierTag = tierName ? `<span class="ach-tier-tag tier-${a.tier}">${tierName}</span>` : '';
    const statusPill = got
      ? '<span class="pill ach-done-pill">Получено ✓</span>'
      : ok
      ? `<button class="chip pri ach-claim-btn" data-claima="${a.id}">Забрать +${a.g} <i class="coin ${a.coin || 'tile'}"></i></button>`
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
          <div class="ach-reward-val"><i class="coin ${a.coin || 'tile'}"></i> +${a.g} ${a.coin === 'star' ? 'звёзд' : 'тайлов'}</div>
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
          <h3>Достижения</h3>
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
  const tile = (v, l, c) => `<span class="hs-t ${c}"><b>${v}</b><small>${l}</small></span>`;
  const sum = `<div class="hsum2">${tile(rows.length, 'партий', 'all')}${tile(wins, 'побед', 'win')}${tile(rows.filter(r => /^o:/.test(r.id)).length, 'онлайн', 'on')}</div>`;

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
    const top = Math.max(1, ...ps.map(p => +p.score || 0));
    const res = r.reason === 'draw' ? 'draw' : head.includes('Победа') ? 'win' : head === 'Поражение' ? 'loss' : 'place';
    const medal = res === 'win' ? '🥇' : me === 1 ? '🥈' : me === 2 ? '🥉' : res === 'draw' ? '🤝' : '🎲';
    const who = ps.map((p, k) => {
      const cleanName = String(p.name || 'Игрок').replace(/[<>&"]/g, '');
      const validCol = typeof p.col === 'string' && /^#[0-9a-f]{6}$/i.test(p.col) ? p.col : '';
      const uidStr = String(p.uid || '').replace(/[^\w-]/g, '').slice(0, 64);
      const isFr = isFriendFn(p.uid);
      const plData = (online && p.uid && !p.me && !p.bot) ? ` data-pl="${uidStr}" data-n="${cleanName}" data-c="${validCol}"` : '';
      const addBtn = (online && p.uid && !p.me && !p.bot && !isFr) ? `<button class="chip hadd" data-uid="${uidStr}" data-n="${cleanName}">+ в друзья</button>` : '';
      const resignedTag = p.resigned ? ' <small>(сдался)</small>' : '';
      return `<span class="hp2${p.me ? ' me' : ''}"${plData}><em>${k + 1}</em><i style="--c:${validCol || '#5b6684'}"></i><span class="hp2-n">${cleanName}${resignedTag}</span>`
        + `<span class="hp2-bar"><i style="width:${Math.round(100 * (+p.score || 0) / top)}%;--c:${validCol || '#5b6684'}"></i></span><b>${+p.score || 0}</b>${addBtn}</span>`;
    }).join('');
    return `<div class="hrow2 ${res}"><div class="hr2-head"><span class="hr2-medal">${medal}</span><span class="hr2-title"><b>${head.replace('🏆 ', '')}</b><small>${when(r.at)} · ${online ? 'онлайн' : 'офлайн'}</small></span></div><div class="hr2-board">${who}</div></div>`;
  }).join('');
}
