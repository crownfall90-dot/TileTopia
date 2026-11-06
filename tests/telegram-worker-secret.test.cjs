// The Telegram webhook must only accept requests carrying the shared secret, otherwise anyone can make the bot message arbitrary chats.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

async function load() { return (await import('../workers/telegram-bot-worker.js')).default; }
const post = (headers = {}) => new Request('https://w.example/', {method: 'POST', headers: {'content-type': 'application/json', ...headers}, body: JSON.stringify({})});

test('worker: refuses to run without TELEGRAM_WEBHOOK_SECRET', async () => {
  const w = await load();
  assert.equal((await w.fetch(post(), {TELEGRAM_BOT_TOKEN: 't'})).status, 500);
});

test('worker: wrong or missing secret gets 403, the right one passes', async () => {
  const w = await load(), env = {TELEGRAM_BOT_TOKEN: 't', TELEGRAM_WEBHOOK_SECRET: 's3cret'};
  assert.equal((await w.fetch(post(), env)).status, 403);
  assert.equal((await w.fetch(post({'X-Telegram-Bot-Api-Secret-Token': 'nope'}), env)).status, 403);
  assert.equal((await w.fetch(post({'X-Telegram-Bot-Api-Secret-Token': 's3cret'}), env)).status, 200);
});

test('app: update downloads are limited to this repository\'s releases and manifest points at the real app id', () => {
  const fs = require('node:fs');
  for (const f of ['staging', 'github']) {
    const j = fs.readFileSync(`${__dirname}/../app/src/${f}/java/com/crownfall/mosaic/Updater.java`, 'utf8');
    assert.match(j, /static boolean trustedUrl\(String url\)/);
    assert.match(j, /if \(!trustedUrl\(url\)\)/);
  }
  const game = fs.readFileSync(`${__dirname}/../web/game.html`, 'utf8');
  assert.ok(!game.includes('package=com.crownfall.mosaic'), 'intent link uses the real application id');
  assert.match(fs.readFileSync(`${__dirname}/../app/src/main/AndroidManifest.xml`, 'utf8'), /pathPrefix="\/TileTopia"/);
});
