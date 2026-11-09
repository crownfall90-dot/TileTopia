const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('vibration has its own switch in the sound group and is on by default', () => {
  const cfg = read('src/state/config.js');
  assert.match(cfg, /\{k: 'vib'[^}]*Вибрация/);
  assert.match(cfg, /\['Звук', \['sound', 'music', 'vib'\]\]/);
  assert.match(read('web/game.html'), /alert: true, vib: true\}/);
});

test('every beep also buzzes the phone for place, meeple, score, win and lose, unless switched off or fast-forwarding', () => {
  const html = read('web/game.html');
  const m = html.match(/const BUZZ = \{([^}]*)\};/);
  assert.ok(m, 'BUZZ table exists');
  for (const k of ['place', 'meeple', 'score', 'big', 'win', 'lose']) assert.match(m[1], new RegExp('\\b' + k + ':'));
  assert.match(html, /if \(!wallet\.vib \|\| fast\(\) \|\| !BUZZ\[kind\]\) return;/);
});
