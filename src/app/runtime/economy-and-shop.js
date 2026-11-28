/* ---------------- gold, figures, shop ----------------
   Gold lives on this phone only (no accounts yet) and is never sold for money. */
// The shop catalogue lives in src/state/catalog.js.
const {FIGS, LOCS, CHEST_SVG, CHEST_OPEN_SVG, FRAMES} = PG.state.catalog;
// The player's own avatar frame: style for an avatar element (empty when none).
const myRing = () => (FRAMES[wallet.frame] || FRAMES.none).ring;
const randomFig = () => { const k = Object.keys(FIGS); return k[(Math.random() * k.length) | 0]; };
const today = () => new Date().toISOString().slice(0, 10);
// The wallet's storage lives in src/state/wallet.js.
// A checksum mismatch is reported, never punished (see walletSig): the gold stays.
const wallet = PG.state.loadWallet(localStorage, validCol, PALETTE[0].col, info => track('wallet_sig_mismatch', info));
// Emoji and phrases are bought in the shop now: what an older version let the player pick stays theirs.
PG.state.reactions.migrate(wallet); PG.state.reactions.sanitizeDeck(wallet);
// Analytics (Firebase Analytics in the Android app; elsewhere a no-op). Params: flat strings / numbers.
function track(name, params) {
  // Statistics only with the player's consent (Settings → Statistics); errors and security events need none.
  if (!PG.state.usage.mayRecord(name, wallet.stats)) return;
  try { if (window.AndroidApp && AndroidApp.logEvent) AndroidApp.logEvent(name, JSON.stringify(params || {})); } catch (_) {}
  if (LOG_KINDS.has(name)) plog(name, params);
}
// Firebase Analytics collection in the Android app follows the same consent (off until the player agrees).
function applyStatsConsent() { try { if (window.AndroidApp && AndroidApp.setAnalytics) AndroidApp.setAnalytics(wallet.stats === true); } catch (_) {} }
/* Event log for the owner's panel: the few events that explain what happened to a player (sign-in, games, drops, errors,
   purchases) go to /logs/{uid}, in batches, at most 80 a day per phone. No e-mails and no texts typed by the player. */
const LOG_KINDS = new Set([
  'reinstall_offer', 'reinstall_download', 'reinstall_remove', 'open', 'login', 'sign_up', 'logout',
  'game_start', 'game_end', 'net_down', 'net_back', 'google_error', 'google_redirect', 'spend_virtual_currency',
  'tutorial_begin', 'tutorial_complete', 'wallet_sig_mismatch', 'friend_invite', 'error', 'maintenance',
  'first_open', 'first_game_done', 'second_game_done', 'third_game_done', 'save_prompt_tap', 'return_d1', 'return_d3', 'return_d7',
  'perf_lag', 'name_suggested', 'feedback_sent', 'first_online_move'
]);
const logBuf = [];
let logTimer = 0;
function plog(kind, detail) {
  try {
    if (!PG.state.usage.mayRecord(String(kind), wallet.stats)) return;
    const day = new Date().toISOString().slice(0, 10), cap = JSON.parse(localStorage.getItem('logCap') || '{}');
    if (cap.d !== day) { cap.d = day; cap.n = 0; }
    if (cap.n >= 80) return;
    cap.n++; localStorage.setItem('logCap', JSON.stringify(cap));
    let d = detail == null ? '' : typeof detail === 'string' ? detail : JSON.stringify(detail);
    d = d.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '…').slice(0, 240); // never an address
    logBuf.push({k: String(kind).slice(0, 24), d, c: Date.now()});
    if (logBuf.length >= 12) logFlush(); else if (!logTimer) logTimer = setTimeout(logFlush, 20000);
  } catch (_) {}
}
async function logFlush(keepalive) {
  clearTimeout(logTimer); logTimer = 0;
  if (!logBuf.length) return;
  try {
    if (typeof FBC === 'undefined' || !FBC) return;
    if (!FBC.load()?.uid && wallet.stats !== true) { logBuf.length = 0; return; }
    const tok = await FBC.token(), uid = FBC.session() && FBC.session().uid; if (!uid) return;
    const batch = logBuf.splice(0, 30), body = {};
    batch.forEach((e, i) => { body[e.c.toString(36) + i.toString(36) + Math.random().toString(36).slice(2, 5)] = {t: {'.sv': 'timestamp'}, k: e.k, c: e.c, ...(e.d ? {d: e.d} : {})}; });
    const r = await fetch(`${FB.dbUrl}/logs/${uid}.json?auth=${tok}`, {method: 'PATCH', body: JSON.stringify(body), keepalive: !!keepalive});
    if (!r.ok) throw 0;
  } catch (_) { /* the rules may not be published yet, or no network: the events are dropped, never retried forever */ }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) logFlush(true); });
