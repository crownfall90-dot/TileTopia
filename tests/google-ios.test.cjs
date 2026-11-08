// Google sign-in in the web version on iPhone/iPad: the pop-up is not used (it often never reports back there);
// the button goes to Google's page, and only an answer to our own request (state + nonce) is accepted on return.
// Fully offline: every network request is stopped, nothing reaches Firebase.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const {loadPlaywright, instrumentedCopy} = require('./golden/harness.cjs');

// localStorage needs a real origin: serve the instrumented page from 127.0.0.1
const serve = file => new Promise(res => { const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(fs.readFileSync(file)); }).listen(0, '127.0.0.1', () => res(srv)); });
const OUT = /^https?:\/\/(?!127\.0\.0\.1)/;

const pw = loadPlaywright();
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const INIT = `window.WEBAPP = true; window.IS_STAGING = false; window.FIREBASE = {apiKey: 'k', dbUrl: 'https://db.invalid', googleClientId: 'cid.apps.googleusercontent.com'};`;
const jwt = p => 'h.' + Buffer.from(JSON.stringify(p)).toString('base64url') + '.s';

async function open(browser, file, hash = '', extra = '') {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, userAgent: IPHONE, reducedMotion: 'reduce'});
  await ctx.addInitScript(INIT + extra);
  const page = await ctx.newPage(), errors = [], google = [], idp = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(OUT, r => { const u = r.request().url(); if (u.startsWith('https://accounts.google.com/o/oauth2')) google.push(u); if (/signInWithIdp/.test(u)) idp.push(r.request().postData()); r.abort(); });
  await page.goto(file + hash);
  await page.waitForFunction(() => !!window.__pg, null, {timeout: 15000});
  return {ctx, page, errors, google, idp};
}

test('google on iPhone web: the button goes to Google\'s page; the answer is taken from the address', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 60000}, async () => {
  const browser = await pw.chromium.launch(), srv = await serve(instrumentedCopy()), file = `http://127.0.0.1:${srv.address().port}/game.html`;
  try {
    const a = await open(browser, file);
    await a.page.evaluate(() => document.querySelector('#acLogin').click());
    await a.page.waitForSelector('#accGoogle');
    await a.page.evaluate(() => document.querySelector('#accGoogle').click());
    await a.page.waitForTimeout(300);
    assert.equal(a.google.length, 0, 'locked until the consent tick-box is ticked');
    await a.page.evaluate(() => document.querySelector('#consentBox').click());
    await a.page.evaluate(() => document.querySelector('#accGoogle').click());
    await a.page.waitForTimeout(500);
    assert.equal(a.google.length, 1, 'went to Google');
    const u = new URL(a.google[0]);
    assert.equal(u.searchParams.get('client_id'), 'cid.apps.googleusercontent.com');
    assert.equal(u.searchParams.get('response_type'), 'id_token');
    const saved = {state: u.searchParams.get('state'), nonce: u.searchParams.get('nonce'), link: false, at: Date.now()};
    assert.match(saved.state, /^[0-9a-f]{32}$/); assert.match(saved.nonce, /^[0-9a-f]{32}$/);
    assert.equal(u.searchParams.get('redirect_uri'), file, 'back to this very page');
    // a forged answer (wrong state) is ignored and wiped from the address
    const back = (state, nonce) => '#state=' + state + '&id_token=' + jwt({email: 'p@example.com', nonce});
    await a.ctx.close();
    const keep = `localStorage.setItem('gRedirect', ${JSON.stringify(JSON.stringify(saved))});`;
    const b = await open(browser, file, back('forged', saved.nonce), keep);
    await b.page.waitForTimeout(800);
    assert.equal(b.idp.length, 0, 'not our request: no sign-in');
    assert.equal(await b.page.evaluate(() => location.hash), '');
    await b.ctx.close();
    // our own answer goes on to Firebase (stopped here, offline) with Google's token
    const c = await browser.newContext({viewport: {width: 390, height: 844}, userAgent: IPHONE});
    await c.addInitScript(INIT + keep);
    const p = await c.newPage(), idp = [];
    await p.route(OUT, r => { if (/signInWithIdp|signUp|accounts:/.test(r.request().url())) idp.push(r.request().url()); r.abort(); });
    await p.goto(file + back(saved.state, saved.nonce));
    await p.waitForTimeout(1500);
    assert.ok(idp.length >= 1, 'signing in with the returned token');
    assert.equal(await p.evaluate(() => location.hash), '');
    assert.equal(await p.evaluate(() => localStorage.getItem('gRedirect')), null, 'used once');
    await c.close();
    assert.deepEqual(a.errors.concat(b.errors), []);
  } finally { await browser.close(); srv.close(); }
});
