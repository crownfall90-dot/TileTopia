// Bottom navigation: the five main sections, shown on those screens only (never in a game or a lobby).
/* Jigsaw frame: the pieces inside a host (children with data-jp) are drawn as puzzle pieces. data-jc is the colour
   ("gold" or a hex), data-je lists the edges that carry a tab or a notch, e.g. "r:tab,b:notch". The outline is SVG
   behind the real buttons, redrawn when anything changes size. The same shapes are the design language of the game:
   the bottom bar, the main menu and the section banners. */
let jigN = 0;
function jigsawFrame(host, o) {
  const uid = 'jg' + (++jigN); // gradient ids must differ per frame: a gradient inside a hidden screen does not paint elsewhere
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'jigsvg'); svg.setAttribute('aria-hidden', 'true'); host.prepend(svg);
  const K = Object.assign({R: 20, NECK: 5.5, BR: 9, CLR: 2, BULB: 6, GAP: 6}, o || {}), f = v => +v.toFixed(2);
  const mix = (h, o2, k) => { const n = x => parseInt(x.slice(1), 16), a = n(h), c = n(o2), g = sh => Math.round(((a >> sh) & 255) * k + ((c >> sh) & 255) * (1 - k)); return '#' + ((1 << 24) | g(16) << 16 | g(8) << 8 | g(0)).toString(16).slice(1); };
  const path = (x, y, w, h, ed) => {
    const {R, NECK, BR, CLR, BULB, GAP} = K;
    const sides = [{k: 't', u: [1, 0], S: [x + R, y], L: w - 2 * R}, {k: 'r', u: [0, 1], S: [x + w, y + R], L: h - 2 * R}, {k: 'b', u: [-1, 0], S: [x + w - R, y + h], L: w - 2 * R}, {k: 'l', u: [0, -1], S: [x, y + h - R], L: h - 2 * R}];
    let d = `M${f(x + R)} ${f(y)}`;
    sides.forEach((e, i) => {
      const [ux, uy] = e.u, nx = uy, ny = -ux, m = e.L / 2, kind = ed[e.k];
      const P = (a, off) => `${f(e.S[0] + ux * a + nx * off)} ${f(e.S[1] + uy * a + ny * off)}`;
      if (kind === 'tab') d += `L${P(m - NECK, 0)}C${P(m - NECK, 1)} ${P(m - BR, 3)} ${P(m - BR, BULB)}A${BR} ${BR} 0 1 1 ${P(m + BR, BULB)}C${P(m + BR, 3)} ${P(m + NECK, 1)} ${P(m + NECK, 0)}`;
      else if (kind === 'notch') { const r = BR + CLR, nk = NECK + CLR, ib = BULB - GAP; d += `L${P(m - nk, 0)}C${P(m - nk, -1)} ${P(m - r, -1.5)} ${P(m - r, -ib)}A${r} ${r} 0 1 0 ${P(m + r, -ib)}C${P(m + r, -1.5)} ${P(m + nk, -1)} ${P(m + nk, 0)}`; }
      const nx2 = sides[(i + 1) % 4];
      d += `L${P(e.L, 0)}A${R} ${R} 0 0 1 ${f(nx2.S[0])} ${f(nx2.S[1])}`;
    });
    return d + 'Z';
  };
  const el = (n, at) => { const e = document.createElementNS(NS, n); for (const k in at) e.setAttribute(k, at[k]); return e; };
  const draw = () => {
    const hr = host.getBoundingClientRect(), pcs = [...host.querySelectorAll('[data-jp]')];
    if (!hr.width || !hr.height || !pcs.length) return;
    const PAD = 24; svg.setAttribute('viewBox', `${-PAD} ${-PAD} ${hr.width + 2 * PAD} ${hr.height + 2 * PAD}`);
    svg.setAttribute('width', hr.width + 2 * PAD); svg.setAttribute('height', hr.height + 2 * PAD); svg.style.left = svg.style.top = -PAD + 'px';
    const defs = el('defs', {}), out = [defs];
    const grad = (id, top, bot) => { const g = el('linearGradient', {id, x1: 0, y1: 0, x2: 0, y2: 1}); g.append(el('stop', {offset: 0, 'stop-color': top}), el('stop', {offset: 1, 'stop-color': bot})); defs.append(g); };
    const gl = el('linearGradient', {id: uid + 'Gl', x1: 0, y1: 0, x2: 0, y2: 1}); gl.append(el('stop', {offset: 0, 'stop-color': '#fff', 'stop-opacity': .26}), el('stop', {offset: .5, 'stop-color': '#fff', 'stop-opacity': .05}), el('stop', {offset: 1, 'stop-color': '#fff', 'stop-opacity': 0})); defs.append(gl);
    grad(uid + 'Gold', '#ffe08e', '#e29c2a');
    pcs.forEach((b, i) => {
      const r = b.getBoundingClientRect(), c = b.dataset.jc || '#4c8dff', ed = {};
      (b.dataset.je || '').split(',').forEach(t => { const [k, v] = t.split(':'); if (k && v) ed[k.trim()] = v.trim(); });
      if (c !== 'gold') grad(uid + 'C' + i, mix(c, '#1c2656', .5), mix(c, '#121a40', .72));
      const d = path(r.left - hr.left, r.top - hr.top, r.width, r.height, ed);
      out.push(el('path', {d, class: 'base' + (c === 'gold' ? ' gold' : ''), fill: `url(#${uid}${c === 'gold' ? 'Gold' : 'C' + i})`}), el('path', {d, class: 'gloss', fill: `url(#${uid}Gl)`}));
    });
    svg.replaceChildren(...out);
  };
  const ro = new ResizeObserver(draw); ro.observe(host); host.querySelectorAll('[data-jp]').forEach(p => ro.observe(p));
  new MutationObserver(draw).observe(host, {attributes: true, attributeFilter: ['hidden', 'class', 'data-jc'], subtree: true});
  requestAnimationFrame(draw); document.fonts && document.fonts.ready && document.fonts.ready.then(draw);
  return draw;
}
// Minimalist layout: section heroes removed to avoid visual clutter and vertical space consumption.
(function sectionHeroes() {
  const H = {};
  for (const [id, [c, ic, t, tag]] of Object.entries(H)) {
    const lb = document.querySelector(`#scr-${id} .lb`), top = lb && lb.querySelector('.ltop'); if (!top) continue;
    const host = document.createElement('div'); host.className = 'jig shero small';
    host.innerHTML = `<div class="mhero" data-jp data-jc="${c}" data-je="r:tab"><span class="mhi">${ic}</span><div><b>${t}</b><p>${tag}</p></div></div>`;
    top.after(host); jigsawFrame(host, {R: 18, GAP: 6, NECK: 5, BR: 8.5, BULB: 6});
  }
})();
(function menuJigsaw() { const g = $('#jigSetup'); if (g) jigsawFrame(g, {R: 20, GAP: 6, NECK: 6, BR: 10, BULB: 7}); })();
/* The bottom bar is four jigsaw pieces: each has a round tab that fits into the notch of the next one. Every
   section has its own colour; the piece of the open section is gold and glowing. The outline is drawn as SVG from
   the real size of the buttons. */
