const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Classic 2.0 cups go to their own board, the others stay on the main one', () => {
  const h = read('web/game.html');
  assert.match(h, /const hexRated = !!\(gameRules && gameRules\.mode === 'hex'\);/);
  assert.match(h, /if \(rated && hexRated\) \{ PROG\.hcups = \(PROG\.hcups \|\| 0\) \+ cups; syncRating\(false, 'hex'\); \}/);
  assert.match(h, /else if \(rated\) \{ PROG\.cups \+= cups; syncRating\(\); \}/);
  assert.match(h, /\$\{hex \? 'leaders_hex' : 'leaders'\}\/\$\{fbAuth\.uid\}\.json/);
  assert.match(h, /\$\{hexBoard \? 'leaders_hex' : 'leaders'\}\.json\?auth=/);
  assert.match(h, /id="topBoardHex">Классика 2\.0</);
});

test('the progress road counts the cups of both ratings', () => {
  const h = read('web/game.html');
  assert.strictEqual((h.match(/myCups = \(PROG\.cups \|\| 0\) \+ \(PROG\.hcups \|\| 0\)/g) || []).length, 3);
});

test('database rules have the same checks for the Classic 2.0 board', () => {
  const r = JSON.parse(read('docs/firebase-rules.json')).rules;
  assert.ok(r.leaders_hex, 'leaders_hex rules exist');
  assert.strictEqual(r.leaders_hex.$uid['.validate'], r.leaders.$uid['.validate']);
  assert.strictEqual(r.leaders_hex.$uid['.write'], r.leaders.$uid['.write']);
  assert.deepStrictEqual(r.leaders_hex['.indexOn'], ['r']);
});
