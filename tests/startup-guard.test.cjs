// The game must start: one missing element in its start-up code stopped it for every player (v266, a removed
// #ptabs still got a click handler). These checks catch that before a release.
'use strict';
const { gameSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = gameSource();

test('Android hands off its launch cover once the embedded illustration can paint', () => {
  const vm = require('node:vm');
  const listeners = {};
  let ready = 0;
  const AndroidApp = {launchArtReady() { ready++; }};
  const window = {AndroidApp, addEventListener() {}};
  const art = {complete: false, addEventListener(name, fn) { listeners[name] = fn; }};
  const document = {addEventListener() {}, querySelector: () => art};
  vm.runInNewContext(fs.readFileSync('web/boot-guard.js', 'utf8'), {window, AndroidApp, document, setTimeout() {}});
  window.__showWebLaunch();
  assert.equal(ready, 0);
  listeners.load();
  assert.equal(ready, 1);
  art.complete = true;
  window.__showWebLaunch();
  assert.equal(ready, 2);
  assert.deepEqual(fs.readFileSync('app/src/main/assets/launch-cover.webp'), fs.readFileSync('web/splash-landscape.webp'));
});

test('splash: every touching tile edge matches and the detailed art is embedded', async () => {
  const {edgeAt} = await import('../src/engine/board.js');
  const layout = require('../tools/splash/tiles.json');
  const matched = new Set();
  for (const [y, row] of layout.entries()) {
    for (const [x, [type, r]] of row.entries()) {
      for (const [next, side] of [[row[x + 1], 1], [layout[y + 1]?.[x], 2]]) {
        if (!next) continue;
        const edge = edgeAt({type, r}, side);
        assert.equal(edge, edgeAt({type: next[0], r: next[1]}, (side + 2) % 4), `${x},${y} side ${side}`);
        matched.add(edge);
      }
    }
  }
  for (const edge of ['w', 'r', 'c']) assert.ok(matched.has(edge));
  assert.match(html, /class="boot-art" src="data:image\/webp;base64,/);
  assert.ok(fs.statSync('web/splash-landscape.webp').size < 80 * 1024);
});

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

test('splash: allow an initial paint, start once on deadline, and skip the wait for reduced motion', () => {
  const vm = require('node:vm');
  for (const reduced of [false, true]) {
    const window = {addEventListener() {}};
    const frames = [], timers = new Map();
    vm.runInNewContext(fs.readFileSync('web/boot-guard.js', 'utf8'), {
      window, document: {addEventListener() {}, hidden: false}, matchMedia: () => ({matches: reduced}),
      requestAnimationFrame: fn => frames.push(fn),
      setTimeout: (fn, ms) => { timers.set(ms, fn); return ms; }, clearTimeout: ms => timers.delete(ms),
    });
    let starts = 0;
    window.__afterSplash(() => starts++);
    assert.equal(starts, reduced ? 1 : 0);
    if (!reduced) {
      const fallback = timers.get(400);
      frames.shift()(); frames.shift()();
      assert.equal(starts, 0);
      timers.get(240)(); fallback();
      assert.equal(starts, 1);
    }
  }
});

test('splash: a silent native update check has a deadline even with reduced motion', async () => {
  const {startSplash} = await import('../src/app/splash.js');
  const boot = {min: false, checked: false};
  let opened = false;
  let deadline;
  startSplash({boot, finish: () => { opened = boot.min && boot.checked; },
    schedule: (fn, ms) => { assert.ok(ms <= 2000); deadline = fn; }});
  assert.ok(boot.min);
  assert.ok(!opened);
  deadline();
  assert.ok(opened);
});
