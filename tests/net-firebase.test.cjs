// src/net/firebase.js: the Firebase session and REST paths moved out of game.html (TASK-008-5).
// Same requests and the same saved session as before, so nobody is signed out by the update. No network: fetch is faked.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const load = () => import('../src/net/firebase.js');
const mem = (init = {}) => { const m = {...init}; return {getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, m}; };
const fakeFetch = answers => { const calls = []; const f = async (url, opt = {}) => { calls.push({url, opt}); const a = await (answers.shift() || {ok: true, body: {}}); return {ok: a.ok !== false, status: a.status || 200, json: async () => a.body}; }; f.calls = calls; return f; };

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

test('net/firebase: a guest gets an anonymous account once, saved under fbAuth', async () => {
  const {createFirebase} = await load();
  const storage = mem(), fetch = fakeFetch([{body: {idToken: 'T1', refreshToken: 'R1', localId: 'u1', expiresIn: '3600'}}]);
  let seen = null;
  const fb = createFirebase({apiKey: 'K', dbUrl: 'https://db', storage, fetch, onChange: a => { seen = a; }});
  assert.equal(await fb.token(), 'T1');
  assert.equal(await fb.token(), 'T1', 'cached while valid');
  assert.equal(fetch.calls.length, 1);
  assert.match(fetch.calls[0].url, /accounts:signUp\?key=K$/);
  assert.equal(JSON.parse(storage.m.fbAuth).uid, 'u1');
  assert.equal(seen.uid, 'u1', 'the game sees the session');
  assert.equal(await fb.url('rooms/AB'), 'https://db/rooms/AB.json?auth=T1');
});

test('net/firebase: an expired saved session is refreshed; a signed-in one is never replaced by a guest', async () => {
  const {createFirebase} = await load();
  const saved = {idToken: 'old', refreshToken: 'R', uid: 'u2', exp: 0, email: 'p@example.com'};
  const ok = createFirebase({apiKey: 'K', dbUrl: 'https://db', storage: mem({fbAuth: JSON.stringify(saved)}), fetch: fakeFetch([{body: {id_token: 'NEW', refresh_token: 'R2', expires_in: '3600', user_id: 'u2'}}])});
  assert.equal(await ok.token(), 'NEW');
  assert.equal(ok.session().email, 'p@example.com', 'still the same profile');
  const bad = createFirebase({apiKey: 'K', dbUrl: 'https://db', storage: mem({fbAuth: JSON.stringify(saved)}), fetch: fakeFetch([{ok: false, status: 400}])});
  await assert.rejects(bad.token(), /auth expired/);
});

test('net/firebase: simultaneous startup requests share one anonymous sign-up', async () => {
  const {createFirebase} = await load();
  const storage = mem();
  const fetch = fakeFetch([{body: {idToken: 'G', refreshToken: 'R', localId: 'guest'}}]);
  const fb = createFirebase({apiKey: 'K', dbUrl: 'https://db', storage, fetch});

  assert.deepEqual(await Promise.all([fb.token(), fb.token(), fb.url('rooms/AB')]), ['G', 'G', 'https://db/rooms/AB.json?auth=G']);
  assert.equal(fetch.calls.length, 1);
  assert.equal(JSON.parse(storage.m.fbAuth).uid, 'guest');
});

test('net/firebase: simultaneous requests share one refresh of a saved session', async () => {
  const {createFirebase} = await load();
  const saved = {idToken: 'old', refreshToken: 'R', uid: 'u', exp: 0, email: 'p@example.com'};
  const storage = mem({fbAuth: JSON.stringify(saved)});
  const fetch = fakeFetch([{body: {id_token: 'NEW', refresh_token: 'R2', expires_in: '3600', user_id: 'u'}}]);
  const fb = createFirebase({apiKey: 'K', dbUrl: 'https://db', storage, fetch});

  assert.deepEqual(await Promise.all([fb.token(), fb.token()]), ['NEW', 'NEW']);
  assert.equal(fetch.calls.length, 1);
  assert.equal(JSON.parse(storage.m.fbAuth).refreshToken, 'R2');
  assert.equal(fb.session().email, saved.email);
});

