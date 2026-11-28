'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('online match funnel: separate live vs bot-filled starts, cancel/fail/bots search outcomes, and first online move', async () => {
  const {FEATURES, isFeatureId} = await import('../src/state/usage.js');
  const funnelKeys = [
    'mode:online',
    'screen:match',
    'match:start',
    'match:mode_online',
    'match:mode_online_live',
    'match:mode_online_bots',
    'match:search_cancel',
    'match:search_bots',
    'match:search_fail',
    'match:first_online_move',
    'match:result',
  ];
  for (const k of funnelKeys) {
    assert.ok(isFeatureId(k), `${k} satisfies Firebase /usage key rules`);
    assert.ok(FEATURES[k], `${k} has a Russian label in FEATURES`);
  }

  const matchStart = read('src/app/runtime/match-start.js');
  const matchHud = read('src/app/runtime/match-hud.js');
  const matchmaking = read('src/app/runtime/matchmaking.js');
  const econ = read('src/app/runtime/economy-and-shop.js');

  assert.match(matchStart, /match:mode_online_bots.*match:mode_online_live/, 'separates live vs bot-filled online starts');
  assert.match(matchStart, /bots:\s*hasBots\s*\?\s*1\s*:\s*0/, 'game_start records bots flag for cohort tracking');
  assert.match(matchHud, /match:first_online_move/, 'first confirmed online move emits dedicated counter');
  assert.match(econ, /'first_online_move'/, 'first_online_move is registered in LOG_KINDS');
  assert.match(matchmaking, /match:search_cancel/, 'search cancel counter emitted');
  assert.match(matchmaking, /match:search_bots/, 'search bot-fill counter emitted');
  assert.match(matchmaking, /match:search_fail/, 'search network fail counter emitted');
});

test('two-client room flow & netRetry: reconnect keeps error handler active after recovery', async () => {
  const netRooms = read('src/app/runtime/network-and-rooms.js');
  assert.match(netRooms, /function netRetry[\s\S]*?error:\s*\(\)\s*=>\s*\{\s*if\s*\(net\s*===\s*me\)\s*netDown\(me\);\s*\}/, 'netRetry restores netDown error callback instead of a silent no-op');

  // Simulate two clients sharing a room log across invite/join, start, move 0, drop + netRetry + catch-up, move 1
  const {netAuth} = await import('../src/net/rooms.js');
  const roomLog = [];
  const makeClient = (clientId, uid) => ({
    clientId,
    uid,
    seen: new Set(),
    net: {code: 'ABCDE', host: false, hostId: null, uidOf: new Map(), secure: true, gameId: null},
    players: [],
    moves: [],
    down: false,
    streamErrorHandler: null,
  });

  const cA = makeClient('cA', 'uidA');
  const cB = makeClient('cB', 'uidB');

  const deliver = (client, entry) => {
    if (client.seen.has(entry.id)) return;
    const m = JSON.parse(entry.m);
    if (!netAuth({u: entry.u}, m, client.net, client.players)) return;
    client.seen.add(entry.id);
    if (m.t === 'host' && !client.net.hostId) {
      client.net.hostId = m.id;
      client.net.host = m.id === client.clientId;
    } else if (m.t === 'start') {
      client.net.gameId = entry.id;
      client.players = m.seats;
    } else if (m.t === 'move') {
      client.moves.push(m);
    }
  };

  const post = (sender, msg) => {
    const entry = {id: 'msg_' + (roomLog.length + 1), u: sender.uid, m: JSON.stringify(msg)};
    roomLog.push(entry);
    deliver(cA, entry);
    if (!cB.down) deliver(cB, entry);
  };

  // 1. Host creates room, Guest joins, Host starts match
  post(cA, {t: 'host', id: 'cA'});
  post(cA, {t: 'hello', id: 'cA', name: 'Alice'});
  post(cB, {t: 'hello', id: 'cB', name: 'Bob'});
  post(cA, {
    t: 'start', sec: 1,
    seats: [{owner: 'cA', name: 'Alice'}, {owner: 'cB', name: 'Bob'}],
    rules: {mode: 'fast', deck: 30}, deck: ['capRS', 'rS'], seed: 42
  });
  assert.equal(cA.net.gameId, cB.net.gameId);

  // 2. Client B drops network while Client A plays move 0
  cB.down = true;
  post(cA, {t: 'move', g: cA.net.gameId, n: 0, p: 0, x: 1, y: 0, r: 0, m: -1});
  assert.equal(cA.moves.length, 1);
  assert.equal(cB.moves.length, 0, 'Client B missed move 0 while offline');

  // 3. Client B retries (replays stream, skips seen messages, catches up move 0)
  cB.down = false;
  for (const entry of roomLog) deliver(cB, entry);
  assert.equal(cB.moves.length, 1, 'Client B catches up missed move 0 without duplicating earlier messages');

  // 4. Client B plays move 1 after recovery
  post(cB, {t: 'move', g: cB.net.gameId, n: 1, p: 1, x: -1, y: 0, r: 1, m: -1});
  assert.equal(cA.moves.length, 2);
  assert.equal(cB.moves.length, 2);
  assert.deepEqual(cA.moves.map(x => x.n), [0, 1]);
  assert.deepEqual(cB.moves.map(x => x.n), [0, 1]);
});
