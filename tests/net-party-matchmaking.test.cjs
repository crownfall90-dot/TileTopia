// tests/net-party-matchmaking.test.cjs
// Tests for party matchmaking: table sizes (2..5), open room toggle, seek status, and bot filling.

const test = require('node:test');
const assert = require('node:assert/strict');

test('net/rooms: formatTableSizeHtml generates 2..5 buttons with active state and host permission', async () => {
  const {formatTableSizeHtml} = await import('../src/net/rooms.js');

  const hostHtml = formatTableSizeHtml(4, true);
  assert.ok(hostHtml.includes('data-size="2"'));
  assert.ok(hostHtml.includes('data-size="3"'));
  assert.ok(hostHtml.includes('data-size="4"'));
  assert.ok(hostHtml.includes('data-size="5"'));
  assert.ok(hostHtml.includes('class="ts-btn active" data-size="4"'));
  assert.ok(!hostHtml.includes('disabled'));

  const guestHtml = formatTableSizeHtml(3, false);
  assert.ok(guestHtml.includes('class="ts-btn active" data-size="3"'));
  assert.ok(guestHtml.includes('disabled'));
});

test('net/rooms: formatOpenMatchBadge formats toggle switch for host and guest', async () => {
  const {formatOpenMatchBadge} = await import('../src/net/rooms.js');

  const hostOn = formatOpenMatchBadge(true, true, 2, 4);
  assert.ok(hostOn.className.includes('matchbadge on host'));
  assert.ok(hostOn.innerHtml.includes('Добор из онлайна (Открыта)'));
  assert.ok(hostOn.innerHtml.includes('2/4'));

  const hostOff = formatOpenMatchBadge(false, true, 2, 4);
  assert.ok(hostOff.className.includes('matchbadge host'));
  assert.ok(!hostOff.className.includes('on'));
  assert.ok(hostOff.innerHtml.includes('Только по коду (Приватная)'));

  const guestOn = formatOpenMatchBadge(true, false, 3, 4);
  assert.ok(guestOn.className.includes('matchbadge on'));
  assert.ok(!guestOn.className.includes('host'));
});

test('net/rooms: formatSeekStatus calculates needed players, wait time, and fullness', async () => {
  const {formatSeekStatus} = await import('../src/net/rooms.js');

  const seeking = formatSeekStatus({openMatch: true, seatsCount: 2, maxSeats: 4, secWaiting: 12});
  assert.equal(seeking.needed, 2);
  assert.equal(seeking.isFull, false);
  assert.ok(seeking.text.includes('2 игроков онлайн'));
  assert.ok(seeking.subText.includes('2 из 4'));
  assert.ok(seeking.subText.includes('12с'));

  const full = formatSeekStatus({openMatch: true, seatsCount: 4, maxSeats: 4, secWaiting: 20});
  assert.equal(full.needed, 0);
  assert.equal(full.isFull, true);
  assert.ok(full.text.includes('Все игроки в сборе'));

  const closed = formatSeekStatus({openMatch: false, seatsCount: 2, maxSeats: 4});
  assert.equal(closed.isFull, false);
  assert.ok(closed.text.includes('В комнате 2 из 4'));
});

test('net/rooms: autoFillRoomBots fills seats up to targetMax with distinct names and level', async () => {
  const {autoFillRoomBots} = await import('../src/net/rooms.js');

  const initialSeats = [
    {owner: 'host1', name: 'Алиса', col: '#ff0000', ready: true},
    {owner: 'friend2', name: 'Боб', col: '#0000ff', ready: true}
  ];

  const filled4 = autoFillRoomBots(initialSeats, 4, 'hard', () => 'knight');
  assert.equal(filled4.length, 4);
  assert.equal(filled4[0].name, 'Алиса');
  assert.equal(filled4[1].name, 'Боб');
  assert.equal(filled4[2].bot, true);
  assert.equal(filled4[2].botlvl, 'hard');
  assert.equal(filled4[2].fig, 'knight');
  assert.equal(filled4[3].bot, true);
  assert.notEqual(filled4[2].name, filled4[3].name);

  // If already at or above targetMax, leaves untouched
  const noop = autoFillRoomBots(filled4, 4);
  assert.equal(noop.length, 4);
});

test('net/rooms: renderRoomSeatsHtml marks mutual friend with friendship badge', async () => {
  const {renderRoomSeatsHtml} = await import('../src/net/rooms.js');

  const seats = [
    {owner: 'me1', uid: 'uid-me', name: 'Я', col: '#ff0000', ready: true},
    {owner: 'friend2', uid: 'uid-friend', name: 'Друг Максим', col: '#00ff00', ready: true},
    {owner: 'stranger3', uid: 'uid-stranger', name: 'Незнакомец', col: '#0000ff', ready: false}
  ];

  const rendered = renderRoomSeatsHtml({
    seats,
    pend: [],
    myId: 'me1',
    myUid: 'uid-me',
    hostId: 'me1',
    isHost: true,
    isFriendFn: (uid) => uid === 'uid-friend',
    validColFn: (c) => /^#[0-9a-f]{6}$/i.test(c),
    cleanFn: s => s,
    stTagFn: () => '',
    palette: [{col: '#ff0000'}, {col: '#00ff00'}, {col: '#0000ff'}]
  });

  assert.ok(rendered.seatsHtml.includes('🤝 Друг'));
  assert.ok(rendered.seatsHtml.includes('Друг Максим'));
  assert.ok(!rendered.seatsHtml.includes('Я (вы) <span class="pill friend-pill"'));
});

test('net/matchmaking: filterOpenRooms discovers party rooms with 2+ players waiting for 3..5', async () => {
  const {filterOpenRooms} = await import('../src/net/matchmaking.js');

  const now = Date.now();
  const seeks = new Map([
    // Room 1: 2 friends waiting for 4 players
    ['ROOM4', {ts: now - 3000, n: 2, want: 4}],
    // Room 2: 1 lone player waiting for 2
    ['ROOM2', {ts: now - 4000, n: 1, want: 2}],
    // Room 3: already full (4/4)
    ['FULLR', {ts: now - 1000, n: 4, want: 4}]
  ]);

  const open = filterOpenRooms(seeks, new Set(), new Set(), now);
  // Both ROOM2 and ROOM4 should be open, but ROOM2 needs 1 more, ROOM4 needs 2 more
  assert.equal(open.length, 2);
  const codes = open.map(x => x.code);
  assert.ok(codes.includes('ROOM4'));
  assert.ok(codes.includes('ROOM2'));
  assert.ok(!codes.includes('FULLR'));
});
