"""Core of the Classic 2.0 card renders: the card's shapes (from hex_shapes.json, the game's own geometry), units,
materials, small shared props, the map of taken ground, the plain fallbacks for features and the camera and light.

Units: a card is 1 tall in the game (side to side). Here it is U = 2 Blender units tall; to3() turns a game point
(x right, y down) into Blender (x right, y up, z up). The grass top is z = 0. The camera looks straight down, so the
render is the card face exactly: its six corners are the image's hexagon, sides in the order N NE SE S SW NW.
Modules (terrain, water, roads, town, monastery, life) each have build(ctx); see generate_hex_tiles.py.
"""
import bpy
import bmesh
import json
import math
import os
import random
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
# The card set: hex_shapes.json (Classic 2.0) by default, or another file of the same format named in TILE_SHAPES
# (square_shapes.json: the classic four-sided cards, scripts/gen-square-defs.mjs).
SHAPES = json.load(open(os.path.join(HERE, '..', os.environ.get('TILE_SHAPES', 'hex_shapes.json')), encoding='utf-8'))
GEO = SHAPES['geo']
U = 2.0                                   # Blender units per card height
R = GEO['R']                              # centre to corner, in card heights
V6 = [tuple(v) for v in SHAPES.get('dirs', [(0, -1), (.866, -.5), (.866, .5), (0, 1), (-.866, .5), (-.866, -.5)])]   # side directions, game frame
NS = len(V6)                              # sides of a card: 6 (Classic 2.0) or 4


def srgb(c):
    return tuple(((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c)


def hexcol(h):
    h = h.lstrip('#')
    return srgb(tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)))


def to3(p, z=0.0):
    return Vector((p[0] * U, -p[1] * U, z))


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def sample(path, n=32):
    """Points along a shape path: 2 points = a line, 4 = a cubic, 7 = two cubics (an S-bend river) (game frame)."""
    if len(path) == 2:
        return [lerp(path[0], path[1], i / n) for i in range(n + 1)]
    segs = (len(path) - 1) // 3
    out = []
    for s_ in range(segs):
        P = path[s_ * 3:s_ * 3 + 4]
        m = max(2, n // segs)
        for i in range(0 if s_ == 0 else 1, m + 1):
            t = i / m
            u = 1 - t
            out.append(tuple(u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k] for k in (0, 1)))
    return out


def quad(a, c, b, n=16):
    return [tuple((1 - t) ** 2 * a[k] + 2 * (1 - t) * t * c[k] + t * t * b[k] for k in (0, 1)) for t in (i / n for i in range(n + 1))]


def town_outline(town, n=16):
    """The town outline as points (game frame)."""
    pts = [tuple(town['from'])]
    for s in town['segs']:
        if 'c' in s and s['c'] is not None:
            pts += quad(pts[-1], s['c'], s['to'], n)[1:]
        else:
            pts.append(tuple(s['to']))
    if dist(pts[0], pts[-1]) < 1e-6:
        pts.pop()
    return pts


def inside_poly(p, poly):
    x, y = p
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def hex_inset(p):
    """Distance from p to the card's edge (negative outside): min over the six sides."""
    return min(.5 - (p[0] * V6[d][0] + p[1] * V6[d][1]) for d in range(NS))


