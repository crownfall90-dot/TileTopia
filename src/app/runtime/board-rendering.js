/* ---------------- dom: world ---------------- */
const world = $('#world'), board = $('#board');
function addSprite(parent, kind, x, y, cls, delay, scale = 1) {
  const d = SPR && SPR[kind]; if (!d) return null;
  const L = (HEX ? HW / 2 : T / 2) + x * T, Tp = (0.5 + y) * T;
  const b = document.createElement('i'); b.className = 'bb s-' + kind + (cls ? ' ' + cls : '');
  b.style.cssText = `left:${L}px;top:${Tp}px;width:${d.w * scale}px;height:${d.h * scale}px`;
  if (delay != null) { b.classList.add('pop'); b.style.setProperty('--d', delay + 's'); }
  parent.append(b);
  return b;
}
// Cards carry no standing props (houses, trees, stones): those were flat pictures turned to face the camera, so they
// swung round as the table turned. Everything on a card is in its face; only figures and flags stand up.
// The six walls of a six-sided tile: side k runs from corner k to corner k + 1 and hangs down from it.
const HEX_SIDES = [0, 1, 2, 3, 4, 5].map(k => { const a = (-120 + 60 * k) * Math.PI / 180; return `<i class="sd h${k}" style="left:${(HW / 2 + Math.cos(a) * HW / 2).toFixed(2)}px;top:${(T / 2 + Math.sin(a) * HW / 2).toFixed(2)}px;width:${(HW / 2 + .6).toFixed(2)}px;transform:rotateZ(${60 * k}deg) rotateX(-90deg)"></i>`; }).join('');
function tileEl(t) {
  if (HEX) {
    const el = document.createElement('div'); el.className = 'tile hex';
    const [l, tp] = cellLT(t.x, t.y); el.style.left = l + 'px'; el.style.top = tp + 'px';
    el.innerHTML = HEX_SIDES + `<div class="face t-${t.type}" style="--r:${t.r * 60}deg"></div>`;
    return el;
  }
  const el = document.createElement('div'); el.className = 'tile';
  el.style.left = (t.x * T - T / 2) + 'px'; el.style.top = (t.y * T - T / 2) + 'px';
  el.innerHTML = `<i class="sd n"></i><i class="sd e"></i><i class="sd s"></i><i class="sd w"></i><div class="face t-${t.type}" style="--r:${t.r * 90}deg"></div>`;
  if (TYPES[t.type].end === 'cliff') {
    const dr = [0, 1, 2, 3].find(d => edgeAt(t, d) === 'r');
    if (dr != null) {
      const c = (dr + 2) % 4, sd = el.querySelectorAll('.sd');
      sd[c].style.display = 'none';
      // the two sides next to the tear only exist on the kept half
      const side = (k, clip) => { sd[k].style.clipPath = clip; };
      if (c === 2 || c === 0) { const clip = c === 2 ? 'inset(0 0 50% 0)' : 'inset(50% 0 0 0)'; side(1, clip); side(3, clip); }
      else { const clip = c === 1 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)'; side(0, clip); side(2, clip); }
      const pit = document.createElement('div'); pit.className = 'pit'; pit.style.transform = `rotate(${(c - 2) * 90}deg)`; pit.innerHTML = '<i class="pw"></i><i class="fn"></i><i class="fp a"></i><i class="fp b"></i>'; el.append(pit);
    }
  }
  return el;
}
// Walls between two pieces are never seen: drop them, so only the outline of the kingdom has
// walls (four planes per piece would slow down panning on weak phones).
function walls(t, has = (x, y) => tiles.has(key(x, y))) {
  if (!t.el) return;
  const sd = t.el.querySelectorAll('.sd');
  if (HEX) {
    for (let d = 0; d < 6; d++) { const [x, y] = nbXY(t.x, t.y, d); sd[d].hidden = has(x, y); sd[d].classList.toggle('fall', !sd[d].hidden && edgeAt(t, d) === 'w'); }
    return;
  }
  if (typeof PG !== 'undefined' && PG.game && PG.game.world) {
    const list = PG.game.world.calcWallVisibility(t, has, edgeAt);
    list.forEach(({d, hidden, fall}) => {
      sd[d].hidden = hidden;
      sd[d].classList.toggle('fall', fall);
    });
    return;
  }
  for (let d = 0; d < 4; d++) {
    sd[d].hidden = has(t.x + DX[d], t.y + DY[d]);
    // A river that runs off the edge of the kingdom pours down the wall as a waterfall.
    sd[d].classList.toggle('fall', !sd[d].hidden && edgeAt(t, d) === 'w');
  }
}
function wallsAround(t) { walls(t); for (let d = 0; d < NDIR(); d++) { const n = at(...nbXY(t.x, t.y, d)); if (n) walls(n); } }
function placeMeeple(t, g, p, anim) {
  const [x, y] = groupPos(t, g);
  const el = addSprite(t.el, 'm' + p, x, y, '', anim && !fast() ? 0 : null);
  meeples.push({gid: gid(t, g), p, el, t, g}); markOwn();
  players[p].meeples--;
  if (anim && !fast() && !tut && meCounted() && isMe(players[p])) progress({figs: 1});
}
function removeMeeple(m) {
  meeples.splice(meeples.indexOf(m), 1); players[m.p].meeples++; markOwn();
  const a = m.el.animate([{opacity: 1, translate: '0 0'}, {opacity: 0, translate: '0 -30px'}], {duration: RM ? 1 : 600, easing: 'ease-in'});
  a.onfinish = () => m.el.remove();
}
function floatText(t, [x, y], txt, col) {
  if (fast()) return;
  const f = document.createElement('i'); f.className = 'fl'; f.textContent = txt;
  f.style.cssText = `left:${(HEX ? HW / 2 : T / 2) + x * T}px;top:${(0.5 + y) * T - 20}px;--c:${col}`;
  t.el.append(f); setTimeout(() => f.remove(), 1600);
}
