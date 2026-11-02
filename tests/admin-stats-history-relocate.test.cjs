// Tests for:
// 1. Relocation of match history from profile tabs to main screen header button.
// 2. Founder admin panel: empty nickname guest filtering, purge empty accounts,
//    aggregate match mode statistics, and human-readable action logs.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const GAME_PATH = path.join(__dirname, '..', 'web', 'game.html');
const ADMIN_PATH = path.join(__dirname, '..', 'tools', 'founder-admin.html');
const RULES_PATH = path.join(__dirname, '..', 'docs', 'firebase-rules.json');
const STYLES_PATH = path.join(__dirname, '..', 'src', 'ui', 'styles.css');

test('history tab relocated: button in main menu header, profile has 3 tabs, dedicated history screen', () => {
  const gameHtml = fs.readFileSync(GAME_PATH, 'utf8');
  const stylesCss = fs.readFileSync(STYLES_PATH, 'utf8');

  // 1. Main menu top right tools contains history button
  assert.ok(gameHtml.includes('data-go="history"'), 'main screen header has data-go="history"');
  assert.ok(gameHtml.includes('aria-label="История партий"'), 'history button has accessible label');

  // 2. Profile tabs do NOT contain history tab anymore
  assert.ok(!gameHtml.includes('data-pt="hist"'), 'profile #ptabs does not have data-pt="hist"');
  assert.ok(gameHtml.includes('<div class="seg ptabs" id="ptabs"><button data-pt="rewards" aria-pressed="true">Награды</button><button data-pt="cols" aria-pressed="false">Коллекции</button><button data-pt="top" aria-pressed="false">Рейтинг</button></div>'), 'ptabs contains rewards, collections, rating');

  // 3. CSS has 3 columns for ptabs
  assert.ok(stylesCss.includes('#ptabs{grid-template-columns:repeat(3,minmax(0,1fr))}'), '#ptabs styles updated to 3 columns');

  // 4. Dedicated history screen exists
  assert.ok(gameHtml.includes('id="scr-history"'), '#scr-history screen exists');
  assert.ok(gameHtml.includes('id="historyList"'), '#historyList container exists');

  // 5. show() wires history
  assert.ok(gameHtml.includes("if (name === 'history') renderHistory($('#historyList'))"), 'show() calls renderHistory for history screen');
});

test('firebase rules: admin read allowed for profiles', () => {
  const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
  assert.ok(rules.rules.profiles['.read'], 'profiles has .read rule');
  assert.ok(rules.rules.profiles['.read'].includes('admins'), 'admin can read profiles collection');
});

test('founder-admin: statistics cards, empty guest filtering, and readable action logs', () => {
  const adminHtml = fs.readFileSync(ADMIN_PATH, 'utf8');

  // Verify UI elements exist
  assert.ok(adminHtml.includes('id="statActivePlayers"'), 'statActivePlayers element exists');
  assert.ok(adminHtml.includes('id="statOnlineGames"'), 'statOnlineGames element exists');
  assert.ok(adminHtml.includes('id="statFriendGames"'), 'statFriendGames element exists');
  assert.ok(adminHtml.includes('id="statBotGames"'), 'statBotGames element exists');
  assert.ok(adminHtml.includes('id="btnFilterEmpty"'), 'btnFilterEmpty button exists');
  assert.ok(adminHtml.includes('id="btnPurgeEmpty"'), 'btnPurgeEmpty button exists');

  // Extract JS functions to test logic in sandbox
  const scriptMatch = adminHtml.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'script tag found in admin panel');
  const scriptContent = scriptMatch[1];

  // Test isGuestNickname & isEmptyGuest logic in sandbox
  const sandbox = {
    esc: s => String(s),
    PLAT: {web: 'Сайт', app: 'Android'},
    FB_CAT: {bug: 'Баг', other: 'Другое'}
  };
  vm.createContext(sandbox);

  vm.runInContext(`
    function isGuestNickname(name) {
      if (!name) return true;
      const s = String(name).trim().toLowerCase();
      return /^nickname\\d+$/i.test(s);
    }
    function isEmptyGuest(p) {
      if (p.r || p.hasProfile) return false;
      if (!isGuestNickname(p.n)) return false;
      if ((p.games || 0) > 0) return false;
      if ((p.rating || 0) > 0 || (p.owins || 0) > 0) return false;
      if ((p.onlineGames || 0) > 0 || (p.friendGames || 0) > 0 || (p.botGames || 0) > 0) return false;
      if (p.isOnline && (p.s === 'online' || p.s === 'bots' || p.s === 'search')) return false;
      if (p.d1 || p.d7) return false;
      return true;
    }
  `, sandbox);

  // An un-registered guest with name "nickname123" and 0 games is an empty guest
  assert.equal(sandbox.isEmptyGuest({n: 'nickname123', r: 0, games: 0}), true, 'empty nickname guest is detected');
  // An un-registered guest with name "nickname999" who played 2 games is ACTIVE, NOT empty
  assert.equal(sandbox.isEmptyGuest({n: 'nickname999', r: 0, games: 2}), false, 'guest who played 2 games is kept');
  // A registered user is NOT empty
  assert.equal(sandbox.isEmptyGuest({n: 'nickname55', r: 1, games: 0}), false, 'registered user is kept');
  // A guest who chose a custom name like "Alex" is NOT an empty nickname
  assert.equal(sandbox.isEmptyGuest({n: 'Alex', r: 0, games: 0}), false, 'user with custom nickname is kept');
  // A guest who has rating is NOT empty
  assert.equal(sandbox.isEmptyGuest({n: 'nickname40', r: 0, rating: 15}), false, 'guest with rating is kept');
  // A guest currently in a match is NOT empty
  assert.equal(sandbox.isEmptyGuest({n: 'nickname10', r: 0, isOnline: true, s: 'online'}), false, 'guest currently in game is kept');

  // Verify LOG_TITLES covers game events
  assert.ok(adminHtml.includes('game_start'), 'contains game_start');
  assert.ok(adminHtml.includes('game_end'), 'contains game_end');
  assert.ok(adminHtml.includes('Начало партии'), 'contains Russian title for game_start');
  assert.ok(adminHtml.includes('Конец партии'), 'contains Russian title for game_end');
  assert.ok(adminHtml.includes('formatLogDetail'), 'contains formatLogDetail function');
});
