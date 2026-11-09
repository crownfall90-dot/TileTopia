// Tests for src/game/camera.js and src/game/world.js (E-1.8 decomposition)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const camera = require('../src/game/camera.js');
const world = require('../src/game/world.js');

test('game/camera: calcBounds and centerCamTarget calculate correct coordinates', () => {
  const tiles = new Map([
    ['0,0', {x: 0, y: 0}],
    ['2,1', {x: 2, y: 1}],
    ['-1,-2', {x: -1, y: -2}]
  ]);

  const b = camera.calcBounds(tiles);
  assert.equal(b.x0, -1);
  assert.equal(b.x1, 2);
  assert.equal(b.y0, -2);
  assert.equal(b.y1, 1);

  const center = camera.centerCamTarget(b, 88);
  // center x is -(-1 + 2) / 2 * 88 = -44
  // center y is -(-2 + 1) / 2 * 88 = 44
  assert.equal(center.px, -44);
  assert.equal(center.py, 44);
});

test('game/camera: clampCam clamps px, py and zoom levels', () => {
  const b = {x0: 0, x1: 2, y0: 0, y1: 2};
  const cam = {px: 5000, py: -5000, z: 5.0, tilt: 55, rot: 0};

  camera.clampCam(cam, b, 88);
  assert.equal(cam.z, 1.8, 'zoom must be clamped to max 1.8');
  assert.ok(cam.px < 5000, 'px clamped');
  assert.ok(cam.py > -5000, 'py clamped');

  cam.z = 0.1;
  camera.clampCam(cam, b, 88);
  assert.equal(cam.z, 0.45, 'zoom must be clamped to min 0.45');
});

test('game/camera: panDelta translates screen delta into board delta based on angle and zoom', () => {
  const camZero = {px: 0, py: 0, z: 1.0, tilt: 0, rot: 0};
  const d = camera.panDelta(10, 20, camZero);
  assert.equal(d.dpx, 10);
  assert.equal(d.dpy, 20);

  const camZoom = {px: 0, py: 0, z: 2.0, tilt: 0, rot: 0};
  const dZoom = camera.panDelta(10, 20, camZoom);
  assert.equal(dZoom.dpx, 5);
  assert.equal(dZoom.dpy, 10);
});

test('game/camera: formatTransform produces valid 3D CSS transform', () => {
  const cam = {px: 10, py: 20, z: 1.5, tilt: 45, rot: 90};
  const tr = camera.formatTransform(cam);
  assert.ok(tr.includes('rotateX(45deg)'));
  assert.ok(tr.includes('rotateZ(90deg)'));
  assert.ok(tr.includes('scale3d(1.5,1.5,1.5)'));
  assert.ok(tr.includes('translate3d(10px,20px,0)'));
});

test('game/world: groupPos calculates meeple positions for features', () => {
  const t = {x: 0, y: 0, r: 0};
  const fortGroup = {kind: 'f', edges: []};
  const fortPos = world.groupPos(t, fortGroup);
  assert.deepEqual(fortPos, [0.24, 0.18]);

  const cityOneEdge = {kind: 'c', edges: [0]}; // North edge [0, -1]
  const cityPos = world.groupPos(t, cityOneEdge);
  assert.equal(cityPos[0], 0);
  assert.equal(cityPos[1], -0.3);
});

test('game/world: calcWallVisibility detects hidden walls and waterfalls', () => {
  const t = {x: 0, y: 0, type: 'wS', r: 0}; // river piece
  const edges = ['w', 'f', 'w', 'f']; // North and South river
  const edgeAt = (_t, d) => edges[d];

  // North has neighbor, South does not
  const hasNeighbor = (x, y) => (x === 0 && y === -1);
  const walls = world.calcWallVisibility(t, hasNeighbor, edgeAt);

  // d=0 (North): has neighbor -> hidden=true, fall=false
  assert.equal(walls[0].hidden, true);
  assert.equal(walls[0].fall, false);

  // d=2 (South): no neighbor -> hidden=false, fall=true (river edge pours off)
  assert.equal(walls[2].hidden, false);
  assert.equal(walls[2].fall, true);

  // d=1 (East): field edge, no neighbor -> hidden=false, fall=false
  assert.equal(walls[1].hidden, false);
  assert.equal(walls[1].fall, false);

});
