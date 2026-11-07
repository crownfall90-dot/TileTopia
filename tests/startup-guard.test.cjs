// The game must start: one missing element in its start-up code stopped it for every player (v266, a removed
// #ptabs still got a click handler). These checks catch that before a release.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('web/game.html', 'utf8');

test('start-up: every element the game wires up at the top level exists in the page', () => {
  const ids = new Set([...html.matchAll(/id="([\w-]+)"/g)].map(m => m[1]));
  const missing = [];
  for (const m of html.matchAll(/^\$\('#([\w-]+)'\)\.(on\w+|addEventListener)\b/gm)) if (!ids.has(m[1])) missing.push(m[1]);
  assert.deepEqual(missing, [], 'no element with these ids: guard the line or put the element back');
});

test('start-up: the game says it is ready only at the end of its start-up, and the boot guard can still update a broken one', () => {
  const ready = [...html.matchAll(/window\.__ready = true;/g)].map(m => m.index);
  assert.equal(ready.length, 1, 'one place sets __ready');
  assert.ok(ready[0] > html.indexOf('window.onUpdateAvailable = (info, manual)'), '__ready is set after the whole start-up');
  assert.ok(html.includes('if (window.__upd) setTimeout(() => window.onUpdateAvailable(window.__upd, false));'), 'an update found early is shown');
  const guard = fs.readFileSync('web/boot-guard.js', 'utf8'), wrap = fs.readFileSync('scripts/wrap-web.sh', 'utf8');
  assert.match(guard, /window\.onUpdateAvailable = function/);
  assert.match(guard, /AndroidApp|window\.AndroidApp/);
  assert.match(guard, /startUpdate\(u\.url\)/);
  assert.equal((wrap.match(/cat web\/boot-guard\.js/g) || []).length, 2, 'both the app and the site get the guard');
});

test('updates over the air: the page reports its start, the app checks a signature, CI signs with the secret', () => {
  const ready = html.indexOf('window.__ready = true;');
  assert.ok(html.indexOf('AndroidApp.contentReady()', ready) > ready, 'the page tells the app it started, after __ready');
  const cu = fs.readFileSync('app/src/main/java/com/crownfall/mosaic/ContentUpdater.java', 'utf8');
  assert.match(cu, /PUBLIC_KEY = "MFkw[A-Za-z0-9+/=]+"/, 'a P-256 public key is built in');
  assert.match(cu, /SHA256withECDSA/);
  assert.match(cu, /markBad/);
  const act = fs.readFileSync('app/src/main/java/com/crownfall/mosaic/MainActivity.java', 'utf8');
  assert.match(act, /loadDataWithBaseURL\(ContentUpdater\.BUNDLED/, 'a downloaded page runs at the bundled address (same saves)');
  for (const w of ['staging.yml', 'promote-production.yml']) {
    const y = fs.readFileSync('.github/workflows/' + w, 'utf8');
    assert.match(y, /OTA_SIGNING_KEY: \$\{\{ secrets\.OTA_SIGNING_KEY \}\}/, w);
    assert.match(y, /scripts\/ci\/make-web-ota\.py/, w);
  }
  assert.match(fs.readFileSync('.github/workflows/promote-production.yml', 'utf8'), /if: inputs\.announce/, 'Telegram only on request');
});
