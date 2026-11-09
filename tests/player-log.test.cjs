// The game's event log for the owner's panel: key events go to /logs/{uid} in one batch, as plain records
// {t: server time, k: kind, d: detail}; an e-mail address never gets into a detail. Firebase is a fake.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const games = require('./golden/games.json');
const {loadPlaywright, instrumentedCopy} = require('./golden/harness.cjs');

const pw = loadPlaywright();
const serve = file => new Promise(res => { const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(fs.readFileSync(file)); }).listen(0, '127.0.0.1', () => res(srv)); });

test('player log: events leave in a batch, with no addresses', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 60000}, async () => {
  const browser = await pw.chromium.launch(), srv = await serve(instrumentedCopy()), file = `http://127.0.0.1:${srv.address().port}/game.html`;
  try {
    const ctx = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
    await ctx.addInitScript("window.FIREBASE = {apiKey: 'k', dbUrl: 'https://db.invalid', googleClientId: ''};");
    const page = await ctx.newPage(), errors = [], posts = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => {
      const u = r.request().url(), ok = b => r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(b)});
      if (/accounts:signUp/.test(u)) return ok({idToken: 'T', refreshToken: 'R', localId: 'u1', expiresIn: '3600'});
      if (/db\.invalid/.test(u)) { if (r.request().method() !== 'GET' && /\/logs\//.test(u)) posts.push({u, b: JSON.parse(r.request().postData() || '{}')}); return ok(null); }
      return r.abort();
    });
    await page.goto(file);
    await page.waitForFunction(() => !!window.__pg, null, {timeout: 15000});
    // a dozen games start: the batch is sent at once (12 events)
    await page.evaluate(g => { window.__pg.wallet().stats = true; /* statistics need the player's consent */ for (let i = 0; i < 12; i++) window.__pg.startGame(g.cfg, []); }, games[0]);
    await page.waitForFunction(() => true); await page.waitForTimeout(1500);
    assert.ok(posts.length >= 1, 'a batch was sent');
    const first = posts[0], recs = Object.values(first.b);
    assert.match(first.u, /\/logs\/u1\.json\?auth=T/);
    assert.ok(recs.length >= 2 && recs.length <= 30);
    for (const r of recs) { assert.equal(typeof r.k, 'string'); assert.deepEqual(r.t, {'.sv': 'timestamp'}); assert.ok(!r.d || r.d.length <= 240); assert.ok(!/@/.test(r.d || ''), 'no address in ' + r.k); }
    assert.ok(recs.some(r => r.k === 'game_start')); // 'open' is logged before the player's consent, so it is not in the batch
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});
