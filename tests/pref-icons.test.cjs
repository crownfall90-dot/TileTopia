const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

test('every settings row has a drawn icon', async () => {
  const {PREFS} = await import(path.join(__dirname, '..', 'src/state/config.js'));
  const {prefIcon} = await import(path.join(__dirname, '..', 'src/ui/icons.js'));
  for (const r of PREFS) assert.match(prefIcon(r.k), /^<svg [^>]*stroke="currentColor"/, r.k);
  assert.strictEqual(prefIcon('nope'), '');
});