# ------------------------------------------------------------------ materials
class Mats:
    def __init__(self):
        self.m = {}

    def get(self, name, col='#ff00ff', rough=.6, col2=None, scale=8.0, metal=0.0, emit=0.0, spec=.5, bump=.35, coat=0.0, alpha=1.0):
        """A material by name, made on first use: a colour, or two colours mixed by noise (with a matching bump)."""
        if name in self.m:
            return self.m[name]
        m = bpy.data.materials.new(name)
        nt = m.node_tree
        b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Roughness'].default_value = rough
        b.inputs['Metallic'].default_value = metal
        b.inputs['Specular IOR Level'].default_value = spec
        if coat:
            b.inputs['Coat Weight'].default_value = coat
        c1 = (*hexcol(col), 1)
        if col2:
            tc = nt.nodes.new('ShaderNodeTexCoord')
            nz = nt.nodes.new('ShaderNodeTexNoise')
            nz.inputs['Scale'].default_value = scale
            nz.inputs['Detail'].default_value = 6
            nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
            ramp = nt.nodes.new('ShaderNodeValToRGB')
            ramp.color_ramp.elements[0].color = c1
            ramp.color_ramp.elements[1].color = (*hexcol(col2), 1)
            ramp.color_ramp.elements[0].position = .32
            ramp.color_ramp.elements[1].position = .72
            nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac'])
            nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
            if bump:
                bp = nt.nodes.new('ShaderNodeBump')
                bp.inputs['Strength'].default_value = bump
                bp.inputs['Distance'].default_value = .02
                nt.links.new(nz.outputs['Fac'], bp.inputs['Height'])
                nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
        else:
            b.inputs['Base Color'].default_value = c1
        if emit:
            b.inputs['Emission Color'].default_value = c1
            b.inputs['Emission Strength'].default_value = emit
        if alpha < 1:
            b.inputs['Alpha'].default_value = alpha
        self.m[name] = m
        return m

    def stock(self):
        """The palette shared by all modules (the icon's colours)."""
        g = self.get
        g('grass', '#4fae2c', .85, '#3a9524', 4.5)
        g('grass_light', '#7fcc3a', .85, '#5db32c', 5)
        g('grass_dark', '#2f8a22', .85, '#25731c', 5)
        g('soil', '#8a6640', .9, '#6e4f30', 9)
        g('sand', '#d8c48e', .9, '#bfa874', 14)
        g('stone_rim', '#ead6ad', .7, '#c2a87e', 12)
        g('cobble', '#dcc9a2', .85, '#a48c66', 30, bump=.6)
        g('stone', '#cdc1a9', .8, '#a4977f', 11)
        g('stone_dark', '#968b79', .85, '#7a705e', 11)
        g('roof', '#d5532b', .5, '#a3361c', 22)
        g('roof_dark', '#9b3d26', .6, '#7f2f1c', 22)
        g('roof_brown', '#9a6440', .6, '#76472b', 22)
        g('roof_slate', '#5f7690', .5, '#475a70', 22)
        g('roof_ochre', '#d9a24a', .55, '#b07f2c', 22)
        g('plaster', '#f2e7cd', .8, '#dccdaa', 9)
        g('plaster_warm', '#f0d9b0', .8, '#d8bf92', 9)
        g('timber', '#6b4426', .7)
        g('wood', '#9a6a3c', .7, '#7a5230', 7)
        g('door', '#5a3a22', .7)
        g('window', '#ffd36a', .4, emit=1.4)
        g('leaf', '#4aa832', .75, '#2f8a25', 6)
        g('leaf_light', '#7cc544', .75, '#5aa834', 6)
        g('leaf_dark', '#1f6b2a', .75, '#17531f', 6)
        g('leaf_autumn', '#d9952f', .75, '#b8722a', 6)
        g('trunk', '#7a4f2d', .8)
        g('gold', '#f2c14e', .25, metal=.9)
        g('rock', '#a9a499', .85, '#878276', 9)
        g('water', '#2fc6d6', .03, spec=.9, emit=.12)
        g('water_deep', '#127fb0', .03, spec=.9)
        g('foam', '#f4fdff', .4)
        g('wool', '#f6f3ea', .95, '#e2ddd0', 30)
        g('dark', '#2e2620', .8)
        g('hay', '#e8c25a', .9, '#c99d3a', 20)
        g('wheat', '#e6c45c', .9, '#d0a63e', 40)
        for i, c in enumerate(('#c94a3a', '#3f6fb8', '#e0b23a', '#4f9a4a', '#8a56b0', '#e07a3a', '#f2efe6', '#5a6b7a')):
            g('cloth%d' % i, c, .7)
        for i, c in enumerate(('#ff6b6b', '#ffd34d', '#ffffff', '#c38bff', '#ff9ad5', '#ff9a3c')):
            g('flower%d' % i, c, .5)
        g('skin', '#e7b98f', .6)
        g('banner', '#d9361f', .6)


