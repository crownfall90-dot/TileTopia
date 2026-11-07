"""Life on the free ground of every card: little woods at the corners and along the edges, single trees and bushes,
flower patches, meadows with a flock and its shepherd, cows and horses, haystacks, fields of wheat and vegetables with
fences and a scarecrow, beehives, orchards, people about their day. The meadow card (hG) also gets its big stones and a
windmill. Nothing stands on a feature: every prop claims its ground in ctx.mask before it is made.

Layout works in the game frame (card heights, x right, y down); props are made in Blender units (to3 / B()).
Every part goes into one mesh with a material slot per material, so thousands of small parts build and render fast.
The layout draws from its own random stream seeded by the card id (see Life.__init__), so it stays the same when
another module draws more or fewer numbers from ctx.rnd.
"""
import bpy
import bmesh
import math
import os
import random
from mathutils import Vector, Matrix

from . import core
from .core import U, R, to3, dist, lerp, hex_inset

EDGE = .045                 # props stay this far inside the card's edge (card heights)
TAU = math.tau
CLOTH = ('cloth0', 'cloth1', 'cloth2', 'cloth4', 'cloth5', 'cloth6', 'cloth0', 'cloth1', 'cloth7')
HAIR = ('life_hair0', 'life_hair1', 'life_hair2', 'life_hair3', 'life_hair0', 'life_hair1', 'life_hair4')
OAKS = ('life_oak', 'life_oak', 'life_oak2', 'life_oak2', 'life_lime', 'life_oak3')
FLOWERS = ('flower0', 'flower1', 'flower2', 'flower3', 'flower4', 'flower5', 'life_blue')


def B(p, z=None):
    """A game point (card heights, y down) in Blender units: (x, y), or (x, y, z) when z is given."""
    return (p[0] * U, -p[1] * U) if z is None else (p[0] * U, -p[1] * U, z)


def palette(ctx):
    """The module's own colours (sRGB hex), beside the stock ones."""
    g = ctx.mat
    g('life_oak', '#2f8c37', .8, '#1f6f2b', 6)
    g('life_oak2', '#45a334', .8, '#2f8526', 6)
    g('life_oak3', '#2a7f45', .8, '#1d6536', 6)
    g('life_lime', '#8ccf3e', .8, '#67b02f', 6)
    g('life_pine', '#1e6b3c', .8, '#164f2c', 7)
    g('life_pine2', '#2d7d35', .8, '#1f6128', 7)
    g('life_autumn', '#e39a2c', .8, '#c8741f', 6)
    g('life_red_tree', '#d4572a', .8, '#b54020', 6)
    g('life_blossom', '#f6b3cf', .8, '#fbe0ec', 9)
    g('life_bush', '#3e9d35', .85, '#2c8029', 9)
    g('life_bush2', '#5cb83a', .85, '#44992d', 9)
    g('life_hedge', '#2e8a34', .85, '#226b28', 14)
    g('life_soil', '#a0703f', .95, '#7d5331', 16, bump=.5)
    g('life_soil_dark', '#7d5333', .95, '#5f3d24', 16, bump=.5)
    g('life_wheat', '#f2c94c', .85, '#d9a332', 34, bump=.6)
    g('life_stubble', '#e9d690', .9, '#cdb468', 30)
    g('life_cabbage', '#9ad46a', .55, '#6fae4c', 22)
    g('life_cabbage2', '#7a4c8f', .55, '#5d3570', 22)
    g('life_veg_leaf', '#3a9a3e', .7, '#2c7f30', 18)
    g('life_pumpkin', '#f2892a', .45, '#d96d1a', 14)
    g('life_lavender', '#a68ae0', .8, '#8467c7', 30)
    g('life_sunflower', '#ffd12e', .6, '#f2b51f', 20)
    g('life_seed', '#5a381c', .85)
    g('life_cow', '#f5f2ea', .75)
    g('life_cow_spot', '#2b2523', .8)
    g('life_cow_brown', '#a8653a', .75, '#8c5230', 12)
    g('life_muzzle', '#e8a7a0', .6)
    g('life_horn', '#efe3c4', .5)
    g('life_horse', '#8f4c26', .55)
    g('life_horse2', '#d8d1c6', .6)
    g('life_horse3', '#5a3520', .55)
    g('life_mane', '#2e2018', .8)
    g('life_pig', '#f5a8b0', .55)
    g('life_hen', '#fbf8f0', .7)
    g('life_comb', '#e0322a', .5)
    g('life_dog', '#3a2e28', .8)
    g('life_fox', '#e0701e', .7)
    g('life_deer', '#a8662e', .75)
    g('life_hive0', '#f4ecd8', .6)
    g('life_hive1', '#9cc8e8', .6)
    g('life_hive2', '#f4cf5a', .6)
    g('life_hive3', '#f2a6a0', .6)
    g('life_skep', '#e2b552', .9, '#c4923a', 40)
    g('life_fruit_red', '#e5332a', .35, coat=.3)
    g('life_fruit_orange', '#f79a1c', .35, coat=.3)
    g('life_fruit_yellow', '#f6d13a', .35, coat=.3)
    g('life_moss', '#6f9f37', .9, '#56822b', 18)
    g('life_rock', '#b3ad9f', .85, '#8f897c', 7, bump=.5)
    g('life_rock2', '#9a9488', .85, '#7a756a', 7, bump=.5)
    g('life_cut', '#e8c690', .8)
    g('life_sail', '#f7efd9', .8)
    g('life_check', '#e0402f', .7)
    g('life_blue', '#6aa8ff', .5)
    g('life_trousers', '#4a3b30', .8)
    g('life_metal', '#9aa3a8', .4, metal=.6)
    g('life_burlap', '#d9c08c', .9, '#bfa36e', 30)
    g('life_mud', '#6e4a2c', .35, '#5a3a22', 10)
    for i, c in enumerate(('#5a3a22', '#2c221c', '#e6c36a', '#b65a2a', '#cfc8bc')):
        g('life_hair%d' % i, c, .7)


