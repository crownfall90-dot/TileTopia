"""Water: the rivers of the Classic 2.0 cards, the spring pond and the stone bridge.

A river follows its shape path (ctx.sh rivers): sandy banks geo.bank wide, a line of foam, bright shallows and a deep
channel geo.water wide, the same cross-section at every side so rivers join from card to card. Reeds and cattails,
stones, lily pads, ducks and a boat with a fisherman liven it up, kept clear of the card's sides. The spring (hWE) is a
round pond under a mossy rock outcrop; the bridge (hWBr) is a humpbacked stone bridge carrying the road over the water.
"""
import math
import random
from mathutils import Vector, Matrix

from . import core
from .core import U, to3, sample, ribbon, prism, box, blob, hex_inset, dist

EDGE_CLEAR = .09            # no reeds, lilies or boats this close to a side: the river's mouth stays standard


def mats(ctx):
    g = ctx.mat
    g('w_shallow', '#4fd0e0', .05, spec=.8, emit=.1)
    g('w_mid', '#2ea9d6', .04, spec=.9, emit=.06)
    g('w_deep', '#1c78b6', .03, spec=.9)
    g('w_wet', '#b9a46c', .85, '#a48f5c', 18)
    g('w_reed', '#4f8f2e', .7)
    g('w_cattail', '#6b4024', .8)
    g('w_lily', '#3f9a3c', .5, '#2f7f30', 10)
    g('w_lotus', '#f7b6d2', .5)
    g('w_duck', '#f8f6ef', .6)
    g('w_duck_head', '#2f7d4a', .5)
    g('w_beak', '#f2a23a', .5)
    g('w_moss', '#6f9f37', .9, '#56822b', 18)


