'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = name => fs.readFileSync(path.join(__dirname, '../src/app/runtime', name + '.js'), 'utf8');
function social(storage = new Map()) {
  const events = [], noop = () => {};
  const ctx = vm.createContext({
    fbAuth: {uid: 'alice', email: 'alice@example.test'}, wallet: {name: 'Alice', fcode: 'ABCDEF'},
    friends: [], inbox: {}, clean: s => String(s), FBC: {del: async k => events.push(k)},
    $: () => ({hidden: true}), document: {querySelectorAll: () => []},
    renderFriends: noop, renderLobbyFriends: noop, updateNotifBadge: noop, toastAny: noop,
    localStorage: {getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k)},
  });
  vm.runInContext(source('friends'), ctx);
  ctx.friendsDot = noop;
  ctx.loadFriends = async () => {};
  ctx.popInbox = (key, v) => events.push('pop:' + key);
  ctx.acceptFriend = (uid) => events.push('accept:' + uid);
  return {ctx, events};
}

test('blocking clears pending contacts, persists per account, and can be undone', () => {
  const store = new Map(), {ctx, events} = social(store);
  ctx.friends = [{uid: 'bob'}, {uid: 'carol'}];
  ctx.inbox = {bob_f: {k: 'f'}, bob_r: {k: 'r'}, carol_f: {k: 'f'}};
  ctx.invited.uids.add('bob');
  assert.equal(ctx.setPlayerBlocked('alice', 'Me', true), false);
  assert.equal(ctx.setPlayerBlocked('bob', 'Bob', true), true);
  assert.equal(ctx.isPlayerBlocked('bob'), true);
  assert.deepEqual([...ctx.friends].map(f => f.uid), ['carol']);
  assert.deepEqual(Object.keys(ctx.inbox), ['carol_f']);
  assert.deepEqual(events, ['inbox/alice/bob_f', 'inbox/alice/bob_r']);
  assert.equal(ctx.invited.uids.has('bob'), false);
  const restart = social(store).ctx;
  assert.equal(restart.isPlayerBlocked('bob'), true);
  restart.fbAuth.uid = 'carol';
  assert.equal(restart.isPlayerBlocked('bob'), false);
  restart.setPlayerBlocked('bob', 'Bob', true);
  restart.fbAuth.uid = 'alice';
  restart.setPlayerBlocked('bob', 'Bob', false);
  assert.equal(restart.isPlayerBlocked('bob'), false);
  restart.fbAuth.uid = 'carol';
  assert.equal(restart.isPlayerBlocked('bob'), true);
});

test('inbox checks the sender key before acceptance, popups, badges and outgoing actions', async () => {
  const {ctx, events} = social();
  ctx.setPlayerBlocked('bob', 'Bob', true);
  for (const k of ['f', 'r', 'ok', 'no']) {
    const key = k === 'r' || k === 'no' ? 'bob_r' : 'bob_f';
    ctx.onInbox({[key]: {k, n: 'Bob', u: 'carol', v: 'ABCDEF', t: Date.now()}, carol_r: {k: 'r', t: Date.now(), u: 'bob'}});
    assert.deepEqual(Object.keys(ctx.inbox), ['carol_r']);
  }
  assert.ok(events.includes('pop:carol_r'));
  assert.ok(events.every(e => e === 'pop:carol_r' || e.startsWith('inbox/alice/bob_')));
  await ctx.inviteFriend('bob');
  await ctx.addFriend('bob', 'Bob');
  ctx.inbox.bob_r = {k: 'r', code: 'ABCDE'};
  ctx.joinInvite('bob_r');
  assert.ok(ctx.inbox.bob_r);
});

