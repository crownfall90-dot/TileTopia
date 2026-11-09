// The daily showcase: 2 figures, 2 frames, 4 statuses and 4 emoji a day, only what the player does not own yet.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  const shop = await import('../src/ui/shop.js');
  const C = await import('../src/state/catalog.js');
  const S = await import('../src/state/status.js');
  const R = await import('../src/state/reactions.js');
  return {shop, FIGS: C.FIGS, FRAMES: C.FRAMES, ST: S.SHOP_STATUSES, R};
}
const day = new Date(2026, 10, 6, 12, 0);

test('daily showcase: four statuses and four emoji a day, the same set for everyone that day', async () => {
  const {shop, FIGS, FRAMES, ST} = await load();
  const items = shop.getDailyShopItems(FIGS, FRAMES, ST, day);
  const count = k => items.filter(i => i.kind === k).length;
  assert.deepEqual([count('fig'), count('frame'), count('status'), count('emote')], [2, 2, 4, 4]);
  assert.deepEqual(shop.getDailyShopItems(FIGS, FRAMES, ST, day), items, 'deterministic for the day');
  const next = shop.getDailyShopItems(FIGS, FRAMES, ST, new Date(2026, 10, 7, 12, 0));
  assert.notDeepEqual(next.map(i => i.key), items.map(i => i.key), 'a new set the next day');
  assert.ok(items.filter(i => i.kind === 'emote').every(i => i.price > 0), 'free emoji are never for sale');
});

test('daily showcase: what the player owns is not shown, the next item of the day takes its place', async () => {
  const {shop, FIGS, FRAMES, ST, R} = await load();
  const base = shop.getDailyShopItems(FIGS, FRAMES, ST, day);
  const st0 = base.find(i => i.kind === 'status'), em0 = base.find(i => i.kind === 'emote'), fig0 = base.find(i => i.kind === 'fig');
  const wallet = {gold: 0, reactionsV: 1, owned: ['classic', fig0.key], frames: [], statuses: [st0.key], emotesOwned: [em0.key]};
  const mine = shop.getDailyShopItems(FIGS, FRAMES, ST, day, wallet);
  const keys = mine.map(i => i.key);
  for (const k of [st0.key, em0.key, fig0.key]) assert.ok(!keys.includes(k), `${k} owned, not shown`);
  assert.equal(mine.filter(i => i.kind === 'status').length, 4, 'still four statuses');
  assert.ok(mine.every(i => i.kind !== 'emote' || !R.isOwned(wallet, 'emote', i.key)));
});

test('daily showcase markup: emoji cards, buy buttons that survive a status key with a colon', async () => {
  const {shop, FIGS, FRAMES, ST} = await load();
  const items = shop.getDailyShopItems(FIGS, FRAMES, ST, day, {gold: 50, owned: ['classic'], reactionsV: 1});
  const html = shop.renderDailyShopShowcase({items, wallet: {gold: 50}, figPreview: () => ''});
  assert.match(html, /data-daily-buy="status\|sh:[a-z0-9_]+\|\d+"/);
  assert.match(html, /data-daily-buy="emote\|[^|"]+\|\d+"/);
  assert.match(html, /class="dsh-emote"/);
  assert.match(html, /12 товаров/);
  assert.match(shop.renderDailyShopShowcase({items: [], wallet: {}}), /Всё из сегодняшней витрины уже ваше/);
});
