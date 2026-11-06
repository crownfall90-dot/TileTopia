// tests/net-rooms-matchmaking.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');

test('net/rooms: newCode, assignColors, roomMax, and ratedRules', async () => {
  const rooms = await import('../src/net/rooms.js');

  // newCode
  const code = rooms.newCode();
  assert.equal(code.length, 5);
  assert.match(code, /^[A-Z0-9]{5}$/);

  // assignColors
  const palette = [{col: '#f00'}, {col: '#0f0'}, {col: '#00f'}, {col: '#ff0'}];
  const seats = [
    {name: 'Alice', col: '#f00'},
    {name: 'Bob', col: '#f00'}, // duplicate request
    {name: 'Charlie', col: null}
  ];
  const colored = rooms.assignColors(seats, palette, () => 0.1);
  assert.equal(colored.length, 3);
  const colors = colored.map(s => s.col);
  assert.equal(new Set(colors).size, 3, 'all players get unique colors');
  assert.ok(colors.includes('#f00'), 'first requester gets requested color');

  // roomMax
  assert.equal(rooms.roomMax({max: 4}), 4);
  assert.equal(rooms.roomMax({max: 10}), 5);
  assert.equal(rooms.roomMax({max: 1}), 2);
  assert.equal(rooms.roomMax(null, 3), 3);

  // ratedRules
  const modes = {
    fast: {set: {deckMax: 30}},
    classic: {set: {deckMax: 50}}
  };
  const fastRules = rooms.ratedRules('fast', modes);
  assert.equal(fastRules.mode, 'fast');
  assert.equal(fastRules.deckMax, 30);
  assert.equal(fastRules.timer, 60);
  assert.equal(fastRules.tie, 'all');

  // isLobbyAllReady
  assert.equal(rooms.isLobbyAllReady([
    {owner: 'host', ready: false},
    {owner: 'guest1', ready: true},
    {owner: 'guest2', ready: true}
  ], 'host'), true);

  assert.equal(rooms.isLobbyAllReady([
    {owner: 'host', ready: false},
    {owner: 'guest1', ready: false}
  ], 'host'), false);
});

test('net/rooms: netAuth validates authorized authors', async () => {
  const rooms = await import('../src/net/rooms.js');

  const net = {
    hostId: 'h1',
    uidOf: new Map([['h1', 'uid-host'], ['p2', 'uid-p2']]),
    secure: true,
    gameId: 'game-1'
  };

  const players = [
    {owner: 'h1', name: 'Host'},
    {owner: 'p2', name: 'Guest'}
  ];

  // Authorized move from seat 1 (p2)
  assert.equal(rooms.netAuth({u: 'uid-p2'}, {t: 'move', g: 'game-1', p: 1}, net, players), true);

  // Impersonated move from seat 1 sent by attacker
  assert.equal(rooms.netAuth({u: 'uid-attacker'}, {t: 'move', g: 'game-1', p: 1}, net, players), false);

  // Auto move can be sent by room participant
  assert.equal(rooms.netAuth({u: 'uid-host'}, {t: 'move', g: 'game-1', p: 1, auto: 1}, net, players), true);

  // Unsigned message in secure room rejected
  assert.equal(rooms.netAuth({}, {t: 'move', g: 'game-1', p: 1}, net, players), false);
});

test('net/matchmaking: createMatchState and filterOpenRooms', async () => {
  const mm = await import('../src/net/matchmaking.js');

  const state = mm.createMatchState({want: 4, mode: 'fast', create: true});
  assert.equal(state.want, 4);
  assert.equal(state.mode, 'fast');
  assert.equal(state.create, true);
  assert.equal(state.ready, false);

  const now = 100000;
  const seeks = new Map([
    ['ROOM1', {ts: now - 5000, n: 1, want: 2}], // 1 needed
    ['ROOM2', {ts: now - 2000, n: 2, want: 4}], // 2 needed
    ['STALE', {ts: now - 30000, n: 1, want: 2}], // expired
    ['CLOSED', {ts: now - 1000, n: 1, want: 2}]
  ]);
  const closed = new Set(['CLOSED']);
  const skip = new Set();

  const open = mm.filterOpenRooms(seeks, closed, skip, now);
  assert.equal(open.length, 2);
  assert.equal(open[0].code, 'ROOM1', 'closest to start comes first');
  assert.equal(open[1].code, 'ROOM2');
});

