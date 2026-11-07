'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('ui/inbox: items definition, unread count and rendering', async () => {
  const inbox = await import('../src/ui/inbox.js');
  
  assert.ok(Array.isArray(inbox.INBOX_ITEMS), 'INBOX_ITEMS is array');
  assert.ok(inbox.INBOX_ITEMS.length >= 4, 'Has at least 4 notifications');
  
  // Verify Old status reward exists
  const oldItem = inbox.INBOX_ITEMS.find(it => it.id === 'notif_old_status');
  assert.ok(oldItem, 'Old status notification exists');
  assert.equal(oldItem.rewardType, 'status');
  assert.equal(oldItem.rewardKey, 'ex:old');

  // Verify welcome gold exists
  const goldItem = inbox.INBOX_ITEMS.find(it => it.id === 'notif_welcome_gold');
  assert.ok(goldItem, 'Gold gift notification exists');
  assert.equal(goldItem.rewardAmount, 500);

  // Unread count
  const unreadAll = inbox.unreadInboxCount([], []);
  assert.ok(unreadAll >= 3, 'Unread all returns count');

  const unreadNone = inbox.unreadInboxCount(
    inbox.INBOX_ITEMS.map(i => i.id),
    inbox.INBOX_ITEMS.map(i => i.id)
  );
  assert.equal(unreadNone, 0, 'Unread is 0 when all claimed & read');

  // Unread with friend requests
  const unreadWithFriend = inbox.unreadInboxCount(
    inbox.INBOX_ITEMS.map(i => i.id),
    inbox.INBOX_ITEMS.map(i => i.id),
    [['u123_f', { n: 'Алексей', k: 'f' }]]
  );
  assert.equal(unreadWithFriend, 1, 'Unread includes pending friend requests');

  // HTML rendering
  const html = inbox.renderInboxHtml({
    items: inbox.INBOX_ITEMS,
    claimed: [],
    friendRequests: [['u123_f', { n: 'Алексей', k: 'f' }]]
  });
  assert.ok(html.includes('notif-card'), 'Renders notif-card');
  assert.ok(html.includes('data-claim-notif="notif_old_status"'), 'Renders claim button for old status');
  assert.ok(html.includes('data-facc="u123"'), 'Renders accept button for friend request');
  assert.ok(html.includes('data-fdrop="u123_f"'), 'Renders decline button for friend request');
  assert.ok(html.includes('Алексей'), 'Renders friend request sender name');
});
