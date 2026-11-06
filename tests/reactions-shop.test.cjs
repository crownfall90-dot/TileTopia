// Emoji and phrases are bought in the shop or earned: three of each are free, the rest are collected.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('reactions: free sets, prices by rarity, the index list stays as it was', async () => {
  const R = await import('../src/state/reactions.js');
  assert.equal(R.ALL_EMOTES.length, 24);
  assert.equal(R.ALL_PHRASES.length, 24);
  assert.deepEqual(R.SAYS, [...R.ALL_EMOTES, ...R.ALL_PHRASES], 'messages carry an index into SAYS');
  for (const e of R.DEFAULT_EMOTES) assert.equal(R.price('emote', e), 0);
  for (const p of R.DEFAULT_PHRASES) assert.equal(R.price('phrase', p), 0);
  assert.equal(R.price('emote', '🛡️'), R.RARITY.common.emote);
  assert.equal(R.price('emote', '🏆'), R.RARITY.epic.emote);
  assert.equal(R.price('phrase', 'Партия века! 🔥'), R.RARITY.epic.phrase);
  assert.deepEqual(R.DEFAULT_EMOTES, ['👏', '🤝', '❤️']);
  assert.equal(R.DEFAULT_PHRASES.length, 3);
  assert.equal(R.price('emote', 'nope'), 0);
  assert.equal(R.rarity('emote', 'nope'), null);
  const shop = await import('../src/ui/shop.js');
  assert.deepEqual(shop.SAYS, R.SAYS, 'the shop module re-exports the same lists');
});

test('reactions: a new player owns only the free ones; buying spends gold once', async () => {
  const R = await import('../src/state/reactions.js');
  const w = {gold: 100};
  R.migrate(w);
  assert.deepEqual(R.owned(w, 'emote'), R.ALL_EMOTES.filter(e => R.DEFAULT_EMOTES.includes(e)));
  assert.equal(R.isOwned(w, 'emote', '🔥'), false);
  assert.deepEqual(R.buy(w, 'emote', '🔥'), {ok: false, reason: 'gold', need: R.RARITY.epic.emote - 100});
  assert.equal(w.gold, 100, 'no gold taken when it is not enough');
  const r = R.buy(w, 'emote', '🛡️');
  assert.deepEqual(r, {ok: true, price: 40});
  assert.equal(w.gold, 60);
  assert.ok(R.isOwned(w, 'emote', '🛡️'));
  assert.deepEqual(R.buy(w, 'emote', '🛡️'), {ok: false, reason: 'owned'});
  assert.equal(w.gold, 60);
  assert.deepEqual(R.buy(w, 'phrase', 'free text'), {ok: false, reason: 'unknown'});
});

test('reactions: what an older version let the player pick stays theirs; the deck shows owned lines only', async () => {
  const R = await import('../src/state/reactions.js');
  const old = {gold: 0, emotes: ['👑', '🔥', '🏆'], phrases: ['Партия века! 🔥']};
  assert.equal(R.migrate(old), true);
  assert.equal(R.migrate(old), false, 'only once');
  assert.ok(R.isOwned(old, 'emote', '🔥') && R.isOwned(old, 'emote', '🏆'));
  assert.ok(R.isOwned(old, 'phrase', 'Партия века! 🔥'));
  const edited = {gold: 0, reactionsV: 1, emotes: ['🔥', '👑'], phrases: ['Партия века! 🔥']};
  assert.deepEqual(R.deck(edited, 'emote'), R.DEFAULT_EMOTES, 'a line not owned never reaches the game');
  assert.deepEqual(R.deck(edited, 'phrase'), R.DEFAULT_PHRASES, 'nothing owned left: the free set');
  R.sanitizeDeck(edited);
  assert.deepEqual(edited.emotes, []);
  assert.deepEqual(edited.phrases, []);
});

test('reactions: a player of the old version keeps the old free five; rewards are granted once', async () => {
  const R = await import('../src/state/reactions.js');
  const veteran = {gold: 0, prog: {lvl: 3, xp: 40}};
  R.migrate(veteran);
  for (const e of ['👑', '🧩', '🏰', '⚔️', '🤝']) assert.ok(R.isOwned(veteran, 'emote', e), e);
  assert.ok(R.isOwned(veteran, 'phrase', 'Мой замок!'));
  const fresh = {gold: 100};
  R.migrate(fresh);
  assert.equal(R.isOwned(fresh, 'emote', '👑'), false, 'a new player starts with three');
  assert.equal(R.grant(fresh, 'emote', '😎'), true);
  assert.equal(R.grant(fresh, 'emote', '😎'), false);
  assert.equal(fresh.gold, 100, 'a reward costs nothing');
});

test('reactions: a full collection pays once', async () => {
  const R = await import('../src/state/reactions.js');
  const w = {gold: 100000, reactionsV: 1};
  for (const e of R.ALL_EMOTES) R.buy(w, 'emote', e);
  const before = w.gold;
  assert.deepEqual(R.claimCollections(w), [{kind: 'emote', gold: R.COLLECTION_REWARD.emote}]);
  assert.equal(w.gold, before + R.COLLECTION_REWARD.emote);
  assert.deepEqual(R.claimCollections(w), [], 'not twice');
  assert.deepEqual(R.progress(w).emote, {have: 24, total: 24});
});

test('shop: the reactions section lists what is left and the items tab locks what is not bought', async () => {
  const shop = await import('../src/ui/shop.js');
  const R = await import('../src/state/reactions.js');
  const w = {gold: 50, reactionsV: 1};
  const html = shop.renderReactionShopHtml({wallet: w});
  assert.match(html, /Собрано 3 \/ 24/);
  assert.match(html, /или: Дорога прогресса/, 'earnable ones say where');
  assert.match(html, /data-rbuy="emote" data-rid="🛡️"/);
  assert.doesNotMatch(html, /data-rid="👏"/, 'free ones are not for sale');
  assert.match(html, /rs-item emote r-epic poor/, 'too dear for the wallet is marked');
  const items = shop.renderItemsEmotesHtml({wallet: w, selectedEmotes: R.deck(w, 'emote'), selectedPhrases: R.deck(w, 'phrase')});
  assert.match(items, /em-cat-btn lockd" data-rbuy="emote" data-rid="🔥"/);
  assert.match(items, /data-toggle-emote="👏"/);
  assert.match(items, /собрано 3 из 24/);
});
