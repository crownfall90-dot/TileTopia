/* ---------------- camera & input ---------------- */
const cam = {px: 0, py: 0, z: .92, tilt: 55, rot: 0};
let camAnim = 0, lastTilt = null, lastRot = null, inertia = 0;
let camFrame = 0;
// Finger moves arrive faster than the screen redraws; move the 3D scene once per frame.
function applyCamSoon() { if (!camFrame) camFrame = requestAnimationFrame(() => { camFrame = 0; applyCam(); }); }
function applyCam() {
  world.style.transform = (PG.game && PG.game.camera)
    ? PG.game.camera.formatTransform(cam)
    : `rotateX(${cam.tilt}deg) rotateZ(${cam.rot}deg) scale3d(${cam.z},${cam.z},${cam.z}) translate3d(${cam.px}px,${cam.py}px,0)`;
  if (cam.tilt !== lastTilt || cam.rot !== lastRot) {
    world.style.setProperty('--tilt', cam.tilt + 'deg'); world.style.setProperty('--rot', cam.rot + 'deg');
    lastTilt = cam.tilt; lastRot = cam.rot;
    document.documentElement.classList.toggle('flat', cam.tilt < 35); // 2D view: flat pieces
    tface.style.setProperty('--r', (trayDeg + cam.rot) + 'deg'); // the card in the tray turns with the board
  }
}
let boundsCache = null;
function bounds() { if (boundsCache && boundsCache.n === tiles.size) return boundsCache; boundsCache = calcBounds(); boundsCache.n = tiles.size; return boundsCache; }
function resizeTable() {
  const {x0, x1, y0, y1} = bounds();
  const margin = 2 * T;
  const halfWidth = (HEX ? HW : T) / 2;
  world.style.setProperty('--table-left', `${x0 * T - halfWidth - margin}px`);
  world.style.setProperty('--table-top', `${y0 * T - T / 2 - margin}px`);
  world.style.setProperty('--table-width', `${(x1 - x0) * T + halfWidth * 2 + margin * 2}px`);
  world.style.setProperty('--table-height', `${(y1 - y0 + 1) * T + margin * 2}px`);
}
function calcBounds() {
  if (HEX) {
    let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
    for (const t of tiles.values()) { const [X, Y] = HX.cellXY(t.x, t.y); x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
    return {x0, x1, y0, y1};
  }
  if (PG.game && PG.game.camera) return PG.game.camera.calcBounds(tiles);
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
  for (const t of tiles.values()) { x0 = Math.min(x0, t.x); x1 = Math.max(x1, t.x); y0 = Math.min(y0, t.y); y1 = Math.max(y1, t.y); }
  return {x0, x1, y0, y1};
}
function clampCam() {
  const b = bounds();
  if (PG.game && PG.game.camera) PG.game.camera.clampCam(cam, b, T);
  else {
    cam.px = Math.max(-(b.x1 + 1.5) * T, Math.min(-(b.x0 - 1.5) * T, cam.px));
    cam.py = Math.max(-(b.y1 + 1.5) * T, Math.min(-(b.y0 - 1.5) * T, cam.py));
    cam.z = Math.max(.45, Math.min(1.8, cam.z));
  }
  if (tut && pinch) tutEvent('zoom');
}
function tweenCam(to, ms = 600) {
  const from = {...cam}, id = ++camAnim, t0 = performance.now();
  if (RM) ms = 1;
  return new Promise(res => {
    const step = now => {
      if (id !== camAnim) return res();
      const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2;
      for (const p in to) cam[p] = from[p] + (to[p] - from[p]) * e;
      applyCam();
      k < 1 ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  });
}
function centerCam(anim) {
  const b = bounds();
  const to = (PG.game && PG.game.camera) ? PG.game.camera.centerCamTarget(b, T) : {px: -(b.x0 + b.x1) / 2 * T, py: -(b.y0 + b.y1) / 2 * T};
  if (anim) return tweenCam(to, 500);
  Object.assign(cam, to); applyCam();
}
function ensureVisible(x, y) {
  [x, y] = cellXY(x, y);
  const vw = board.clientWidth, vh = board.clientHeight;
  if (!vw) return;
  const to = (typeof PG !== 'undefined' && PG.game && PG.game.camera)
    ? PG.game.camera.ensureVisibleTarget(x, y, cam, vw, vh, T)
    : (() => {
        const hx = (vw / 2 - 58) / cam.z / T - .6, hy = vh / 2 / (cam.z * Math.cos(cam.tilt * Math.PI / 180)) / T * .7 - .6;
        const ox = x + cam.px / T, oy = y + cam.py / T;
        return (Math.abs(ox) > hx || Math.abs(oy) > hy) ? {px: cam.px - (Math.abs(ox) > hx ? ox - Math.sign(ox) * hx : 0) * T, py: cam.py - (Math.abs(oy) > hy ? oy - Math.sign(oy) * hy : 0) * T} : null;
      })();
  if (to) return tweenCam(to, 650);
}
// A finger move on screen, turned back into board directions (the board may be rotated and tilted).
let panSum = 0;
function panBy(dx, dy) {
  if (tut && (panSum += Math.abs(dx) + Math.abs(dy)) > 60) { panSum = 0; tutEvent('pan'); }
  if (PG.game && PG.game.camera) {
    const d = PG.game.camera.panDelta(dx, dy, cam);
    cam.px += d.dpx;
    cam.py += d.dpy;
  } else {
    const r = cam.rot * Math.PI / 180, sy = dy / Math.cos(cam.tilt * Math.PI / 180);
    cam.px += (dx * Math.cos(r) + sy * Math.sin(r)) / cam.z;
    cam.py += (-dx * Math.sin(r) + sy * Math.cos(r)) / cam.z;
  }
  clampCam(); applyCamSoon();
}
const hint = $('#hint');
let hintTimer = setTimeout(hideHint, 7000);
function hideHint() { hint.classList.add('gone'); clearTimeout(hintTimer); }

const pts = new Map();
const boardTools = $('#boardTools');
boardTools.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !boardTools.open) return;
  boardTools.open = false;
  boardTools.querySelector('summary').focus();
  e.stopPropagation();
});
let moved = false, sx = 0, sy = 0, pinch = null, vel = {x: 0, y: 0}, lastT = 0;
board.addEventListener('pointerdown', e => {
  if (e.target.closest('#boardTools,.over,.helppill')) return;
  boardTools.open = false;
  if (e.target.closest('.fab')) return;
  camAnim++; inertia++;
  try { board.setPointerCapture(e.pointerId); } catch (_) {}
  pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
  if (pts.size === 1) { moved = false; sx = e.clientX; sy = e.clientY; vel = {x: 0, y: 0}; lastT = performance.now(); }
  else { moved = true; pinch = null; }
});
board.addEventListener('pointermove', e => {
  const p = pts.get(e.pointerId); if (!p) return;
  const nx = e.clientX, ny = e.clientY;
  if (pts.size === 1) {
    if (!moved && Math.hypot(nx - sx, ny - sy) > 7) { moved = true; board.classList.add('dragging'); hideHint(); }
    if (moved) { const dx = nx - p.x, dy = ny - p.y, now = performance.now(), dt = Math.max(1, now - lastT); panBy(dx, dy); vel = {x: dx / dt, y: dy / dt}; lastT = now; }
  }
  p.x = nx; p.y = ny;
  // Two fingers: spread to zoom, twist to turn the board, move up/down together to tilt it.
  if (pts.size === 2) {
    const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, my = (a.y + b.y) / 2;
    if (pinch) {
      let da = ang - pinch.ang; if (da > 180) da -= 360; if (da < -180) da += 360;
      cam.z *= d / pinch.d; cam.rot += da;
      // below 64° the table edge-on breaks up on phones (the cards' walls and faces flicker), so the tilt stops there
      cam.tilt = Math.max(15, Math.min(64, cam.tilt - (my - pinch.my) * .3));
      clampCam(); applyCamSoon();
    }
    pinch = {d, ang, my}; hideHint();
  }
});
const endPtr = e => {
  if (!pts.has(e.pointerId)) return;
  pts.delete(e.pointerId);
  if (pts.size < 2) pinch = null;
  if (pts.size) return;
  board.classList.remove('dragging');
  if (!moved) tap(e.clientX, e.clientY);
  else if (performance.now() - lastT < 80 && !RM) fling();
};
board.addEventListener('pointerup', endPtr);
board.addEventListener('pointercancel', endPtr);
board.addEventListener('wheel', e => { e.preventDefault(); cam.z *= Math.exp(-e.deltaY * .0015); clampCam(); applyCam(); hideHint(); }, {passive: false});
function fling() {
  const id = ++inertia;
  const step = () => { if (id !== inertia) return; panBy(vel.x * 16, vel.y * 16); vel.x *= .92; vel.y *= .92; if (Math.hypot(vel.x, vel.y) > .02) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
$('#zin').onclick = () => { tutEvent('zoom'); tweenCam({z: Math.min(1.8, cam.z * 1.25)}, 250); };
$('#zout').onclick = () => tweenCam({z: Math.max(.45, cam.z / 1.25)}, 250);
$('#ctr').onclick = () => centerCam(true);
// Tilt presets: regular 3D and top-down; the button switches between them.
const TILTS = [[55, '3D'], [22, '2D']];
$('#view').onclick = () => {
  const i = (TILTS.findIndex(t => Math.abs(t[0] - cam.tilt) < 4) + 1) % TILTS.length;
  $('#boardAngle').textContent = TILTS[i][1];
  tweenCam({tilt: TILTS[i][0]}, 500);
};
$('#turnL').onclick = () => tweenCam({rot: Math.round((cam.rot - ROT()) / ROT()) * ROT()}, 450);
