"""Roads: warm cream cobbled roads as on the app icon, geo.road wide with their edging stones, wheel ruts and pebbles,
the same cross-section at every side so roads join from card to card. A crossroads gets a paved plaza with a well and a
signpost, a dead end its pile of boulders; a road runs up to the town gate (the town builds the gatehouse) or the
monastery gate. Travellers and a horse cart keep the longer roads busy, never near the card's sides.
"""
import math

from . import core
from .core import U, to3, sample, ribbon, prism, box, blob, hex_inset, dist
from .water import offset, tangent

EDGE_CLEAR = .1


def mats(ctx):
    g = ctx.mat
    g('r_edge', '#a8916a', .85, '#8c7653', 22, bump=.5)
    g('r_cobble', '#e3d0a6', .85, '#bfa67c', 36, bump=.7)
    g('r_rut', '#b49a6d', .9, '#9c845c', 20)
    g('r_verge', '#6f9a3a', .9, '#5c852f', 12)
    g('r_water', '#1f6f9a', .05, spec=.9)


def band(ctx, pts, end_cap=False):
    g = ctx.geo
    W = g['road']
    ribbon(pts, W, .005, ctx.mat('r_verge'), 'verge', ext=.03)
    ribbon(pts, W * .84, .0075, ctx.mat('r_edge'), 'road_edge', ext=.03)
    ribbon(pts, W * .7, .0085, ctx.mat('r_cobble'), 'road', ext=.03)
    for side in (-1, 1):
        ribbon(offset(pts, side * W * .17), W * .07, .0089, ctx.mat('r_rut'), 'rut', ext=.03)
    if end_cap:
        e = to3(pts[-1]).to_2d()
        prism(e, W * .42 * U, .0085, 16, ctx.mat('r_cobble'), 'road_end')


def pebbles(ctx, pts):
    r, W = ctx.rnd, ctx.geo['road']
    for k in range(1, len(pts) - 1, 2):
        if hex_inset(pts[k]) < EDGE_CLEAR:
            continue
        for side in (-1, 1):
            if r.random() < .35:
                q = offset(pts, side * W * r.uniform(.42, .52))[k]
                blob((q[0] * U, -q[1] * U, .006), r.uniform(.006, .011), ctx.mat(r.choice(('rock', 'stone', 'stone_dark'))), 'pebble', sz=.6, jitter=.3, rnd=r)


def plaza(ctx, c):
    """A paved round plaza with a well under a little roof and a signpost (game point c)."""
    g = ctx.geo
    P = to3(c).to_2d()
    rr = g['plaza'] * U
    prism(P, rr * 1.12, .006, 32, ctx.mat('r_edge'), 'plaza_edge', z0=.002)
    prism(P, rr, .007, 32, ctx.mat('r_cobble'), 'plaza', z0=.002)
    prism(P, rr * .62, .0015, 32, ctx.mat('r_edge'), 'plaza_ring', z0=.009)
    prism(P, rr * .56, .0015, 32, ctx.mat('r_cobble'), 'plaza_in', z0=.0095)
    # the well: a stone ring, dark water, two posts and a little gabled roof
    prism(P, .06, .045, 16, ctx.mat('stone'), 'well', z0=.009, bevel=.005)
    prism(P, .044, .001, 16, ctx.mat('r_water'), 'well_water', z0=.053)
    for s in (-1, 1):
        box((P[0] + s * .055, P[1], .054), (.011, .011, .08), ctx.mat('timber'), 'post', bevel=0)
    core.gable_roof((P[0], P[1], .13), .14, .1, .05, .3, ctx.mat('roof'), 'well_roof')
    # a signpost at the edge of the plaza
    a = ctx.rnd.random() * math.tau
    sx, sy = P[0] + math.cos(a) * rr * .8, P[1] + math.sin(a) * rr * .8
    box((sx, sy, .009), (.008, .008, .08), ctx.mat('timber'), 'signpost', bevel=0)
    for k in range(2):
        box((sx, sy, .065 + k * .014), (.05, .006, .012), ctx.mat('wood'), 'sign', rot=a + k * 1.3, bevel=.001)


def boulders(ctx, c):
    """A pile of big boulders across the dead end (game point c)."""
    r = ctx.rnd
    P = to3(c).to_2d()
    prism(P, ctx.geo['plaza'] * U * .9, .007, 24, ctx.mat('r_cobble'), 'dead_end', z0=.002)
    for i, (dx, dy, rr) in enumerate(((0, 0, .1), (-.09, .045, .075), (.09, .035, .08), (.03, -.075, .065), (-.06, -.06, .06), (.11, -.05, .045))):
        blob((P[0] + dx, P[1] + dy, rr * .3), rr, ctx.mat('rock'), 'boulder', sz=.7, jitter=.35, rnd=r)
        if r.random() < .6:
            blob((P[0] + dx - rr * .2, P[1] + dy + rr * .2, rr * .75), rr * .5, ctx.mat('grass_dark'), 'moss', sz=.35, jitter=.3, rnd=r)


def cart(ctx, c, h):
    """A horse pulling a hay cart along heading h (Blender point c)."""
    ca, sa = math.cos(h), math.sin(h)
    box((c[0], c[1], .03), (.11, .065, .012), ctx.mat('wood'), 'cart', rot=h, bevel=.003)
    blob((c[0], c[1], .06), .045, ctx.mat('hay'), 'load', sz=.6, jitter=.25, rnd=ctx.rnd)
    for s in (-1, 1):
        wx, wy = c[0] - sa * s * .04, c[1] + ca * s * .04
        box((wx, wy, .0), (.045, .01, .045), ctx.mat('timber'), 'wheel', rot=h, bevel=.012)
    hx, hy = c[0] + ca * .1, c[1] + sa * .1
    blob((hx, hy, .045), .03, ctx.mat('wood'), 'horse', sz=.75, rnd=ctx.rnd)
    blob((hx + ca * .04, hy + sa * .04, .065), .015, ctx.mat('wood'), 'horse_head', rnd=ctx.rnd)
    core.person(ctx, (c[0] + ca * .02, c[1] + sa * .02), .85, z=.04, cloth='cloth2')


def traffic(ctx, pts):
    """A cart or one or two walkers on a road, away from the sides."""
    r, n = ctx.rnd, len(pts)
    ks = [k for k in range(n) if hex_inset(pts[k]) > EDGE_CLEAR + .03]
    if not ks:
        return
    if len(ks) > n * .5 and r.random() < .6:
        k = r.choice(ks[len(ks) // 4: 3 * len(ks) // 4] or ks)
        h = tangent(pts, k) + (math.pi if r.random() < .5 else 0)
        cart(ctx, to3(pts[k]).to_2d(), h)
        ks = [q for q in ks if abs(q - k) > 8]
    for i in range(r.randint(1, 2)):
        if not ks:
            break
        k = r.choice(ks)
        q = offset(pts, r.choice((-1, 1)) * ctx.geo['road'] * .22)[k]
        core.person(ctx, to3(q).to_2d(), 1.0, z=.008)
        ks = [x for x in ks if abs(x - k) > 6]


def build(ctx):
    mats(ctx)
    sh = ctx.sh
    for rd in sh['roads']:
        pts = sample(rd['path'], 50)
        band(ctx, pts, end_cap=rd.get('end') in ('gate', 'fort'))
        pebbles(ctx, pts)
        if not sh.get('bridge') and rd.get('end') not in ('plaza',):
            traffic(ctx, pts)
    if sh.get('plaza'):
        plaza(ctx, sh['plaza'])
    if sh.get('boulders'):
        boulders(ctx, sh['boulders'])
