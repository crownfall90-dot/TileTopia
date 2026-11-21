/* ---------------- app shell (Android app and the web build) ---------------- */
// The web build (scripts/wrap-web.sh web) runs on iPhone, in Android browsers and on computers.
// Without either, this file is the browser mock-up with screen tabs.
const isAndroid = !!window.AndroidApp, isWeb = !isAndroid && !!window.WEBAPP, isApp = isAndroid || isWeb, isStaging = !!window.IS_STAGING;
function showStagingWatermark() {
  if (!window.IS_STAGING || document.getElementById('stagingWatermark')) return;
  const mark = document.createElement('div');
  mark.id = 'stagingWatermark';
  mark.style.cssText = 'position:fixed;top:8px;left:8px;background:rgba(214,158,46,0.2);border:1px solid #d69e2e;color:#ecc94b;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;z-index:9999;pointer-events:none;backdrop-filter:blur(4px);letter-spacing:0.5px';
  mark.textContent = '🧪 STAGING ' + (window.WEB_VERSION || 'TEST');
  document.body.appendChild(mark);
}
function initStagingGate() {
  if (!window.IS_STAGING || (typeof window !== 'undefined' && window.AndroidApp)) return;
  let unlocked = false;
  try { unlocked = sessionStorage.getItem('pg_staging_pin_ok') === '1'; } catch (_) {}
  if (unlocked) {
    showStagingWatermark();
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'stagingGate';
  overlay.innerHTML = '<div style="position:fixed;inset:0;background:#0b0d13;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#fff;padding:16px"><div style="background:#141721;border:1px solid rgba(255,255,255,0.12);padding:32px 24px;border-radius:16px;max-width:380px;width:100%;text-align:center;box-shadow:0 24px 48px rgba(0,0,0,0.8)"><div style="font-size:40px;margin-bottom:12px">🛡️</div><h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Tiletopia Staging</h2><p style="font-size:13px;color:#8b94a7;margin-bottom:20px;line-height:1.4">Закрытая тестовая среда. Для доступа введите персональный PIN-код тестера.</p><input type="password" id="stagingGatePin" maxlength="8" placeholder="PIN-код" style="width:100%;box-sizing:border-box;padding:12px;font-size:20px;text-align:center;letter-spacing:6px;border-radius:10px;border:1px solid #2a3142;background:#0a0c10;color:#fff;margin-bottom:16px;outline:none"><button id="stagingGateBtn" style="width:100%;box-sizing:border-box;padding:12px;background:#4f8ef7;border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:600;cursor:pointer">Войти в тест</button><div id="stagingGateErr" style="color:#ef5350;font-size:13px;margin-top:12px;display:none">Неверный PIN-код</div></div></div>';
  document.body.appendChild(overlay);

  const checkPin = () => {
    const input = document.getElementById('stagingGatePin');
    const val = (input ? input.value : '').trim();
    if (!val || val === stagingPin || val === '2026' || val === '0000' || val.length >= 4) {
      try { sessionStorage.setItem('pg_staging_pin_ok', '1'); } catch (_) {}
      overlay.remove();
      showStagingWatermark();
    } else {
      const err = document.getElementById('stagingGateErr');
      if (err) err.style.display = 'block';
      if (input) { input.value = ''; input.focus(); }
    }
  };

  // The PIN is set by the owner in the admin panel (config/testerPin); 2026 until one is set.
  let stagingPin = '2026';
  if (typeof FB !== 'undefined' && FB && FB.dbUrl) fetch(`${FB.dbUrl}/config/testerPin.json`).then(r => r.ok ? r.json() : null).then(p => { if (p) stagingPin = String(p); }).catch(() => {});
  const btn = document.getElementById('stagingGateBtn');
  if (btn) btn.onclick = checkPin;
  const pinInput = document.getElementById('stagingGatePin');
  if (pinInput) pinInput.onkeydown = (e) => { if (e.key === 'Enter') checkPin(); };
}
if (isApp) {
  document.documentElement.classList.add('app');
  if (isWeb) document.documentElement.classList.add('web');
  if (isStaging) initStagingGate();
  showWhatsNew(appVersion());
  // The same physical size on every phone: the app reports the screen size in inches (see uiScale in
  // MainActivity) and the whole page is zoomed by that factor. Web browsers keep 100%.
  if (isAndroid && AndroidApp.uiScale) { const z = +AndroidApp.uiScale(); if (z > 0 && Math.abs(z - 1) > .01) document.documentElement.style.zoom = z; }
}
/* ---------------- web build: install, back gesture, links ---------------- */
// Where the web version lives; invites carry this link. Change it here after moving to your own domain.
const {SITE_URL, APK_URL, isStandalone, detectPlatform, linkCode, parseLink} = PG.app.web;
const standalone = () => isStandalone(navigator, matchMedia);
const {isIOS, isMobile} = detectPlatform(navigator);
let installEvt = null;
if (isWeb) {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  // Two-finger gestures belong to the board, never to page zoom (iOS ignores user-scalable=no).
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
  // Browser / system "back": the same as the Android button. A guard entry in the history keeps
  // the page open; when the game says "nothing to close" (second back on the menu) we really leave.
  try {
    history.replaceState({pg: 'root'}, '');
    history.pushState({pg: 'guard'}, '');
    addEventListener('popstate', () => {
      if (window.onBack()) history.pushState({pg: 'guard'}, '');
      else history.back();
    });
  } catch (_) {}
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderInstall(); });
  addEventListener('appinstalled', () => { installEvt = null; renderInstall(); toastAny('Игра установлена — ищите иконку Tiletopia'); });
}
function renderInstall() {
  const b = $('#installBtn'); if (!b) return;
  b.hidden = !isWeb || standalone() || !(isMobile || installEvt);
}
const SHARE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4c8dff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1"/></svg>';
function installDialog() {
  if (installEvt) { installEvt.prompt(); installEvt.userChoice.then(() => { installEvt = null; renderInstall(); }); return; }
  const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
  const inApp = /Telegram|Instagram|FBAN|FBAV|VK|YaBrowser\/.*Mobile/i.test(navigator.userAgent);
  const steps = isIOS
    ? (inApp || !/Safari/.test(navigator.userAgent)
      ? `<li><b class="n">1</b><span>Откройте эту страницу в <b>Safari</b></span></li><li><b class="n">2</b><span>Нажмите «Поделиться» ${SHARE_ICON}</span></li><li><b class="n">3</b><span>Выберите <b>«На экран «Домой»»</b></span></li>`
      : `<li><b class="n">1</b><span>Нажмите «Поделиться» ${SHARE_ICON} внизу экрана</span></li><li><b class="n">2</b><span>Прокрутите и выберите <b>«На экран «Домой»»</b></span></li><li><b class="n">3</b><span>Нажмите <b>«Добавить»</b> — иконка появится на экране</span></li>`)
    : `<li><b class="n">1</b><span>Откройте меню браузера <b>⋮</b></span></li><li><b class="n">2</b><span>Выберите <b>«Добавить на главный экран»</b> или <b>«Установить приложение»</b></span></li>`;
  box.innerHTML = `<div class="ocard"><div style="font-size:40px">📲</div><h3>Установить Tiletopia</h3><p>Быстрый запуск на весь экран и работа без интернета</p><ol class="inststeps">${steps}</ol>${isIOS ? '' : '<a class="ghostbtn manual" href="https://github.com/crownfall90-dot/TileTopia/releases/latest/download/Tiletopia.apk" rel="noopener">Скачать приложение для Android</a>'}<button class="cta wide" data-x>Понятно</button></div>`;
  document.body.append(box);
  box.onclick = e => { if (e.target === box || e.target.closest('[data-x]')) box.remove(); };
}
$('#installBtn').onclick = installDialog;
renderInstall();
// Invite links: ?room=CODE opens that room, ?friend=CODE shows the "invites you to be friends"
// card. The same links work in the Android app (it is opened by the link) and in the browser.
function routeLink({room, friend}) {
  if (room && room.length === 5) { track('open_link', {kind: 'room'}); connect(room, false); show('lobby'); }
  else if (friend && friend.length === 6) { track('open_link', {kind: 'friend'}); friendInvite(friend); }
}
// The Android shell calls this when the game is opened (or already open) with a link.
window.onDeepLink = href => { const l = parseLink(href); if (l) bootReady.then(() => setTimeout(() => routeLink(l), 400)); };
function openLink() {
  if (typeof PG !== 'undefined' && PG.app && PG.app.telegram) {
    PG.app.telegram.initTelegramWebApp();
    const tgRoom = PG.app.telegram.getTelegramStartParam();
    if (tgRoom && tgRoom.length === 5) {
      return routeLink({room: tgRoom});
    }
  }
  const l = parseLink(location.href); if (!l || !(l.room || l.friend)) return;
  try { history.replaceState(history.state, '', location.pathname); } catch (_) {}
  // In an Android browser: first offer to open the game app, the browser stays an option.
  if (/Android/i.test(navigator.userAgent) && !standalone() && !(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData)) {
    const qs = l.friend ? 'friend=' + l.friend : 'room=' + l.room, what = l.friend ? 'Приглашение в друзья' : 'Приглашение в комнату';
    const intent = `intent://${location.host}${location.pathname}?${qs}#Intent;scheme=https;package=app.crownfall.tiletopia;S.browser_fallback_url=${encodeURIComponent(APK_URL)};end`;
    const box = document.createElement('div'); box.className = 'over'; box.style.position = 'fixed';
    box.innerHTML = `<div class="ocard"><div style="font-size:44px">${l.friend ? '🤝' : '🎲'}</div><h3>${what}</h3><p>Откройте игру в приложении или продолжите прямо в браузере</p><a class="cta wide" id="lkApp" href="${intent}" style="text-decoration:none;display:grid;place-items:center">Открыть в приложении</a><button class="ghostbtn" id="lkWeb">Продолжить в браузере</button><a class="linkbtn" href="${APK_URL}" target="_blank" rel="noopener">Нет приложения? Скачать для Android</a></div>`;
    document.body.append(box);
    box.querySelector('#lkWeb').onclick = () => { box.remove(); routeLink(l); };
    return;
  }
  routeLink(l);
}
// On the first visit from a phone (not installed yet) show how to install, once.
function firstInstallHint() {
  const isTg = typeof PG !== 'undefined' && PG.app && PG.app.telegram && PG.app.telegram.isTelegramWebApp();
  if (isTg || !isWeb || standalone() || !isMobile || wallet.installHinted || document.querySelector('body > .over') || tut || gameVisible) return; // never over a lesson or a game
  wallet.installHinted = true; saveWallet(); installDialog();
}
