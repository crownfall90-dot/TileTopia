// Tests for src/ui/hud.js and src/ui/results.js (E-1.9 decomposition)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const hud = require('../src/ui/hud.js');
const results = require('../src/ui/results.js');

test('ui/hud: cityD generates SVG path data for corners and edges', () => {
  // 4 city edges -> full tile
  const full = hud.cityD(['c', 'c', 'c', 'c'], 100);
  assert.equal(full.fill, 'M0 0H100V100H0Z');

  // 1 city edge -> arc
  const one = hud.cityD(['c', 'f', 'f', 'f'], 100);
  assert.ok(one.fill.includes('M'));
  assert.ok(one.fill.includes('Q'));
  assert.ok(one.wall.includes('M'));
});

test('ui/hud: ownSvg generates data-URI for claimed features', () => {
  const t = {type: 'rS', r: 0};
  const list = [
    {kind: 'r', edges: [0, 2], cols: ['#ef5350']}
  ];
  const uri = hud.ownSvg(t, list);
  assert.ok(uri.startsWith('data:image/svg+xml,'));
  const svg = decodeURIComponent(uri);
  assert.ok(svg.includes('stroke="#ef5350"'), 'includes color stroke in SVG');
});

test('ui/hud: renderPlayersListHtml renders player elements with turn badges and scores', () => {
  const players = [
    {name: 'Вы', col: '#ef5350', init: 'В', score: 12, meeples: 4, human: true, uid: 'me'},
    {name: 'Бот Сова', col: '#4c8dff', init: 'Б', score: 8, meeples: 3, human: false, uid: null}
  ];

  const html = hud.renderPlayersListHtml(players, {
    turn: 0,
    phase: 'place',
    bump: [],
    isMe: (p) => p.name === 'Вы',
    myRing: () => null,
    meeplesTotal: 5,
    turnTag: (i) => i === 0 ? 'ваш ход' : 'ходит',
    clockHtml: () => ''
  });

  assert.ok(html.includes('class="pl active"'), 'active turn player highlighted');
  assert.ok(html.includes('ваш ход'), 'turn tag displayed');
  assert.ok(html.includes('Бот Сова'), 'bot player displayed');
  assert.ok(html.includes('botpill'), 'bot pill badge rendered');
});

test('ui/results: winTitle produces appropriate win title', () => {
  assert.equal(results.winTitle({name: 'Вы'}, true, true), 'Победа!');
  assert.equal(results.winTitle({name: 'Бот Сова'}, true, false), 'Победил Бот Сова');
  assert.equal(results.winTitle({name: 'Вы'}, false, false), 'Лидирует Вы');
});

test('ui/results: renderPodiumHtml and renderBreakdownTableHtml format podium and scores', () => {
  const players = [
    {i: 0, name: 'Вы', col: '#ef5350', score: 25, human: true, stats: {c: 12, r: 8, f: 4, t: 15, m: 3}},
    {i: 1, name: 'Бот Сова', col: '#4c8dff', score: 18, human: false, stats: {c: 10, r: 4, f: 4, t: 14, m: 2}}
  ];

  const podEntries = [
    [players[0], 1, 100],
    [players[1], 2, 70]
  ];

  const podiumHtml = results.renderPodiumHtml(podEntries, (i) => `<img>`);
  assert.ok(podiumHtml.includes('pc first'), 'winner has pc first class');
  assert.ok(podiumHtml.includes('25'), 'winner points displayed');

  const bdHtml = results.renderBreakdownTableHtml(players);
  assert.match(bdHtml, /<td>12<\/td><td>8<\/td><td>4<\/td><td>1<\/td><td>15<\/td><td>25<\/td>/);
  assert.match(bdHtml, /<td>10<\/td><td>4<\/td><td>4<\/td><td>0<\/td><td>14<\/td><td>18<\/td>/);
});

test('ui/history: preserves the score breakdown after saving a match', async () => {
  const {renderHistoryHtml} = await import('../src/ui/progress.js');
  const {saveHistoryEntry} = await import('../src/state/save.js');
  const source = fs.readFileSync('src/app/runtime/saved-matches.js', 'utf8');
  const historySave = source.match(/^function historySave\(reason, final\) \{[\s\S]*?^\}/m)[0];
  const players = [
    {name: 'Аня', score: 27, col: '#ef5350', human: true, stats: {c: 12, r: 5, f: 9, t: 13}},
    {name: 'Боря', score: 18, col: '#4c8dff', human: true, uid: 'boris', stats: {c: 8, r: 5, f: 5, t: 13}}
  ];
  const stored = new Map();
  const localStorage = {getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value)};
  const ctx = {players, localStorage, gameKey: () => 'o:test', isMe: p => p === players[0], PG: {state: {save: {saveHistoryEntry}}}};
  vm.runInNewContext(`${historySave}; historySave('deck', true);`, ctx);
  players[0].stats.c = 99;

  const rows = JSON.parse(stored.get('gameHistory'));
  assert.deepEqual(rows[0].players[0].stats, {c: 12, r: 5, f: 9});
  const html = renderHistoryHtml(rows, uid => uid === 'boris');
  assert.match(html, /data-pl="boris"/);
  assert.match(html, /<summary>Разбор очков<\/summary>/);
  assert.match(html, /Аня<\/b><dl>.*<dt>Города<\/dt><dd>12<\/dd>.*<dt>Помощь<\/dt><dd>1<\/dd>/);
});

test('ui/history: old or incomplete rows retain their total without invented category points', async () => {
  const {renderHistoryHtml} = await import('../src/ui/progress.js');
  const html = renderHistoryHtml([{
    id: 'l:legacy', at: 1700000000000, reason: 'deck',
    players: [
      {name: 'Аня', score: 24, me: true},
      {name: 'Боря', score: 18, stats: {c: 9, r: 5}},
      {name: 'Вера', score: 11, stats: {c: 9, r: 3, f: 0}}
    ]
  }]);
  assert.match(html, /Победа/);
  assert.match(html, /<b>24<\/b>/);
  assert.doesNotMatch(html, /Разбор очков/);
});
