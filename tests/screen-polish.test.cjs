'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('screen 1 (splash): seamless tile-to-art transition and loading bar', () => {
  const css = read('src/ui/styles/splash.css');
  const html = read('web/views/boot.html');
  assert.match(css, /\.boot-art\s*\{\s*z-index:\s*2;\s*\}/);
  assert.match(css, /\.boot-tiles\s*\{\s*display:\s*none;\s*z-index:\s*1;\s*\}/);
  assert.match(css, /steps\(1,\s*end\)/, 'boot-tiles stays opaque underneath until boot-art completes fade-in');
  assert.match(html, /class="boot-bar"/, 'boot screen renders sleek progress bar');
});

test('screen 2-5 (profile, fitting, progress road, achievements, items): bug fixes and polish', async () => {
  const prof = read('src/app/runtime/profile-and-rating.js');
  const progState = read('src/app/runtime/progress-state.js');
  const inv = read('src/app/runtime/inventory.js');
  const {renderAchievementsHtml} = await import('../src/ui/progress.js');
  const {renderItemsFigsHtml} = await import('../src/ui/shop.js');

  assert.ok(!/FRAMES\.wood|'wood'/.test(prof), 'invalid wood frame fallback removed from fitting room');
  assert.match(prof, /itemEarn\s*=\s*fObj\.earn/, 'earned-only frames are guarded against 0-gold purchase');
  assert.match(prof, /if\s*\(itemEarn\)\s*return;/, 'buyBtn refuses earned-only frames');
  assert.match(prof, /id="epLook"/, 'editProfile links directly to avatar/frame fitting');
  assert.match(progState, /id:\s*'m30'[^\n]*fig:\s*'wizard'/, 'level 30 milestone grants wizard instead of starter classic');
  assert.match(inv, /data-figbuy/, 'My Items handles direct figure purchase');

  const achHtml = renderAchievementsHtml({
    achDefs: [{id: 'ws5', tier: 'gold', ic: '☄️', t: 'Неудержимый', d: '5 побед подряд', ok: () => false, g: 1, coin: 'star'}],
    progAch: {},
    progStats: {},
    progLvl: 1
  });
  assert.match(achHtml, /\+1 звезда/, 'singular star label renders properly');
  assert.match(achHtml, /class="xpbar"/, 'achievements header shows overall completion progress bar');

  const figsHtml = renderItemsFigsHtml({
    figs: {classic: {name: 'Классика', price: 0}, knight: {name: 'Рыцарь', price: 600}},
    ownedFigs: ['classic'],
    selectedFig: 'classic',
    figPreviewFn: k => k + '.png'
  });
  assert.match(figsHtml, /data-figbuy="knight"/, 'unowned figures in My Items are clickable to purchase');
});
