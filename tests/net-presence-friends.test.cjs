// Unit tests for extracted net modules: src/net/presence.js and src/net/friends.js (E-1.5)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('net/presence: formatPresenceRecord, filterActivePresence, getPresenceStatus', async () => {
  const {formatPresenceRecord, filterActivePresence, getPresenceStatus, STATE_TEXT} = await import('../src/net/presence.js');

  assert.equal(getPresenceStatus('search'), 'ищет соперников');
  assert.equal(getPresenceStatus('online'), 'играет онлайн');
  assert.equal(getPresenceStatus('unknown'), 'не в сети');

  // Payload formatting
  const record = formatPresenceRecord({
    name: 'ОченьДлинныйНикнейм',
    state: 'menu',
    registered: true,
    dev: {p: 'android', v: '1.0.245'},
    retention: {fs: '2026-11-01', d1: 1}
  });

  assert.equal(record.n, 'ОченьДлинный'); // sliced to 12 chars
  assert.equal(record.s, 'menu');
  assert.equal(record.r, 1);
  assert.equal(record.p, 'android');
  assert.equal(record.fs, '2026-11-01');
  assert.deepEqual(record.t, {'.sv': 'timestamp'});

  // Active presence filtering
  const raw = {
    u1: {n: 'Игрок 1', s: 'menu', t: 1000},
    u2: {n: 'Игрок 2', s: 'off', t: 1100}, // offline
    u3: {n: 'Игрок 3', s: 'online', t: 1200},
    u4: {s: 'menu', t: 1300} // no name
  };

  const active = filterActivePresence(raw, 'u1');
  assert.equal(active.length, 2);
  assert.equal(active[0].uid, 'u1', 'places myUid first');
  assert.equal(active[1].uid, 'u3');

  // isOn and agoText
  const {isOn, agoText, renderOnlinePlayersDialogHtml} = await import('../src/net/presence.js');
  const now = 100000;
  assert.equal(isOn({s: 'online', t: now - 10000}, 150000, now), true);
  assert.equal(isOn({s: 'off', t: now - 10000}, 150000, now), false);
  assert.equal(isOn({s: 'online', t: now - 200000}, 150000, now), false);

  assert.equal(agoText(0), 'не в сети');
  assert.equal(agoText(now - 15000, now), 'был(а) в сети только что');
  assert.equal(agoText(now - 300000, now), 'был(а) в сети 5 мин назад');

  // renderOnlinePlayersDialogHtml
  const dialogHtml = renderOnlinePlayersDialogHtml({
    presenceList: [{uid: 'u1', n: 'Alice', s: 'online'}, {uid: 'u2', n: 'Bob', s: 'menu', r: 1}],
    myUid: 'u1',
    registered: true,
    isFriendFn: () => false
  });
  assert.ok(dialogHtml.includes('Сейчас в игре: 2'));
  assert.ok(dialogHtml.includes('Alice (вы)'));
  assert.ok(dialogHtml.includes('Bob'));
  assert.ok(dialogHtml.includes('data-addf="u2"'));
});

test('net/friends: cleanFriendCode, formatInvitePayload, formatFriendRequestPayload, renderFriendRow', async () => {
  const {cleanFriendCode, formatInvitePayload, formatFriendRequestPayload, renderFriendRow} = await import('../src/net/friends.js');

  // Code cleaning
  assert.equal(cleanFriendCode('ab-12_cd'), 'AB12CD');
  assert.equal(cleanFriendCode('toolongcode123'), 'TOOLON');

  // Invite payload
  const invite = formatInvitePayload('uid-me', 'Игрок', 'ROOM42', 1700000000);
  assert.equal(invite.k, 'r');
  assert.equal(invite.u, 'uid-me');
  assert.equal(invite.n, 'Игрок');
  assert.equal(invite.code, 'ROOM42');
  assert.equal(invite.t, 1700000000);

  // Friend request payload
  const req = formatFriendRequestPayload('uid-me', 'Игрок', 'XYZ123', 1700000000);
  assert.equal(req.k, 'f');
  assert.equal(req.v, 'XYZ123');

  // Friend row markup
  const rowHtml = renderFriendRow({uid: 'u-test', n: 'Маша', on: true, c: '#4c8dff'}, '<button>Позвать</button>', 'в меню');
  assert.ok(rowHtml.includes('Маша'));
  assert.ok(rowHtml.includes('class="lead frow on"'));
  assert.ok(rowHtml.includes('--c:#4c8dff'));
  assert.ok(rowHtml.includes('М'));
  assert.ok(rowHtml.includes('data-pl="u-test"'));
  assert.ok(rowHtml.includes('<button>Позвать</button>'));
  assert.ok(rowHtml.includes('в меню'));

  // Friends list sections markup
  const {renderFriendsListHtml} = await import('../src/net/friends.js');
  const listHtml = renderFriendsListHtml({
    invs: [['u1_r', {k: 'r', n: 'Петя', code: 'ROOM7'}]],
    reqs: [['u2_f', {k: 'f', n: 'Саша'}]],
    on: [{uid: 'u3', n: 'Даша', on: true, p: {s: 'online'}}],
    off: [{uid: 'u4', n: 'Коля', mutual: true, on: false, p: {t: Date.now() - 3600000}}],
    wait: [{uid: 'u5', n: 'Миша', mutual: false}],
    room: 'ROOM1',
    invited: {code: 'ROOM1', uids: new Set(['u3']), joined: new Set()},
    stateTextMap: {online: 'играет онлайн'},
    agoTextFn: () => 'был 1 ч назад'
  });
  assert.ok(listHtml.includes('Зовут играть'));
  assert.ok(listHtml.includes('Петя'));
  assert.ok(listHtml.includes('data-fjoin="u1_r"'));
  assert.ok(listHtml.includes('Заявки в друзья'));
  assert.ok(listHtml.includes('Саша'));
  assert.ok(listHtml.includes('data-facc="u2"'));
  assert.ok(listHtml.includes('В сети · 1'));
  assert.ok(listHtml.includes('Даша'));
  assert.ok(listHtml.includes('Ещё раз'));
  assert.ok(listHtml.includes('Не в сети · 1'));
  assert.ok(listHtml.includes('Коля'));
  assert.ok(listHtml.includes('Ждут ответа'));
  assert.ok(listHtml.includes('Миша'));

  // renderFriendInviteDialogHtml and generateRandomFriendCode
  const {renderFriendInviteDialogHtml, generateRandomFriendCode} = await import('../src/net/friends.js');
  const invHtml = renderFriendInviteDialogHtml('Иван');
  assert.ok(invHtml.includes('Иван приглашает вас в друзья'));
  assert.ok(invHtml.includes('data-a="ok"'));

  const fcode = generateRandomFriendCode();
  assert.equal(fcode.length, 6);
  assert.match(fcode, /^[A-Z0-9]{6}$/);
});