# ------------------------------------------------------------------ one mesh for everything
class Kit:
    """All of the module's parts in one bmesh, one material slot per material; flush() makes the object."""

    def __init__(self, ctx, rnd):
        self.ctx = ctx
        self.rnd = rnd
        self.bm = bmesh.new()
        self.slot = {}
        self.mats = []

    def mi(self, mat):
        if isinstance(mat, str):
            mat = self.ctx.mat(mat)
        if mat.name not in self.slot:
            self.slot[mat.name] = len(self.mats)
            self.mats.append(mat)
        return self.slot[mat.name]

    def _done(self, verts, mat, smooth):
        mi = self.mi(mat)
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = mi
            f.smooth = smooth
        return verts

    def blob(self, c, r, mat, sz=1.0, sx=1.0, sy=1.0, rot=0.0, sub=2, jitter=0.0, smooth=True):
        """A lumpy sphere centred at Blender point c (x, y, z), stretched sx along rot, sy across, sz up."""
        vs = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=r)['verts']
        cs, sn = math.cos(rot), math.sin(rot)
        rnd = self.rnd
        for v in vs:
            n = v.co.normalized()
            co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
            if jitter:
                co += n * (rnd.random() - .5) * jitter * r
            v.co = Vector((c[0] + co.x * cs - co.y * sn, c[1] + co.x * sn + co.y * cs, c[2] + co.z))
        return self._done(vs, mat, smooth)

    def cone(self, c, r, h, seg, mat, z0=0.0, r2=None, rot=0.0, smooth=False):
        """A cylinder or a cut cone (seg sides) standing at Blender point c (x, y), base at z0."""
        M = Matrix.Translation(Vector((c[0], c[1], z0 + h / 2))) @ Matrix.Rotation(rot, 4, 'Z')
        vs = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r,
                                   radius2=r if r2 is None else max(r2, 1e-4), depth=h, matrix=M)['verts']
        return self._done(vs, mat, smooth)

    def spike(self, c, r, h, seg, mat, z0=0.0, rot=0.0, smooth=False, star=0.0):
        """A cone with a true apex (seg sides; star > 0 pulls every other rim point in: a star-shaped tier)."""
        bm = self.bm
        n = seg * (2 if star else 1)
        rim = []
        for i in range(n):
            a = rot + TAU * i / n
            rr = r * (1 - star) if (star and i % 2) else r
            dz = .0 if (star and i % 2) else -h * .06
            rim.append(bm.verts.new((c[0] + math.cos(a) * rr, c[1] + math.sin(a) * rr, z0 + dz)))
        top = bm.verts.new((c[0], c[1], z0 + h))
        bot = bm.verts.new((c[0], c[1], z0 + h * .12))
        for i in range(n):
            a, b = rim[i], rim[(i + 1) % n]
            bm.faces.new((a, b, top))
            bm.faces.new((b, a, bot))
        return self._done(rim + [top, bot], mat, smooth)

    def rod(self, a, b, r, mat, seg=6, r2=None, smooth=True):
        """A cylinder from Blender point a to b (x, y, z)."""
        a, b = Vector(a), Vector(b)
        d = b - a
        q = d.normalized().to_track_quat('Z', 'Y')
        M = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
        vs = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r,
                                   radius2=r if r2 is None else max(r2, 1e-4), depth=d.length, matrix=M)['verts']
        return self._done(vs, mat, smooth)

    def cube(self, c, size, mat, rot=0.0, smooth=False):
        """A box, its base centred at Blender point c (x, y, z), turned rot about z."""
        vs = bmesh.ops.create_cube(self.bm, size=1.0)['verts']
        M = (Matrix.Translation(Vector((c[0], c[1], c[2] + size[2] / 2))) @ Matrix.Rotation(rot, 4, 'Z')
             @ Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
        bmesh.ops.transform(self.bm, matrix=M, verts=vs)
        return self._done(vs, mat, smooth)

    def prism(self, pts, z0, z1, mat, smooth=False):
        """A flat piece: Blender polygon pts (x, y) from z0 up to z1."""
        bm = self.bm
        lo = [bm.verts.new((p[0], p[1], z0)) for p in pts]
        hi = [bm.verts.new((p[0], p[1], z1)) for p in pts]
        n = len(pts)
        area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
        if area < 0:
            lo.reverse()
            hi.reverse()
        bm.faces.new(hi)
        bm.faces.new(lo[::-1])
        for i in range(n):
            bm.faces.new((lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]))
        return self._done(lo + hi, mat, smooth)

    def ridge(self, a, b, w, h, mat, z0=0.0, segs=4, taper=.35, smooth=True):
        """A rounded ridge (a planted row) from Blender point a to b (x, y), w wide, h high, ends tapered."""
        bm = self.bm
        A, Bv = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0))
        d = (Bv - A)
        L = d.length
        if L < 1e-6:
            return []
        t = d / L
        n = Vector((-t.y, t.x, 0))
        e = min(w * .6, L * .3)
        stations = ((0.0, taper), (e, 1.0), (L - e, 1.0), (L, taper))
        rings = []
        for s, k in stations:
            base = A + t * s
            ring = []
            for i in range(segs + 1):
                th = math.pi * i / segs
                ring.append(bm.verts.new(base + n * math.cos(th) * w / 2 * k + Vector((0, 0, z0 + math.sin(th) * h * k))))
            rings.append(ring)
        for r0, r1 in zip(rings, rings[1:]):
            for i in range(segs):
                bm.faces.new((r0[i], r1[i], r1[i + 1], r0[i + 1]))
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
        return self._done([v for r in rings for v in r], mat, smooth)

    def flush(self, name='life'):
        if not self.bm.verts:
            self.bm.free()
            return None
        me = bpy.data.meshes.new(name)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        obj = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(obj)
        return obj


