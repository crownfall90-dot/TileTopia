// Google Play readiness: account deletion (in the app and on a web page), rules that let a player delete their own data,
// no advertising ID, the policy and the data-safety answers exist, and the game is called Tiletopia.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = f => fs.readFileSync(__dirname + '/../' + f, 'utf8');

test('play: in-app deletion path, web deletion page and policy are there and agree', () => {
  const game = read('web/game.html');
  assert.match(game, /id="delAccBtn"/, 'Settings has "Delete account and data"');
  assert.match(game, /function accountDataDialog\(\)/, 'Account and data opens dedicated dialog from About app');
  assert.match(game, /function confirmWordDialog\(/, 'Multi-step protection with keyword confirmation exists');
  assert.match(game, /confirmWordDialog\('УДАЛИТЬ'/, 'askDeleteAccount requires typing УДАЛИТЬ');
  assert.match(game, /async function deleteMyAccount\(\)/);
  for (const p of ['profiles/', 'presence/', 'leaders/', 'friends/', 'inbox/', 'logs/', 'feedback/', 'suggestions/names/', 'playerNo/', 'fcodeOf/']) assert.ok(game.includes(`'${p}'`), 'deletes ' + p);
  assert.match(game, /idt\('delete'/, 'deletes the sign-in too');
  assert.match(game, /data-hacct="del"/, 'profile card has a delete button');
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
  const game = read('web/game.html');
  assert.match(game, /Tile<span>topia<\/span>/);
  assert.doesNotMatch(game, /Puzzle<span>grad/);
  assert.doesNotMatch(game, /[«>"' ]Puzzlegrad[ <".,!?'»]/, 'no visible old name in the game page');
  assert.match(read('web/manifest.webmanifest'), /"name": "Tiletopia"/);
});

const {loadPlaywright, instrumentedCopy, openGame} = require('./golden/harness.cjs');
const pw = loadPlaywright();

test('play: deleting the account removes every server node, the sign-in and the local data', {skip: !pw && 'playwright is not installed (npm ci)', timeout: 120000}, async () => {
  const browser = await pw.chromium.launch();
  try {
    const init = `if (location.protocol === 'file:') { window.FIREBASE = {apiKey: 'k', dbUrl: 'https://db.test'}; if (window.name !== 'seeded') { window.name = 'seeded'; localStorage.setItem('fbAuth', JSON.stringify({idToken: 't', refreshToken: 'r', uid: 'u1', exp: Date.now() + 3600e3, email: 'a@b.c'})); localStorage.setItem('wallet', '{"gold":5}'); } }`;
    const {page} = await openGame(browser, instrumentedCopy(), null, init);
    const calls = [];
    await page.route(/^https?:/, route => {
      const rq = route.request(), u = rq.url(), m = rq.method();
      calls.push(m + ' ' + u.replace(/\?.*$/, '').replace('https://db.test/', ''));
      let body = 'null';
      if (m === 'GET' && /friends\/u1\.json/.test(u)) body = '{"f1":{"n":"Аня","t":1},"f2":{"n":"Боря","t":1}}';
      if (/accounts:delete/.test(u)) body = '{}';
      route.fulfill({status: 200, contentType: 'application/json', body});
    });
    await page.evaluate(() => { window.__pg.wallet().fcode = 'ABC123'; return window.__pg.deleteMyAccount(); });
    await page.waitForTimeout(1500);
    for (const p of ['profiles/u1', 'presence/u1', 'leaders/u1', 'friends/u1', 'inbox/u1', 'logs/u1', 'feedback/u1', 'suggestions/names/u1', 'playerNo/u1', 'fcodeOf/u1', 'friends/f1/u1', 'friends/f2/u1', 'fcodes/ABC123']) {
      assert.ok(calls.includes('DELETE ' + p + '.json'), 'deleted ' + p + '\n' + calls.join('\n'));
    }
    assert.ok(calls.some(c => /POST .*accounts:delete/.test(c)), 'the sign-in is deleted');
    const left = await page.evaluate(() => ({auth: localStorage.getItem('fbAuth'), gold: JSON.parse(localStorage.getItem('wallet') || '{}').gold}));
    assert.equal(left.auth, null, 'the saved sign-in is gone');
    assert.notEqual(left.gold, 5, 'the old wallet is gone (a fresh default one is created on restart)');
  } finally { await browser.close(); }
});
