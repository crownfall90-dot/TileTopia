"""Terrain, built first: the card body and its ground.

The card is the hexagon from ctx.corners, its grass top at z = 0 and BASE thick below, one mesh named 'card'. Its top is a
fine triangular grid, so the ground can carry
  - a few gentle low mounds on the free ground (smooth, with lighter crowns), kept off every feature and the card's edge,
  - weights the grass shader reads as mesh attributes: 'earth' (worn ground round every road mouth), 'lift' (the mounds'
    crowns), 'lush' (deeper green along the rivers and round the spring), 'calm' (plain standard grass where a road or a
    river crosses a side, so neighbouring cards meet without a seam).
The grass shader mixes three greens in large soft patches (a noise shifted per card) with a fine grain that only shows
up close.

A low cream curb (stone_rim), cut into stones, runs along every side that is not town. It opens where a road or a river
crosses (a post on each side of the opening, centred on the side, the same on every card, so a neighbour's opening lines
up in any of its six turns), and a corner stone sits where two curbs meet. Little grass tufts grow at the curb's foot.
The ground this module takes (curb, posts, corner stones, the mounds' crowns) is claimed in ctx.mask, and
ctx.ground_z(p) gives the height of the ground at a game point p (Blender units), for props standing on a mound.
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

from . import core
from .core import GEO, R, U, V6, dist, hex_inset, hexcol, sample, to3

# sizes in card heights, heights (z) in Blender units
CURB_W = .03                                   # the curb's width
CURB_H = .04                                   # its height above the grass
POST_L, POST_D, POST_H = .032, .04, .056       # a post by an opening: along the side, inward, height
CORNER_A, CORNER_W, CORNER_H = .052, .04, .05  # a corner stone: reach along each side, depth, height
JOINT = .0032                                  # the joint between two stones
STONE = (.05, .078)                            # the length of a curb stone
ROAD_GAP = GEO['road'] / 2 + .022              # half the opening for a road (the road with its verges is .115)
RIVER_GAP = GEO['bank'] / 2 + .014             # half the opening for a river (its banks are .21)
BASE = .12                                     # the card's thickness below the grass
GRID = 56                                      # the top grid: steps along a side (about .01 apart)


def sstep(a, b, x):
    if x <= a:
        return 0.0
    if x >= b:
        return 1.0
    t = (x - a) / (b - a)
    return t * t * (3 - 2 * t)


def np_sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def np_poly_dist(P, pts):
    """Distance from every point of P (n x 2) to the polyline pts (game frame)."""
    A = np.asarray(pts[:-1], float)
    B = np.asarray(pts[1:], float)
    AB = B - A
    L2 = np.maximum((AB ** 2).sum(-1), 1e-12)
    AP = P[:, None, :] - A[None, :, :]
    t = np.clip((AP * AB[None]).sum(-1) / L2, 0.0, 1.0)
    C = A[None] + t[..., None] * AB[None]
    return np.sqrt(((P[:, None, :] - C) ** 2).sum(-1)).min(1)


# ------------------------------------------------------------------ distance to the features
class Dist:
    """Distance (card heights) from a point to the nearest taken cell of the mask: a two-pass chamfer transform."""

    def __init__(self, mask):
        self.mask = mask
        self.W = mask.N + 2
        self.H = int(1.0 / mask.cell) + 3
        W, H, INF = self.W, self.H, 1e6
        d = [INF] * (W * H)
        for (i, j) in mask.cells:
            if 0 <= i < W and 0 <= j < H:
                d[i * H + j] = 0.0
        s2 = math.sqrt(2)
        for j in range(H):              # forward
            for i in range(W):
                k = i * H + j
                v = d[k]
                if v == 0.0:
                    continue
                if i > 0:
                    v = min(v, d[k - H] + 1)
                    if j > 0:
                        v = min(v, d[k - H - 1] + s2)
                if j > 0:
                    v = min(v, d[k - 1] + 1)
                    if i < W - 1:
                        v = min(v, d[k + H - 1] + s2)
                d[k] = v
        for j in range(H - 1, -1, -1):  # backward
            for i in range(W - 1, -1, -1):
                k = i * H + j
                v = d[k]
                if v == 0.0:
                    continue
                if i < W - 1:
                    v = min(v, d[k + H] + 1)
                    if j < H - 1:
                        v = min(v, d[k + H + 1] + s2)
                if j < H - 1:
                    v = min(v, d[k + 1] + 1)
                    if i > 0:
                        v = min(v, d[k - H + 1] + s2)
                d[k] = v
        self.d = d

    def __call__(self, p):
        i, j = self.mask._ij(p)
        i = min(max(i, 0), self.W - 1)
        j = min(max(j, 0), self.H - 1)
        return self.d[i * self.H + j] * self.mask.cell


def taken_near(mask, p, r):
    """Is any taken cell within r of p (no edge rule, unlike Mask.free)?"""
    i0, j0 = mask._ij((p[0] - r, p[1] - r))
    i1, j1 = mask._ij((p[0] + r, p[1] + r))
    for i in range(i0, i1 + 1):
        for j in range(j0, j1 + 1):
            if (i, j) in mask.cells and dist(mask._pt(i, j), p) <= r:
                return True
    return False


# ------------------------------------------------------------------ the mounds
def place_mounds(ctx, df):
    """A few gentle mounds where the ground is free: (centre, radius, height, angle, aspect)."""
    rnd = ctx.rnd
    busy = len(ctx.sh['roads']) + len(ctx.sh['rivers']) + (2 if ctx.town_poly else 0) + (1 if ctx.sh.get('fort') else 0)
    want = max(2, 5 - busy) + rnd.randint(0, 1)
    out = []
    for _ in range(160):
        if len(out) >= want:
            break
        p = (rnd.uniform(-R, R), rnd.uniform(-.5, .5))
        r = rnd.uniform(.085, .15)
        if hex_inset(p) < r * .75 + .055 or df(p) < r * .8:
            continue
        if any(dist(p, q[0]) < (r + q[1]) * .8 for q in out):
            continue
        out.append((p, r, rnd.uniform(.016, .03), rnd.uniform(0, math.pi), rnd.uniform(.7, 1.0)))
    for p, r, *_ in out:
        ctx.mask.take_circle(p, r * .55)   # the crown: props standing there would sink into it
    return out


def mound_field(mounds, P):
    """Height (Blender units, before the falloffs) and crown weight of the mounds at the points P (n x 2)."""
    h = np.zeros(len(P))
    lift = np.zeros(len(P))
    for (c, r, hh, ang, asp) in mounds:
        dx, dy = P[:, 0] - c[0], P[:, 1] - c[1]
        ca, sa = math.cos(ang), math.sin(ang)
        u = (dx * ca + dy * sa) / r
        v = (-dx * sa + dy * ca) / (r * asp)
        b = np.clip(1 - (u * u + v * v), 0, None) ** 2
        h += hh * b
        lift = np.maximum(lift, b)
    return h, lift


# ------------------------------------------------------------------ the card body and its grass top
def hex_grid(n):
    """Points of a triangular grid filling the card exactly (game frame) and its triangles."""
    a, bx, by = R / n, R / (2 * n), .5 / n
    idx, pts = {}, []
    for j in range(-n, n + 1):
        for i in range(-n, n + 1):
            if abs(i + j) <= n:
                idx[(i, j)] = len(pts)
                pts.append((i * a + j * bx, j * by))
    tris = []
    for (i, j), k in idx.items():
        r, u, ru = idx.get((i + 1, j)), idx.get((i, j + 1)), idx.get((i + 1, j + 1))
        if r is not None and u is not None:
            tris.append((k, r, u))
            if ru is not None:
                tris.append((r, ru, u))
    return pts, tris


def ground_weights(ctx, P, mounds, df):
    """Per point of P: height, and the shader's weights earth, lift, lush, calm."""
    g = GEO
    n = len(P)
    inset = np.min(np.stack([.5 - (P[:, 0] * V6[d][0] + P[:, 1] * V6[d][1]) for d in range(6)]), 0)
    feat = np.array([df(tuple(p)) for p in P])
    h, lift = mound_field(mounds, P)
    fall = np_sstep(.05, .1, inset) * np_sstep(.008, .05, feat)
    h = h * fall
    lift = lift * fall
    # worn earth round every road mouth: a fan hugging the road where it crosses the side, the same on every card
    earth = np.zeros(n)
    for road in ctx.sh['roads']:
        pts = sample(road['path'], 40)
        for k, d in enumerate(road['edges']):
            near = pts[:22] if k == 0 else pts[18:]
            t = .5 - (P[:, 0] * V6[d][0] + P[:, 1] * V6[d][1])
            sel = t < .27
            if not sel.any():
                continue
            dr = np_poly_dist(P[sel], near)
            ts = t[sel]
            hw = g['road'] / 2 + .022 + .032 * np.sin(np.pi * np.clip(ts / .27, 0, 1))
            w = (1 - np_sstep(hw - .012, hw + .014, dr)) * (1 - np_sstep(.13, .25, ts))
            earth[sel] = np.maximum(earth[sel], w)
    # lusher grass along the rivers and round the spring
    lush = np.zeros(n)
    for river in ctx.sh['rivers']:
        dr = np_poly_dist(P, sample(river['path'], 40))
        lush = np.maximum(lush, 1 - np_sstep(g['bank'] / 2 + .004, g['bank'] / 2 + .08, dr))
    if ctx.sh.get('spring'):
        sp = ctx.sh['spring']
        ds = np.hypot(P[:, 0] - sp[0], P[:, 1] - sp[1]) - (g['pond'] + .04)
        lush = np.maximum(lush, 1 - np_sstep(0, .08, ds))
    # calm, standard grass where a road or a river crosses a side
    calm = np.zeros(n)
    for d, kind in enumerate(ctx.e):
        if kind not in 'rw':
            continue
        gap = ROAD_GAP if kind == 'r' else RIVER_GAP
        t = .5 - (P[:, 0] * V6[d][0] + P[:, 1] * V6[d][1])
        s = np.abs(P[:, 0] * -V6[d][1] + P[:, 1] * V6[d][0])
        calm = np.maximum(calm, (1 - np_sstep(.02, .07, t)) * (1 - np_sstep(gap + .015, gap + .05, s)))
    return h, earth, lift, lush, calm