# ------------------------------------------------------------------ how much room there is
class Room:
    """For every cell of ctx.mask: the distance to the nearest taken cell (a two-pass nearest-seed sweep), and from it
    the clearance of a point: how big a circle fits there on free ground, at least EDGE inside the card."""

    def __init__(self, mask):
        self.mask = mask
        self.ni = mask.N + 2
        self.nj = int(1 / mask.cell) + 3
        self.update()

    def update(self):
        ni, nj = self.ni, self.nj
        BIG = 1 << 30
        sx = [BIG] * (ni * nj)
        sy = [BIG] * (ni * nj)
        d2 = [BIG] * (ni * nj)
        for (i, j) in self.mask.cells:
            if 0 <= i < ni and 0 <= j < nj:
                k = j * ni + i
                sx[k], sy[k], d2[k] = i, j, 0

        def pull(k, i, j, q):
            if sx[q] != BIG:
                dd = (i - sx[q]) ** 2 + (j - sy[q]) ** 2
                if dd < d2[k]:
                    d2[k], sx[k], sy[k] = dd, sx[q], sy[q]
        for j in range(nj):
            for i in range(ni):
                k = j * ni + i
                if i > 0:
                    pull(k, i, j, k - 1)
                if j > 0:
                    pull(k, i, j, k - ni)
                    if i > 0:
                        pull(k, i, j, k - ni - 1)
                    if i < ni - 1:
                        pull(k, i, j, k - ni + 1)
            for i in range(ni - 2, -1, -1):
                pull(j * ni + i, i, j, j * ni + i + 1)
        for j in range(nj - 1, -1, -1):
            for i in range(ni - 1, -1, -1):
                k = j * ni + i
                if i < ni - 1:
                    pull(k, i, j, k + 1)
                if j < nj - 1:
                    pull(k, i, j, k + ni)
                    if i < ni - 1:
                        pull(k, i, j, k + ni + 1)
                    if i > 0:
                        pull(k, i, j, k + ni - 1)
            for i in range(1, ni):
                pull(j * ni + i, i, j, j * ni + i - 1)
        self.d2 = d2

    def clear(self, p):
        i, j = self.mask._ij(p)
        if not (0 <= i < self.ni and 0 <= j < self.nj):
            return -1.0
        d2 = self.d2[j * self.ni + i]
        d = 9.0 if d2 >= (1 << 30) else math.sqrt(d2) * self.mask.cell - .75 * self.mask.cell
        return min(d, hex_inset(p) - EDGE)


def local(c, h, z=0.0):
    """Blender point c (x, y), heading h: a function (forward, side, up) -> Blender point."""
    f = (math.cos(h), math.sin(h))
    s = (-f[1], f[0])
    return lambda a, b=0.0, u=0.0: (c[0] + f[0] * a + s[0] * b, c[1] + f[1] * a + s[1] * b, z + u)


