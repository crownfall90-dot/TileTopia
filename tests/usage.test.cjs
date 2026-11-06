// What players use: counters per screen and button, a bounded daily record, and the owner's summary.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const el = (attrs = {}, id = '', cls = [], text = '') => {
  const self = {dataset: attrs, id, title: '', textContent: text, classList: {contains: c => cls.includes(c)}};
  self.closest = () => self;
  return self;
};

test('usage: what was tapped becomes a stable id', async () => {
  const U = await import('../src/state/usage.js');
  assert.equal(U.featureOf(el({claimq: 'c3'})), 'claim:quest');
  assert.equal(U.featureOf(el({rbuy: 'emote', rid: '🔥'})), 'buy:emote');
  assert.equal(U.featureOf(el({dailyBuy: 'status|sh:x|50'})), 'buy:daily');
  assert.equal(U.featureOf(el({hubAction: 'rating'})), 'hub:rating');
  assert.equal(U.featureOf(el({nav: 'shop'})), 'nav:shop');
  assert.equal(U.featureOf(el({pt: 'road'})), 'ptab:road');
  assert.equal(U.featureOf(el({modeAction: 'online'})), 'mode:online');
  assert.equal(U.featureOf(el({setmode: 'fast'})), 'rules:fast');
  assert.equal(U.featureOf(el({}, 'btnMainPlay')), 'btn:btnMainPlay');
  assert.equal(U.featureOf(el({go: 'rating'})), 'go:rating');
  assert.equal(U.featureOf(el({say: '3'}, 'x', [], 'Отличный ход!')), 'say:phrase');
  assert.equal(U.featureOf(el({say: '3'}, 'x', [], '🔥')), 'say:emote');
  assert.equal(U.featureOf(el({})), null, 'a bare element is not counted');
  assert.equal(U.featureOf(null), null);
  for (const id of Object.keys(U.FEATURES)) assert.ok(U.isFeatureId(id), id + ' is a valid id (the database rule matches it)');
});

test('usage: counters are per day, capped, and sent only when something changed', async () => {
  const U = await import('../src/state/usage.js');
  let s = null;
  assert.equal(U.payload(s), null);
  s = U.bump(s, 'nav:shop', '2026-11-06');
  s = U.bump(s, 'nav:shop', '2026-11-06');
  s = U.bump(s, 'btn:ok', '2026-11-06');
  assert.deepEqual(U.payload(s), {'nav:shop': 2, 'btn:ok': 1});
  const next = U.bump(s, 'nav:shop', '2026-11-07');
  assert.deepEqual(next.c, {'nav:shop': 1}, 'a new day starts a new record');
  assert.equal(U.bump(s, 'not an id!', '2026-11-06'), s, 'junk ids are ignored');
  let big = null;
  for (let i = 0; i < 200; i++) big = U.bump(big, 'f' + i, '2026-11-06');
  assert.equal(Object.keys(big.c).length, 120, 'at most 120 different ids a day');
  let busy = null;
  for (let i = 0; i < 6000; i++) busy = U.bump(busy, 'btn:ok', '2026-11-06');
  assert.equal(busy.c['btn:ok'], 5000, 'a count stops at 5000');
});

test('usage: the owner sees players, shares, the most used and the unused', async () => {
  const U = await import('../src/state/usage.js');
  const days = [
    {day: '2026-11-05', users: {a: {'nav:shop': 3, 'btn:ok': 20}, b: {'btn:ok': 12}}},
    {day: '2026-11-06', users: {a: {'btn:ok': 5, 'new:thing': 1}, c: {'nav:shop': 1}}},
  ];
  const r = U.summarize(days, {'nav:shop': 'Витрина', 'btn:ok': 'Поставить', 'btn:tip': 'Подсказка'});
  assert.equal(r.players, 3);
  assert.equal(r.rows[0].id, 'btn:ok');
  assert.equal(r.rows[0].users, 2 + 0 === 2 ? 2 : 0);
  assert.equal(r.rows[0].taps, 37);
  assert.equal(Math.round(r.rows[0].share * 100), 67);
  const shop = r.rows.find(x => x.id === 'nav:shop');
  assert.deepEqual([shop.users, shop.taps, shop.name], [2, 4, 'Витрина']);
  assert.ok(r.rows.find(x => x.id === 'new:thing' && !x.known), 'a button nobody listed still appears, by its id');
  assert.deepEqual(r.unused, [{id: 'btn:tip', name: 'Подсказка'}]);
  assert.deepEqual(U.summarize([]), {players: 0, rows: [], unused: Object.keys(U.FEATURES).map(id => ({id, name: U.FEATURES[id]}))});
});

test('usage: the database rules accept exactly what the game sends', () => {
  const rules = require('../docs/firebase-rules.json').rules;
  assert.ok(rules.usage, 'rules for /usage exist');
  assert.match(rules.usage['.read'], /admins/, 'only the owner reads it');
  const day = rules.usage.$day, uid = day.$uid;
  assert.match(uid['.write'], /auth\.uid === \$uid/, 'a player writes only their own record');
  assert.ok(uid.$feature['.validate'].includes('isNumber'));
});
