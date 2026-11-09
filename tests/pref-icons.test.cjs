const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

test('every settings row has a drawn icon', async () => {
  const {PREFS} = await import(pathToFileURL(path.join(__dirname, '..', 'src/state/config.js')).href);
  const {prefIcon} = await import(pathToFileURL(path.join(__dirname, '..', 'src/ui/icons.js')).href);
  for (const r of PREFS) assert.match(prefIcon(r.k), /^<svg [^>]*stroke="currentColor"/, r.k);
  assert.strictEqual(prefIcon('nope'), '');
});