# ------------------------------------------------------------------ the module
class Life:
    def __init__(self, ctx):
        self.ctx = ctx
        self.mask = ctx.mask
        self.rnd = random.Random('life/' + ctx.id)
        self.kit = Kit(ctx, self.rnd)
        self.trees = []          # (game point, crown radius) of every tree, for spacing
        self.groups = []         # (game point, radius, kind) of every set piece, for neighbours

    # ---------------------------------------------------------------- trees and plants (Blender points)
    def oak(self, c, s=1.0, leaf=None, z=0.0, fruit=None):
        """A round tree about .2 * s across: a short trunk and a crown of four to six lumps."""
        k, r = self.kit, self.rnd
        leaf = leaf or r.choice(OAKS)
        k.cone(c, .017 * s, .1 * s, 6, 'trunk', z0=z, r2=.012 * s, smooth=True)
        a0 = r.random() * TAU
        lumps = [(0, 0, .135, .07)]
        n = r.choice((3, 4, 4, 5))
        for i in range(n):
            a = a0 + TAU * i / n + r.uniform(-.3, .3)
            d = r.uniform(.042, .055)
            lumps.append((math.cos(a) * d, math.sin(a) * d, r.uniform(.1, .125), r.uniform(.046, .056)))
        lumps.append((-.014, .014, .18, .048))
        for dx, dy, dz, rr in lumps:
            k.blob((c[0] + dx * s, c[1] + dy * s, z + dz * s), rr * s, leaf, sz=.9, jitter=.2)
        if fruit:
            for i in range(r.randint(6, 9)):
                a = r.random() * TAU
                el = r.uniform(.35, 1.0)
                lx, ly, lz, lr = lumps[r.randrange(len(lumps))]
                ce = Vector((lx, ly, lz)) * s
                dv = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
                p = ce + dv * lr * s * .93
                k.blob((c[0] + p.x, c[1] + p.y, z + p.z), .0105 * s, fruit, sub=1)

    def pine(self, c, s=1.0, leaf=None, z=0.0):
        """A fir about .16 * s across: star-shaped tiers that read as a conifer from above."""
        k, r = self.kit, self.rnd
        leaf = leaf or r.choice(('life_pine', 'life_pine', 'life_pine2', 'leaf_dark'))
        k.cone(c, .014 * s, .07 * s, 5, 'trunk', z0=z, smooth=True)
        a0 = r.random() * TAU
        n = r.choice((7, 8, 9))
        tiers = ((.08, .045, .11), (.064, .1, .1), (.047, .15, .09), (.029, .2, .075))
        for i, (rr, z0, h) in enumerate(tiers):
            k.spike(c, rr * s, h * s, n, leaf, z0=z + z0 * s, rot=a0 + i * math.pi / n, star=.3)

    def bush(self, c, s=1.0, z=0.0, bloom=None, mat=None):
        k, r = self.kit, self.rnd
        mat = mat or r.choice(('life_bush', 'life_bush2', 'life_bush'))
        n = r.choice((1, 2, 2, 3))
        a0 = r.random() * TAU
        pts = []
        for i in range(n):
            a = a0 + TAU * i / n
            d = .018 * s if n > 1 else 0
            p = (c[0] + math.cos(a) * d, c[1] + math.sin(a) * d)
            rr = r.uniform(.03, .038) * s
            k.blob((p[0], p[1], z + .012 * s), rr, mat, sz=.75, jitter=.3)
            pts.append((p, rr))
        if bloom:
            for i in range(r.randint(5, 9)):
                (p, rr) = pts[r.randrange(len(pts))]
                a = r.random() * TAU
                el = r.uniform(.5, 1.2)
                dv = (math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el) * .75)
                k.blob((p[0] + dv[0] * rr, p[1] + dv[1] * rr, z + .012 * s + dv[2] * rr), .0075 * s, bloom, sub=1)

    def flowers(self, c, rr, cols, n=None, z=0.0, leaves=True):
        """A patch of flowers rr (Blender units) across: a bed of leaves dotted with one or two colours."""
        k, r = self.kit, self.rnd
        n = n or int(10 + rr * 260)
        if leaves:
            for i in range(max(2, int(rr / .02))):
                a = r.random() * TAU
                d = r.random() ** .5 * rr * .6
                k.blob((c[0] + math.cos(a) * d, c[1] + math.sin(a) * d, z + .002), r.uniform(.018, .026), 'life_veg_leaf', sz=.35, jitter=.3, sub=1)
        for i in range(n):
            a = r.random() * TAU
            d = r.random() ** .5 * rr
            col = cols[0] if (len(cols) == 1 or r.random() < .7) else cols[1]
            k.blob((c[0] + math.cos(a) * d, c[1] + math.sin(a) * d, z + r.uniform(.012, .02)), r.uniform(.0075, .0105), col, sz=.65, sub=1)

    # ---------------------------------------------------------------- animals (Blender point c, heading h)
    def sheep(self, c, h, s=1.0, wool='wool', face='dark', z=0.0):
        k = self.kit
        P = local(c, h, z)
        for a, b in ((.018, .014), (.018, -.014), (-.018, .014), (-.018, -.014)):
            k.cone(P(a * s, b * s), .005 * s, .022 * s, 5, face, z0=z)
        k.blob(P(0, 0, .034 * s), .031 * s, wool, sx=1.2, sy=.95, sz=.78, rot=h, jitter=.28)
        k.blob(P(.04 * s, 0, .04 * s), .0125 * s, face, sx=1.3, sz=.9, rot=h)
        for b in (-1, 1):
            k.blob(P(.036 * s, b * .011 * s, .046 * s), .005 * s, face, sx=.6, sy=1.6, rot=h, sub=1)

    def cow(self, c, h, s=1.0, coat='holstein', z=0.0):
        k, r = self.kit, self.rnd
        P = local(c, h, z)
        body = 'life_cow' if coat == 'holstein' else 'life_cow_brown'
        for a, b in ((.034, .02), (.034, -.02), (-.034, .02), (-.034, -.02)):
            k.cone(P(a * s, b * s), .0065 * s, .045 * s, 6, body, z0=z)
        k.blob(P(0, 0, .062 * s), .04 * s, body, sx=1.5, sy=.88, sz=.72, rot=h, jitter=.08)
        if coat == 'holstein':
            for i in range(r.randint(2, 4)):
                a, b = r.uniform(-.04, .03) * s, r.uniform(-.022, .022) * s
                k.blob(P(a, b, .082 * s), r.uniform(.014, .021) * s, 'life_cow_spot', sx=r.uniform(1, 1.5), sz=.35, rot=h + r.random(), jitter=.3)
        k.blob(P(.068 * s, 0, .072 * s), .018 * s, 'life_cow' if coat != 'holstein' else body, sx=1.35, sz=.9, rot=h)
        k.blob(P(.087 * s, 0, .066 * s), .011 * s, 'life_muzzle', sx=.8, sy=1.2, sz=.8, rot=h)
        for b in (-1, 1):
            k.rod(P(.062 * s, b * .012 * s, .084 * s), P(.066 * s, b * .03 * s, .09 * s), .0035 * s, 'life_horn', seg=5, r2=.001)
            k.blob(P(.058 * s, b * .024 * s, .078 * s), .006 * s, body, sx=.7, sy=1.5, sz=.5, rot=h, sub=1)
        k.rod(P(-.058 * s, 0, .07 * s), P(-.07 * s, 0, .03 * s), .003 * s, body, seg=4)

    def horse(self, c, h, s=1.0, coat='life_horse', z=0.0):
        k = self.kit
        P = local(c, h, z)
        for a, b in ((.035, .015), (.035, -.015), (-.035, .015), (-.035, -.015)):
            k.cone(P(a * s, b * s), .0055 * s, .06 * s, 6, coat, z0=z, r2=.0045 * s)
            k.cone(P(a * s, b * s), .0062 * s, .008 * s, 6, 'life_mane', z0=z)
        k.blob(P(0, 0, .075 * s), .036 * s, coat, sx=1.6, sy=.72, sz=.78, rot=h, jitter=.06)
        k.rod(P(.04 * s, 0, .08 * s), P(.066 * s, 0, .118 * s), .0125 * s, coat, seg=8, r2=.01 * s)
        k.blob(P(.08 * s, 0, .118 * s), .0125 * s, coat, sx=1.75, sy=.85, sz=.85, rot=h)
        k.rod(P(.036 * s, 0, .098 * s), P(.064 * s, 0, .132 * s), .006 * s, 'life_mane', seg=5)
        for b in (-1, 1):
            k.blob(P(.066 * s, b * .007 * s, .132 * s), .004 * s, coat, sz=1.8, sub=1)
        k.rod(P(-.056 * s, 0, .086 * s), P(-.072 * s, 0, .04 * s), .0065 * s, 'life_mane', seg=5, r2=.004 * s)

    def pig(self, c, h, s=1.0, z=0.0):
        k = self.kit
        P = local(c, h, z)
        k.blob(P(0, 0, .03 * s), .028 * s, 'life_pig', sx=1.35, sy=1.0, sz=.85, rot=h)
        k.rod(P(.034 * s, 0, .03 * s), P(.044 * s, 0, .029 * s), .008 * s, 'life_pig', seg=8)
        k.cone(P(.045 * s, 0), .007 * s, .002, 8, 'life_muzzle', z0=z + .025 * s, rot=h)
        for b in (-1, 1):
            k.blob(P(.026 * s, b * .014 * s, .052 * s), .006 * s, 'life_pig', sx=1.5, sz=.4, rot=h, sub=1)

    def hen(self, c, h, s=1.0, z=0.0):
        k = self.kit
        P = local(c, h, z)
        k.blob(P(0, 0, .016 * s), .012 * s, 'life_hen', sx=1.35, sz=.9, rot=h, sub=1)
        k.blob(P(.012 * s, 0, .026 * s), .006 * s, 'life_hen', sub=1)
        k.blob(P(.012 * s, 0, .032 * s), .0035 * s, 'life_comb', sx=1.4, sub=1)

    def dog(self, c, h, s=1.0, coat='life_dog', z=0.0):
        k = self.kit
        P = local(c, h, z)
        for a, b in ((.012, .007), (.012, -.007), (-.012, .007), (-.012, -.007)):
            k.cone(P(a * s, b * s), .003 * s, .016 * s, 4, coat, z0=z)
        k.blob(P(0, 0, .021 * s), .013 * s, coat, sx=1.5, sy=.75, sz=.75, rot=h)
        k.blob(P(.022 * s, 0, .03 * s), .0085 * s, coat, sx=1.3, rot=h)
        k.blob(P(.02 * s, 0, .021 * s), .0075 * s, 'wool', sx=.8, sy=1.2, sz=.6, rot=h, sub=1)
        k.rod(P(-.018 * s, 0, .024 * s), P(-.028 * s, 0, .034 * s), .003 * s, coat, seg=4)

    def deer(self, c, h, s=1.0, z=0.0):
        k = self.kit
        P = local(c, h, z)
        for a, b in ((.025, .011), (.025, -.011), (-.025, .011), (-.025, -.011)):
            k.cone(P(a * s, b * s), .0035 * s, .05 * s, 5, 'life_deer', z0=z)
        k.blob(P(0, 0, .06 * s), .026 * s, 'life_deer', sx=1.5, sy=.75, sz=.8, rot=h)
        k.blob(P(-.035 * s, 0, .064 * s), .009 * s, 'wool', sub=1)
        k.rod(P(.028 * s, 0, .066 * s), P(.042 * s, 0, .095 * s), .007 * s, 'life_deer', seg=6)
        k.blob(P(.048 * s, 0, .098 * s), .009 * s, 'life_deer', sx=1.6, rot=h)
        for b in (-1, 1):
            k.rod(P(.04 * s, b * .005 * s, .104 * s), P(.036 * s, b * .022 * s, .13 * s), .0022 * s, 'life_mane', seg=4)
            k.rod(P(.038 * s, b * .012 * s, .115 * s), P(.05 * s, b * .02 * s, .124 * s), .0018 * s, 'life_mane', seg=4)

    # ---------------------------------------------------------------- people
    def villager(self, c, h, s=1.0, cloth=None, hair=None, hat=None, item=None, walk=True, z=0.0):
        """A person about .13 * s tall; from above: a head or a hat on broad shoulders in the clothes' colour."""
        k, r = self.kit, self.rnd
        P = local(c, h, z)
        cloth = cloth or r.choice(CLOTH)
        hair = hair or r.choice(HAIR)
        legs = r.choice(('life_trousers', 'dark', 'timber'))
        st = .009 * s if walk else 0.0
        for b, ph in ((-1, 1), (1, -1)):
            k.rod(P(ph * st, b * .0065 * s, 0), P(0, b * .0055 * s, .036 * s), .0058 * s, legs, seg=6)
        k.cone(P(0, 0), .019 * s, .046 * s, 10, cloth, z0=z + .028 * s, r2=.0125 * s, smooth=True)
        k.blob(P(0, 0, .073 * s), .0135 * s, cloth, sx=.85, sy=1.45, sz=.72, rot=h)
        for b, ph in ((-1, -1), (1, 1)):
            hand = P(ph * st * .9, b * .021 * s, .044 * s)
            k.rod(P(0, b * .017 * s, .071 * s), hand, .005 * s, cloth, seg=5)
            k.blob(hand, .0055 * s, 'skin', sub=1)
        k.blob(P(0, 0, .091 * s), .0125 * s, 'skin')
        if hat == 'straw':
            k.cone(P(0, 0), .026 * s, .004 * s, 12, 'hay', z0=z + .096 * s, smooth=True)
            k.cone(P(0, 0), .0135 * s, .013 * s, 10, 'hay', z0=z + .098 * s, r2=.011 * s, smooth=True)
        elif hat == 'cap':
            k.blob(P(-.002 * s, 0, .096 * s), .0135 * s, r.choice(('cloth0', 'cloth1', 'cloth4', 'dark')), sz=.6)
        elif hat == 'scarf':
            k.blob(P(-.003 * s, 0, .094 * s), .0142 * s, r.choice(('cloth6', 'cloth0', 'cloth2')), sz=.85)
        elif hat == 'hood':
            k.blob(P(-.003 * s, 0, .093 * s), .0145 * s, cloth, sz=.9)
        else:
            k.blob(P(-.003 * s, 0, .095 * s), .0132 * s, hair, sz=.62)
        if item == 'crook':
            top = P(.012 * s, .028 * s, .15 * s)
            k.rod(P(.012 * s, .024 * s, 0), top, .0028 * s, 'wood', seg=5)
            k.rod(top, P(.022 * s, .03 * s, .158 * s), .0028 * s, 'wood', seg=5)
        elif item == 'fork':
            k.rod(P(.03 * s, .022 * s, .02 * s), P(-.03 * s, .016 * s, .14 * s), .0028 * s, 'wood', seg=5)
        elif item == 'basket':
            k.cone(P(0, .03 * s), .011 * s, .013 * s, 8, 'wood', z0=z + .03 * s, r2=.013 * s)
            k.cone(P(0, .03 * s), .009 * s, .002 * s, 8, r.choice(('life_fruit_red', 'flower1', 'life_cabbage')), z0=z + .042 * s)
        elif item == 'pail':
            k.cone(P(0, .028 * s), .009 * s, .014 * s, 8, 'life_metal', z0=z + .03 * s, r2=.011 * s)
        elif item == 'sack':
            k.blob(P(-.016 * s, .006 * s, .08 * s), .016 * s, 'life_burlap', sx=1.0, sy=1.3, sz=.8, rot=h)
        elif item == 'axe':
            k.rod(P(.016 * s, .022 * s, .03 * s), P(.04 * s, .024 * s, .1 * s), .0028 * s, 'wood', seg=5)
            k.cube(P(.04 * s, .024 * s, .092 * s), (.016 * s, .004 * s, .012 * s), 'life_metal', rot=h)
        elif item == 'rake':
            k.rod(P(.05 * s, .02 * s, .004 * s), P(-.01 * s, .02 * s, .085 * s), .0026 * s, 'wood', seg=5)
            k.rod(P(.05 * s, .005 * s, .006 * s), P(.05 * s, .035 * s, .006 * s), .003 * s, 'wood', seg=4)

    # ---------------------------------------------------------------- farm things
    def haystack(self, c, s=1.0, z=0.0):
        k = self.kit
        k.cone(c, .047 * s, .03 * s, 14, 'hay', z0=z, r2=.046 * s, smooth=True)
        k.blob((c[0], c[1], z + .028 * s), .047 * s, 'hay', sz=1.15, jitter=.12)
        k.rod((c[0], c[1], z + .07 * s), (c[0] + .004, c[1] - .003, z + .1 * s), .0035 * s, 'timber', seg=4)

    def bale(self, c, h, s=1.0, z=0.0):
        P = local(c, h, z)
        self.kit.rod(P(0, -.02 * s, .022 * s), P(0, .02 * s, .022 * s), .022 * s, 'hay', seg=12)

    def stook(self, c, s=1.0, z=0.0):
        self.kit.spike(c, .016 * s, .05 * s, 6, 'hay', z0=z, rot=self.rnd.random(), star=.25)

    def scarecrow(self, c, h, s=1.0, z=0.0):
        k, r = self.kit, self.rnd
        P = local(c, h, z)
        shirt = r.choice(('cloth0', 'cloth1', 'cloth4', 'cloth5'))
        k.rod(P(0, 0, 0), P(0, 0, .12 * s), .0045 * s, 'timber', seg=5)
        k.rod(P(0, -.042 * s, .085 * s), P(0, .042 * s, .085 * s), .0045 * s, 'timber', seg=5)
        k.cone(P(0, 0), .016 * s, .04 * s, 8, shirt, z0=z + .05 * s, r2=.011 * s, smooth=True)
        for b in (-1, 1):
            k.rod(P(0, 0, .085 * s), P(0, b * .036 * s, .083 * s), .0075 * s, shirt, seg=6)
            k.blob(P(0, b * .042 * s, .083 * s), .006 * s, 'hay', sub=1)
        k.blob(P(0, 0, .103 * s), .0135 * s, 'life_burlap', sub=1)
        k.cone(P(0, 0), .03 * s, .004 * s, 12, 'hay', z0=z + .11 * s, smooth=True)
        k.cone(P(0, 0), .014 * s, .016 * s, 9, 'life_trousers', z0=z + .112 * s, r2=.006 * s)
        if r.random() < .6:
            b = r.choice((-1, 1))
            k.blob(P(0, b * .03 * s, .095 * s), .007 * s, 'dark', sx=1.6, rot=h + 1.4, sub=1)

    def hive(self, c, h, s=1.0, col='life_hive0', z=0.0):
        k = self.kit
        P = local(c, h, z)
        k.cube(P(0, 0, 0), (.036 * s, .036 * s, .012 * s), 'timber', rot=h)
        k.cube(P(0, 0, .012 * s), (.034 * s, .034 * s, .022 * s), col, rot=h)
        k.cube(P(0, 0, .034 * s), (.034 * s, .034 * s, .018 * s), col, rot=h)
        core_roof = local(c, h, z + .052 * s)
        k.cube(core_roof(0, 0, 0), (.044 * s, .044 * s, .005 * s), 'life_hive0' if col != 'life_hive0' else 'roof', rot=h)
        k.cube(P(.017 * s, 0, .014 * s), (.004 * s, .014 * s, .003 * s), 'dark', rot=h)

    def skep(self, c, s=1.0, z=0.0):
        k = self.kit
        k.cone(c, .03 * s, .008 * s, 10, 'timber', z0=z)
        for i in range(4):
            rr = (.026 - i * .0055) * s
            k.cone(c, rr, .011 * s, 12, 'life_skep', z0=z + .008 * s + i * .01 * s, r2=rr * .86, smooth=True)
        k.blob((c[0], c[1], z + .05 * s), .009 * s, 'life_skep')

    def fence(self, pts, s=1.0, z=0.0, step=.07, mat='wood'):
        """A post-and-rail fence along Blender points pts (x, y)."""
        k = self.kit
        for a, b in zip(pts, pts[1:]):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            n = max(1, round(L / step))
            hd = math.atan2(b[1] - a[1], b[0] - a[0])
            for i in range(n):
                p = (a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)
                k.cube((p[0], p[1], z), (.011 * s, .011 * s, .046 * s), 'timber', rot=hd)
            for hz in (.02, .037):
                k.rod((a[0], a[1], z + hz * s), (b[0], b[1], z + hz * s), .0042 * s, mat, seg=4, smooth=False)
        p = pts[-1]
        k.cube((p[0], p[1], z), (.011 * s, .011 * s, .046 * s), 'timber')

    def hedge(self, pts, s=1.0, z=0.0, mat='life_hedge'):
        k, r = self.kit, self.rnd
        for a, b in zip(pts, pts[1:]):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            n = max(1, round(L / (.028 * s)))
            for i in range(n + 1):
                p = (a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)
                k.blob((p[0], p[1], z + .014 * s), r.uniform(.022, .028) * s, mat, sz=.85, jitter=.35)

    def cart(self, c, h, s=1.0, load='hay', z=0.0):
        k = self.kit
        P = local(c, h, z)
        k.cube(P(0, 0, .03 * s), (.1 * s, .058 * s, .008 * s), 'wood', rot=h)
        for b in (-1, 1):
            k.cube(P(0, b * .026 * s, .038 * s), (.1 * s, .006 * s, .022 * s), 'wood', rot=h)
            k.rod(P(-.008 * s, b * .036 * s, .03 * s), P(-.008 * s, b * .043 * s, .03 * s), .03 * s, 'timber', seg=12, smooth=False)
            k.rod(P(.05 * s, b * .016 * s, .036 * s), P(.11 * s, b * .016 * s, .02 * s), .0035 * s, 'wood', seg=4)
        if load == 'hay':
            k.blob(P(0, 0, .05 * s), .045 * s, 'hay', sx=1.2, sy=.68, sz=.55, rot=h, jitter=.25)
        elif load == 'sacks':
            for a, b in ((-.025, -.012), (-.025, .012), (.005, -.012), (.005, .012), (.033, 0)):
                k.blob(P(a * s, b * s, .05 * s), .014 * s, 'life_burlap', sx=1.2, sz=.75, rot=h + 1.57)
        elif load == 'pumpkins':
            for a, b in ((-.025, -.01), (-.02, .012), (.008, -.008), (.01, .014), (.034, 0)):
                k.blob(P(a * s, b * s, .05 * s), .013 * s, 'life_pumpkin', sz=.8)

    def logs(self, c, h, s=1.0, z=0.0):
        k = self.kit
        P = local(c, h, z)
        rows = ((3, .011), (2, .029), (1, .047))
        for n, hz in rows:
            for i in range(n):
                b = (i - (n - 1) / 2) * .021 * s
                k.rod(P(-.04 * s, b, hz * s), P(.04 * s, b, hz * s), .0105 * s, 'trunk', seg=8)
        k.cone(P(.075 * s, .01 * s), .02 * s, .02 * s, 9, 'trunk', z0=z, smooth=True)
        k.cone(P(.075 * s, .01 * s), .017 * s, .002, 9, 'life_cut', z0=z + .02 * s)

    def stump(self, c, s=1.0, z=0.0):
        k = self.kit
        k.cone(c, .018 * s, .018 * s, 8, 'trunk', z0=z, smooth=True)
        k.cone(c, .015 * s, .002, 8, 'life_cut', z0=z + .018 * s)

    def boulder(self, c, rr, z=0.0, moss=True, mat=None):
        k, r = self.kit, self.rnd
        mat = mat or r.choice(('life_rock', 'life_rock', 'life_rock2'))
        k.blob((c[0], c[1], z + rr * .12), rr, mat, sz=r.uniform(.55, .72), sx=r.uniform(1, 1.25), rot=r.random() * TAU, jitter=.38, smooth=False)
        if moss:
            k.blob((c[0] - rr * .25, c[1] + rr * .2, z + rr * .62), rr * .5, 'life_moss', sz=.32, sx=1.3, rot=r.random() * TAU, jitter=.4)

    def blanket(self, c, h, s=1.0, z=0.0):
        k = self.kit
        P = local(c, h, z)
        n, w = 4, .022 * s
        for i in range(n):
            for j in range(n):
                k.cube(P((i - 1.5) * w, (j - 1.5) * w, 0), (w, w, .003), 'life_check' if (i + j) % 2 else 'cloth6', rot=h)
        k.cone(P(.05 * s, .02 * s), .012 * s, .014 * s, 8, 'wood', z0=z, r2=.014 * s)
        k.blob(P(.01 * s, -.01 * s, .006 * s), .008 * s, 'life_fruit_red', sub=1)
        k.blob(P(-.015 * s, .012 * s, .006 * s), .009 * s, 'life_fruit_yellow', sub=1)

    def trough(self, c, h, s=1.0, z=0.0):
        k = self.kit
        P = local(c, h, z)
        k.cube(P(0, 0, 0), (.07 * s, .03 * s, .02 * s), 'wood', rot=h)
        k.cube(P(0, 0, .02 * s), (.058 * s, .018 * s, .001), 'water', rot=h)

    def well(self, c, s=1.0, z=0.0):
        k = self.kit
        k.cone(c, .035 * s, .035 * s, 12, 'stone', z0=z, smooth=True)
        k.cone(c, .027 * s, .001, 12, 'water_deep', z0=z + .033 * s)
        for b in (-1, 1):
            k.cube((c[0] + b * .03 * s, c[1], z + .035 * s), (.007 * s, .007 * s, .055 * s), 'timber')
        k.rod((c[0] - .03 * s, c[1], z + .08 * s), (c[0] + .03 * s, c[1], z + .08 * s), .004 * s, 'timber', seg=5)
        gx = local(c, 0.0, z + .088 * s)
        k.cube(gx(0, 0, 0), (.08 * s, .05 * s, .006 * s), 'roof')

    def windmill(self, c, h, s=1.0, z=0.0):
        """A tower mill whose sails lean back so their cross reads from above."""
        k, r = self.kit, self.rnd
        P = local(c, h, z)
        k.cone(c, .09 * s, .2 * s, 12, 'plaster', z0=z, r2=.064 * s, smooth=False)
        k.cone(c, .094 * s, .018 * s, 12, 'stone', z0=z, r2=.092 * s)
        k.cone(c, .07 * s, .014 * s, 12, 'timber', z0=z + .2 * s, r2=.072 * s)
        k.spike(c, .078 * s, .1 * s, 12, 'roof', z0=z + .212 * s, rot=h)
        k.cube(P(.087 * s, 0, 0), (.012 * s, .034 * s, .055 * s), 'door', rot=h)
        for a, b, hz in ((.074, .03, .1), (.068, -.028, .14), (-.074, .02, .12)):
            k.cube(P(a * s, b * s, hz * s), (.012 * s, .018 * s, .022 * s), 'window', rot=h)
        # the hub at the front of the cap, the sails in a plane leaning back from the wind
        hub = Vector(P(.07 * s, 0, .26 * s))
        fwd = Vector((math.cos(h), math.sin(h), 0))
        side = Vector((-math.sin(h), math.cos(h), 0))
        lean = math.radians(62)
        up = Vector((0, 0, 1)) * math.cos(lean) - fwd * math.sin(lean)   # the sails' "up" in their plane
        k.blob(hub, .018 * s, 'timber', sx=1.2, rot=h)
        a0 = r.random() * TAU
        for i in range(4):
            a = a0 + i * math.pi / 2
            d = side * math.cos(a) + up * math.sin(a)
            o = side * -math.sin(a) + up * math.cos(a)        # across the sail
            k.rod(hub, hub + d * .22 * s, .0055 * s, 'timber', seg=5)
            q0, q1 = hub + d * .045 * s, hub + d * .215 * s
            w = .052 * s
            corners = [q0, q1, q1 + o * w, q0 + o * w]
            bm = k.bm
            vs = [bm.verts.new(v) for v in corners]
            vs2 = [bm.verts.new(v + (d.cross(o)).normalized() * .004 * s) for v in corners]
            bm.faces.new(vs)
            bm.faces.new(vs2[::-1])
            for j in range(4):
                bm.faces.new((vs[j], vs[(j + 1) % 4], vs2[(j + 1) % 4], vs2[j]))
            k._done(vs + vs2, 'life_sail', False)
            for t in (.33, .66, 1.0):
                pa = q0 + (q1 - q0) * t
                k.rod(pa, pa + o * w, .0028 * s, 'timber', seg=4)
            k.rod(q0 + o * w, q1 + o * w, .0028 * s, 'timber', seg=4)


