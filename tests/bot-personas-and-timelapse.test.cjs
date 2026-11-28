'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('G-2: bot personas (builder, roadman, monk) differ measurably in figure selection', async () => {
  const {BOT_ARCHETYPES, figurePick} = await import('../src/engine/bots.js');
  const {key, groupsOf} = await import('../src/engine/board.js');

  assert.deepEqual(Object.keys(BOT_ARCHETYPES).sort(), ['balanced', 'builder', 'monk', 'roadman']);

  // 3-tile road (base v = 3 + 1 = 4) vs monastery (base v = 5):
  // - monk: road 4, fort 5 * 1.45 = 7.25 -> picks fort
  // - roadman: road 4 * 1.45 = 5.8, fort 5 -> picks road
  const r0 = {x: 0, y: 0, type: 'capRS', r: 0, seed: 1};
  const r1 = {x: 1, y: 0, type: 'rS', r: 1, seed: 2};
  const r2 = {x: 2, y: 0, type: 'rS', r: 1, seed: 3};
  const fTile = {x: 0, y: 1, type: 'fort', r: 0, seed: 4};
  const tiles = new Map([
    [key(0, 0), r0],
    [key(1, 0), r1],
    [key(2, 0), r2],
    [key(0, 1), fTile],
  ]);

  const cityG = groupsOf(r0).find(g => g.kind === 'c');
  const roadG = groupsOf(r0).find(g => g.kind === 'r');
  const fortG = groupsOf(fTile).find(g => g.kind === 'f');
  assert.ok(cityG && roadG && fortG);

  const opts = [
    {t: r0, g: cityG},
    {t: r0, g: roadG},
    {t: fTile, g: fortG},
  ];
  const mid = () => 0.5;

  const monkOpts = [{t: r0, g: roadG}, {t: fTile, g: fortG}];
  const monkPick = figurePick(tiles, [], monkOpts, 5, mid, 'normal', 'monk');
  assert.equal(monkPick.g.kind, 'f', 'monk prioritizes monastery over 3-tile road');

  const roadmanPick = figurePick(tiles, [], monkOpts, 5, mid, 'normal', 'roadman');
  assert.equal(roadmanPick.g.kind, 'r', 'roadman prioritizes 3-tile road over monastery');

  const builderPick = figurePick(tiles, [], opts, 5, mid, 'normal', 'builder');
  assert.equal(builderPick.g.kind, 'c', 'builder prioritizes city');
});

test('runtime wiring: personas propagate to players, timelapse and last-move marker are present', () => {
  const matchStart = read('src/app/runtime/match-start.js');
  const turns = read('src/app/runtime/turns.js');
  const matchHud = read('src/app/runtime/match-hud.js');
  const matchmaking = read('src/app/runtime/matchmaking.js');
  const sound = read('src/audio/sound.js');

  assert.match(matchStart, /const persona = s\.human \? null/, 'newGame sets persona on seats');
  assert.match(matchStart, /persona,\s*score:\s*0/, 'startGame copies persona onto players');
  assert.match(turns, /function\s+playTimelapse\s*\(/, 'timelapse replay function exists');
  assert.match(turns, /at\(move\.x, move\.y\)/, 'timelapse uses the confirmed tiles from the completed board');
  assert.match(turns, /function\s+botReact\s*\(/, 'bot reaction helper exists');
  assert.match(matchHud, /document\.addEventListener\('keydown'/, 'keyboard shortcuts listen on document');
  assert.match(matchHud, /classList\.add\('last-move'\)/, 'last-move marker is applied to placed tiles');
  assert.match(matchmaking, /botReplyPool\.map\(x => SAYS\.indexOf\(x\)\)/, 'bot replies resolve dynamically against SAYS');
  assert.match(sound, /chat:\s*t\s*=>/, 'soft chat sound exists');
});