test('a block suppresses authenticated reactions and still applies gameplay moves', () => {
  const {ctx} = social();
  ctx.setPlayerBlocked('bob', 'Bob', true);
  const seen = [];
  Object.assign(ctx, {
    net: {seen: new Set(), uidOf: new Map([['client', 'bob']]), gameId: 'g', since: 0},
    players: [{owner: 'client', uid: 'stale'}], phase: 'remote', netAuth: () => true,
    showSay: (p, i, uid) => seen.push(uid), onMove: () => seen.push('move'),
  });
  const net = source('network-and-rooms');
  vm.runInContext(net.slice(net.indexOf('function roomContactUid('), net.indexOf('/* Others see where')), ctx);
  function send(id, u, t) {
    ctx.onNet({id, u, time: Date.now() / 1000, message: JSON.stringify({t, g: 'g', p: 0, i: 1})});
  }
  send('1', 'bob', 'say');
  send('2', undefined, 'say');
  send('3', 'bob', 'move');
  send('4', 'carol', 'say');
  ctx.setPlayerBlocked('bob', 'Bob', false);
  send('5', 'bob', 'say');
  assert.deepEqual(seen, ['move', 'carol', 'bob']);
});

test('player-card invites support non-friends and mark only successful, still-current deliveries', async () => {
  const {ctx} = social();
  const sent = [], messages = [];
  Object.assign(ctx, {
    net: {code: 'ABCDE'}, mm: null, phase: 'menu', show: () => {}, track: () => {},
    profileName: () => 'Alice', toastAny: text => messages.push(text),
  });
  ctx.FBC.put = async (k, v) => { sent.push([k, v.code]); };
  const cards = source('player-cards');
  vm.runInContext(cards.slice(0, cards.indexOf('function openReportDialog')), ctx);
  await ctx.invitePlayerToRoom('bob', 'Bob');
  assert.deepEqual(sent, [['inbox/bob/alice_r', 'ABCDE']]);
  assert.equal(ctx.invited.uids.has('bob'), true);
  await ctx.invitePlayerToRoom('bob', 'Bob');
  assert.equal(sent.length, 1);
  assert.match(messages.at(-1), /5 секунд/);
  ctx.FBC.put = async () => { throw new Error('offline'); };
  await ctx.invitePlayerToRoom('carol', 'Carol');
  assert.equal(ctx.invited.uids.has('carol'), false);
  let deliver;
  ctx.FBC.put = () => new Promise(resolve => { deliver = resolve; });
  const pending = ctx.invitePlayerToRoom('dave', 'Dave');
  ctx.setPlayerBlocked('dave', 'Dave', true);
  deliver();
  await pending;
  assert.equal(ctx.invited.uids.has('dave'), false);
});

test('cards and contact lists offer the correct actions for peers, guests, self and blocks', async () => {
  const {renderPlayerCardHtml} = await import('../src/ui/playerCard.js');
  const {renderRoomSeatsHtml} = await import('../src/net/rooms.js');
  const {renderFriendsListHtml} = await import('../src/net/friends.js');
  const {renderPlayersListHtml} = await import('../src/ui/hud.js');
  const blocked = renderPlayerCardHtml({isBlocked: true, incomingRequest: true});
  assert.match(blocked, /Разблокировать/);
  assert.match(blocked, /plReport/);
  assert.doesNotMatch(blocked, /plAcceptFriend|plInviteRoom|plAdd/);
  assert.doesNotMatch(renderPlayerCardHtml({isMe: true}), /plBlock/);
  assert.match(renderPlayerCardHtml({canContact: false}), /plBlock/);
  assert.doesNotMatch(renderPlayerCardHtml({canContact: false}), /plInviteRoom|plAdd/);
  const seat = {owner: 'client', name: 'Guest'};
  const {seatsHtml} = renderRoomSeatsHtml({seats: [seat], registered: true, contactUid: () => 'guest'});
  assert.match(seatsHtml, /data-pl="guest" data-guest="1"/);
  assert.doesNotMatch(seatsHtml, /data-addf/);
  const hud = renderPlayersListHtml([seat], {isMe: () => false, contactUid: () => 'guest', turnTag: () => ''});
  assert.match(hud, /data-pl="guest" data-guest="1"/);
  const rows = renderFriendsListHtml({reqs: [['bob_f', {n: 'B'}]], invs: [['carol_r', {n: 'C', u: 'someoneElse'}]]});
  assert.match(rows, /data-pl="bob"/);
  assert.match(rows, /data-pl="carol"/);
});