def body(ctx, mounds, df):
    pts, tris = hex_grid(GRID)
    P = np.asarray(pts, float)
    h, earth, lift, lush, calm = ground_weights(ctx, P, mounds, df)
    bm = bmesh.new()
    lay = {k: bm.verts.layers.float.new(k) for k in ('earth', 'lift', 'lush', 'calm')}
    vs = []
    for k, p in enumerate(pts):
        v = bm.verts.new(to3(p, float(h[k])))
        v[lay['earth']] = float(earth[k])
        v[lay['lift']] = float(lift[k])
        v[lay['lush']] = float(lush[k])
        v[lay['calm']] = float(calm[k])
        vs.append(v)
    for a, b, c in tris:
        bm.faces.new((vs[a], vs[c], vs[b]))      # to3 flips y: this order faces up
    rim = [e for e in bm.edges if e.is_boundary]
    for e in rim:
        e.smooth = False
    ret = bmesh.ops.extrude_edge_only(bm, edges=rim)
    nv = {g for g in ret['geom'] if isinstance(g, bmesh.types.BMVert)}
    for v in nv:
        v.co.z = -BASE
        for k in lay.values():
            v[k] = 0.0
    bottom = [g for g in ret['geom'] if isinstance(g, bmesh.types.BMEdge) and g.verts[0] in nv and g.verts[1] in nv]
    bmesh.ops.holes_fill(bm, edges=bottom, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = core.from_bm(bm, 'card', grass_material(ctx))
    for p in o.data.polygons:
        p.use_smooth = p.normal.z > .5
    ctx.ground_z = lambda p: ground_z(mounds, df, p)
    return o


def ground_z(mounds, df, p):
    """The height of the ground at a game point (Blender units)."""
    h, _ = mound_field(mounds, np.asarray([p], float))
    return float(h[0]) * sstep(.05, .1, hex_inset(p)) * sstep(.008, .05, df(p))


# ------------------------------------------------------------------ the grass shader
class Nodes:
    def __init__(self, mat):
        self.nt = mat.node_tree
        self.N = self.nt.nodes

    def link(self, a, b):
        self.nt.links.new(a, b)

    def put(self, sock, v):
        if isinstance(v, (int, float)):
            sock.default_value = v
        else:
            self.link(v, sock)

    def noise(self, vec, scale, detail, rough=.5, distortion=0.0):
        n = self.N.new('ShaderNodeTexNoise')
        n.inputs['Scale'].default_value = scale
        n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough
        n.inputs['Distortion'].default_value = distortion
        self.link(vec, n.inputs['Vector'])
        return n.outputs['Fac']

    def attr(self, name):
        n = self.N.new('ShaderNodeAttribute')
        n.attribute_type = 'GEOMETRY'
        n.attribute_name = name
        return n.outputs['Fac']

    def math(self, op, a, b=0.0, c=None, clamp=False):
        n = self.N.new('ShaderNodeMath')
        n.operation = op
        n.use_clamp = clamp
        for k, v in enumerate((a, b, c)):
            if v is not None:
                self.put(n.inputs[k], v)
        return n.outputs[0]

    def smooth(self, x, a, b):
        n = self.N.new('ShaderNodeMapRange')
        n.data_type = 'FLOAT'
        n.interpolation_type = 'SMOOTHSTEP'
        n.clamp = True
        self.put(n.inputs['Value'], x)
        n.inputs['From Min'].default_value = a
        n.inputs['From Max'].default_value = b
        return n.outputs['Result']

    def mix(self, f, a, b):
        n = self.N.new('ShaderNodeMix')
        n.data_type = 'RGBA'
        self.put(next(s for s in n.inputs if s.name == 'Factor' and s.type == 'VALUE'), f)
        for name, v in (('A', a), ('B', b)):
            s = next(s for s in n.inputs if s.name == name and s.type == 'RGBA')
            if isinstance(v, str):
                s.default_value = (*hexcol(v), 1)
            else:
                self.link(v, s)
        return next(s for s in n.outputs if s.type == 'RGBA')

    def ramp(self, x, stops):
        n = self.N.new('ShaderNodeValToRGB')
        els = n.color_ramp.elements
        els[0].position, els[0].color = stops[0][0], (*hexcol(stops[0][1]), 1)
        els[1].position, els[1].color = stops[-1][0], (*hexcol(stops[-1][1]), 1)
        for pos, col in stops[1:-1]:
            els.new(pos).color = (*hexcol(col), 1)
        self.put(n.inputs['Fac'], x)
        return n.outputs['Color']

    def value(self, col, v):
        n = self.N.new('ShaderNodeHueSaturation')
        self.link(col, n.inputs['Color'])
        self.put(n.inputs['Value'], v)
        return n.outputs['Color']


GREENS = [(.28, '#2a7a1f'), (.4, '#389525'), (.5, '#48aa2b'), (.6, '#5dba31'), (.72, '#86cf42')]


def grass_material(ctx):
    m = bpy.data.materials.new('terrain_grass')
    g = Nodes(m)
    bsdf = next(n for n in g.N if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = .9
    bsdf.inputs['Specular IOR Level'].default_value = .3
    tc = g.N.new('ShaderNodeTexCoord')
    mp = g.N.new('ShaderNodeMapping')
    mp.inputs['Location'].default_value = (ctx.rnd.uniform(-40, 40), ctx.rnd.uniform(-40, 40), ctx.rnd.uniform(-40, 40))
    g.link(tc.outputs['Object'], mp.inputs['Vector'])
    vec = mp.outputs['Vector']
    big = g.noise(vec, 1.1, 2.0, .5, .25)       # large soft patches
    mid = g.noise(vec, 4.5, 3.0, .55)           # their ragged edges
    fine = g.noise(vec, 60.0, 2.0, .5)          # grain, only seen close
    earth, lift, lush, calm = (g.attr(k) for k in ('earth', 'lift', 'lush', 'calm'))
    still = g.math('SUBTRACT', 1.0, calm)
    # the grass: three greens by the patch value, lighter on the mounds, deeper by the water, plain at the openings
    p = g.math('MULTIPLY_ADD', g.math('SUBTRACT', big, .5), 1.5, .5)
    p = g.math('MULTIPLY_ADD', g.math('SUBTRACT', mid, .5), .22, p)
    p = g.math('MULTIPLY_ADD', lift, .32, p)
    p = g.math('MULTIPLY_ADD', lush, -.2, p)
    p = g.math('MULTIPLY_ADD', g.math('SUBTRACT', p, .5), still, .5)
    grass = g.value(g.ramp(p, GREENS), g.math('MULTIPLY_ADD', fine, .16, .92))
    # worn earth round the road mouths, with a dry fringe; ragged except right at the card's side
    rag = g.math('MULTIPLY', g.math('MULTIPLY_ADD', g.math('SUBTRACT', mid, .5), .8, g.math('MULTIPLY', g.math('SUBTRACT', fine, .5), .3)), still)
    er = g.math('ADD', earth, rag)
    soil = g.mix(g.smooth(fine, .3, .7), '#b48c58', '#8e6a42')
    col = g.mix(g.math('MULTIPLY', g.smooth(er, .16, .44), .6), grass, '#a7b14b')
    col = g.mix(g.smooth(er, .44, .6), col, soil)
    g.link(col, bsdf.inputs['Base Color'])
    bump = g.N.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .2
    bump.inputs['Distance'].default_value = .01
    g.link(g.math('MULTIPLY_ADD', fine, .7, g.math('MULTIPLY', mid, .3)), bump.inputs['Height'])
    g.link(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


# ------------------------------------------------------------------ the curb
def frame(ctx, d):
    """Side d as a function of (s along the side from its first corner, k inward) -> game point, and its length."""
    a, b = ctx.corners[d], ctx.corners[(d + 1) % 6]
    L = dist(a, b)
    t = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
    n = (-V6[d][0], -V6[d][1])
    return (lambda s, k: (a[0] + t[0] * s + n[0] * k, a[1] + t[1] * s + n[1] * k)), L


def solid(bm, poly, z0, z1):
    """A straight prism over a game-frame polygon, from z0 to z1."""
    lo = [bm.verts.new(to3(p, z0)) for p in poly]
    hi = [bm.verts.new(to3(p, z1)) for p in poly]
    bm.faces.new(hi)
    bm.faces.new(lo[::-1])
    for i in range(len(poly)):
        j = (i + 1) % len(poly)
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))


def split(rnd, a, b):
    """Cut the run a..b along a side into stones."""
    out, s = [], a
    while b - s > .004:
        ln = rnd.uniform(*STONE)
        if b - (s + ln) < .036:
            ln = b - s
        out.append((s, s + ln))
        s += ln + JOINT
    return out


def curb(ctx):
    rnd, e, mask = ctx.rnd, ctx.e, ctx.mask
    bm = bmesh.new()
    corner = [e[c] != 'c' and e[(c - 1) % 6] != 'c' for c in range(6)]   # corner c lies between sides c-1 and c
    runs_all = []
    for c in range(6):
        if not corner[c]:
            continue
        P1, L1 = frame(ctx, c)
        P0, L0 = frame(ctx, (c - 1) % 6)
        A = ctx.corners[c]
        bis = Vector(P1(1, 0)) - Vector(A) + Vector(P0(L0 - 1, 0)) - Vector(A)
        bis.normalize()
        inner = (A[0] + bis.x * CORNER_W / math.sin(math.pi / 3), A[1] + bis.y * CORNER_W / math.sin(math.pi / 3))
        poly = [A, P1(CORNER_A, 0), P1(CORNER_A, CORNER_W), inner, P0(L0 - CORNER_A, CORNER_W), P0(L0 - CORNER_A, 0)]
        solid(bm, poly, -.01, CORNER_H * rnd.uniform(.94, 1.04))
        mask.take_circle(A, CORNER_A)
    for d in range(6):
        if e[d] == 'c':
            continue
        P, L = frame(ctx, d)
        a = CORNER_A + JOINT if corner[d] else 0.0
        b = L - (CORNER_A + JOINT if corner[(d + 1) % 6] else 0.0)
        runs = [(a, b)]
        if e[d] in 'rw':
            gap, m = (ROAD_GAP if e[d] == 'r' else RIVER_GAP), L / 2
            for s0, s1 in ((m - gap - POST_L, m - gap), (m + gap, m + gap + POST_L)):
                solid(bm, [P(s0, 0), P(s1, 0), P(s1, POST_D), P(s0, POST_D)], -.01, POST_H)
                mask.take_circle(P((s0 + s1) / 2, POST_D / 2), POST_D * .75)
            runs = [(a, m - gap - POST_L - JOINT), (m + gap + POST_L + JOINT, b)]
        for s0, s1 in runs:
            for u0, u1 in split(rnd, s0, s1):
                w = CURB_W * rnd.uniform(.94, 1.06)
                solid(bm, [P(u0, 0), P(u1, 0), P(u1, w), P(u0, w)], -.01, CURB_H * rnd.uniform(.86, 1.1))
            mask.take_line([P(s0, CURB_W / 2), P(s1, CURB_W / 2)], CURB_W / 2 + .004)
            runs_all.append((d, s0, s1))
    if bm.verts:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        core.from_bm(bm, 'curb', ctx.mat('stone_rim'), bevel=.007, segs=2)
    else:
        bm.free()
    return runs_all


# ------------------------------------------------------------------ grass tufts at the curb's foot
def tufts(ctx, runs, df):
    rnd = ctx.rnd
    bm = bmesh.new()
    for d, s0, s1 in runs:
        P, L = frame(ctx, d)
        s = s0 + rnd.uniform(.01, .03)
        while s < s1 - .012:
            p = P(s, CURB_W + rnd.uniform(.005, .012))
            if rnd.random() < .7 and df(p) > .03:
                tuft(bm, rnd, p)
            s += rnd.uniform(.028, .05)
    if bm.verts:
        core.from_bm(bm, 'tufts', tuft_material(ctx), smooth=False)
    else:
        bm.free()


def tuft(bm, rnd, p):
    c = to3(p)
    for _ in range(rnd.randint(3, 5)):
        h = rnd.uniform(.026, .045)
        tilt = rnd.uniform(.15, .45)
        yaw = rnd.uniform(0, 2 * math.pi)
        off = Vector((math.cos(yaw), math.sin(yaw), 0)) * rnd.uniform(0, .012)
        M = (Matrix.Translation(c + off) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(tilt, 4, 'Y')
             @ Matrix.Translation(Vector((0, 0, h / 2))))
        bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=4, radius1=rnd.uniform(.006, .009), radius2=0.0,
                              depth=h, matrix=M)


def tuft_material(ctx):
    return ctx.mat('terrain_tuft', '#3e9c26', .8, '#6cc23a', 40, bump=0)


# ------------------------------------------------------------------ the module
def build(ctx):
    df = Dist(ctx.mask)                 # distance to the features, before this module claims anything
    mounds = place_mounds(ctx, df)
    body(ctx, mounds, df)
    runs = curb(ctx)
    tufts(ctx, runs, df)