function saveWallet() {
  PG.state.storeWallet(localStorage, wallet);
  document.querySelectorAll('.goldN').forEach(e => e.textContent = wallet.gold);
  document.querySelectorAll('[data-coin]').forEach(e => e.textContent = COINS.balance(wallet, e.dataset.coin));
  if (typeof cloudSaveSoon === 'function') cloudSaveSoon();
}
function timeUntilMidnightStr() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = Math.max(0, midnight - now);
  const h = String(Math.floor(diffMs / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Daily gift in the shop: a chest once a day with gold, a one-game boost or, rarely, a figure.
const giftReady = () => wallet.dailyBox !== today();
function dailyBonus() {
  const isReady = giftReady();
  document.querySelectorAll('.goldchip').forEach(c => c.classList.toggle('hasgift', isReady));
  const ns = $('#navShop'); if (ns) ns.classList.toggle('hasdot', isReady);
  const mgp = $('#menuGiftPill'); if (mgp) mgp.hidden = !isReady;
  if (isReady && wallet.daily !== today()) { wallet.daily = today(); saveWallet(); }
}

function getDailyTrioOptions() {
  if (wallet.dailyTrio && wallet.dailyTrio.date === today() && Array.isArray(wallet.dailyTrio.options) && wallet.dailyTrio.options.length === 3) {
    return wallet.dailyTrio;
  }
  const notOwned = Object.keys(FIGS).filter(k => !wallet.owned.includes(k));
  const options = [];

  // 1. Куш тайлов (35-50)
  const g1 = 35 + ((Math.random() * 4) | 0) * 5;
  options.push({ type: 'gold', amount: g1, title: `+${g1} тайлов`, sub: 'Куш тайлов' });

  // 2. Буст удвоения тайлов + 25
  const g2 = 25;
  options.push({ type: 'boost_double', amount: g2, title: `+${g2} 💰 и ×2 тайлов`, sub: 'Двойные тайлы' });

  // 3. Буст фигурки или редкая фигурка
  if (notOwned.length && Math.random() < 0.2) {
    const figKey = notOwned[(Math.random() * notOwned.length) | 0];
    options.push({ type: 'fig', figKey, title: `Фигурка «${FIGS[figKey].name}»!`, sub: 'Новая фигурка' });
  } else {
    const g3 = 25;
    options.push({ type: 'boost_meeple', amount: g3, title: `+${g3} 💰 и +1 фигурка`, sub: 'Запасная фигурка' });
  }

  // Перемешиваем по 3 сундукам
  options.sort(() => Math.random() - 0.5);
  const data = { date: today(), options, chosenIdx: null };
  wallet.dailyTrio = data;
  saveWallet();
  return data;
}

let openingTrioChest = false;
let giftCountdownInterval = null;
function startGiftCountdownTimer() {
  if (giftCountdownInterval) return;
  giftCountdownInterval = setInterval(() => {
    const el = document.getElementById('giftCountdown');
    if (el) el.textContent = timeUntilMidnightStr();
  }, 1000);
}

function pickDailyChest(idx, trioData, btn, container) {
  if (openingTrioChest || !giftReady() || !trioData || !trioData.options) return;
  const chosen = trioData.options[idx];
  if (!chosen) return;
  openingTrioChest = true;

  // streak logic removed

  // 1. Снимаем idle анимацию со всех сундуков
  container.querySelectorAll('.gift-chest-btn').forEach(b => b.classList.remove('idle'));

  // 2. Тряска выбранного сундука (предвкушение)
  btn.classList.add('shaking');
  beep('click');
  try { if (typeof telegramHaptic === 'function') telegramHaptic('impact', 'medium'); } catch(_) {}

  setTimeout(() => {
    btn.classList.remove('shaking');
    btn.classList.add('opened', 'chosen');
    const art = btn.querySelector('.gift-chest-art');
    if (art) art.innerHTML = (typeof CHEST_OPEN_SVG !== 'undefined') ? CHEST_OPEN_SVG : CHEST_SVG;
    const hint = btn.querySelector('.gift-chest-hint');
    if (hint) {
      hint.className = 'gift-chest-hint chosen-hint';
      hint.textContent = 'Ваш выбор 🏆';
    }

    // Всплывающий бейдж награды над сундуком
    const badge = document.createElement('div');
    badge.className = 'gift-prize-reveal';
    badge.innerHTML = chosen.title;
    btn.prepend(badge);

    beep('win');
    setTimeout(() => beep('coin'), 180);
    try { if (typeof telegramHaptic === 'function') telegramHaptic('notification', 'success'); } catch(_) {}

    // Начисляем награду
    if (chosen.type === 'gold') {
      wallet.gold += chosen.amount;
    } else if (chosen.type === 'boost_double') {
      wallet.gold += chosen.amount;
      wallet.boosts.double = (wallet.boosts.double || 0) + 1;
    } else if (chosen.type === 'boost_meeple') {
      wallet.gold += chosen.amount;
      wallet.boosts.meeple = (wallet.boosts.meeple || 0) + 1;
    } else if (chosen.type === 'fig') {
      if (!wallet.owned.includes(chosen.figKey)) wallet.owned.push(chosen.figKey);
    }

    wallet.dailyBox = today();
    trioData.chosenIdx = idx;
    wallet.dailyTrio = trioData;
    saveWallet();
    dailyBonus();
    document.querySelectorAll('.goldN').forEach(e => e.textContent = wallet.gold);
    toastAny(`🎉 Получено: ${chosen.title}!`);

    // 3. Вскрываем два других сундука в ghost-режиме, наглядно отображая что было в каждом!
    setTimeout(() => {
      container.querySelectorAll('.gift-chest-btn[data-gidx]').forEach(otherBtn => {
        const oIdx = parseInt(otherBtn.dataset.gidx, 10);
        if (oIdx !== idx) {
          const otherPrize = trioData.options[oIdx];
          otherBtn.classList.add('ghost');
          const oArt = otherBtn.querySelector('.gift-chest-art');
          if (oArt) oArt.innerHTML = (typeof CHEST_OPEN_SVG !== 'undefined') ? CHEST_OPEN_SVG : CHEST_SVG;
          const oHint = otherBtn.querySelector('.gift-chest-hint');
          if (oHint) {
            oHint.innerHTML = `<span class="gift-chest-ghost-note">А здесь было:<br><b>${otherPrize ? otherPrize.title : '...'}</b></span>`;
          }
        }
      });

      // Обновляем подзаголовок на таймер
      const sub = container.querySelector('.gift-showcase-sub');
      if (sub) {
        sub.innerHTML = `Подарок на сегодня получен ✓ Следующий сундук через: <b id="giftCountdown" class="countdown-gold">${timeUntilMidnightStr()}</b>`;
      }
      startGiftCountdownTimer();
      openingTrioChest = false;
    }, 400);
  }, 450);
}

function openGift(forceCalendar = false) {
  show('shop');
  const g = $('#gift');
  if (g) g.scrollIntoView({behavior: 'smooth', block: 'start'});
}
/* Daily streak: the first visit of each day pays gold that grows day by day for a week
   (10 → 100), then the week starts again. Missing a day starts the streak over. Days are
   the phone's local calendar days. */
const localDay = (shift = 0) => { const d = new Date(Date.now() + shift * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function streakState() {
  const st = wallet.streak || {n: 0, last: ''};
  const curWeek = (PG.state.progress && PG.state.progress.weekId) ? PG.state.progress.weekId() : 'w1';
  const freezeAvail = !st.freezeWeek || st.freezeWeek !== curWeek;
  const isYesterday = st.last === localDay(-1);
  const isTwoDaysAgo = st.last === localDay(-2);
  let next = 1;
  let usedFreeze = false;
  if (isYesterday) {
    next = (st.n || 0) + 1;
  } else if (isTwoDaysAgo && freezeAvail && (st.n || 0) >= 1) {
    next = (st.n || 0) + 1;
    usedFreeze = true;
  }
  return {st, ready: st.last !== localDay(), next, day: (next - 1) % 7, usedFreeze, freezeAvail};
}
function streakCheck() {
  return;
  const {st, ready, next, day, usedFreeze, freezeAvail} = streakState();
  if (!ready) return;
  const lost = st.n > 1 && next === 1;
  const gold = STREAK_GOLD[day];
  const cells = STREAK_GOLD.map((g, i) => `<li class="${i < day ? 'done' : i === day ? 'now' : ''}${i === 6 ? ' big' : ''}"><small>День ${i + 1}</small>${i < day ? '<b>✓</b>' : `<b><i class="coin"></i>${g}</b>`}</li>`).join('');
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  const freezeMsg = usedFreeze ? '<p class="streak-freeze-badge">🧊 Заморозка спасла серию за пропущенный день!</p>' : `<p class="streak-freeze-badge">🧊 Заморозка серии: ${freezeAvail ? 'доступна на этой неделе' : 'использована'}</p>`;
  box.innerHTML = `<div class="ocard streak"><div class="fire">🔥</div><h3>${next === 1 ? (lost ? 'Серия прервалась — начнём заново' : 'Ежедневная награда') : `${next} ${next % 10 === 1 && next % 100 !== 11 ? 'день' : next % 10 >= 2 && next % 10 <= 4 && (next % 100 < 10 || next % 100 >= 20) ? 'дня' : 'дней'} подряд!`}</h3><p>Заходите каждый день — награда растёт до 100 тайлов. Пропуск дня начинает серию заново</p>${freezeMsg}<ol class="days">${cells}</ol><button class="cta wide" id="streakTake">Забрать +${gold} <i class="coin" style="display:inline-block;vertical-align:-2px"></i></button></div>`;
  document.body.append(box);
  box.querySelector('#streakTake').onclick = () => {
    const curWeek = (PG.state.progress && PG.state.progress.weekId) ? PG.state.progress.weekId() : 'w1';
    wallet.streak = {
      n: next,
      last: localDay(),
      best: Math.max(next, st.best || 0),
      freezeWeek: usedFreeze ? curWeek : (st.freezeWeek || '')
    };
    wallet.gold += gold; saveWallet(); beep('coin'); track('daily_streak', {day: next, freeze: usedFreeze});
    document.querySelectorAll('.goldN').forEach(e => e.textContent = wallet.gold);
    box.remove();
    toastAny(usedFreeze ? `🧊 Заморозка спасла серию! +${gold} тайлов` : day === 6 ? `Неделя подряд! +${gold} тайлов 🎉` : `+${gold} тайлов. Завтра — ${STREAK_GOLD[(day + 1) % 7]}`);
    if (typeof checkNameProposal === 'function') setTimeout(checkNameProposal, 600);
  };
}
// Gold by place: 1st +15, 2nd +10, 3rd +5, 4th 0, 5th −5 (ties share the higher place).
// Paid for games against bots and online games; several people on one phone get none,
// since one person could play every seat. A "double gold" gift doubles the next win.
const PLACE_GOLD = [15, 10, 5, 0, -5];
function payout(reason) {
  const meIdx = players.findIndex(p => isMe(p));
  if (meIdx < 0) return null;
  if (net) {
    const key = 'g' + net.gameId;
    if (wallet.paid.includes(key)) return null;
    wallet.paid = [key, ...wallet.paid].slice(0, 30);
  } else if (localHumans() > 1 || players.every(p => p.human)) return null;
  if (reason === 'draw') { saveWallet(); const rw = gameDone(-1, players[meIdx].score); return {delta: 0, text: 'Ничья — тайлы не меняются', rw}; }
  const place = ranked().findIndex(p => p.i === meIdx), tied = ranked().findIndex(p => !p.resigned && p.score === players[meIdx].score);
  let delta = PLACE_GOLD[Math.max(0, reason === 'resign' ? place : tied)];
  let doubled = false;
  if (delta > 0 && wallet.boosts.double > 0) { wallet.boosts.double--; delta *= 2; doubled = true; }
  wallet.gold = Math.max(0, wallet.gold + delta); saveWallet();
  if (delta > 0) beep('coin');
  const rw = gameDone(Math.max(0, reason === 'resign' ? place : tied), players[meIdx].score);
  const where = ['1-е', '2-е', '3-е', '4-е', '5-е'][Math.max(0, tied)];
  return {delta, text: `${where} место: ${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta)} тайлов${doubled ? ' (двойное!)' : ''}`, rw};
}

// Figures: the classic meeple in the player's colour plus an outfit.
function drawFigure(g, w, h, fill, fig, ghost) {
  const p = new Path2D(MEEPLE_D);
  g.save(); g.scale(w / 100, h / 130); g.translate(0, 20);
  if (fig === 'king') { g.fillStyle = '#8e2430'; g.beginPath(); g.moveTo(34, 36); g.lineTo(66, 36); g.lineTo(84, 104); g.lineTo(16, 104); g.closePath(); g.fill(); }
  if (fig === 'queen') { g.fillStyle = '#8a3fb5'; g.beginPath(); g.moveTo(36, 36); g.lineTo(64, 36); g.quadraticCurveTo(80, 84, 92, 108); g.lineTo(8, 108); g.quadraticCurveTo(20, 84, 36, 36); g.closePath(); g.fill(); g.fillStyle = '#f2c230'; g.fillRect(14, 102, 72, 4); }
  g.fillStyle = fill; g.fill(p);
  g.save(); g.clip(p);
  g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(36, 32, 20, 40, -.3, 0, 7); g.fill();
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 84, 100, 30);
  if (fig === 'monk') { g.fillStyle = '#d8c08a'; g.fillRect(0, 62, 100, 5); }
  g.restore();
  g.lineWidth = 6; g.strokeStyle = ghost ? '#f2b84b' : 'rgba(0,0,0,.4)'; g.stroke(p);
  const shape = (col, fn) => { g.fillStyle = col; g.beginPath(); fn(); g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke(); };
  if (fig === 'peasant') {
    shape('#e8c45a', () => g.ellipse(50, 9, 30, 7, 0, 0, 7));
    shape('#d9ae3f', () => { g.moveTo(38, 9); g.lineTo(42, -8); g.lineTo(58, -8); g.lineTo(62, 9); g.closePath(); });
  } else if (fig === 'monk') {
    shape('#7a5230', () => { g.moveTo(28, 26); g.quadraticCurveTo(28, -6, 50, -6); g.quadraticCurveTo(72, -6, 72, 26); g.lineTo(64, 34); g.quadraticCurveTo(66, 6, 50, 6); g.quadraticCurveTo(34, 6, 36, 34); g.closePath(); });
  } else if (fig === 'knight') {
    shape('#cfd6de', () => { g.moveTo(31, 30); g.lineTo(31, 12); g.quadraticCurveTo(31, -2, 50, -2); g.quadraticCurveTo(69, -2, 69, 12); g.lineTo(69, 30); g.closePath(); });
    g.fillStyle = '#2a2f38'; g.fillRect(36, 15, 28, 4);
    shape('#d63b2f', () => { g.moveTo(48, -1); g.quadraticCurveTo(40, -18, 58, -18); g.quadraticCurveTo(50, -10, 54, -1); g.closePath(); });
  } else if (fig === 'archer') {
    shape('#3f8f4a', () => { g.moveTo(26, 14); g.quadraticCurveTo(46, -10, 78, 6); g.lineTo(70, 16); g.closePath(); });
    shape('#f2e6c8', () => { g.moveTo(66, 8); g.quadraticCurveTo(84, -16, 94, -14); g.quadraticCurveTo(86, -4, 70, 12); g.closePath(); });
  } else if (fig === 'wizard') {
    shape('#5b2d86', () => { g.moveTo(24, 18); g.quadraticCurveTo(50, -28, 60, -26); g.quadraticCurveTo(56, -4, 76, 18); g.closePath(); });
    g.fillStyle = '#ffd54f'; g.beginPath(); g.arc(50, 6, 3, 0, 7); g.fill();
    g.strokeStyle = '#5d4037'; g.lineWidth = 3; g.beginPath(); g.moveTo(84, 46); g.lineTo(84, 96); g.stroke();
    g.fillStyle = '#00e5ff'; g.beginPath(); g.arc(84, 45, 5.5, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(82.5, 43.5, 2, 0, 7); g.fill();
  } else if (fig === 'ninja') {
    shape('#1c202a', () => { g.moveTo(30, 24); g.lineTo(30, 8); g.quadraticCurveTo(30, -6, 50, -6); g.quadraticCurveTo(70, -6, 70, 8); g.lineTo(70, 24); g.closePath(); });
    shape('#e53935', () => { g.moveTo(28, 12); g.lineTo(72, 12); g.lineTo(72, 16); g.lineTo(28, 16); g.closePath(); });
    g.fillStyle = '#fff'; g.fillRect(38, 14, 24, 2.5);
  } else if (fig === 'paladin') {
    shape('#d8e0e8', () => { g.moveTo(30, 26); g.lineTo(30, 10); g.quadraticCurveTo(30, -4, 50, -4); g.quadraticCurveTo(70, -4, 70, 10); g.lineTo(70, 26); g.closePath(); });
    shape('#fbc02d', () => { g.moveTo(48, -4); g.lineTo(52, -4); g.lineTo(52, -18); g.lineTo(48, -18); g.closePath(); });
    g.fillStyle = '#fbc02d'; g.fillRect(35, 12, 30, 3.5);
    shape('#90a4ae', () => { g.moveTo(74, 50); g.lineTo(84, 50); g.lineTo(84, 75); g.lineTo(79, 82); g.lineTo(74, 75); g.closePath(); });
    g.fillStyle = '#ffd54f'; g.fillRect(77, 56, 4, 14); g.fillRect(75, 61, 8, 4);
  } else if (fig === 'king') {
    shape('#f2c230', () => { g.moveTo(32, 10); g.lineTo(32, -6); g.lineTo(41, 3); g.lineTo(50, -10); g.lineTo(59, 3); g.lineTo(68, -6); g.lineTo(68, 10); g.closePath(); });
    g.fillStyle = '#d6303f'; g.beginPath(); g.arc(50, 4, 3, 0, 7); g.fill();
  } else if (fig === 'queen') {
    shape('#f6d44a', () => { g.moveTo(30, 12); g.lineTo(28, -8); g.lineTo(39, 2); g.lineTo(44, -14); g.lineTo(50, -2); g.lineTo(56, -14); g.lineTo(61, 2); g.lineTo(72, -8); g.lineTo(70, 12); g.closePath(); });
    g.fillStyle = '#e0457b'; g.beginPath(); g.arc(50, 6, 3.2, 0, 7); g.fill();
    g.fillStyle = '#fff'; [28, 44, 56, 72].forEach(x => { g.beginPath(); g.arc(x, x === 28 || x === 72 ? -9 : -15, 2.4, 0, 7); g.fill(); });
  }
  g.restore();
}
const FIG_W = 22, FIG_H = 28;
let figStyle = null;
function paintFigures() {
  let css = '';
  players.forEach((p, i) => {
    const [c, g] = cv(FIG_W, FIG_H, 4); drawFigure(g, FIG_W, FIG_H, p.col, p.fig);
    let dataUrl = ''; try { dataUrl = c.toDataURL(); } catch (_) {}
    SPR['m' + i] = {url: dataUrl, w: FIG_W, h: FIG_H};
    css += `.s-m${i}{background-image:url(${SPR['m' + i].url})}`;
  });
  if (!figStyle) { figStyle = document.createElement('style'); document.head.appendChild(figStyle); }
  figStyle.textContent = css;
}
const meepleImg = i => SPR['m' + i] ? `<img src="${SPR['m' + i].url}" alt="">` : meepleSvg(players[i].col);
// The shop shows each figure as a little 3D character (tools/blender_generators/generate_figurines.py, assets/figs);
// a figure without one is drawn as on the board.
const FIG_ART = ['classic', 'peasant', 'monk', 'knight', 'archer', 'wizard', 'ninja', 'paladin', 'king', 'queen'];
const figPreview = (() => { const cache = {}; return fig => FIG_ART.includes(fig) ? `figs/${fig}.webp` : cache[fig] || (cache[fig] = (() => { try { const [c, g] = cv(40, 52, 3); drawFigure(g, 40, 52, '#ef5350', fig); return c.toDataURL(); } catch (_) { return ''; } })()); })();

async function redeemPromo(code) {
  code = (code || '').trim().toUpperCase();
  if (!code) return toastAny('Введите промокод');
  wallet.promos = wallet.promos || [];
  if (wallet.promos.includes(code)) return toastAny('Промокод уже был использован');

  const BUILTIN_PROMOS = {
    'TESTER2026': 500,
    'OPUS55': 300,
    'PUZZLESTART': 200,
    'DIORAMA3D': 300,
    'OLD2026': 400
  };

  let reward = BUILTIN_PROMOS[code] || 0, offline = false;
  if (!reward && typeof FB !== 'undefined' && FB && FB.dbUrl) {
    offline = true;
    try {
      const r = await fetch(`${FB.dbUrl}/promo_codes/${encodeURIComponent(code)}.json?auth=${await fbToken()}`); // rules: signed-in read
      if (r.ok) {
        offline = false;
        const data = await r.json();
        if (data && data.active && data.gold) {
          if (typeof fbAuth !== 'undefined' && fbAuth && fbAuth.uid) {
            try {
              const cr = await fetch(`${FB.dbUrl}/promo_claims/${encodeURIComponent(code)}/${fbAuth.uid}.json?auth=${await fbToken()}`);
              if (cr.status === 401 || cr.status === 403) {
                return toastAny('Сервер промокодов ожидает обновления правил базы. Попробуйте позже');
              }
              if (cr.ok && (await cr.json())) return toastAny('Промокод уже был активирован на этом аккаунте');
            } catch (_) {}
          }
          reward = +data.gold;
        }
      }
    } catch (_) {}
  }

  if (reward > 0) {
    if (!BUILTIN_PROMOS[code] && typeof FB !== 'undefined' && FB && FB.dbUrl && typeof fbAuth !== 'undefined' && fbAuth && fbAuth.uid) {
      try {
        const pr = await fetch(`${FB.dbUrl}/promo_claims/${encodeURIComponent(code)}/${fbAuth.uid}.json?auth=${await fbToken()}`, {
          method: 'PUT',
          body: JSON.stringify({t: {'.sv': 'timestamp'}})
        });
        if (!pr.ok) {
          if (pr.status === 401 || pr.status === 403) {
            return toastAny('Не удалось активировать промокод: доступ ограничен (обновите правила базы в консоли)');
          }
          return toastAny('Не удалось зафиксировать активацию промокода. Попробуйте позже');
        }
      } catch (_) {
        return toastAny('Ошибка сети при активации промокода. Попробуйте позже');
      }
    }
    wallet.gold = (wallet.gold || 0) + reward;
    wallet.promos.push(code);
    saveWallet();
    toastAny(`🎉 Промокод активирован! +${reward} тайлов`);
    renderShop();
    const inp = $('#promoInput'); if (inp) inp.value = '';
  } else {
    toastAny(offline ? 'Не удалось проверить промокод — нужен интернет' : 'Неверный или неактивный промокод');
  }
}
// The price of a custom status on its button (there is no exchange: two currencies, tiles and stars, src/state/coins.js).
function renderPriceTags() {
  const st = $('#stBuy'); if (st) st.innerHTML = COINS.priceTag(ST().CUSTOM_PRICE);
}
function renderShop() {
  saveWallet();
  renderPriceTags();
  const promoBtn = $('#promoApplyBtn');
  if (promoBtn) promoBtn.onclick = () => {
    const inp = $('#promoInput');
    redeemPromo(inp ? inp.value : '');
  };
  const promoInp = $('#promoInput');
  if (promoInp) promoInp.onkeydown = (e) => {
    if (e.key === 'Enter') redeemPromo(promoInp.value);
  };
  const isReady = giftReady();
  const chestArtSvg = CHEST_SVG;
  const chestOpenedSvg = (typeof CHEST_OPEN_SVG !== 'undefined') ? CHEST_OPEN_SVG : CHEST_SVG;

  let trioData = (wallet.dailyTrio && wallet.dailyTrio.date === today()) ? wallet.dailyTrio : null;
  if (!trioData && isReady) {
    trioData = getDailyTrioOptions();
  }

  const giftEl = $('#gift');
  if (giftEl) {
    if (PG.ui.shop && PG.ui.shop.renderGiftTrioShowcase) {
      giftEl.innerHTML = PG.ui.shop.renderGiftTrioShowcase({
        giftReady: isReady,
        options: trioData ? trioData.options : [],
        chosenIdx: trioData ? trioData.chosenIdx : null,
        nextGiftTimeStr: timeUntilMidnightStr(),
        chestSvg: chestArtSvg,
        chestOpenedSvg: chestOpenedSvg,
        boosts: wallet.boosts
      });
    }

    if (isReady && trioData) {
      giftEl.querySelectorAll('.gift-chest-btn[data-gidx]').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.gidx, 10);
          pickDailyChest(idx, trioData, btn, giftEl);
        };
      });
    } else {
      startGiftCountdownTimer();
    }
  }

  // Render 5 Medieval Market Stalls: figures, frames, statuses, emotes, phrases (max 6 unowned, 3 top, 3 bottom)
  const dailyWrap = $('#dailyShopWrap');
  if (dailyWrap) {
    if (PG.ui.shop.renderShopStallsShowcase) {
      dailyWrap.innerHTML = PG.ui.shop.renderShopStallsShowcase({
        figs: FIGS,
        frames: FRAMES,
        statuses: (PG.state.status && PG.state.status.SHOP_STATUSES) || [],
        wallet,
        figPreview,
        initial: profileName()[0],
        date: new Date()
      });
    } else if (PG.ui.shop.renderDailyShopShowcase) {
      const dailyItems = PG.ui.shop.getDailyShopItems(FIGS, FRAMES, PG.state.status.SHOP_STATUSES, new Date(), wallet);
      dailyWrap.innerHTML = PG.ui.shop.renderDailyShopShowcase({
        items: dailyItems,
        wallet,
        figPreview,
        initial: profileName()[0],
        frames: FRAMES
      });
    }
  }

  $('#locgrid').innerHTML = PG.ui.shop.renderLocationsGrid(LOCS);
  const rs = $('#reactShop'); if (rs) rs.innerHTML = PG.ui.shop.renderReactionShopHtml({wallet});
}
const _rs = $('#reactShop'); if (_rs) _rs.addEventListener('click', e => {
  const b = e.target.closest('[data-rbuy]'); if (b) buyReaction(b.dataset.rbuy, b.dataset.rid);
});
/* Emoji and phrases: bought one by one for gold (asks first, like figures), then they can go into the deck. */
function buyReaction(kind, id) {
  const R = PG.state.reactions, p = R.price(kind, id), what = kind === 'emote' ? `эмодзи ${id}` : `фразу «${id}»`;
  if (R.isOwned(wallet, kind, id)) return;
  if (!COINS.canPay(wallet, p)) return toastAny(COINS.lackText(wallet, p));
  confirmBox(`Купить ${what} за ${COINS.priceText(p)}? Потом ${COINS.leftText(wallet, p)}.`, 'Купить', () => {
    const res = R.buy(wallet, kind, id); if (!res.ok) return;
    beep('coin'); track('spend_virtual_currency', {item_name: kind + '_' + R.ALL_EMOTES.concat(R.ALL_PHRASES).indexOf(id), virtual_currency_name: 'gold', value: res.price});
    // a bought line goes straight into the deck while there is room
    const key = kind === 'emote' ? 'emotes' : 'phrases', cur = R.deck(wallet, kind);
    if (cur.length < 5 && !cur.includes(id)) wallet[key] = [...cur, id];
    for (const r of R.claimCollections(wallet)) toastAny(`Коллекция ${r.kind === 'emote' ? 'эмодзи' : 'фраз'} собрана! +${r.gold} тайлов`);
    saveWallet(); document.querySelectorAll('.goldN').forEach(e => e.textContent = wallet.gold);
    toastAny(kind === 'emote' ? `Эмодзи ${id} — ваше!` : 'Фраза — ваша!');
    if (!$('#scr-shop').hidden) renderShop();
    if (typeof renderItems === 'function' && $('#itemsBody')) renderItems();
    renderSayBox();
  });
}
const _frg = $('#frgrid'); if (_frg) _frg.addEventListener('click', e => {
  const b = e.target.closest('[data-fr]'); if (!b) return;
  const k = b.dataset.fr, f = FRAMES[k], owned = wallet.frames || [];
  const pick = () => { wallet.frame = k; saveWallet(); renderShop(); renderMenuProfile(); };
  if (f.earn && !owned.includes(k)) return toastAny('Рамка за достижение. Получить: ' + f.earn);
  if (!f.price || owned.includes(k)) return pick();
  if (!COINS.canPay(wallet, f.price)) return toastAny(COINS.lackText(wallet, f.price));
  confirmBox(`Купить рамку «${f.name}» за ${COINS.priceText(f.price)}?`, 'Купить', () => {
    if ((wallet.frames || []).includes(k) || !COINS.canPay(wallet, f.price)) return;
    COINS.pay(wallet, f.price); wallet.frames = [...(wallet.frames || []), k]; beep('coin');
    track('spend_virtual_currency', {item_name: 'frame_' + k, virtual_currency_name: 'gold', value: f.price});
    pick(); toastAny(`Рамка «${f.name}» — ваша!`);
  });
});
const _fgg = $('#figgrid'); if (_fgg) _fgg.addEventListener('click', e => {
  const b = e.target.closest('[data-fig]'); if (!b) return;
  const k = b.dataset.fig, f = FIGS[k];
  if (!wallet.owned.includes(k)) {
    if (!COINS.canPay(wallet, f.price)) return toastAny(COINS.lackText(wallet, f.price));
    return confirmBuy(k);
  }
  pickFig(k);
});
function pickFig(k) {
  wallet.fig = k; saveWallet(); renderShop();
  if (net) netSend({t: 'hello', v2: 1, st: myStatus(), id: myId, uid: myUid(), reg: registered() ? 1 : 0, name: myName(), fig: k, col: wallet.color});
}
// Buying spends gold, so it asks first: the figure, its price and what is left afterwards.
function confirmBuy(k) {
  const f = FIGS[k], box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  box.innerHTML = `<div class="ocard"><img src="${figPreview(k)}" alt="" style="width:64px;height:84px;margin:0 auto;display:block"><h3>Купить «${f.name}»?</h3><p>Цена: <b>${COINS.priceText(f.price)}</b> · ${COINS.leftText(wallet, f.price)}</p><button class="cta wide" data-b="yes">Купить</button><button class="ghostbtn" data-b="no">Отмена</button></div>`;
  document.body.append(box);
  box.onclick = e => {
    const b = e.target.closest('[data-b]'); if (!b && e.target !== box) return;
    box.remove();
    if (!b || b.dataset.b !== 'yes' || wallet.owned.includes(k) || !COINS.canPay(wallet, f.price)) return;
    COINS.pay(wallet, f.price); wallet.owned.push(k); beep('coin'); track('spend_virtual_currency', {item_name: k, virtual_currency_name: 'gold', value: f.price}); toastAny(`${f.name} — ваша фигурка!`);
    pickFig(k);
  };
}