# ------------------------------------------------------------------ the map of taken ground
class Mask:
    """A grid over the card: which ground is taken (by a feature or a prop). Props ask free() before standing."""
    N = 160

    def __init__(self):
        self.w = 2 * R
        self.cell = self.w / self.N
        self.cells = set()

    def _ij(self, p):
        return int((p[0] + R) / self.cell), int((p[1] + .5) / self.cell)

    def _pt(self, i, j):
        return (-R + (i + .5) * self.cell, -.5 + (j + .5) * self.cell)

    def take_circle(self, c, r):
        i0, j0 = self._ij((c[0] - r, c[1] - r))
        i1, j1 = self._ij((c[0] + r, c[1] + r))
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                if dist(self._pt(i, j), c) <= r:
                    self.cells.add((i, j))

    def take_line(self, pts, half):
        for a, b in zip(pts, pts[1:]):
            n = max(1, int(dist(a, b) / (self.cell * .5)))
            for k in range(n + 1):
                self.take_circle(lerp(a, b, k / n), half)

    def take_poly(self, poly):
        xs = [p[0] for p in poly]
        ys = [p[1] for p in poly]
        i0, j0 = self._ij((min(xs), min(ys)))
        i1, j1 = self._ij((max(xs), max(ys)))
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                if inside_poly(self._pt(i, j), poly):
                    self.cells.add((i, j))

    def free(self, c, r, edge=.045):
        """Is a circle of radius r at c on untaken ground, at least `edge` inside the card?"""
        if hex_inset(c) < r + edge:
            return False
        i0, j0 = self._ij((c[0] - r, c[1] - r))
        i1, j1 = self._ij((c[0] + r, c[1] + r))
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                if (i, j) in self.cells and dist(self._pt(i, j), c) <= r:
                    return False
        return True

    def claim(self, c, r, edge=.045):
        if not self.free(c, r, edge):
            return False
        self.take_circle(c, r)
        return True


# ------------------------------------------------------------------ geometry helpers (Blender units unless noted)
class Ctx:
    """Everything a module needs for one card."""

    def __init__(self, tid, mats, seed=None):
        self.id = tid
        self.t = SHAPES['types'][tid]
        self.e = self.t['e']
        self.sh = self.t['shapes']
        self.geo = GEO
        self.corners = [tuple(c) for c in SHAPES['corners']]
        self.mats = mats
        self.rnd = random.Random(seed if seed is not None else sum(ord(ch) * (i + 7) for i, ch in enumerate(tid)))
        self.mask = Mask()
        self.town_poly = town_outline(self.sh['town']) if self.sh['town'] else None
        self.reserve_features()

    # ---- the card's features take their ground before any prop
    def reserve_features(self):
        g = self.geo
        for r in self.sh['rivers']:
            self.mask.take_line(sample(r['path'], 40), g['bank'] / 2 + .02)
        for r in self.sh['roads']:
            self.mask.take_line(sample(r['path'], 40), g['road'] / 2 + .02)
        if self.town_poly:
            self.mask.take_poly(self.town_poly)
            for a, c, b in self.sh['town']['walls']:
                self.mask.take_line(quad(a, c, b, 24), .045)
        for k in ('plaza', 'boulders'):
            if self.sh.get(k):
                self.mask.take_circle(self.sh[k], g['plaza'] + .03)
        if self.sh.get('spring'):
            self.mask.take_circle(self.sh['spring'], g['pond'] + .05)
        if self.sh.get('fort'):
            self.mask.take_circle(self.sh['fort'], max(g['fort']) + .04)

    def mat(self, name, *a, **k):
        return self.mats.get(name, *a, **k)

    def side_mid(self, d):
        return (V6[d][0] * .5, V6[d][1] * .5)


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def from_bm(bm, name, material, smooth=False, bevel=0.0, segs=2):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new(name, me))
    obj.data.materials.append(material)
    for p in me.polygons:
        p.use_smooth = smooth
    if bevel:
        m = obj.modifiers.new('bevel', 'BEVEL')
        m.width = bevel
        m.segments = segs
        m.limit_method = 'ANGLE'
    return obj


def prism(c, r, h, seg, material, name='prism', z0=0.0, rot=0.0, bevel=0.0, r2=None, smooth=False):
    """A cylinder or cone (seg sides) standing at Blender point c (x, y)."""
    bm = bmesh.new()
    M = Matrix.Translation(Vector((c[0], c[1], z0 + h / 2))) @ Matrix.Rotation(rot, 4, 'Z')
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=M)
    return from_bm(bm, name, material, smooth=smooth, bevel=bevel)