def build(ctx):
    palette(ctx)
    life = Life(ctx)
    if os.environ.get('LIFE_GALLERY'):
        gallery(life)
    else:
        life.run()
    life.kit.flush()


def gallery(life):
    """Every prop on one card, for tuning their looks (LIFE_GALLERY=1)."""
    L = life
    rows = [
        [lambda c: L.oak(c, 1.0), lambda c: L.oak(c, 1.0, 'life_oak2'), lambda c: L.oak(c, 1.0, 'life_lime'), lambda c: L.oak(c, .9, 'life_oak', fruit='life_fruit_red'),
         lambda c: L.oak(c, 1.0, 'life_autumn'), lambda c: L.oak(c, .9, 'life_blossom')],
        [lambda c: L.pine(c, 1.0), lambda c: L.pine(c, 1.1, 'life_pine2'), lambda c: L.pine(c, .9, 'leaf_dark'), lambda c: L.bush(c, 1.0),
         lambda c: L.bush(c, 1.1, bloom='flower2'), lambda c: L.flowers(c, .05, ('flower0', 'flower2'))],
        [lambda c: L.sheep(c, .3, 1.4), lambda c: L.cow(c, 1.0, 1.2), lambda c: L.cow(c, -.5, 1.2, 'brown'), lambda c: L.horse(c, .2, 1.2),
         lambda c: L.pig(c, 1.2, 1.3), lambda c: L.dog(c, .5, 1.3)],
        [lambda c: L.villager(c, 0, 1.35, hat='straw', item='fork'), lambda c: L.villager(c, 1, 1.35, item='crook', hat='hood'), lambda c: L.villager(c, 2, 1.35, hat='scarf', item='basket'),
         lambda c: L.haystack(c, 1.2), lambda c: L.scarecrow(c, .4, 1.3), lambda c: L.hive(c, .3, 1.3, 'life_hive1')],
        [lambda c: L.cart(c, .5, 1.2), lambda c: L.logs(c, .2, 1.2), lambda c: L.boulder(c, .08), lambda c: L.blanket(c, .3, 1.3),
         lambda c: L.skep(c, 1.3), lambda c: L.deer(c, 2.0, 1.3)],
    ]
    for j, row in enumerate(rows):
        for i, f in enumerate(row):
            p = (-.36 + i * .145, -.34 + j * .17)
            if hex_inset(p) > .06:
                f(B(p))
    L.windmill(B((.0, .36)), -.6, 1.0)
    L.ridge_demo = None
