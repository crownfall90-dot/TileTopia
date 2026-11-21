/* ---------------- minimised for over a minute: out of the online game ----------------
   In the background the phone does not play, so after AFK_MS the player is taken out of the room; on coming back a
   card says so and offers to rejoin (the game goes on from the room's log, a bot plays for the player meanwhile). */
const AFK_MS = 60000;
let hiddenAt = 0, afkTimer = 0;
let afkRejoin = null;
function afkKick() {
  if (tut || (!net && !mm)) return;
  let kind = 'room', code = null;
  token++; turnTok++; stopTimer(); clearInterval(watchId);
  if (mm) { kind = 'search'; stopMatch(false); }
  else { code = net.code; leaveRoom(); }
  closeGameMenu(); const sb = document.getElementById('sayBox'); if (sb) sb.hidden = true;
  show('menu');
  if (kind === 'search') { toastAny('Поиск игры остановлен, пока игра была свёрнута'); return; }
  // back into the game at once if the player is looking at the phone; otherwise on the first look
  if (document.hidden) afkRejoin = {code}; else { connect(code, false); show('lobby'); }
}
document.addEventListener('visibilitychange', () => {
  clearTimeout(afkTimer);
  if (document.hidden) { hiddenAt = Date.now(); afkTimer = setTimeout(afkKick, AFK_MS); return; }
  if (afkRejoin) { const r = afkRejoin; afkRejoin = null; hiddenAt = 0; resumeHold = false; connect(r.code, false); show('lobby'); return; }
  // Only a finished game left on screen goes home: the lobby, results or friends screens stay where the player was.
  if (phase === 'end' && !mm && gameVisible) { closeGameMenu(); show('menu'); }
  else if (hiddenAt && Date.now() - hiddenAt >= AFK_MS) afkKick();
  hiddenAt = 0;
});

/* ---------------- sound ---------------- */
// Synthesised effects and music live in src/audio/sound.js.
function musicLevel() { return !wallet.music ? 0 : document.hidden ? 0 : gameVisible ? .045 : .075; }
const sound = PG.audio.createSound({sfxOn: () => !!wallet.sound && !fast(), musicLevel});
const {audio, beep: beepSound, musicUpdate} = sound;
// The phone answers the key moments of a game with a short buzz of its own (Settings → Vibration).
const BUZZ = {place: 18, meeple: [12, 30, 12], score: [20, 40, 20], big: [30, 50, 30, 50, 60], win: [40, 60, 40, 60, 120], lose: 90};
function beep(kind) {
  beepSound(kind);
  if (!wallet.vib || fast() || !BUZZ[kind]) return;
  try { if (navigator.vibrate) navigator.vibrate(BUZZ[kind]); } catch (_) {}
}
// A quiet click on menu buttons.
document.addEventListener('click', e => { if (e.target.closest('button') && !e.target.closest('#scr-game .board')) beep('tap'); });
