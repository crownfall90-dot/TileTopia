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
if (isApp) bootReady.then(() => setTimeout(() => { offerTutorial(); if (isWeb) { openLink(); setTimeout(firstInstallHint, 400); } }, 300));
// The app opens on the menu (a saved game must survive); the browser mock-up opens straight into a game.
if (!isApp) newGame(); else { buildBoard(); buildMini(); }
/* Loaders lay real pieces one by one, and they fit like in a game: road to road, river to river,
   town to town. Each cycle shows a new 3x3 layout found by a small backtracking search. */
const loaderImgs = {};
function loaderLayout() {
  const bag = Object.keys(TYPES).filter(k => !TYPES[k].e.includes('b') && TYPES[k].e !== 'ffff' && !TYPES[k].rare).flatMap(k => Array(TYPES[k].n).fill(k));
  const grid = [], side = (c, d) => TYPES[c.type].e[(d - c.r + 4) % 4];
  const fitsAt = (i, type, r) => { const e = d => TYPES[type].e[(d - r + 4) % 4];
    return !(i % 3 && side(grid[i - 1], 1) !== e(3)) && !(i >= 3 && side(grid[i - 3], 2) !== e(0)); };
  const solve = i => {
    if (i === 9) return true;
    for (let k = 0; k < 80; k++) {
      const type = bag[(Math.random() * bag.length) | 0], r = (Math.random() * 4) | 0;
      if (!fitsAt(i, type, r)) continue;
      grid[i] = {type, r};
      if (solve(i + 1)) return true;
    }
    return false;
  };
  return solve(0) ? grid : null;
}
function pieceUrl({type, r}) {
  const img = loaderImgs[type];
  if (!img || !img.complete || !img.naturalWidth) return TILE_URL[type] || '';
  const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
  g.translate(48, 48); g.rotate(r * Math.PI / 2);
  try {
    g.drawImage(img, -48, -48, 96, 96);
    return c.toDataURL('image/jpeg', .85);
  } catch (_) {
    return (img && img.src) || TILE_URL[type] || '';
  }
}
function relayLoader(pz) {
  const grid = loaderLayout(); if (!grid) return;
  pz.querySelectorAll('i').forEach((el, i) => { el.style.backgroundImage = `url(${pieceUrl(grid[i])})`; });
}
const loaderReady = Promise.all(Object.keys(TYPES).map(k => new Promise(res => { const im = new Image(); im.onload = im.onerror = res; im.src = TILE_URL[k]; loaderImgs[k] = im; }))).then(() => {
  document.querySelectorAll('.pz').forEach(pz => {
    relayLoader(pz);
    // all pieces are hidden at the end of a cycle: swap in a new layout then
    pz.querySelector('i').addEventListener('animationiteration', () => relayLoader(pz));
  });
});
window.__ready = true;
// tell the app the page started: a game update downloaded over the air is then kept (ContentUpdater.java)
try { if (window.AndroidApp && AndroidApp.contentReady) AndroidApp.contentReady(); } catch (_) {}
// In the app the loader stays a moment as a splash, long enough to see a few tiles land.
// On app start the splash lays one full fitting 3x3 (restarted once the real pieces are in).
{ const el = $('#boot'); if (el) {
  let done = false;
  const finishBoot = () => {
    if (done) return;
    done = true;
    boot.min = true;
    boot.checked = true;
    bootHide();
  };
  // Play loading screen animation to the very end before transitioning to the game:
  // tiles fly in and assemble -> title appears -> golden glow -> sheen sweeps -> meeple drops and lands
  el.addEventListener('animationend', e => {
    if (e.animationName === 'bootmeeple' || e.animationName === 'bootsheen') {
      setTimeout(finishBoot, 350);
    }
  });
  // Fallback in case animations are disabled or cancelled
  setTimeout(finishBoot, 6000);
} }
