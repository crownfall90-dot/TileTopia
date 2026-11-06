// src/render/art.js draws every card type and sprite; the game turns them into CSS classes. Checked on the source:
// drawing needs a canvas (the golden replays and the browser crawl draw them for real).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('art module exports what the game uses, and the game takes it from the bundle', () => {
  const art = fs.readFileSync('src/render/art.js', 'utf8'), html = fs.readFileSync('web/game.html', 'utf8');
  assert.match(art, /return \{cv, drawTile, drawHexTile, SPR, sprite, TILE_URL, injectArt, injectHexArt\};/);
  assert.ok(html.includes('PG.render.createArt({S, V, PL0, MEEPLE_D})'));
  assert.ok(!html.includes('function drawTile('), 'no second copy of the art in game.html');
});
