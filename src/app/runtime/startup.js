// the start: once the splash is gone, a game that was going comes back by itself
bootReady.then(() => setTimeout(() => { try { if (wallet.name) askStats(); } catch (_) {} }, 2500));
const _mrg = $('#btnMenuResumeGame');
if (_mrg) {
  _mrg.onclick = () => {
    const active = getActiveResumableGame();
    if (!active) return;
    resumeHold = false;
    if (active.kind === 'live') {
      show('game');
    } else if (active.kind === 'saved') {
      if (net) leaveRoom();
      startGame(active.sv.cfg, active.sv.moves);
      show('game');
    } else if (active.kind === 'online' || active.kind === 'online_rejoin') {
      const code = active.code || (net && net.code) || (lastOnline() && lastOnline().code);
      if (code) {
        connect(code, false);
        show('lobby');
      }
    }
  };
}
bootReady.then(() => setTimeout(() => { try { autoResume(); } catch (e) { plog('error', 'autoResume ' + e.message); } }, 450));
devVerify();
// First open and the days people come back (D1, D3, D7), each reported once.
(() => {
  const d0 = Date.UTC(...today().split('-').map((v, i) => i === 1 ? v - 1 : +v));
  if (!wallet.firstSeen) { wallet.firstSeen = today(); wallet.rd = {}; saveWallet(); track('first_open'); return; }
  const days = Math.round((d0 - Date.parse(wallet.firstSeen + 'T00:00:00Z')) / 864e5);
  for (const k of [1, 3, 7]) if (days >= k && days < k + 2 && !(wallet.rd || {})[k]) { wallet.rd = Object.assign(wallet.rd || {}, {[k]: 1}); saveWallet(); track('return_d' + k, {days}); }
})();
try { if (localStorage.getItem('delNote')) { localStorage.removeItem('delNote'); setTimeout(() => toastAny('Данные игры удалены. Чтобы удалить и сам вход, войдите в аккаунт заново и повторите удаление.'), 1500); } } catch (_) {}
plog('open', {p: installKind(), v: appVersion()});
if (window.WEBAPP && FB && FB.googleClientId) googleReturn();
// back from Google's page with the browser's Back button: the page comes from the cache with the button still pressed
addEventListener('pageshow', e => { if (e.persisted) document.querySelectorAll('#accGoogle').forEach(b => { b.disabled = false; }); });
if (isApp) {
  const tutorialReady = bootReady.then(() => new Promise(resolve => setTimeout(resolve, 300))).then(offerTutorial);
  if (isWeb) {
    // Deferred Telegram SDK can finish after the first paint. Only web invites need it.
    const linksReady = new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once: true}));
    Promise.all([tutorialReady, linksReady]).then(() => {
      openLink();
      setTimeout(firstInstallHint, 400);
    });
  }
}
// The app opens on the menu (a saved game must survive); the browser mock-up opens straight into a game.
if (!isApp) newGame(); else buildMini();
window.__ready = true;
// Retain an authenticated OTA page after the client starts.
try { if (window.AndroidApp && AndroidApp.contentReady) AndroidApp.contentReady(); } catch (_) {}
PG.app.splash.startSplash({boot, element: $('#boot'), reducedMotion: RM, finish: bootHide});