test('net/firebase: a temporary refresh failure keeps the guest session and lets callers retry', async () => {
  const {createFirebase} = await load();
  const saved = {idToken: 'old', refreshToken: 'R', uid: 'guest', exp: 0, email: null};
  const storage = mem({fbAuth: JSON.stringify(saved)});
  const fetch = fakeFetch([{ok: false, status: 503}, {body: {id_token: 'NEW', refresh_token: 'R2', user_id: 'guest'}}]);
  const fb = createFirebase({apiKey: 'K', dbUrl: 'https://db', storage, fetch});

  await assert.rejects(fb.token(), /auth 503/);
  assert.deepEqual(JSON.parse(storage.m.fbAuth), saved);
  assert.equal(await fb.token(), 'NEW');
  assert.equal(fb.session().uid, saved.uid);
  assert.ok(fetch.calls.every(call => call.url.includes('securetoken.googleapis.com')));
});

test('net/firebase: a late guest answer cannot replace a signed-in player', async () => {
  const {createFirebase} = await load();
  const signup = deferred();
  const storage = mem();
  const fetch = fakeFetch([signup.promise]);
  const fb = createFirebase({apiKey: 'K', dbUrl: 'https://db', storage, fetch});

  const old = fb.token();
  fb.keep({idToken: 'PLAYER', refreshToken: 'R', localId: 'player'}, 'p@example.com');
  signup.resolve({body: {idToken: 'GUEST', refreshToken: 'RG', localId: 'guest'}});
  await assert.rejects(old, /auth changed/);
  assert.equal(await fb.token(), 'PLAYER');
  assert.equal(JSON.parse(storage.m.fbAuth).uid, 'player');
});

test('net/firebase: a stale invalid guest refresh cannot replace or interfere with a new refresh', async () => {
  const {createFirebase} = await load();
  const expiredGuest = {idToken: 'old', refreshToken: 'RG', uid: 'guest', exp: 0};
  const storage = mem({fbAuth: JSON.stringify(expiredGuest)});
  const guestRefresh = deferred(), playerRefresh = deferred();
  const fetch = fakeFetch([guestRefresh.promise, playerRefresh.promise]);
  const fb = createFirebase({apiKey: 'K', dbUrl: 'https://db', storage, fetch});

  const old = fb.token();
  fb.keep({idToken: 'PLAYER', refreshToken: 'RP', localId: 'player', expiresIn: '1'}, 'p@example.com');
  const current = fb.token();
  guestRefresh.resolve({ok: false, status: 400});
  await assert.rejects(old, /auth changed/);
  const anotherCaller = fb.token();
  playerRefresh.resolve({body: {id_token: 'NEW', refresh_token: 'RP2', user_id: 'player'}});
  assert.deepEqual(await Promise.all([current, anotherCaller]), ['NEW', 'NEW']);
  assert.equal(fetch.calls.length, 2);
  assert.equal(JSON.parse(storage.m.fbAuth).uid, 'player');
});

test('net/firebase: signing out clears persisted credentials and invalidates a pending refresh', async () => {
  const {createFirebase} = await load();
  const refresh = deferred();
  const saved = {idToken: 'old', refreshToken: 'R', uid: 'player', exp: 0, email: 'p@example.com'};
  const storage = mem({fbAuth: JSON.stringify(saved)});
  const fetch = fakeFetch([refresh.promise]);
  let session;
  const fb = createFirebase({apiKey: 'K', dbUrl: 'https://db', storage, fetch, onChange: a => { session = a; }});

  const old = fb.token();
  fb.clear();
  refresh.resolve({body: {id_token: 'NEW', refresh_token: 'R2', user_id: 'player'}});
  await assert.rejects(old, /auth changed/);
  assert.equal(storage.getItem('fbAuth'), null);
  assert.equal(fb.load(), null);
  assert.equal(session, null);
});

test('net/firebase: errors keep their old meaning', async () => {
  const {createFirebase} = await load();
  const fb = createFirebase({apiKey: 'K', dbUrl: 'https://db', storage: mem({fbAuth: JSON.stringify({idToken: 'T', uid: 'u', exp: Date.now() + 1e7})}), fetch: fakeFetch([{ok: false, status: 401}, {ok: false, status: 400, body: {error: {message: 'EMAIL_EXISTS'}}}])});
  await assert.rejects(fb.get('admins/x'), /rules/);
  await assert.rejects(fb.idt('signUp', {}), e => e.error.message === 'EMAIL_EXISTS');
});

test('net/firebase: game.html takes the session from the module, with no second copy', () => {
  const html = fs.readFileSync('web/game.html', 'utf8');
  assert.ok(html.includes('PG.net.createFirebase('));
  assert.ok(!html.includes('securetoken.googleapis.com'), 'token refresh only in src/net/firebase.js');
  assert.ok(!html.includes('accounts:${method}'), 'Identity Toolkit calls only in src/net/firebase.js');
});
