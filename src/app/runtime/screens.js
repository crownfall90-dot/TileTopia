/* ---------------- screens ---------------- */
/* What players use: a counter per screen and per button (src/state/usage.js), kept per day, sent to /usage/{day}/{uid}
   every few minutes and when the game is closed, and to Firebase Analytics as «feature_use». Counts only, no texts. */
let usageState = null, usageTimer = 0, usageSending = false;
try { usageState = JSON.parse(localStorage.getItem('usage')); } catch (_) {}
/* Consent for statistics: asked once, plainly, default off. Anything that is not an error report waits for «Разрешить». */
let statsAskTries = 0;
function askStats() {
  if (wallet.statsAsked || tut || document.getElementById('statsBox')) return;
  if (document.querySelector('.over:not(#over):not([hidden])') || document.hidden) { if (++statsAskTries < 6) setTimeout(askStats, 3000); return; }
  const b = document.createElement('div'); b.className = 'over'; b.id = 'statsBox'; b.style.position = 'fixed';
  b.innerHTML = `<div class="ocard"><div style="font-size:40px">📊</div><h3>Помочь улучшить игру?</h3><p>Мы смотрим, какими экранами и кнопками пользуются, чтобы убрать лишнее и сделать игру удобнее. Только числа, без имён и текстов.</p><details class="more"><summary>Что именно собирается</summary><p>Какие экраны открыты и какие кнопки нажаты. По дням считаем выбор места, ручные ходы, подсказки, истечение времени, начало и итоги партий. Также учитываются модель устройства, версия игры и сбои. Не собираем имя, почту, переписку и местоположение. Хранится до 12 месяцев. Выключить можно в «Настройки» → «Уведомления и данные» → «Статистика». Подробнее — в <a href="https://crownfall90-dot.github.io/TileTopia/privacy.html" target="_blank" rel="noopener">Политике конфиденциальности</a>.</p></details><button class="cta wide" id="statsYes">Разрешить</button><button class="ghostbtn" id="statsNo">Не сейчас</button></div>`;
  document.body.append(b);
  const done = on => { wallet.stats = on; wallet.statsAsked = true; saveWallet(); applyStatsConsent(); b.remove(); };
  b.querySelector('#statsYes').onclick = () => done(true);
  b.querySelector('#statsNo').onclick = () => done(false);
}
function useCount(id) {
  try {
    if (tut || wallet.stats !== true) return;   // statistics only with the player's consent
    usageState = PG.state.usage.bump(usageState, id, new Date().toISOString().slice(0, 10));
    localStorage.setItem('usage', JSON.stringify(usageState));
    if (window.AndroidApp && AndroidApp.logEvent && !id.startsWith('screen:')) AndroidApp.logEvent('feature_use', JSON.stringify({feature: id}));
    if (!usageTimer) usageTimer = setTimeout(usageFlush, 180000);
  } catch (_) {}
}
async function usageFlush(keepalive) {
  if (usageSending) return;
  clearTimeout(usageTimer); usageTimer = 0;
  const state = usageState;
  const body = PG.state.usage.payload(state);
  if (wallet.stats !== true || !body || !FBC) return;
  usageSending = true;
  try {
    const tok = await FBC.token(), uid = FBC.session() && FBC.session().uid; if (!uid) return;
    if (wallet.stats !== true || usageState !== state) return;
    const payload = JSON.stringify(body);
    const r = await fetch(`${FB.dbUrl}/usage/${state.d}/${uid}.json?auth=${tok}`, {method: 'PUT', body: payload, keepalive: !!keepalive});
    if (r.ok && usageState === state && JSON.stringify(state.c) === payload) {
      state.dirty = false;
      localStorage.setItem('usage', JSON.stringify(state));
    }
  } catch (_) { /* Tried again with the next change. */ }
  finally {
    usageSending = false;
    if (wallet.stats === true && usageState?.dirty && !usageTimer) usageTimer = setTimeout(usageFlush, 180000);
  }
}
document.addEventListener('click', e => { const f = PG.state.usage.featureOf(e.target); if (f) useCount(f); }, true);
document.addEventListener('visibilitychange', () => { if (document.hidden) usageFlush(true); });
let _screenAnimTimer = null;
let _outgoingScr = null;

const ALL_TRANS_CLASSES = [
  'screen-exit-to-left', 'screen-exit-to-right', 'screen-enter-from-left', 'screen-enter-from-right',
  'tab-exit-to-left', 'tab-exit-to-right', 'tab-enter-from-left', 'tab-enter-from-right'
];

function clearScreenTransitions() {
  if (_screenAnimTimer) { clearTimeout(_screenAnimTimer); _screenAnimTimer = null; }
  if (_outgoingScr) {
    _outgoingScr.hidden = true;
    _outgoingScr.classList.remove(...ALL_TRANS_CLASSES);
    _outgoingScr = null;
  }
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove(...ALL_TRANS_CLASSES);
  });
}

