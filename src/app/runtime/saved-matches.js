/* ---------------- saved game (offline) ---------------- */
const FINISHED_GAMES_KEY = 'finishedGames', GAME_HISTORY_KEY = 'gameHistory';
function gameKey(cfg = gameLog && gameLog.cfg) { return (typeof PG !== 'undefined' && PG.state && PG.state.save) ? PG.state.save.gameKey(cfg) : (!cfg ? '' : cfg.online ? 'o:' + cfg.online : cfg.localId ? 'l:' + cfg.localId : ''); }
function jsonRead(key, fallback) { return (typeof PG !== 'undefined' && PG.state && PG.state.save) ? PG.state.save.jsonRead(localStorage, key, fallback) : (() => { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (_) { return fallback; } })(); }
function finishedGames() { return (typeof PG !== 'undefined' && PG.state && PG.state.save) ? PG.state.save.finishedGames(localStorage) : (() => { const a = jsonRead(FINISHED_GAMES_KEY, []); return Array.isArray(a) ? a.filter(x => typeof x === 'string' || (x && typeof x.k === 'string')) : []; })(); }
function gameFinished(key) { return (typeof PG !== 'undefined' && PG.state && PG.state.save) ? PG.state.save.isGameFinished(localStorage, key) : (!!key && finishedGames().some(x => (typeof x === 'string' ? x : x.k) === key)); }
function markGameFinished(key) {
  if (typeof PG !== 'undefined' && PG.state && PG.state.save) return PG.state.save.markGameFinished(localStorage, key);
  if (!key) return;
  try { const a = finishedGames().filter(x => (typeof x === 'string' ? x : x.k) !== key); a.unshift({k:key,at:Date.now()}); localStorage.setItem(FINISHED_GAMES_KEY, JSON.stringify(a.slice(0, 200))); } catch (_) {}
}
function historySave(reason, final) {
  const id = gameKey(); if (!id) return;
  const row = {id,at:Date.now(),reason:reason || 'deck',final:!!final,players:players.map(p => ({name:p.name,score:p.score,col:p.col,me:isMe(p),uid:p.uid || null,bot:!p.human,resigned:!!p.resigned}))};
  if (typeof PG !== 'undefined' && PG.state && PG.state.save) {
    PG.state.save.saveHistoryEntry(localStorage, row);
  } else {
    try { const data = jsonRead(GAME_HISTORY_KEY, []), old = Array.isArray(data) ? data.filter(x => x && typeof x.id === 'string') : []; localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify([row, ...old.filter(x => x.id !== id)].slice(0, 50))); } catch (_) {}
  }
  if (final && typeof cloudSaveSoon === 'function') cloudSaveSoon();
}
function saveGame() {
  if (!gameLog || net || tut || phase === 'end' || gameFinished(gameKey())) return;
  if (typeof PG !== 'undefined' && PG.state && PG.state.save) return PG.state.save.saveActiveGame(localStorage, gameLog);
  try { localStorage.setItem('savedGame', JSON.stringify(gameLog)); } catch (_) {}
}
function clearSave() {
  if (typeof PG !== 'undefined' && PG.state && PG.state.save) PG.state.save.clearActiveGame(localStorage);
  else try { localStorage.removeItem('savedGame'); } catch (_) {}
}
function loadSave() {
  if (typeof PG !== 'undefined' && PG.state && PG.state.save) return PG.state.save.loadActiveGame(localStorage);
  try {
    const saved = JSON.parse(localStorage.getItem('savedGame'));
    if (!saved) return null;
    if (!saved.cfg || !Array.isArray(saved.cfg.seats) || saved.cfg.seats.length < 2 || !Array.isArray(saved.cfg.deck) || !Array.isArray(saved.moves) || gameFinished(gameKey(saved.cfg))) {
      localStorage.removeItem('savedGame'); return null;
    }
    return saved;
  } catch (_) { return null; }
}
// An online game this phone took part in during the last 3 hours, if it may still be going.
function lastOnline() {
  if (typeof PG !== 'undefined' && PG.state && PG.state.save) return PG.state.save.getLastOnline(localStorage);
  try { const g = JSON.parse(localStorage.getItem('lastGame')); return g && Date.now() - g.at < 3 * 3600e3 ? g : null; } catch (_) { return null; }
}
/* A game that is still going is never lost and needs no button: coming back to the game (a new start, or back from the
   background after the phone dropped the player out) puts the player straight into it — the saved game of this phone,
   or the online room they were in. Leaving by «Выйти в главное меню» on purpose pauses that until the next start. */
let resumeHold = false;
function getActiveResumableGame() {
  if (phase !== 'end' && players && players.length) {
    return {
      kind: net ? 'online' : 'live',
      sub: net ? `Комната ${net.code} · ход ${turn + 1}` : 'Игра не завершена'
    };
  }
  const p = pendingGame();
  if (p) {
    if (p.kind === 'saved') {
      return { kind: 'saved', sub: 'Сохранённая партия' };
    }
    if (p.kind === 'online' && p.lg && p.lg.code) {
      return { kind: 'online_rejoin', sub: `Комната ${p.lg.code}`, code: p.lg.code };
    }
  }
  return null;
}

function updateMenuResumeBtn() {
  const b = $('#btnMenuResumeGame');
  if (!b) return;
  const active = getActiveResumableGame();
  if (active) {
    b.hidden = false;
    const sub = b.querySelector('#mrgSub');
    if (sub) sub.textContent = active.sub;
  } else {
    b.hidden = true;
  }
}

function pendingGame() {
  const sv = loadSave(), lg = lastOnline() && (!net || !gameVisible); // also when a dead room object is left behind after a drop
  if (sv && sv.moves && sv.cfg) return {kind: 'saved', sv};
  return lg ? {kind: 'online', lg: lastOnline()} : null;
}
function autoResume() {
  if (tut || resumeHold || gameVisible || document.hidden || mm) return false;
  // only what must be answered first holds it back: an update offer, the maintenance screen, the reinstall card
  if ((updBox && document.body.contains(updBox)) || document.getElementById('maintBox') || document.getElementById('reinst')) return false;
  const g = pendingGame(); if (!g) return false;
  if (g.kind === 'saved') { if (net) leaveRoom(); startGame(g.sv.cfg, g.sv.moves); show('game'); return true; }
  connect(g.lg.code, false); show('lobby');
  return true;
}