def box(c, size, material, name='box', rot=0.0, bevel=.006, z0=None):
    """A box with its base at c (x, y, z) in Blender units, turned rot about z."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    z = c[2] if z0 is None else z0
    M = Matrix.Translation(Vector((c[0], c[1], z + size[2] / 2))) @ Matrix.Rotation(rot, 4, 'Z')
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return from_bm(bm, name, material, bevel=bevel)


def blob(c, r, material, name='blob', sz=1.0, sub=2, jitter=0.0, rnd=None):
    """A lumpy sphere (bush, crown, rock, wool) centred at Blender point c."""
    rnd = rnd or random
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    for v in bm.verts:
        n = v.co.normalized()
        v.co = Vector((v.co.x, v.co.y, v.co.z * sz)) + n * (rnd.random() - .5) * jitter * r
        v.co += Vector(c)
    return from_bm(bm, name, material, smooth=True)


def gable_roof(c, w, d, h, rot, material, name='roof', over=.012):
    """A gabled roof over a w x d footprint (ridge along w) whose eaves sit at Blender point c (x, y, z)."""
    x, y, z = c
    Rm = Matrix.Rotation(rot, 3, 'Z')
    P = lambda a, b, cz: Vector((x, y, z)) + Rm @ Vector((a, b, cz))
    ow, od = w / 2 + over, d / 2 + over
    bm = bmesh.new()
    vs = [bm.verts.new(P(*q)) for q in ((-ow, -od, 0), (ow, -od, 0), (ow, od, 0), (-ow, od, 0), (-ow, 0, h), (ow, 0, h))]
    for f in ((0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)):
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=.008)
    return from_bm(bm, name, material, bevel=.003)


def ribbon(pts, width, z, material, name='ribbon', thick=.02, lanes=1, ext=0.0):
    """A strip of the given width along game-frame points, its top at height z (Blender units), solid below."""
    bm = bmesh.new()
    prev = None
    P = [to3(p) for p in pts]
    if ext:   # run a little past both ends (past the card's edge, where the face is clipped anyway)
        P[0] = P[0] + (P[0] - P[1]).normalized() * ext
        P[-1] = P[-1] + (P[-1] - P[-2]).normalized() * ext
    for k, p in enumerate(P):
        a, b = P[max(k - 1, 0)], P[min(k + 1, len(P) - 1)]
        t = (b - a).normalized()
        n = Vector((-t.y, t.x, 0))
        row = [bm.verts.new(p + n * width * U * (.5 - i / lanes) + Vector((0, 0, z))) for i in range(lanes + 1)]
        if prev:
            for i in range(lanes):
                bm.faces.new([prev[i], prev[i + 1], row[i + 1], row[i]])
        prev = row
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=-thick)
    return from_bm(bm, name, material)


def slab(poly, z, material, name='slab', thick=.02):
    """A flat piece in the shape of a game-frame polygon, top at z."""
    bm = bmesh.new()
    vs = [bm.verts.new(to3(p, z)) for p in poly]
    f = bm.faces.new(vs)
    if f.normal.z < 0:
        f.normal_flip()
    bmesh.ops.triangulate(bm, faces=[f])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=-thick)
    return from_bm(bm, name, material)


# ------------------------------------------------------------------ shared props (Blender point c = (x, y), base on z)
def tree(ctx, c, s=1.0, kind='round', z=0.0):
    """A tree about .15 across (a card is 2 tall): a round crown of three lumps, or a three-tier pine."""
    x, y = c
    m = ctx.mat
    prism((x, y), .018 * s, .1 * s, 8, m('trunk'), 'trunk', z0=z, smooth=True)
    if kind == 'pine':
        for (r, zz, h) in ((.07, .05, .12), (.055, .12, .11), (.038, .19, .1)):
            prism((x, y), r * s, h * s, 12, m('leaf_dark'), 'pine', z0=z + zz * s, r2=0.0, smooth=True)
    else:
        leaf = m(ctx.rnd.choice(('leaf', 'leaf', 'leaf_light', 'leaf_dark')))
        for dx, dy, dz, r in ((0, 0, .13, .075), (-.045, .018, .105, .055), (.045, -.012, .108, .055), (0, -.032, .17, .05)):
            blob((x + dx * s, y + dy * s, z + dz * s), r * s, leaf, 'crown', sz=.95, jitter=.18, rnd=ctx.rnd)


def bush(ctx, c, s=1.0, z=0.0):
    blob((c[0], c[1], z + .014 * s), .035 * s, ctx.mat(ctx.rnd.choice(('leaf', 'leaf_light'))), 'bush', sz=.7, jitter=.3, rnd=ctx.rnd)


def rock(ctx, c, s=1.0, z=0.0):
    blob((c[0], c[1], z + .005 * s), .025 * s, ctx.mat('rock'), 'rock', sz=.6, jitter=.35, rnd=ctx.rnd)


def person(ctx, c, s=1.0, rot=0.0, cloth=None, z=0.0):
    """A villager about .09 tall: legs, a tunic, a head, sometimes a hat."""
    x, y = c
    m = ctx.mat
    cl = m(cloth or 'cloth%d' % ctx.rnd.randrange(8))
    prism((x, y), .011 * s, .03 * s, 8, m('dark'), 'legs', z0=z, smooth=True)
    prism((x, y), .016 * s, .04 * s, 10, cl, 'tunic', z0=z + .024 * s, r2=.01 * s, smooth=True)
    blob((x, y, z + .074 * s), .011 * s, m('skin'), 'head')
    if ctx.rnd.random() < .4:
        prism((x, y), .016 * s, .004 * s, 10, m(ctx.rnd.choice(('hay', 'dark', 'cloth6'))), 'hat', z0=z + .08 * s, r2=.009 * s, smooth=True)


def sheep(ctx, c, rot, s=1.0, z=0.0):
    x, y = c
    blob((x, y, z + .026 * s), .03 * s, ctx.mat('wool'), 'sheep', sz=.75, jitter=.25, rnd=ctx.rnd)
    d = Vector((math.cos(rot), math.sin(rot), 0))
    blob((x + d.x * .03 * s, y + d.y * .03 * s, z + .034 * s), .013 * s, ctx.mat('dark'), 'sheep_head', sz=1.1)


def house(ctx, c, rot, s=1.0, roof='roof', wall='plaster', z=0.0, chimney=True):
    """A cottage about .17 x .12 (times s): walls, a gabled roof, a door, glowing windows, a chimney."""
    x, y = c
    m = ctx.mat
    w, d, h = .17 * s, .12 * s, .1 * s
    box((x, y, z), (w, d, h), m(wall), 'house', rot=rot, bevel=.004)
    gable_roof((x, y, z + h), w, d, .08 * s, rot, m(roof), 'house_roof')
    Rm = Matrix.Rotation(rot, 2)
    p = Rm @ Vector((0, -d / 2))
    box((x + p.x, y + p.y, z), (.03 * s, .006, .06 * s), m('door'), 'door', rot=rot, bevel=0)
    for wx in (-.052, .052):
        q = Rm @ Vector((wx * s, -d / 2))
        box((x + q.x, y + q.y, z + .05 * s), (.022 * s, .006, .026 * s), m('window'), 'win', rot=rot, bevel=0)
    if chimney:
        q = Rm @ Vector((.045 * s, .024 * s))
        box((x + q.x, y + q.y, z + h + .03 * s), (.022 * s, .022 * s, .06 * s), m('stone_dark'), 'chimney', rot=rot, bevel=.002)


def banner(ctx, top, s=1.0, pole=.22, mat='banner'):
    """A pole with a gold finial and a swallow-tailed flag (Blender point top = (x, y, z) of the pole's foot)."""
    x, y, z = top
    prism((x, y), .006 * s, pole * s, 6, ctx.mat('timber'), 'pole', z0=z, smooth=True)
    blob((x, y, z + pole * s + .008 * s), .01 * s, ctx.mat('gold'), 'finial')
    L, Hh, cols = .12 * s, .06 * s, 6
    z1 = z + pole * s - .008 * s
    bm = bmesh.new()

    def pt(i, j):
        u = i / cols
        return bm.verts.new((x + .004 + u * L - (L * .22 if (i == cols and j == 1) else 0), y + math.sin(u * 5 + .6) * .012 * s * u, z1 - j * Hh / 2))
    grid = [[pt(i, j) for j in range(3)] for i in range(cols + 1)]
    for i in range(cols):
        for j in range(2):
            bm.faces.new([grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=.004)
    from_bm(bm, 'banner', ctx.mat(mat), smooth=True)


# ------------------------------------------------------------------ the plain card (used when a module is not run)
def base_card(ctx):
    """The card body: a hexagon of grass, its top at z = 0 (the side walls are drawn by the game in CSS)."""
    bm = bmesh.new()
    top = [bm.verts.new(to3(c, 0)) for c in ctx.corners]
    f = bm.faces.new(top)
    if f.normal.z < 0:
        f.normal_flip()
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=-.12)
    return from_bm(bm, 'card', ctx.mat('grass'))


def plain_features(ctx, which):
    """Flat stand-ins for the features of modules that were not run, so any module can be tried alone."""
    g = ctx.geo
    if 'water' in which:
        for r in ctx.sh['rivers']:
            pts = sample(r['path'], 40)
            ribbon(pts, g['bank'], .003, ctx.mat('sand'), 'bank', ext=.02)
            ribbon(pts, g['water'], .005, ctx.mat('water'), 'water', ext=.02)
        if ctx.sh.get('spring'):
            prism(to3(ctx.sh['spring']).to_2d(), g['pond'] * U, .005, 32, ctx.mat('water'), 'pond')
    if 'roads' in which:
        for r in ctx.sh['roads']:
            ribbon(sample(r['path'], 40), g['road'], .007, ctx.mat('cobble'), 'road', ext=.02)
        if ctx.sh.get('plaza'):
            prism(to3(ctx.sh['plaza']).to_2d(), g['plaza'] * U, .008, 32, ctx.mat('cobble'), 'plaza')
    if 'town' in which and ctx.town_poly:
        slab(ctx.town_poly, .004, ctx.mat('cobble'), 'town')
        for a, c, b in ctx.sh['town']['walls']:
            ribbon(quad(a, c, b, 24), .05, .05, ctx.mat('stone'), 'wall', thick=.05)
    if 'monastery' in which and ctx.sh.get('fort'):
        prism(to3(ctx.sh['fort']).to_2d(), g['fort'][0] * U, .04, 32, ctx.mat('stone'), 'fort')


# ------------------------------------------------------------------ camera, light, render
def scene(samples=96, res=1280, device='gpu'):
    sc = bpy.context.scene
    try:
        sc.render.engine = 'CYCLES'
    except TypeError:
        pass
    try:
        pref = bpy.context.preferences.addons['cycles'].preferences
        for dev in (('OPTIX', 'CUDA') if device == 'gpu' else ()):
            try:
                pref.compute_device_type = dev
                pref.get_devices()
                if any(d.type == dev for d in pref.devices):
                    for d in pref.devices:
                        d.use = d.type == dev
                    sc.cycles.device = 'GPU'
                    break
            except Exception:
                continue
    except Exception:
        pass
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.resolution_x = res
    sc.render.resolution_y = round(res * .5 / R)        # the card frame: 2R wide, 1 tall
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.exposure = -.05
    world = sc.world or bpy.data.worlds.new('World')
    sc.world = world
    bg = next((n for n in world.node_tree.nodes if n.type == 'BACKGROUND'), None)
    if bg:
        bg.inputs['Color'].default_value = (0.62, 0.72, 0.92, 1)
        bg.inputs['Strength'].default_value = 0.55
    # a high warm sun from the upper left (the cards turn in the game, so shadows stay short), a cool fill
    sun = bpy.data.lights.new('Sun', 'SUN')
    sun.energy = 3.6
    sun.angle = math.radians(8)
    sun.color = (1.0, 0.93, 0.8)
    so = link(bpy.data.objects.new('Sun', sun))
    so.rotation_euler = (math.radians(28), 0, math.radians(-135))
    cam = bpy.data.cameras.new('Cam')
    cam.type = 'ORTHO'
    cam.ortho_scale = 2 * R * U
    co = link(bpy.data.objects.new('Cam', cam))
    co.location = (0, 0, 6)
    co.rotation_euler = (0, 0, 0)
    sc.camera = co
