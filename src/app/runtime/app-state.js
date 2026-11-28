'use strict';
var inbox = {}, friends = [];
if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
  try { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); } catch(_) {}
}
const T = 88, S = 192;
const DX = [0,1,0,-1], DY = [-1,0,1,0], V = [[0,-1],[1,0],[0,1],[-1,0]];
const ARROW = ['↑','→','↓','←'];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MEEPLE_D = 'M50 4C62 4 68 12 68 22C68 30 64 34 60 37L88 46C96 49 98 56 96 62C94 68 88 70 82 68L68 64L76 100C77 106 73 108 68 108L56 108L50 86L44 108L32 108C27 108 23 106 24 100L32 64L18 68C12 70 6 68 4 62C2 56 4 49 12 46L40 37C36 34 32 30 32 22C32 12 38 4 50 4Z';
// Five seats: colours are fixed per seat, names and human/bot are chosen before the game.
// Seats, palette, modes, rules, settings rows and streak gold live in src/state/config.js.
const {PL0, PALETTE, MODES, RULES, STREAK_GOLD, validCol} = PG.state.config;
// Colours players can pick; seats start with the first five.
const setup = {n: 4, onN: 2, seats: PL0.map(p => ({name: p.name, human: p.human, col: p.col}))};
try { const saved = JSON.parse(localStorage.getItem('setup')); if (saved && saved.seats && saved.seats.length === 5) Object.assign(setup, saved); } catch (_) {}
setup.seats.forEach((x, i) => { if (!validCol(x.col) || setup.seats.slice(0, i).some(y => y.col === x.col)) x.col = PALETTE.find(c => !setup.seats.slice(0, i).some(y => y.col === c.col)).col; });
// Game modes are presets of the rules below; any rule can still be changed after picking one.
setup.rules = Object.assign({mode: 'classic', deck: 50, rivers: true, meeples: 6, timer: 0, hints: true, tie: 'all', cups: false}, setup.rules);
setup.rules.tie = 'all'; // a disputed feature (equal figures) always gives every leader the full points: the usual rule, no option any more
if (!MODES[setup.rules.mode]) setup.rules.mode = 'classic';
if (![30, 50, 100].includes(setup.rules.deck)) setup.rules.deck = MODES[setup.rules.mode].set.deck; // the old sizes (40, 60, whole deck) became 30 / 50 / 100
if (![4, 5, 6, 8].includes(setup.rules.meeples)) setup.rules.meeples = MODES[setup.rules.mode].set.meeples;
const clean = v => String(v || '').replace(/[<>&"'`]/g, '').trim().slice(0, 12);
const appVersion = () => {
  if (window.AndroidApp && typeof AndroidApp.versionName === 'function') {
    const v = AndroidApp.versionName();
    if (v) return String(v).trim();
  }
  if (window.WEB_VERSION && typeof window.WEB_VERSION === 'string') {
    const s = window.WEB_VERSION.trim();
    if (s && s !== 'dev' && s !== 'веб-макет' && s !== 'TEST') {
      if (s.startsWith('1.0.')) return s;
      const num = s.replace(/^[^\d]*/, '');
      if (num) return '1.0.' + num;
    }
  }
  return '1.0.256';
};
if (!window.AndroidApp) {
  try {
    fetch('latest.json?t=' + Date.now())
      .then(r => r.json())
      .then(d => {
        if (d && d.version) {
          window.WEB_VERSION = d.version;
          const el = document.getElementById('verFull');
          if (el) el.textContent = appVersion();
        }
      })
      .catch(() => {});
  } catch (_) {}
}
// Who controls a seat: people on this phone (offline) or this phone's own seat (online); bots run on one phone only.
const isLocal = i => (typeof PG !== 'undefined' && PG.game && PG.game.isLocalPlayer)
  ? PG.game.isLocalPlayer(players[i], myId, !!net)
  : (net ? players[i].owner === myId : players[i].human);
const runsBot = i => !players[i].human && (!net || net.host);
const localHumans = () => (typeof PG !== 'undefined' && PG.game && PG.game.humanPlayers && !net)
  ? PG.game.humanPlayers(players).length
  : players.filter((p, i) => isLocal(i)).length;
const isMe = p => p && (net ? (p.owner === myId || (p.resigned && p.prevOwner === myId)) : (p.human && humanCount() === 1));
let gameRules = setup.rules, turnTok = 0;
const humanCount = () => players.filter(p => p.human).length;
// Card types (edges N E S W) live in src/engine/tiles.js.
const {TYPES, normEdge, rareName, deckList} = PG.engine;
const KIND = {c:'Город',r:'Дорога',f:'Монастырь'};

// Seeded randomness lives in src/engine/rng.js (bundled into window.PG by scripts/wrap-web.sh).
const {rng, hash} = PG.engine;
// Two currencies (src/state/coins.js): tiles are wallet.gold; the dearest things are paid in stars (wallet.stars).
const COINS = PG.state.coins, AV = PG.state.avatars;
let net = null;
let queue = [], applied = 0, gameLog = null, ending = false;
// catchUp: moves taken from the history (coming back to a game) are applied at once, without animation, sound or
// messages; only the last tile is shown (see focusLast).
let catchUp = false, lastPlaced = null, onlineMoveTracked = false;
const fast = () => queue.length > 1 || catchUp;
// A paused offline game (game menu open) holds bots and animations until it resumes.
let paused = false;
const clock = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
const wait = ms => new Promise(r => { const go = () => (paused && !net) || updHold() ? setTimeout(go, 150) : r(); if (fast() && !RM) go(); else setTimeout(go, RM ? Math.min(ms, 40) : ms); });
const myId = (() => { let v = null; try { v = localStorage.getItem('clientId'); if (!v) { v = Math.random().toString(36).slice(2, 10); localStorage.setItem('clientId', v); } } catch (_) {} return v || Math.random().toString(36).slice(2, 10); })();
const $ = s => document.querySelector(s);
const meepleSvg = col => `<svg viewBox="0 0 100 110"><path d="${MEEPLE_D}" fill="${col}" stroke="rgba(0,0,0,.35)" stroke-width="6"/></svg>`;
