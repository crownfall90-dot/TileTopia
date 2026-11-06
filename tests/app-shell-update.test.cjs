// Unit tests for E-1.1: src/app/web.js and src/app/update.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('app/web: platform detection and standalone mode', async () => {
  const W = await import('../src/app/web.js');
  assert.equal(W.SITE_URL, 'https://crownfall90-dot.github.io/TileTopia/');
  assert.ok(W.APK_URL.includes('Tiletopia.apk'));

  // Standalone detection
  assert.equal(W.isStandalone({standalone: true}, null), true);
  assert.equal(W.isStandalone({standalone: false}, () => ({matches: false})), false);
  assert.equal(W.isStandalone({standalone: false}, (q) => ({matches: q === '(display-mode: standalone)'})), true);

  // Platform detection: iOS
  const ios = W.detectPlatform({userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', platform: 'iPhone'});
  assert.equal(ios.isIOS, true);
  assert.equal(ios.isMobile, true);

  // Platform detection: Android
  const android = W.detectPlatform({userAgent: 'Mozilla/5.0 (Linux; Android 13)', platform: 'Linux armv8l'});
  assert.equal(android.isIOS, false);
  assert.equal(android.isMobile, true);

  // Platform detection: Desktop
  const desktop = W.detectPlatform({userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32'});
  assert.equal(desktop.isIOS, false);
  assert.equal(desktop.isMobile, false);
});

test('app/web: linkCode and parseLink', async () => {
  const W = await import('../src/app/web.js');

  assert.equal(W.linkCode('abc-123!'), 'ABC123');

  // HTTP URL with params
  const r1 = W.parseLink('https://crownfall90-dot.github.io/play/?room=AB12C&friend=XY789Z');
  assert.deepEqual(r1, {room: 'AB12C', friend: 'XY789Z'});

  // Custom scheme: puzzlegrad://room/AB12C
  const r2 = W.parseLink('puzzlegrad://room/AB12C');
  assert.deepEqual(r2, {room: 'AB12C'});

  // Custom scheme: puzzlegrad://friend/XY789Z
  const r3 = W.parseLink('puzzlegrad://friend/XY789Z');
  assert.deepEqual(r3, {friend: 'XY789Z'});

  // Invalid URL
  assert.equal(W.parseLink('not a url'), null);
});

test('app/update: UPD_WAIT and appCode', async () => {
  const U = await import('../src/app/update.js');
  assert.equal(U.UPD_WAIT, 10 * 60 * 1000);

  // Non-android returns 1e9 (infinity so web never pauses for android APK)
  assert.equal(U.appCode(false), 1e9);

  // Update pause rendering
  const players = [
    {owner: 'o1', human: true, resigned: false, name: 'Анна', col: '#ef5350'},
    {owner: 'o2', human: true, resigned: false, name: 'Борис', col: '#4c8dff'},
    {owner: null, human: false, resigned: false, name: 'Бот'}
  ];
  const readySet = new Set(['o1']);
  const rows = U.renderUpdPlayerRowsHtml(players, readySet);
  assert.ok(rows.includes('Анна'));
  assert.ok(rows.includes('class="ok"'));
  assert.ok(rows.includes('✓ обновился'));
  assert.ok(rows.includes('Борис'));
  assert.ok(rows.includes('обновляется…'));
  assert.ok(!rows.includes('Бот')); // bot omitted

  const pauseHtml = U.formatUpdPauseHtml({rowsHtml: rows, mine: true});
  assert.ok(pauseHtml.includes('Партия на паузе'));
  assert.ok(pauseHtml.includes('id="updGo"'));
  assert.ok(pauseHtml.includes('id="updSkip"'));

  assert.equal(U.formatUpdCountdown(125), 'Само продолжится через 2:05');
});
