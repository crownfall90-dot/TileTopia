const { gameSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert');
test('vibration has its own switch in the sound group and is on by default', async () => {
  const {PREFS, PREF_GROUPS} = await import('../src/state/config.js');
  assert.equal(PREFS.find(pref => pref.k === 'vib')?.label, 'Вибрация');
  assert.ok(PREF_GROUPS.some(([, keys]) => ['sound', 'music', 'vib'].every(key => keys.includes(key))));
  assert.match(gameSource(), /alert: true, vib: true\}/);
});

test('every beep also buzzes the phone for place, meeple, score, win and lose, unless switched off or fast-forwarding', () => {
  const html = gameSource();
  const m = html.match(/const BUZZ = \{([^}]*)\};/);
  assert.ok(m, 'BUZZ table exists');
  for (const k of ['place', 'meeple', 'score', 'big', 'win', 'lose']) assert.match(m[1], new RegExp('\\b' + k + ':'));
  assert.match(html, /if \(!wallet\.vib \|\| fast\(\) \|\| !BUZZ\[kind\]\) return;/);
});