(function bnavPuzzle() {
  // Navigation tabs are styled with slanted strategy tiles via CSS
})();
$('#bnav').onclick = e => { const b = e.target.closest('[data-nav]'); if (!b) return; if (b.dataset.nav === 'friends') friendsBack = 'menu'; show(b.dataset.nav); };
// Swipe left / right across a bottom-menu screen to the next / previous one, in the menu's order. Not on rows that
// scroll sideways themselves (the progress road, tabs, stalls), not in dialogs, and only for a clearly sideways move.
(function navSwipe() {
  const ORDER = ['menu', 'progress', 'friends', 'shop'];
  let x0 = 0, y0 = 0, t0 = 0, curX = 0;
  let active = false, isDragging = false, axisLocked = null;
  let curScr = null, curName = '', targetScr = null, targetName = '';
  let animating = false;

  const sideScroller = el => {
    for (; el && el !== document.body; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth + 4 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
    }
    return false;
  };

  const cleanupStyles = el => {
    if (!el) return;
    el.style.removeProperty('transform');
    el.style.removeProperty('transition');
    el.style.removeProperty('will-change');
    el.style.removeProperty('pointer-events');
    el.style.removeProperty('z-index');
  };

  document.addEventListener('touchstart', e => {
    if (animating || e.touches.length !== 1) return;
    const nav = $('#bnav');
    if (!nav || nav.hidden || e.target.closest('.over,input,textarea,.board,#boot,.modal-overlay') || sideScroller(e.target)) return;
    curScr = document.querySelector('.screen:not([hidden])');
    if (!curScr) return;
    curName = curScr.id.replace('scr-', '');
    if (!ORDER.includes(curName)) return;

    active = true;
    isDragging = false;
    axisLocked = null;
    targetScr = null;
    targetName = '';
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
    curX = x0;
    t0 = Date.now();
  }, {passive: true});

  document.addEventListener('touchmove', e => {
    if (!active || animating || e.touches.length !== 1) return;
    curX = e.touches[0].clientX;
    const curY = e.touches[0].clientY;
    const dx = curX - x0;
    const dy = curY - y0;

    if (axisLocked === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        if (Math.abs(dy) >= Math.abs(dx) * 0.85) {
          axisLocked = 'vertical';
          active = false;
          return;
        } else {
          axisLocked = 'horizontal';
          isDragging = true;
        }
      } else {
        return;
      }
    }

    if (axisLocked !== 'horizontal') return;
    if (e.cancelable) e.preventDefault();

    const curIdx = ORDER.indexOf(curName);
    const screenW = window.innerWidth || 360;
    let dragDx = dx;

    let newTargetName = '';
    if (dx < 0) {
      if (curIdx < ORDER.length - 1) {
        newTargetName = ORDER[curIdx + 1];
      } else {
        dragDx = dx * 0.28;
      }
    } else if (dx > 0) {
      if (curIdx > 0) {
        newTargetName = ORDER[curIdx - 1];
      } else {
        dragDx = dx * 0.28;
      }
    }

    if (newTargetName !== targetName) {
      if (targetScr && targetScr !== curScr) {
        cleanupStyles(targetScr);
        targetScr.hidden = true;
      }
      targetName = newTargetName;
      targetScr = targetName ? $('#scr-' + targetName) : null;
      if (targetScr) {
        targetScr.hidden = false;
        targetScr.style.pointerEvents = 'none';
        targetScr.style.willChange = 'transform';
        targetScr.style.transition = 'none';
        targetScr.style.zIndex = '2';
      }
    }

    curScr.style.pointerEvents = 'none';
    curScr.style.willChange = 'transform';
    curScr.style.transition = 'none';
    curScr.style.zIndex = '3';
    curScr.style.transform = `translate3d(${dragDx}px, 0, 0)`;

    if (targetScr) {
      const targetOffset = dx < 0 ? (screenW + dragDx) : (-screenW + dragDx);
      targetScr.style.transform = `translate3d(${targetOffset}px, 0, 0)`;
    }
  }, {passive: false});

  const onTouchEnd = () => {
    if (!active || !isDragging) {
      active = false;
      isDragging = false;
      return;
    }
    active = false;
    isDragging = false;

    const dx = curX - x0;
    const dt = Math.max(1, Date.now() - t0);
    const vx = dx / dt;
    const screenW = window.innerWidth || 360;

    const sameDirection = (dx < 0 && vx <= 0.08) || (dx > 0 && vx >= -0.08);
    const fastFlick = sameDirection && Math.abs(vx) > 0.32 && Math.abs(dx) > 24;
    const draggedFarEnough = sameDirection && Math.abs(dx) > screenW * 0.26;
    const shouldCommit = Boolean(targetScr && (draggedFarEnough || fastFlick));

    animating = true;
    const animDuration = 240;
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

    curScr.style.transition = `transform ${animDuration}ms ${ease}`;
    if (targetScr) {
      targetScr.style.transition = `transform ${animDuration}ms ${ease}`;
    }

    if (shouldCommit) {
      const nav = $('#bnav');
      if (nav && !nav.hidden) {
        nav.querySelectorAll('[data-nav]').forEach(b => {
          b.classList.toggle('on', b.dataset.nav === targetName);
        });
      }
      try { if (typeof telegramHaptic === 'function') telegramHaptic('selection'); } catch (_) {}

      curScr.style.transform = `translate3d(${dx < 0 ? -screenW : screenW}px, 0, 0)`;
      targetScr.style.transform = 'translate3d(0, 0, 0)';

      setTimeout(() => {
        cleanupStyles(curScr);
        cleanupStyles(targetScr);
        animating = false;
        if (targetName === 'friends') friendsBack = 'menu';
        show(targetName, true);
      }, animDuration + 15);
    } else {
      curScr.style.transform = 'translate3d(0, 0, 0)';
      if (targetScr) {
        targetScr.style.transform = `translate3d(${dx < 0 ? screenW : -screenW}px, 0, 0)`;
      }

      setTimeout(() => {
        cleanupStyles(curScr);
        if (targetScr) {
          cleanupStyles(targetScr);
          targetScr.hidden = true;
        }
        animating = false;
      }, animDuration + 15);
    }
  };

  document.addEventListener('touchend', onTouchEnd, {passive: true});
  document.addEventListener('touchcancel', onTouchEnd, {passive: true});
})();
