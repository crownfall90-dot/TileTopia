// Google Play readiness: account deletion (in the app and on a web page), rules that let a player delete their own data,
// no advertising ID, the policy and the data-safety answers exist, and the game is called Tiletopia.
'use strict';
const { gameSource } = require('../scripts/compose-page.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = f => fs.readFileSync(__dirname + '/../' + f, 'utf8');

test('play: in-app deletion path, web deletion page and policy are there and agree', () => {
  const game = gameSource();
  assert.match(game, /id="delAccBtn"/, 'Settings has "Delete account and data"');
  assert.match(game, /function accountDataDialog\(\)/, 'Account and data opens dedicated dialog from About app');
  assert.match(game, /function confirmWordDialog\(/, 'Multi-step protection with keyword confirmation exists');
  assert.match(game, /confirmWordDialog\('УДАЛИТЬ'/, 'askDeleteAccount requires typing УДАЛИТЬ');
  assert.match(game, /async function deleteMyAccount\(\)/);
  assert.match(game, /await FBC\.deleteAccount\(/);
  assert.match(read('src/net/firebase.js'), /await idt\('delete'/, 'deletes the sign-in too');
  assert.ok(!game.includes('data-hacct="del"'), 'profile card does not have delete button (moved exclusively to Settings)');
  assert.match(game, /id="plReport"/, 'a player can be reported (user-generated nicknames and statuses)');
  const page = read('web/delete-account.html');
  assert.match(page, /Settings → Account and data/);
  assert.match(page, /30 дней/);
  assert.match(read('scripts/wrap-web.sh'), /delete-account\.html/, 'the page is published with the site');
  const policy = read('docs/privacy-policy.md');
  assert.match(policy, /delete-account\.html/);
  assert.match(policy, /90 дней/, 'backups retention is stated');
  assert.match(read('docs/product/GOOGLE-PLAY-DATA-SAFETY.md'), /delete-account\.html/);
});

test('play: rules let the owner delete own nodes; manifest has no advertising ID', () => {
  const r = JSON.parse(read('docs/firebase-rules.json')).rules;
  assert.match(r.logs.$uid['.write'], /!newData\.exists\(\)/);
  assert.match(r.feedback.$uid['.write'], /!newData\.exists\(\)/);
  assert.match(r.fcodes.$code['.write'], /!newData\.exists\(\)/);
  assert.match(r.fcodeOf.$uid['.write'], /!newData\.exists\(\)/);
  assert.match(r.friends.$uid.$fid['.write'], /auth\.uid === \$fid && !newData\.exists\(\)/, 'a person can leave other people\'s friend lists');
  const m = read('app/src/main/AndroidManifest.xml');
  assert.match(m, /permission\.AD_ID" tools:node="remove"/);
  assert.match(m, /google_analytics_adid_collection_enabled/);
});

test('rename: the visible name is Tiletopia everywhere, identifiers are kept', () => {
  const game = gameSource();
  assert.match(game, /Tile<span>topia<\/span>/);
  assert.doesNotMatch(game, /Puzzle<span>grad/);
  assert.doesNotMatch(game, /[«>"' ]Puzzlegrad[ <".,!?'»]/, 'no visible old name in the game page');
  assert.match(read('web/manifest.webmanifest'), /"name": "Tiletopia"/);
});

const {loadPlaywright, instrumentedCopy, openGame} = require('./golden/harness.cjs');
const pw = loadPlaywright();

test('play: failed deletion preserves the session for retry, success clears owned records and local data', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 120000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const init = `if (location.protocol === 'file:') { window.FIREBASE = {apiKey: 'k', dbUrl: 'https://db.test'}; if (window.name !== 'seeded') { window.name = 'seeded'; localStorage.setItem('fbAuth', JSON.stringify({idToken: 't', refreshToken: 'r', uid: 'u1', exp: Date.now() + 3600e3, email: 'a@b.c'})); localStorage.setItem('wallet', '{"gold":5}'); } }`;
    const {page} = await openGame(browser, instrumentedCopy(), null, init);
    const patches = [];
    let removed = false, authCalls = 0;
    await page.route(/^https?:/, route => {
      const rq = route.request(), u = rq.url(), m = rq.method();
      let body = 'null', status = 200;
      if (m === 'GET' && !removed) {
        if (/friends\/u1\.json/.test(u)) body = '{"f1":{"n":"Аня","t":1},"f2":{"n":"Боря","t":1}}';
        if (/inbox\/u1\.json/.test(u)) body = '{"f2_f":{"k":"friend"}}';
        if (/fcodeOf\/u1\.json/.test(u)) body = '"DEF456"';
        if (/fcodes\/(ABC123|DEF456)\.json/.test(u)) body = '"u1"';
      }
      if (m === 'PATCH' && u.startsWith('https://db.test/.json?')) {
        patches.push(rq.postDataJSON());
        if (patches.length === 1) status = 403;
        else removed = true;
      }
      if (/accounts:delete/.test(u)) {
        authCalls++;
        body = '{}';
        if (authCalls === 1) return route.abort('connectionfailed');
      }
      return route.fulfill({status, contentType: 'application/json', body});
    });
    await page.evaluate(() => { window.__pg.wallet().fcode = 'ABC123'; return window.__pg.deleteMyAccount(); });
    assert.equal(authCalls, 0, 'permission failure leaves the identity intact');
    assert.ok(await page.evaluate(() => localStorage.getItem('fbAuth')));
    await page.evaluate(() => window.__pg.deleteMyAccount());
    assert.equal(authCalls, 1);
    assert.ok(await page.evaluate(() => localStorage.getItem('fbAuth')), 'network error during identity deletion retains credentials');
    await page.evaluate(() => window.__pg.deleteMyAccount());
    await page.waitForTimeout(1500);
    for (const p of ['profiles/u1', 'presence/u1', 'leaders/u1', 'leaders_hex/u1', 'friends/u1/f1', 'friends/u1/f2', 'inbox/u1/f2_f', 'logs/u1', 'feedback/u1', 'suggestions/names/u1', 'playerNo/u1', 'fcodeOf/u1', 'friends/f1/u1', 'friends/f2/u1', 'fcodes/ABC123', 'fcodes/DEF456']) {
      assert.equal(patches[1][p], null, 'deleted ' + p);
    }
    assert.equal(Object.keys(patches[1]).filter(path => /^usage\/\d{4}-\d{2}-\d{2}\/u1$/.test(path)).length, 367);
    assert.equal(patches[2]['fcodes/ABC123'], undefined, 'retry skips the already removed code');
    assert.equal(authCalls, 2, 'the sign-in is deleted on retry');
    const left = await page.evaluate(() => ({auth: localStorage.getItem('fbAuth'), gold: JSON.parse(localStorage.getItem('wallet') || '{}').gold}));
    assert.equal(left.auth, null, 'the saved sign-in is gone');
    assert.notEqual(left.gold, 5, 'the old wallet is gone (a fresh default one is created on restart)');
  } finally { await browser.close(); }
});
