// Mode bottom sheet and quick play handlers
(function() {
// Init Menu Hub Sliding Sheet
function initMenuHub() {
  const btn = $('#btnMenuHub'), pop = $('#mhubPop');
  if (!btn || !pop) return;
  const close = () => { pop.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); setTimeout(() => { if (!pop.classList.contains('open')) pop.hidden = true; }, 160); };
  const open = () => {
    const c = $('#mhubCups'); if (c) c.textContent = '🏆 ' + ((PROG && PROG.cups) || 0);
    const a = $('#mhubAch');
    if (a && typeof ACH !== 'undefined' && PROG && PROG.st) {
      const ready = ACH.filter(x => !PROG.ach[x.id] && x.ok(PROG.st, PROG.lvl)).length;
      a.textContent = ready ? `+${ready}` : `${ACH.filter(x => PROG.ach[x.id] === 'got').length}/${ACH.length}`;
      if (ready) a.style.color = '#7fe0a8';
      else a.style.color = '';
    }
    pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => pop.classList.add('open'));
  };
  btn.onclick = e => { e.stopPropagation(); pop.classList.contains('open') ? close() : open(); };
  document.addEventListener('pointerdown', e => { if (pop.classList.contains('open') && !e.target.closest('#mhubPop,#btnMenuHub')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop.classList.contains('open')) { close(); btn.focus(); } });
  pop.onclick = e => {
    const it = e.target.closest('[data-hub-action]');
    if (!it) return;
    const act = it.dataset.hubAction;
    close();
    if (act === 'items') { show('items'); renderItems(); }
    else if (act === 'rating') { if (PROG.inTop10) { PROG.inTop10 = false; PROG.topSeen = true; saveWallet(); progressDot(); } show('rating'); }
    else if (act === 'achievements') show('achievements');
    else if (act === 'rules') show('rules');
    else if (act === 'history') show('history');
    else if (act === 'settings') { settingsReturn = 'menu'; show('settings'); }
  };
}

function initModeSheet() {
  PG.ui.bindModeSheet({
    backdrop: $('#modeSheetBackdrop'),
    opener: $('#btnOpenModes'),
    closeButton: $('#btnCloseSheet'),
    playButton: $('#btnMainPlay'),
    initial: wallet.playMode,
    reducedMotion: RM,
    onSelect: mode => { wallet.playMode = mode; saveWallet(); },
    onPlay: mode => mode === 'lobby' ? show('lobby') : openSetup(mode),
  });
}

initModeSheet();
initMenuHub();
})();
