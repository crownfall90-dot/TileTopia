const test = require('node:test');
const assert = require('node:assert/strict');
const menu = require('../src/ui/menu.js');

test('ui/menu: formatGameMenuHtml formats offline pause menu', () => {
  const html = menu.formatGameMenuHtml({
    online: false,
    live: true,
    seat: -1,
    allBots: false
  });

  assert.ok(html.includes('Пауза'));
  assert.ok(html.includes('Боты ждут, время хода остановлено'));
  assert.ok(html.includes('data-a="resume"'));
  assert.ok(html.includes('data-a="settings"'));
  assert.ok(html.includes('data-a="cancel"'));
  assert.ok(!html.includes('data-a="resign"'));
  assert.ok(!html.includes('data-a="draw"'));
});

test('ui/menu: formatGameMenuHtml formats online game menu with resign (no draw)', () => {
  const html = menu.formatGameMenuHtml({
    online: true,
    live: true,
    seat: 0,
    allBots: false
  });

  assert.ok(html.includes('Онлайн-партия'));
  assert.ok(html.includes('Партия идёт, пока вы в меню'));
  assert.ok(!html.includes('data-a="draw"'));
  assert.ok(html.includes('data-a="resign"'));
  assert.ok(!html.includes('data-a="cancel"'));
});

test('ui/menu: formatGameMenuHtml formats menu when all humans left and only bots remain', () => {
  const html = menu.formatGameMenuHtml({
    online: true,
    live: true,
    seat: 0,
    allBots: true
  });

  assert.ok(html.includes('data-a="cancel"'));
  assert.ok(!html.includes('data-a="resign"'));
});

test('ui/menu: areAllOpponentsAway checks opponent drop status', () => {
  const active = [0, 1, 2];
  const awayMap = {0: false, 1: true, 2: true};
  assert.equal(menu.areAllOpponentsAway(active, i => awayMap[i], 0), true);

  awayMap[1] = false;
  assert.equal(menu.areAllOpponentsAway(active, i => awayMap[i], 0), false);
});