function show(name, instant = false) {
  useCount('screen:' + name);
  if (typeof recordAction === 'function') recordAction('show:' + name);
  const curScr = document.querySelector('.screen:not([hidden]):not(.screen-exit-to-left):not(.screen-exit-to-right):not(.tab-exit-to-left):not(.tab-exit-to-right)');
  const curName = curScr ? curScr.id.replace('scr-', '') : '';
  const ORDER = ['menu', 'progress', 'friends', 'shop'];
  const SUB_SCREENS = ['rules', 'rating', 'settings', 'items', 'inbox', 'history', 'achievements', 'mastery', 'setup', 'lobby', 'profile'];
  let animDir = '';
  let isTab = false;
  if (!instant && curName && curName !== name && curScr) {
    if (ORDER.includes(curName) && ORDER.includes(name)) {
      animDir = ORDER.indexOf(name) > ORDER.indexOf(curName) ? 'left' : 'right';
      isTab = true;
    } else if (ORDER.includes(curName) && SUB_SCREENS.includes(name)) {
      animDir = 'left';
    } else if (SUB_SCREENS.includes(curName) && ORDER.includes(name)) {
      animDir = 'right';
    } else if (SUB_SCREENS.includes(curName) && SUB_SCREENS.includes(name)) {
      animDir = SUB_SCREENS.indexOf(name) > SUB_SCREENS.indexOf(curName) ? 'left' : 'right';
    }
  }

  const targetScr = $('#scr-' + name);
  if (animDir && curScr && targetScr && curScr !== targetScr) {
    clearScreenTransitions();
    _outgoingScr = curScr;
    curScr.hidden = false;
    targetScr.hidden = false;

    if (isTab) {
      if (animDir === 'left') {
        curScr.classList.add('tab-exit-to-left');
        targetScr.classList.add('tab-enter-from-right');
      } else {
        curScr.classList.add('tab-exit-to-right');
        targetScr.classList.add('tab-enter-from-left');
      }
    } else {
      if (animDir === 'left') {
        curScr.classList.add('screen-exit-to-left');
        targetScr.classList.add('screen-enter-from-right');
      } else {
        curScr.classList.add('screen-exit-to-right');
        targetScr.classList.add('screen-enter-from-left');
      }
    }

    document.querySelectorAll('.screen').forEach(s => {
      if (s !== curScr && s !== targetScr) s.hidden = true;
    });

    _screenAnimTimer = setTimeout(() => {
      clearScreenTransitions();
      if (targetScr) targetScr.hidden = false;
    }, isTab ? 260 : 280);
  } else {
    clearScreenTransitions();
    document.querySelectorAll('.screen').forEach(s => {
      s.hidden = (s !== targetScr);
    });
  }
  const nav = $('#bnav'), onNav = ['menu', 'progress', 'friends', 'shop'].includes(name);
  nav.hidden = !onNav; nav.parentNode.classList.toggle('hasnav', onNav);
  nav.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('on', b.dataset.nav === name));
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
  gameVisible = name === 'game';
  musicUpdate();
  if (mm && name !== 'match') stopMatch(name === 'game');
  if (name === 'results') renderResults(phase === 'end');
  if (name === 'items') renderItems();
  if (name === 'inbox') renderInbox();
  if (name === 'history') renderHistory($('#historyList'));
  if (gameVisible) { applyCam(); if (pendingStart) startTurn(); else pumpRemote(); }
  if (name === 'lobby') { renderLobby(); if (FB && registered()) loadFriends().then(renderLobbyFriends).catch(() => {}); }
  if (name === 'shop') renderShop();
  if (name === 'settings') renderPrefs();
  if (name === 'menu') {
    saveWallet(); presenceCount(); progressDot(); renderMenuProfile(); updateNotifBadge(); updateMenuResumeBtn();
    if (pendingUpdate && (!updBox || !document.body.contains(updBox))) {
      const pendingInfo = pendingUpdate;
      pendingUpdate = null;
      setTimeout(() => {
        window.onUpdateAvailable(pendingInfo, false);
      }, 450);
    }
  }
  if (name === 'progress') { roadScroll = true; renderTasks(); }
  if (name === 'achievements') { renderAchievements(); }
  if (name === 'profile') { renderProfile(); renderAccount(); }
  if (name === 'rating') { renderTop(); }
  track('screen_view', {screen_name: name});
  if (typeof PG !== 'undefined' && PG.app && PG.app.telegram) {
    PG.app.telegram.updateTelegramBackButton(name !== 'menu', () => show('menu'));
  }
  if (name === 'friends') openFriends();
  if (name === 'menu') { friendsDot(); (typeof bootReady === 'undefined' ? Promise.resolve() : bootReady).then(() => { (typeof syncStart === 'undefined' ? Promise.resolve() : syncStart).then(() => { setTimeout(checkNameProposal, 800); }); setTimeout(notifNudge, 1600); }); }
  clearTimeout(presenceSoon); presenceSoon = setTimeout(() => presenceMark(true), 1500);
}
let historyReturn = 'menu';
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tab],[data-go]'); if (!b) return;
  const target = b.dataset.tab || b.dataset.go;
  if (target === 'history') {
    const cur = document.querySelector('.screen:not([hidden])');
    historyReturn = cur ? cur.id.replace('scr-', '') : 'menu';
  }
  show(target);
});
const hb = $('#historyBack');
if (hb) hb.onclick = e => { e.preventDefault(); e.stopPropagation(); show(historyReturn || 'menu'); };
$('#again').onclick = () => rematchClick();
const mqb = $('#menuQuestBanner');
if (mqb) mqb.onclick = () => { ptab = 'rewards'; show('progress'); };
const mgp = $('#menuGiftPill');
if (mgp) mgp.onclick = () => openGift();
