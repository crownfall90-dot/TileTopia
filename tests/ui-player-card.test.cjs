const test = require('node:test');
const assert = require('node:assert/strict');

test('ui/playerCard: formatPresenceDetails, renderPlayerCardHtml, renderReportDialogHtml', async () => {
  const {formatPresenceDetails, renderPlayerCardHtml, renderReportDialogHtml} = await import('../src/ui/playerCard.js');

  // 1. formatPresenceDetails
  const now = Date.now();
  const onlineDetails = formatPresenceDetails({s: 'menu', t: now - 30000}, {r: 100}, {menu: 'В главном меню'});
  assert.equal(onlineDetails.isOnline, true);
  assert.equal(onlineDetails.seenText, 'В главном меню');
  assert.ok(onlineDetails.badgeText.includes('В сети'));

  const offlineDetails = formatPresenceDetails({s: 'off', t: now - 300000}, {r: 100});
  assert.equal(offlineDetails.isOnline, false);
  assert.ok(offlineDetails.seenText.includes('5 мин назад'));

  // 2. renderPlayerCardHtml for a peer player (not me, not friend)
  const peerCard = renderPlayerCardHtml({
    uid: 'u-1234',
    name: 'Александр',
    col: '#2563eb',
    frame: 'gold',
    statusText: 'Следопыт',
    cups: 350,
    wins: 24,
    games: 40,
    isOnline: true,
    seenText: 'В игре',
    isFriend: false,
    isMe: false,
    hasActiveRoom: false,
  });

  assert.ok(peerCard.includes('Александр'), 'renders name');
  assert.ok(peerCard.includes('Следопыт'), 'renders status');
  assert.ok(peerCard.includes('350'), 'renders cups');
  assert.ok(peerCard.includes('24'), 'renders wins');
  assert.ok(peerCard.includes('40'), 'renders games');
  assert.ok(peerCard.includes('Победы (60%)'), 'calculates winrate');
  assert.ok(peerCard.includes('id="plInviteRoom"'), 'has invite to room button');
  assert.ok(peerCard.includes('id="plAdd"'), 'has offer friendship button');
  assert.ok(peerCard.includes('id="plReport"'), 'has report button');
  assert.ok(!peerCard.includes('🏆'), 'no standard emoji trophy, uses SVG');
  assert.ok(peerCard.includes('svg width="18" height="18"'), 'uses SVG icons');

  // 3. renderPlayerCardHtml for an existing friend
  const friendCard = renderPlayerCardHtml({
    uid: 'u-5678',
    name: 'Ольга',
    col: '#10b981',
    isFriend: true,
    isMe: false,
    hasActiveRoom: true,
    roomCode: 'ABCD',
  });
  assert.ok(friendCard.includes('Ольга'));
  assert.ok(friendCard.includes('В друзьях'));
  assert.ok(friendCard.includes('id="plDel"'), 'has remove friend option');
  assert.ok(friendCard.includes('в комнату ABCD'), 'shows active room badge in invite button');

  // 4. renderReportDialogHtml
  const repHtml = renderReportDialogHtml({
    uid: 'u-bad',
    name: 'Нарушитель',
  });
  assert.ok(repHtml.includes('Пожаловаться на игрока'), 'has dialog title');
  assert.ok(repHtml.includes('Нарушитель'), 'has player name');
  assert.ok(repHtml.includes('offensive_name'), 'has offensive name reason');
  assert.ok(repHtml.includes('unsporting_afk'), 'has AFK reason');
  assert.ok(repHtml.includes('cheating_exploit'), 'has cheating reason');
  assert.ok(repHtml.includes('spam_disruption'), 'has spam reason');
  assert.ok(repHtml.includes('id="repCommentInput"'), 'has comment textarea');
  assert.ok(repHtml.includes('id="btnSubmitReport"'), 'has submit button');
});
