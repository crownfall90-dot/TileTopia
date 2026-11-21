/* ---------------- update pause ---------------- */
// When a new version comes out during an online game, the game waits for everyone: the clocks and the
// bots stop, a card shows who has updated, and play goes on when all seat owners are on the new
// version (they say so when they come back into the room), when someone taps "continue" or after 10 minutes.
// Phones from before this feature do not know the message and keep playing.
const {UPD_WAIT, appCode: calcAppCode} = PG.app.update;
const appCode = () => calcAppCode(isAndroid);
function updHold() { return !!(net && net.upd && !net.upd.done); }
let lastUpd = null, updTick = 0;
const updOwners = () => [...new Set(players.filter(p => p.owner && p.human && !p.resigned).map(p => p.owner))];
// Tell the table which version this phone runs (sent on joining the game and when a pause starts).
function updAnnounce() { if (net && net.gameId && players.some(p => p.owner === myId)) netSend({t: 'ver', g: net.gameId, c: appCode(), o: myId}); }
function updOpen(c) {
  if (!net || !net.gameId || phase === 'end' || !players.length || !players.some(p => p.owner === myId && !p.resigned)) return;
  if (net.upd && net.upd.c >= c) return;
  net.upd = {c, since: Date.now(), ready: new Set(), done: false};
  clearInterval(updTick); updTick = setInterval(updCheck, 1000);
  updCheck();
}
function updCheck() {
  const u = net && net.upd; if (!u || u.done) return clearInterval(updTick);
  if (appCode() >= u.c) u.ready.add(myId);
  if (updOwners().every(o => u.ready.has(o))) return updEnd('Все обновились — партия продолжается');
  if (Date.now() - u.since > UPD_WAIT) return updEnd('Время ожидания вышло — партия продолжается');
  renderUpdPause();
}
function updEnd(text) {
  if (net && net.upd) net.upd.done = true;
  clearInterval(updTick); const b = $('#updpause'); if (b) b.remove();
  if (text) toastAny(text);
}
function renderUpdPause() {
  const u = net.upd; let box = $('#updpause');
  if (!box) { box = document.createElement('div'); box.id = 'updpause'; box.className = 'over'; box.style.position = 'fixed'; document.body.append(box); }
  const left = Math.max(0, Math.ceil((u.since + UPD_WAIT - Date.now()) / 1000));
  const rows = (typeof PG !== 'undefined' && PG.app && PG.app.update && PG.app.update.renderUpdPlayerRowsHtml)
    ? PG.app.update.renderUpdPlayerRowsHtml(players, u.ready)
    : players.filter(p => p.owner && p.human && !p.resigned).map(p => `<li class="${u.ready.has(p.owner) ? 'ok' : ''}"><i style="background:${p.col}"></i><b>${p.name}</b><span>${u.ready.has(p.owner) ? '✓ обновился' : 'обновляется…'}</span></li>`).join('');
  const mine = appCode() < u.c;
  const key = rows + mine + (left < 1);
  if (box.dataset.k !== key) {
    box.dataset.k = key;
    box.innerHTML = (typeof PG !== 'undefined' && PG.app && PG.app.update && PG.app.update.formatUpdPauseHtml)
      ? PG.app.update.formatUpdPauseHtml({rowsHtml: rows, mine})
      : `<div class="ocard"><div style="font-size:38px">⏸</div><h3>Партия на паузе</h3><p>Вышло обновление. Время хода остановлено, пока все игроки не обновятся.</p><ul class="updlist">${rows}</ul>${mine ? '<button class="cta wide" id="updGo">Обновить</button>' : ''}<button class="ghostbtn" id="updSkip">Продолжить без ожидания</button><small id="updLeft"></small></div>`;
    $('#updSkip').onclick = () => { netSend({t: 'upresume', g: net.gameId, c: u.c}); updEnd('Партия продолжается'); };
    const go = $('#updGo'); if (go) go.onclick = () => { if (lastUpd) window.onUpdateAvailable(lastUpd, true); else if (window.AndroidApp && AndroidApp.checkUpdates) AndroidApp.checkUpdates(); };
  }
  const t = $('#updLeft');
  if (t) {
    t.textContent = (typeof PG !== 'undefined' && PG.app && PG.app.update && PG.app.update.formatUpdCountdown)
      ? PG.app.update.formatUpdCountdown(left)
      : `Само продолжится через ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  }
}

// Android "Back": close a dialog, open the game menu, or go back to the main menu; false lets the app close.
let backAt = 0;
window.onBack = () => {
  if ($('#modeSheetBackdrop')?.classList.contains('open')) { $('#btnCloseSheet').click(); return true; }
  const dlg = [...document.querySelectorAll('body > .over')].pop();
  if (dlg && dlg.id === 'updpause') return true;
  if (dlg) { if (dlg.id === 'gmenu') closeGameMenu(); else if (dlg !== updBox || !dlg.querySelector('#upd').disabled) dlg.remove(); return true; }
  const cur = [...document.querySelectorAll('.screen')].find(x => !x.hidden);
  // On the main menu the first "back" only warns; a second one within 2 s closes the app.
  if (!cur || cur.id === 'scr-menu') {
    if (Date.now() - backAt < 2000) return false;
    backAt = Date.now(); toastAny(isWeb && !isMobile ? 'Нажмите «Назад» ещё раз, чтобы выйти' : 'Смахните ещё раз, чтобы выйти'); return true;
  }
  if (cur.id === 'scr-match') { show('menu'); return true; }
  if (cur.id === 'scr-lobby') { $('#lobbyBack').click(); return true; }
  if (cur.id === 'scr-game' && phase !== 'end') { openGameMenu(); return true; }
  if (cur.id === 'scr-settings') { $('#settingsBack').click(); return true; }
  if (cur.id === 'scr-friends') { $('#fBack').click(); return true; }
  show('menu'); return true;
};