def offset(pts, d):
    """The line d card heights to the left of game-frame points pts."""
    out = []
    for k, p in enumerate(pts):
        a, b = pts[max(k - 1, 0)], pts[min(k + 1, len(pts) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        L = math.hypot(tx, ty) or 1
        out.append((p[0] - ty / L * d, p[1] + tx / L * d))
    return out


def tangent(pts, k):
    a, b = pts[max(k - 1, 0)], pts[min(k + 1, len(pts) - 1)]
    return math.atan2(-(b[1] - a[1]), b[0] - a[0])      # heading in Blender (y up)


def river_band(ctx, pts):
    g = ctx.geo
    W, Bk = g['water'], g['bank']
    ribbon(pts, Bk, .004, ctx.mat('sand'), 'bank', ext=.03)
    ribbon(pts, (W + Bk) / 2, .0055, ctx.mat('w_wet'), 'wet_sand', ext=.03)
    ribbon(pts, W + .012, .007, ctx.mat('foam'), 'foam', ext=.03)
    ribbon(pts, W, .008, ctx.mat('w_shallow'), 'water', ext=.03)
    ribbon(pts, W * .72, .0085, ctx.mat('w_mid'), 'water_mid', ext=.03)
    ribbon(pts, W * .4, .009, ctx.mat('w_deep'), 'water_deep', ext=.03)


def reeds(ctx, c, s=1.0):
    """A clump of reeds with a couple of cattails (Blender point c)."""
    r = ctx.rnd
    for i in range(r.randint(4, 7)):
        a, d = r.random() * math.tau, r.uniform(0, .02) * s
        x, y = c[0] + math.cos(a) * d, c[1] + math.sin(a) * d
        prism((x, y), .004 * s, r.uniform(.05, .08) * s, 5, ctx.mat('w_reed'), 'reed', r2=0.0)
    for i in range(r.randint(1, 2)):
        x, y = c[0] + r.uniform(-.012, .012) * s, c[1] + r.uniform(-.012, .012) * s
        prism((x, y), .006 * s, .02 * s, 6, ctx.mat('w_cattail'), 'cattail', z0=.06 * s, smooth=True)


def lily(ctx, c, flower=False):
    r = ctx.rnd
    rr = r.uniform(.03, .042)
    prism(c, rr, .003, 12, ctx.mat('w_lily'), 'lily', z0=.0095, rot=r.random() * 6.28)
    if flower:
        blob((c[0], c[1], .016), .016, ctx.mat('w_lotus'), 'lotus', sz=.6)


def duck(ctx, c, h):
    blob((c[0], c[1], .016), .032, ctx.mat('w_duck'), 'duck', sz=.6)
    hx, hy = c[0] + math.cos(h) * .03, c[1] + math.sin(h) * .03
    blob((hx, hy, .04), .016, ctx.mat('w_duck_head'), 'duck_head')
    blob((hx + math.cos(h) * .016, hy + math.sin(h) * .016, .038), .008, ctx.mat('w_beak'), 'beak', sz=.6)


def boat(ctx, c, h):
    """A rowing boat with a fisherman and his rod, heading h (Blender)."""
    box((c[0], c[1], .009), (.2, .085, .03), ctx.mat('wood'), 'boat', rot=h, bevel=.018)
    box((c[0], c[1], .028), (.17, .06, .006), ctx.mat('trunk'), 'boat_floor', rot=h, bevel=.004)
    core.person(ctx, (c[0] - math.cos(h) * .03, c[1] - math.sin(h) * .03), 1.4, z=.026, cloth='cloth1')
    a = h + 1.2
    p0 = Vector((c[0], c[1], .07))
    p1 = Vector((c[0] + math.cos(a) * .12, c[1] + math.sin(a) * .12, .09))
    d = p1 - p0
    o = prism((0, 0), .0025, d.length, 4, ctx.mat('timber'), 'rod')
    o.matrix_world = Matrix.Translation(p0) @ d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4()


def dress_river(ctx, pts, busy=True):
    """Reeds and stones along both banks, lily pads, ducks and maybe a boat on the water."""
    r, g = ctx.rnd, ctx.geo
    half_b, half_w = g['bank'] / 2, g['water'] / 2
    n = len(pts)
    for k in range(2, n - 2, 2):
        p = pts[k]
        if hex_inset(p) < EDGE_CLEAR:
            continue
        for side in (-1, 1):
            q = offset(pts, side * (half_b - .012))[k]
            if hex_inset(q) < EDGE_CLEAR:
                continue
            x = r.random()
            if x < .3:
                reeds(ctx, to3(q).to_2d(), r.uniform(1.6, 2.1))
            elif x < .5:
                core.rock(ctx, to3(q).to_2d(), r.uniform(1.0, 1.5))
    if not busy:
        return
    for k in range(4, n - 4, 5):
        if r.random() < .55:
            side = r.choice((-1, 1))
            q = offset(pts, side * (half_w - .022))[k]
            if hex_inset(q) > EDGE_CLEAR:
                for i in range(r.randint(1, 3)):
                    lily(ctx, (q[0] * U + r.uniform(-.02, .02), -q[1] * U + r.uniform(-.02, .02)), flower=r.random() < .35)
    # ducks in a little line, or a boat on a long river
    k = int(n * r.uniform(.3, .7))
    p = pts[k]
    if hex_inset(p) > EDGE_CLEAR + .04:
        h = tangent(pts, k)
        if r.random() < .5 and len(pts) > 30:
            boat(ctx, to3(offset(pts, r.choice((-1, 1)) * .012)[k]).to_2d(), h)
        else:
            for i in range(3):
                q = offset(pts, .02 * (1 if i % 2 else -1))[max(0, k - i * 3)]
                duck(ctx, to3(q).to_2d(), h)


def spring(ctx, c):
    """A round pond under a mossy rock outcrop on the side away from the river (game point c)."""
    g, r = ctx.geo, ctx.rnd
    P = to3(c).to_2d()
    rr = g['pond'] * U
    for k, (m, z, f) in enumerate((('sand', .004, 1.22), ('w_wet', .0055, 1.1), ('foam', .007, 1.03), ('w_shallow', .008, 1.0), ('w_mid', .0085, .74), ('w_deep', .009, .45))):
        prism(P, rr * f, .006, 40, ctx.mat(m), 'pond', z0=z - .004)
    out = ctx.sh['rivers'][0]['edges'][0]
    back = (-core.V6[out][0], -core.V6[out][1])
    bx, by = (c[0] + back[0] * g['pond'] * 1.25) * U, -(c[1] + back[1] * g['pond'] * 1.25) * U
    for i in range(8):
        a = r.uniform(-1.1, 1.1) + math.atan2(-back[1], back[0])
        d = r.uniform(0, .11)
        x, y = bx + math.cos(a) * d, by + math.sin(a) * d
        rr2 = r.uniform(.06, .095)
        blob((x, y, rr2 * .25), rr2, ctx.mat('rock'), 'outcrop', sz=.7, jitter=.35, rnd=r)
        blob((x - rr2 * .2, y + rr2 * .2, rr2 * .7), rr2 * .55, ctx.mat('w_moss'), 'moss', sz=.35, jitter=.3, rnd=r)
    for i in range(5):
        a = r.random() * math.tau
        x, y = P[0] + math.cos(a) * rr * .55, P[1] + math.sin(a) * rr * .55
        lily(ctx, (x, y), flower=i % 2 == 0)
    for a in (.6, 2.2, 3.6, 5.0):
        q = (P[0] + math.cos(a) * rr * 1.25, P[1] + math.sin(a) * rr * 1.25)
        if hex_inset((q[0] / U, -q[1] / U)) > .06:
            reeds(ctx, q, 1.8)


def bridge(ctx, sh):
    """A humpbacked stone bridge along the road, over the river, at the card's centre."""
    road = sh['roads'][0]['path']
    a, b = road[0], road[-1]
    h = math.atan2(-(b[1] - a[1]), b[0] - a[0])
    L = (ctx.geo['bank'] + .1) * U
    W = ctx.geo['road'] * U * 1.15
    c = to3(sh['bridge']['at']).to_2d()
    ca, sa = math.cos(h), math.sin(h)
    n = 9
    for i in range(n):
        t = (i + .5) / n - .5
        z = .05 * (1 - (2 * t) ** 2) + .012
        x, y = c[0] + ca * t * L, c[1] + sa * t * L
        box((x, y, 0), (L / n * 1.04, W, z), ctx.mat('stone'), 'bridge', rot=h, bevel=.004)
        box((x, y, z), (L / n * 1.04, W * .78, .004), ctx.mat('cobble'), 'deck', rot=h, bevel=0)
        for side in (-1, 1):
            px, py = x - sa * side * W * .45, y + ca * side * W * .45
            box((px, py, z), (L / n * .9, W * .12, .026), ctx.mat('stone_dark'), 'parapet', rot=h, bevel=.003)
    # the arch's shadow on the water on both sides of the river
    for side in (-1, 1):
        px, py = c[0] - sa * side * W * .62, c[1] + ca * side * W * .62
        prism((px, py), W * .5, .002, 20, ctx.mat('w_deep'), 'arch_shade', z0=.0092)


def build(ctx):
    mats(ctx)
    sh = ctx.sh
    for rv in sh['rivers']:
        pts = sample(rv['path'], 60)
        if sh.get('spring'):   # a spring's river ends at the pond's rim, the pond is drawn on its own
            pts = [p for p in pts if dist(p, sh['spring']) > ctx.geo['pond'] * .8]
        river_band(ctx, pts)
        dress_river(ctx, pts, busy=not sh.get('bridge'))
    if sh.get('spring'):
        spring(ctx, sh['spring'])
    if sh.get('bridge'):
        bridge(ctx, sh)