test('net/matchmaking: H-5 bot fallback triggers and fills seats', async () => {
  const mm = await import('../src/net/matchmaking.js');

  // shouldAutoFillBots
  assert.equal(mm.shouldAutoFillBots({
    isHost: true,
    startAt: 0,
    elapsedSec: 10,
    seatsCount: 1,
    wantCount: 2
  }), true);

  assert.equal(mm.shouldAutoFillBots({
    isHost: false,
    startAt: 0,
    elapsedSec: 10,
    seatsCount: 1,
    wantCount: 2
  }), false);

  assert.equal(mm.shouldAutoFillBots({
    isHost: true,
    startAt: 12345,
    elapsedSec: 10,
    seatsCount: 1,
    wantCount: 2
  }), false);

  // autoFillSeats
  const initialSeats = [{owner: 'p1', name: 'Alice', ready: true}];
  const filled = mm.autoFillSeats(initialSeats, 3, null, ['Бот Ёж', 'Бот Сова']);
  assert.equal(filled.length, 3);
  assert.equal(filled[0].name, 'Alice');
  assert.equal(filled[1].name, 'Бот Ёж');
  assert.equal(filled[1].bot, true);
  assert.equal(filled[1].owner, null);

  // formatMatchStatus
  const statusWait = mm.formatMatchStatus({seatsCount: 1, wantCount: 2, startAt: 0});
  assert.equal(statusWait.full, false);
  assert.equal(statusWait.title, 'Ищем соперников…');

  const statusStart = mm.formatMatchStatus({seatsCount: 2, wantCount: 2, startAt: 103000, now: 100000});
  assert.equal(statusStart.full, true);
  assert.equal(statusStart.left, 3);
  assert.equal(statusStart.title, 'Старт через 3…');

  // renderMatchSeatsHtml
  const seatsHtml = mm.renderMatchSeatsHtml({
    seats: [{owner: 'me', name: 'Игрок', col: '#ef5350'}, {owner: null, name: 'Бот Ёж', bot: true}],
    want: 3,
    myId: 'me',
    myName: 'Игрок',
    myColor: '#ef5350'
  });
  assert.ok(seatsHtml.includes('Игрок (вы)'));
  assert.ok(seatsHtml.includes('Бот Ёж'));
  assert.ok(seatsHtml.includes('botpill'));
  assert.ok(seatsHtml.includes('Ищем'));
});

test('net/rooms: computePendingInvites, formatCupsBadge, renderRoomSeatsHtml, formatLobbyButtons', async () => {
  const rooms = await import('../src/net/rooms.js');

  // computePendingInvites
  const net = {code: 'ROOM1'};
  const invited = {
    code: 'ROOM1',
    uids: new Set(['u1', 'u2']),
    at: {u1: 1000, u2: 50000},
    declined: new Set(['u1'])
  };
  const seats = [{uid: 'host-uid'}];
  const friends = [{uid: 'u1', n: 'Friend1', st: 'Pro', c: '#ff0000'}, {uid: 'u2', n: 'Friend2'}];
  const pend = rooms.computePendingInvites(invited, seats, friends, net, 30000, 60000);
  assert.equal(pend.length, 2);
  assert.equal(pend[0].declined, true);
  assert.equal(pend[0].late, true); // 60000 - 1000 > 30000
  assert.equal(pend[1].late, false); // 60000 - 50000 <= 30000

  // formatCupsBadge
  const badgeHost = rooms.formatCupsBadge(true, true);
  assert.ok(badgeHost.className.includes('cupsbadge on host'));
  assert.ok(badgeHost.innerHtml.includes('Игра на кубки'));

  // renderRoomSeatsHtml
  const roomSeats = [
    {owner: 'h1', uid: 'uid-host', name: 'Host', ready: true, col: '#ff0000'},
    {owner: 'g1', uid: 'uid-guest', name: 'Guest', ready: false, col: '#00ff00'},
    {owner: null, name: 'Бот Ёж', col: '#0000ff'}
  ];
  const rendered = rooms.renderRoomSeatsHtml({
    seats: roomSeats,
    pend: [{uid: 'u3', n: 'Pending', late: false, declined: false}],
    myId: 'g1',
    myUid: 'uid-guest',
    hostId: 'h1',
    isHost: false,
    registered: true,
    cleanFn: s => s,
    validColFn: () => true
  });
  assert.ok(rendered.seatsHtml.includes('Host'));
  assert.ok(rendered.seatsHtml.includes('Guest (вы)'));
  assert.ok(rendered.seatsHtml.includes('Бот'));
  assert.ok(rendered.pendHtml.includes('Pending'));

  // formatLobbyButtons
  const hostButtonsNeedPlayers = rooms.formatLobbyButtons({isHost: true, seatsCount: 1, inLobby: true});
  assert.equal(hostButtonsNeedPlayers.hostBtn.disabled, true);
  assert.equal(hostButtonsNeedPlayers.hostBtn.text, 'Нужно хотя бы 2 игрока');

  const guestButtons = rooms.formatLobbyButtons({isHost: false, inLobby: true, isReady: false, isQuick: false});
  assert.equal(guestButtons.readyBtn.hidden, false);
  assert.equal(guestButtons.readyBtn.text, 'Готов');
});
