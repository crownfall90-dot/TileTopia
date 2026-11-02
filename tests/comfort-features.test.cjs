// Tests for user comfort & UX enhancements:
// 1. Universal Nickname Generator & dice buttons
// 2. Multi-locations (Board themes & ambience: village, city, siberia, jungle)
// 3. In-game Emotes & Reactions offline / bot replies
// 4. Soft Save Progress Card prompt
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('comfort: generateRandomNickname generates universal valid names <= 12 chars', async () => {
  const {generateRandomNickname, NICKNAME_ADJECTIVES, NICKNAME_NOUNS, isValidNickname} = await import('../src/account/auth.js');

  assert.ok(Array.isArray(NICKNAME_ADJECTIVES) && NICKNAME_ADJECTIVES.length >= 8);
  assert.ok(Array.isArray(NICKNAME_NOUNS) && NICKNAME_NOUNS.length >= 8);

  // Test 100 generated names
  for (let i = 0; i < 100; i++) {
    const nick = generateRandomNickname();
    assert.ok(typeof nick === 'string' && nick.length >= 2, `Nickname too short: ${nick}`);
    assert.ok(nick.length <= 12, `Nickname exceeds 12 chars: ${nick}`);
    assert.ok(isValidNickname(nick), `Nickname not valid: ${nick}`);
  }

  // Deterministic mock test with rngFn
  const fixedNoun = generateRandomNickname(() => 0.1); // < 0.45 picks noun
  assert.ok(NICKNAME_NOUNS.includes(fixedNoun));

  const combo = generateRandomNickname(() => 0.5); // >= 0.45 tries combo
  assert.ok(combo.length <= 12);
});

test('comfort: askProfile dialog includes randomizer dice button #profDice', async () => {
  const {renderAskProfileDialogHtml} = await import('../src/game/tutorial.js');
  const html = renderAskProfileDialogHtml('#4caf50');
  assert.ok(html.includes('id="profDice"'), 'Must have profDice button');
  assert.ok(html.includes('🎲'), 'Must show dice emoji');
});

test('comfort: LOCS have stable identifiers and village is open while future locations are upcoming', async () => {
  const {LOCS} = await import('../src/state/catalog.js');
  assert.equal(LOCS.length, 4);
  const ids = LOCS.map(l => l.id);
  assert.deepEqual(ids, ['village', 'city', 'siberia', 'jungle']);
  assert.equal(LOCS[0].open, true, 'Village should be open');
  for (const loc of LOCS.slice(1)) {
    assert.equal(loc.open, false, `Location ${loc.id} should be marked upcoming (open: false)`);
    assert.ok(loc.name && loc.art, `Location ${loc.id} must have name and art`);
  }
});

test('comfort: game.html and styles support location picker, dice buttons, offline emotes and soft save prompt', () => {
  const html = fs.readFileSync(path.join(__dirname, '../web/game.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../src/ui/styles.css'), 'utf8');

  // 1. Nickname dice in renameDialog and profile
  assert.ok(html.includes('id="rnDice"'), 'Rename dialog should contain #rnDice');
  assert.ok(html.includes('generateRandomNickname'), 'Should use generateRandomNickname for guests');

  // 2. Setup location selector
  assert.ok(html.includes('id="setupLocBox"'), 'Setup screen should contain #setupLocBox');
  assert.ok(html.includes('data-loc="city"'), 'Setup should offer city location');
  assert.ok(html.includes('data-loc="siberia"'), 'Setup should offer siberia location');
  assert.ok(html.includes('data-loc="jungle"'), 'Setup should offer jungle location');

  // CSS themes for scr-game
  assert.ok(css.includes('#scr-game[data-loc="city"]'), 'CSS must style city board');
  assert.ok(css.includes('#scr-game[data-loc="siberia"]'), 'CSS must style siberia board');
  assert.ok(css.includes('#scr-game[data-loc="jungle"]'), 'CSS must style jungle board');

  // 3. Offline reactions & bot replies
  assert.ok(!html.includes("$('#sayBtn').hidden = !cfg.online;"), 'sayBtn should not be hidden in offline games');
  assert.ok(html.includes('botReplies'), 'Bot reactions should be implemented on emotes');

  // 4. Soft save prompt
  assert.ok(html.includes('savecard'), 'Game completion should include savecard prompt');
  assert.ok(html.includes('Сохранить прогресс'), 'Save card should mention saving progress');
  assert.ok(css.includes('.savecard'), 'CSS should style .savecard');
});
